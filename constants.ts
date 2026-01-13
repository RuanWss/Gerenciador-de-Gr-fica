
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
export const CLASSES = [
    "JARDIM I", 
    "JARDIM II", 
    "1º ANO EFAI", 
    "2º ANO EFAI", 
    "3º ANO EFAI", 
    "4º ANO EFAI", 
    "5º ANO EFAI", 
    "6º ANO EFAF", 
    "7º ANO EFAF", 
    "8º ANO EFAF", 
    "9º ANO EFAF", 
    "1ª SÉRIE EM", 
    "2ª SÉRIE EM", 
    "3ª SÉRIE EM"
];

export const EFAI_CLASSES = [
    "1º ANO EFAI", 
    "2º ANO EFAI", 
    "3º ANO EFAI", 
    "4º ANO EFAI", 
    "5º ANO EFAI"
];

export const INFANTIL_CLASSES = [
    "JARDIM I",
    "JARDIM II"
];

export const EFAF_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "MATEMÁTICA", "MATEMÁTICA II", "BIOLOGIA", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "REDAÇÃO", "FILOSOFIA", "QUÍMICA", "PROJETO DE VIDA", "EDUCAÇÃO FINANCEIRA", 
    "PENSAMENTO COMPUTACIONAL", "FÍSICA", "DINÂMICAS DE LEITURA", "POLIVALENTE (INFANTIL/EFAI)"
];

export const EM_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "SOCIOLOGIA", "FILOSOFIA", "BIOLOGIA", "FÍSICA", "QUÍMICA", "MATEMÁTICA", 
    "LITERATURA", "PRODUÇÃO TEXTUAL", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "MATEMÁTICA II", "BIOLOGIA II", "QUÍMICA II", 
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO", "ELETIVA 04: PROJETO DE VIDA", 
    "ITINERÁRIO FORMATIVO"
];
