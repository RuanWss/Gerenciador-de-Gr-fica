import { db, storage, auth, firebaseConfig } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword as createUser, updateProfile as updateProfileAuth, signOut } from 'firebase/auth';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, 
    query, where, orderBy, onSnapshot, setDoc, limit 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    ExamRequest, ExamStatus, User, UserRole, ClassMaterial, LessonPlan, 
    Student, ScheduleEntry, SystemConfig, AttendanceLog, StaffMember, 
    StaffAttendanceLog 
} from '../types';

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

// --- USERS ---
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
};

export const ensureUserProfile = async (user: User): Promise<void> => {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        await setDoc(docRef, {
            name: user.name,
            email: user.email,
            role: user.role,
            subject: user.subject || '',
            classes: user.classes || []
        });
    }
};

export const createTeacherAuth = async (email: string, name: string): Promise<void> => {
    // Use a secondary app to avoid signing out the current user
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
        const userCredential = await createUser(secondaryAuth, email, "cemal2016");
        await updateProfileAuth(userCredential.user, { displayName: name });
        
        const user: User = {
            id: userCredential.user.uid,
            name: name,
            email: email,
            role: UserRole.TEACHER,
            subject: '',
            classes: []
        };
        await setDoc(doc(db, USERS_COLLECTION, user.id), user);
        
        await signOut(secondaryAuth);
    } catch (error) {
        throw error;
    } 
};

// --- EXAMS ---
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

export const updateExamRequest = async (exam: ExamRequest): Promise<void> => {
    const { id, ...data } = exam;
    await updateDoc(doc(db, EXAMS_COLLECTION, id), data);
};

export const deleteExamRequest = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, EXAMS_COLLECTION, id));
};

export const updateExamStatus = async (id: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, id), { status });
};

export const uploadExamFile = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `exams/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// --- CLASS MATERIALS ---
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

// --- LESSON PLANS ---
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

export const updateLessonPlan = async (plan: LessonPlan): Promise<void> => {
    const { id, ...data } = plan;
    if (!id) throw new Error("ID is required for update");
    await updateDoc(doc(db, LESSON_PLANS_COLLECTION, id), data);
};

export const deleteLessonPlan = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LESSON_PLANS_COLLECTION, id));
};

// --- STUDENTS ---
export const getStudents = async (): Promise<Student[]> => {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
};

export const listenToStudents = (callback: (students: Student[]) => void) => {
    return onSnapshot(collection(db, STUDENTS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });
};

export const saveStudent = async (student: Student): Promise<void> => {
    const { id, ...data } = student;
    await addDoc(collection(db, STUDENTS_COLLECTION), data);
};

export const updateStudent = async (student: Student): Promise<void> => {
    const { id, ...data } = student;
    await updateDoc(doc(db, STUDENTS_COLLECTION, id), data);
};

export const deleteStudent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
};

export const uploadStudentPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `students/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// --- ATTENDANCE ---
export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const q = query(
        collection(db, ATTENDANCE_LOGS_COLLECTION), 
        where("studentId", "==", log.studentId),
        where("timestamp", ">", fiveMinutesAgo)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return false;
    }
    
    const { id, ...data } = log;
    await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), data);
    return true;
};

export const listenToAttendanceLogs = (dateString: string, callback: (logs: AttendanceLog[]) => void) => {
    const q = query(
        collection(db, ATTENDANCE_LOGS_COLLECTION), 
        where("dateString", "==", dateString)
    );
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog));
        logs.sort((a,b) => b.timestamp - a.timestamp);
        callback(logs);
    });
};

// --- STAFF ---
export const getStaffMembers = async (): Promise<StaffMember[]> => {
    const snapshot = await getDocs(collection(db, STAFF_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
};

export const listenToStaffMembers = (callback: (staff: StaffMember[]) => void) => {
    return onSnapshot(collection(db, STAFF_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });
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

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<'success' | 'too_soon' | 'error'> => {
    try {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        
        // CORREÇÃO CRÍTICA: Envolver a consulta de duplicidade em try/catch
        // Se o índice composto não existir, a consulta falha.
        // Neste caso, ignoramos o erro e salvamos o ponto mesmo assim para não bloquear o usuário.
        try {
            const q = query(
                collection(db, STAFF_LOGS_COLLECTION),
                where("staffId", "==", log.staffId),
                where("timestamp", ">", twoMinutesAgo)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return 'too_soon';
            }
        } catch (queryError) {
            console.warn("Aviso: Índice de duplicidade pendente ou erro de consulta. Salvando registro...", queryError);
        }

        const { id, ...data } = log;
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), data);
        return 'success';
    } catch (e) {
        console.error("Erro fatal ao registrar ponto:", e);
        return 'error';
    }
};

export const listenToStaffLogs = (dateString: string, callback: (logs: StaffAttendanceLog[]) => void) => {
    const q = query(
        collection(db, STAFF_LOGS_COLLECTION), 
        where("dateString", "==", dateString)
    );
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog));
        logs.sort((a,b) => b.timestamp - a.timestamp);
        callback(logs);
    });
};

// --- SCHEDULE ---
export const getFullSchedule = async (): Promise<ScheduleEntry[]> => {
    const snapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry));
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    const { id, ...data } = entry;
    const docRef = doc(db, SCHEDULE_COLLECTION, id);
    await setDoc(docRef, data);
};

export const listenToSchedule = (callback: (schedule: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    });
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