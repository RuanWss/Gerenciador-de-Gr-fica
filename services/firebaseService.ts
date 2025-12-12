import { db, storage } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  setDoc,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  User, 
  ExamRequest, 
  ExamStatus, 
  Student, 
  ClassMaterial, 
  LessonPlan, 
  ScheduleEntry, 
  SystemConfig, 
  AttendanceLog, 
  StaffMember, 
  StaffAttendanceLog 
} from '../types';

const EXAMS_COLLECTION = 'exams';
const STUDENTS_COLLECTION = 'students';
const USERS_COLLECTION = 'users';
const MATERIALS_COLLECTION = 'classMaterials';
const LESSON_PLANS_COLLECTION = 'lessonPlans';
const SCHEDULE_COLLECTION = 'schedule';
const CONFIG_COLLECTION = 'systemConfig';
const ATTENDANCE_LOGS_COLLECTION = 'attendanceLogs';
const STAFF_COLLECTION = 'staff'; 
const STAFF_LOGS_COLLECTION = 'staffLogs';

// --- USERS ---

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const ensureUserProfile = async (user: User): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, user.id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
             await setDoc(userRef, {
                 name: user.name,
                 email: user.email,
                 role: user.role,
                 subject: user.subject || '',
                 classes: user.classes || []
             });
        }
    } catch (error) {
        console.error("Error ensuring user profile:", error);
    }
};

// --- EXAMS ---

export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
  try {
    let q;
    if (teacherId) {
      q = query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
      q = collection(db, EXAMS_COLLECTION);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRequest));
  } catch (error) {
    console.error("Error getting exams:", error);
    return [];
  }
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
    try {
        const { id, ...data } = exam;
        if (id) {
            await setDoc(doc(db, EXAMS_COLLECTION, id), data);
        } else {
            await addDoc(collection(db, EXAMS_COLLECTION), data);
        }
    } catch (error) {
        console.error("Error saving exam:", error);
        throw error;
    }
};

export const updateExamRequest = async (exam: ExamRequest): Promise<void> => {
    return saveExam(exam);
};

export const deleteExamRequest = async (examId: string): Promise<void> => {
    await deleteDoc(doc(db, EXAMS_COLLECTION, examId));
};

export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, examId), { status });
};

export const uploadExamFile = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `exams/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};


// --- CLASS MATERIALS ---

export const getClassMaterials = async (teacherId?: string): Promise<ClassMaterial[]> => {
    try {
        let q;
        if (teacherId) {
            q = query(collection(db, MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
        } else {
            q = collection(db, MATERIALS_COLLECTION);
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassMaterial));
    } catch (error) {
        console.error("Error getting materials:", error);
        return [];
    }
};

export const listenToClassMaterials = (className: string, onUpdate: (materials: ClassMaterial[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassMaterial));
        onUpdate(materials);
    }, (error) => {
        console.error("Error listening to class materials:", error);
        if (onError) onError(error);
    });
};

export const saveClassMaterial = async (material: ClassMaterial): Promise<string> => {
    const { id, ...data } = material;
    const docRef = await addDoc(collection(db, MATERIALS_COLLECTION), data);
    return docRef.id;
};

export const deleteClassMaterial = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, MATERIALS_COLLECTION, id));
};

export const uploadClassMaterialFile = async (file: File, className: string): Promise<string> => {
    const storageRef = ref(storage, `materials/${className}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};


// --- LESSON PLANS ---

export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    try {
        let q;
        if (teacherId) {
            q = query(collection(db, LESSON_PLANS_COLLECTION), where("teacherId", "==", teacherId));
        } else {
            q = collection(db, LESSON_PLANS_COLLECTION);
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonPlan));
    } catch (error) {
        console.error("Error getting lesson plans:", error);
        return [];
    }
};

export const saveLessonPlan = async (plan: LessonPlan): Promise<string> => {
    const { id, ...data } = plan;
    const docRef = await addDoc(collection(db, LESSON_PLANS_COLLECTION), data);
    return docRef.id;
};


// --- STUDENTS ---

export const getStudents = async (classId?: string): Promise<Student[]> => {
    try {
        let q;
        if (classId) {
             q = query(collection(db, STUDENTS_COLLECTION), where("classId", "==", classId));
        } else {
             q = collection(db, STUDENTS_COLLECTION);
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    } catch (error: any) {
        console.error("Erro ao buscar alunos:", error);
        return [];
    }
};

export const listenToStudents = (onUpdate: (students: Student[]) => void) => {
    const q = collection(db, STUDENTS_COLLECTION);
    return onSnapshot(q, (snapshot) => {
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        onUpdate(students);
    }, (error) => {
        // Suppress permission errors in console if it's just due to auth state
        if (error.code !== 'permission-denied') {
             console.error("Erro ao ouvir alunos:", error);
        } else {
             console.warn("Permissão negada ao ouvir alunos (verifique o login).");
        }
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
    const storageRef = ref(storage, `students_photos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};


// --- SCHEDULE ---

export const getFullSchedule = async (): Promise<ScheduleEntry[]> => {
    try {
        const snapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
    } catch (error) {
        console.error("Error getting schedule:", error);
        return [];
    }
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    const { id, ...data } = entry;
    await setDoc(doc(db, SCHEDULE_COLLECTION, id), data);
};

export const listenToSchedule = (onUpdate: (schedule: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
        onUpdate(schedule);
    }, (error) => {
        if (error.code !== 'permission-denied') {
             console.error("Error listening to schedule:", error);
        }
    });
};


// --- SYSTEM CONFIG ---

export const listenToSystemConfig = (onUpdate: (config: SystemConfig) => void) => {
    return onSnapshot(doc(db, CONFIG_COLLECTION, 'main'), (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data() as SystemConfig);
        } else {
            onUpdate({ bannerMessage: '', bannerType: 'info', isBannerActive: false });
        }
    }, (error) => {
        if (error.code !== 'permission-denied') {
            console.error("Error listening to system config:", error);
        }
    });
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    await setDoc(doc(db, CONFIG_COLLECTION, 'main'), config, { merge: true });
};


// --- ATTENDANCE ---

export const getAttendanceLogs = async (dateString?: string): Promise<AttendanceLog[]> => {
    try {
        let q;
        if (dateString) {
            q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), where("dateString", "==", dateString));
        } else {
            q = query(collection(db, ATTENDANCE_LOGS_COLLECTION), orderBy("timestamp", "desc"), limit(100));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    } catch (error) {
        console.error("Error getting attendance logs:", error);
        return [];
    }
};

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    try {
        const q = query(
            collection(db, ATTENDANCE_LOGS_COLLECTION), 
            where("studentId", "==", log.studentId),
            where("dateString", "==", log.dateString)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            return false; 
        }

        const { id, ...data } = log;
        await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), data);
        return true;
    } catch (error) {
        console.error("Error logging attendance:", error);
        return false;
    }
};


// --- STAFF ---

export const getStaffMembers = async (): Promise<StaffMember[]> => {
    try {
        const snapshot = await getDocs(collection(db, STAFF_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
    } catch (error) {
        console.error("Error getting staff:", error);
        return [];
    }
};

export const listenToStaffMembers = (onUpdate: (staff: StaffMember[]) => void) => {
    return onSnapshot(collection(db, STAFF_COLLECTION), (snapshot) => {
        const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
        onUpdate(staff);
    }, (error) => {
         if (error.code !== 'permission-denied') {
             console.error("Error listening to staff members:", error);
        } else {
             console.warn("Permissão negada ao ouvir equipe (verifique o login).");
        }
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
    await updateDoc(doc(db, STAFF_COLLECTION, id), { active: false });
};

export const uploadStaffPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `staff_photos/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};


// --- STAFF LOGS ---

export const getStaffLogs = async (dateString: string): Promise<StaffAttendanceLog[]> => {
    try {
        const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", dateString));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffAttendanceLog));
    } catch (error) {
        console.error("Error getting staff logs:", error);
        return [];
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
            const lastLog = snapshot.docs[0].data() as StaffAttendanceLog;
            const diff = log.timestamp - lastLog.timestamp;
            if (diff < 2 * 60 * 1000) {
                return 'too_soon';
            }
        }

        const { id, ...data } = log;
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), data);
        return 'success';
    } catch (error) {
        console.error("Error logging staff attendance:", error);
        return 'error';
    }
};
