
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents,
    listenToAttendanceLogs, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    getAllPEIs,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAllMaterials,
    saveClassMaterial,
    deleteClassMaterial,
    listenToOccurrences,
    saveOccurrence,
    deleteOccurrence,
    deleteStudent,
    getDailySchoolLog,
    saveDailySchoolLog,
    getLessonPlans,
    saveStudent,
    listenToAllInfantilReports
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    SystemConfig, 
    SchoolEvent,
    PEIDocument,
    ScheduleEntry,
    TimeSlot,
    ClassMaterial,
    StudentOccurrence,
    DailySchoolLog,
    LessonPlan,
    StaffMember,
    ExtraClassRecord,
    InfantilReport
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, 
    Search, 
    Calendar, 
    Users, 
    Settings, 
    Trash2, 
    Plus, 
    X,
    Clock,
    UserCircle,
    BookOpen,
    Folder,
    Download,
    AlertCircle,
    Heart,
    Book,
    Sun,
    Moon,
    UserCheck,
    Save,
    ChevronRight,
    ChevronLeft,
    BookOpenCheck,
    Megaphone,
    FileText,
    ClipboardCheck,
    UserMinus,
    Loader2,
    FileBarChart,
    BarChart3,
    CheckCircle2,
    ArrowLeft,
    History,
    School,
    GraduationCap,
    Hash,
    MoreHorizontal,
    Info,
    Filter,
    UserX,
    Star,
    PlayCircle,
    Layers,
    FileDown,
    UserPlus,
    UserPlus2,
    Check,
    Baby,
    FileEdit,
    FileText as FileIconPdf,
    Eye,
    ExternalLink
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

const ADMIN_GROUPS = [
    { role: 'Direção Pedagógica', names: ['Marilene Valente'] },
    { role: 'Secretaria/Financeiro', names: ['Daniela Bahia', 'Vivian Valente'] },
    { role: 'Coordenação', names: ['Marcia Cristina', 'Leinilson Cardoso', 'Thiago Cardoso'] },
    { role: 'Apoio Pedagógico', names: ['Ruan Santos', 'Andressa Cecim'] },
    { role: 'Equipe Operacional', names: ['Clestiane Bahia', 'Elivelton', 'Cezar Almeida', 'Maria Suely'] }
];

const GRID_CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF', type: 'efaf', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', type: 'efaf', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', type: 'efaf', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', type: 'efaf', shift: 'morning' },
    { id: '1em', name: '1ª SÉRIE EM', type: 'em', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', type: 'em', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', type: 'em', shift: 'afternoon' },
];

const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const AFTERNOON_SLOTS: TimeSlot[] = [
    { id: 'a1', start: '13:00', end: '13:50', type: 'class', label: '1º Horário', shift: 'afternoon' },
    { id: 'a2', start: '13:50', end: '14:40', type: 'class', label: '2º Horário', shift: 'afternoon' },
    { id: 'a3', start: '14:40', end: '15:30', type: 'class', label: '3º Horário', shift: 'afternoon' },
    { id: 'a4', start: '16:00', end: '16:50', type: 'class', label: '4º Horário', shift: 'afternoon' },
    { id: 'a5', start: '16:50', end: '17:40', type: 'class', label: '5º Horário', shift: 'afternoon' },
    { id: 'a6', start: '17:40', end: '18:30', type: 'class', label: '6º Horário', shift: 'afternoon' },
    { id: 'a7', start: '18:30', end: '19:20', type: 'class', label: '7º Horário', shift: 'afternoon' },
    { id: 'a8', start: '19:20', end: '20:00', type: 'class', label: '8º Horário', shift: 'afternoon' },
];

const SKILLS_CONFIG = [
  {
    category: "Linguagem Oral",
    objectives: [
      { code: "EI03EF01", desc: "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão." },
      { code: "EI03EF02", desc: "Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos." },
      { code: "EI03EF03", desc: "Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas." },
      { code: "EI03EF08", desc: "Selecionar livros e textos de gêneros conhecidos para a leitura de um adulto e/ou para sua própria leitura." }
    ]
  },
  {
    category: "Linguagem Escrita",
    objectives: [
      { code: "EI03ET04", desc: "Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea)." },
      { code: "EI03TS02", desc: "Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura." },
      { code: "EI03CG05_E", desc: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades." }
    ]
  },
  {
    category: "Linguagem Matemática",
    objectives: [
      { code: "EI03TS03", desc: "Reconhecer as qualidades do som (intensidade, duração, altura e timbre)." },
      { code: "EI03ET07", desc: "Relacionar números às suas respectivas quantidades e identificar sequências." }
    ]
  },
  {
    category: "Desenvolvimento Psicomotor",
    objectives: [
      { code: "EI03CG01", desc: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções." },
      { code: "EI03CG05_P", desc: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses." }
    ]
  }
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'reports' | 'pei' | 'calendar' | 'plans' | 'schedule' | 'config' | 'materials' | 'occurrences' | 'daily_log' | 'infantil'>('exams');
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [infantilReports, setInfantilReports] = useState<InfantilReport[]>([]);
    
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyLog, setDailyLog] = useState<DailySchoolLog | null>(null);
    const [isSavingLog, setIsSavingLog] = useState(false);
    
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1);
    const [scheduleShiftTab, setScheduleShiftTab] = useState<'morning' | 'afternoon'>('morning');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState({ subject: '', professor: '' });

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [eventForm, setEventForm] = useState({ title: '', date: '', type: 'event' as any, description: '' });

    // PEI View Modal
    const [showPeiModal, setShowPeiModal] = useState(false);
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);

    // Infantil Tab States
    const [infantilSearch, setInfantilSearch] = useState('');
    const [infantilClassFilter, setInfantilClassFilter] = useState<'JARDIM I' | 'JARDIM II' | 'ALL'>('ALL');

    // Reports State
    const [isViewingDailyOccReport, setIsViewingDailyOccReport] = useState(false);
    const [reportOccDate, setReportOccDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportDailyLogData, setReportDailyLogData] = useState<DailySchoolLog | null>(null);

    // Filters
    const [examFilter, setExamFilter] = useState<string>('ALL');
    const [examSearch, setExamSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [occurrenceSearch, setOccurrenceSearch] = useState('');
    const [selectedStudentClass, setSelectedStudentClass] = useState<string>(GRID_CLASSES[0].id);

    // Plans Filters
    const [planSearch, setPlanSearch] = useState('');
    const [planTypeFilter, setPlanTypeFilter] = useState<'semester' | 'daily' | 'ALL'>('semester');

    // Extra Classes Management
    const [newExtra, setNewExtra] = useState<ExtraClassRecord>({ professor: '', subject: '', className: '' });

    // Enrollment State
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [enrollmentType, setEnrollmentType] = useState<'individual' | 'bulk'>('individual');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollFormData, setEnrollFormData] = useState<Partial<Student>>({
        id: '', name: '', classId: '', className: '', isAEE: false, disorder: ''
    });
    const [bulkList, setBulkList] = useState('');

    useEffect(() => {
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubOccurrences = listenToOccurrences(setOccurrences);
        const unsubMaterials = listenToAllMaterials(setMaterials);
        const unsubEvents = listenToEvents(setEvents);
        const unsubStaff = listenToStaffMembers(setStaff);
        const unsubAttendance = listenToAttendanceLogs(logDate, setAttendanceLogs);
        const unsubInfantil = listenToAllInfantilReports(setInfantilReports);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        
        getLessonPlans().then(setPlans);
        getAllPEIs().then(setPeis);

        return () => {
            unsubExams(); unsubStudents(); unsubSchedule(); unsubOccurrences(); 
            unsubMaterials(); unsubEvents(); unsubConfig(); unsubStaff(); 
            unsubAttendance(); unsubInfantil();
        };
    }, [logDate]);

    useEffect(() => {
        if (activeTab === 'daily_log') loadDailyLog();
        if (isViewingDailyOccReport) loadReportDailyLog();
    }, [activeTab, logDate, isViewingDailyOccReport, reportOccDate]);

    const loadDailyLog = async () => {
        const log = await getDailySchoolLog(logDate);
        if (log) setDailyLog(log);
        else setDailyLog({ id: logDate, date: logDate, adminAttendance: {}, teacherAttendance: {}, extraClasses: [], generalObservations: '', updatedAt: Date.now() });
    };

    const loadReportDailyLog = async () => {
        const log = await getDailySchoolLog(reportOccDate);
        setReportDailyLogData(log);
    };

    const handleSaveDailyLog = async () => {
        if (!dailyLog) return;
        setIsSavingLog(true);
        try {
            await saveDailySchoolLog({ ...dailyLog, updatedAt: Date.now() });
            alert("Livro de Ocorrências salvo!");
        } catch (e) { alert("Erro ao salvar."); }
        finally { setIsSavingLog(false); }
    };

    const handleSaveSchedule = async () => {
        if (!editingCell || !newSchedule.subject || !newSchedule.professor) return alert("Selecione disciplina e professor");
        const classInfo = GRID_CLASSES.find(c => c.id === editingCell.classId);
        await saveScheduleEntry({
            id: '',
            classId: editingCell.classId,
            className: classInfo?.name || editingCell.classId,
            dayOfWeek: selectedDay,
            slotId: editingCell.slotId,
            subject: newSchedule.subject,
            professor: newSchedule.professor
        });
        setShowScheduleModal(false);
        setEditingCell(null);
        setNewSchedule({ subject: '', professor: '' });
    };

    const handleDeleteSchedule = async (id: string) => {
        if (confirm("Remover aula deste horário?")) await deleteScheduleEntry(id);
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            ...sysConfig,
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        });
        alert("Configurações atualizadas!");
    };

    const handleSaveEvent = async () => {
        if (!eventForm.title || !eventForm.date) return alert("Preencha título e data");
        await saveSchoolEvent({
            id: selectedEvent?.id || '',
            title: eventForm.title,
            date: eventForm.date,
            type: eventForm.type,
            description: eventForm.description,
            tasks: []
        });
        setShowEventModal(false);
        setSelectedEvent(null);
        setEventForm({ title: '', date: '', type: 'event', description: '' });
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm("Excluir evento?")) await deleteSchoolEvent(id);
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsEnrolling(true);
        try {
            if (enrollmentType === 'individual') {
                if (!enrollFormData.id || !enrollFormData.name || !enrollFormData.classId) return alert("Preencha todos os campos obrigatórios.");
                const classInfo = GRID_CLASSES.find(c => c.id === enrollFormData.classId);
                await saveStudent({
                    ...enrollFormData,
                    className: classInfo?.name || enrollFormData.className || '',
                } as Student);
                alert("Aluno matriculado com sucesso!");
            } else {
                if (!enrollFormData.classId || !bulkList.trim()) return alert("Selecione a turma e forneça a lista de nomes.");
                const names = bulkList.split('\n').map(n => n.trim()).filter(n => n);
                const classInfo = GRID_CLASSES.find(c => c.id === enrollFormData.classId);
                
                for (const name of names) {
                    const id = Math.random().toString(36).substring(7).toUpperCase();
                    await saveStudent({
                        id,
                        name: name.toUpperCase(),
                        classId: enrollFormData.classId,
                        className: classInfo?.name || '',
                        isAEE: false
                    } as Student);
                }
                alert(`${names.length} alunos matriculados em lote!`);
            }
            setShowEnrollmentModal(false);
            setEnrollFormData({ id: '', name: '', classId: '', className: '', isAEE: false, disorder: '' });
            setBulkList('');
        } catch (err) {
            alert("Erro ao realizar matrícula.");
        } finally {
            setIsEnrolling(false);
        }
    };

    const toggleAdminPresence = (name: string) => {
        if (!dailyLog) return;
        const current = dailyLog.adminAttendance[name] || { present: true, shifts: ['matutino'] };
        setDailyLog({ ...dailyLog, adminAttendance: { ...dailyLog.adminAttendance, [name]: { ...current, present: !current.present } } });
    };

    const toggleAdminShift = (name: string, shift: string) => {
        if (!dailyLog) return;
        const current = dailyLog.adminAttendance[name] || { present: true, shifts: [] };
        let newShifts = [...current.shifts];
        if (newShifts.includes(shift)) newShifts = newShifts.filter(s => s !== shift);
        else newShifts.push(shift);
        setDailyLog({ ...dailyLog, adminAttendance: { ...dailyLog.adminAttendance, [name]: { ...current, shifts: newShifts } } });
    };

    const setTeacherStatus = (name: string, present: boolean) => {
        if (!dailyLog) return;
        const current = dailyLog.teacherAttendance[name] || { present: true };
        setDailyLog({ ...dailyLog, teacherAttendance: { ...dailyLog.teacherAttendance, [name]: { ...current, present } } });
    };

    const setTeacherSubstitute = (name: string, substitute: string) => {
        if (!dailyLog) return;
        const current = dailyLog.teacherAttendance[name] || { present: false };
        setDailyLog({ ...dailyLog, teacherAttendance: { ...dailyLog.teacherAttendance, [name]: { ...current, substitute } } });
    };

    const getTeachersByShift = (shift: 'morning' | 'afternoon') => {
        const dayOfWeek = new Date(logDate + 'T12:00:00').getDay() || 7;
        const relevantSlots = shift === 'morning' ? ['m1', 'm2', 'm3', 'm4', 'm5'] : ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];
        const dayTeachers = schedule.filter(s => s.dayOfWeek === dayOfWeek && relevantSlots.includes(s.slotId)).map(s => s.professor);
        return Array.from(new Set(dayTeachers)).sort();
    };

    const addExtraClass = () => {
        if (!newExtra.professor || !newExtra.subject || !newExtra.className) return alert("Preencha todos os campos da aula extra");
        const extras = dailyLog.extraClasses || [];
        setDailyLog({ ...dailyLog, extraClasses: [...extras, newExtra] });
        setNewExtra({ professor: '', subject: '', className: '' });
    };

    const removeExtraClass = (index: number) => {
        const extras = [...(dailyLog.extraClasses || [])];
        extras.splice(index, 1);
        setDailyLog({ ...dailyLog, extraClasses: extras });
    };

    const handlePrintDailyOccReport = () => {
        const reportOccurrences = occurrences.filter(o => o.date === reportOccDate);
        const l = reportDailyLogData;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateObj = new Date(reportOccDate + 'T12:00:00');
        const formattedDateFull = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

        const adminRows = Object.entries(l?.adminAttendance || {}).map(([name, data]) => {
            return `<tr><td><strong>${name}</strong></td><td>${data.shifts.join(' / ').toUpperCase()}</td><td class="${data.present ? 'present' : 'absent'} status-tag">${data.present ? 'PRESENTE' : 'AUSENTE'}</td></tr>`;
        }).join('');

        const teacherRows = Object.entries(l?.teacherAttendance || {}).map(([name, data]) => {
            return `<tr><td><strong>${name}</strong></td><td class="${data.present ? 'present' : 'absent'} status-tag">${data.present ? 'PRESENTE' : 'FALTA'}</td><td>${data.substitute || (data.present ? '-' : 'Sem substituto')}</td></tr>`;
        }).join('');

        const extraRows = (l?.extraClasses || []).map(ex => {
            return `<tr><td><strong>${ex.professor}</strong></td><td>${ex.subject}</td><td>${ex.className}</td></tr>`;
        }).join('');

        const occCards = reportOccurrences.map(occ => {
            return `<div class="occ-card"><div class="occ-header"><span class="student-name">${occ.studentName}</span><span class="occ-meta">${occ.studentClass} • ${occ.category}</span></div><div class="occ-desc">"${occ.description}"</div><div style="font-size: 9px; margin-top: 5px; color: #ef4444; font-weight: bold; text-align: right;">EMITIDO POR: PROF. ${occ.reportedBy.toUpperCase()}</div></div>`;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório Diário Consolidado - ${reportOccDate}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { height: 90px; }
                    .header-info { text-align: right; }
                    .header-info h1 { margin: 0; font-size: 24px; color: #ef4444; text-transform: uppercase; font-weight: 900; }
                    .header-info p { margin: 5px 0 0; font-size: 14px; color: #4b5563; font-weight: bold; }
                    section { margin-bottom: 35px; }
                    h2 { font-size: 14px; text-transform: uppercase; background: #f3f4f6; padding: 10px 15px; border-left: 5px solid #ef4444; margin-bottom: 15px; font-weight: 800; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th { background-color: #f9fafb; color: #6b7280; font-size: 10px; text-transform: uppercase; padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
                    td { padding: 12px; font-size: 11px; border: 1px solid #e5e7eb; vertical-align: middle; }
                    .status-tag { font-weight: 900; text-transform: uppercase; font-size: 9px; }
                    .present { color: #059669; }
                    .absent { color: #dc2626; }
                    .obs-box { background: #fff; border: 1px solid #e5e7eb; padding: 25px; border-radius: 8px; font-size: 12px; color: #374151; white-space: pre-wrap; font-style: italic; min-height: 120px; }
                    .occ-card { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 12px; border-radius: 8px; page-break-inside: avoid; }
                    .occ-header { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 8px; }
                    .student-name { font-weight: bold; font-size: 13px; text-transform: uppercase; color: #111827; }
                    .occ-meta { font-size: 10px; color: #ef4444; font-weight: bold; text-transform: uppercase; }
                    .occ-desc { font-size: 12px; color: #4b5563; }
                    .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 20px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" class="logo" />
                    <div class="header-info">
                        <h1>Relatório Diário Consolidado</h1>
                        <p>${formattedDateFull}</p>
                    </div>
                </div>
                <section>
                    <h2>1. Equipe Administrativa e Operacional</h2>
                    <table>
                        <thead><tr><th width="50%">Colaborador</th><th width="30%">Turnos</th><th width="20%">Status</th></tr></thead>
                        <tbody>${adminRows || '<tr><td colspan="3" align="center">Nenhum registro.</td></tr>'}</tbody>
                    </table>
                </section>
                <section>
                    <h2>2. Equipe Docente e Substituições</h2>
                    <table>
                        <thead><tr><th width="50%">Professor em Grade</th><th width="20%">Status</th><th width="30%">Substituto / Observação</th></tr></thead>
                        <tbody>${teacherRows || '<tr><td colspan="3" align="center">Nenhum registro.</td></tr>'}</tbody>
                    </table>
                </section>
                <section>
                    <h2>3. Aulas Extras Realizadas</h2>
                    <table>
                        <thead><tr><th width="40%">Professor</th><th width="40%">Disciplina</th><th width="20%">Turma</th></tr></thead>
                        <tbody>${extraRows || '<tr><td colspan="3" align="center">Nenhuma aula extra registrada.</td></tr>'}</tbody>
                    </table>
                </section>
                <section>
                    <h2>4. Relato Geral da Unidade (Gestão do Prédio)</h2>
                    <div class="obs-box">${l?.generalObservations || 'Sem observações registradas para esta data.'}</div>
                </section>
                <section>
                    <h2>5. Ocorrências com Alunos</h2>
                    ${occCards || '<p style="font-size: 11px; color: #6b7280; font-style: italic;">Nenhuma ocorrência registrada.</p>'}
                </section>
                <div class="footer">CEMAL EQUIPE - 10 ANOS | Gerado em ${new Date().toLocaleString()}</div>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePrintInfantilReport = (report: InfantilReport) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = new Date(report.updatedAt).toLocaleDateString('pt-BR');

        const skillsTable = SKILLS_CONFIG.map(cat => {
            const rows = cat.objectives.map(obj => {
                const score = report.scores[obj.code] || '-';
                return `<tr><td>(${obj.code}) ${obj.desc}</td><td align="center"><strong>${score}</strong></td></tr>`;
            }).join('');
            
            const descriptive = report.descriptiveText[cat.category] || 'Sem observações registradas para este campo.';

            return `
                <section class="skill-section">
                    <h3>${cat.category.toUpperCase()}</h3>
                    <table>
                        <thead><tr><th width="85%">Objetivo de Aprendizagem</th><th width="15%" align="center">Avaliação</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="descriptive-box">
                        <strong>Parecer Descritivo:</strong><br/>
                        ${descriptive}
                    </div>
                </section>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Parecer Pedagógico - ${report.studentName}</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; line-height: 1.4; font-size: 11px; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { height: 70px; }
                    .header-info { text-align: right; }
                    .header-info h1 { margin: 0; font-size: 18px; color: #f97316; text-transform: uppercase; font-weight: 900; }
                    .student-info { background: #fff7ed; padding: 15px; border-radius: 12px; border: 1px solid #ffedd5; display: grid; grid-template-cols: 2fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                    .student-info div span { display: block; font-size: 9px; color: #9a3412; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
                    .student-info div strong { font-size: 12px; color: #431407; }
                    h3 { font-size: 11px; background: #f97316; color: white; padding: 6px 12px; border-radius: 4px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th { background: #fff7ed; padding: 8px; font-size: 9px; text-transform: uppercase; border: 1px solid #fed7aa; text-align: left; }
                    td { padding: 8px; border: 1px solid #fed7aa; }
                    .descriptive-box { background: #fafafa; border: 1px dashed #fdba74; padding: 12px; margin-bottom: 25px; font-style: italic; color: #4b5563; }
                    .legend { display: flex; gap: 15px; margin-bottom: 20px; font-size: 9px; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; }
                    .legend b { color: #f97316; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-around; }
                    .sign { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 9px; font-weight: bold; }
                    @media print { .skill-section { page-break-inside: avoid; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" class="logo" />
                    <div class="header-info">
                        <h1>Relatório de Desenvolvimento Infantil</h1>
                        <p>Educação Infantil - 2024</p>
                    </div>
                </div>
                <div class="student-info">
                    <div><span>Criança</span><strong>${report.studentName}</strong></div>
                    <div><span>Turma</span><strong>${report.className}</strong></div>
                    <div><span>Emissão</span><strong>${dateStr}</strong></div>
                    <div style="grid-column: span 3"><span>Professor(a) Responsável</span><strong>${report.teacherName}</strong></div>
                </div>
                <div class="legend">
                    <span><b>I:</b> Inicia (com apoio frequente)</span>
                    <span><b>ED:</b> Em desenvolvimento (apoio e autonomia)</span>
                    <span><b>CA:</b> Com autonomia (com segurança)</span>
                </div>
                ${skillsTable}
                <div class="footer">
                    <div class="sign">Prof. Responsável</div>
                    <div class="sign">Coordenação Pedagógica</div>
                </div>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const renderCalendarGrid = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const days = [];
        for (let i = 0; i < startingDay; i++) days.push(<div key={`empty-${i}`} className="bg-white/5 border border-white/5 min-h-[120px]"></div>);
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="bg-white/5 border border-white/5 min-h-[120px] p-3 group relative hover:bg-white/10 transition-colors">
                    <span className="text-sm font-bold text-gray-500">{d}</span>
                    <div className="mt-2 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} onClick={() => { setSelectedEvent(ev); setEventForm({ ...ev }); setShowEventModal(true); }} className={`text-[9px] p-1 rounded font-bold uppercase truncate cursor-pointer ${ev.type === 'holiday' ? 'bg-red-500/20 text-red-500' : ev.type === 'exam' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{capitalizedMonth}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-4 bg-black/20 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                </div>
                <div className="grid grid-cols-7">{days}</div>
            </div>
        );
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <div className="flex items-center gap-4 font-black text-[10px] uppercase tracking-widest">
                <Icon size={18} />
                <span>{label}</span>
            </div>
            {activeTab === id && <ChevronRight size={14} className="animate-pulse" />}
        </button>
    );

    const presentStudentIds = new Set(attendanceLogs.map(l => l.studentId));
    const filteredExams = exams.filter(e => {
        const matchStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchStatus && matchSearch;
    });

    const currentClassInfo = GRID_CLASSES.find(c => c.id === selectedStudentClass);
    const classStudents = students.filter(s => s.classId === selectedStudentClass || s.className === currentClassInfo?.name);
    const filteredClassStudents = classStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    const classPresentCount = classStudents.filter(s => presentStudentIds.has(s.id)).length;
    const classAbsentCount = classStudents.length - classPresentCount;
    
    const filteredInfantilReports = infantilReports.filter(r => {
        const matchSearch = r.studentName.toLowerCase().includes(infantilSearch.toLowerCase());
        const matchClass = infantilClassFilter === 'ALL' || r.className === infantilClassFilter;
        return matchSearch && matchClass;
    });

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/10 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10 overflow-y-auto custom-scrollbar pr-2 flex-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2 opacity-50">Menu Administrador</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="daily_log" label="Livro Diário" icon={Book} />
                    <SidebarItem id="schedule" label="Horários" icon={Clock} />
                    <SidebarItem id="infantil" label="Ed. Infantil" icon={Baby} />
                    <SidebarItem id="students" label="Alunos" icon={Users} />
                    <SidebarItem id="reports" label="Relatórios" icon={BarChart3} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertCircle} />
                    <SidebarItem id="materials" label="Materiais" icon={Folder} />
                    <SidebarItem id="pei" label="PEI / AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Ajustes" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'infantil' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Painel Ed. Infantil</h1>
                                <p className="text-orange-500 font-bold uppercase text-[10px] tracking-[0.3em]">Pareceres Pedagógicos Jardim I e II</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                                    <input 
                                        className="pl-12 pr-6 py-3 bg-[#18181b] border border-white/5 rounded-2xl text-white text-sm focus:ring-2 focus:ring-orange-600 outline-none w-72 font-bold shadow-2xl" 
                                        placeholder="Buscar aluno..." 
                                        value={infantilSearch} 
                                        onChange={e => setInfantilSearch(e.target.value)} 
                                    />
                                </div>
                                <div className="flex bg-[#18181b] p-1 rounded-2xl border border-white/5">
                                    <button onClick={() => setInfantilClassFilter('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${infantilClassFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Todos</button>
                                    <button onClick={() => setInfantilClassFilter('JARDIM I')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${infantilClassFilter === 'JARDIM I' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Jardim I</button>
                                    <button onClick={() => setInfantilClassFilter('JARDIM II')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${infantilClassFilter === 'JARDIM II' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Jardim II</button>
                                </div>
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-8">Criança / Aluno</th>
                                        <th className="p-8">Turma</th>
                                        <th className="p-8">Emitido por</th>
                                        <th className="p-8">Última Atualização</th>
                                        <th className="p-8 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredInfantilReports.length > 0 ? filteredInfantilReports.map(report => (
                                        <tr key={report.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-orange-600/10 flex items-center justify-center font-black text-orange-500 text-sm border border-orange-600/20">
                                                        {report.studentName.charAt(0)}
                                                    </div>
                                                    <span className="font-black text-white uppercase tracking-tight text-base">{report.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-white/5">{report.className}</span>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm uppercase">Prof. {report.teacherName}</span>
                                                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Responsável</span>
                                                </div>
                                            </td>
                                            <td className="p-8 text-sm text-gray-500 font-bold">{new Date(report.updatedAt).toLocaleDateString()}</td>
                                            <td className="p-8 text-center">
                                                <button 
                                                    onClick={() => handlePrintInfantilReport(report)}
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                                                >
                                                    <FileIconPdf size={16}/> Gerar PDF
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-40 text-center text-gray-800 font-black uppercase tracking-[0.4em] opacity-30 text-xl">Nenhum parecer encontrado</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Central de Cópias</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Gestão de Impressões e Material Didático</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={18} />
                                    <input 
                                        className="pl-12 pr-6 py-3 bg-[#18181b] border border-white/5 rounded-2xl text-white text-sm focus:ring-2 focus:ring-red-600 outline-none w-72 font-bold shadow-2xl" 
                                        placeholder="Buscar pedido ou professor..." 
                                        value={examSearch} 
                                        onChange={e => setExamSearch(e.target.value)} 
                                    />
                                </div>
                                <div className="flex bg-[#18181b] p-1 rounded-2xl border border-white/5">
                                    <button onClick={() => setExamFilter('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Todos</button>
                                    <button onClick={() => setExamFilter(ExamStatus.PENDING)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.PENDING ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Pendentes</button>
                                    <button onClick={() => setExamFilter(ExamStatus.IN_PROGRESS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.IN_PROGRESS ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Executando</button>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl shadow-xl flex items-center gap-6 group hover:border-yellow-600/30 transition-all">
                                <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform"><Clock size={32}/></div>
                                <div><p className="text-gray-500 font-black uppercase text-[9px] tracking-widest mb-1">Aguardando</p><h3 className="text-3xl font-black text-white">{exams.filter(e => e.status === ExamStatus.PENDING).length}</h3></div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl shadow-xl flex items-center gap-6 group hover:border-blue-600/30 transition-all">
                                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><PlayCircle size={32}/></div>
                                <div><p className="text-gray-500 font-black uppercase text-[9px] tracking-widest mb-1">Na Impressora</p><h3 className="text-3xl font-black text-white">{exams.filter(e => e.status === ExamStatus.IN_PROGRESS).length}</h3></div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 p-6 rounded-3xl shadow-xl flex items-center gap-6 group hover:border-green-600/30 transition-all">
                                <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={32}/></div>
                                <div><p className="text-gray-500 font-black uppercase text-[9px] tracking-widest mb-1">Hoje</p><h3 className="text-3xl font-black text-white">{exams.filter(e => e.status === ExamStatus.COMPLETED).length}</h3></div>
                            </div>
                            <div className="bg-red-600 border border-red-500 p-6 rounded-3xl shadow-2xl flex items-center gap-6 group">
                                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><Layers size={32}/></div>
                                <div><p className="text-red-100 font-black uppercase text-[9px] tracking-widest mb-1">Total Geral</p><h3 className="text-3xl font-black text-white">{exams.length}</h3></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {filteredExams.length > 0 ? filteredExams.map(exam => (
                                <div key={exam.id} className={`bg-[#18181b] border rounded-[2.5rem] p-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 shadow-2xl transition-all hover:scale-[1.01] relative overflow-hidden group ${
                                    exam.status === ExamStatus.PENDING ? 'border-l-8 border-l-yellow-600 border-white/5' : 
                                    exam.status === ExamStatus.IN_PROGRESS ? 'border-l-8 border-l-blue-600 border-white/5' : 
                                    'border-l-8 border-l-green-600 border-white/5 opacity-60'
                                }`}>
                                    <div className="flex-1 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="h-24 w-24 bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-center shrink-0">
                                            <Printer size={40} className={exam.status === ExamStatus.PENDING ? 'text-yellow-500' : exam.status === ExamStatus.IN_PROGRESS ? 'text-blue-500 animate-pulse' : 'text-green-500'}/>
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-3">
                                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                                    exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    'bg-green-500/10 text-green-500 border-green-500/20'
                                                }`}>
                                                    {exam.status === ExamStatus.PENDING ? 'Aguardando' : exam.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Finalizado'}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                                    <Calendar size={12}/> {new Date(exam.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight group-hover:text-red-500 transition-colors leading-none">{exam.title}</h3>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-8">
                                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                                    <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400 border border-white/10 uppercase">{exam.teacherName.charAt(0)}</div>
                                                    <span className="font-bold uppercase text-[11px] tracking-widest">Prof. <span className="text-white">{exam.teacherName}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <School size={16} className="text-red-600/50" />
                                                    <span className="font-bold uppercase text-[11px] tracking-widest">{exam.gradeLevel}</span>
                                                </div>
                                                <div className="flex items-center gap-3 bg-red-600/10 px-4 py-1.5 rounded-2xl border border-red-600/20">
                                                    <Hash size={16} className="text-red-500" />
                                                    <span className="font-black text-red-500 text-base">{exam.quantity} <span className="text-[10px] font-bold text-red-600/70 uppercase">Cópias</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-4 pt-8 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-10">
                                        <a href={exam.fileUrls?.[0]} target="_blank" className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all"><FileDown size={20}/> Baixar</a>
                                        
                                        {exam.status === ExamStatus.PENDING && (
                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-900/40"><PlayCircle size={20}/> Iniciar</button>
                                        )}
                                        
                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-green-900/40"><CheckCircle2 size={20}/> Concluir</button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="py-40 text-center bg-[#18181b] rounded-[4rem] border-4 border-dashed border-white/5">
                                    <Printer size={100} className="mx-auto text-gray-800 mb-8 opacity-20" />
                                    <h3 className="text-2xl font-black text-gray-700 uppercase tracking-tighter">Nenhuma Solicitação</h3>
                                    <p className="text-gray-800 font-bold uppercase text-[10px] tracking-widest mt-2">Aguardando novos pedidos dos professores...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-8">
                            <div>
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none mb-4">Gestão de Alunos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Controle de Matrícula e Frequência</p>
                            </div>
                            <div className="flex flex-col gap-4 w-full md:w-auto">
                                <div className="flex gap-2 justify-end">
                                    <Button onClick={() => { setEnrollmentType('individual'); setShowEnrollmentModal(true); }} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6 py-3 shadow-lg shadow-red-900/20">
                                        <UserPlus size={16} className="mr-2"/> Matrícula Individual
                                    </Button>
                                    <Button onClick={() => { setEnrollmentType('bulk'); setShowEnrollmentModal(true); }} className="bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6 py-3 border border-white/10">
                                        <UserPlus2 size={16} className="mr-2"/> Matrícula em Lote
                                    </Button>
                                </div>
                                <div className="relative group w-full md:w-96">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" size={24} />
                                    <input 
                                        className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600/50 transition-all text-lg shadow-2xl" 
                                        placeholder="Buscar aluno na turma..." 
                                        value={studentSearch} 
                                        onChange={e => setStudentSearch(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="bg-gradient-to-br from-red-600 to-red-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <Users className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-white/70 font-black uppercase text-[10px] tracking-widest mb-2">Matriculados na Turma</p>
                                <h3 className="text-5xl font-black text-white">{classStudents.length}</h3>
                                <div className="mt-4 flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest"><GraduationCap size={14}/> Discentes Ativos</div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <CheckCircle2 className="absolute -right-4 -bottom-4 text-green-500/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Presentes Hoje</p>
                                <h3 className="text-5xl font-black text-green-500">{classPresentCount}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[10px] font-bold uppercase tracking-widest"><Hash size={14}/> {((classPresentCount / classStudents.length) * 100 || 0).toFixed(1)}% de Adesão</div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                                <UserMinus className="absolute -right-4 -bottom-4 text-red-500/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Ausentes Hoje</p>
                                <h3 className="text-5xl font-black text-red-500">{classAbsentCount}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[10px] font-bold uppercase tracking-widest"><AlertCircle size={14}/> Apoio Pedagógico</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 overflow-x-auto pb-4 mb-10 custom-scrollbar">
                            {GRID_CLASSES.map(cls => (
                                <button key={cls.id} onClick={() => setSelectedStudentClass(cls.id)} className={`px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all shrink-0 flex items-center gap-3 ${selectedStudentClass === cls.id ? 'bg-white text-black border-white shadow-2xl shadow-white/10 scale-105' : 'bg-[#18181b] text-gray-500 border-white/5 hover:bg-white/5 hover:text-white'}`}>
                                    {cls.shift === 'morning' ? <Sun size={16} className={selectedStudentClass === cls.id ? 'text-orange-500' : 'text-gray-600'}/> : <Moon size={16} className={selectedStudentClass === cls.id ? 'text-blue-500' : 'text-gray-600'}/>}
                                    {cls.name}
                                </button>
                            ))}
                        </div>

                        <div className="bg-[#18181b] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-8">Aluno</th><th className="p-8 text-center">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredClassStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 font-black text-white uppercase text-base">{s.name}</td>
                                            <td className="p-8 text-center"><button onClick={() => deleteStudent(s.id)} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências Globais</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Registros de todos os alunos e turmas</p>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-8">Data</th><th className="p-8">Aluno</th><th className="p-8">Categoria</th><th className="p-8">Relato</th><th className="p-8">Autor</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {occurrences.map(occ => (
                                        <tr key={occ.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 text-xs text-gray-500">{new Date(occ.timestamp).toLocaleDateString()}</td>
                                            <td className="p-8 font-black text-white uppercase">{occ.studentName}</td>
                                            <td className="p-8">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{occ.category}</span>
                                            </td>
                                            <td className="p-8 text-sm text-gray-400 italic max-w-xs truncate">"{occ.description}"</td>
                                            <td className="p-8 text-xs font-bold text-gray-500 uppercase">{occ.reportedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acervo de Materiais</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Arquivos enviados pelos professores para sala de aula</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {materials.map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group">
                                    <div className="p-4 bg-red-600/10 text-red-500 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform"><FileText size={32}/></div>
                                    <h3 className="text-xl font-black text-white uppercase mb-1 leading-tight truncate">{mat.title}</h3>
                                    <p className="text-xs text-red-600 font-black uppercase tracking-widest mb-4">{mat.className}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-8">Por: {mat.teacherName}</p>
                                    <a href={mat.fileUrl} target="_blank" className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest text-center border border-white/10">Baixar Arquivo</a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">PEI / AEE</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Planejamento Educacional Individualizado</p>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-8">Aluno</th><th className="p-8">Professor / Matéria</th><th className="p-8">Bimestre</th><th className="p-8 text-center">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {peis.map(pei => (
                                        <tr key={pei.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 font-black text-white uppercase">{pei.studentName}</td>
                                            <td className="p-8">
                                                <p className="text-sm font-bold text-gray-200">{pei.teacherName}</p>
                                                <p className="text-[10px] font-black text-red-500 uppercase">{pei.subject}</p>
                                            </td>
                                            <td className="p-8 font-bold text-gray-500 uppercase text-xs">{pei.period}</td>
                                            <td className="p-8 text-center">
                                                <button onClick={() => { setSelectedPei(pei); setShowPeiModal(true); }} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20">Ver Documento</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gestão de eventos e recesso</p>
                        </header>
                        {renderCalendarGrid()}
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Acompanhamento pedagógico docente</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${plan.type === 'semester' ? 'bg-blue-600/10 text-blue-500 border-blue-600/20' : 'bg-green-600/10 text-green-500 border-green-600/20'}`}>
                                            {plan.type === 'semester' ? 'Bimestral' : 'Diário'}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase mb-1 leading-tight">{plan.className}</h3>
                                    <p className="text-xs text-red-600 font-black uppercase tracking-widest mb-6">{plan.subject}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mb-8 line-clamp-3 italic">"{plan.topic || plan.semesterContents}"</p>
                                    <div className="pt-6 border-t border-white/5 flex flex-col gap-2">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Responsável:</p>
                                        <p className="text-xs font-bold text-white uppercase">{plan.teacherName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Configurações</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Mensagens e sistemas do prédio</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/10 p-12 rounded-[3rem] shadow-2xl space-y-12">
                            <section>
                                <h3 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-4"><Megaphone className="text-red-600"/> Banner de Avisos (TV)</h3>
                                <div className="space-y-8">
                                    <label className="flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/5 cursor-pointer group">
                                        <input type="checkbox" className="w-6 h-6 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} />
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Exibir mensagem nos monitores do prédio</span>
                                    </label>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Mensagem do Banner</label>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all min-h-[120px]" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Ex: Antecipação do feriado conforme decreto estadual..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(['info', 'warning', 'error', 'success'] as const).map(type => (
                                            <button key={type} onClick={() => setConfigBannerType(type)} className={`py-4 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all ${configBannerType === type ? 'bg-red-600 border-red-500 text-white' : 'bg-black/20 border-white/5 text-gray-600'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                            <Button onClick={handleSaveConfig} className="w-full h-20 bg-green-600 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-green-900/40"><Save size={24} className="mr-3"/> Salvar Ajustes</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Relatórios</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Extração de dados e livros de registro</p>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 p-8 opacity-5"><ClipboardCheck size={120}/></div>
                                 <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Relatório Diário Consolidado</h3>
                                 <p className="text-gray-400 text-sm mb-8 leading-relaxed">Gere o documento oficial contendo as faltas da equipe docente, aulas extras e todas as ocorrências de alunos do dia.</p>
                                 <div className="flex flex-col gap-4">
                                    <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={reportOccDate} onChange={e => setReportOccDate(e.target.value)}/>
                                    <button onClick={handlePrintDailyOccReport} className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all"><Printer size={20}/> Gerar PDF Diário</button>
                                 </div>
                             </div>
                             {/* Outros relatórios podem ser adicionados aqui futuramente */}
                        </div>
                    </div>
                )}
                
                {activeTab === 'daily_log' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                        <header className="mb-12 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-[#18181b] p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-8"><div className="h-24 w-24 rounded-[2rem] bg-red-600 flex items-center justify-center shadow-2xl shadow-red-900/40"><ClipboardCheck size={48} className="text-white" /></div><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Livro Diário</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Registro Oficial da Gestão Escolar</p></div></div>
                            <div className="flex items-center gap-4 w-full xl:w-auto"><div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex items-center gap-4 px-8 shadow-inner flex-1 xl:flex-none justify-center"><Calendar className="text-red-500" size={24}/><input type="date" className="bg-transparent border-none text-white font-black text-xl outline-none cursor-pointer" value={logDate} onChange={e => setLogDate(e.target.value)}/></div><Button onClick={handleSaveDailyLog} isLoading={isSavingLog} className="bg-green-600 px-10 rounded-3xl h-20 font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-900/20 hover:scale-105 transition-transform"><Save size={24} className="mr-3"/> Salvar Relatório</Button></div>
                        </header>
                        {dailyLog ? (
                            <div className="space-y-12 pb-32">
                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-red-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Equipe Administrativa</h2></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{ADMIN_GROUPS.map(group => (<div key={group.role} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-xl overflow-hidden relative group"><h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6">{group.role}</h3><div className="space-y-10">{group.names.map(name => { const att = dailyLog.adminAttendance[name] || { present: true, shifts: ['matutino'] }; return (<div key={name} className="flex items-center justify-between group/item"><div className="flex flex-col"><span className={`text-base font-black uppercase tracking-tight transition-colors ${att.present ? 'text-white' : 'text-red-500 line-through opacity-50'}`}>{name}</span><div className="flex gap-4 mt-3">{['matutino', 'vespertino'].map(s => (<label key={s} className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" className="hidden" checked={att.shifts.includes(s)} onChange={() => toggleAdminShift(name, s)} /><div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${att.shifts.includes(s) ? 'bg-red-600 border-red-500 shadow-lg shadow-red-900/40' : 'border-white/10 bg-black/40'}`}>{att.shifts.includes(s) && <CheckCircle2 size={14} className="text-white"/>}</div><span className={`text-[9px] font-black uppercase tracking-widest ${att.shifts.includes(s) ? 'text-white' : 'text-gray-600'}`}>{s}</span></label>))}</div></div><button onClick={() => toggleAdminPresence(name)} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${att.present ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-2xl shadow-red-900/40'}`}>{att.present ? <UserCheck size={28}/> : <UserMinus size={28}/>}</button></div>);})}</div></div>))}</div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-blue-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Corpo Docente (Substituições)</h2></div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-xl">
                                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-10 flex items-center gap-4"><Sun size={28} className="text-yellow-500"/> Turno Matutino</h3>
                                            <div className="space-y-6">{getTeachersByShift('morning').map(prof => {
                                                const att = dailyLog.teacherAttendance[prof] || { present: true };
                                                return (<div key={prof} className={`bg-black/20 p-8 rounded-3xl border transition-all ${!att.present ? 'border-red-600/50 bg-red-600/5 shadow-2xl' : 'border-white/5'}`}><div className="flex items-center justify-between mb-6"><span className={`text-base font-black uppercase tracking-tight ${!att.present ? 'text-red-500' : 'text-white'}`}>{prof}</span><div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5"><button onClick={() => setTeacherStatus(prof, true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${att.present ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Presente</button><button onClick={() => setTeacherStatus(prof, false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!att.present ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Faltou</button></div></div>{!att.present && (<input className="w-full bg-black/60 border border-red-600/30 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-red-500" placeholder="Digite o nome do substituto..." value={att.substitute || ''} onChange={e => setTeacherSubstitute(prof, e.target.value)}/>)}</div>);
                                            })}</div>
                                        </div>
                                        <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-xl">
                                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-10 flex items-center gap-4"><Moon size={28} className="text-blue-500"/> Turno Vespertino</h3>
                                            <div className="space-y-6">{getTeachersByShift('afternoon').map(prof => {
                                                const att = dailyLog.teacherAttendance[prof] || { present: true };
                                                return (<div key={prof} className={`bg-black/20 p-8 rounded-3xl border transition-all ${!att.present ? 'border-red-600/50 bg-red-600/5 shadow-2xl' : 'border-white/5'}`}><div className="flex items-center justify-between mb-6"><span className={`text-base font-black uppercase tracking-tight ${!att.present ? 'text-red-500' : 'text-white'}`}>{prof}</span><div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5"><button onClick={() => setTeacherStatus(prof, true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${att.present ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Presente</button><button onClick={() => setTeacherStatus(prof, false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!att.present ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Faltou</button></div></div>{!att.present && (<input className="w-full bg-black/60 border border-red-600/30 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-red-500" placeholder="Digite o nome do substituto..." value={att.substitute || ''} onChange={e => setTeacherSubstitute(prof, e.target.value)}/>)}</div>);
                                            })}</div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-green-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Registro de Aulas Extras</h2></div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                            <select className="bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-green-600" value={newExtra.professor} onChange={e => setNewExtra({...newExtra, professor: e.target.value})}>
                                                <option value="">Selecione o Professor</option>
                                                {staff.filter(s => s.isTeacher).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                            </select>
                                            <select className="bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-green-600" value={newExtra.subject} onChange={e => setNewExtra({...newExtra, subject: e.target.value})}>
                                                <option value="">Selecione a Disciplina</option>
                                                {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <select className="bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-green-600" value={newExtra.className} onChange={e => setNewExtra({...newExtra, className: e.target.value})}>
                                                <option value="">Selecione a Turma</option>
                                                {GRID_CLASSES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <Button onClick={addExtraClass} className="bg-green-600 h-14 rounded-xl font-black uppercase text-xs tracking-widest"><Plus size={18} className="mr-2"/> Adicionar Aula</Button>
                                        </div>
                                        <div className="space-y-3">
                                            {(dailyLog.extraClasses || []).map((ex, idx) => (
                                                <div key={idx} className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                                    <div className="flex gap-6 items-center">
                                                        <span className="text-white font-black uppercase text-sm">{ex.professor}</span>
                                                        <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">{ex.subject}</span>
                                                        <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/20">{ex.className}</span>
                                                    </div>
                                                    <button onClick={() => removeExtraClass(idx)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                            {(dailyLog.extraClasses || []).length === 0 && <p className="text-center text-gray-700 py-4 font-bold text-xs uppercase opacity-50 tracking-widest">Nenhuma aula extra registrada para hoje.</p>}
                                        </div>
                                    </div>
                                </section>

                                <section><div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-purple-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Relatório Geral da Unidade</h2></div><div className="bg-[#18181b] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden"><textarea className="w-full bg-black/20 border border-white/10 rounded-[2.5rem] p-10 text-white font-medium text-lg outline-none focus:border-purple-600 transition-all min-h-[300px]" placeholder="Relate as ocorrências gerais do prédio..." value={dailyLog.generalObservations} onChange={e => setDailyLog({...dailyLog, generalObservations: e.target.value})} /></div></section>
                                
                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-yellow-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Ocorrências de Alunos (Hoje)</h2></div>
                                    <div className="space-y-6">
                                        {occurrences.filter(o => o.date === logDate).length > 0 ? occurrences.filter(o => o.date === logDate).map(occ => (
                                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl flex gap-8 items-start relative overflow-hidden">
                                                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><AlertCircle size={32}/></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-2"><h4 className="text-xl font-black text-white uppercase">{occ.studentName} <span className="text-gray-600 ml-2">({occ.studentClass})</span></h4><span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Prof. {occ.reportedBy}</span></div>
                                                    <p className="text-gray-400 text-lg italic bg-black/20 p-6 rounded-2xl border border-white/5">"{occ.description}"</p>
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-gray-600 py-10 font-bold uppercase text-xs tracking-widest opacity-40">Nenhuma ocorrência registrada por professores hoje.</p>}
                                    </div>
                                </section>
                            </div>
                        ) : (<div className="py-40 text-center animate-pulse"><Loader2 size={40} className="text-red-600 animate-spin mx-auto mb-4"/><p className="text-white font-black uppercase tracking-[0.3em]">Carregando Livro...</p></div>)}
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col lg:flex-row justify-between items-center gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Grade Horária</h1><p className="text-gray-400">Distribuição semanal de aulas.</p></div>
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10"><button onClick={() => setScheduleShiftTab('morning')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${scheduleShiftTab === 'morning' ? 'bg-yellow-600 text-white' : 'text-gray-500'}`}><Sun size={14}/> Matutino</button><button onClick={() => setScheduleShiftTab('afternoon')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${scheduleShiftTab === 'afternoon' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}><Moon size={14}/> Vespertino</button></div>
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">{[1,2,3,4,5].map(d => (<button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedDay === d ? 'bg-red-600 text-white' : 'text-gray-500'}`}>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][d-1]}</button>))}</div>
                            </div>
                        </header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-x-auto shadow-2xl custom-scrollbar">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-8 sticky left-0 bg-[#18181b] z-10">Horário</th>{GRID_CLASSES.filter(c => c.shift === scheduleShiftTab).map(c => <th key={c.id} className="p-8">{c.name}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(scheduleShiftTab === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS).map(slot => (
                                        <tr key={slot.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 sticky left-0 bg-[#18181b] z-10"><div className="text-white font-bold text-sm">{slot.label}</div><div className="text-[10px] text-gray-500 font-bold uppercase">{slot.start} - {slot.end}</div></td>
                                            {GRID_CLASSES.filter(c => c.shift === scheduleShiftTab).map(cls => {
                                                const entry = schedule.find(s => s.classId === cls.id && s.slotId === slot.id && s.dayOfWeek === selectedDay);
                                                return (<td key={cls.id} className="p-8">{entry ? (<div className="group relative bg-black/40 p-4 rounded-2xl border border-white/5"><div className="text-red-500 font-black text-[10px] uppercase mb-1">{entry.subject}</div><div className="text-[9px] text-gray-400 font-bold uppercase truncate">{entry.professor}</div><button onClick={() => handleDeleteSchedule(entry.id)} className="absolute -top-3 -right-3 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button></div>) : (<button onClick={() => { setEditingCell({classId: cls.id, slotId: slot.id}); setShowScheduleModal(true); }} className="w-full p-4 rounded-2xl border-2 border-dashed border-white/5 text-gray-700 hover:text-red-600 transition-all flex items-center justify-center"><Plus size={20}/></button>)}</td>);
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* PEI VIEW MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-[#1c1917] border border-orange-500/20 w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4"><Heart className="text-orange-500" size={28}/> Documento PEI</h3>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">{selectedPei.studentName} • {selectedPei.subject} • {selectedPei.period}</p>
                            </div>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-white/5 pb-2">Competências Essenciais</h4>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.essentialCompetencies}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-white/5 pb-2">Conteúdos Selecionados</h4>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.selectedContents}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-white/5 pb-2">Recursos Didáticos</h4>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.didacticResources}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-white/5 pb-2">Estratégias de Avaliação</h4>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.evaluation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ENROLLMENT MODAL */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Matrícula de Aluno</h3>
                                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest mt-1">
                                    {enrollmentType === 'individual' ? 'Registro Único' : 'Importação Manual em Lote'}
                                </p>
                            </div>
                            <button onClick={() => setShowEnrollmentModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleEnroll} className="p-10 space-y-8">
                            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 mb-4">
                                <button type="button" onClick={() => setEnrollmentType('individual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'individual' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Individual</button>
                                <button type="button" onClick={() => setEnrollmentType('bulk')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'bulk' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Em Lote</button>
                            </div>

                            {enrollmentType === 'individual' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">ID / Matrícula</label>
                                            <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all" value={enrollFormData.id} onChange={e => setEnrollFormData({...enrollFormData, id: e.target.value.toUpperCase()})} placeholder="EX: 2024001" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino</label>
                                            <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-red-600" value={enrollFormData.classId} onChange={e => setEnrollFormData({...enrollFormData, classId: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {GRID_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo do Aluno</label>
                                        <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all" value={enrollFormData.name} onChange={e => setEnrollFormData({...enrollFormData, name: e.target.value.toUpperCase()})} placeholder="DIGITE O NOME COMPLETO" />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" className="w-6 h-6 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={enrollFormData.isAEE} onChange={e => setEnrollFormData({...enrollFormData, isAEE: e.target.checked})} />
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Aluno Público Alvo da Educação Especial (AEE)</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino (Todos da Lista)</label>
                                        <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-red-600" value={enrollFormData.classId} onChange={e => setEnrollFormData({...enrollFormData, classId: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {GRID_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Lista de Nomes (Um por linha)</label>
                                        <textarea required className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all h-48" value={bulkList} onChange={e => setBulkList(e.target.value)} placeholder="JOÃO SILVA&#10;MARIA OLIVEIRA&#10;PEDRO SANTOS..." />
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2 ml-2 italic">* O sistema gerará IDs de matrícula automáticos para importação em lote.</p>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" isLoading={isEnrolling} className="w-full h-20 bg-red-600 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-900/40 text-sm">
                                <Check size={24} className="mr-3"/> Confirmar Matrícula
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* SCHEDULE MODAL */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tight">Definir Aula</h3><button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white p-2"><X size={24}/></button></div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Disciplina</label><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none focus:border-red-600" value={newSchedule.subject} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})}><option value="">Selecione...</option>{(GRID_CLASSES.find(c => c.id === editingCell?.classId)?.type === 'em' ? EM_SUBJECTS : EFAF_SUBJECTS).map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Professor</label><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none focus:border-red-600" value={newSchedule.professor} onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})}><option value="">Selecione...</option>{staff.filter(s => s.isTeacher).map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                            <Button onClick={handleSaveSchedule} className="w-full h-14 bg-red-600 rounded-2xl font-black uppercase tracking-widest">Salvar Horário</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* EVENT MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button onClick={() => setShowEventModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título</label><input className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Data</label><input type="date" className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Tipo</label><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})}><option value="event">Evento</option><option value="holiday">Feriado</option><option value="exam">Avaliação</option></select></div>
                            <Button onClick={handleSaveEvent} className="w-full h-14 bg-red-600 rounded-2xl font-black uppercase tracking-widest">Salvar Evento</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
