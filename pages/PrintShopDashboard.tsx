
import React, { useState, useEffect } from 'react';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents,
    listenToAttendanceLogs, 
    getLessonPlans, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera,
    getAllPEIs,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent,
    PEIDocument,
    ScheduleEntry,
    TimeSlot,
    StaffMember
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
    BookOpenCheck, 
    Plus, 
    Save,
    X,
    CheckCircle,
    Heart,
    RefreshCw,
    FileDown,
    RotateCcw,
    ChevronRight as ChevronIcon,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    UserCircle,
    BookOpen,
    Users2,
    Eye
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

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

const GRID_CLASSES = [
    { id: '6efaf', name: '6º EFAF', type: 'efaf' },
    { id: '7efaf', name: '7º EFAF', type: 'efaf' },
    { id: '8efaf', name: '8º EFAF', type: 'efaf' },
    { id: '9efaf', name: '9º EFAF', type: 'efaf' },
    { id: '1em', name: '1ª E.M.', type: 'em' },
    { id: '2em', name: '2ª E.M.', type: 'em' },
    { id: '3em', name: '3ª E.M.', type: 'em' },
];

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'plans' | 'schedule' | 'config'>('exams');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDay, setSelectedDay] = useState(1); 
    const [selectedStudentClass, setSelectedStudentClass] = useState<string>('6efaf');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');

    // Schedule Modal
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState<Partial<ScheduleEntry>>({
        subject: '', professor: ''
    });

    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubStaff = listenToStaffMembers(setStaff);
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubEvents = listenToEvents(setEvents);
        
        const fetchData = async () => {
            const [peiData, plansData] = await Promise.all([
                getAllPEIs(),
                getLessonPlans()
            ]);
            setPeis(peiData);
            setPlans(plansData);
        };
        fetchData();

        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        return () => {
            unsubExams(); unsubStudents(); unsubAttendance(); unsubConfig(); unsubSchedule(); unsubStaff(); unsubEvents();
        };
    }, []);

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };

    const handleSaveSchedule = async () => {
        if (!editingCell || !newSchedule.subject) return alert("Selecione a disciplina");
        const classInfo = GRID_CLASSES.find(c => c.id === editingCell.classId);
        await saveScheduleEntry({
            id: '',
            classId: editingCell.classId,
            className: classInfo?.name || editingCell.classId,
            dayOfWeek: selectedDay,
            slotId: editingCell.slotId,
            subject: newSchedule.subject!,
            professor: newSchedule.professor || 'Não informado'
        });
        setShowScheduleModal(false);
        setEditingCell(null);
        setNewSchedule({ subject: '', professor: '' });
    };

    const handleDeleteSchedule = async (id: string) => {
        if (confirm("Excluir este horário?")) await deleteScheduleEntry(id);
    };

    const handleQuickAdd = (classId: string, slotId: string) => {
        setEditingCell({ classId, slotId });
        const existing = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        setNewSchedule(existing ? { subject: existing.subject, professor: existing.professor } : { subject: '', professor: '' });
        setShowScheduleModal(true);
    };

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return alert("Preencha título e data");
        await saveSchoolEvent({
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            type: newEventType,
            tasks: selectedEvent?.tasks || []
        });
        setShowEventModal(false);
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
            {activeTab === id && <ChevronIcon size={14} className="animate-pulse" />}
        </button>
    );

    const ExamCard = ({ exam }: { exam: ExamRequest; key?: React.Key }) => (
        <div className={`bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 group hover:border-red-600/40 transition-all shadow-2xl relative overflow-hidden ${exam.status === ExamStatus.COMPLETED ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${exam.status === ExamStatus.COMPLETED ? 'bg-green-600' : 'bg-red-600'}`}></div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center border ${
                        exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                        {exam.status === ExamStatus.COMPLETED ? <CheckCircle size={40} /> : <Printer size={40} />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel}</p>
                        <p className="text-red-500 font-black text-xs uppercase mt-2">{exam.quantity} CÓPIAS</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {exam.status !== ExamStatus.COMPLETED ? (
                        <Button onClick={() => handleUpdateExamStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'}`}>
                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                        </Button>
                    ) : (
                        <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.PENDING)} className="h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 border border-white/5">
                            <RotateCcw size={16} /> Reabrir
                        </button>
                    )}
                </div>
            </div>
            {exam.fileUrls && exam.fileUrls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                    <span className="text-[10px] font-bold text-gray-300 uppercase truncate">{exam.fileNames?.[idx] || 'Arquivo'}</span>
                    <FileDown size={16} className="text-blue-500" />
                </a>
            ))}
        </div>
    );

    const GridCell = ({ classId, slotId }: { classId: string, slotId: string }) => {
        const entry = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        if (!entry) return <button onClick={() => handleQuickAdd(classId, slotId)} className="w-full h-full min-h-[90px] border border-dashed border-white/5 rounded-2xl flex items-center justify-center group hover:bg-white/5 hover:border-white/20 transition-all p-4"><span className="text-[10px] font-black text-gray-700 uppercase tracking-widest group-hover:text-gray-400 transition-colors">Livre</span></button>;
        return (
            <div onClick={() => handleQuickAdd(classId, slotId)} className="w-full h-full min-h-[90px] bg-red-600/10 border border-red-600/20 rounded-2xl p-4 relative group hover:bg-red-600/20 hover:border-red-600/40 transition-all cursor-pointer">
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(entry.id); }} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"><X size={12}/></button>
                <p className="text-[11px] font-black text-white uppercase line-clamp-2 leading-tight mb-1">{entry.subject}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase truncate">{entry.professor}</p>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
            </div>
        );
    };

    const availableTeachers = staff.filter(s => s.isTeacher && s.active).sort((a,b) => a.name.localeCompare(b.name));
    const filteredStudentsByClass = students.filter(s => s.classId === selectedStudentClass || s.className === GRID_CLASSES.find(c => c.id === selectedStudentClass)?.name);
    const presentInClass = filteredStudentsByClass.filter(s => attendanceLogs.some(l => l.studentId === s.id)).length;

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const days = [];
        for (let i = 0; i < startingDay; i++) days.push(<div key={`empty-${i}`} className="bg-white/5 border border-white/5 min-h-[100px] opacity-20"></div>);
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={day} className="bg-white/5 border border-white/5 min-h-[120px] p-4 relative group hover:bg-white/10 transition-all">
                    <span className="text-xs font-black text-gray-500">{day}</span>
                    <button onClick={() => { setNewEventDate(dateStr); setShowEventModal(true); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all"><Plus size={14}/></button>
                    <div className="mt-2 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} onClick={() => { setSelectedEvent(ev); setNewEventTitle(ev.title); setNewEventDate(ev.date); setNewEventType(ev.type); setShowEventModal(true); }} className={`text-[9px] font-black uppercase p-1.5 rounded-lg border-l-4 cursor-pointer truncate ${ev.type === 'holiday' ? 'bg-red-900/20 text-red-500 border-red-500' : ev.type === 'exam' ? 'bg-purple-900/20 text-purple-500 border-purple-500' : 'bg-blue-900/20 text-blue-500 border-blue-500'}`}>
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 flex items-center justify-between bg-black/40 border-b border-white/5">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{monthName}</h2>
                    <div className="flex gap-4">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white"><ChevronLeft size={24}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white"><ChevronRight size={24}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-4 bg-black/20 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">{days}</div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="schedule" label="Quadro de Horários" icon={Clock} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configuração TV" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                         <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie o fluxo de trabalho da gráfica.</p></div>
                        </header>
                        <div className="grid grid-cols-1 gap-8">{exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => <ExamCard key={exam.id} exam={exam} />)}</div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-[1600px] mx-auto">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Matriz de Horários</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Clique nas células para editar ou adicionar aulas.</p></div>
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((day, idx) => (
                                    <button key={day} onClick={() => setSelectedDay(idx + 1)} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedDay === idx + 1 ? 'bg-red-600 text-white' : 'text-gray-500'}`}>{day}</button>
                                ))}
                            </div>
                        </header>
                        <div className="space-y-12">
                            {/* TABELAS DE HORÁRIO MATUTINO/VESPERTINO IGUAIS ÀS ANTERIORES */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-4"><Clock size={16}/> TURNO MATUTINO (EFAF)</h3>
                                <div className="overflow-x-auto custom-scrollbar pb-4">
                                    <table className="w-full border-separate border-spacing-2">
                                        <thead><tr><th className="min-w-[100px] p-4 text-[10px] font-black text-gray-600 uppercase">Hora</th>{GRID_CLASSES.filter(c => c.type === 'efaf').map(c => <th key={c.id} className="min-w-[170px] p-4 bg-white/5 rounded-2xl text-[10px] font-black text-white uppercase border border-white/5">{c.name}</th>)}</tr></thead>
                                        <tbody>{MORNING_SLOTS.map(slot => (<tr key={slot.id}><td className="p-2 text-center"><span className="text-[10px] font-black text-red-600 font-mono">{slot.start}</span></td>{GRID_CLASSES.filter(c => c.type === 'efaf').map(c => (<td key={c.id + slot.id} className="p-0"><GridCell classId={c.id} slotId={slot.id} /></td>))}</tr>))}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Selecione a turma para visualizar a frequência.</p></div></header>
                        <div className="flex flex-wrap gap-3 mb-10">{GRID_CLASSES.map(cls => <button key={cls.id} onClick={() => setSelectedStudentClass(cls.id)} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border ${selectedStudentClass === cls.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>{cls.name}</button>)}</div>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Status</th><th className="p-10 text-center">Entrada</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStudentsByClass.map(s => {
                                        const att = attendanceLogs.find(l => l.studentId === s.id);
                                        return (<tr key={s.id} className="hover:bg-white/[0.03] transition-colors"><td className="p-10"><div className="flex items-center gap-6"><p className="font-bold text-white uppercase text-sm">{s.name}</p></div></td><td className="p-10">{att ? <span className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full font-black text-[9px] uppercase">Presente</span> : <span className="px-4 py-1.5 bg-gray-800 text-gray-500 rounded-full font-black text-[9px] uppercase">Ausente</span>}</td><td className="p-10 text-center">{att ? <span className="text-xs font-mono font-bold text-gray-400">{new Date(att.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span> : <span className="text-gray-800">—</span>}</td></tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Documentos AEE (PEI)</h1><p className="text-gray-400 text-lg mt-1 italic">Consulte o histórico de planejamentos especializados.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {peis.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div><h3 className="text-xl font-bold text-white">{p.studentName}</h3><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">{p.subject} • {p.period}</p></div>
                                        <div className="h-12 w-12 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center"><Heart size={24}/></div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3 leading-relaxed">{p.selectedContents}</p>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center"><span className="text-[9px] font-bold text-gray-600 uppercase">Prof. {p.teacherName}</span><button className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Visualizar PEI Integral</button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-end"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1></header>
                        {renderCalendar()}
                        {showEventModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md animate-in fade-in">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-white uppercase tracking-tight">Evento na Data</h3><button onClick={() => setShowEventModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button></div>
                                    <div className="space-y-6">
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" placeholder="Título" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                                        <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                            <option value="event">Evento</option><option value="holiday">Feriado</option><option value="exam">Avaliação</option><option value="meeting">Reunião</option>
                                        </select>
                                        <Button onClick={handleSaveEvent} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-600">Salvar Evento</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos Pedagógicos</h1><p className="text-gray-400 text-lg mt-1 italic">Visualize as aulas planejadas pelo corpo docente.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(pl => (
                                <div key={pl.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-blue-600/30 transition-all flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-6"><div><span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${pl.type === 'semester' ? 'bg-blue-600/10 text-blue-500' : 'bg-gray-800 text-gray-400'}`}>{pl.type === 'semester' ? 'Semestral' : 'Diário'}</span><h3 className="text-lg font-bold text-white mt-3 leading-tight">{pl.subject}</h3><p className="text-[10px] font-black text-gray-500 uppercase mt-1">{pl.className}</p></div><div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500"><BookOpenCheck size={20}/></div></div>
                                    <p className="text-xs text-gray-400 mb-6 flex-1 line-clamp-4 leading-relaxed">{pl.topic || pl.justification || 'Sem descrição.'}</p>
                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-2"><UserCircle size={14} className="text-gray-600"/><span className="text-[9px] font-bold text-gray-500 uppercase">{pl.teacherName}</span></div><button className="p-2 text-white hover:bg-white/10 rounded-lg"><Eye size={18}/></button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações TV</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3"><Megaphone className="text-red-600" /> Banner de Avisos</h3>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} />
                            </div>
                            <Button onClick={async () => {
                                await updateSystemConfig({ bannerMessage: bannerMsg, bannerType, isBannerActive });
                                alert("Salvo!");
                            }} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] bg-red-600">Salvar Alterações</Button>
                        </div>
                    </div>
                )}

                {/* MODAL DE EDIÇÃO RÁPIDA DE HORÁRIO */}
                {showScheduleModal && editingCell && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                <div><h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><BookOpen className="text-red-600"/> Registrar Aula</h3><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{GRID_CLASSES.find(c => c.id === editingCell.classId)?.name} • {['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][selectedDay]}</p></div>
                                <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={24}/></button>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selecione a Disciplina</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none" value={newSchedule.subject} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value, professor: ''})}>
                                        <option value="">-- Escolher Matéria --</option>
                                        {(GRID_CLASSES.find(c => c.id === editingCell.classId)?.type === 'efaf' ? EFAF_SUBJECTS : EM_SUBJECTS).sort().map(sub => (<option key={sub} value={sub}>{sub}</option>))}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Professor(a)</label>
                                    <div className="relative"><Users2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={20}/>
                                        <select className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none" value={newSchedule.professor} onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})} disabled={!newSchedule.subject}>
                                            <option value="">{newSchedule.subject ? '-- Selecione o Professor --' : 'Selecione a disciplina primeiro'}</option>
                                            {availableTeachers.map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
                                            {newSchedule.subject && <option value="Outro">Outro (Não listado)</option>}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4"><button onClick={() => setShowScheduleModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button><Button onClick={handleSaveSchedule} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-green-600 shadow-xl shadow-green-900/20">Salvar Registro</Button></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
