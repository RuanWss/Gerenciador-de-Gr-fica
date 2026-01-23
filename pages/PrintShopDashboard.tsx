
import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToSystemConfig, 
    updateSystemConfig,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAttendanceLogs,
    listenToOccurrences,
    listenToStudents,
    listenToExams,
    updateStudent,
    deleteStudent,
    saveStudent,
    uploadStudentPhoto,
    listenToAEEAppointments,
    saveAEEAppointment,
    deleteAEEAppointment,
    saveAnswerKey,
    getAnswerKeys,
    deleteAnswerKey,
    saveCorrection,
    listenToAllLessonPlans
} from '../services/firebaseService';
import { analyzeAnswerSheet } from '../services/geminiService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig,
    ScheduleEntry,
    TimeSlot,
    StaffMember,
    AttendanceLog,
    StudentOccurrence,
    AEEAppointment,
    AnswerKey,
    StudentCorrection,
    LessonPlan
} from '../types';
import { 
    Printer, Search, Users, Settings, RefreshCw, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Truck, Save, X, Loader2, Megaphone, ToggleLeft, ToggleRight, Download,
    Database, CalendarClock, Trash2, Edit, Monitor, GraduationCap, Radio, BookOpen, AlertTriangle, Camera, User, Calendar, Heart, Plus, ChevronLeft, ChevronRight, FileCheck, UploadCloud, BrainCircuit, ListOrdered, BookMarked, UserPlus
} from 'lucide-react';
import { Button } from '../components/Button';
import { CLASSES, EFAI_CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { GenneraSyncPanel } from './GenneraSyncPanel';

// --- CONFIGURAÇÃO DE HORÁRIOS ---
const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const MORNING_SLOTS_EFAI: TimeSlot[] = [
    { id: 'm1', start: '07:30', end: '08:25', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:25', end: '09:20', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:20', end: '09:40', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:40', end: '10:35', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:35', end: '11:30', type: 'class', label: '4º Horário', shift: 'morning' },
];

const AFTERNOON_SLOTS: TimeSlot[] = [
    { id: 'a1', start: '13:00', end: '13:50', type: 'class', label: '1º Horário', shift: 'afternoon' },
    { id: 'a2', start: '13:50', end: '14:40', type: 'class', label: '2º Horário', shift: 'afternoon' },
    { id: 'a3', start: '14:40', end: '15:30', type: 'class', label: '3º Horário', shift: 'afternoon' },
    { id: 'ab1', start: '15:30', end: '16:00', type: 'break', label: 'INTERVALO', shift: 'afternoon' },
    { id: 'a4', start: '16:00', end: '16:50', type: 'class', label: '4º Horário', shift: 'afternoon' },
    { id: 'a5', start: '16:50', end: '17:40', type: 'class', label: '5º Horário', shift: 'afternoon' },
    { id: 'a6', start: '17:40', end: '18:30', type: 'class', label: '6º Horário', shift: 'afternoon' },
    { id: 'a7', start: '18:30', end: '19:20', type: 'class', label: '7º Horário', shift: 'afternoon' },
    { id: 'a8', start: '19:20', end: '20:00', type: 'class', label: '8º Horário', shift: 'afternoon' },
];

// LISTAS DE TURMAS
const EFAI_CLASSES_LIST = [
    { id: '1anoefai', name: '1º EFAI' },
    { id: '2anoefai', name: '2º EFAI' },
    { id: '3anoefai', name: '3º EFAI' },
    { id: '4anoefai', name: '4º EFAI' },
    { id: '5anoefai', name: '5º EFAI' },
];

const MORNING_CLASSES_LIST = [
    { id: '6efaf', name: '6º EFAF' },
    { id: '7efaf', name: '7º EFAF' },
    { id: '8efaf', name: '8º EFAF' },
    { id: '9efaf', name: '9º EFAF' },
];

const AFTERNOON_CLASSES_LIST = [
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
];

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-lg flex items-center gap-6">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${color}/20 text-${color}`}>
            <Icon size={32} />
        </div>
        <div>
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">{title}</p>
            <p className="text-4xl font-black text-white">{value}</p>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => {
    const statusInfo = {
        [ExamStatus.PENDING]: { text: 'Pendente', icon: Hourglass, color: 'yellow' },
        [ExamStatus.IN_PROGRESS]: { text: 'Em Produção', icon: Printer, color: 'blue' },
        [ExamStatus.READY]: { text: 'Pronto p/ Retirada', icon: ClipboardCheck, color: 'purple' },
        [ExamStatus.COMPLETED]: { text: 'Entregue', icon: CheckCircle, color: 'green' },
    }[status] || { text: status, icon: Clock, color: 'gray' };

    const Icon = statusInfo.icon;

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusInfo.color}-500/10 text-${statusInfo.color}-400 border-${statusInfo.color}-500/20`}>
            <Icon size={14} />
            {statusInfo.text}
        </span>
    );
};

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'sync' | 'schedule' | 'config' | 'occurrences' | 'aee_agenda' | 'answer_keys' | 'lesson_plans'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Data States
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examSearch, setExamSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    const [occurrenceSearch, setOccurrenceSearch] = useState('');
    const [aeeAppointments, setAeeAppointments] = useState<AEEAppointment[]>([]);
    const [allLessonPlans, setAllLessonPlans] = useState<LessonPlan[]>([]);
    const [planSearch, setPlanSearch] = useState('');
    const [activePlanFilter, setActivePlanFilter] = useState<'all' | 'daily' | 'bimester' | 'inova'>('all');
    const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
    
    // Answer Key & Correction States
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [correctionImage, setCorrectionImage] = useState<File | null>(null);
    const [correctionResult, setCorrectionResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // New Answer Key Creation States
    const [keyTitle, setKeyTitle] = useState('');
    const [keySections, setKeySections] = useState<{subject: string, start: number, end: number}[]>([]);
    const [tempSection, setTempSection] = useState({ subject: '', start: 1, end: 10 });
    const [answersMap, setAnswersMap] = useState<Record<number, string>>({}); 

    // Config States
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Schedule States
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [scheduleDay, setScheduleDay] = useState(new Date().getDay() || 1);
    const [scheduleLevel, setScheduleLevel] = useState<'EFAI' | 'EFAF' | 'EM'>('EFAF');
    const [editingSlot, setEditingSlot] = useState<{classId: string, slotId: string} | null>(null);
    const [editForm, setEditForm] = useState({ subject: '', professor: '' });
    const [isSyncingTV, setIsSyncingTV] = useState(false);

    // Student Edit Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
    const [isSavingStudent, setIsSavingStudent] = useState(false);
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);

    // AEE Agenda State
    const [currentDateAEE, setCurrentDateAEE] = useState(new Date());
    const [selectedDateAEE, setSelectedDateAEE] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [newAppointment, setNewAppointment] = useState<Partial<AEEAppointment>>({
        time: '08:00',
        period: 'Manhã'
    });

    useEffect(() => {
        setIsLoading(true);
        
        // Listeners for real-time updates
        const unsubExams = listenToExams((data) => {
            setExams(data.sort((a, b) => b.createdAt - a.createdAt));
        });

        const unsubStudents = listenToStudents((data) => {
            setStudents(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setIsLoading(false);
        });

        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
        });

        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubStaff = listenToStaffMembers(setStaffList);
        const unsubOccurrences = listenToOccurrences(setOccurrences);
        const unsubAEE = listenToAEEAppointments(setAeeAppointments);
        const unsubPlans = listenToAllLessonPlans(setAllLessonPlans);

        // Fetch Answer Keys manually when tab changes
        if (activeTab === 'answer_keys') {
            loadAnswerKeys();
        }

        // Listen to today's attendance
        const today = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(today, (logs) => {
            setAttendanceLogs(logs);
        });

        return () => { 
            unsubExams(); 
            unsubStudents(); 
            unsubConfig(); 
            unsubSchedule(); 
            unsubStaff(); 
            unsubAttendance(); 
            unsubOccurrences(); 
            unsubAEE();
            unsubPlans();
        };
    }, [activeTab]);

    const loadAnswerKeys = async () => {
        const keys = await getAnswerKeys();
        setAnswerKeys(keys);
    };

    // --- HANDLERS ---

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };
    
    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
        };
        await updateSystemConfig(newConfig);
        alert("Configurações salvas!");
    };

    const handleSyncTV = async () => {
        setIsSyncingTV(true);
        try {
            await updateSystemConfig({
                ...(sysConfig || { bannerMessage: '', bannerType: 'info', isBannerActive: false }),
                lastScheduleSync: Date.now()
            });
            alert("Sinal de sincronização enviado para a TV com sucesso!");
        } catch (e) {
            console.error(e);
            alert("Erro ao enviar sinal.");
        } finally {
            setIsSyncingTV(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!editingSlot) return;
        
        const existingEntry = schedule.find(s => 
            s.dayOfWeek === scheduleDay && 
            s.classId === editingSlot.classId && 
            s.slotId === editingSlot.slotId
        );

        if (!editForm.subject && !editForm.professor) {
            if (existingEntry) await deleteScheduleEntry(existingEntry.id);
        } else {
            const entry: ScheduleEntry = {
                id: existingEntry?.id || '',
                dayOfWeek: scheduleDay,
                classId: editingSlot.classId,
                className: [...EFAI_CLASSES_LIST, ...MORNING_CLASSES_LIST, ...AFTERNOON_CLASSES_LIST].find(c => c.id === editingSlot.classId)?.name || '',
                slotId: editingSlot.slotId,
                subject: editForm.subject,
                professor: editForm.professor
            };
            await saveScheduleEntry(entry);
        }
        setEditingSlot(null);
        setEditForm({ subject: '', professor: '' });
    };

    const handleNewStudent = () => {
        setEditingStudent({ id: '', name: '', className: '', isAEE: false } as Student);
        setIsCreatingStudent(true);
        setStudentPhoto(null);
        setShowStudentModal(true);
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setIsCreatingStudent(false);
        setStudentPhoto(null);
        setShowStudentModal(true);
    };

    const handleDeleteStudent = async (id: string) => {
        if(confirm("Tem certeza que deseja remover este aluno do sistema? Esta ação não pode ser desfeita.")) {
            await deleteStudent(id);
        }
    };

    const handleSaveStudentData = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingStudent) return;
        
        setIsSavingStudent(true);
        try {
            let photoUrl = editingStudent.photoUrl;
            if(studentPhoto) {
                photoUrl = await uploadStudentPhoto(studentPhoto, editingStudent.name);
            }
            
            const studentData = {
                ...editingStudent,
                photoUrl
            };

            if (isCreatingStudent) {
                if (!studentData.id) {
                    alert("Por favor, insira o ID da matrícula.");
                    setIsSavingStudent(false);
                    return;
                }
                await saveStudent(studentData);
                alert("Aluno matriculado com sucesso!");
            } else {
                await updateStudent(studentData);
                alert("Dados do aluno atualizados com sucesso!");
            }
            
            setShowStudentModal(false);
            setEditingStudent(null);
            setIsCreatingStudent(false);
        } catch(error) {
            console.error(error);
            alert("Erro ao salvar aluno.");
        } finally {
            setIsSavingStudent(false);
        }
    };

    // AEE Agenda Handlers
    const handleSaveAppointment = async () => {
        if (!newAppointment.studentId || !newAppointment.date || !newAppointment.time) return alert("Preencha todos os campos");
        
        const student = students.find(s => s.id === newAppointment.studentId);
        
        const appointment: AEEAppointment = {
            id: '',
            studentId: newAppointment.studentId || '',
            studentName: student?.name || '',
            date: newAppointment.date || '',
            time: newAppointment.time || '',
            period: newAppointment.period || 'Manhã',
            description: newAppointment.description || '',
            createdAt: Date.now()
        };

        await saveAEEAppointment(appointment);
        setShowAppointmentModal(false);
        setNewAppointment({ time: '08:00', period: 'Manhã' });
    };

    const handleDeleteAppointment = async (id: string) => {
        if (confirm("Cancelar este agendamento?")) {
            await deleteAEEAppointment(id);
        }
    };

    // Answer Key Handlers
    const handleAddSection = () => {
        if (!tempSection.subject) return alert("Selecione uma disciplina");
        if (tempSection.start > tempSection.end) return alert("Início deve ser menor que fim");
        
        const overlap = keySections.some(s => 
            (tempSection.start >= s.start && tempSection.start <= s.end) ||
            (tempSection.end >= s.start && tempSection.end <= s.end)
        );
        if (overlap) return alert("Intervalo de questões conflita com disciplina já adicionada.");

        setKeySections([...keySections, tempSection].sort((a,b) => a.start - b.start));
        
        // Initialize default answers
        const newAnswers = { ...answersMap };
        for (let i = tempSection.start; i <= tempSection.end; i++) {
            if (!newAnswers[i]) newAnswers[i] = 'A';
        }
        setAnswersMap(newAnswers);
        
        setTempSection({ 
            subject: '', 
            start: tempSection.end + 1, 
            end: tempSection.end + 10 
        });
    };

    const handleRemoveSection = (index: number) => {
        const newSections = [...keySections];
        newSections.splice(index, 1);
        setKeySections(newSections);
    };

    const handleCreateKey = async () => {
        if (!keyTitle) return alert("Defina um título para o gabarito");
        if (keySections.length === 0) return alert("Adicione pelo menos uma disciplina");

        const questionsPayload = [];
        for (const sec of keySections) {
            for (let i = sec.start; i <= sec.end; i++) {
                questionsPayload.push({
                    number: i,
                    correctOption: answersMap[i] || 'A',
                    subject: sec.subject
                });
            }
        }
        questionsPayload.sort((a,b) => a.number - b.number);

        const key: AnswerKey = {
            id: '',
            title: keyTitle.toUpperCase(),
            teacherId: 'ADMIN',
            createdAt: Date.now(),
            questions: questionsPayload
        };

        await saveAnswerKey(key);
        setShowKeyModal(false);
        setKeyTitle('');
        setKeySections([]);
        setAnswersMap({});
        loadAnswerKeys();
        alert("Gabarito criado com sucesso!");
    };

    const handleDeleteKey = async (id: string) => {
        if(confirm("Excluir gabarito?")) {
            await deleteAnswerKey(id);
            loadAnswerKeys();
        }
    };

    const handlePrintAnswerSheet = (key: AnswerKey) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const sortedQuestions = [...key.questions].sort((a,b) => a.number - b.number);
        
        let currentSubject = '';
        
        const questionBlocks = sortedQuestions.map(q => {
            let header = '';
            if (q.subject && q.subject !== currentSubject) {
                currentSubject = q.subject;
                header = `<div class="subject-header">${currentSubject}</div>`;
            }
            return `
                <div class="question-block">
                    ${header}
                    <div class="question-item">
                        <span class="q-num">${q.number.toString().padStart(2, '0')}</span>
                        <div class="bubbles">
                            <div class="bubble">A</div>
                            <div class="bubble">B</div>
                            <div class="bubble">C</div>
                            <div class="bubble">D</div>
                            <div class="bubble">E</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cartão Resposta - ${key.title}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
                    @page { size: A4; margin: 0; }
                    body { 
                        font-family: 'Roboto', sans-serif; 
                        margin: 0; 
                        padding: 15mm;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                    
                    .sheet-container { 
                        width: 100%;
                        max-width: 190mm;
                        margin: 0 auto;
                    }
                    
                    /* HEADER */
                    .header { 
                        display: flex; 
                        gap: 20px; 
                        align-items: center; 
                        border: 2px solid #000; 
                        border-radius: 8px;
                        padding: 15px; 
                        margin-bottom: 15px; 
                    }
                    .logo-box { 
                        width: 120px; 
                        flex-shrink: 0; 
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .logo-box img { 
                        width: 100%; 
                        height: auto; 
                    }
                    
                    .info-box { 
                        flex-grow: 1; 
                        display: flex; 
                        flex-direction: column; 
                        gap: 12px; 
                    }
                    .field-row { 
                        display: flex; 
                        gap: 15px; 
                    }
                    .field { 
                        flex-grow: 1; 
                        display: flex; 
                        flex-direction: column; 
                    }
                    .field-label { 
                        font-size: 10px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        margin-bottom: 4px;
                        color: #000;
                    }
                    .field-input {
                        border-bottom: 1px solid #000;
                        height: 20px;
                    }
                    
                    /* TITLE BAR */
                    .exam-title-box { 
                        background: #000; 
                        color: #fff; 
                        padding: 10px; 
                        text-align: center; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        font-size: 16px; 
                        letter-spacing: 1px; 
                        margin-bottom: 20px;
                        border-radius: 4px;
                    }
                    
                    /* QUESTIONS GRID */
                    .questions-grid { 
                        column-count: 4; 
                        column-gap: 30px; 
                        column-rule: 1px solid #ddd;
                        font-size: 12px;
                    }
                    @media print {
                        .questions-grid { column-count: 4; }
                    }
                    
                    .question-block { 
                        break-inside: avoid; 
                        margin-bottom: 6px; 
                    }
                    
                    .subject-header { 
                        font-size: 10px; 
                        font-weight: 900; 
                        margin-top: 15px; 
                        margin-bottom: 8px; 
                        text-transform: uppercase; 
                        border-bottom: 2px solid #000;
                        padding-bottom: 2px;
                        display: inline-block;
                        width: 100%;
                    }
                    
                    .question-item { 
                        display: flex; 
                        align-items: center; 
                        justify-content: space-between;
                        padding: 2px 0;
                    }
                    
                    .q-num { 
                        font-weight: 900; 
                        font-size: 12px; 
                        width: 20px; 
                    }
                    
                    .bubbles { 
                        display: flex; 
                        gap: 6px; 
                    }
                    
                    .bubble { 
                        width: 16px; 
                        height: 16px; 
                        border-radius: 50%; 
                        border: 1px solid #000; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 9px; 
                        font-weight: bold; 
                        color: #444;
                    }
                    
                    /* FOOTER */
                    .footer {
                        margin-top: 30px;
                        border-top: 2px solid #000;
                        padding-top: 10px;
                        font-size: 10px;
                        text-align: center;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    
                    .instructions {
                        margin-top: 10px;
                        font-size: 9px;
                        color: #666;
                        text-align: justify;
                        line-height: 1.4;
                    }
                </style>
            </head>
            <body>
                <div class="sheet-container">
                    <div class="header">
                        <div class="logo-box">
                            <img src="https://i.ibb.co/cKhq9LSG/10-anos-CEMAL-Prancheta-1-c-pia-3-1.png" alt="Logo CEMAL">
                        </div>
                        <div class="info-box">
                            <div class="field">
                                <span class="field-label">Nome do Aluno</span>
                                <div class="field-input"></div>
                            </div>
                            <div class="field-row">
                                <div class="field" style="flex: 2;">
                                    <span class="field-label">Turma</span>
                                    <div class="field-input"></div>
                                </div>
                                <div class="field" style="flex: 1;">
                                    <span class="field-label">Data</span>
                                    <div class="field-input"></div>
                                </div>
                                <div class="field" style="flex: 1;">
                                    <span class="field-label">Nota</span>
                                    <div class="field-input"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="exam-title-box">
                        ${key.title}
                    </div>

                    <div class="questions-grid">
                        ${questionBlocks}
                    </div>

                    <div class="footer">
                        Boa Prova!
                        <div class="instructions">
                            Instruções: Preencha completamente a bolinha com caneta esferográfica de tinta azul ou preta. Não utilize corretivo. Respostas rasuradas serão anuladas.
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = () => {
                        setTimeout(() => window.print(), 500);
                    }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleAnalyzeImage = async () => {
        if (!correctionImage || !selectedKey) return alert("Selecione uma imagem e um gabarito.");
        
        setIsAnalyzing(true);
        try {
            const result = await analyzeAnswerSheet(correctionImage, selectedKey.questions.length);
            
            // Calculate Score
            let correctCount = 0;
            const details = selectedKey.questions.map(q => {
                const studentAnswer = result.answers ? result.answers[q.number] : 'X';
                const isCorrect = studentAnswer === q.correctOption;
                if (isCorrect) correctCount++;
                return { number: q.number, expected: q.correctOption, actual: studentAnswer, isCorrect };
            });

            const score = (correctCount / selectedKey.questions.length) * 10; // Scale to 10

            setCorrectionResult({
                studentName: result.studentName || "Aluno Não Identificado",
                score: score.toFixed(1),
                details
            });

        } catch (e: any) {
            console.error(e);
            alert("Erro na correção: " + e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveCorrection = async () => {
        if (!correctionResult || !selectedKey) return;
        
        const student = students.find(s => s.name === correctionResult.studentName.toUpperCase());
        
        const correction: StudentCorrection = {
            id: '',
            answerKeyId: selectedKey.id,
            studentId: student?.id || 'UNKNOWN',
            studentName: correctionResult.studentName,
            score: Number(correctionResult.score),
            timestamp: Date.now(),
            answers: correctionResult.details
        };

        await saveCorrection(correction);
        alert("Correção salva no histórico!");
        setShowCorrectionModal(false);
        setCorrectionResult(null);
        setCorrectionImage(null);
    };

    // Calendar Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonthAEE = () => setCurrentDateAEE(new Date(currentDateAEE.getFullYear(), currentDateAEE.getMonth() - 1, 1));
    const handleNextMonthAEE = () => setCurrentDateAEE(new Date(currentDateAEE.getFullYear(), currentDateAEE.getMonth() + 1, 1));

    const getScheduleEntry = (classId: string, slotId: string) => {
        return schedule.find(s => s.dayOfWeek === scheduleDay && s.classId === classId && s.slotId === slotId);
    };

    const filteredExams = exams.filter(e => 
        String(e.title || '').toLowerCase().includes(examSearch.toLowerCase()) || 
        String(e.teacherName || '').toLowerCase().includes(examSearch.toLowerCase())
    );

    const pendingExams = exams.filter(e => e.status === ExamStatus.PENDING).length;
    const inProgressExams = exams.filter(e => e.status === ExamStatus.IN_PROGRESS).length;
    const readyExams = exams.filter(e => e.status === ExamStatus.READY).length;
    const today = new Date().toDateString();
    const completedToday = exams.filter(e => e.status === ExamStatus.COMPLETED && new Date(e.createdAt).toDateString() === today).length;

    const SidebarItem = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    let activeClasses = MORNING_CLASSES_LIST;
    let activeSlots = MORNING_SLOTS;
    let activeShiftLabel = 'Turno Matutino (Fundamental II)';
    let ActiveShiftIcon = Clock;
    let activeShiftColor = 'text-yellow-500';

    if (scheduleLevel === 'EFAI') {
        activeClasses = EFAI_CLASSES_LIST;
        activeSlots = MORNING_SLOTS_EFAI;
        activeShiftLabel = 'Turno Matutino (Fundamental I)';
    } else if (scheduleLevel === 'EM') {
        activeClasses = AFTERNOON_CLASSES_LIST;
        activeSlots = AFTERNOON_SLOTS;
        activeShiftLabel = 'Turno Vespertino (Ensino Médio)';
        activeShiftColor = 'text-orange-500';
    }

    const availableTeachers = staffList.filter(s => s.isTeacher).map(s => s.name).sort();
    const availableSubjects = scheduleLevel === 'EM' ? EM_SUBJECTS : EFAF_SUBJECTS;
    const allSubjects = [...EFAF_SUBJECTS, ...EM_SUBJECTS, 'SIMULADO GERAL'];

    // Calendar Calculations
    const aeeYear = currentDateAEE.getFullYear();
    const aeeMonth = currentDateAEE.getMonth();
    const aeeDaysCount = getDaysInMonth(aeeYear, aeeMonth);
    const aeeStartDay = getFirstDayOfMonth(aeeYear, aeeMonth);
    const aeeMonthName = currentDateAEE.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const aeeCalendarDays = [];
    for (let i = 0; i < aeeStartDay; i++) aeeCalendarDays.push(null);
    for (let i = 1; i <= aeeDaysCount; i++) aeeCalendarDays.push(i);

    const aeeDayAppointments = aeeAppointments.filter(a => a.date === selectedDateAEE).sort((a,b) => a.time.localeCompare(b.time));

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 flex-1 overflow-y-auto">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 ml-2">Escola & Cópias</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="answer_keys" label="Gabaritos e Correção" icon={FileCheck} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="aee_agenda" label="Agenda AEE" icon={Calendar} />
                    <SidebarItem id="occurrences" label="Livro de Ocorrências" icon={BookOpen} />
                    <SidebarItem id="lesson_plans" label="Planejamentos" icon={BookMarked} />
                    <SidebarItem id="schedule" label="Gestão de Horários" icon={CalendarClock} />
                    <SidebarItem id="sync" label="Integração Gennera" icon={Database} />
                    <SidebarItem id="config" label="Sistema" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-transparent custom-scrollbar">
                
                {/* --- AEE AGENDA TAB --- */}
                {activeTab === 'aee_agenda' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4">
                        {/* CALENDAR COLUMN */}
                        <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-xl">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Heart className="text-red-500" size={28}/> Agenda AEE
                                </h2>
                                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                    <button onClick={handlePrevMonthAEE} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20}/></button>
                                    <span className="text-sm font-black text-white uppercase tracking-widest min-w-[140px] text-center">{aeeMonthName}</span>
                                    <button onClick={handleNextMonthAEE} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-4 mb-4">
                                {DAYS_OF_WEEK.map(d => (
                                    <div key={d} className="text-center text-xs font-black text-gray-500 uppercase tracking-widest">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-4">
                                {aeeCalendarDays.map((day, idx) => {
                                    if (!day) return <div key={idx} className="h-24 md:h-32"></div>;
                                    
                                    const dateStr = `${aeeYear}-${String(aeeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSelected = selectedDateAEE === dateStr;
                                    const dayApps = aeeAppointments.filter(a => a.date === dateStr);
                                    const hasApps = dayApps.length > 0;

                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedDateAEE(dateStr)}
                                            className={`h-24 md:h-32 rounded-2xl border flex flex-col items-center justify-start p-3 cursor-pointer transition-all relative group ${
                                                isSelected 
                                                ? 'bg-red-600 border-red-500 text-white shadow-lg scale-105 z-10' 
                                                : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-gray-500'}`}>{day}</span>
                                            {hasApps && (
                                                <div className="mt-2 flex flex-col gap-1 w-full">
                                                    {dayApps.slice(0, 3).map((app, i) => (
                                                        <div key={i} className={`h-1.5 rounded-full w-full ${isSelected ? 'bg-white/40' : 'bg-red-500/40'}`}></div>
                                                    ))}
                                                    {dayApps.length > 3 && <div className={`h-1.5 w-1.5 rounded-full mx-auto ${isSelected ? 'bg-white' : 'bg-gray-500'}`}></div>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DETAILS COLUMN */}
                        <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[calc(100vh-140px)] lg:h-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                        {new Date(selectedDateAEE + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{new Date(selectedDateAEE + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                </div>
                                <Button onClick={() => { setNewAppointment({ ...newAppointment, date: selectedDateAEE }); setShowAppointmentModal(true); }} className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center p-0 shadow-lg shadow-red-900/40">
                                    <Plus size={24} />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                {aeeDayAppointments.length > 0 ? aeeDayAppointments.map(app => (
                                    <div key={app.id} className="bg-black/20 border border-white/5 p-4 rounded-2xl group hover:border-red-500/30 transition-all relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xl font-black text-red-500 flex items-center gap-2">
                                                {app.time} <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-widest">{app.period}</span>
                                            </span>
                                            <button onClick={() => handleDeleteAppointment(app.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                        </div>
                                        <h4 className="font-bold text-white text-sm uppercase tracking-tight mb-1">{app.studentName}</h4>
                                        {app.description && <p className="text-xs text-gray-400 italic">"{app.description}"</p>}
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                        <Clock size={48} className="mb-4"/>
                                        <p className="text-xs font-black uppercase tracking-widest text-center">Sem atendimentos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STUDENTS TAB (Modified Header with Enrollment Button) --- */}
                 {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Base de Alunos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gestão de matrículas e enturmação</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <Button onClick={handleNewStudent} className="bg-red-600 h-14 px-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/30 flex-shrink-0">
                                    <UserPlus size={18} className="mr-2"/> Nova Matrícula
                                </Button>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar aluno por nome ou turma..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                            {CLASSES.map(cls => {
                                const classStudents = students.filter(s => s.className === cls);
                                const totalStudents = classStudents.length;
                                const uniquePresentStudents = new Set(attendanceLogs.filter(log => log.className === cls).map(log => log.studentId));
                                const presentCount = uniquePresentStudents.size;
                                return (
                                    <div key={cls} onClick={() => setSelectedClassFilter(selectedClassFilter === cls ? null : cls)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between ${selectedClassFilter === cls ? 'bg-red-600 border-red-500 shadow-xl shadow-red-900/40 scale-105 z-10' : 'bg-[#18181b] border-white/5 hover:border-white/10 hover:bg-[#202022]'}`}>
                                        <h3 className={`text-[10px] font-black mb-4 uppercase tracking-widest truncate ${selectedClassFilter === cls ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} title={cls}>{cls}</h3>
                                        <div className="flex justify-between items-end mb-4">
                                            <div><p className={`text-3xl font-black ${selectedClassFilter === cls ? 'text-white' : 'text-white'}`}>{totalStudents}</p><p className={`text-[8px] font-bold uppercase tracking-wider ${selectedClassFilter === cls ? 'text-red-200' : 'text-gray-600'}`}>Matriculados</p></div>
                                            <div className="text-right"><p className={`text-xl font-black ${selectedClassFilter === cls ? 'text-white' : 'text-green-500'}`}>{presentCount}</p><p className={`text-[8px] font-bold uppercase tracking-wider ${selectedClassFilter === cls ? 'text-red-200' : 'text-gray-600'}`}>Presentes</p></div>
                                        </div>
                                        <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${selectedClassFilter === cls ? 'bg-white' : 'bg-green-500'}`} style={{ width: `${totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0}%` }}></div></div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-320px)]">
                            <div className="p-6 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">{selectedClassFilter ? `Listagem - ${selectedClassFilter}` : 'Listagem Geral'}</h3>
                                <div className="flex gap-2">
                                    {selectedClassFilter && <button onClick={() => setSelectedClassFilter(null)} className="bg-red-600/10 text-red-500 px-4 py-1 rounded-full text-[10px] font-black border border-red-600/20 hover:bg-red-600 hover:text-white transition-colors">Limpar Filtro</button>}
                                    <span className="bg-white/5 px-4 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/5">{students.filter(s => { const matchesSearch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || String(s.className || '').toLowerCase().includes(studentSearch.toLowerCase()); const matchesClass = selectedClassFilter ? s.className === selectedClassFilter : true; return matchesSearch && matchesClass; }).length} Alunos</span>
                                </div>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-[0.2em] sticky top-0 z-10 backdrop-blur-xl"><tr><th className="p-6">Aluno</th><th className="p-6">Turma</th><th className="p-6">Matrícula</th><th className="p-6 text-right">Ações</th></tr></thead>
                                    <tbody className="divide-y divide-white/5">
                                        {students.filter(s => { const matchesSearch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || String(s.className || '').toLowerCase().includes(studentSearch.toLowerCase()); const matchesClass = selectedClassFilter ? s.className === selectedClassFilter : true; return matchesSearch && matchesClass; }).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] group transition-colors">
                                                <td className="p-6"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center font-black text-gray-500 text-xs shrink-0">{String(student.name || '').charAt(0)}</div><span className="font-bold text-white text-sm uppercase tracking-tight">{String(student.name || '')}</span></div></td>
                                                <td className="p-6"><span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-300 uppercase tracking-widest">{String(student.className || '')}</span></td>
                                                <td className="p-6"><span className="font-mono text-xs text-gray-500">{student.id}</span></td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Editar Matrícula"><Edit size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id); }} className="p-2 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 rounded-lg transition-all" title="Excluir Aluno"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LESSON PLANS TAB (Updated Layout) --- */}
                {activeTab === 'lesson_plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Acompanhamento pedagógico de aulas e projetos</p>
                            </div>
                            <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                                    <button onClick={() => setActivePlanFilter('all')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanFilter === 'all' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Todos</button>
                                    <button onClick={() => setActivePlanFilter('daily')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanFilter === 'daily' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Diários</button>
                                    <button onClick={() => setActivePlanFilter('bimester')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanFilter === 'bimester' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Bimestrais</button>
                                    <button onClick={() => setActivePlanFilter('inova')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanFilter === 'inova' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Projetos</button>
                                </div>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar por professor, turma ou tema..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" value={planSearch} onChange={e => setPlanSearch(e.target.value)} />
                                </div>
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-8">Data</th>
                                            <th className="p-8">Professor / Disciplina</th>
                                            <th className="p-8">Turma / Tipo</th>
                                            <th className="p-8">Tema</th>
                                            <th className="p-8 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {allLessonPlans.filter(p => {
                                            const matchesSearch = 
                                                String(p.teacherName).toLowerCase().includes(planSearch.toLowerCase()) ||
                                                String(p.className).toLowerCase().includes(planSearch.toLowerCase()) ||
                                                String(p.topic || p.inovaTheme || '').toLowerCase().includes(planSearch.toLowerCase());
                                            
                                            const matchesType = 
                                                activePlanFilter === 'all' ? true :
                                                activePlanFilter === 'daily' ? (p.type === 'daily' || !p.type) :
                                                p.type === activePlanFilter;

                                            return matchesSearch && matchesType;
                                        }).map(plan => (
                                            <tr key={plan.id} className="hover:bg-white/[0.02] group align-top">
                                                <td className="p-8 text-xs font-bold text-gray-500 w-32">{new Date(plan.createdAt).toLocaleDateString()}</td>
                                                <td className="p-8">
                                                    <p className="font-black text-white uppercase tracking-tight text-sm">{plan.teacherName}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{plan.subject}</p>
                                                </td>
                                                <td className="p-8">
                                                    <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{plan.className}</span>
                                                    <div className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                        {plan.type === 'bimester' ? <span className="text-blue-500">Bimestral</span> : plan.type === 'inova' ? <span className="text-purple-500">Projeto Inova</span> : <span className="text-red-500">Diário</span>}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <p className="text-sm font-bold text-gray-300 line-clamp-2">{plan.topic || plan.inovaTheme || 'Sem tema'}</p>
                                                </td>
                                                <td className="p-8 text-right">
                                                    <button onClick={() => setViewingPlan(plan)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                                                        Visualizar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {allLessonPlans.length === 0 && (
                                            <tr><td colSpan={5} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Nenhum planejamento encontrado</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STUDENT EDIT MODAL (Updated for Creation) --- */}
                {showStudentModal && editingStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{isCreatingStudent ? 'Nova Matrícula' : 'Editar Matrícula'}</h3>
                                <button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleSaveStudentData} className="space-y-6">
                                {/* INFO CARD */}
                                {isCreatingStudent ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Nome Completo</label>
                                            <input 
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 uppercase"
                                                value={editingStudent.name}
                                                onChange={e => setEditingStudent({...editingStudent, name: e.target.value.toUpperCase()})}
                                                placeholder="NOME DO ALUNO"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Matrícula (ID)</label>
                                                <input 
                                                    required
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 uppercase"
                                                    value={editingStudent.id}
                                                    onChange={e => setEditingStudent({...editingStudent, id: e.target.value})}
                                                    placeholder="EX: 2024001"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Turma</label>
                                                <select 
                                                    required
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                                    value={editingStudent.className}
                                                    onChange={e => setEditingStudent({...editingStudent, className: e.target.value})}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {[...EFAI_CLASSES_LIST, ...MORNING_CLASSES_LIST, ...AFTERNOON_CLASSES_LIST].map(c => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-2">
                                        <h4 className="text-white font-black uppercase text-lg leading-tight">{editingStudent.name}</h4>
                                        <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            <span>ID: {editingStudent.id}</span>
                                            <span>•</span>
                                            <span>{editingStudent.className}</span>
                                        </div>
                                    </div>
                                )}

                                {/* PHOTO UPLOAD */}
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Foto Biometria Facial</label>
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-full bg-black/40 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                            {studentPhoto ? (
                                                <img src={URL.createObjectURL(studentPhoto)} className="w-full h-full object-cover" />
                                            ) : editingStudent.photoUrl ? (
                                                <img src={editingStudent.photoUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-gray-700"/>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-300 hover:text-white transition-all w-full mb-2">
                                                <Camera size={16}/> Selecionar Foto
                                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setStudentPhoto(e.target.files[0])} />
                                            </label>
                                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest text-center">Formato JPG/PNG - Rosto visível</p>
                                        </div>
                                    </div>
                                </div>

                                {/* AEE TOGGLE */}
                                <div className="space-y-3 pt-2 border-t border-white/5">
                                    <label className="flex items-center justify-between cursor-pointer group bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${editingStudent.isAEE ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                                <AlertTriangle size={20}/>
                                            </div>
                                            <div>
                                                <span className={`block text-xs font-black uppercase tracking-widest ${editingStudent.isAEE ? 'text-blue-400' : 'text-gray-400'}`}>Atendimento AEE</span>
                                                <span className="text-[9px] text-gray-600 font-bold uppercase">Necessidades Especiais</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={editingStudent.isAEE || false} onChange={e => setEditingStudent({...editingStudent, isAEE: e.target.checked})} />
                                            <div className={`w-10 h-6 rounded-full transition-colors ${editingStudent.isAEE ? 'bg-blue-600' : 'bg-gray-700'}`}></div>
                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${editingStudent.isAEE ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>

                                <Button type="submit" isLoading={isSavingStudent} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20 mt-4">
                                    <Save size={18} className="mr-2"/> {isCreatingStudent ? 'Confirmar Matrícula' : 'Salvar Alterações'}
                                </Button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- SCHEDULE TAB --- */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Horários</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Configuração da grade curricular</p>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={handleSyncTV} disabled={isSyncingTV} className="bg-blue-600 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-900/40">
                                    {isSyncingTV ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16} className="mr-2"/>}
                                    Sincronizar TV
                                </Button>
                            </div>
                        </header>

                        <div className="bg-[#18181b] border border-white/5 p-8 rounded-[3rem] shadow-2xl space-y-8">
                            <div className="flex flex-wrap gap-4 justify-center bg-black/40 p-2 rounded-2xl border border-white/5">
                                <button onClick={() => setScheduleLevel('EFAI')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAI' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Fundamental I</button>
                                <button onClick={() => setScheduleLevel('EFAF')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAF' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Fundamental II</button>
                                <button onClick={() => setScheduleLevel('EM')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EM' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Ensino Médio</button>
                            </div>

                            <div className="flex justify-center gap-2 overflow-x-auto pb-4">
                                {DAYS_OF_WEEK.map((day, index) => (
                                    <button 
                                        key={day} 
                                        onClick={() => setScheduleDay(index === 0 ? 1 : index === 6 ? 5 : index)} 
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black uppercase tracking-widest transition-all ${
                                            (scheduleDay === index) 
                                            ? 'bg-white text-black scale-110 shadow-xl' 
                                            : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                                        }`}
                                        disabled={index === 0 || index === 6}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-12">
                                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${activeShiftColor}`}>
                                    <ActiveShiftIcon size={24}/> {activeShiftLabel} - {DAYS_OF_WEEK[scheduleDay]}
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {activeClasses.map(cls => (
                                        <div key={cls.id} className="bg-black/20 border border-white/5 p-6 rounded-[2rem]">
                                            <h4 className="text-white font-black uppercase text-sm mb-6 tracking-widest text-center">{cls.name}</h4>
                                            <div className="space-y-3">
                                                {activeSlots.map(slot => {
                                                    if (slot.type === 'break') return (
                                                        <div key={slot.id} className="text-[10px] font-black text-gray-600 text-center uppercase tracking-[0.2em] py-2 border-y border-white/5 bg-white/[0.02]">
                                                            Intervalo ({slot.start}-{slot.end})
                                                        </div>
                                                    );

                                                    const entry = getScheduleEntry(cls.id, slot.id);
                                                    const isEditing = editingSlot?.classId === cls.id && editingSlot?.slotId === slot.id;

                                                    return (
                                                        <div key={slot.id} className={`p-4 rounded-2xl border transition-all ${entry ? 'bg-white/5 border-white/10' : 'bg-black/40 border-white/5 border-dashed'}`}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[9px] font-bold text-gray-500">{slot.start} - {slot.end}</span>
                                                                <button onClick={() => { 
                                                                    setEditingSlot({classId: cls.id, slotId: slot.id}); 
                                                                    setEditForm({subject: entry?.subject || '', professor: entry?.professor || ''}); 
                                                                }} className="text-gray-600 hover:text-white transition-colors"><Edit size={12}/></button>
                                                            </div>
                                                            
                                                            {isEditing ? (
                                                                <div className="space-y-2 animate-in zoom-in duration-200">
                                                                    <select className="w-full bg-black border border-red-600 rounded-lg p-2 text-[10px] text-white font-bold outline-none uppercase" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})}>
                                                                        <option value="">-- Disciplina --</option>
                                                                        {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </select>
                                                                    <select className="w-full bg-black border border-red-600 rounded-lg p-2 text-[10px] text-white font-bold outline-none uppercase" value={editForm.professor} onChange={e => setEditForm({...editForm, professor: e.target.value})}>
                                                                        <option value="">-- Professor --</option>
                                                                        {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => setEditingSlot(null)} className="flex-1 bg-gray-800 text-gray-400 py-1 rounded text-[9px] font-bold uppercase">Cancel</button>
                                                                        <button onClick={handleSaveSchedule} className="flex-1 bg-red-600 text-white py-1 rounded text-[9px] font-bold uppercase">Salvar</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                entry ? (
                                                                    <div>
                                                                        <p className="text-xs font-black text-white uppercase tracking-tight truncate">{entry.subject}</p>
                                                                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest truncate">{entry.professor}</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest text-center py-2">Vago</p>
                                                                )
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CONFIG TAB --- */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto">
                         <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações do Sistema</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes globais e comunicação</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-6"><Megaphone size={24} className="text-red-500"/> Banner de Avisos</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10">
                                        <label className="text-sm font-bold text-white uppercase tracking-widest">Ativar Banner Global</label>
                                        <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                                            {configIsBannerActive ? <ToggleRight size={32} className="text-green-500"/> : <ToggleLeft size={32} className="text-gray-600"/>}
                                            <span className={configIsBannerActive ? 'text-green-400' : 'text-gray-500'}>{configIsBannerActive ? 'Ativo' : 'Inativo'}</span>
                                        </button>
                                    </div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[120px]" placeholder="Digite a mensagem de aviso aqui..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}>
                                        <option value="info">Informativo (Azul)</option>
                                        <option value="warning">Atenção (Amarelo)</option>
                                        <option value="error">Urgente (Vermelho)</option>
                                        <option value="success">Sucesso (Verde)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-10 border-t border-white/10 flex justify-end">
                                <Button onClick={handleSaveConfig} className="h-16 px-12 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest"><Save size={18} className="mr-3"/> Salvar Alterações</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- EXAMS TAB --- */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Solicitações de professores em tempo real</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard title="Pendentes" value={pendingExams} icon={Hourglass} color="yellow-500" />
                            <StatCard title="Em Produção" value={inProgressExams} icon={Printer} color="blue-500" />
                            <StatCard title="Pronto p/ Retirada" value={readyExams} icon={ClipboardCheck} color="purple-400" />
                            <StatCard title="Concluídos Hoje" value={completedToday} icon={CheckCircle} color="green-500" />
                        </div>
                        
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-6 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">Todas as Solicitações</h3>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar prova ou professor..." className="pl-12 pr-6 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-600 outline-none w-80 transition-all" value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-6">Data</th>
                                            <th className="p-6">Professor / Material</th>
                                            <th className="p-6">Turma / Qtd</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredExams.map(exam => (
                                            <tr key={exam.id} className="hover:bg-white/[0.02] group">
                                                <td className="p-6 text-sm text-gray-500 font-bold">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                                <td className="p-6">
                                                    <p className="font-black text-white uppercase tracking-tight">{exam.title}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Prof. {exam.teacherName}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{exam.gradeLevel}</span>
                                                    <span className="ml-4 text-red-500 font-black text-lg">{exam.quantity}x</span>
                                                </td>
                                                <td className="p-6"><StatusBadge status={exam.status} /></td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a href={exam.fileUrls?.[0]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-10 w-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"><Download size={18}/></a>
                                                        {exam.status === ExamStatus.PENDING && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-blue-600 hover:!bg-blue-700">Produzir</Button>}
                                                        {exam.status === ExamStatus.IN_PROGRESS && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.READY)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-purple-600 hover:!bg-purple-700">Finalizar</Button>}
                                                        {exam.status === ExamStatus.READY && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-green-600 hover:!bg-green-700">Entregar</Button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ANSWER KEYS TAB --- */}
                {activeTab === 'answer_keys' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Correção de Gabaritos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Digitalização e análise automática via IA</p>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={() => setShowKeyModal(true)} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                    <Plus size={18} className="mr-2"/> Novo Gabarito
                                </Button>
                                <Button onClick={() => setShowCorrectionModal(true)} className="bg-blue-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/40">
                                    <Camera size={18} className="mr-2"/> Corrigir Prova
                                </Button>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {answerKeys.map(key => (
                                <div key={key.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-red-600/10 group-hover:text-red-500 transition-colors">
                                            <FileCheck size={32}/>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handlePrintAnswerSheet(key)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors" title="Imprimir Cartão Resposta"><Printer size={20} className="text-gray-400 group-hover:text-white"/></button>
                                            <button onClick={() => handleDeleteKey(key.id)} className="p-3 bg-white/5 rounded-xl hover:bg-red-600/20 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 leading-tight">{key.title}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">{key.questions.length} Questões</p>
                                    
                                    <div className="mt-auto pt-6 border-t border-white/5">
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(new Set(key.questions.map(q => q.subject))).map(sub => (
                                                <span key={sub} className="text-[8px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-gray-400">{sub}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {answerKeys.length === 0 && (
                                <div className="col-span-full py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-600 border-2 border-dashed border-white/5 rounded-[3rem]">
                                    Nenhum gabarito cadastrado
                                </div>
                            )}
                        </div>

                        {/* NEW KEY MODAL */}
                        {showKeyModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col">
                                    <div className="flex justify-between items-center mb-8 shrink-0">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Novo Gabarito Oficial</h3>
                                        <button onClick={() => setShowKeyModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                                        {/* LEFT PANEL - CONFIG */}
                                        <div className="lg:col-span-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título da Prova</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={keyTitle} onChange={e => setKeyTitle(e.target.value.toUpperCase())} placeholder="EX: SIMULADO 1º TRIMESTRE" />
                                            </div>
                                            
                                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><ListOrdered size={14}/> Adicionar Disciplina</h4>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Matéria</label>
                                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-600 appearance-none" value={tempSection.subject} onChange={e => setTempSection({...tempSection, subject: e.target.value})}>
                                                        <option value="">Selecione...</option>
                                                        {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Início</label>
                                                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-600" value={tempSection.start} onChange={e => setTempSection({...tempSection, start: Number(e.target.value)})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Fim</label>
                                                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-600" value={tempSection.end} onChange={e => setTempSection({...tempSection, end: Number(e.target.value)})} />
                                                    </div>
                                                </div>
                                                <Button onClick={handleAddSection} className="w-full h-12 bg-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest">Adicionar Bloco</Button>
                                            </div>

                                            <div className="space-y-2">
                                                {keySections.map((sec, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                                        <div>
                                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{sec.subject}</p>
                                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Questões {sec.start} a {sec.end}</p>
                                                        </div>
                                                        <button onClick={() => handleRemoveSection(idx)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* RIGHT PANEL - ANSWERS */}
                                        <div className="lg:col-span-2 bg-black/20 border border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 sticky top-0 bg-[#151517] p-2 z-10">Gabarito das Questões</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {keySections.map(sec => {
                                                    const questions = [];
                                                    for(let i=sec.start; i<=sec.end; i++) questions.push(i);
                                                    return questions.map(qNum => (
                                                        <div key={qNum} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                                            <span className="w-6 text-right text-xs font-bold text-gray-500">{qNum}</span>
                                                            <div className="flex-1 flex justify-end gap-1">
                                                                {['A','B','C','D','E'].map(opt => (
                                                                    <button 
                                                                        key={opt}
                                                                        onClick={() => setAnswersMap({...answersMap, [qNum]: opt})}
                                                                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${answersMap[qNum] === opt ? 'bg-green-600 text-white shadow-lg scale-110' : 'bg-black/40 text-gray-600 hover:bg-white/10 hover:text-white'}`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ));
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/5 mt-auto flex justify-end shrink-0">
                                        <Button onClick={handleCreateKey} className="h-16 px-12 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"><Save size={18} className="mr-3"/> Salvar Gabarito</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CORRECTION MODAL */}
                        {showCorrectionModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col">
                                    <div className="flex justify-between items-center mb-8 shrink-0">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4"><BrainCircuit className="text-blue-500" size={32}/> Correção Inteligente</h3>
                                        <button onClick={() => { setShowCorrectionModal(false); setCorrectionResult(null); setCorrectionImage(null); }} className="text-gray-500 hover:text-white"><X size={32}/></button>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-hidden">
                                        {/* LEFT: INPUTS */}
                                        <div className="space-y-8 overflow-y-auto custom-scrollbar pr-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Selecione o Gabarito</label>
                                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-blue-600 appearance-none text-sm" onChange={e => setSelectedKey(answerKeys.find(k => k.id === e.target.value) || null)}>
                                                    <option value="">-- Gabarito --</option>
                                                    {answerKeys.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
                                                </select>
                                            </div>

                                            <div className="border-3 border-dashed border-white/10 rounded-[2.5rem] p-12 text-center hover:border-blue-600 transition-all relative bg-black/20 group cursor-pointer">
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setCorrectionImage(e.target.files[0])} />
                                                {correctionImage ? (
                                                    <div className="relative h-64 w-full rounded-2xl overflow-hidden">
                                                        <img src={URL.createObjectURL(correctionImage)} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="py-10">
                                                        <Camera className="mx-auto text-gray-600 mb-4 group-hover:text-blue-500 transition-colors" size={64} />
                                                        <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Foto do Cartão Resposta</p>
                                                    </div>
                                                )}
                                            </div>

                                            <Button onClick={handleAnalyzeImage} disabled={!selectedKey || !correctionImage} isLoading={isAnalyzing} className="w-full h-20 bg-blue-600 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40">
                                                <Scan size={24} className="mr-3"/> Analisar com IA
                                            </Button>
                                        </div>

                                        {/* RIGHT: RESULTS */}
                                        <div className="bg-black/20 border border-white/5 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar relative">
                                            {!correctionResult ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                                    <FileCheck size={64} className="mb-6"/>
                                                    <p className="font-black uppercase tracking-widest text-sm">Aguardando Análise</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-8 animate-in slide-in-from-right-4">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Aluno Identificado</p>
                                                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">{correctionResult.studentName}</h2>
                                                    </div>
                                                    
                                                    <div className="flex justify-center">
                                                        <div className={`h-40 w-40 rounded-full border-8 flex items-center justify-center ${Number(correctionResult.score) >= 6 ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                                            <div>
                                                                <span className="text-5xl font-black tracking-tighter">{correctionResult.score}</span>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-center mt-1 text-gray-500">Nota Final</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-5 gap-2">
                                                        {correctionResult.details.map((d: any) => (
                                                            <div key={d.number} className={`p-2 rounded-lg border text-center ${d.isCorrect ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                                                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Q.{d.number}</p>
                                                                <p className={`text-sm font-black ${d.isCorrect ? 'text-green-500' : 'text-red-500'}`}>{d.actual}</p>
                                                                {!d.isCorrect && <p className="text-[8px] font-bold text-gray-600">Gab: {d.expected}</p>}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <Button onClick={handleSaveCorrection} className="w-full h-16 bg-green-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-900/40 sticky bottom-0">
                                                        <Save size={20} className="mr-2"/> Salvar Resultado
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SYNC TAB --- */}
                {activeTab === 'sync' && <GenneraSyncPanel />}

            </div>
        </div>
    );
};
