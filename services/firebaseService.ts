
import { db, storage, auth, firebaseConfig, app } from '../firebaseConfig';
// Import types and modular functions
import { 
    createUserWithEmailAndPassword, 
    updateProfile, 
    signOut 
} from 'firebase/auth';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, 
    query, where, orderBy, onSnapshot, setDoc, limit, increment, writeBatch,
    startAt, endAt
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
    ExamRequest, ExamStatus, User, UserRole, ClassMaterial, LessonPlan, 
    Student, ScheduleEntry, SystemConfig, AttendanceLog, StaffMember, 
    StaffAttendanceLog, SchoolEvent, LibraryBook, LibraryLoan,
    AnswerKey, StudentCorrection, PEIDocument, StudentOccurrence, DailySchoolLog, InfantilReport, PedagogicalProject,
    AEEAppointment
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
const OCCURRENCES_COLLECTION = 'occurrences';
const DAILY_LOGS_COLLECTION = 'daily_logs';
const INFANTIL_REPORTS_COLLECTION = 'infantil_reports';
const PEDAGOGICAL_PROJECTS_COLLECTION = 'pedagogical_projects';
const AEE_APPOINTMENTS_COLLECTION = 'aee_appointments';

const sanitizeForFirestore = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'string') return value.trim();
        return value;
    }));
};

// --- GABARITOS E CORREÇÕES ---
export const saveAnswerKey = async (key: AnswerKey): Promise<string> => {
    const { id, ...data } = key;
    if (id) {
        await setDoc(doc(db, ANSWER_KEYS_COLLECTION, id), sanitizeForFirestore(data));
        return id;
    } else {
        const docRef = await addDoc(collection(db, ANSWER_KEYS_COLLECTION), sanitizeForFirestore(data));
        return docRef.id;
    }
};

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
    const snapshot = await getDocs(query(collection(db, ANSWER_KEYS_COLLECTION), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnswerKey));
};

export const deleteAnswerKey = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, ANSWER_KEYS_COLLECTION, id));
};

export const saveCorrection = async (correction: StudentCorrection): Promise<void> => {
    await addDoc(collection(db, CORRECTIONS_COLLECTION), sanitizeForFirestore(correction));
};

export const getCorrectionsByGabarito = async (answerKeyId: string): Promise<StudentCorrection[]> => {
    const q = query(collection(db, CORRECTIONS_COLLECTION), where("answerKeyId", "==", answerKeyId), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentCorrection));
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
        
        for (const cls of classes) {
            try {
                if (onProgress) onProgress("Buscando alunos: " + cls.name);
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

export const listenToAllMaterials = (callback: (materials: ClassMaterial[]) => void) => {
    return onSnapshot(collection(db, CLASS_MATERIALS_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro All Materials:", error);
    });
};

export const listenToSchedule = (callback: (entries: ScheduleEntry[]) => void) => {
    return onSnapshot(collection(db, SCHEDULE_COLLECTION), (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Schedule:", error);
    });
};

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

export const listenToOccurrences = (callback: (occurrences: StudentOccurrence[]) => void) => {
    const q = query(collection(db, OCCURRENCES_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentOccurrence)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Occurrences:", error);
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
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", dateString));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog));
        logs.sort((a, b) => b.timestamp - a.timestamp);
        callback(logs);
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

export const getDailySchoolLog = async (date: string): Promise<DailySchoolLog | null> => {
    const docRef = doc(db, DAILY_LOGS_COLLECTION, date);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as DailySchoolLog;
    return null;
};

export const getMonthlySchoolLogs = async (month: string): Promise<DailySchoolLog[]> => {
    const q = query(
        collection(db, DAILY_LOGS_COLLECTION),
        where("date", ">=", `${month}-01`),
        where("date", "<=", `${month}-31`)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailySchoolLog));
};

export const getMonthlyStaffLogs = async (month: string): Promise<StaffAttendanceLog[]> => {
    const q = query(
        collection(db, STAFF_LOGS_COLLECTION),
        where("dateString", ">=", `${month}-01`),
        where("dateString", "<=", `${month}-31`)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog));
};

export const saveDailySchoolLog = async (log: DailySchoolLog): Promise<void> => {
    await setDoc(doc(db, DAILY_LOGS_COLLECTION, log.date), sanitizeForFirestore(log));
};

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

export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
    // Try by UID first
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as User;

    // If not found and email provided, try by email-based ID (legacy/hr created)
    if (email) {
         const emailId = email.replace(/[^a-zA-Z0-9]/g, '_');
         const emailDocRef = doc(db, USERS_COLLECTION, emailId);
         const emailDocSnap = await getDoc(emailDocRef);
         if (emailDocSnap.exists()) return { id: emailDocSnap.id, ...emailDocSnap.data() } as User;
    }
    return null;
};

export const getAllPEIs = async (teacherId?: string): Promise<PEIDocument[]> => {
    const q = teacherId 
        ? query(collection(db, PEI_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, PEI_COLLECTION);
    const snapshot = await getDocs(q);
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

export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
    await updateDoc(doc(db, EXAMS_COLLECTION, examId), { status });
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
    const { id, ...data } = exam;
    if (id) await setDoc(doc(db, EXAMS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, EXAMS_COLLECTION), sanitizeForFirestore(data));
};

export const saveOccurrence = async (occurrence: StudentOccurrence): Promise<void> => {
    const { id, ...data } = occurrence;
    if (id) await setDoc(doc(db, OCCURRENCES_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, OCCURRENCES_COLLECTION), sanitizeForFirestore(data));
};

export const deleteOccurrence = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, OCCURRENCES_COLLECTION, id));
};

export const saveLessonPlan = async (plan: LessonPlan): Promise<void> => {
    const { id, ...data } = plan;
    if (id) await setDoc(doc(db, LESSON_PLANS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, LESSON_PLANS_COLLECTION), sanitizeForFirestore(data));
};

export const deleteLessonPlan = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LESSON_PLANS_COLLECTION, id));
};

export const savePEIDocument = async (pei: PEIDocument): Promise<void> => {
    const { id, ...data } = pei;
    if (id) await setDoc(doc(db, PEI_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, PEI_COLLECTION), sanitizeForFirestore(data));
};

export const deletePEIDocument = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, PEI_COLLECTION, id));
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    const { id, ...data } = entry;
    if (id) await setDoc(doc(db, SCHEDULE_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, SCHEDULE_COLLECTION), sanitizeForFirestore(data));
};

export const deleteScheduleEntry = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
};

export const uploadExamFile = async (file: File, teacherName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `exams/${teacherName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const uploadReportFile = async (file: File, studentName: string): Promise<string> => {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `reports/${studentName.replace(/\s+/g, '_')}_${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const uploadStudentPhoto = async (file: File, studentName: string): Promise<string> => {
    const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `students/biometry/${safeName}_${Date.now()}.jpg`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    await setDoc(doc(db, SYSTEM_CONFIG_COLLECTION, 'main'), sanitizeForFirestore(config));
};

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    try {
        const sanitizedLog = sanitizeForFirestore(log);
        const q = query(
            collection(db, ATTENDANCE_LOGS_COLLECTION),
            where("studentId", "==", sanitizedLog.studentId),
            where("dateString", "==", sanitizedLog.dateString)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return false;
        await addDoc(collection(db, ATTENDANCE_LOGS_COLLECTION), sanitizedLog);
        return true;
    } catch (error) {
        console.error("Erro ao registrar frequência:", error);
        return false;
    }
};

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<'success' | 'too_soon' | 'error'> => {
    try {
        const sanitizedLog = sanitizeForFirestore(log);
        const q = query(
            collection(db, STAFF_LOGS_COLLECTION),
            where("staffId", "==", sanitizedLog.staffId),
            orderBy("timestamp", "desc"),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const lastLog = snapshot.docs[0].data();
            const diff = Date.now() - lastLog.timestamp;
            if (diff < 120000) return 'too_soon';
        }
        await addDoc(collection(db, STAFF_LOGS_COLLECTION), sanitizedLog);
        return 'success';
    } catch (error) {
        console.error("Erro ao registrar ponto do staff:", error);
        return 'error';
    }
};

export const saveStaffMember = async (staff: StaffMember): Promise<void> => {
    const sanitized = sanitizeForFirestore(staff);
    const { id, ...data } = sanitized;
    if (id) await setDoc(doc(db, STAFF_COLLECTION, id), data);
    else await addDoc(collection(db, STAFF_COLLECTION), data);
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
    const sanitized = sanitizeForFirestore(material);
    const { id, ...data } = sanitized;
    if (id) await setDoc(doc(db, CLASS_MATERIALS_COLLECTION, id), data);
    else await addDoc(collection(db, CLASS_MATERIALS_COLLECTION), data);
};

export const deleteClassMaterial = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, CLASS_MATERIALS_COLLECTION, id));
};

export const saveLibraryBook = async (book: LibraryBook): Promise<void> => {
    const sanitized = sanitizeForFirestore(book);
    const { id, ...data } = sanitized;
    if (id) await setDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id), data);
    else await addDoc(collection(db, LIBRARY_BOOKS_COLLECTION), data);
};

export const deleteLibraryBook = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

export const createLoan = async (loan: LibraryLoan): Promise<void> => {
    const sanitizedLoan = sanitizeForFirestore(loan);
    const batch = writeBatch(db);
    const loanRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, sanitizedLoan.bookId);
    batch.set(loanRef, { ...sanitizedLoan, id: loanRef.id });
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

export const saveStudent = async (student: Student): Promise<void> => {
    const sanitized = sanitizeForFirestore(student);
    const { id, ...data } = sanitized;
    if (id) {
        await setDoc(doc(db, STUDENTS_COLLECTION, id), data);
    } else {
        const newRef = doc(collection(db, STUDENTS_COLLECTION));
        await setDoc(newRef, { ...data, id: newRef.id });
    }
};

export const deleteStudent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
};

export const saveSchoolEvent = async (event: SchoolEvent): Promise<void> => {
    const sanitized = sanitizeForFirestore(event);
    const { id, ...data } = sanitized;
    if (id) await setDoc(doc(db, EVENTS_COLLECTION, id), data);
    else await addDoc(collection(db, EVENTS_COLLECTION), data);
};

export const deleteSchoolEvent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
};

export const createSystemUserAuth = async (email: string, name: string, roles: UserRole[]): Promise<void> => {
    const userProfile: User = {
        id: email.replace(/[^a-zA-Z0-9]/g, '_'), 
        name: name,
        email: email,
        role: roles[0],
        roles: roles
    };
    await setDoc(doc(db, USERS_COLLECTION, userProfile.id), sanitizeForFirestore(userProfile));
};

export const updateSystemUserRoles = async (email: string, roles: UserRole[]): Promise<void> => {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, { roles: roles, role: roles[0] });
    }
};

export const updateSystemUserProfile = async (email: string, data: Partial<User>): Promise<void> => {
    const id = email.replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, USERS_COLLECTION, id), data, { merge: true });
};

export const saveInfantilReport = async (report: InfantilReport): Promise<void> => {
    const sanitized = sanitizeForFirestore(report);
    const { id, ...data } = sanitized;
    if (id) {
        await setDoc(doc(db, INFANTIL_REPORTS_COLLECTION, id), data);
    } else {
        const newRef = doc(collection(db, INFANTIL_REPORTS_COLLECTION));
        await setDoc(newRef, { ...data, id: newRef.id });
    }
};

export const listenToInfantilReports = (teacherId: string, callback: (reports: InfantilReport[]) => void) => {
    const q = query(collection(db, INFANTIL_REPORTS_COLLECTION), where("teacherId", "==", teacherId), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InfantilReport)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro Infantil Reports:", error);
    });
};

export const listenToAllInfantilReports = (callback: (reports: InfantilReport[]) => void) => {
    const q = query(collection(db, INFANTIL_REPORTS_COLLECTION), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InfantilReport)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Erro All Infantil Reports:", error);
    });
};

export const deleteInfantilReport = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, INFANTIL_REPORTS_COLLECTION, id));
};

export const getPedagogicalProjects = async (teacherId?: string): Promise<PedagogicalProject[]> => {
    const q = teacherId 
        ? query(collection(db, PEDAGOGICAL_PROJECTS_COLLECTION), where("teacherId", "==", teacherId))
        : collection(db, PEDAGOGICAL_PROJECTS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PedagogicalProject));
};

export const savePedagogicalProject = async (project: PedagogicalProject): Promise<void> => {
    const sanitized = sanitizeForFirestore(project);
    const { id, ...data } = sanitized;
    if (id) {
        await setDoc(doc(db, PEDAGOGICAL_PROJECTS_COLLECTION, id), data);
    } else {
        const newRef = doc(collection(db, PEDAGOGICAL_PROJECTS_COLLECTION));
        await setDoc(newRef, { ...data, id: newRef.id });
    }
};

export const deletePedagogicalProject = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, PEDAGOGICAL_PROJECTS_COLLECTION, id));
};

// --- AEE APPOINTMENTS ---
export const saveAEEAppointment = async (appointment: AEEAppointment): Promise<void> => {
    const { id, ...data } = appointment;
    if (id) await setDoc(doc(db, AEE_APPOINTMENTS_COLLECTION, id), sanitizeForFirestore(data));
    else await addDoc(collection(db, AEE_APPOINTMENTS_COLLECTION), sanitizeForFirestore(data));
};

export const deleteAEEAppointment = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, AEE_APPOINTMENTS_COLLECTION, id));
};

export const listenToAEEAppointments = (callback: (appointments: AEEAppointment[]) => void) => {
    const q = query(collection(db, AEE_APPOINTMENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AEEAppointment)));
    }, (error) => {
        if (error.code !== 'permission-denied') console.error("Error listening to appointments:", error);
    });
};
