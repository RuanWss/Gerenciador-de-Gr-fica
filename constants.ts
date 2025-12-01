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
