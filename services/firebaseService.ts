
import { db, storage, auth, firebaseConfig } from '../firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword as createUser, updateProfile as updateProfileAuth, signOut } from 'firebase/auth';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, 
    query, where, orderBy, onSnapshot, setDoc, limit, increment, writeBatch 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    ExamRequest, ExamStatus, User, UserRole, ClassMaterial, LessonPlan, 
    Student, ScheduleEntry, SystemConfig, AttendanceLog, StaffMember, 
    StaffAttendanceLog, SchoolEvent, LibraryBook, LibraryLoan,
    AnswerKey, StudentCorrection, PEIDocument
} from '../types';
import { fetchGenneraClasses, fetchGenneraStudentsByClass } from './genneraService';

const USERS_COLLECTION = 'users';
const EXAMS_COLLECTION = 'exams';
const CLASS_MATERIALS_COLLECTION = 'materials';
const STUDENTS_COLLECTION = 'students';
const ATTENDANCE_LOGS_COLLECTION = 'attendance_logs';
const SCHEDULE_COLLECTION = 'schedule';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const LESSON_PLANS_COLLECTION = 'lesson_plans';
const STAFF_COLLECTION = 'staff';
const STAFF_LOGS_COLLECTION = 'staff_logs';
const EVENTS_COLLECTION = 'events';
const LIBRARY_BOOKS_COLLECTION = 'library_books';
const LIBRARY_LOANS_COLLECTION = 'library_loans';
const ANSWER_KEYS_COLLECTION = 'answer_keys';
const CORRECTIONS_COLLECTION = 'corrections';
const PEI_COLLECTION = 'pei';

// --- HELPERS ---
const sanitizeForFirestore = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'string') return value.trim().normalize("NFC");
        return value;
    }));
};

// --- GENNERA SYNC ---
export const syncAllDataWithGennera = async (onProgress?: (msg: string) => void): Promise<void> => {
    try {
        if (onProgress) onProgress("Buscando turmas na Gennera...");
        const classes = await fetchGenneraClasses();
        
        if (!classes || classes.length === 0) {
            throw new Error("Nenhuma turma encontrada na API Gennera.");
        }

        let totalSynced = 0;
        for (const cls of classes) {
            if (onProgress) onProgress(`Sincronizando: ${cls.name}...`);
            
            const studentsFromGennera = await fetchGenneraStudentsByClass(cls.id, cls.name);
            
            if (studentsFromGennera && studentsFromGennera.length > 0) {
                const batch = writeBatch(db);
                for (const student of studentsFromGennera) {
                    const studentRef = doc(db, STUDENTS_COLLECTION, student.id);
                    batch.set(studentRef, sanitizeForFirestore(student), { merge: true });
                    totalSynced++;
                }
                await batch.commit();
            }
            // Pequeno delay para evitar rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (onProgress) onProgress(`Sucesso! ${totalSynced} alunos atualizados.`);
    } catch (error: any) {
        console.error("[Gennera Sync Error]", error);
        throw new Error(error.message || "Erro na sincronização.");
    }
};

// --- EXAMS ---
export const uploadExamFile = async (file: File, teacherName: string): Promise<string> => {
    const storageRef = ref(storage, `exams/${teacherName.replace(/\s+/g, '_')}_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
    let q;
    if (teacherId) {
        q = query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = collection(db, EXAMS_COLLECTION);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest));
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
    const { id, ...data } = exam;
    if (id) {
        await setDoc(doc(db, EXAMS_COLLECTION, id), data);
    } else {
        await addDoc(collection(db, EXAMS_COLLECTION), data);
    }
};

export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, examId), { status });
};

// --- USERS ---
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
};

export const createSystemUserAuth = async (email: string, name: string, roles: UserRole[]): Promise<void> => {
    const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const userCredential = await createUser(secondaryAuth, email, 'cemal2016');
        const newUser = userCredential.user;
        await updateProfileAuth(newUser, { displayName: name });
        const userRef = doc(db, USERS_COLLECTION, newUser.uid);
        await setDoc(userRef, {
            id: newUser.uid,
            name: name,
            email: email,
            role: roles[0],
            roles: roles,
            subject: '',
            classes: []
        });
    } finally {
        await deleteApp(secondaryApp);
    }
};

export const updateSystemUserRoles = async (email: string, roles: UserRole[]): Promise<void> => {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const userDoc = snap.docs[0];
        await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
            role: roles[0],
            roles: roles
        });
    }
};

// --- STUDENTS ---
export const getStudents = async (): Promise<Student[]> => {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
};

export const listenToStudents = (callback: (students: Student[]) => void) => {
    return onSnapshot(collection(db, STUDENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    }, (error) => console.error("Error listening to students:", error));
};

export const updateStudent = async (student: Student): Promise<void> => {
    const { id, ...data } = student;
    if (!id) return;
    await setDoc(doc(db, STUDENTS_COLLECTION, id), sanitizeForFirestore(data), { merge: true });
};

// --- OTHERS ---
export const getClassMaterials = async (teacherId?: string): Promise<ClassMaterial[]> => {
    let q;
    if (teacherId) {
        q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = collection(db, CLASS_MATERIALS_COLLECTION);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial));
};

export const listenToClassMaterials = (className: string, onSuccess: (data: ClassMaterial[]) => void, onError: (error: any) => void) => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        const materials = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial));
        onSuccess(materials);
    }, onError);
};

export const saveClassMaterial = async (material: ClassMaterial): Promise<string> => {
    const { id, ...data } = material;
    const docRef = await addDoc(collection(db, CLASS_MATERIALS_COLLECTION), data);
    return docRef.id;
};

export const deleteClassMaterial = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CLASS_MATERIALS_COLLECTION, id));
};

export const uploadClassMaterialFile = async (file: File, className: string): Promise<string> => {
    const storageRef = ref(storage, `materials/${className}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    let q;
    if (teacherId) {
        q = query(collection(db, LESSON_PLANS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = collection(db, LESSON_PLANS_COLLECTION);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan));
};

export const saveLessonPlan = async (plan: LessonPlan): Promise<string> => {
    const { id, ...data } = plan;
    const docRef = await addDoc(collection(db, LESSON_PLANS_COLLECTION), data);
    return docRef.id;
};

export const deleteLessonPlan = async (id: string): Promise<void> => {
    if (!id) return;
    await deleteDoc(doc(db, LESSON_PLANS_COLLECTION, id));
};

export const listenToAttendanceLogs = (dateString: string, callback: (logs: AttendanceLog[]) => void) => {
    const q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog));
        logs.sort((a,b) => b.timestamp - a.timestamp);
        callback(logs);
    }, (error) => console.error("Error listening to attendance logs:", error));
};

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("studentId", "==", log.studentId), where("timestamp", ">", fiveMinutesAgo));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return false;
    const { id, ...data } = log;
    await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), data);
    return true;
};

export const listenToSchedule = (callback: (schedule: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    }, (error) => console.error("Error listening to schedule:", error));
};

export const listenToSystemConfig = (callback: (config: SystemConfig) => void) => {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'main');
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as SystemConfig);
        } else {
            callback({ bannerMessage: '', bannerType: 'info', isBannerActive: false });
        }
    }, (error) => {
        console.warn("System config listener warning:", error.message);
    });
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    await setDoc(doc(db, SYSTEM_CONFIG_COLLECTION, 'main'), config);
};

export const listenToEvents = (callback: (events: SchoolEvent[]) => void) => {
    return onSnapshot(collection(db, EVENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolEvent)));
    }, (error) => console.error("Error listening to events:", error));
};

export const saveSchoolEvent = async (event: SchoolEvent): Promise<void> => {
    const { id, ...data } = event;
    const sanitized = JSON.parse(JSON.stringify(data));
    if (id) {
        await setDoc(doc(db, EVENTS_COLLECTION, id), sanitized);
    } else {
        await addDoc(collection(db, EVENTS_COLLECTION), sanitized);
    }
};

export const deleteSchoolEvent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
};

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
    const snapshot = await getDocs(collection(db, ANSWER_KEYS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnswerKey));
};

export const saveAnswerKey = async (key: AnswerKey): Promise<void> => {
    const { id, ...data } = key;
    await addDoc(collection(db, ANSWER_KEYS_COLLECTION), data);
};

export const deleteAnswerKey = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, ANSWER_KEYS_COLLECTION, id));
};

export const getCorrections = async (answerKeyId: string): Promise<StudentCorrection[]> => {
    const q = query(collection(db, CORRECTIONS_COLLECTION), where("answerKeyId", "==", answerKeyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentCorrection));
};

export const saveCorrection = async (correction: StudentCorrection): Promise<void> => {
    const { id, ...data } = correction;
    await addDoc(collection(db, CORRECTIONS_COLLECTION), data);
};

export const getAllPEIs = async (): Promise<PEIDocument[]> => {
    const snapshot = await getDocs(collection(db, PEI_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PEIDocument));
};

export const getPEIByStudentAndTeacher = async (studentId: string, teacherId: string): Promise<PEIDocument | null> => {
    const q = query(collection(db, PEI_COLLECTION), where("studentId", "==", studentId), where("teacherId", "==", teacherId));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as PEIDocument;
    }
    return null;
};

export const savePEI = async (pei: PEIDocument): Promise<void> => {
    const { id, ...data } = pei;
    if (id) {
        await setDoc(doc(db, PEI_COLLECTION, id), data);
    } else {
        await addDoc(collection(db, PEI_COLLECTION), data);
    }
};

export const uploadReportFile = async (file: File, studentName: string): Promise<string> => {
    const storageRef = ref(storage, `reports/${studentName}_${Date.now()}.pdf`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const listenToStaffMembers = (callback: (staff: StaffMember[]) => void) => {
    return onSnapshot(collection(db, STAFF_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    }, (error) => console.error("Error listening to staff members:", error));
};

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<'success' | 'too_soon' | 'error'> => {
    try {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        const q = query(collection(db, STAFF_LOGS_COLLECTION), where("staffId", "==", log.staffId), where("timestamp", ">", twoMinutesAgo));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return 'too_soon';
        const { id, ...data } = log;
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), data);
        return 'success';
    } catch (e) { return 'error'; }
};

export const listenToStaffLogs = (dateString: string, callback: (logs: StaffAttendanceLog[]) => void) => {
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog));
        logs.sort((a,b) => b.timestamp - a.timestamp);
        callback(logs);
    }, (error) => console.error("Error listening to staff logs:", error));
};

export const saveStaffMember = async (staff: StaffMember): Promise<void> => {
    const { id, ...data } = staff;
    await addDoc(collection(db, STAFF_COLLECTION), data);
};

export const updateStaffMember = async (staff: StaffMember): Promise<void> => {
    const { id, ...data } = staff;
    await updateDoc(doc(db, STAFF_COLLECTION, id), data);
};

export const deleteStaffMember = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
};

export const uploadStaffPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `staff/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_BOOKS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    }, (error) => console.error("Error listening to books:", error));
};

export const saveLibraryBook = async (book: LibraryBook): Promise<void> => {
    const { id, ...data } = book;
    if (id) {
        await setDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id), data);
    } else {
        await addDoc(collection(db, LIBRARY_BOOKS_COLLECTION), data);
    }
};

export const deleteLibraryBook = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

export const listenToLibraryLoans = (callback: (loans: LibraryLoan[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_LOANS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    }, (error) => console.error("Error listening to loans:", error));
};

export const createLoan = async (loan: LibraryLoan): Promise<void> => {
    const { id, ...data } = loan;
    await addDoc(collection(db, LIBRARY_LOANS_COLLECTION), data);
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    await updateDoc(bookRef, { availableQuantity: increment(-1) });
};

export const returnLoan = async (loanId: string, bookId: string): Promise<void> => {
    const loanRef = doc(db, LIBRARY_LOANS_COLLECTION, loanId);
    await updateDoc(loanRef, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, bookId);
    await updateDoc(bookRef, { availableQuantity: increment(1) });
};
