
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
  reportUrl?: string;
  contacts?: string; 
  pedagogicalResponsible?: string;
  fatherName?: string;
  motherName?: string;
  coordinationOpinion?: string;
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

export interface ExtraClassRecord {
  professor: string;
  subject: string;
  className: string;
}

export interface DailySchoolLog {
  id: string;
  date: string;
  adminAttendance: Record<string, { present: boolean; shifts: string[] }>;
  teacherAttendance: Record<string, { present: boolean; substitute?: string }>;
  extraClasses?: ExtraClassRecord[];
  generalObservations: string;
  updatedAt: number;
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
}

export interface SystemConfig {
  bannerMessage: string;
  bannerType: 'info' | 'warning' | 'error' | 'success';
  isBannerActive: boolean;
  tvStart?: string;
  tvEnd?: string;
  whatsappInstance?: string; 
  whatsappApiKey?: string;   
  whatsappBaseUrl?: string;  
  printShopNumber?: string;   
  enableAutomations?: boolean;
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

export type LessonPlanType = 'daily' | 'semester';

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  type: LessonPlanType;
  className: string;
  subject: string;
  createdAt: number;
  topic?: string;
  period?: string;
  date?: string;
  content?: string;
  methodology?: string;
  resources?: string;
  evaluation?: string;
  homework?: string;
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

export interface AnswerKey {
  id: string;
  examId: string;
  subject: string;
  className: string;
  title: string;
  answers: Record<number, string>;
}

export interface StudentCorrection {
  id: string;
  studentId: string;
  studentName: string;
  answerKeyId: string;
  score: number;
  answers: Record<number, string>;
}

export interface SchoolClass {
  id: string;
  name: string;
  shift: 'morning' | 'afternoon';
}
