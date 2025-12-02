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
  onSnapshot
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
import { ExamRequest, ExamStatus, User, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry } from '../types';

// Nome das coleções no Firestore
const EXAMS_COLLECTION = 'exams';
const USERS_COLLECTION = 'users';
const CLASSES_COLLECTION = 'classes';
const STUDENTS_COLLECTION = 'students';
const ANSWER_KEYS_COLLECTION = 'answer_keys';
const CORRECTIONS_COLLECTION = 'corrections';
const CONFIG_COLLECTION = 'config'; // Coleção para configurações globais
const SCHEDULE_COLLECTION = 'schedules';

// --- STORAGE ---

export const uploadExamFile = async (file: File): Promise<string> => {
  if (!file) return '';
  try {
    // Cria uma referência única para o arquivo: exams/timestamp_nomearquivo
    const storageRef = ref(storage, `exams/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    throw error;
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
    // Removemos o ID se ele for gerado aleatoriamente no client, deixamos o Firestore criar
    const { id, ...examData } = exam;
    await addDoc(collection(db, EXAMS_COLLECTION), examData);
  } catch (error) {
    console.error("Erro ao salvar prova:", error);
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

// --- ANSWER KEYS (GABARITOS) ---

export const saveAnswerKey = async (key: AnswerKey): Promise<void> => {
  try {
    // Se tiver ID, atualiza, senão cria
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

// --- CORRECTIONS (ESTATÍSTICAS) ---

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

// Função para criar usuário sem deslogar o admin (Gráfica)
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

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    try {
        // ID composto para facilitar a sobreposição: "turma_dia_slot"
        const docId = `${entry.classId}_${entry.dayOfWeek}_${entry.slotId}`;
        await setDoc(doc(db, SCHEDULE_COLLECTION, docId), { ...entry, id: docId });
    } catch (error) {
        console.error("Erro ao salvar horário", error);
        throw error;
    }
};

// --- SYSTEM CONFIG (REALTIME) ---

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, 'general');
        await setDoc(docRef, config);
    } catch (error) {
        console.error("Erro ao atualizar config:", error);
    }
};

// Hook-like function para ouvir mudanças
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