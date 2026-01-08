
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
    saveStudent,
    uploadExamFile,
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
    StaffMember
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
    UserX,
    Save,
    ChevronRight,
    ChevronLeft,
    BookOpenCheck,
    Megaphone,
    FileText,
    ClipboardCheck,
    FileWarning,
    UserMinus,
    Info,
    Loader2,
    FileBarChart,
    User,
    BarChart3,
    Hash,
    CheckCircle2,
    ArrowLeft,
    History
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

    const [selectedDay, setSelectedDay] = useState(1);
    const [scheduleShiftTab, setScheduleShiftTab] = useState<'morning' | 'afternoon'>('morning');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState({ subject: '', professor: '' });

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [eventForm, setEventForm] = useState({ title: '', date: '', type: 'event' as any, description: '' });

    // Reports State
    const [reportSelectedClass, setReportSelectedClass] = useState('');
    const [reportSelectedStudent, setReportSelectedStudent] = useState('');
    const [isViewingDailyOccReport, setIsViewingDailyOccReport] = useState(false);
    const [reportOccDate, setReportOccDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportOccSearch, setReportOccSearch] = useState('');

    const [examSearch, setExamSearch] = useState('');
    const [occurrenceSearch, setOccurrenceSearch] = useState('');
    const [selectedStudentClass, setSelectedStudentClass] = useState<string>('6efaf');

    const [showQuickOccModal, setShowQuickOccModal] = useState(false);
    const [quickOccData, setQuickOccData] = useState<Partial<StudentOccurrence>>({});

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
    }, [activeTab, logDate]);

    const loadDailyLog = async () => {
        const log = await getDailySchoolLog(logDate);
        if (log) setDailyLog(log);
        else setDailyLog({ id: logDate, date: logDate, adminAttendance: {}, teacherAttendance: {}, generalObservations: '', updatedAt: Date.now() });
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

    const renderCalendarGrid = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{monthName}</h3>
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

    const handleSaveQuickOcc = async () => {
        if (!quickOccData.studentId || !quickOccData.description) return alert("Preencha o motivo");
        const student = students.find(s => s.id === quickOccData.studentId);
        await saveOccurrence({
            id: '',
            studentId: student.id,
            studentName: student.name,
            studentClass: student.className,
            category: 'atraso',
            severity: 'low',
            description: quickOccData.description,
            date: logDate,
            timestamp: Date.now(),
            reportedBy: 'Administração'
        });
        setShowQuickOccModal(false);
        setQuickOccData({});
        alert("Ocorrência registrada!");
    };

    const handlePrintDailyOccReport = () => {
        const reportOccurrences = occurrences.filter(o => o.date === reportOccDate && (
            o.studentName.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
            o.reportedBy.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
            o.description.toLowerCase().includes(reportOccSearch.toLowerCase())
        ));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório de Ocorrências Diárias - ${reportOccDate}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: -1px; }
                    .title { font-size: 18px; font-weight: bold; margin-top: 10px; text-transform: uppercase; color: #666; }
                    .info { margin-bottom: 20px; font-size: 14px; display: flex; justify-content: space-between; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #f8f9fa; color: #666; font-size: 10px; text-transform: uppercase; padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
                    td { padding: 12px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
                    .student-name { font-weight: bold; color: #000; display: block; }
                    .class-info { font-size: 10px; color: #888; text-transform: uppercase; }
                    .category { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase; background: #eee; }
                    .description { font-style: italic; color: #444; margin-top: 4px; }
                    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; pt-10; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">CEMAL EQUIPE</div>
                    <div class="title">Relatório de Ocorrências Diárias</div>
                </div>
                <div class="info">
                    <span>Data: <strong>${new Date(reportOccDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                    <span>Total: <strong>${reportOccurrences.length} Registros</strong></span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="30%">Aluno / Turma</th>
                            <th width="15%">Categoria</th>
                            <th width="40%">Relato</th>
                            <th width="15%">Emitido Por</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportOccurrences.map(o => `
                            <tr>
                                <td>
                                    <span class="student-name">${o.studentName}</span>
                                    <span class="class-info">${o.studentClass}</span>
                                </td>
                                <td><span class="category">${o.category}</span></td>
                                <td class="description">"${o.description}"</td>
                                <td>${o.reportedBy}</td>
                            </tr>
                        `).join('')}
                        ${reportOccurrences.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #999;">Nenhum registro encontrado para os filtros aplicados.</td></tr>' : ''}
                    </tbody>
                </table>
                <div class="footer">
                    Documento gerado eletronicamente pelo Sistema de Gestão Escolar CEMAL EQUIPE em ${new Date().toLocaleString()}
                </div>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const presentStudentIds = new Set(attendanceLogs.map(l => l.studentId));
    const studentsWithoutAttendance = students.filter(s => !presentStudentIds.has(s.id));

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10 overflow-y-auto custom-scrollbar pr-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="daily_log" label="Livro Diário" icon={Book} />
                    <SidebarItem id="schedule" label="Horários" icon={Clock} />
                    <SidebarItem id="students" label="Alunos" icon={Users} />
                    <SidebarItem id="reports" label="Relatórios" icon={BarChart3} />
                    <SidebarItem id="occurrences" label="Ocorrências Alunos" icon={AlertCircle} />
                    <SidebarItem id="materials" label="Materiais Aula" icon={Folder} />
                    <SidebarItem id="pei" label="AEE (PEI)" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configuração" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {/* ABA GRÁFICA */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                         <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1><p className="text-gray-400">Fila de impressões solicitadas pelos professores.</p></div>
                            <div className="relative w-full md:w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar..." value={examSearch} onChange={e => setExamSearch(e.target.value)} /></div>
                        </header>
                        <div className="space-y-6">
                            {exams.filter(e => e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase())).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-8 flex items-center justify-between shadow-xl">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{exam.status}</span><span className="text-xs text-gray-500 font-bold">{new Date(exam.createdAt).toLocaleDateString()}</span></div>
                                        <h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3>
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Prof. {exam.teacherName} • {exam.gradeLevel} • <span className="text-red-500">{exam.quantity} Cópias</span></p>
                                    </div>
                                    <div className="flex gap-4">
                                        <a href={exam.fileUrls?.[0]} target="_blank" className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"><Download size={20}/></a>
                                        {exam.status !== ExamStatus.COMPLETED && <Button onClick={() => updateExamStatus(exam.id, ExamStatus.COMPLETED)} className="bg-red-600 px-8 rounded-2xl font-black uppercase text-xs tracking-widest">Concluir</Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA LIVRO DIÁRIO */}
                {activeTab === 'daily_log' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto pb-24">
                        <header className="mb-12 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-[#18181b] p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-8">
                                <div className="h-24 w-24 rounded-[2rem] bg-red-600 flex items-center justify-center shadow-2xl shadow-red-900/40"><ClipboardCheck size={48} className="text-white" /></div>
                                <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Livro de Ocorrências Diário</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2 mt-2"><Info size={12} className="text-red-500"/> Registro Oficial da Gestão Escolar</p></div>
                            </div>
                            <div className="flex items-center gap-4 w-full xl:w-auto">
                                <div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex items-center gap-4 px-8 shadow-inner flex-1 xl:flex-none justify-center"><Calendar className="text-red-500" size={24}/><input type="date" className="bg-transparent border-none text-white font-black text-xl outline-none cursor-pointer" value={logDate} onChange={e => setLogDate(e.target.value)}/></div>
                                <Button onClick={handleSaveDailyLog} isLoading={isSavingLog} className="bg-green-600 px-10 rounded-3xl h-20 font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-900/20 hover:scale-105 transition-transform"><Save size={24} className="mr-3"/> Salvar Relatório</Button>
                            </div>
                        </header>

                        {dailyLog ? (
                            <div className="space-y-12">
                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-red-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Setor Administrativo & Operacional</h2></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {ADMIN_GROUPS.map(group => (
                                            <div key={group.role} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-xl overflow-hidden relative group">
                                                <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6 flex justify-between items-center">{group.role}<span className="bg-red-600/10 px-3 py-1 rounded-full text-[9px] text-red-400">{group.names.length} Integrantes</span></h3>
                                                <div className="space-y-10">
                                                    {group.names.map(name => {
                                                        const att = dailyLog.adminAttendance[name] || { present: true, shifts: ['matutino'] };
                                                        return (
                                                            <div key={name} className="flex items-center justify-between group/item">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-base font-black uppercase tracking-tight transition-colors ${att.present ? 'text-white' : 'text-red-500 line-through opacity-50'}`}>{name}</span>
                                                                    
                                                                    <div className="flex gap-4 mt-3">
                                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                                            <input type="checkbox" className="hidden" checked={att.shifts.includes('matutino')} onChange={() => toggleAdminShift(name, 'matutino')} />
                                                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${att.shifts.includes('matutino') ? 'bg-red-600 border-red-500 shadow-lg shadow-red-900/40' : 'border-white/10 bg-black/40'}`}>
                                                                                {att.shifts.includes('matutino') && <CheckCircle2 size={14} className="text-white"/>}
                                                                            </div>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${att.shifts.includes('matutino') ? 'text-white' : 'text-gray-600'}`}>Matutino</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                                            <input type="checkbox" className="hidden" checked={att.shifts.includes('vespertino')} onChange={() => toggleAdminShift(name, 'vespertino')} />
                                                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${att.shifts.includes('vespertino') ? 'bg-red-600 border-red-500 shadow-lg shadow-red-900/40' : 'border-white/10 bg-black/40'}`}>
                                                                                {att.shifts.includes('vespertino') && <CheckCircle2 size={14} className="text-white"/>}
                                                                            </div>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${att.shifts.includes('vespertino') ? 'text-white' : 'text-gray-600'}`}>Vespertino</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => toggleAdminPresence(name)} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${att.present ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-2xl shadow-red-900/40'}`}>{att.present ? <UserCheck size={28}/> : <UserMinus size={28}/>}</button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-blue-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Corpo Docente (Grade do Dia)</h2></div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-xl border-t-4 border-t-yellow-600/30">
                                            <div className="flex items-center gap-4 mb-10"><Sun size={28} className="text-yellow-500"/><h3 className="text-lg font-black text-white uppercase tracking-widest">Turno Matutino</h3></div>
                                            <div className="space-y-6">{getTeachersByShift('morning').map(prof => {
                                                const att = dailyLog.teacherAttendance[prof] || { present: true };
                                                return (<div key={prof} className={`bg-black/20 p-8 rounded-3xl border transition-all ${!att.present ? 'border-red-600/50 bg-red-600/5 shadow-2xl' : 'border-white/5'}`}><div className="flex items-center justify-between mb-6"><span className={`text-base font-black uppercase tracking-tight ${!att.present ? 'text-red-500' : 'text-white'}`}>{prof}</span><div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5"><button onClick={() => setTeacherStatus(prof, true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${att.present ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Presente</button><button onClick={() => setTeacherStatus(prof, false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!att.present ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Faltou</button></div></div>{!att.present && (<input className="w-full bg-black/60 border border-red-600/30 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-red-500" placeholder="Digite o nome do substituto..." value={att.substitute || ''} onChange={e => setTeacherSubstitute(prof, e.target.value)}/>)}</div>);
                                            })}</div>
                                        </div>
                                        <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-xl border-t-4 border-t-blue-600/30">
                                            <div className="flex items-center gap-4 mb-10"><Moon size={28} className="text-blue-500"/><h3 className="text-lg font-black text-white uppercase tracking-widest">Turno Vespertino</h3></div>
                                            <div className="space-y-6">{getTeachersByShift('afternoon').map(prof => {
                                                const att = dailyLog.teacherAttendance[prof] || { present: true };
                                                return (<div key={prof} className={`bg-black/20 p-8 rounded-3xl border transition-all ${!att.present ? 'border-red-600/50 bg-red-600/5 shadow-2xl' : 'border-white/5'}`}><div className="flex items-center justify-between mb-6"><span className={`text-base font-black uppercase tracking-tight ${!att.present ? 'text-red-500' : 'text-white'}`}>{prof}</span><div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5"><button onClick={() => setTeacherStatus(prof, true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${att.present ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Presente</button><button onClick={() => setTeacherStatus(prof, false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!att.present ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Faltou</button></div></div>{!att.present && (<input className="w-full bg-black/60 border border-red-600/30 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-red-500" placeholder="Digite o nome do substituto..." value={att.substitute || ''} onChange={e => setTeacherSubstitute(prof, e.target.value)}/>)}</div>);
                                            })}</div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-purple-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Relatório Geral da Unidade</h2></div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden"><textarea className="w-full bg-black/20 border border-white/10 rounded-[2.5rem] p-10 text-white font-medium text-lg outline-none focus:border-purple-600 transition-all min-h-[300px]" placeholder="Descreva aqui as atividades pedagógicas..." value={dailyLog.generalObservations} onChange={e => setDailyLog({...dailyLog, generalObservations: e.target.value})} /></div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-orange-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Alunos s/ Coleta de Frequência</h2></div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[3rem] overflow-hidden shadow-xl">
                                        <div className="max-h-[400px] overflow-y-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                                    <tr><th className="p-6">Aluno</th><th className="p-6">Turma</th><th className="p-6 text-center">Ação</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {studentsWithoutAttendance.map(s => (
                                                        <tr key={s.id} className="hover:bg-white/[0.02]">
                                                            <td className="p-6 font-bold text-white uppercase text-sm">{s.name}</td>
                                                            <td className="p-6 text-gray-500 text-xs font-bold">{s.className}</td>
                                                            <td className="p-6 text-center">
                                                                <button onClick={() => { setQuickOccData({ studentId: s.id, studentName: s.name }); setShowQuickOccModal(true); }} className="px-6 py-2.5 bg-orange-600/10 text-orange-500 border border-orange-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-orange-900/20">Justificar</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {studentsWithoutAttendance.length === 0 && <tr><td colSpan={3} className="p-10 text-center text-gray-600 italic">Todos os alunos registraram frequência.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-10 w-2 bg-yellow-600 rounded-full"></div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Resumo de Ocorrências com Alunos</h2>
                                    </div>
                                    <div className="space-y-6">
                                        {occurrences.filter(o => o.date === logDate).length > 0 ? (
                                            occurrences.filter(o => o.date === logDate).map(occ => (
                                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl hover:border-yellow-600/40 transition-all group flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                                                    <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center shrink-0 shadow-2xl ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        <AlertCircle size={40}/>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{occ.studentName}</h3>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                                                    {occ.studentClass} • <span className="text-yellow-600">{occ.category}</span>
                                                                </p>
                                                            </div>
                                                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-white/5 shadow-lg">
                                                                <UserCircle size={14} className="text-red-500"/> Professor {occ.reportedBy}
                                                            </div>
                                                        </div>
                                                        <div className="bg-black/30 p-8 rounded-[2rem] border border-white/5 text-gray-300 text-lg leading-relaxed italic relative overflow-hidden shadow-inner">
                                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-600/40"></div>
                                                            "{occ.description}"
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-white/5 p-20 text-center rounded-[3.5rem] border border-white/5 border-dashed opacity-40">
                                                <ClipboardCheck size={64} className="mx-auto text-gray-600 mb-6"/>
                                                <p className="font-black text-gray-500 uppercase tracking-[0.3em] text-sm">Nenhuma ocorrência registrada por professores nesta data.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="py-40 text-center animate-pulse"><Loader2 size={40} className="text-red-600 animate-spin mx-auto mb-4"/><p className="text-white font-black uppercase tracking-[0.3em]">Sincronizando Livro Diário...</p></div>
                        )}
                    </div>
                )}

                {/* ABA HORÁRIOS */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col lg:flex-row justify-between items-center gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Grade Horária</h1><p className="text-gray-400">Gerenciamento das aulas e professores por turno.</p></div>
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                    <button onClick={() => setScheduleShiftTab('morning')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${scheduleShiftTab === 'morning' ? 'bg-yellow-600 text-white' : 'text-gray-500'}`}><Sun size={14}/> Matutino</button>
                                    <button onClick={() => setScheduleShiftTab('afternoon')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${scheduleShiftTab === 'afternoon' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}><Moon size={14}/> Vespertino</button>
                                </div>
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                    {[1,2,3,4,5].map(d => (<button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedDay === d ? 'bg-red-600 text-white' : 'text-gray-500'}`}>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][d-1]}</button>))}
                                </div>
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

                {/* ABA ALUNOS */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1><p className="text-gray-400">Prontuários e situação acadêmica.</p></header>
                        <div className="flex flex-wrap gap-3 mb-10">{GRID_CLASSES.map(cls => <button key={cls.id} onClick={() => setSelectedStudentClass(cls.id)} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border ${selectedStudentClass === cls.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>{cls.name}</button>)}</div>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left"><thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Status</th><th className="p-10 text-center">Ações</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.filter(s => s.classId === selectedStudentClass).map(s => (<tr key={s.id} className="hover:bg-white/[0.03] transition-colors"><td className="p-10 font-bold text-white uppercase text-sm">{s.name}</td><td className="p-10"><span className="text-gray-500 font-black text-[9px] uppercase tracking-widest">{s.isAEE ? 'AEE' : 'Regular'}</span></td><td className="p-10 text-center"><button onClick={() => deleteStudent(s.id)} className="p-2 text-gray-600 hover:text-red-500 transition-all"><Trash2 size={18}/></button></td></tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA RELATÓRIOS */}
                {activeTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        {!isViewingDailyOccReport ? (
                            <>
                                <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Relatórios Específicos</h1><p className="text-gray-400">Gere documentos detalhados para análise da coordenação.</p></header>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative group">
                                        <div className="flex items-start gap-4 mb-6"><div className="h-14 w-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500"><FileBarChart size={32}/></div><div className="flex-1"><h3 className="text-xl font-bold text-white leading-tight">Frequência por Turma</h3><p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Relatório padrão com a frequência % de todos os alunos de uma turma.</p></div></div>
                                        <div className="mt-auto space-y-4 pt-10"><label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Selecione a Turma:</label><select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold text-xs outline-none" value={reportSelectedClass} onChange={e => setReportSelectedClass(e.target.value)}><option value="">-- Selecione --</option>{GRID_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Button className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/5">Gerar PDF da Turma</Button></div>
                                    </div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative group">
                                        <div className="flex items-start gap-4 mb-6"><div className="h-14 w-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500"><User size={32}/></div><div className="flex-1"><h3 className="text-xl font-bold text-white leading-tight">Relatório do Aluno</h3><p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Extrato detalhado de presenças e faltas de um único aluno.</p></div></div>
                                        <div className="mt-auto space-y-4 pt-10"><label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Selecione o Aluno:</label><select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold text-xs outline-none" value={reportSelectedStudent} onChange={e => setReportSelectedStudent(e.target.value)}><option value="">-- Selecione --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><Button className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/5">Gerar PDF Individual</Button></div>
                                    </div>
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative group">
                                        <div className="flex items-start gap-4 mb-6"><div className="h-14 w-14 bg-yellow-600/10 rounded-2xl flex items-center justify-center text-yellow-500"><Clock size={32}/></div><div className="flex-1"><h3 className="text-xl font-bold text-white leading-tight">Relatório de Atrasos</h3><p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Lista alunos que registraram presença após o horário limite.</p></div></div>
                                        <div className="mt-auto space-y-4 pt-10"><div className="bg-black/30 p-5 rounded-2xl border border-white/5 mb-2"><ul className="text-[10px] text-gray-400 space-y-2 font-bold"><li>• Manhã: Após <span className="text-red-500">07:20</span></li><li>• Tarde: Após <span className="text-red-500">13:00</span></li></ul></div><Button className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-900/20 transition-all">Gerar Relatório de Atrasos</Button></div>
                                    </div>
                                    {/* NOVO RELATÓRIO: OCORRÊNCIAS DIÁRIAS */}
                                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative group cursor-pointer hover:border-red-600/30 transition-all" onClick={() => setIsViewingDailyOccReport(true)}>
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="h-14 w-14 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-500">
                                                <ClipboardCheck size={32}/>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-white leading-tight">Ocorrências Diárias</h3>
                                                <p className="text-xs text-gray-500 mt-2 leading-relaxed opacity-60">Consolidado das ocorrências lançadas no Livro Diário por data.</p>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-10">
                                            <div className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-purple-900/20 transition-all flex items-center justify-center gap-2">
                                                <History size={16}/> Abrir Relatório Diário
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="animate-in slide-in-from-right-4">
                                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => setIsViewingDailyOccReport(false)} className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all">
                                            <ArrowLeft size={24}/>
                                        </button>
                                        <div>
                                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Relatório: Ocorrências Diárias</h1>
                                            <p className="text-gray-400 font-medium uppercase text-[10px] tracking-widest">Consulta e exportação do histórico diário</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                        <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl flex-1 md:flex-none">
                                            <Calendar className="text-red-500" size={18}/>
                                            <input 
                                                type="date" 
                                                className="bg-transparent border-none text-white font-bold text-sm outline-none cursor-pointer" 
                                                value={reportOccDate} 
                                                onChange={e => setReportOccDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="relative flex-1 md:w-80">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input 
                                                className="w-full bg-[#18181b] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" 
                                                placeholder="Filtrar por aluno ou relato..." 
                                                value={reportOccSearch} 
                                                onChange={e => setReportOccSearch(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={handlePrintDailyOccReport} className="h-16 px-8 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-green-900/20">
                                            <Download size={18} className="mr-2"/> Download PDF
                                        </Button>
                                    </div>
                                </header>

                                <div className="space-y-6">
                                    {occurrences.filter(o => o.date === reportOccDate && (
                                        o.studentName.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
                                        o.reportedBy.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
                                        o.description.toLowerCase().includes(reportOccSearch.toLowerCase())
                                    )).length > 0 ? (
                                        occurrences.filter(o => o.date === reportOccDate && (
                                            o.studentName.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
                                            o.reportedBy.toLowerCase().includes(reportOccSearch.toLowerCase()) ||
                                            o.description.toLowerCase().includes(reportOccSearch.toLowerCase())
                                        )).map(occ => (
                                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-purple-600/30 transition-all flex flex-col md:flex-row gap-8 items-start relative overflow-hidden group">
                                                <div className={`h-16 w-16 rounded-[1.4rem] flex items-center justify-center shrink-0 shadow-2xl ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    <AlertCircle size={28}/>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{occ.studentName}</h3>
                                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                                                {occ.studentClass} • <span className="text-purple-600 font-black">{occ.category}</span>
                                                            </p>
                                                        </div>
                                                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                                                            <UserCircle size={12} className="text-red-500"/> Professor {occ.reportedBy}
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-gray-400 text-sm italic relative overflow-hidden shadow-inner leading-relaxed">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600/40"></div>
                                                        "{occ.description}"
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-white/5 p-32 text-center rounded-[3.5rem] border border-white/5 border-dashed opacity-40">
                                            <ClipboardCheck size={64} className="mx-auto text-gray-600 mb-6"/>
                                            <p className="font-black text-gray-500 uppercase tracking-[0.3em] text-sm">Nenhuma ocorrência encontrada para os filtros aplicados.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA OCORRÊNCIAS ALUNOS */}
                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                         <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências dos Alunos</h1><p className="text-gray-400">Histórico disciplinar enviado pelos professores.</p></header>
                        <div className="mb-10 relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} /><input className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" placeholder="Buscar aluno ou professor..." value={occurrenceSearch} onChange={e => setOccurrenceSearch(e.target.value)} /></div>
                        <div className="grid grid-cols-1 gap-6">
                            {occurrences.filter(occ => occ.studentName.toLowerCase().includes(occurrenceSearch.toLowerCase()) || occ.reportedBy.toLowerCase().includes(occurrenceSearch.toLowerCase())).map(occ => (
                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><AlertCircle size={28}/></div>
                                            <div><h3 className="text-xl font-bold text-white uppercase">{occ.studentName}</h3><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{occ.studentClass} • {occ.date}</p></div>
                                        </div>
                                        <button onClick={() => deleteOccurrence(occ.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button>
                                    </div>
                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-4 text-gray-300 italic">"{occ.description}"</div>
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><UserCircle size={14}/> Relatado por: {occ.reportedBy}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA MATERIAIS AULA */}
                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Materiais das Salas</h1><p className="text-gray-400">Arquivos enviados pelos professores para exibição nas TVs.</p></div></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {materials.map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group"><div className="flex justify-between items-start mb-6"><div className="p-4 bg-red-600/10 text-red-500 rounded-2xl"><Folder size={32}/></div><button onClick={() => deleteClassMaterial(mat.id)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={20}/></button></div><h3 className="text-xl font-bold text-white mb-2 truncate uppercase">{mat.title}</h3><p className="text-xs text-red-500 font-black uppercase tracking-widest mb-2">{mat.className} • {mat.subject}</p><p className="text-[10px] text-gray-500 font-bold uppercase mb-8">Enviado por Prof. {mat.teacherName}</p><a href={mat.fileUrl} target="_blank" className="mt-auto flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest py-5 rounded-2xl border border-white/5 transition-all text-xs"><Download size={18}/> Baixar Arquivo</a></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA AEE PEI */}
                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planos AEE (PEI)</h1><p className="text-gray-400">Planos Educacionais Individuais enviados pelo corpo docente.</p></div></header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left"><thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Professor / Disciplina</th><th className="p-10">Período</th><th className="p-10 text-center">Ações</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {peis.map(p => (<tr key={p.id} className="hover:bg-white/[0.03] transition-colors"><td className="p-10 font-bold text-white uppercase text-sm">{p.studentName}</td><td className="p-10 font-bold text-gray-400 text-sm">{p.teacherName} <span className="block text-[10px] text-red-500 uppercase font-black">{p.subject}</span></td><td className="p-10 font-bold text-gray-500 text-xs uppercase">{p.period}</td><td className="p-10 text-center"><button className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><FileText size={20}/></button></td></tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA AGENDA ESCOLAR */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1><p className="text-gray-400">Planejamento de eventos, avaliações e feriados.</p></div><Button onClick={() => setShowEventModal(true)} className="bg-red-600 h-16 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"><Plus size={18} className="mr-2"/> Novo Evento</Button></header>
                        {renderCalendarGrid()}
                    </div>
                )}

                {/* ABA PLANEJAMENTOS */}
                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos de Aula</h1><p className="text-gray-400">Acompanhamento dos planos diários e bimestrais dos professores.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all"><div className="flex justify-between items-start mb-6"><div className="p-3 bg-red-600/10 text-red-500 rounded-xl"><BookOpenCheck size={24}/></div><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{p.type === 'daily' ? 'Diário' : 'Bimestral'}</span></div><h3 className="text-lg font-bold text-white uppercase mb-1">{p.className}</h3><p className="text-xs text-red-500 font-black uppercase tracking-widest mb-6">{p.subject}</p><div className="bg-black/20 p-4 rounded-xl text-[10px] text-gray-400 font-bold uppercase mb-8 line-clamp-3">Prof. {p.teacherName} • Tema: {p.topic || 'Não inf.'}</div><button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/5">Abrir Detalhes</button></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA CONFIGURAÇÃO */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configuração</h1><p className="text-gray-400">Controle de sistema e mensagens de broadcast.</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
                            <div><h3 className="text-lg font-bold text-white flex items-center gap-3 mb-6"><Megaphone className="text-red-500"/> Banner de Avisos (Monitor TV)</h3><div className="space-y-6"><div className="flex items-center gap-3"><input type="checkbox" id="broadcast" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} className="w-6 h-6 rounded border-white/10 bg-black text-red-600 focus:ring-red-500"/><label htmlFor="broadcast" className="text-gray-400 font-bold uppercase text-xs tracking-widest">Ativar aviso nas telas</label></div><textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all h-32" placeholder="Digite a mensagem que aparecerá nos monitores..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)}/><div className="flex flex-wrap gap-4">{(['info', 'warning', 'error', 'success'] as const).map(type => (<button key={type} onClick={() => setConfigBannerType(type)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${configBannerType === type ? 'bg-white text-black' : 'bg-white/5 text-gray-500 border-white/5'}`}>{type}</button>))}</div></div></div>
                            <Button onClick={handleSaveConfig} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </div>

            {showScheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tight">Definir Aula</h3><button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white p-2"><X size={24}/></button></div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Disciplina</label><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none focus:border-red-600" value={newSchedule.subject} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})}><option value="">Selecione a Disciplina...</option>{(GRID_CLASSES.find(c => c.id === editingCell?.classId)?.type === 'em' ? EM_SUBJECTS : EFAF_SUBJECTS).map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Professor</label><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none focus:border-red-600" value={newSchedule.professor} onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})}><option value="">Selecione o Professor...</option>{staff.filter(s => s.isTeacher).map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}</select></div>
                            <Button onClick={handleSaveSchedule} className="w-full h-14 bg-red-600 rounded-2xl font-black uppercase tracking-widest">Salvar Horário</Button>
                        </div>
                    </div>
                </div>
            )}

            {showQuickOccModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-2">Justificar Ausência</h3>
                        <p className="text-xs text-gray-500 font-bold mb-6">Aluno: {quickOccData.studentName}</p>
                        <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-900 font-medium text-sm focus:border-orange-500 outline-none h-32 mb-6" placeholder="Motivo da justificativa..." value={quickOccData.description || ''} onChange={e => setQuickOccData({...quickOccData, description: e.target.value})} />
                        <div className="flex gap-2"><Button onClick={() => setShowQuickOccModal(false)} variant="outline" className="flex-1">Cancelar</Button><Button onClick={handleSaveQuickOcc} className="flex-1 bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest">Confirmar</Button></div>
                    </div>
                </div>
            )}

            {showEventModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"><div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</h3><button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white p-2"><X size={24}/></button></div><div className="p-8 space-y-6"><input className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" placeholder="Título do Evento" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})}/><input type="date" className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}/><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value as any})}><option value="event">Evento Geral</option><option value="holiday">Feriado/Recesso</option><option value="exam">Avaliação</option><option value="meeting">Reunião</option></select><textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 h-24" placeholder="Descrição (Opcional)" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})}/><div className="flex gap-3">{selectedEvent && <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="flex-1 h-14 border border-white/5 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all">Excluir</button>}<Button onClick={handleSaveEvent} className="flex-[2] h-14 bg-red-600 rounded-2xl font-black uppercase tracking-widest">Salvar Evento</Button></div></div></div>
                </div>
            )}
        </div>
    );
};
