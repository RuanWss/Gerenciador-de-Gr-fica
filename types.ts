export enum UserRole {
  TEACHER = 'TEACHER',
  PRINTSHOP = 'PRINTSHOP'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Adicionado para login
  subject?: string;  // Disciplina do professor
  classes?: string[]; // Turmas associadas
}

export enum ExamStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface ExamRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  title: string;
  quantity: number;
  gradeLevel: string;
  instructions: string;
  fileName: string;
  status: ExamStatus;
  createdAt: number; // timestamp
  dueDate: string; // YYYY-MM-DD
}

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}