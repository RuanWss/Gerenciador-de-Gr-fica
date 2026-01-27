
export enum UserRole {
  TEACHER = 'TEACHER',
  PRINTSHOP = 'PRINTSHOP',
  ATTENDANCE_TERMINAL = 'ATTENDANCE_TERMINAL',
  STAFF_TERMINAL = 'STAFF_TERMINAL',
  HR = 'HR',
  CLASSROOM = 'CLASSROOM',
  LIBRARY = 'LIBRARY',
  AEE = 'AEE',
  KINDERGARTEN = 'KINDERGARTEN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  password?: string;
  subject?: string;
  classes?: string[];
  phone?: string;
  educationLevels?: string[];
}

export enum ExamStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  COMPLETED = 'COMPLETED'
}

export type MaterialType = 'exam' | 'handout';

export interface PrintingOptions {
  duplex: boolean;
  stapled: boolean;
  colored: boolean;
  paperSize: 'A4' | 'A3' | 'Ofício';
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
  fileNames: string[];
  fileUrls: string[];
  status: ExamStatus;
  createdAt: number;
  dueDate: string;
  materialType?: MaterialType;
  columns?: 1 | 2;
  printingOptions?: PrintingOptions;
  headerData?: {
    schoolName: string;
    showStudentName: boolean;
    showScore: boolean;
    maxScore?: number;
  };
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  photoUrl?: string;
  isAEE?: boolean;
  disorder?: string; 
  disorders?: string[];
  reportUrl?: string;
  contacts?: string; 
  pedagogicalResponsible?: string;
  fatherName?: string;
  motherName?: string;
  coordinationOpinion?: string;
  skills?: string;
  weaknesses?: string;
}

export interface StudentOccurrence {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  category: 'indisciplina' | 'atraso' | 'desempenho' | 'uniforme' | 'elogio' | 'outros';
  severity: 'low' | 'medium' | 'high';
  description: string;
  date: string;
  timestamp: number;
  reportedBy: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  active: boolean;
  createdAt: number;
  email?: string;
  workPeriod?: 'morning' | 'afternoon' | 'full';
  isTeacher?: boolean;
  isAdmin?: boolean;
  weeklyClasses?: number;
  educationLevels?: string[];
  classes?: string[];
}

export interface SystemConfig {
  bannerMessage: string;
  bannerType: 'info' | 'warning' | 'error' | 'success';
  isBannerActive: boolean;
  tvStart?: string;
  tvEnd?: string;
  lastScheduleSync?: number; 
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
  timestamp: number;
  dateString: string;
  studentPhotoUrl?: string;
  type?: 'entry' | 'exit';
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  createdAt: number;
  topic?: string;
  content?: string;
  type?: string;
  
  // --- CAMPOS BIMESTRAIS (Conforme Imagem) ---
  bimester?: string;
  justification?: string;
  contents?: string;
  cognitiveSkills?: string;
  socioEmotionalSkills?: string;
  didacticSituations?: string;
  // Grid de Atividades
  activitiesPrevious?: string;
  activitiesAutodidactic?: string;
  activitiesCooperative?: string;
  activitiesComplementary?: string;
  educationalPractices?: string;
  educationalSpaces?: string;
  didacticResources?: string;
  evaluationStrategies?: string;
  referenceSources?: string;

  // --- CAMPOS PROJETO INOVA AI (Conforme PDF) ---
  inovaTheme?: string;
  guidingQuestion?: string; // Questão Norteadora
  subprojectGoal?: string; // Objetivo
  expectedResults?: string[]; // Resultados Esperados (Checklist)
  finalProductType?: string; // Produto Final (Select/Radio)
  finalProductDescription?: string; // Descrição do produto
  projectSteps?: { // Checklist de Execução
    sensitize: boolean;
    investigate: boolean;
    create: boolean;
    test: boolean;
    present: boolean;
    register: boolean;
  };
  schedule?: string; // Cronograma (pode ser texto livre ou estruturado)
  resourcesNeeded?: string;
  // Uso de IA
  aiTools?: string; // Ferramentas (ChatGPT, Gemini...)
  aiPurpose?: string[]; // Ideias, Roteiro, Texto...
  aiCare?: string; // Cuidado adotado
  evidence?: string; // Evidências de execução
}

export type LessonPlanType = string;

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  type: 'event' | 'holiday' | 'exam' | 'meeting';
  tasks: any[]; 
  description?: string;
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  type: 'class' | 'break';
  label: string;
  shift: 'morning' | 'afternoon';
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  availableQuantity: number;
  totalQuantity: number;
  createdAt: number;
  isbn?: string;
  category?: string;
  location?: string;
}

export interface LibraryLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'late';
}

export interface PEIDocument {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  period: string;
  essentialCompetencies: string;
  selectedContents: string;
  didacticResources: string;
  evaluation: string;
  updatedAt: number;
}

export interface ClassMaterial {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: number;
}

export interface StaffAttendanceLog {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  staffPhotoUrl: string;
  timestamp: number;
  dateString: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  shift: 'morning' | 'afternoon';
}

export interface InfantilReport {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  className: string;
  bimester: '1º BIMESTRE' | '2º BIMESTRE' | '3º BIMESTRE' | '4º BIMESTRE';
  createdAt: number;
  updatedAt: number;
  scores: Record<string, 'I' | 'ED' | 'CA' | ''>;
  descriptiveText: Record<string, string>;
}

export interface AnswerKey {
  id: string;
  title: string;
  teacherId: string;
  createdAt: number;
  questions: { number: number; correctOption: string; subject?: string }[];
}

export interface StudentCorrection {
  id: string;
  answerKeyId: string;
  studentId: string;
  studentName: string;
  score: number;
  timestamp: number;
  answers: any;
}

export interface DailySchoolLog {
  id: string;
  date: string;
  teacherAttendance: Record<string, { present: boolean; substitute?: string }>;
  extraClasses?: Array<{
    professor: string;
    subject: string;
    className: string;
  }>;
}

export interface AEEAppointment {
  id: string;
  studentId: string;
  studentName: string;
  date: string; 
  time: string; 
  period: 'Manhã' | 'Tarde' | 'Contraturno';
  description?: string;
  createdAt: number;
}

// --- GRADEBOOK TYPES ---

export interface AV1Activity {
  id: string;
  name: string;
  date: string;
  deliveryDate?: string;
  maxScore: number;
}

export interface GradebookEntry {
  id: string;
  className: string;
  subject: string;
  bimester: string;
  av1Config: AV1Activity[];
  // Map: studentId -> scores
  grades: Record<string, {
    av1: Record<string, number>; // activityId -> score
    av2?: number; // Simulado (0-10)
    av3?: number; // Prova (0-10)
  }>;
  updatedAt: number;
}
