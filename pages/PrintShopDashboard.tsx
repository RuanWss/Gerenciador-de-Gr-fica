
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
    uploadStudentPhoto,
    listenToAEEAppointments,
    saveAEEAppointment,
    deleteAEEAppointment,
    saveAnswerKey,
    getAnswerKeys,
    deleteAnswerKey,
    saveCorrection,
    getCorrectionsByGabarito
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
    StudentCorrection
} from '../types';
import { 
    Printer, Search, Users, Settings, RefreshCw, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Truck, Save, X, Loader2, Megaphone, ToggleLeft, ToggleRight, Download,
    Database, CalendarClock, Trash2, Edit, Monitor, GraduationCap, Radio, BookOpen, AlertTriangle, Camera, User, Calendar, Heart, Plus, ChevronLeft, ChevronRight, FileCheck, UploadCloud, BrainCircuit, ListOrdered
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
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'sync' | 'schedule' | 'config' | 'occurrences' | 'aee_agenda' | 'answer_keys'>('exams');
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
        };
    }, [activeTab]);

    const loadAnswerKeys = async () => {
        const keys = await getAnswerKeys();
        setAnswerKeys(keys);
    };

    // --- HANDLERS ---

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        // Optimistic update done by listener
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

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
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
            
            await updateStudent({
                ...editingStudent,
                photoUrl
            });
            setShowStudentModal(false);
            setEditingStudent(null);
            alert("Dados do aluno atualizados com sucesso!");
        } catch(error) {
            console.error(error);
            alert("Erro ao atualizar aluno.");
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
                                    const isToday = new Date().toDateString() === new Date(aeeYear, aeeMonth, day).toDateString();
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
                                            <span className={`text-sm font-black ${isSelected ? 'text-white' : (isToday ? 'text-red-500' : 'text-gray-500')}`}>{day}</span>
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

                {/* --- ANSWER KEYS TAB --- */}
                {activeTab === 'answer_keys' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gabaritos Oficiais</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Criação de gabaritos e correção automática via OCR</p>
                            </div>
                            <Button onClick={() => setShowKeyModal(true)} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                <Plus size={18} className="mr-2"/> Novo Gabarito
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {answerKeys.map(key => (
                                <div key={key.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-white/10 transition-all group relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-red-900/20 text-red-500 rounded-2xl"><FileCheck size={24}/></div>
                                        <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-gray-600 hover:text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{key.title}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">{key.questions.length} Questões • {new Date(key.createdAt).toLocaleDateString()}</p>
                                    <Button onClick={() => { setSelectedKey(key); setShowCorrectionModal(true); setCorrectionResult(null); setCorrectionImage(null); }} className="w-full h-14 rounded-xl bg-white/5 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest transition-all">
                                        Corrigir Provas
                                    </Button>
                                </div>
                            ))}
                            {answerKeys.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                                    <FileCheck size={48} className="mx-auto mb-4 text-gray-500" />
                                    <p className="font-black uppercase tracking-widest text-sm text-gray-500">Nenhum gabarito cadastrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- EXAMS TAB --- */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        {/* ... (Exams content remains same) ... */}
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
                                            <th className="p-6">Detalhes da Solicitação</th>
                                            <th className="p-6">Turma / Qtd</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredExams.map(exam => (
                                            <tr key={exam.id} className="hover:bg-white/[0.02] group">
                                                <td className="p-6 text-sm text-gray-500 font-bold align-top w-32">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                                <td className="p-6 align-top">
                                                    <div className="flex flex-col gap-4">
                                                        <div>
                                                            <p className="font-black text-white uppercase tracking-tight text-lg leading-tight">{String(exam.title || '')}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Prof. {String(exam.teacherName || '')}</p>
                                                        </div>
                                                        {exam.instructions && exam.instructions !== 'Sem instruções' && (
                                                            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl relative">
                                                                <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest block mb-2">Observações do Professor:</span>
                                                                <p className="text-xs text-gray-300 leading-relaxed font-medium italic">"{exam.instructions}"</p>
                                                            </div>
                                                        )}
                                                        {exam.fileUrls && exam.fileUrls.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Materiais para Impressão:</p>
                                                                <div className="grid gap-2">
                                                                    {exam.fileUrls.map((url, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-[#0f0f10] border border-white/5 p-3 rounded-xl hover:border-white/10 transition-all group">
                                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                                <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center text-red-500 shrink-0">
                                                                                    <FileText size={16}/>
                                                                                </div>
                                                                                <span className="text-[10px] font-bold text-gray-400 truncate uppercase">
                                                                                    {exam.fileNames?.[idx] || `Arquivo ${idx + 1}`}
                                                                                </span>
                                                                            </div>
                                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 flex items-center justify-center bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-all" title="Baixar"><Download size={14}/></a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 align-top">
                                                    <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{String(exam.gradeLevel || '')}</span>
                                                    <span className="ml-4 text-red-500 font-black text-lg">{exam.quantity}x</span>
                                                </td>
                                                <td className="p-6 align-top"><StatusBadge status={exam.status} /></td>
                                                <td className="p-6 text-right align-top">
                                                    <div className="flex items-center justify-end gap-2">
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

                {/* ... other tabs ... */}
                {/* Omitted for brevity, kept existing ones (schedule, students, sync, config, occurrences, aee_agenda) */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        {/* ... (Schedule content remains same) ... */}
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Horários</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Edição do quadro exibido na TV</p>
                            </div>
                            <div className="flex flex-col gap-4 items-end">
                                <Button onClick={handleSyncTV} isLoading={isSyncingTV} className="bg-red-600 h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/30"><Radio size={18} className="mr-2"/> {isSyncingTV ? 'Enviando...' : 'Sincronizar Grade na TV'}</Button>
                                <div className="flex bg-[#18181b] p-1 rounded-2xl border border-white/10">
                                    <button onClick={() => setScheduleLevel('EFAI')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAI' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Fund. I (EFAI)</button>
                                    <button onClick={() => setScheduleLevel('EFAF')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAF' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Fund. II (EFAF)</button>
                                    <button onClick={() => setScheduleLevel('EM')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EM' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Ensino Médio</button>
                                </div>
                                <div className="flex bg-[#18181b] p-1 rounded-xl border border-white/10">
                                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((d, i) => (
                                        <button key={i} onClick={() => setScheduleDay(i + 1)} className={`px-6 py-3 rounded-lg text-xs font-black transition-all ${scheduleDay === i + 1 ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </header>
                        <div className="space-y-12 pb-20">
                            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                                <div className="p-6 bg-black/20 border-b border-white/5 flex justify-between items-center">
                                    <h3 className={`text-lg font-black text-white uppercase tracking-widest flex items-center gap-3`}><ActiveShiftIcon size={20} className={activeShiftColor}/> {activeShiftLabel}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-black/30 border-b border-white/5">
                                                <th className="p-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest w-32">Horário</th>
                                                {activeClasses.map(cls => (
                                                    <th key={cls.id} className="p-4 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border-l border-white/5">{cls.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {activeSlots.map(slot => (
                                                <tr key={slot.id} className={slot.type === 'break' ? 'bg-white/[0.02]' : ''}>
                                                    <td className="p-4 text-xs font-bold text-gray-400 border-r border-white/5"><span className="block text-white font-mono">{slot.start} - {slot.end}</span><span className="text-[9px] uppercase tracking-wider opacity-50">{slot.label}</span></td>
                                                    {slot.type === 'break' ? (
                                                        <td colSpan={activeClasses.length} className="p-4 text-center text-xs font-black text-yellow-600 uppercase tracking-[0.5em] opacity-50">Intervalo</td>
                                                    ) : (
                                                        activeClasses.map(cls => {
                                                            const entry = getScheduleEntry(cls.id, slot.id);
                                                            const isEditing = editingSlot?.classId === cls.id && editingSlot?.slotId === slot.id;
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-2 border-l border-white/5 relative group h-24 align-middle">
                                                                    {isEditing ? (
                                                                        <div className="absolute inset-0 bg-[#0f0f10] z-20 flex flex-col p-3 gap-2 shadow-2xl border-2 border-red-600 animate-in zoom-in-95">
                                                                            <input list="subjects-list" autoFocus className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500 font-bold uppercase placeholder-gray-500" placeholder="Matéria" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} />
                                                                            <datalist id="subjects-list">{availableSubjects.map(s => <option key={s} value={s} />)}</datalist>
                                                                            <input list="teachers-list" className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-gray-300 outline-none focus:border-red-500 uppercase placeholder-gray-500" placeholder="Professor" value={editForm.professor} onChange={e => setEditForm({...editForm, professor: e.target.value})} />
                                                                            <datalist id="teachers-list">{availableTeachers.map(t => <option key={t} value={t} />)}</datalist>
                                                                            <div className="flex gap-2 mt-auto"><button onClick={handleSaveSchedule} className="flex-1 bg-green-600 rounded-lg py-1.5 text-[10px] font-black text-white hover:bg-green-700 transition-colors uppercase tracking-widest">Salvar</button><button onClick={() => setEditingSlot(null)} className="flex-1 bg-red-600 rounded-lg py-1.5 text-[10px] font-black text-white hover:bg-red-700 transition-colors uppercase tracking-widest">Cancelar</button></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div onClick={() => { setEditingSlot({ classId: cls.id, slotId: slot.id }); setEditForm({ subject: entry?.subject || '', professor: entry?.professor || '' }); }} className="w-full h-full rounded-xl hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center transition-all p-2 group-hover:shadow-inner">
                                                                            {entry ? (<><span className="text-xs font-black text-white uppercase text-center leading-tight line-clamp-2">{entry.subject}</span><span className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate max-w-full">{entry.professor}</span></>) : (<span className="text-[9px] text-gray-700 font-black uppercase opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity"><Edit size={10}/> Editar</span>)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                 {/* --- STUDENTS TAB --- */}
                 {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Base de Alunos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gestão de matrículas e enturmação</p>
                            </div>
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="text" placeholder="Buscar aluno por nome ou turma..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
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

                {/* --- OCCURRENCES TAB --- */}
                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Livro de Ocorrências</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Diário de bordo geral dos professores</p></div>
                            <div className="relative w-full md:w-96"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Buscar por aluno ou professor..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" value={occurrenceSearch} onChange={e => setOccurrenceSearch(e.target.value)} /></div>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]"><tr><th className="p-8">Data</th><th className="p-8">Aluno</th><th className="p-8">Ocorrência</th><th className="p-8">Descrição</th></tr></thead>
                                    <tbody className="divide-y divide-white/5">
                                        {occurrences.filter(occ => String(occ.studentName || '').toLowerCase().includes(occurrenceSearch.toLowerCase()) || String(occ.reportedBy || '').toLowerCase().includes(occurrenceSearch.toLowerCase())).map(occ => (
                                            <tr key={occ.id} className="hover:bg-white/[0.02] group align-top">
                                                <td className="p-8 text-xs font-bold text-gray-500 w-32">{new Date(occ.timestamp).toLocaleDateString()}</td>
                                                <td className="p-8"><div><p className="font-black text-white uppercase tracking-tight text-sm">{String(occ.studentName || '')}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{String(occ.studentClass || '')}</p></div></td>
                                                <td className="p-8"><div className="flex flex-col gap-2"><span className={`self-start px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${occ.category === 'indisciplina' ? 'bg-red-500/10 text-red-500 border-red-500/20' : occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{occ.category}</span><span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1"><Edit size={10}/> {occ.reportedBy}</span></div></td>
                                                <td className="p-8"><p className="text-xs text-gray-300 italic leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">"{occ.description}"</p></td>
                                            </tr>
                                        ))}
                                        {occurrences.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Nenhuma ocorrência registrada</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SYNC TAB --- */}
                {activeTab === 'sync' && <GenneraSyncPanel />}

                 {/* --- CONFIG TAB --- */}
                 {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto">
                         <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações do Sistema</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes globais e comunicação</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-6"><Megaphone size={24} className="text-red-500"/> Banner de Avisos</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10"><label className="text-sm font-bold text-white uppercase tracking-widest">Ativar Banner Global</label><button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">{configIsBannerActive ? <ToggleRight size={32} className="text-green-500"/> : <ToggleLeft size={32} className="text-gray-600"/>}<span className={configIsBannerActive ? 'text-green-400' : 'text-gray-500'}>{configIsBannerActive ? 'Ativo' : 'Inativo'}</span></button></div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[120px]" placeholder="Digite a mensagem de aviso aqui..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}><option value="info">Informativo (Azul)</option><option value="warning">Atenção (Amarelo)</option><option value="error">Urgente (Vermelho)</option><option value="success">Sucesso (Verde)</option></select>
                                </div>
                            </div>
                            <div className="pt-10 border-t border-white/10 flex justify-end"><Button onClick={handleSaveConfig} className="h-16 px-12 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest"><Save size={18} className="mr-3"/> Salvar Alterações</Button></div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- APPOINTMENT MODAL (AEE) --- */}
            {showAppointmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Novo Agendamento</h3>
                            <button onClick={() => setShowAppointmentModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Aluno AEE</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                    value={newAppointment.studentId}
                                    onChange={e => setNewAppointment({...newAppointment, studentId: e.target.value})}
                                >
                                    <option value="">Selecione o Aluno...</option>
                                    {students.filter(s => s.isAEE).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Data</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600"
                                        value={newAppointment.date}
                                        onChange={e => setNewAppointment({...newAppointment, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Horário</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600"
                                        value={newAppointment.time}
                                        onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Período</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                    value={newAppointment.period}
                                    onChange={e => setNewAppointment({...newAppointment, period: e.target.value as any})}
                                >
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Contraturno">Contraturno</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Descrição / Observações</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]"
                                    placeholder="Detalhes do atendimento..."
                                    value={newAppointment.description}
                                    onChange={e => setNewAppointment({...newAppointment, description: e.target.value})}
                                />
                            </div>
                            <Button onClick={handleSaveAppointment} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                                Confirmar Agendamento
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- KEY CREATION MODAL --- */}
            {showKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-3xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Criar Gabarito Oficial</h3>
                            <button onClick={() => setShowKeyModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                        </div>
                        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {/* Title Section */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Título do Gabarito</label>
                                <input 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 text-lg uppercase"
                                    placeholder="EX: SIMULADO GERAL - 1º BIMESTRE"
                                    value={keyTitle}
                                    onChange={e => setKeyTitle(e.target.value)}
                                />
                            </div>

                            {/* Section Builder */}
                            <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ListOrdered size={14}/> Adicionar Disciplina / Seção
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs h-12"
                                            value={tempSection.subject}
                                            onChange={e => setTempSection({...tempSection, subject: e.target.value})}
                                        >
                                            <option value="">Selecione a Disciplina...</option>
                                            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-red-600 text-center h-12"
                                            placeholder="Início"
                                            value={tempSection.start}
                                            onChange={e => setTempSection({...tempSection, start: Number(e.target.value)})}
                                        />
                                        <span className="text-gray-500 font-bold">-</span>
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-red-600 text-center h-12"
                                            placeholder="Fim"
                                            value={tempSection.end}
                                            onChange={e => setTempSection({...tempSection, end: Number(e.target.value)})}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddSection}
                                        className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-black uppercase text-[10px] tracking-widest transition-all"
                                    >
                                        Adicionar
                                    </button>
                                </div>

                                {/* List of Added Sections */}
                                {keySections.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {keySections.map((sec, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-red-900/20 border border-red-500/20 px-3 py-1.5 rounded-lg">
                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-wide">
                                                    {sec.subject} <span className="text-gray-500 mx-1">|</span> Q{sec.start}-{sec.end}
                                                </span>
                                                <button onClick={() => handleRemoveSection(i)} className="text-gray-500 hover:text-white"><X size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Answer Grid */}
                            {keySections.length > 0 && (
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Definir Respostas Corretas</h4>
                                    {keySections.map((sec, secIdx) => (
                                        <div key={secIdx} className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                            <h5 className="text-xs font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{sec.subject}</h5>
                                            <div className="grid grid-cols-5 gap-3">
                                                {Array.from({ length: (sec.end - sec.start + 1) }).map((_, i) => {
                                                    const qNum = sec.start + i;
                                                    return (
                                                        <div key={qNum} className="flex flex-col items-center">
                                                            <span className="text-[9px] font-bold text-gray-500 mb-1">Q{qNum}</span>
                                                            <select 
                                                                value={answersMap[qNum] || 'A'}
                                                                onChange={e => setAnswersMap({...answersMap, [qNum]: e.target.value})}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-center text-white font-black outline-none focus:bg-red-600 focus:border-red-600 transition-colors appearance-none cursor-pointer hover:bg-white/10"
                                                            >
                                                                {['A', 'B', 'C', 'D', 'E'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="pt-6 mt-4 border-t border-white/5">
                            <Button onClick={handleCreateKey} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                                Salvar Gabarito
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CORRECTION MODAL --- */}
            {showCorrectionModal && selectedKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-4xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Correção Automática</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Gabarito: {selectedKey.title}</p>
                            </div>
                            <button onClick={() => { setShowCorrectionModal(false); setCorrectionResult(null); setCorrectionImage(null); }} className="text-gray-500 hover:text-white"><X size={32}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
                            {/* UPLOAD AREA */}
                            {!correctionResult && (
                                <div className="space-y-6">
                                    <div className="border-3 border-dashed border-white/10 rounded-[3rem] p-16 text-center hover:border-red-500 transition-all relative bg-black/20 group cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={e => e.target.files && setCorrectionImage(e.target.files[0])} 
                                        />
                                        {correctionImage ? (
                                            <div className="text-green-500 flex flex-col items-center animate-in fade-in zoom-in">
                                                <FileCheck size={64} className="mb-4"/>
                                                <p className="font-black uppercase tracking-widest text-lg">{correctionImage.name}</p>
                                                <p className="text-xs opacity-70 mt-2">Clique para trocar</p>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500 flex flex-col items-center group-hover:text-red-500 transition-colors">
                                                <UploadCloud size={64} className="mb-4"/>
                                                <p className="font-black uppercase tracking-widest text-lg">Carregar Cartão Resposta</p>
                                                <p className="text-xs opacity-70 mt-2">Foto nítida do cartão preenchido</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Button 
                                        onClick={handleAnalyzeImage} 
                                        isLoading={isAnalyzing} 
                                        disabled={!correctionImage}
                                        className="w-full h-20 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <BrainCircuit size={24} className="mr-3"/> 
                                        {isAnalyzing ? 'Analisando com IA...' : 'Processar Correção'}
                                    </Button>
                                </div>
                            )}

                            {/* RESULTS AREA */}
                            {correctionResult && (
                                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                                    <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem] border border-white/10">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Aluno Identificado</p>
                                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">{correctionResult.studentName}</h2>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nota Calculada</p>
                                            <h2 className={`text-4xl font-black uppercase tracking-tight ${Number(correctionResult.score) >= 6 ? 'text-green-500' : 'text-red-500'}`}>{correctionResult.score}</h2>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Detalhamento das Respostas</h4>
                                        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                            {correctionResult.details.map((q: any) => (
                                                <div key={q.number} className={`flex flex-col items-center p-2 rounded-xl border ${q.isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                                    <span className="text-[8px] font-bold text-gray-500 mb-1">Q{q.number}</span>
                                                    <span className={`text-lg font-black ${q.isCorrect ? 'text-green-500' : 'text-red-500'}`}>{q.actual}</span>
                                                    {!q.isCorrect && <span className="text-[8px] font-bold text-gray-400">({q.expected})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <Button variant="outline" onClick={() => { setCorrectionResult(null); setCorrectionImage(null); }} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-xs">
                                            Nova Correção
                                        </Button>
                                        <Button onClick={handleSaveCorrection} className="flex-1 h-16 bg-green-600 hover:bg-green-700 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-green-900/20 text-xs">
                                            Salvar Resultado
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- STUDENT EDIT MODAL --- */}
            {showStudentModal && editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Editar Matrícula</h3>
                            <button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveStudentData} className="space-y-6">
                            {/* INFO CARD */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-2">
                                <h4 className="text-white font-black uppercase text-lg leading-tight">{editingStudent.name}</h4>
                                <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <span>ID: {editingStudent.id}</span>
                                    <span>•</span>
                                    <span>{editingStudent.className}</span>
                                </div>
                            </div>

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
                                <Save size={18} className="mr-2"/> Salvar Alterações
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
