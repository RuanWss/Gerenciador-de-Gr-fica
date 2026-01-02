
// Fix: Implement missing Firebase service functions and collections to resolve exported member errors.
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

const USERS_COLLECTION = 'users';
const EXAMS_COLLECTION = 'exams';
const CLASS_MATERIALS_COLLECTION = 'materials';
const STUDENTS_COLLECTION = 'students';
const ATTENDANCE_LOGS_COLLECTION = 'attendance_logs';
const SCHEDULE_COLLECTION = 'schedule';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const EVENTS_COLLECTION = 'events';
const ANSWER_KEYS_COLLECTION = 'answer_keys';
const CORRECTIONS_COLLECTION = 'corrections';
const PEI_COLLECTION = 'pei';
const STAFF_COLLECTION = 'staff';
const STAFF_LOGS_COLLECTION = 'staff_logs';
const LIBRARY_BOOKS_COLLECTION = 'library_books';
const LIBRARY_LOANS_COLLECTION = 'library_loans';
const LESSON_PLANS_COLLECTION = 'lesson_plans';

// --- HELPERS ---
const sanitizeForFirestore = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'string') return value.trim();
        return value;
    }));
};

// --- EXAMS & GRÁFICA ---
export const uploadExamFile = async (file: File, teacherName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `exams/${teacherName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const listenToExams = (callback: (exams: ExamRequest[]) => void, teacherId?: string) => {
    const q = teacherId 
        ? query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, EXAMS_COLLECTION);
        
    return onSnapshot(q, (snapshot) => {
        const exams = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest));
        callback(exams.sort((a,b) => b.createdAt - a.createdAt));
    });
};

export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
    const q = teacherId 
        ? query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, EXAMS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest));
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
    const { id, ...data } = exam;
    const sanitizedData = sanitizeForFirestore(data);
    if (id) {
        await setDoc(doc(db, EXAMS_COLLECTION, id), sanitizedData);
    } else {
        await addDoc(collection(db, EXAMS_COLLECTION), sanitizedData);
    }
};

export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, examId), { status });
};

// --- CLASS MATERIALS ---
export const uploadClassMaterialFile = async (file: File, grade: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `materials/${grade.replace(/\s+/g, '_')}/${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const getClassMaterials = async (teacherId: string): Promise<ClassMaterial[]> => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial));
};

export const listenToClassMaterials = (className: string, callback: (materials: ClassMaterial[]) => void, errorCallback?: (error: any) => void) => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial)));
    }, errorCallback);
};

export const saveClassMaterial = async (material: ClassMaterial): Promise<void> => {
    const { id, ...data } = material;
    if (id) {
        await setDoc(doc(db, CLASS_MATERIALS_COLLECTION, id), sanitizeForFirestore(data));
    } else {
        await addDoc(collection(db, CLASS_MATERIALS_COLLECTION), sanitizeForFirestore(data));
    }
};

export const deleteClassMaterial = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CLASS_MATERIALS_COLLECTION, id));
};

// --- USERS & AUTH ---
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as User;
    return null;
};

export const createSystemUserAuth = async (email: string, name: string, roles: UserRole[]) => {
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const userCred = await createUser(secondaryAuth, email, 'cemal2016');
        const uid = userCred.user.uid;
        await setDoc(doc(db, USERS_COLLECTION, uid), sanitizeForFirestore({
            id: uid,
            name,
            email,
            role: roles[0],
            roles: roles,
            subject: '',
            classes: []
        }));
        await deleteApp(secondaryApp);
    } catch (error) {
        await deleteApp(secondaryApp);
        throw error;
    }
};

export const updateSystemUserRoles = async (email: string, roles: UserRole[]) => {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
            role: roles[0],
            roles: roles
        });
    }
};

// --- STUDENTS ---
export const listenToStudents = (callback: (students: Student[]) => void) => {
    return onSnapshot(collection(db, STUDENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });
};

export const getStudents = async (): Promise<Student[]> => {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
};

export const updateStudent = async (student: Student): Promise<void> => {
    const { id, ...data } = student;
    await setDoc(doc(db, STUDENTS_COLLECTION, id), sanitizeForFirestore(data));
};

export const uploadReportFile = async (file: File, studentName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `reports/${studentName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

// --- SYSTEM CONFIG ---
export const listenToSystemConfig = (callback: (config: SystemConfig) => void) => {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'main');
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as SystemConfig);
        } else {
            callback({ bannerMessage: '', bannerType: 'info', isBannerActive: false });
        }
    });
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    await setDoc(doc(db, SYSTEM_CONFIG_COLLECTION, 'main'), config);
};

// --- EVENTS ---
export const listenToEvents = (callback: (events: SchoolEvent[]) => void) => {
    return onSnapshot(collection(db, EVENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolEvent)));
    });
};

export const saveSchoolEvent = async (event: SchoolEvent): Promise<void> => {
    const { id, ...data } = event;
    if (id) {
        await setDoc(doc(db, EVENTS_COLLECTION, id), sanitizeForFirestore(data));
    } else {
        await addDoc(collection(db, EVENTS_COLLECTION), sanitizeForFirestore(data));
    }
};

export const deleteSchoolEvent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
};

// --- PEI / AEE ---
export const getAllPEIs = async (): Promise<PEIDocument[]> => {
    const snapshot = await getDocs(collection(db, PEI_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PEIDocument));
};

export const savePEI = async (pei: PEIDocument): Promise<void> => {
    const { id, ...data } = pei;
    if (id) {
        await setDoc(doc(db, PEI_COLLECTION, id), sanitizeForFirestore(data));
    } else {
        await addDoc(collection(db, PEI_COLLECTION), sanitizeForFirestore(data));
    }
};

// --- ATTENDANCE ---
export const listenToAttendanceLogs = (dateString: string, callback: (logs: AttendanceLog[]) => void) => {
    const q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)));
    });
};

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("studentId", "==", log.studentId), where("timestamp", ">", fiveMinutesAgo));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return false;
    await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), sanitizeForFirestore(log));
    return true;
};

// --- STAFF ---
export const uploadStaffPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `staff_photos/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const listenToStaffMembers = (callback: (staff: StaffMember[]) => void) => {
    return onSnapshot(collection(db, STAFF_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });
};

export const saveStaffMember = async (staff: StaffMember): Promise<void> => {
    const { id, ...data } = staff;
    if (id) {
        await setDoc(doc(db, STAFF_COLLECTION, id), sanitizeForFirestore(data));
    } else {
        await addDoc(collection(db, STAFF_COLLECTION), sanitizeForFirestore(data));
    }
};

export const updateStaffMember = async (staff: StaffMember): Promise<void> => {
    const { id, ...data } = staff;
    await setDoc(doc(db, STAFF_COLLECTION, id), sanitizeForFirestore(data));
};

export const deleteStaffMember = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
};

export const listenToStaffLogs = (dateString: string, callback: (logs: StaffAttendanceLog[]) => void) => {
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog)));
    });
};

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<'success' | 'too_soon' | 'error'> => {
    try {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        const q = query(
            collection(db, STAFF_LOGS_COLLECTION), 
            where("staffId", "==", log.staffId), 
            where("timestamp", ">", twoMinutesAgo)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return 'too_soon';
        
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), sanitizeForFirestore(log));
        return 'success';
    } catch (e) {
        console.error(e);
        return 'error';
    }
};

// --- SCHEDULE ---
export const listenToSchedule = (callback: (schedule: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    });
};

// --- LIBRARY ---
export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_BOOKS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    });
};

export const saveLibraryBook = async (book: LibraryBook): Promise<void> => {
    const { id, ...data } = book;
    if (id) {
        await setDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id), sanitizeForFirestore(data));
    } else {
        await addDoc(collection(db, LIBRARY_BOOKS_COLLECTION), sanitizeForFirestore(data));
    }
};

export const deleteLibraryBook = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

export const listenToLibraryLoans = (callback: (loans: LibraryLoan[]) => void) => {
    return onSnapshot(collection(db, LIBRARY_LOANS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    });
};

export const createLoan = async (loan: LibraryLoan): Promise<void> => {
    const batch = writeBatch(db);
    const loanRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
    batch.set(loanRef, sanitizeForFirestore({ ...loan, id: loanRef.id }));
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    batch.update(bookRef, { availableQuantity: increment(-1) });
    await batch.commit();
};

export const returnLoan = async (loanId: string, bookId: string): Promise<void> => {
    const batch = writeBatch(db);
    const loanRef = doc(db, LIBRARY_LOANS_COLLECTION, loanId);
    batch.update(loanRef, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, bookId);
    batch.update(bookRef, { availableQuantity: increment(1) });
    await batch.commit();
};

// --- LESSON PLANS ---
export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    const q = teacherId 
        ? query(collection(db, LESSON_PLANS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, LESSON_PLANS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan));
};
