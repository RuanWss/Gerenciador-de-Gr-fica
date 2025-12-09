
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
  limit
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  getAuth
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { db, auth, storage } from '../firebaseConfig';
import { ExamRequest, ExamStatus, User, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry, AttendanceLog, ClassMaterial } from '../types';

// Nome das coleções no Firestore
const EXAMS_COLLECTION = 'exams';
const USERS_COLLECTION = 'users';
const CLASSES_COLLECTION = 'classes';
const STUDENTS_COLLECTION = 'students';
const ANSWER_KEYS_COLLECTION = 'answer_keys';
const CORRECTIONS_COLLECTION = 'corrections';
const CONFIG_COLLECTION = 'config';
const SCHEDULE_COLLECTION = 'schedules';
const ATTENDANCE_COLLECTION = 'attendance_logs';
const MATERIALS_COLLECTION = 'class_materials';

// --- STORAGE ---

export const uploadExamFile = async (file: File): Promise<string> => {
  if (!file) return '';
  try {
    const storageRef = ref(storage, `exams/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    throw error;
  }
};

export const uploadStudentPhoto = async (file: File): Promise<string> => {
  if (!file) return '';
  try {
    const storageRef = ref(storage, `students/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
};

// Faz o upload organizado por pasta: materials/NomeDaTurma/NomeDoArquivo
export const uploadClassMaterialFile = async (file: File, className: string): Promise<string> => {
  if (!file) return '';
  try {
    // Sanitiza o nome da turma para criar uma pasta válida
    const safeClassName = className.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `materials/${safeClassName}/${Date.now()}_${file.name}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Erro ao fazer upload do material:", error);
    throw error;
  }
};

// --- CLASS MATERIALS ---

export const saveClassMaterial = async (material: ClassMaterial): Promise<void> => {
    try {
        const { id, ...data } = material;
        await addDoc(collection(db, MATERIALS_COLLECTION), data);
    } catch (error) {
        console.error("Erro ao salvar material:", error);
        throw error;
    }
};

export const getClassMaterials = async (teacherId: string): Promise<ClassMaterial[]> => {
    try {
        const q = query(collection(db, MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassMaterial));
    } catch (error) {
        console.error("Erro ao buscar materiais:", error);
        return [];
    }
};

// --- EXAMS ---

export const getExams = async (): Promise<ExamRequest[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, EXAMS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExamRequest));
  } catch (error) {
    console.error("Erro ao buscar provas:", error);
    return [];
  }
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
  try {
    const { id, ...examData } = exam;
    await addDoc(collection(db, EXAMS_COLLECTION), examData);
  } catch (error) {
    console.error("Erro ao salvar prova:", error);
    throw error;
  }
};

export const updateExamRequest = async (exam: ExamRequest): Promise<void> => {
    try {
        if (!exam.id) throw new Error("ID da prova necessário para atualização");
        const examRef = doc(db, EXAMS_COLLECTION, exam.id);
        const { id, ...examData } = exam;
        await updateDoc(examRef, examData);
    } catch (error) {
        console.error("Erro ao atualizar prova:", error);
        throw error;
    }
};

export const updateExamStatus = async (examId: string, status: ExamStatus): Promise<void> => {
  try {
    const examRef = doc(db, EXAMS_COLLECTION, examId);
    await updateDoc(examRef, { status });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
  }
};

// --- ANSWER KEYS ---

export const saveAnswerKey = async (key: AnswerKey): Promise<void> => {
  try {
    if (key.id) {
        const docRef = doc(db, ANSWER_KEYS_COLLECTION, key.id);
        const { id, ...data } = key;
        await updateDoc(docRef, data);
    } else {
        const { id, ...data } = key;
        await addDoc(collection(db, ANSWER_KEYS_COLLECTION), data);
    }
  } catch (error) {
    console.error("Erro ao salvar gabarito:", error);
    throw error;
  }
};

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, ANSWER_KEYS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AnswerKey));
  } catch (error) {
    console.error("Erro ao buscar gabaritos:", error);
    return [];
  }
};

export const deleteAnswerKey = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ANSWER_KEYS_COLLECTION, id));
  } catch (error) {
    console.error("Erro ao excluir gabarito:", error);
    throw error;
  }
};

// --- CORRECTIONS ---

export const saveStudentCorrection = async (correction: StudentCorrection): Promise<void> => {
    try {
        const { id, ...data } = correction;
        await addDoc(collection(db, CORRECTIONS_COLLECTION), data);
    } catch (error) {
        console.error("Erro ao salvar correção", error);
        throw error;
    }
};

export const getStudentCorrections = async (answerKeyId?: string): Promise<StudentCorrection[]> => {
    try {
        let q = query(collection(db, CORRECTIONS_COLLECTION));
        if (answerKeyId) {
            q = query(collection(db, CORRECTIONS_COLLECTION), where("answerKeyId", "==", answerKeyId));
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentCorrection));
    } catch (error) {
        console.error("Erro ao buscar correções", error);
        return [];
    }
};

// --- USERS & ADMIN ---

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
};

export const createTeacherUser = async (user: User, password: string): Promise<void> => {
  const secondaryApp = initializeApp(auth.app.options, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, password);
    const uid = userCredential.user.uid;

    await updateProfile(userCredential.user, { displayName: user.name });

    await setDoc(doc(db, USERS_COLLECTION, uid), {
      name: user.name,
      email: user.email,
      role: user.role,
      subject: user.subject || '',
      classes: user.classes || []
    });
    
    await secondaryAuth.signOut(); 
  } catch (error) {
    console.error("Erro ao criar professor:", error);
    throw error;
  }
};

// --- CLASSES & STUDENTS ---

export const getClasses = async (): Promise<SchoolClass[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CLASSES_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
  } catch (error) {
    console.error("Erro ao buscar turmas", error);
    return [];
  }
};

export const saveClass = async (schoolClass: SchoolClass): Promise<void> => {
  try {
    const { id, ...data } = schoolClass;
    await addDoc(collection(db, CLASSES_COLLECTION), data);
  } catch (error) {
    console.error("Erro ao salvar turma", error);
    throw error;
  }
};

export const getStudents = async (): Promise<Student[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error("Erro ao buscar alunos", error);
    return [];
  }
};

export const saveStudent = async (student: Student): Promise<void> => {
  try {
    const { id, ...data } = student;
    await addDoc(collection(db, STUDENTS_COLLECTION), data);
  } catch (error) {
    console.error("Erro ao salvar aluno", error);
    throw error;
  }
};

export const updateStudent = async (student: Student): Promise<void> => {
  try {
    if (!student.id) throw new Error("ID do aluno necessário para atualização");
    const studentRef = doc(db, STUDENTS_COLLECTION, student.id);
    const { id, ...data } = student;
    await updateDoc(studentRef, data);
  } catch (error) {
    console.error("Erro ao atualizar aluno", error);
    throw error;
  }
};

export const deleteStudent = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
  } catch (error) {
    console.error("Erro ao excluir aluno", error);
    throw error;
  }
};

// --- SCHEDULE SYSTEM ---

export const getFullSchedule = async (): Promise<ScheduleEntry[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
        return querySnapshot.docs.map(doc => doc.data() as ScheduleEntry);
    } catch (error) {
        console.error("Erro ao buscar horários", error);
        return [];
    }
};

export const listenToSchedule = (callback: (entries: ScheduleEntry[]) => void) => {
    const q = query(collection(db, SCHEDULE_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map(doc => doc.data() as ScheduleEntry);
        callback(entries);
    });
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    try {
        const docId = `${entry.classId}_${entry.dayOfWeek}_${entry.slotId}`;
        await setDoc(doc(db, SCHEDULE_COLLECTION, docId), { ...entry, id: docId });
    } catch (error) {
        console.error("Erro ao salvar horário", error);
        throw error;
    }
};

// --- SYSTEM CONFIG ---

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, 'general');
        await setDoc(docRef, config);
    } catch (error) {
        console.error("Erro ao atualizar config:", error);
    }
};

export const clearSystemAnnouncement = async (): Promise<void> => {
     try {
        const docRef = doc(db, CONFIG_COLLECTION, 'general');
        await setDoc(docRef, {
            bannerMessage: '',
            isBannerActive: false,
            showOnTV: false,
            tvStart: '',
            tvEnd: ''
        }, { merge: true });
    } catch (error) {
        console.error("Erro ao limpar config:", error);
    }
};

export const listenToSystemConfig = (callback: (config: SystemConfig | null) => void) => {
    const docRef = doc(db, CONFIG_COLLECTION, 'general');
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as SystemConfig);
        } else {
            callback(null);
        }
    });
};

// --- ATTENDANCE SYSTEM ---

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    try {
        // Verificar se já existe registro para este aluno HOJE
        const q = query(
            collection(db, ATTENDANCE_COLLECTION),
            where('studentId', '==', log.studentId),
            where('dateString', '==', log.dateString)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Já existe registro
            console.log("Frequência já registrada para hoje.");
            return false;
        }

        const { id, ...data } = log;
        await addDoc(collection(db, ATTENDANCE_COLLECTION), data);
        return true;
    } catch (error) {
        console.error("Erro ao registrar frequência", error);
        throw error;
    }
};

export const getAttendanceLogs = async (dateString?: string): Promise<AttendanceLog[]> => {
    try {
        let q = query(collection(db, ATTENDANCE_COLLECTION), orderBy('timestamp', 'desc'), limit(100));
        
        if (dateString) {
             q = query(collection(db, ATTENDANCE_COLLECTION), where('dateString', '==', dateString), orderBy('timestamp', 'desc'));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    } catch (error) {
        console.error("Erro ao buscar logs de frequência", error);
        return [];
    }
};

// Busca todos os logs para relatórios (pode ser pesado em produção, ideal filtrar por range de data)
export const getAllAttendanceLogs = async (): Promise<AttendanceLog[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    } catch (error) {
        console.error("Erro ao buscar histórico completo", error);
        return [];
    }
};

// Remove undefined fields helper
export const cleanData = (data: any) => {
    return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
};