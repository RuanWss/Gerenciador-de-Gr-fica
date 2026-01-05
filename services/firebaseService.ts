
import { db, storage, auth, firebaseConfig } from '../firebaseConfig';
// Use modular SDK v9 imports from firebase packages
import { initializeApp, deleteApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    signOut 
} from 'firebase/auth';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, 
    query, where, orderBy, onSnapshot, setDoc, limit, increment, writeBatch 
} from 'firebase/firestore';
// Fix: Ensure modular storage functions are correctly imported from the modular storage path
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
        if (typeof value === 'string') return value.trim();
        return value;
    }));
};

// --- GENNERA SYNC ---
export const syncAllDataWithGennera = async (onProgress?: (msg: string) => void): Promise<void> => {
    try {
        if (onProgress) onProgress("Conectando ao Gateway...");
        const classes = await fetchGenneraClasses();
        
        if (!classes || classes.length === 0) {
            throw new Error("Nenhuma turma retornada pela API Gennera.");
        }

        if (onProgress) onProgress(`Sincronizando ${classes.length} turmas...`);
        
        // Firestore limita batches a 500 operações. Vamos processar turma por turma para segurança.
        for (const cls of classes) {
            try {
                if (onProgress) onProgress(`Buscando alunos: ${cls.name}`);
                const students = await fetchGenneraStudentsByClass(cls.id, cls.name);
                
                if (students.length > 0) {
                    const batch = writeBatch(db);
                    students.forEach(student => {
                        const studentRef = doc(db, STUDENTS_COLLECTION, student.id);
                        batch.set(studentRef, sanitizeForFirestore(student), { merge: true });
                    });
                    await batch.commit();
                }
            } catch (e) {
                console.warn(`Erro na turma ${cls.name}:`, e);
            }
        }
        
        if (onProgress) onProgress("Sincronização concluída com sucesso!");
    } catch (error: any) {
        console.error("Erro crítico na sincronização:", error);
        throw new Error(error.message || "Falha na sincronização Gennera.");
    }
};

// --- SEMESTER CLEANUP ---
export const cleanupSemesterExams = async (semester: 1 | 2, year: number): Promise<number> => {
    const startDate = semester === 1 ? new Date(year, 0, 1).getTime() : new Date(year, 6, 1).getTime();
    const endDate = semester === 1 ? new Date(year, 5, 30, 23, 59, 59).getTime() : new Date(year, 11, 31, 23, 59, 59).getTime();

    const q = query(collection(db, EXAMS_COLLECTION), where("createdAt", ">=", startDate), where("createdAt", "<=", endDate));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    let count = 0;

    for (const d of snapshot.docs) {
        batch.delete(d.ref);
        count++;
    }

    await batch.commit();
    return count;
};

// --- LISTENERS ---

// Listener for schedule entries used in PublicSchedule
export const listenToSchedule = (callback: (entries: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Schedule:", error);
    });
};

// Listener for class materials used in ClassroomFiles
export const listenToClassMaterials = (className: string, callback: (materials: ClassMaterial[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial)));
    }, (error) => {
        if (onError) onError(error);
        else if (error.code !== 'permission-denied') console.error("Erro Materials:", error);
    });
};

export const listenToExams = (callback: (exams: ExamRequest[]) => void) => {
    return onSnapshot(collection(db, EXAMS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Exams:", error);
    });
};

export const listenToStudents = (callback: (students: Student[]) => void) => {
    return onSnapshot(collection(db, STUDENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Students:", error);
    });
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
        if (error.code !== 'permission-denied') console.warn("Erro Config:", error.message);
    });
};

export const listenToEvents = (callback: (events: SchoolEvent[]) => void) => {
    return onSnapshot(collection(db, EVENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolEvent)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Events:", error);
    });
};

export const listenToAttendanceLogs = (dateString: string, callback: (logs: AttendanceLog[]) => void) => {
    const q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Attendance:", error);
    });
};

export const listenToStaffMembers = (callback: (staff: StaffMember[]) => void) => {
    return onSnapshot(collection(db, STAFF_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Staff:", error);
    });
};

export const listenToStaffLogs = (dateString: string, callback: (logs: StaffAttendanceLog[]) => void) => {
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", dateString), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro StaffLogs:", error);
    });
};

export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_BOOKS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Library:", error);
    });
};

export const listenToLibraryLoans = (callback: (loans: LibraryLoan[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_LOANS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Loans:", error);
    });
};

// --- GETTERS ---
export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
    const q = teacherId 
        ? query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, EXAMS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest));
};

export const getStudents = async (): Promise<Student[]> => {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as User;
    return null;
};

export const getAllPEIs = async (): Promise<PEIDocument[]> => {
    const snapshot = await getDocs(collection(db, PEI_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PEIDocument));
};

export const getClassMaterials = async (teacherId?: string): Promise<ClassMaterial[]> => {
    const q = teacherId 
        ? query(collection(db, CLASS_MATERIALS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, CLASS_MATERIALS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial));
};

export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    const q = teacherId 
        ? query(collection(db, LESSON_PLANS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, LESSON_PLANS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan));
};

// --- SETTERS ---
export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, examId), { status });
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
    const { id, ...data } = exam;
    if (id) await setDoc(doc(db, EXAMS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, EXAMS_COLLECTION), sanitizeForFirestore(data));
};

export const uploadExamFile = async (file: File, teacherName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `exams/${teacherName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

// Helper to upload student report files for AEE
export const uploadReportFile = async (file: File, studentName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `reports/${studentName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    await setDoc(doc(db, SYSTEM_CONFIG_COLLECTION, 'main'), sanitizeForFirestore(config));
};

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    try {
        const q = query(
            collection(db, ATTENDANCE_LOGS_COLLECTION),
            where("studentId", "==", log.studentId),
            where("dateString", "==", log.dateString)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return false;
        await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), sanitizeForFirestore(log));
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<'success' | 'too_soon' | 'error'> => {
    try {
        const q = query(
            collection(db, STAFF_LOGS_COLLECTION),
            where("staffId", "==", log.staffId),
            orderBy("timestamp", "desc"),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const lastLog = snapshot.docs[0].data();
            const diff = Date.now() - lastLog.timestamp;
            if (diff < 120000) return 'too_soon';
        }
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), sanitizeForFirestore(log));
        return 'success';
    } catch (error) {
        console.error(error);
        return 'error';
    }
};

export const saveStaffMember = async (staff: StaffMember): Promise<void> => {
    const { id, ...data } = staff;
    if (id) await setDoc(doc(db, STAFF_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, STAFF_COLLECTION), sanitizeForFirestore(data));
};

export const updateStaffMember = async (staff: StaffMember): Promise<void> => {
    await setDoc(doc(db, STAFF_COLLECTION, staff.id), sanitizeForFirestore(staff));
};

export const deleteStaffMember = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
};

export const uploadStaffPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `staff/photos/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const saveClassMaterial = async (material: ClassMaterial): Promise<void> => {
    const { id, ...data } = material;
    if (id) await setDoc(doc(db, CLASS_MATERIALS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, CLASS_MATERIALS_COLLECTION), sanitizeForFirestore(data));
};

export const deleteClassMaterial = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CLASS_MATERIALS_COLLECTION, id));
};

export const saveLibraryBook = async (book: LibraryBook): Promise<void> => {
    const { id, ...data } = book;
    if (id) await setDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, LIBRARY_BOOKS_COLLECTION), sanitizeForFirestore(data));
};

export const deleteLibraryBook = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

export const createLoan = async (loan: LibraryLoan): Promise<void> => {
    const batch = writeBatch(db);
    const loanRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    batch.set(loanRef, sanitizeForFirestore({ ...loan, id: loanRef.id }));
    batch.update(bookRef, { availableQuantity: increment(-1) });
    await batch.commit();
};

export const returnLoan = async (loanId: string, bookId: string): Promise<void> => {
    const batch = writeBatch(db);
    const loanRef = doc(db, LIBRARY_LOANS_COLLECTION, loanId);
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, bookId);
    batch.update(loanRef, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
    batch.update(bookRef, { availableQuantity: increment(1) });
    await batch.commit();
};

export const updateStudent = async (student: Student): Promise<void> => {
    await setDoc(doc(db, STUDENTS_COLLECTION, student.id), sanitizeForFirestore(student));
};

export const saveSchoolEvent = async (event: SchoolEvent): Promise<void> => {
    const { id, ...data } = event;
    if (id) await setDoc(doc(db, EVENTS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, EVENTS_COLLECTION), sanitizeForFirestore(data));
};

export const deleteSchoolEvent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
};

export const createSystemUserAuth = async (email: string, name: string, roles: UserRole[]): Promise<void> => {
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const result = await createUserWithEmailAndPassword(secondaryAuth, email, 'cemal2016');
        const userProfile: User = {
            id: result.user.uid,
            name: name,
            email: email,
            role: roles[0],
            roles: roles
        };
        await setDoc(doc(db, USERS_COLLECTION, result.user.uid), sanitizeForFirestore(userProfile));
    } finally {
        await deleteApp(secondaryApp);
    }
};

export const updateSystemUserRoles = async (email: string, roles: UserRole[]): Promise<void> => {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, { roles: roles, role: roles[0] });
    }
};
