
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
  CorrectionResult,
  StudentCorrection, 
  InfantilReport, 
  LibraryBook, 
  LibraryLoan,
  DailySchoolLog,
  GradebookEntry,
  DiagrammedExam
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
const CORRECTION_RESULTS_COLLECTION = 'correctionResults';
const CORRECTIONS_COLLECTION = 'corrections';
const INFANTIL_REPORTS_COLLECTION = 'infantilReports';
const LIBRARY_BOOKS_COLLECTION = 'libraryBooks';
const LIBRARY_LOANS_COLLECTION = 'libraryLoans';
const USERS_COLLECTION = 'users';
const GRADEBOOK_COLLECTION = 'gradebooks';
const DIAGRAMMED_EXAMS_COLLECTION = 'diagrammedExams';

// --- USERS & AUTH ---

export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
  try {
    try {
        const docRef = doc(db, USERS_COLLECTION, uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as User;
        }
    } catch(e) {}

    if (email) {
       try {
           const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase().trim()));
           const querySnapshot = await getDocs(q);
           if (!querySnapshot.empty) {
             return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
           }
       } catch(e) {}

       try {
           const qStaff = query(collection(db, STAFF_COLLECTION), where("email", "==", email.toLowerCase().trim()));
           const staffSnapshot = await getDocs(qStaff);
           if (!staffSnapshot.empty) {
             const staffData = staffSnapshot.docs[0].data() as StaffMember;
             return {
               id: staffData.id,
               name: staffData.name,
               email: staffData.email || '',
               role: (staffData.isTeacher ? UserRole.TEACHER : staffData.isAdmin ? UserRole.HR : UserRole.TEACHER) as UserRole,
               subject: staffData.subject,
               classes: staffData.classes
             } as User;
           }
       } catch(e) {}
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

// --- DIAGRAMMED EXAMS ---

export const saveDiagrammedExam = async (exam: DiagrammedExam) => {
  const docRef = exam.id ? doc(db, DIAGRAMMED_EXAMS_COLLECTION, exam.id) : doc(collection(db, DIAGRAMMED_EXAMS_COLLECTION));
  await setDoc(docRef, { ...exam, id: docRef.id, updatedAt: Date.now() }, { merge: true });
};

export const uploadQuestionImage = async (file: File): Promise<string> => {
  const storageRef = ref(storage, `questions/${Date.now()}_${file.name}`);
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
    await setDoc(docRef, { ...student, id: docRef.id }, { merge: true });
};

export const updateStudent = async (student: Student) => {
    if (!student.id) return;
    const docRef = doc(db, STUDENTS_COLLECTION, student.id);
    await setDoc(docRef, { ...student }, { merge: true });
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

export const generateStudentCredentials = async (studentId: string) => {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) throw new Error("Aluno não encontrado");
    
    const student = studentSnap.data() as Student;
    const cleanName = student.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const cleanId = student.id.replace(/[^0-9A-Z]/g, '');
    const suffix = cleanId.length > 3 ? cleanId.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
    const random = Math.floor(10 + Math.random() * 90).toString();
    
    const accessLogin = `${cleanName}${suffix}${random}`.substring(0, 8);
    const accessPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    await updateDoc(studentRef, {
        accessLogin,
        accessPassword,
        hasAccess: true
    });
    
    return { accessLogin, accessPassword };
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
    const docRef = staff.id ? doc(db, STAFF_COLLECTION, staff.id) : doc(collection(db, STAFF_COLLECTION));
    await setDoc(docRef, { ...staff, id: docRef.id }, { merge: true });
};

export const updateStaffMember = async (staff: StaffMember) => {
    if (!staff.id) return;
    const docRef = doc(db, STAFF_COLLECTION, staff.id);
    await setDoc(docRef, { ...staff }, { merge: true });
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
    const docId = (plan.id && plan.id.length > 0) ? plan.id : null;
    const docRef = docId ? doc(db, LESSON_PLANS_COLLECTION, docId) : doc(collection(db, LESSON_PLANS_COLLECTION));
    await setDoc(docRef, { ...plan, id: docRef.id }, { merge: true });
};

export const deleteLessonPlan = async (id: string) => {
    if (!id) return;
    await deleteDoc(doc(db, LESSON_PLANS_COLLECTION, id));
};

export const listenToAllLessonPlans = (callback: (plans: LessonPlan[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LESSON_PLANS_COLLECTION)); // Removed orderBy to be resilient to missing fields
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan)));
    }, (error) => {
        if (onError) onError(error);
    });
};

export const listenToTeacherLessonPlans = (teacherId: string, teacherEmail: string, callback: (plans: LessonPlan[]) => void, onError?: (error: any) => void) => {
    let q;
    if (teacherEmail === 'ruan.wss@gmail.com') {
        q = query(collection(db, LESSON_PLANS_COLLECTION));
    } else {
        q = query(
            collection(db, LESSON_PLANS_COLLECTION), 
            where("teacherId", "==", teacherId)
        );
    }
    
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

export const listenToClassGradebooks = (className: string, callback: (entries: GradebookEntry[]) => void) => {
    const q = query(collection(db, GRADEBOOK_COLLECTION), where("className", "==", className));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GradebookEntry)));
    });
};

// --- CORRECTION AREA (NEW) ---

export const saveAnswerKey = async (key: AnswerKey) => {
    const docRef = key.id ? doc(db, ANSWER_KEYS_COLLECTION, key.id) : doc(collection(db, ANSWER_KEYS_COLLECTION));
    await setDoc(docRef, { ...key, id: docRef.id }, { merge: true });
};

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
    const snapshot = await getDocs(collection(db, ANSWER_KEYS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnswerKey));
};

export const deleteAnswerKey = async (id: string) => {
    await deleteDoc(doc(db, ANSWER_KEYS_COLLECTION, id));
};

export const saveCorrectionResult = async (result: CorrectionResult) => {
    const docRef = doc(collection(db, CORRECTION_RESULTS_COLLECTION));
    await setDoc(docRef, { ...result, id: docRef.id });
};

export const getCorrectionResults = async (examId: string): Promise<CorrectionResult[]> => {
    const q = query(collection(db, CORRECTION_RESULTS_COLLECTION), where("examId", "==", examId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CorrectionResult));
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

// --- INFANTIL REPORTS ---

export const saveInfantilReport = async (report: InfantilReport) => {
    const docRef = report.id ? doc(db, INFANTIL_REPORTS_COLLECTION, report.id) : doc(collection(db, INFANTIL_REPORTS_COLLECTION));
    await setDoc(docRef, { ...report, id: docRef.id });
};

export const deleteInfantilReport = async (id: string) => {
    await deleteDoc(doc(db, INFANTIL_REPORTS_COLLECTION, id));
};

export const listenToInfantilReports = (teacherId: string, callback: (reports: InfantilReport[]) => void) => {
    let q;
    if (teacherId) {
        q = query(collection(db, INFANTIL_REPORTS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        q = query(collection(db, INFANTIL_REPORTS_COLLECTION));
    }
    
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InfantilReport)));
    });
};

// --- LIBRARY ---

export const listenToLibraryBooks = (callback: (books: LibraryBook[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LIBRARY_BOOKS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
    }, onError);
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
    }, onError);
};

export const createLoan = async (loan: LibraryLoan) => {
    const loanRef = doc(collection(db, LIBRARY_LOANS_COLLECTION));
    await setDoc(loanRef, { ...loan, id: loanRef.id });
    
    const bookRef = doc(db, LIBRARY_BOOKS_COLLECTION, loan.bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        const book = bookSnap.data() as LibraryBook;
        if (book.availableQuantity > 0) {
            await updateDoc(bookRef, { availableQuantity: book.availableQuantity - 1 });
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
        if (book.availableQuantity < book.totalQuantity) {
            await updateDoc(bookRef, { availableQuantity: book.availableQuantity + 1 });
        }
    }
};

export const listenToStudentLoans = (studentId: string, callback: (loans: LibraryLoan[]) => void, onError?: (error: any) => void) => {
    const q = query(collection(db, LIBRARY_LOANS_COLLECTION), where('studentId', '==', studentId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LibraryLoan)));
    }, (error) => {
        if (onError) onError(error);
    });
};
