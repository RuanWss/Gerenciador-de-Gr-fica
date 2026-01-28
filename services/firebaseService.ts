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
  limit
} from 'firebase/firestore';
import { 
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
  DailySchoolLog,
  GradebookEntry
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
const GRADEBOOK_COLLECTION = 'gradebooks';

// --- USERS & AUTH ---

export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    if (email) {
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
    else console.warn("Missing permissions for system config document");
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

export const saveExam = async (exam: ExamRequest) => {
  const docRef = doc(collection(db, EXAMS_COLLECTION));
  await setDoc(docRef, { ...exam, id: docRef.id });
};

export const updateExamStatus = async (examId: string, status: ExamStatus) => {
  const docRef = doc(db, EXAMS_COLLECTION, examId);
  await updateDoc(docRef, { status });
};

export const uploadExamFile = async (file: File, folderName: string): Promise<string> => {
  const safeFolder = folderName.replace(/[^a-zA-Z0-9À-ÿ -]/g, "").trim(); 
  const storageRef = ref(storage, `exams/${safeFolder}/${Date.now()}_${file.name}`);
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
  });
};

export const saveStudent = async (student: Student) => {
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

// --- ATTENDANCE ---

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
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
    });
};

export const logStaffAttendance = async (log: StaffAttendanceLog): Promise<string> => {
    const today = new Date().toISOString().split('T')[0];
    const qLast = query(
        collection(db, STAFF_LOGS_COLLECTION),
        where("staffId", "==", log.staffId),
        where("dateString", "==", today),
        orderBy("timestamp", "desc"),
        limit(1)
    );
    
    const snapshotLast = await getDocs(qLast);
    let type: 'entry' | 'exit' = 'entry';
    
    if (!snapshotLast.empty) {
        const lastDoc = snapshotLast.docs[0].data() as StaffAttendanceLog;
        if (Date.now() - lastDoc.timestamp < 2 * 60 * 1000) return 'too_soon';
        type = lastDoc.type === 'entry' ? 'exit' : 'entry';
    }

    const docRef = doc(collection(db, STAFF_LOGS_COLLECTION));
    await setDoc(docRef, { ...log, id: docRef.id, type });
    return `success_${type}`;
};

export const listenToStaffLogs = (date: string, callback: (logs: StaffAttendanceLog[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, STAFF_LOGS_COLLECTION), where("dateString", "==", date));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendanceLog)));
    }, (error) => {
        if (onError) onError(error);
    });
};

// --- OCCURRENCES ---

export const listenToOccurrences = (callback: (occurrences: StudentOccurrence[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, OCCURRENCES_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentOccurrence)));
    }, (error) => {
        if (onError) onError(error);
    });
};

export const saveOccurrence = async (occurrence: StudentOccurrence) => {
    const docRef = occurrence.id ? doc(db, OCCURRENCES_COLLECTION, occurrence.id) : doc(collection(db, OCCURRENCES_COLLECTION));
    await setDoc(docRef, { ...occurrence, id: docRef.id });
};

export const deleteOccurrence = async (id: string) => {
    await deleteDoc(doc(db, OCCURRENCES_COLLECTION, id));
};

// --- LESSON PLANS ---

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

// --- AEE APPOINTMENTS ---

export const listenToAEEAppointments = (callback: (appointments: AEEAppointment[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, AEE_APPOINTMENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AEEAppointment)));
    }, (error) => {
        if (onError) onError(error);
    });
};

export const saveAEEAppointment = async (app: AEEAppointment) => {
    const docRef = app.id ? doc(db, AEE_APPOINTMENTS_COLLECTION, app.id) : doc(collection(db, AEE_APPOINTMENTS_COLLECTION));
    await setDoc(docRef, { ...app, id: docRef.id });
};

export const deleteAEEAppointment = async (id: string) => {
    await deleteDoc(doc(db, AEE_APPOINTMENTS_COLLECTION, id));
};

// --- GRADEBOOK ---

export const saveGradebook = async (data: GradebookEntry) => {
    const docId = data.id || `${data.className}_${data.subject}_${data.bimester}`.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, GRADEBOOK_COLLECTION, docId);
    await setDoc(docRef, { ...data, id: docId, updatedAt: Date.now() }, { merge: true });
};

export const listenToGradebook = (
    className: string, 
    subject: string, 
    bimester: string, 
    callback: (data: GradebookEntry | null) => void
) => {
    const docId = `${className}_${subject}_${bimester}`.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, GRADEBOOK_COLLECTION, docId);
    
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as GradebookEntry);
        } else {
            callback(null);
        }
    });
};

// --- SYNC ---

export const syncAllDataWithGennera = async (onProgress: (msg: string) => void) => {
    onProgress("Iniciando conexão com Gennera...");
    try {
        const classes = await fetchGenneraClasses();
        onProgress(`Encontradas ${classes.length} turmas. Sincronizando alunos...`);
        let totalStudents = 0;
        for (const cls of classes) {
            onProgress(`Processando turma: ${cls.name}...`);
            const students = await fetchGenneraStudentsByClass(cls.id, cls.name);
            for (const student of students) {
                const studentRef = doc(db, STUDENTS_COLLECTION, student.id);
                await setDoc(studentRef, student, { merge: true });
            }
            totalStudents += students.length;
        }
        onProgress(`Sincronização concluída! ${totalStudents} alunos atualizados.`);
    } catch (error: any) {
        throw new Error(error.message || "Falha na sincronização");
    }
};

// ... remaining service methods ...
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

export const saveClassMaterial = async (material: ClassMaterial) => {
    const docRef = doc(collection(db, CLASS_MATERIALS_COLLECTION));
    await setDoc(docRef, { ...material, id: docRef.id });
};

export const uploadClassMaterial = async (file: File, className: string): Promise<string> => {
    const safeClass = className.replace(/[^a-zA-Z0-9À-ÿ -]/g, "_").trim();
    const storageRef = ref(storage, `materials/${safeClass}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const listenToClassMaterials = (className: string, callback: (materials: ClassMaterial[]) => void, onError: (error: any) => void) => {
    const q = query(collection(db, CLASS_MATERIALS_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassMaterial)));
    }, onError);
};

export const listenToInfantilReports = (teacherId: string, callback: (reports: InfantilReport[]) => void, onError?: (error: any) => void) => {
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
    });
};

export const deleteInfantilReport = async (id: string) => {
    await deleteDoc(doc(db, INFANTIL_REPORTS_COLLECTION, id));
};

export const saveInfantilReport = async (report: InfantilReport) => {
    const docRef = report.id ? doc(db, INFANTIL_REPORTS_COLLECTION, report.id) : doc(collection(db, INFANTIL_REPORTS_COLLECTION));
    await setDoc(docRef, { ...report, id: docRef.id });
};

export const generateStudentCredentials = async (studentId: string): Promise<Student> => {
    // Basic implementation to avoid "Missing" errors, actual student portal logic would be here
    return {} as Student;
};

export const listenToStudentLoans = (studentId: string, callback: (loans: LibraryLoan[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LIBRARY_LOANS_COLLECTION), where("studentId", "==", studentId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    }, (error) => {
        if (onError) onError(error);
    });
};

// --- LIBRARY ---

// FIX: Added missing exported function to listen to library books.
export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void) => {
    const q = query(collection(db, LIBRARY_BOOKS_COLLECTION), orderBy('title', 'asc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    });
};

// FIX: Added missing exported function to save library books.
export const saveLibraryBook = async (book: LibraryBook) => {
    const docRef = book.id ? doc(db, LIBRARY_BOOKS_COLLECTION, book.id) : doc(collection(db, LIBRARY_BOOKS_COLLECTION));
    await setDoc(docRef, { ...book, id: docRef.id });
};

// FIX: Added missing exported function to delete library books.
export const deleteLibraryBook = async (id: string) => {
    await deleteDoc(doc(db, LIBRARY_BOOKS_COLLECTION, id));
};

// FIX: Added missing exported function to listen to all library loans.
export const listenToLibraryLoans = (callback: (loans: LibraryLoan[]) => void) => {
    const q = query(collection(db, LIBRARY_LOANS_COLLECTION), orderBy('loanDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    });
};

// FIX: Added missing exported function to create library loans.
export const createLoan = async (loan: LibraryLoan) => {
    // 1. Create the loan record
    const loanRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
    const loanData = { ...loan, id: loanRef.id };
    await setDoc(loanRef, loanData);

    // 2. Update book availability
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        const bookData = bookSnap.data() as LibraryBook;
        await updateDoc(bookRef, { 
            availableQuantity: Math.max(0, (bookData.availableQuantity || 0) - 1) 
        });
    }
};

// FIX: Added missing exported function to return library loans.
export const returnLoan = async (loanId: string, bookId: string) => {
    // 1. Mark loan as returned
    const loanRef = doc(db, LIBRARY_LOANS_COLLECTION, loanId);
    await updateDoc(loanRef, { 
        status: 'returned', 
        returnDate: new Date().toISOString().split('T')[0] 
    });

    // 2. Update book availability
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        const bookData = bookSnap.data() as LibraryBook;
        await updateDoc(bookRef, { 
            availableQuantity: Math.min(bookData.totalQuantity, (bookData.availableQuantity || 0) + 1) 
        });
    }
};
