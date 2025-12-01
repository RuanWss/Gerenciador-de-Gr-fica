import { ExamRequest, ExamStatus, User, UserRole } from '../types';
import { STORAGE_KEY_EXAMS, MOCK_USERS } from '../constants';

const STORAGE_KEY_USERS_DB = 'schoolprint_users_db';

// --- EXAMS ---

export const getExams = (): ExamRequest[] => {
  const stored = localStorage.getItem(STORAGE_KEY_EXAMS);
  return stored ? JSON.parse(stored) : [];
};

export const saveExam = (exam: ExamRequest): void => {
  const exams = getExams();
  exams.push(exam);
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
};

export const updateExamStatus = (examId: string, status: ExamStatus): void => {
  const exams = getExams();
  const updatedExams = exams.map(e => 
    e.id === examId ? { ...e, status } : e
  );
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(updatedExams));
};

export const deleteExam = (examId: string): void => {
  const exams = getExams();
  const updatedExams = exams.filter(e => e.id !== examId);
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(updatedExams));
};

// --- USERS ---

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY_USERS_DB);
  if (!stored) {
    // Initialize with mocks if empty
    const initialUsers = MOCK_USERS.map(u => ({...u, password: '123'})); // Default password for mocks
    localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(stored);
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(users));
};
