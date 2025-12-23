
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    getLessonPlans, 
    deleteLessonPlan,
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    getAnswerKeys,
    saveAnswerKey,
    deleteAnswerKey,
    getCorrections,
    saveCorrection,
    getStaffMembers,
    saveStudent,
    updateStudent,
    getAllPEIs,
    saveScheduleEntry,
    listenToSchedule
} from '../services/firebaseService';
import { fetchGenneraClasses, fetchGenneraStudentsByClass } from '../services/genneraService';
import { analyzeAnswerSheet } from '../services/geminiService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent,
    AnswerKey,
    StudentCorrection,
    StaffMember,
    EventTask,
    PEIDocument,
    ScheduleEntry,
    TimeSlot
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, 
    Search, 
    Calendar, 
    Users, 
    Settings, 
    Megaphone, 
    Trash2, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    CheckCircle,
    XCircle,
    ScanLine,
    ListChecks,
    History,
    UploadCloud,
    School,
    ClipboardCheck,
    CalendarDays,
    FileText,
    ArrowRight,
    Eye,
    BookOpen,
    Clock,
    Filter,
    ArrowLeft,
    ClipboardList,
    Briefcase,
    UserCheck,
    Files,
    Loader2,
    Check,
    LayoutList,
    RefreshCw,
    DatabaseZap,
    Heart,
    Edit3,
    BookOpenCheck,
    Layout,
    TableProperties
} from 'lucide-react';

const CLASSES_LABELS = ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"];

const MORNING_CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF' },
    { id: '7efaf', name: '7º ANO EFAF' },
    { id: '8efaf', name: '8º ANO EFAF' },
    { id: '9efaf', name: '9º ANO EFAF' },
];

const AFTERNOON_CLASSES = [
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
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

const DAYS = [
    { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' },
    { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' },
    { id: 5, label: 'Sexta' },
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'planning' | 'config' | 'timetable' | 'pei'>('calendar');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- DATA STATES ---
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);

    // Filter States
    const [selectedClassName, setSelectedClassName] = useState<string>('ALL');
    const [globalSearch, setGlobalSearch] = useState('');
    const [planTypeFilter, setPlanTypeFilter] = useState<'ALL' | 'daily' | 'semester'>('ALL');

    // Horários (Timetable) management state
    const [ttSelectedClass, setTtSelectedClass] = useState(MORNING_CLASSES[0]);

    // Modais
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);
    const [showPeiModal, setShowPeiModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // Agenda States
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');
    const [newEventDesc, setNewEventDesc] = useState('');

    // Config States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Calendar States
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => {
            setAttendanceLogs(logs);
        });
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        const unsubEvents = listenToEvents(setEvents);
        const unsubSchedule = listenToSchedule(setSchedule);

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
            unsubSchedule();
        };
    }, [activeTab]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, plans, allStaff, peis] = await Promise.all([
                getExams(),
                getStudents(),
                getLessonPlans(),
                getStaffMembers(),
                getAllPEIs()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
            setStaff(allStaff.filter(s => s.active));
            setAllPeis(peis.sort((a,b) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
        setIsLoading(false);
    };

    const handleAeeToggle = async (student: Student) => {
        const newState = !student.isAEE;
        try {
            await updateStudent({ ...student, isAEE: newState });
            setStudents(students.map(s => s.id === student.id ? { ...s, isAEE: newState } : s));
        } catch (e) {
            alert("Erro ao atualizar.");
        }
    };

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return alert("Preencha título e data");
        const event: SchoolEvent = {
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            type: newEventType,
            description: newEventDesc,
            tasks: selectedEvent?.tasks || []
        };
        await saveSchoolEvent(event);
        setShowEventModal(false);
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if(confirm("Deseja realmente excluir este evento?")) {
            await deleteSchoolEvent(selectedEvent.id);
            setShowEventModal(false);
        }
    };

    const openEventModal = (event?: SchoolEvent, prefillDate?: string) => {
        if (event) {
            setSelectedEvent(event);
            setNewEventTitle(event.title);
            setNewEventDate(event.date);
            setNewEventType(event.type);
            setNewEventDesc(event.description || '');
        } else {
            setSelectedEvent(null);
            setNewEventTitle('');
            setNewEventDate(prefillDate || '');
            setNewEventType('event');
            setNewEventDesc('');
        }
        setShowEventModal(true);
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSaveScheduleCell = async (dayOfWeek: number, slotId: string, subject: string, professor: string) => {
        const entryId = `${ttSelectedClass.id}-${dayOfWeek}-${slotId}`;
        const entry: ScheduleEntry = {
            id: entryId,
            classId: ttSelectedClass.id,
            className: ttSelectedClass.name,
            dayOfWeek,
            slotId,
            subject,
            professor
        };
        await saveScheduleEntry(entry);
    };

    const getScheduleValue = (dayOfWeek: number, slotId: string) => {
        return schedule.find(s => s.classId === ttSelectedClass.id && s.dayOfWeek === dayOfWeek && s.slotId === slotId);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-black/5 min-h-[120px] border border-white/5 opacity-20"></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div 
                    key={d} 
                    className={`bg-white/5 min-h-[140px] border border-white/5 p-3 relative group transition-all hover:bg-white/10`}
                >
                    <span className={`text-sm font-black ${isToday ? 'bg-red-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-red-900/40' : 'text-gray-500'}`}>
                        {d}
                    </span>
                    <button 
                        onClick={() => openEventModal(undefined, dateStr)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-600 text-white rounded-lg transition-all"
                    >
                        <Plus size={14}/>
                    </button>
                    <div className="mt-3 space-y-1.5">
                        {dayEvents.map(ev => (
                            <div 
                                key={ev.id}
                                onClick={() => openEventModal(ev)}
                                className={`text-[10px] font-black uppercase p-2 rounded-lg cursor-pointer truncate shadow-sm border-l-4 ${
                                    ev.type === 'holiday' ? 'bg-red-900/40 text-red-100 border-red-500' :
                                    ev.type === 'exam' ? 'bg-purple-900/40 text-purple-100 border-purple-500' :
                                    ev.type === 'meeting' ? 'bg-blue-900/40 text-blue-100 border-blue-500' :
                                    'bg-green-900/40 text-green-100 border-green-500'
                                }`}
                            >
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-[#18181b] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="grid grid-cols-7 bg-black/40 border-b border-white/5 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div>
                </div>
                <div className="grid grid-cols-7">
                    {days}
                </div>
            </div>
        );
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    const presentMap = React.useMemo(() => {
        const map = new Map<string, AttendanceLog>();
        attendanceLogs.forEach(log => {
            if (!map.has(log.studentId)) {
                map.set(log.studentId, log);
            }
        });
        return map;
    }, [attendanceLogs]);

    const getStudentCountByClass = (className: string) => {
        return students.filter(s => s.className === className).length;
    };

    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClassName === 'ALL' || s.className === selectedClassName;
        const matchesSearch = s.name.toLowerCase().includes(globalSearch.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const filteredPeis = allPeis.filter(p => 
        p.studentName.toLowerCase().includes(globalSearch.toLowerCase()) ||
        p.teacherName.toLowerCase().includes(globalSearch.toLowerCase())
    );

    const filteredPlans = lessonPlans.filter(p => {
        const matchesClass = selectedClassName === 'ALL' || p.className === selectedClassName;
        const matchesSearch = p.teacherName.toLowerCase().includes(globalSearch.toLowerCase()) || 
                             (p.topic?.toLowerCase().includes(globalSearch.toLowerCase()));
        const matchesType = planTypeFilter === 'ALL' || p.type === planTypeFilter;
        return matchesClass && matchesSearch && matchesType;
    });

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel Escolar</p>
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="timetable" label="Grade de Horários" icon={TableProperties} />
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência Hoje" icon={ClipboardCheck} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <SidebarItem id="pei" label="Relatórios PEI" icon={Heart} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-transparent">
                
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                                    <CalendarDays className="text-red-500" /> Agenda Institucional
                                </h1>
                                <p className="text-gray-400">Controle de eventos, feriados e reuniões escolares.</p>
                            </div>
                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/10">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><ChevronLeft size={24}/></button>
                                <span className="font-black text-white uppercase text-sm min-w-[180px] text-center tracking-widest">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><ChevronRight size={24}/></button>
                            </div>
                        </header>
                        
                        {renderCalendar()}

                        {/* MODAL DE EVENTO */}
                        {showEventModal && (
                            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                                <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                                            {selectedEvent ? 'Editar Evento' : 'Novo Registro'}
                                        </h3>
                                        <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Título do Evento</label>
                                            <input className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Ex: Reunião de Pais" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Data</label>
                                                <input type="date" className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Categoria</label>
                                                <select className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                                    <option value="event">Evento</option>
                                                    <option value="holiday">Feriado</option>
                                                    <option value="exam">Avaliação</option>
                                                    <option value="meeting">Reunião</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Descrição</label>
                                            <textarea rows={3} className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-medium outline-none focus:border-red-600 transition-colors" value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} />
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            {selectedEvent && (
                                                <button onClick={handleDeleteEvent} className="flex-1 py-4 text-red-600 font-black uppercase text-xs tracking-widest hover:bg-red-50 rounded-2xl transition-colors">Excluir</button>
                                            )}
                                            <Button onClick={handleSaveEvent} className="flex-[2] py-4 bg-red-600 text-white font-black rounded-2xl">Salvar na Agenda</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                                    <TableProperties className="text-red-500" /> Grade de Horários (TV)
                                </h1>
                                <p className="text-gray-400">Configure os professores e disciplinas para cada turno.</p>
                            </div>
                            <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1 shrink-0 overflow-x-auto max-w-full">
                                {[...MORNING_CLASSES, ...AFTERNOON_CLASSES].map(cls => (
                                    <button 
                                        key={cls.id} 
                                        onClick={() => setTtSelectedClass(cls)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${ttSelectedClass.id === cls.id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                             <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-black/40 border-b border-white/10">
                                            <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-white/5">Horário</th>
                                            {DAYS.map(day => (
                                                <th key={day.id} className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-white/5">{day.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(ttSelectedClass.id.includes('efaf') ? MORNING_SLOTS : AFTERNOON_SLOTS).map(slot => (
                                            <tr key={slot.id} className="hover:bg-white/[0.02] group">
                                                <td className="p-4 border-r border-white/5 bg-black/20">
                                                    <p className="text-xs font-black text-red-500">{slot.label}</p>
                                                    <p className="text-[10px] font-bold text-gray-500">{slot.start} - {slot.end}</p>
                                                </td>
                                                {DAYS.map(day => {
                                                    const val = getScheduleValue(day.id, slot.id);
                                                    return (
                                                        <td key={day.id} className="p-2 border-r border-white/5">
                                                            <div className="space-y-1.5">
                                                                <input 
                                                                    placeholder="Disciplina" 
                                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-black uppercase text-white focus:border-red-600 outline-none transition-colors"
                                                                    defaultValue={val?.subject || ''}
                                                                    onBlur={(e) => handleSaveScheduleCell(day.id, slot.id, e.target.value.toUpperCase(), val?.professor || '')}
                                                                />
                                                                <input 
                                                                    placeholder="Professor" 
                                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-bold text-gray-400 focus:border-red-600 outline-none transition-colors"
                                                                    defaultValue={val?.professor || ''}
                                                                    onBlur={(e) => handleSaveScheduleCell(day.id, slot.id, val?.subject || '', e.target.value)}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Gestão de Turmas</h1>
                                <p className="text-gray-400">Administração de alunos e controle de inclusão.</p>
                            </div>
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none" placeholder="Buscar aluno..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/>
                            </div>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                            <button onClick={() => setSelectedClassName('ALL')} className={`p-4 rounded-2xl border transition-all text-center ${selectedClassName === 'ALL' ? 'bg-red-600 border-white text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                <p className="text-[10px] font-black uppercase mb-1">Todas</p>
                                <h3 className="font-bold text-lg">{students.length}</h3>
                                <p className="text-[10px] opacity-60">Alunos</p>
                            </button>
                            {CLASSES_LABELS.map(cls => {
                                const count = getStudentCountByClass(cls);
                                return (
                                    <button key={cls} onClick={() => setSelectedClassName(cls)} className={`p-4 rounded-2xl border transition-all text-center ${selectedClassName === cls ? 'bg-red-600 border-white text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                        <p className="text-[10px] font-black uppercase mb-1">{cls.split(' ')[0]}</p>
                                        <h3 className="font-bold text-lg">{count}</h3>
                                        <p className="text-[10px] opacity-60">Alunos</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6 text-center">Frequência Hoje</th>
                                        <th className="p-6 text-center">Inclusão (AEE)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map(student => {
                                        const log = presentMap.get(student.id);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                                                            <img src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-full h-full object-cover"/>
                                                        </div>
                                                        <p className="font-bold text-gray-800">{student.name}</p>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase">
                                                        {student.className}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-center">
                                                    {log ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">
                                                            <CheckCircle size={12}/> {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-400 rounded-full text-[10px] font-black uppercase opacity-60">
                                                            <XCircle size={12}/> Ausente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button onClick={() => handleAeeToggle(student)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 mx-auto ${student.isAEE ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-400 hover:bg-red-600 hover:text-white'}`}>
                                                        <Heart size={14} fill={student.isAEE ? "currentColor" : "none"}/>
                                                        {student.isAEE ? 'Atendido' : 'Marcar AEE'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Frequência em Tempo Real</h1>
                            <p className="text-gray-400">Registros automáticos capturados pelos terminais faciais hoje.</p>
                        </header>
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Horário</th>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-6 font-mono font-bold text-red-600">
                                                {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                                                    <img src={log.studentPhotoUrl || `https://ui-avatars.com/api/?name=${log.studentName}`} className="w-full h-full object-cover"/>
                                                </div>
                                                <span className="font-bold text-gray-800">{log.studentName}</span>
                                            </td>
                                            <td className="p-6"><span className="text-xs font-bold text-gray-500">{log.className}</span></td>
                                            <td className="p-6 text-center">
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-tighter">Entrada Registrada</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3"><BookOpen className="text-red-500"/> Planejamentos Pedagógicos</h1>
                                <p className="text-gray-400">Monitoramento e revisão dos planos diários e bimestrais.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                    <button onClick={() => setPlanTypeFilter('ALL')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planTypeFilter === 'ALL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Todos</button>
                                    <button onClick={() => setPlanTypeFilter('daily')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planTypeFilter === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Diários</button>
                                    <button onClick={() => setPlanTypeFilter('semester')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planTypeFilter === 'semester' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Bimestrais</button>
                                </div>
                                <select value={selectedClassName} onChange={e => setSelectedClassName(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none">
                                    <option value="ALL">Todas as Turmas</option>
                                    {CLASSES_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPlans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border-2 border-white/5 rounded-[2.5rem] p-6 group hover:border-red-600/50 transition-all shadow-xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${plan.type === 'daily' ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'}`}>
                                            {plan.type === 'daily' ? <Clock size={24}/> : <Calendar size={24}/>}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${plan.type === 'daily' ? 'bg-blue-900/40 text-blue-300' : 'bg-purple-900/40 text-purple-300'}`}>
                                            {plan.type === 'daily' ? 'Plano Diário' : 'Bimestral'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-white text-lg mb-1 leading-tight">{plan.type === 'daily' ? plan.topic : plan.period}</h3>
                                    <p className="text-xs font-bold text-red-500 uppercase mb-4">{plan.teacherName}</p>
                                    
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                                            <School size={12}/> {plan.className}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                                            <CalendarDays size={12}/> {plan.date || new Date(plan.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }}
                                        className="w-full py-3 bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest border border-white/5"
                                    >
                                        <Eye size={14}/> Revisar Plano
                                    </button>
                                </div>
                            ))}
                            {filteredPlans.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
                                    <BookOpen size={48} className="mx-auto text-gray-600 mb-4 opacity-20"/>
                                    <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">Nenhum planejamento enviado recentemente</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3"><Heart className="text-red-500"/> Relatórios PEI</h1>
                                <p className="text-gray-400">Acompanhamento dos Planos Educacionais Individualizados.</p>
                            </div>
                        </header>
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Disciplina / Professor</th>
                                        <th className="p-6">Última Atualização</th>
                                        <th className="p-6 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPeis.map(pei => (
                                        <tr key={pei.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-6"><p className="font-bold text-gray-800">{pei.studentName}</p></td>
                                            <td className="p-6">
                                                <p className="font-bold text-gray-700 text-sm">{pei.subject}</p>
                                                <p className="text-[10px] font-black text-red-600 uppercase">Prof. {pei.teacherName}</p>
                                            </td>
                                            <td className="p-6 text-xs text-gray-500">{new Date(pei.updatedAt).toLocaleDateString()}</td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => { setSelectedPei(pei); setShowPeiModal(true); }} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all">Ver Detalhes</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Central de Impressão</h1>
                            <p className="text-gray-400">Gerenciamento de cópias e apostilas.</p>
                        </header>
                        <div className="space-y-4">
                            {exams.map(e => (
                                <div key={e.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{e.title}</h3>
                                        <p className="text-sm text-gray-500">Prof. {e.teacherName} • {e.gradeLevel} • <b>{e.quantity} cópias</b></p>
                                        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{e.status === ExamStatus.PENDING ? 'Pendente' : 'Concluído'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={e.fileUrl} target="_blank" rel="noreferrer" className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileText size={16}/> PDF</a>
                                        {e.status === ExamStatus.PENDING && <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.COMPLETED)}>Concluir</Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Configurações do Sistema</h1>
                            <p className="text-gray-400">Banner de avisos e exibição em TV.</p>
                        </header>
                        <Card className="max-w-2xl">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Mensagem do Banner</label>
                                    <textarea 
                                        className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700"
                                        value={configBannerMsg}
                                        onChange={e => setConfigBannerMsg(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} className="w-5 h-5" />
                                        <span className="font-bold">Banner Ativo</span>
                                    </label>
                                </div>
                                <Button onClick={async () => {
                                    await updateSystemConfig({ bannerMessage: configBannerMsg, bannerType: configBannerType, isBannerActive: configIsBannerActive });
                                    alert("Salvo!");
                                }} className="w-full">Salvar Configurações</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* PEI DETAIL MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3"><Heart size={24} className="text-red-600"/> Detalhes do PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • {selectedPei.subject} • {selectedPei.period || '1º Bimestre'}</p>
                            </div>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Competências Essenciais</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.essentialCompetencies}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Conteúdos Adaptados</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.selectedContents}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Recursos Didáticos</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.didacticResources}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Processo de Avaliação</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.evaluation}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiModal(false)} className="px-10 bg-gray-800 font-black uppercase">Fechar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* LESSON PLAN DETAIL MODAL */}
            {showPlanModal && selectedPlan && (
                <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-6">
                                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center ${selectedPlan.type === 'daily' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                                    {selectedPlan.type === 'daily' ? <Clock size={32}/> : <Calendar size={32}/>}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Revisão de Planejamento</h3>
                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{selectedPlan.teacherName} • {selectedPlan.className} • {selectedPlan.subject}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={40}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            {selectedPlan.type === 'daily' ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">Tema da Aula</h4>
                                            <p className="text-gray-800 font-bold text-lg">{selectedPlan.topic}</p>
                                        </div>
                                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">Data Prevista</h4>
                                            <p className="text-gray-800 font-bold text-lg">{selectedPlan.date}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Conteúdo Teorico</h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedPlan.content}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Metodologia</h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedPlan.methodology}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Recursos</h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedPlan.resources}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Avaliação</h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedPlan.evaluation}</p>
                                        </div>
                                    </div>

                                    <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                                        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Tarefa de Casa</h4>
                                        <p className="text-red-900 font-medium text-sm italic">{selectedPlan.homework || "Não informada"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                                        <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Bimestre de Referência</h4>
                                        <p className="text-purple-900 font-black text-2xl">{selectedPlan.period}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <section>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Justificativa</h4>
                                            <p className="text-gray-700 text-sm leading-relaxed">{selectedPlan.justification}</p>
                                        </section>
                                        <section>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b pb-1">Conteúdo Programático</h4>
                                            <p className="text-gray-700 text-sm leading-relaxed">{selectedPlan.semesterContents}</p>
                                        </section>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Habilidades Cognitivas</h4>
                                            <p className="text-gray-700 text-sm">{selectedPlan.cognitiveSkills}</p>
                                        </div>
                                        <div className="bg-pink-50/50 p-6 rounded-3xl border border-pink-100">
                                            <h4 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-2">Socioemocionais</h4>
                                            <p className="text-gray-700 text-sm">{selectedPlan.socialEmotionalSkills}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-200">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><LayoutList size={18}/> Quadro de Atividades Sugeridas</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div><span className="text-[9px] font-black text-red-600 uppercase block mb-1">Prévias</span><p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100">{selectedPlan.activitiesPre}</p></div>
                                            <div><span className="text-[9px] font-black text-red-600 uppercase block mb-1">Autodidáticas</span><p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100">{selectedPlan.activitiesAuto}</p></div>
                                            <div><span className="text-[9px] font-black text-red-600 uppercase block mb-1">Cooperativas</span><p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100">{selectedPlan.activitiesCoop}</p></div>
                                            <div><span className="text-[9px] font-black text-red-600 uppercase block mb-1">Complementares</span><p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100">{selectedPlan.activitiesCompl}</p></div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <section>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Recursos Didáticos</h4>
                                            <p className="text-gray-700 text-sm">{selectedPlan.didacticResources}</p>
                                        </section>
                                        <section>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Estratégias Avaliação</h4>
                                            <p className="text-gray-700 text-sm">{selectedPlan.evaluationStrategies}</p>
                                        </section>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPlanModal(false)} className="px-12 h-14 bg-gray-800 hover:bg-black font-black uppercase tracking-widest">Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl p-8 ${className}`}>
    {children}
  </div>
);
