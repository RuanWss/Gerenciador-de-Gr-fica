
import { User, UserRole } from './types';

// Mock Users for simulation
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Prof. Carlos Silva',
    email: 'prof@escola.com',
    role: UserRole.TEACHER
  },
  {
    id: 'u2',
    name: 'Profa. Ana Souza',
    email: 'ana@escola.com',
    role: UserRole.TEACHER
  },
  {
    id: 'u3',
    name: 'Central de Cópias',
    email: 'grafica@escola.com',
    role: UserRole.PRINTSHOP
  }
];

export const STORAGE_KEY_EXAMS = 'schoolprint_exams';
export const STORAGE_KEY_USER = 'schoolprint_user';

// Shared constants for classes and subjects
export const CLASSES = ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"];

export const EFAF_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "MATEMÁTICA", "MATEMÁTICA II", "BIOLOGIA", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "REDAÇÃO", "FILOSOFIA", "QUÍMICA", "PROJETO DE VIDA", "EDUCAÇÃO FINANCEIRA", 
    "PENSAMENTO COMPUTACIONAL", "FÍSICA", "DINÂMICAS DE LEITURA"
];

export const EM_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "SOCIOLOGIA", "FILOSOFIA", "BIOLOGIA", "FÍSICA", "QUÍMICA", "MATEMÁTICA", 
    "LITERATURA", "PRODUÇÃO TEXTUAL", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "MATEMÁTICA II", "BIOLOGIA II", "QUÍMICA II", 
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO", "ELETIVA 04: PROJETO DE VIDA", 
    "ITINERÁRIO FORMATIVO"
];
