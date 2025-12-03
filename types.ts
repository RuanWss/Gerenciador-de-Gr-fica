export enum UserRole {
  TEACHER = 'TEACHER',
  PRINTSHOP = 'PRINTSHOP',
  ATTENDANCE_TERMINAL = 'ATTENDANCE_TERMINAL' // Novo papel para o quiosque
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  subject?: string;
  classes?: string[];
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
  fileUrl?: string;
  status: ExamStatus;
  createdAt: number;
  dueDate: string;
}

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  shift: 'morning' | 'afternoon';
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  photoUrl?: string; // Foto para reconhecimento facial
}

export interface AnswerKey {
  id: string;
  title: string;
  numQuestions: number;
  correctAnswers: Record<number, string>;
  createdAt: number;
}

export interface StudentCorrection {
  id: string;
  answerKeyId: string;
  studentName: string;
  score: number;
  answers: Record<number, string>;
  hits: number[];
  date: number;
}

export interface SystemConfig {
  bannerMessage: string;
  bannerType: 'info' | 'warning' | 'error' | 'success';
  isBannerActive: boolean;
  showOnTV?: boolean;
  tvStart?: string;
  tvEnd?: string;
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  type: 'class' | 'break';
  label: string;
  shift: 'morning' | 'afternoon';
}

export interface ScheduleEntry {
  id: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  slotId: string;
  subject: string;
  professor: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  studentPhotoUrl?: string;
  timestamp: number;
  type: 'entry' | 'exit';
  dateString: string;
}