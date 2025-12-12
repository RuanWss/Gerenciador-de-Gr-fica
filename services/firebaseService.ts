
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
import { db, auth, storage } from '../firebaseConfig';
import { ExamRequest, ExamStatus, User, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry, AttendanceLog, ClassMaterial, LessonPlan } from '../types';

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
const PLANS_COLLECTION = 'lesson_plans';

// --- HELPER: Clean Data (Recursive) ---
// Remove campos undefined para evitar erros no Firestore
const cleanData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanData(item));
    } else if (data !== null && typeof data === 'object') {
        const cleaned: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                cleaned[key] = cleanData(value);
            }
        });
        return cleaned;
    }
    return data;
};

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
    // Sanitiza o nome do arquivo para evitar erros no Storage
    const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storageRef = ref(storage, `materials/${safeClassName}/${Date.now()}_${safeFileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Erro ao fazer upload do material:", error);
    throw error;
  }
};

// --- CLASS MATERIALS ---

export const saveClassMaterial = async (material: ClassMaterial): Promise<string> => {
    try {
        const { id, ...data } = material;
        const cleanedData = cleanData(data);
        const docRef = await addDoc(collection(db, MATERIALS_COLLECTION), cleanedData);
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar material:", error);
        throw error;
    }
};

export const getClassMaterials = async (teacherId: string): Promise<ClassMaterial[]> => {
    try {
        // Removido orderBy para evitar erro de índice composto
        const q = query(collection(db, MATERIALS_COLLECTION), where("teacherId", "==", teacherId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassMaterial));
    } catch (error) {
        console.error("Erro ao buscar materiais:", error);
        return [];
    }
};

export const deleteClassMaterial = async (materialId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, MATERIALS_COLLECTION, materialId));
    } catch (error) {
        console.error("Erro ao deletar material:", error);
        throw error;
    }
};

// Monitora materiais de uma turma específica em tempo real
export const listenToClassMaterials = (
  className: string, 
  onUpdate: (materials: ClassMaterial[]) => void,
  onError?: (error: any) => void
) => {
    // Removido orderBy para evitar erro de índice composto
    const q = query(collection(db, MATERIALS_COLLECTION), where("className", "==", className));
    
    return onSnapshot(q, (snapshot) => {
        const materials = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ClassMaterial));
        onUpdate(materials);
    }, (error) => {
        console.error("Erro no listener de materiais:", error);
        if (onError) onError(error);
    });
};

// --- AUTH & USERS ---

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as User;
      // Compatibilidade com usuários antigos que não têm 'roles'
      if (!data.roles && data.role) {
          data.roles = [data.role];
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
};

// Função para garantir que o usuário tenha um perfil no banco (Self-healing)
export const ensureUserProfile = async (user: User): Promise<void> => {
    if (!user || !user.id) return;
    try {
        const docRef = doc(db, USERS_COLLECTION, user.id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.log("Perfil de usuário não encontrado no Firestore. Criando perfil automático...");
            const { id, ...userData } = user;
            // Garante que tenha pelo menos a role de professor se não tiver nenhuma
            const dataToSave = {
                ...userData,
                role: userData.role || UserRole.TEACHER,
                roles: userData.roles || [UserRole.TEACHER],
                createdAt: Date.now()
            };
            const cleaned = cleanData(dataToSave);
            await setDoc(docRef, cleaned);
        }
    } catch (error) {
        console.error("Erro ao garantir perfil de usuário:", error);
        // Não relança o erro para tentar prosseguir, mas loga
    }
};

export const createTeamMember = async (userData: User, password: string): Promise<void> => {
    // 1. Criar Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const uid = userCredential.user.uid;

    // 2. Atualizar Profile
    await updateProfile(userCredential.user, { displayName: userData.name });

    // 3. Salvar no Firestore
    const { id, ...dataToSave } = userData;
    const cleanedData = cleanData(dataToSave);
    
    await setDoc(doc(db, USERS_COLLECTION, uid), {
        ...cleanedData,
        id: uid,
        createdAt: Date.now()
    });
};

// --- EXAMS ---

export const getExams = async (teacherId?: string): Promise<ExamRequest[]> => {
  try {
    let q;
    if (teacherId) {
        // Se for professor, busca apenas as dele
        q = query(collection(db, EXAMS_COLLECTION), where("teacherId", "==", teacherId));
    } else {
        // Se for admin, busca todas
        q = collection(db, EXAMS_COLLECTION);
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRequest));
  } catch (error: any) {
    console.error("Erro ao buscar provas:", error);
    if (error.code === 'permission-denied') {
        console.warn("Permissão negada para listar provas. Verifique as regras do Firestore.");
    }
    return [];
  }
};

export const saveExam = async (exam: ExamRequest): Promise<void> => {
  try {
    const { id, ...data } = exam;
    const cleanedData = cleanData(data);
    await addDoc(collection(db, EXAMS_COLLECTION), cleanedData);
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
    throw error;
  }
};

export const updateExamRequest = async (exam: ExamRequest): Promise<void> => {
    try {
        const { id, ...data } = exam;
        const examRef = doc(db, EXAMS_COLLECTION, id);
        const cleanedData = cleanData(data);
        await updateDoc(examRef, cleanedData);
    } catch (error) {
        console.error("Erro ao atualizar prova:", error);
        throw error;
    }
};

export const deleteExamRequest = async (examId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, EXAMS_COLLECTION, examId));
    } catch (error) {
        console.error("Erro ao deletar prova:", error);
        throw error;
    }
};

// --- SYSTEM CONFIG ---

export const listenToSystemConfig = (onUpdate: (config: SystemConfig) => void) => {
    const docRef = doc(db, CONFIG_COLLECTION, 'main');
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data() as SystemConfig);
        } else {
            // Default config
            onUpdate({ bannerMessage: '', bannerType: 'info', isBannerActive: false });
        }
    }, (error) => {
        console.warn("Erro ao ouvir config (provavelmente permissão):", error.code);
        // Não trava a app, apenas loga
    });
};

export const updateSystemConfig = async (config: SystemConfig): Promise<void> => {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, 'main');
        const cleanedData = cleanData(config);
        await setDoc(docRef, cleanedData, { merge: true });
    } catch (error) {
        console.error("Erro ao atualizar config:", error);
        throw error;
    }
};

export const clearSystemAnnouncement = async (): Promise<void> => {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, 'main');
        await updateDoc(docRef, {
            bannerMessage: '',
            isBannerActive: false
        });
    } catch (error) {
        console.error("Erro ao limpar aviso:", error);
        throw error;
    }
};

// --- SCHEDULE ---

export const listenToSchedule = (onUpdate: (schedule: ScheduleEntry[]) => void) => {
    const q = collection(db, SCHEDULE_COLLECTION);
    return onSnapshot(q, (snapshot) => {
        const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
        onUpdate(schedule);
    }, (error) => {
        console.warn("Erro ao ouvir horários:", error.code);
    });
};

export const getFullSchedule = async (): Promise<ScheduleEntry[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        return [];
    }
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<void> => {
    try {
        const docRef = doc(db, SCHEDULE_COLLECTION, entry.id);
        const cleanedData = cleanData(entry);
        await setDoc(docRef, cleanedData);
    } catch (error) {
        console.error("Erro ao salvar horário:", error);
        throw error;
    }
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
        if (error.code === 'permission-denied') {
            console.warn("Permissão negada para listar alunos. Verifique as regras do Firestore.");
        }
        return [];
    }
};

export const saveStudent = async (student: Student): Promise<void> => {
    try {
        const { id, ...data } = student;
        const cleanedData = cleanData(data);
        await addDoc(collection(db, STUDENTS_COLLECTION), cleanedData);
    } catch (error) {
        console.error("Erro ao salvar aluno:", error);
        throw error;
    }
};

export const updateStudent = async (student: Student): Promise<void> => {
    try {
        const { id, ...data } = student;
        const studentRef = doc(db, STUDENTS_COLLECTION, id);
        const cleanedData = cleanData(data);
        await updateDoc(studentRef, cleanedData);
    } catch (error) {
        console.error("Erro ao atualizar aluno:", error);
        throw error;
    }
};

export const deleteStudent = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
    } catch (error) {
        console.error("Erro ao deletar aluno:", error);
        throw error;
    }
};

// --- ATTENDANCE ---

export const logAttendance = async (log: AttendanceLog): Promise<boolean> => {
    try {
        // Verifica se já existe registro para este aluno nesta data
        const q = query(
            collection(db, ATTENDANCE_COLLECTION), 
            where("studentId", "==", log.studentId),
            where("dateString", "==", log.dateString)
        );
        
        const snapshot = await getDocs(q);
        
        // Se já existe um registro hoje, não duplica (regra de negócio simples para MVP)
        if (!snapshot.empty) {
            return false; 
        }

        const { id, ...data } = log;
        const cleanedData = cleanData(data);
        await addDoc(collection(db, ATTENDANCE_COLLECTION), cleanedData);
        return true;
    } catch (error) {
        console.error("Erro ao registrar presença:", error);
        return false;
    }
};

export const getAttendanceLogs = async (dateString?: string): Promise<AttendanceLog[]> => {
    try {
        let q;
        if (dateString) {
             q = query(collection(db, ATTENDANCE_COLLECTION), where("dateString", "==", dateString));
        } else {
             // Busca apenas os de hoje por padrão se não passar data
             const today = new Date().toISOString().split('T')[0];
             q = query(collection(db, ATTENDANCE_COLLECTION), where("dateString", "==", today));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog))
            .sort((a,b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Erro ao buscar logs:", error);
        return [];
    }
};

export const getAllAttendanceLogs = async (): Promise<AttendanceLog[]> => {
    try {
        const snapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    } catch (error) {
        console.error("Erro ao buscar todos logs:", error);
        return [];
    }
};

// --- ANSWER KEYS & CORRECTIONS (MOCK / PLACEHOLDER) ---

export const getAnswerKeys = async (): Promise<AnswerKey[]> => {
    try {
        const snapshot = await getDocs(collection(db, ANSWER_KEYS_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnswerKey));
    } catch (error) {
        return [];
    }
};

// --- LESSON PLANS ---

export const saveLessonPlan = async (plan: LessonPlan): Promise<string> => {
    try {
        const { id, ...data } = plan;
        const cleanedData = cleanData(data);
        const docRef = await addDoc(collection(db, PLANS_COLLECTION), cleanedData);
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar planejamento:", error);
        throw error;
    }
};

export const getLessonPlans = async (teacherId?: string): Promise<LessonPlan[]> => {
    try {
        let q;
        if (teacherId) {
            q = query(collection(db, PLANS_COLLECTION), where("teacherId", "==", teacherId));
        } else {
            q = collection(db, PLANS_COLLECTION);
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonPlan));
    } catch (error: any) {
        console.error("Erro ao buscar planejamentos:", error);
        if (error.code === 'permission-denied') {
            console.warn("Permissão negada para listar planejamentos. Verifique as regras do Firestore.");
        }
        return [];
    }
};