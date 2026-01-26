
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

import { db, auth, storage, firebaseConfig } from '../firebaseConfig';
import { 
  User, 
  UserRole, 
  ExamRequest, 
  ExamStatus, 
  Student, 
  SystemConfig, 
  ScheduleEntry, 
  StaffMember, 
  StaffAttendanceLog, 
  AttendanceLog, 
  StudentOccurrence, 
  LessonPlan, 
  PEIDocument, 
  ClassMaterial, 
  AEEAppointment, 
  AnswerKey, 
  StudentCorrection, 
  InfantilReport, 
  LibraryBook, 
  LibraryLoan,
  DailySchoolLog
} from '../types';
import { fetchGenneraClasses, fetchGenneraStudentsByClass } from './genneraService';

// --- COLLECTIONS ---
const EXAMS_COLLECTION = 'exams';
const STUDENTS_COLLECTION = 'students';
const SYSTEM_CONFIG_COLLECTION = 'systemConfig';
const SCHEDULE_COLLECTION = 'schedule';
const STAFF_COLLECTION = 'staff';
const STAFF_LOGS_COLLECTION = 'staffLogs';
const ATTENDANCE_COLLECTION = 'attendance';
const OCCURRENCES_COLLECTION = 'occurrences';
const LESSON_PLANS_COLLECTION = 'lessonPlans';
const PEI_COLLECTION = 'peiDocuments';
const CLASS_MATERIALS_COLLECTION = 'classMaterials';
const AEE_APPOINTMENTS_COLLECTION = 'aeeAppointments';
const ANSWER_KEYS_COLLECTION = 'answerKeys';
const CORRECTIONS_COLLECTION = 'corrections';
const INFANTIL_REPORTS_COLLECTION = 'infantilReports';
const LIBRARY_BOOKS_COLLECTION = 'libraryBooks';
const LIBRARY_LOANS_COLLECTION = 'libraryLoans';
const USERS_COLLECTION = 'users';

// --- USERS & AUTH ---

export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    // Fallback if user exists in Auth but not in Firestore (e.g. system accounts)
    if (email) {
       // Check if there is a doc with this email as ID (legacy) or query by email
       const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
       const querySnapshot = await getDocs(q);
       if (!querySnapshot.empty) {
         return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
       }
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const createSystemUserAuth = async (email: string, name: string, roles: UserRole[]) => {
    // Initialize a secondary app to create users without logging out the current user
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, "cemal1234");
        
        const user: User = {
            id: userCredential.user.uid,
            name,
            email,
            role: roles[0] || UserRole.TEACHER,
            roles: roles
        };
        
        await setDoc(doc(db, USERS_COLLECTION, user.id), user);
        await signOut(secondaryAuth);
    } catch (e: any) {
        // If email already exists in Auth, just update Firestore roles
        if (e.code !== 'auth/email-already-in-use') {
            throw e;
        }
        await updateSystemUserRoles(email, roles);
    } 
    // Note: We cannot easily delete the secondary app instance in v9 modular SDK, 
    // but it's lightweight enough for occasional use.
};

export const updateSystemUserRoles = async (email: string, roles: UserRole[]) => {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, { roles, role: roles[0] });
    }
};

export const updateSystemUserProfile = async (email: string, data: any) => {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, data);
    }
};

// --- SYSTEM CONFIG ---

export const listenToSystemConfig = (callback: (config: SystemConfig) => void, onError?: (error: any) => void) => {
  const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'global');
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as SystemConfig);
    } else {
      callback({ bannerMessage: '', bannerType: 'info', isBannerActive: false });
    }
  }, (error) => {
    if (onError) onError(error);
    else console.error("Error listening to system config:", error);
  });
};

export const updateSystemConfig = async (config: SystemConfig) => {
  const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'global');
  await setDoc(docRef, config, { merge: true });
};

// --- EXAMS ---

export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
  let q;
  if (teacherId) {
    q = query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId));
  } else {
    q = query(collection(db, EXAMS_COLLECTION));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest));
};

export const listenToExams = (callback: (exams: ExamRequest[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, EXAMS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRequest)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to exams:", error);
    });
};

export const saveExam = async (exam: ExamRequest) => {
  const docRef = doc(collection(db, EXAMS_COLLECTION));
  await setDoc(docRef, { ...exam, id: docRef.id });
};

export const updateExamStatus = async (examId: string, status: ExamStatus) => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  await updateDoc(docRef, { status });
};

export const uploadExamFile = async (file: File, folderName: string): Promise<string> => {
  const storageRef = ref(storage, `exams/${folderName}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

// --- STUDENTS ---

export const getStudents = async (): Promise<Student[]> => {
  const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
};

export const listenToStudents = (callback: (students: Student[]) => void, onError?: (error: any) => void) => {
  const q = query(collection(db, STUDENTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
  }, (error) => {
    if (onError) onError(error);
    else console.error("Error listening to students:", error);
  });
};

export const saveStudent = async (student: Student) => {
    // Use student ID as doc ID if provided, otherwise auto-id (but usually we want ID to match matricula)
    const docRef = student.id ? doc(db, STUDENTS_COLLECTION, student.id) : doc(collection(db, STUDENTS_COLLECTION));
    await setDoc(docRef, { ...student, id: docRef.id });
};

export const updateStudent = async (student: Student) => {
    if (!student.id) return;
    const docRef = doc(db, STUDENTS_COLLECTION, student.id);
    await updateDoc(docRef, { ...student });
};

export const deleteStudent = async (id: string) => {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
};

export const uploadStudentPhoto = async (file: File, studentName: string): Promise<string> => {
    const storageRef = ref(storage, `students/${studentName}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const uploadReportFile = async (file: File, studentName: string): Promise<string> => {
    const storageRef = ref(storage, `reports/${studentName}_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// --- STAFF ---

export const listenToStaffMembers = (callback: (staff: StaffMember[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, STAFF_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to staff:", error);
    });
};

export const saveStaffMember = async (staff: StaffMember) => {
    const docRef = doc(collection(db, STAFF_COLLECTION));
    await setDoc(docRef, { ...staff, id: docRef.id });
};

export const updateStaffMember = async (staff: StaffMember) => {
    const docRef = doc(db, STAFF_COLLECTION, staff.id);
    await updateDoc(docRef, { ...staff });
};

export const deleteStaffMember = async (id: string) => {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
};

export const uploadStaffPhoto = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `staff/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

// --- SCHEDULE ---

export const listenToSchedule = (callback: (schedule: ScheduleEntry[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, SCHEDULE_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleEntry)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to schedule:", error);
    });
};

export const saveScheduleEntry = async (entry: ScheduleEntry) => {
    if (entry.id) {
        const docRef = doc(db, SCHEDULE_COLLECTION, entry.id);
        await setDoc(docRef, entry);
    } else {
        const docRef = doc(collection(db, SCHEDULE_COLLECTION));
        await setDoc(docRef, { ...entry, id: docRef.id });
    }
};

export const deleteScheduleEntry = async (id: string) => {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
};

// --- ATTENDANCE (STUDENTS) ---

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    // Check for duplicate within short timeframe if needed, but for now just add
    const q = query(
        collection(db, ATTENDANCE_COLLECTION), 
        where("studentId", "==", log.studentId),
        where("dateString", "==", log.dateString)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        // Already logged for today (simplified logic, real world might allow multiple entries)
        // return false; 
    }
    
    const docRef = doc(collection(db, ATTENDANCE_COLLECTION));
    await setDoc(docRef, { ...log, id: docRef.id });
    return true;
};

export const listenToAttendanceLogs = (date: string, callback: (logs: AttendanceLog[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, ATTENDANCE_COLLECTION), where("dateString", "==", date));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLog)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to attendance:", error);
    });
};

// --- ATTENDANCE (STAFF) ---

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<string> => {
    // Check recent logs to prevent double tap
    const recentLimit = Date.now() - (2 * 60 * 1000); // 2 minutes
    const q = query(
        collection(db, STAFF_LOGS_COLLECTION),
        where("staffId", "==", log.staffId),
        where("timestamp", ">", recentLimit)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return 'too_soon';

    const docRef = doc(collection(db, STAFF_LOGS_COLLECTION));
    await setDoc(docRef, { ...log, id: docRef.id });
    return 'success';
};

export const listenToStaffLogs = (date: string, callback: (logs: StaffAttendanceLog[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", date));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to staff logs:", error);
    });
};

export const getMonthlyStaffLogs = async (month: string): Promise<StaffAttendanceLog[]> => {
    // month format YYYY-MM
    const start = `${month}-01`;
    const end = `${month}-31`;
    const q = query(
        collection(db, STAFF_LOGS_COLLECTION), 
        where("dateString", ">=", start),
        where("dateString", "<=", end)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog));
};

export const getDailySchoolLog = async (date: string): Promise<DailySchoolLog | null> => {
    // This assumes a separate collection for daily consolidation if it exists
    // For now, return mock or null if not implemented in DB structure
    return null;
};

export const getMonthlySchoolLogs = async (month: string): Promise<DailySchoolLog[]> => {
    // Placeholder
    return [];
};

// --- OCCURRENCES ---

export const listenToOccurrences = (callback: (occurrences: StudentOccurrence[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, OCCURRENCES_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentOccurrence)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to occurrences:", error);
    });
};

export const saveOccurrence = async (occurrence: StudentOccurrence) => {
    const docRef = doc(collection(db, OCCURRENCES_COLLECTION));
    await setDoc(docRef, { ...occurrence, id: docRef.id });
};

export const deleteOccurrence = async (id: string) => {
    await deleteDoc(doc(db, OCCURRENCES_COLLECTION, id));
};

// --- LESSON PLANS ---

export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    let q;
    if (teacherId) {
        q = query(collection(db, LESSON_PLANS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = query(collection(db, LESSON_PLANS_COLLECTION));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan));
};

export const saveLessonPlan = async (plan: LessonPlan) => {
    const docRef = plan.id ? doc(db, LESSON_PLANS_COLLECTION, plan.id) : doc(collection(db, LESSON_PLANS_COLLECTION));
    await setDoc(docRef, { ...plan, id: docRef.id });
};

export const deleteLessonPlan = async (id: string) => {
    await deleteDoc(doc(db, LESSON_PLANS_COLLECTION, id));
};

export const listenToAllLessonPlans = (callback: (plans: LessonPlan[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LESSON_PLANS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to lesson plans", error);
    });
};

// --- PEI ---

export const getAllPEIs = async (): Promise<PEIDocument[]> => {
    const snapshot = await getDocs(collection(db, PEI_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PEIDocument));
};

export const savePEIDocument = async (pei: PEIDocument) => {
    const docRef = pei.id ? doc(db, PEI_COLLECTION, pei.id) : doc(collection(db, PEI_COLLECTION));
    await setDoc(docRef, { ...pei, id: docRef.id });
};

export const deletePEIDocument = async (id: string) => {
    await deleteDoc(doc(db, PEI_COLLECTION, id));
};

// --- CLASS MATERIALS ---

export const saveClassMaterial = async (material: ClassMaterial) => {
    const docRef = doc(collection(db, CLASS_MATERIALS_COLLECTION));
    await setDoc(docRef, { ...material, id: docRef.id });
};

export const getClassMaterials = async (teacherId?: string): Promise<ClassMaterial[]> => {
    let q;
    if (teacherId) {
        q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = query(collection(db, CLASS_MATERIALS_COLLECTION));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial));
};

export const deleteClassMaterial = async (id: string) => {
    await deleteDoc(doc(db, CLASS_MATERIALS_COLLECTION, id));
};

export const listenToClassMaterials = (className: string, callback: (materials: ClassMaterial[]) => void, onError: (error: any) => void) => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial)));
    }, onError);
};

// --- AEE APPOINTMENTS ---

export const listenToAEEAppointments = (callback: (appointments: AEEAppointment[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, AEE_APPOINTMENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AEEAppointment)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to AEE appointments:", error);
    });
};

export const saveAEEAppointment = async (app: AEEAppointment) => {
    const docRef = app.id ? doc(db, AEE_APPOINTMENTS_COLLECTION, app.id) : doc(collection(db, AEE_APPOINTMENTS_COLLECTION));
    await setDoc(docRef, { ...app, id: docRef.id });
};

export const deleteAEEAppointment = async (id: string) => {
    await deleteDoc(doc(db, AEE_APPOINTMENTS_COLLECTION, id));
};

// --- ANSWER KEYS & CORRECTIONS ---

export const saveAnswerKey = async (key: AnswerKey) => {
    const docRef = key.id ? doc(db, ANSWER_KEYS_COLLECTION, key.id) : doc(collection(db, ANSWER_KEYS_COLLECTION));
    await setDoc(docRef, { ...key, id: docRef.id });
};

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
    const snapshot = await getDocs(collection(db, ANSWER_KEYS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnswerKey));
};

export const deleteAnswerKey = async (id: string) => {
    await deleteDoc(doc(db, ANSWER_KEYS_COLLECTION, id));
};

export const saveCorrection = async (correction: StudentCorrection) => {
    const docRef = doc(collection(db, CORRECTIONS_COLLECTION));
    await setDoc(docRef, { ...correction, id: docRef.id });
};

// --- INFANTIL REPORTS ---

export const saveInfantilReport = async (report: InfantilReport) => {
    const docRef = report.id ? doc(db, INFANTIL_REPORTS_COLLECTION, report.id) : doc(collection(db, INFANTIL_REPORTS_COLLECTION));
    await setDoc(docRef, { ...report, id: docRef.id });
};

export const listenToInfantilReports = (teacherId: string, callback: (reports: InfantilReport[]) => void, onError?: (error: any) => void) => {
    // If teacherId is empty/admin, maybe show all? assuming teacher sees their own or admin sees all
    let q;
    if (teacherId) {
        q = query(collection(db, INFANTIL_REPORTS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = query(collection(db, INFANTIL_REPORTS_COLLECTION));
    }
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InfantilReport)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to infantil reports:", error);
    });
};

export const deleteInfantilReport = async (id: string) => {
    await deleteDoc(doc(db, INFANTIL_REPORTS_COLLECTION, id));
};

// --- LIBRARY ---

export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LIBRARY_BOOKS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to library books:", error);
    });
};

export const saveLibraryBook = async (book: LibraryBook) => {
    const docRef = book.id ? doc(db, LIBRARY_BOOKS_COLLECTION, book.id) : doc(collection(db, LIBRARY_BOOKS_COLLECTION));
    await setDoc(docRef, { ...book, id: docRef.id });
};

export const deleteLibraryBook = async (id: string) => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

export const listenToLibraryLoans = (callback: (loans: LibraryLoan[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LIBRARY_LOANS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    }, (error) => {
        if (onError) onError(error);
        else console.error("Error listening to library loans:", error);
    });
};

export const createLoan = async (loan: LibraryLoan) => {
    // Decrement book quantity
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        const book = bookSnap.data() as LibraryBook;
        if (book.availableQuantity > 0) {
            await updateDoc(bookRef, { availableQuantity: book.availableQuantity - 1 });
            const docRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
            await setDoc(docRef, { ...loan, id: docRef.id });
        }
    }
};

export const returnLoan = async (loanId: string, bookId: string) => {
    const loanRef = doc(db, LIBRARY_LOANS_COLLECTION, loanId);
    await updateDoc(loanRef, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
    
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        const book = bookSnap.data() as LibraryBook;
        await updateDoc(bookRef, { availableQuantity: Math.min(book.availableQuantity + 1, book.totalQuantity) });
    }
};

// --- GENNERA SYNC ---

export const syncAllDataWithGennera = async (onProgress: (msg: string) => void) => {
    onProgress("Iniciando conexão com Gennera...");
    
    try {
        const classes = await fetchGenneraClasses();
        onProgress(`Encontradas ${classes.length} turmas. Sincronizando alunos...`);
        
        let totalStudents = 0;
        
        for (const cls of classes) {
            onProgress(`Processando turma: ${cls.name}...`);
            const students = await fetchGenneraStudentsByClass(cls.id, cls.name);
            
            // Batch update or sequential update
            for (const student of students) {
                // Update or create student in Firestore
                const studentRef = doc(db, STUDENTS_COLLECTION, student.id);
                await setDoc(studentRef, {
                    ...student,
                    // Keep existing data if present (like photoUrl if not from ERP)
                }, { merge: true });
            }
            totalStudents += students.length;
        }
        
        onProgress(`Sincronização concluída! ${totalStudents} alunos atualizados.`);
    } catch (error: any) {
        console.error("Sync Error:", error);
        throw new Error(error.message || "Falha na sincronização");
    }
};
