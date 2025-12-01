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
  getDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  initializeApp,
  getAuth
} from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { ExamRequest, ExamStatus, User, UserRole } from '../types';

// Nome das coleções no Firestore
const EXAMS_COLLECTION = 'exams';
const USERS_COLLECTION = 'users';

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

// --- USERS ---

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
// Isso usa uma instância secundária do Firebase App
export const createTeacherUser = async (user: User, password: string): Promise<void> => {
  // Truque: Inicializar uma "App Secundária" para criar o usuário
  // Se usarmos 'auth' padrão, ele faria login automático no novo usuário, deslogando a gráfica.
  const secondaryApp = initializeApp(auth.app.options, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 1. Criar na Autenticação (Email/Senha)
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, password);
    const uid = userCredential.user.uid;

    // 2. Atualizar Nome
    await updateProfile(userCredential.user, { displayName: user.name });

    // 3. Salvar dados extras no Firestore (Turmas, Disciplina, Role)
    await setDoc(doc(db, USERS_COLLECTION, uid), {
      name: user.name,
      email: user.email,
      role: user.role,
      subject: user.subject || '',
      classes: user.classes || []
    });
    
    // Fazer logout da instância secundária para limpar memória
    await secondaryAuth.signOut(); 
  } catch (error) {
    console.error("Erro ao criar professor:", error);
    throw error;
  }
};