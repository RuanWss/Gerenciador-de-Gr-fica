
export enum UserRole {
  TEACHER = 'TEACHER',
  PRINTSHOP = 'PRINTSHOP',
  ATTENDANCE_TERMINAL = 'ATTENDANCE_TERMINAL',
  STAFF_TERMINAL = 'STAFF_TERMINAL', // Novo: Quiosque de Ponto da Equipe
  HR = 'HR', // Novo: Recursos Humanos
  CLASSROOM = 'CLASSROOM' // Novo: Acesso específico para Arquivos da Turma
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Role ativa na sessão atual
  roles?: UserRole[]; // Lista de roles permitidas para o usuário
  password?: string;
  subject?: string;
  classes?: string[];
}

export enum ExamStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export type MaterialType = 'exam' | 'handout'; // Prova ou Apostila

export interface ExamRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  title: string;
  quantity: number;
  gradeLevel: string;
  instructions: string; // Pode ser usado para subtítulo
  fileName: string;
  fileUrl?: string;
  status: ExamStatus;
  createdAt: number;
  dueDate: string;
  
  // Novos campos de diagramação
  materialType?: MaterialType;
  columns?: 1 | 2;
  headerData?: {
    schoolName: string;
    showStudentName: boolean;
    showScore: boolean;
    maxScore?: number;
  };
}

export interface ClassMaterial {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject?: string; // Disciplina da pasta
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: number;
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

// Interface para Funcionários (Equipe)
export interface StaffMember {
  id: string;
  name: string;
  role: string; // Cargo (Prof, Limpeza, Secretaria, etc)
  photoUrl?: string;
  active: boolean;
  createdAt: number;
  
  // Novos campos de Jornada
  workPeriod?: 'morning' | 'afternoon' | 'full';
  isTeacher?: boolean;
  weeklyClasses?: {
      monday: number;
      tuesday: number;
      wednesday: number;
      thursday: number;
      friday: number;
  };
  email?: string; // E-mail para login no sistema
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

// Log de Ponto da Equipe
export interface StaffAttendanceLog {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  staffPhotoUrl?: string;
  timestamp: number;
  dateString: string; // YYYY-MM-DD para agrupar
}

export type LessonPlanType = 'daily' | 'semester';

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  type: LessonPlanType;
  className: string;
  subject: string;
  createdAt: number;
  
  // Campos do Planejamento Diário
  date?: string; // Data da aula
  topic?: string; // Tema
  content?: string; // Conteúdo Programático
  methodology?: string; // Metodologia / Estratégias
  resources?: string; // Recursos Didáticos
  evaluation?: string; // Avaliação
  homework?: string; // Tarefa de Casa

  // Campos do Planejamento Semestral (Atualizado conforme imagem)
  period?: string; // Bimestre
  justification?: string; // Breve Justificativa
  semesterContents?: string; // Conteúdos (Semestral)
  cognitiveSkills?: string; // Habilidades Cognitivas
  socialEmotionalSkills?: string; // Habilidades Socioemocionais
  didacticStrategies?: string; // Situações Didáticas
  
  // Atividades
  activitiesPre?: string; // Prévias
  activitiesAuto?: string; // Autodidáticas
  activitiesCoop?: string; // Didático-Cooperativas
  activitiesCompl?: string; // Complementares
  
  educationalPractices?: string; // Práticas Educativas
  educationalSpaces?: string; // Espaços Educativos
  didacticResources?: string; // Recursos Didáticos (Semestral)
  evaluationStrategies?: string; // Estratégias de Avaliação
  references?: string; // Fontes de Referência
}
