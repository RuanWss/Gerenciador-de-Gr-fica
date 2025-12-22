
export enum UserRole {
  TEACHER = 'TEACHER',
  PRINTSHOP = 'PRINTSHOP',
  ATTENDANCE_TERMINAL = 'ATTENDANCE_TERMINAL',
  STAFF_TERMINAL = 'STAFF_TERMINAL',
  HR = 'HR',
  CLASSROOM = 'CLASSROOM',
  LIBRARY = 'LIBRARY',
  AEE = 'AEE'
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
}

export enum ExamStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export type MaterialType = 'exam' | 'handout';

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
  subject?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  photoUrl?: string;
  // Campos AEE
  isAEE?: boolean;
  disorder?: string; 
  reportUrl?: string;
  pedagogicalResponsible?: string; // NOVO
  fatherName?: string;             // NOVO
  motherName?: string;             // NOVO
  contacts?: string;               // NOVO
  coordinationOpinion?: string;    // PARECER DA COORDENAÇÃO
}

export interface PEIDocument {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  period: string; // NOVO: BIMESTRE
  essentialCompetencies: string;
  selectedContents: string;
  didacticResources: string;
  evaluation: string;
  updatedAt: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  active: boolean;
  createdAt: number;
  workPeriod?: 'morning' | 'afternoon' | 'full';
  isTeacher?: boolean;
  isAdmin?: boolean;
  weeklyClasses?: {
      monday: number;
      tuesday: number;
      wednesday: number;
      thursday: number;
      friday: number;
  };
  email?: string;
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

export interface StaffAttendanceLog {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  staffPhotoUrl?: string;
  timestamp: number;
  dateString: string;
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
  date?: string;
  topic?: string;
  content?: string;
  methodology?: string;
  resources?: string;
  evaluation?: string;
  homework?: string;
  period?: string;
  justification?: string;
  semesterContents?: string;
  cognitiveSkills?: string;
  socialEmotionalSkills?: string;
  didacticStrategies?: string;
  activitiesPre?: string;
  activitiesAuto?: string;
  activitiesCoop?: string;
  activitiesCompl?: string;
  educationalPractices?: string;
  educationalSpaces?: string;
  didacticResources?: string;
  evaluationStrategies?: string;
  references?: string;
}

export interface EventTask {
  id: string;
  description: string;
  materials: string;
  assigneeId: string;
  assigneeName: string;
  status: 'todo' | 'doing' | 'done';
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: 'event' | 'holiday' | 'exam' | 'meeting';
  description?: string;
  tasks: EventTask[]; 
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  type: 'class' | 'break';
  label: string;
  shift: 'morning' | 'afternoon';
}

export interface SchoolClass {
  id: string;
  name: string;
  shift: 'morning' | 'afternoon';
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  location?: string;
  createdAt: number;
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
