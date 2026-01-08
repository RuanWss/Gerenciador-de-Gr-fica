
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
    getLessonPlans
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
    ExtraClassRecord
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
    FileDown
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

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'reports' | 'pei' | 'calendar' | 'plans' | 'schedule' | 'config' | 'materials' | 'occurrences' | 'daily_log'>('exams');
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

    useEffect(() => {
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubOccurrences = listenToOccurrences(setOccurrences);
        const unsubMaterials = listenToAllMaterials(setMaterials);
        const unsubEvents = listenToEvents(setEvents);
        const unsubStaff = listenToStaffMembers(setStaff);
        const unsubAttendance = listenToAttendanceLogs(logDate, setAttendanceLogs);
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
            unsubMaterials(); unsubEvents(); unsubConfig(); unsubStaff(); unsubAttendance();
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
    
    // --- Lógica de Alunos ---
    const classStudents = students.filter(s => s.classId === selectedStudentClass || s.className === currentClassInfo?.name);
    const filteredClassStudents = classStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    const classPresentCount = classStudents.filter(s => presentStudentIds.has(s.id)).length;
    const classAbsentCount = classStudents.length - classPresentCount;

    // --- Lógica de Planejamentos ---
    const filteredPlans = plans.filter(p => {
        const matchesSearch = 
            p.className.toLowerCase().includes(planSearch.toLowerCase()) ||
            p.subject.toLowerCase().includes(planSearch.toLowerCase()) ||
            p.teacherName.toLowerCase().includes(planSearch.toLowerCase());
        const matchesType = planTypeFilter === 'ALL' || p.type === planTypeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/10 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10 overflow-y-auto custom-scrollbar pr-2 flex-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2 opacity-50">Menu Administrador</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="daily_log" label="Livro Diário" icon={Book} />
                    <SidebarItem id="schedule" label="Horários" icon={Clock} />
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

                        {/* Estatísticas Rápidas */}
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
                                                {exam.materialType === 'handout' && (
                                                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 font-black uppercase tracking-widest">Apostila</span>
                                                )}
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
                                            {exam.instructions && (
                                                <div className="mt-6 p-5 bg-black/30 rounded-3xl border border-white/5 flex items-start gap-4">
                                                    <FileText size={18} className="text-gray-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs text-gray-500 italic leading-relaxed uppercase font-bold">Instruções: "{exam.instructions}"</p>
                                                </div>
                                            )}
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
                                        
                                        {exam.status === ExamStatus.COMPLETED && (
                                            <div className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-green-900/20 text-green-500 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl border border-green-500/20"><CheckCircle2 size={20}/> Entregue</div>
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

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-8">
                            <div>
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none mb-4">Gestão de Alunos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Controle de Matrícula e Frequência</p>
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

                        <div className="flex flex-col gap-6 mb-10">
                            <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/20 p-4 rounded-2xl w-fit">
                                <Users size={18} className="text-red-500"/>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Total Geral de Matriculados: <span className="text-red-500">{students.length} alunos</span></span>
                            </div>
                            <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {GRID_CLASSES.map(cls => (
                                    <button 
                                        key={cls.id} 
                                        onClick={() => setSelectedStudentClass(cls.id)} 
                                        className={`px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all shrink-0 flex items-center gap-3 ${selectedStudentClass === cls.id ? 'bg-white text-black border-white shadow-2xl shadow-white/10 scale-105' : 'bg-[#18181b] text-gray-500 border-white/5 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {cls.shift === 'morning' ? <Sun size={16} className={selectedStudentClass === cls.id ? 'text-orange-500' : 'text-gray-600'}/> : <Moon size={16} className={selectedStudentClass === cls.id ? 'text-blue-500' : 'text-gray-600'}/>}
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#18181b] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
                            <div className="p-10 bg-black/20 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-4">
                                    <Users size={24} className="text-red-500"/> Relação de Alunos
                                </h3>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                                    Exibindo {filteredClassStudents.length} resultados
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/10 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em] border-b border-white/5">
                                        <tr>
                                            <th className="p-10">Dados do Aluno</th>
                                            <th className="p-10">Especificidades</th>
                                            <th className="p-10">Status de Frequência</th>
                                            <th className="p-10 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredClassStudents.map(s => {
                                            const isPresent = presentStudentIds.has(s.id);
                                            return (
                                                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-10">
                                                        <div className="flex items-center gap-6">
                                                            <div className={`h-16 w-16 rounded-full border-2 p-1 shrink-0 transition-transform group-hover:scale-110 ${isPresent ? 'border-green-500' : 'border-white/10'}`}>
                                                                <img 
                                                                    src={s.photoUrl || `https://ui-avatars.com/api/?name=${s.name}&background=18181b&color=ef4444&bold=true`} 
                                                                    className="w-full h-full rounded-full object-cover"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-white uppercase text-base tracking-tight mb-1">{s.name}</p>
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-10">
                                                        <div className="flex flex-wrap gap-2">
                                                            {s.isAEE ? (
                                                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                                    <AlertCircle size={12}/> AEE Ativo
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-700 text-[9px] font-black uppercase tracking-widest">Padrão</span>
                                                            )}
                                                            {!s.photoUrl && (
                                                                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                    Sem Biometria
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-10">
                                                        {isPresent ? (
                                                            <div className="flex items-center gap-3 text-green-500">
                                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
                                                                <span className="font-black text-[10px] uppercase tracking-widest">Presente</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3 text-red-500/30">
                                                                <div className="h-2 w-2 rounded-full bg-red-500/30"></div>
                                                                <span className="font-black text-[10px] uppercase tracking-widest">Ausente</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-10 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => deleteStudent(s.id)} className="h-12 w-12 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all">
                                                                <Trash2 size={20}/>
                                                            </button>
                                                            <button className="h-12 w-12 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all">
                                                                <MoreHorizontal size={20}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredClassStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-32 text-center">
                                                    <div className="flex flex-col items-center opacity-20">
                                                        <Users size={80} className="mb-6"/>
                                                        <p className="font-black uppercase tracking-[0.4em] text-xl">Nenhum Registro</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        {!isViewingDailyOccReport ? (
                            <div className="max-w-4xl">
                                <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Relatórios da Gestão</h1><p className="text-gray-400">Acesse dados consolidados para auditoria e coordenação.</p></header>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative group cursor-pointer hover:border-red-600/30 transition-all" onClick={() => setIsViewingDailyOccReport(true)}>
                                        <div className="flex items-start gap-4 mb-6"><div className="h-14 w-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500"><ClipboardCheck size={32}/></div><div className="flex-1"><h3 className="text-xl font-bold text-white leading-tight">Histórico Consolidado</h3><p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Visualização total do Livro Diário de qualquer data escolhida.</p></div></div>
                                        <div className="mt-auto pt-10"><div className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all"><History size={16}/> Abrir Consulta Diária</div></div>
                                    </div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col opacity-50"><div className="flex items-start gap-4 mb-6"><div className="h-14 w-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500"><FileBarChart size={32}/></div><div className="flex-1"><h3 className="text-xl font-bold text-white leading-tight">Análise de Frequência %</h3><p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Relatório estatístico de presença por turma (em desenvolvimento).</p></div></div></div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right-4">
                                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex items-center gap-6"><button onClick={() => setIsViewingDailyOccReport(false)} className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"><ArrowLeft size={24}/></button><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Relatório Diário</h1><p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">Resumo completo do dia letivo</p></div></div>
                                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto"><div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl"><Calendar className="text-red-500" size={18}/><input type="date" className="bg-transparent border-none text-white font-bold text-sm outline-none cursor-pointer" value={reportOccDate} onChange={e => setReportOccDate(e.target.value)}/></div><Button onClick={handlePrintDailyOccReport} className="h-16 px-8 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-green-900/20"><Download size={18} className="mr-2"/> Download PDF</Button></div>
                                </header>
                                <div className="space-y-12 pb-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-8">
                                            <section className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl"><h3 className="text-lg font-black text-red-500 uppercase tracking-widest mb-8 flex items-center gap-3"><Users size={20}/> Frequência Administrativa</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{reportDailyLogData ? Object.entries(reportDailyLogData.adminAttendance).map(([name, data]) => (<div key={name} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between"><div><p className="font-bold text-white text-sm uppercase">{name}</p><p className="text-[10px] text-gray-500 uppercase">{data.shifts.join(', ')}</p></div>{data.present ? <CheckCircle2 size={20} className="text-green-500"/> : <UserMinus size={20} className="text-red-500"/>}</div>)) : <p className="text-gray-600 italic">Sem registros administrativos.</p>}</div></section>
                                            <section className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl"><h3 className="text-lg font-black text-blue-500 uppercase tracking-widest mb-8 flex items-center gap-3"><School size={20}/> Frequência Docente</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{reportDailyLogData ? Object.entries(reportDailyLogData.teacherAttendance).map(([name, data]) => (<div key={name} className={`bg-black/30 p-4 rounded-2xl border ${!data.present ? 'border-red-600/30' : 'border-white/5'} flex items-center justify-between`}><div><p className={`font-bold text-sm uppercase ${!data.present ? 'text-red-500' : 'text-white'}`}>{name}</p>{!data.present && <p className="text-[10px] text-red-400 mt-1">Substituto: {data.substitute || 'Não informado'}</p>}</div>{data.present ? <CheckCircle2 size={20} className="text-green-500"/> : <UserMinus size={20} className="text-red-500"/>}</div>)) : <p className="text-gray-600 italic">Sem registros docentes.</p>}</div></section>
                                        </div>
                                        <section className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl h-full"><h3 className="text-lg font-black text-purple-500 uppercase tracking-widest mb-8 flex items-center gap-3"><FileText size={20}/> Relato do Prédio</h3><div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap italic bg-black/40 p-6 rounded-2xl border border-white/5">{reportDailyLogData?.generalObservations || "Nenhum relato pedagógico inserido nesta data."}</div></section>
                                    </div>
                                    <section className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl"><h3 className="text-lg font-black text-green-500 uppercase tracking-widest mb-8 flex items-center gap-3"><Star size={20}/> Aulas Extras</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{reportDailyLogData?.extraClasses?.length ? reportDailyLogData.extraClasses.map((ex, i) => (<div key={i} className="bg-black/30 p-4 rounded-2xl border border-white/5"><div><p className="font-bold text-white text-sm uppercase">{ex.professor}</p><p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{ex.subject}</p><p className="text-[10px] text-green-500 font-black uppercase mt-1 tracking-widest">{ex.className}</p></div></div>)) : <p className="text-gray-600 italic">Nenhuma aula extra registrada.</p>}</div></section>
                                    <section className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl"><h3 className="text-lg font-black text-yellow-500 uppercase tracking-widest mb-8 flex items-center gap-3"><AlertCircle size={20}/> Ocorrências com Alunos (Hoje)</h3><div className="space-y-4">{occurrences.filter(o => o.date === reportOccDate).length > 0 ? occurrences.filter(o => o.date === reportOccDate).map(occ => (<div key={occ.id} className="bg-black/30 p-6 rounded-2xl border border-white/5 flex gap-6 items-start"><div className="h-12 w-12 bg-red-600/10 rounded-xl flex items-center justify-center text-red-500 shrink-0"><AlertCircle size={24}/></div><div className="flex-1"><div className="flex justify-between mb-2"><h4 className="font-black text-white uppercase text-sm">{occ.studentName} <span className="text-gray-600 ml-2">({occ.studentClass})</span></h4><span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Prof. {occ.reportedBy}</span></div><p className="text-gray-400 text-sm italic">"${occ.description}"</p></div></div>)) : <p className="text-gray-600 italic">Nenhuma ocorrência disciplinar registrada por professores nesta data.</p>}</div></section>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                         <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Histórico de Ocorrências</h1><p className="text-gray-400">Relatos disciplinares e acadêmicos enviados pelo corpo docente.</p></header>
                        <div className="mb-10 relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} /><input className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" placeholder="Buscar aluno ou professor..." value={occurrenceSearch} onChange={e => setOccurrenceSearch(e.target.value)} /></div>
                        <div className="grid grid-cols-1 gap-6">
                            {occurrences.filter(occ => occ.studentName.toLowerCase().includes(occurrenceSearch.toLowerCase()) || occ.reportedBy.toLowerCase().includes(occurrenceSearch.toLowerCase())).map(occ => (
                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all"><div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><AlertCircle size={28}/></div><div><h3 className="text-xl font-bold text-white uppercase">{occ.studentName}</h3><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{occ.studentClass} • {occ.date}</p></div></div><button onClick={() => deleteOccurrence(occ.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button></div><div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-4 text-gray-300 italic">"{occ.description}"</div><div className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><UserCircle size={14}/> Relatado por: {occ.reportedBy}</div></div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Arquivos da Sala</h1><p className="text-gray-400">Materiais enviados para exibição nas Smart TVs.</p></div></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {materials.map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group"><div className="flex justify-between items-start mb-6"><div className="p-4 bg-red-600/10 text-red-500 rounded-2xl"><Folder size={32}/></div><button onClick={() => deleteClassMaterial(mat.id)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={20}/></button></div><h3 className="text-xl font-bold text-white mb-2 truncate uppercase">{mat.title}</h3><p className="text-xs text-red-500 font-black uppercase tracking-widest mb-2">{mat.className} • {mat.subject}</p><p className="text-[10px] text-gray-500 font-bold uppercase mb-8">Enviado por Prof. {mat.teacherName}</p><a href={mat.fileUrl} target="_blank" className="mt-auto flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest py-5 rounded-2xl border border-white/5 transition-all text-xs"><Download size={18}/> Baixar Arquivo</a></div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planos AEE (PEI)</h1><p className="text-gray-400">Atendimento Educacional Especializado.</p></div></header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left"><thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Professor</th><th className="p-10">Atualização</th><th className="p-10 text-center">Ações</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {peis.map(p => (<tr key={p.id} className="hover:bg-white/[0.03] transition-colors"><td className="p-10 font-bold text-white uppercase text-sm">{p.studentName}</td><td className="p-10 font-bold text-gray-400 text-sm">{p.teacherName} <span className="block text-[10px] text-red-500 uppercase font-black">{p.subject}</span></td><td className="p-10 font-bold text-gray-500 text-xs uppercase">{new Date(p.updatedAt).toLocaleDateString()}</td><td className="p-10 text-center"><button className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><FileText size={20}/></button></td></tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1><p className="text-gray-400">Eventos, feriados e avaliações.</p></div><Button onClick={() => setShowEventModal(true)} className="bg-red-600 h-16 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"><Plus size={18} className="mr-2"/> Novo Evento</Button></header>
                        {renderCalendarGrid()}
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos</h1>
                            <p className="text-gray-400">Acompanhamento dos planos de aula bimestrais.</p>
                        </header>

                        {/* Barra de Filtros para Planejamentos */}
                        <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                            <div className="relative group w-full md:w-96">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" size={24} />
                                <input 
                                    className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-5 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600/50 transition-all text-sm shadow-xl" 
                                    placeholder="Buscar por professor, disciplina ou turma..." 
                                    value={planSearch} 
                                    onChange={e => setPlanSearch(e.target.value)} 
                                />
                            </div>
                            
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
                                <button 
                                    onClick={() => setPlanTypeFilter('semester')} 
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${planTypeFilter === 'semester' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Book size={14}/> Bimestrais
                                </button>
                                <button 
                                    onClick={() => setPlanTypeFilter('daily')} 
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${planTypeFilter === 'daily' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Calendar size={14}/> Diários
                                </button>
                                <button 
                                    onClick={() => setPlanTypeFilter('ALL')} 
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${planTypeFilter === 'ALL' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Filter size={14}/> Todos
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlans.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                                        <BookOpenCheck size={80} className="text-white" />
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-red-600/10 text-red-500 rounded-xl">
                                            <BookOpenCheck size={24}/>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${p.type === 'semester' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                            {p.type === 'semester' ? 'Semestre' : 'Diário'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white uppercase mb-1 tracking-tight">{p.className}</h3>
                                    <p className="text-xs text-red-500 font-black uppercase tracking-widest mb-6 min-h-[2.5rem]">{p.subject}</p>
                                    <div className="bg-black/20 p-5 rounded-2xl text-[10px] text-gray-400 font-bold uppercase mb-8 flex items-center gap-3 border border-white/5">
                                        <UserCircle size={16} className="text-gray-600" />
                                        <span>Prof. {p.teacherName}</span>
                                    </div>
                                    <button className="w-full py-4 bg-white/5 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/5 transition-all mt-auto shadow-sm">
                                        Visualizar Plano
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        {filteredPlans.length === 0 && (
                            <div className="py-32 text-center bg-[#18181b] rounded-[3rem] border border-white/5 border-dashed">
                                <BookOpen size={64} className="mx-auto text-gray-700 mb-4 opacity-20" />
                                <p className="text-gray-500 font-black uppercase tracking-widest">Nenhum planejamento encontrado para os filtros aplicados.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configuração</h1><p className="text-gray-400">Parâmetros globais do sistema.</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
                            <div><h3 className="text-lg font-bold text-white flex items-center gap-3 mb-6"><Megaphone className="text-red-500"/> Banner de Avisos (Smart TV)</h3><div className="space-y-6"><div className="flex items-center gap-3"><input type="checkbox" id="broadcast" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} className="w-6 h-6 rounded border-white/10 bg-black text-red-600 focus:ring-red-500"/><label htmlFor="broadcast" className="text-gray-400 font-bold uppercase text-xs tracking-widest">Ativar aviso nas telas</label></div><textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all h-32" placeholder="Digite a mensagem..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)}/><div className="flex flex-wrap gap-4">{(['info', 'warning', 'error', 'success'] as const).map(type => (<button key={type} onClick={() => setConfigBannerType(type)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${configBannerType === type ? 'bg-white text-black' : 'bg-white/5 text-gray-500 border-white/5'}`}>{type}</button>))}</div></div></div>
                            <Button onClick={handleSaveConfig} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
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

            {showEventModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"><div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</h3><button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white p-2"><X size={24}/></button></div><div className="p-8 space-y-6"><input className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" placeholder="Título do Evento" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})}/><input type="date" className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}/><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})}><option value="event">Evento Geral</option><option value="holiday">Feriado/Recesso</option><option value="exam">Avaliação</option><option value="meeting">Reunião</option></select><textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 h-24" placeholder="Descrição" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})}/><div className="flex gap-3">{selectedEvent && <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="flex-1 h-14 border border-white/5 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all">Excluir</button>}<Button onClick={handleSaveEvent} className="flex-[2] h-14 bg-red-600 rounded-2xl font-black uppercase tracking-widest">Salvar</Button></div></div></div>
                </div>
            )}
        </div>
    );
};
