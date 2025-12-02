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
  fileUrl?: string; // URL do arquivo no Storage
  status: ExamStatus;
  createdAt: number; // timestamp
  dueDate: string; // YYYY-MM-DD
}

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface SchoolClass {
  id: string;
  name: string; // Ex: 6º Ano A
  shift: 'morning' | 'afternoon';
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
}

export interface AnswerKey {
  id: string;
  title: string; // Nome da prova
  numQuestions: number;
  correctAnswers: Record<number, string>; // { 1: 'A', 2: 'B', ... }
  createdAt: number;
}

export interface StudentCorrection {
  id: string;
  answerKeyId: string;
  studentName: string;
  score: number;
  answers: Record<number, string>; // Respostas do aluno
  hits: number[]; // Array com numeros das questoes que acertou
  date: number;
}

export interface SystemConfig {
  bannerMessage: string;
  bannerType: 'info' | 'warning' | 'error' | 'success';
  isBannerActive: boolean;
}

// --- SCHEDULE TYPES ---

export interface TimeSlot {
  id: string;
  start: string; // "07:20"
  end: string;   // "08:10"
  type: 'class' | 'break';
  label: string; // "1º Horário" or "Intervalo"
  shift: 'morning' | 'afternoon';
}

export interface ScheduleEntry {
  id: string; // composite: classId_dayOfWeek_slotId
  classId: string; // "6ano", "1em", etc. (Using fixed IDs for simplicity based on prompt)
  className: string;
  dayOfWeek: number; // 1 = Monday, 5 = Friday
  slotId: string;
  subject: string;
  professor: string;
}