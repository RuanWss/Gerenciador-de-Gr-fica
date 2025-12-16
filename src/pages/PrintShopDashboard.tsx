import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    getLessonPlans, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent 
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent 
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
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    CheckCircle,
    XCircle
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Exams
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examFilter, setExamFilter] = useState<string>('ALL');
    const [examSearch, setExamSearch] = useState('');

    // Students & Attendance
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');

    // Calendar
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');
    const [newEventDesc, setNewEventDesc] = useState('');

    // Plans
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [planFilterClass, setPlanFilterClass] = useState<string>('');
    const [planTypeFilter, setPlanTypeFilter] = useState<string>('ALL');

    // Config
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);
    const [configTvStart, setConfigTvStart] = useState('');
    const [configTvEnd, setConfigTvEnd] = useState('');

    // --- EFFECTS ---

    useEffect(() => {
        const fetchInitial = async () => {
            setIsLoading(true);
            const allExams = await getExams();
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));

            const allStudents = await getStudents();
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));

            const allPlans = await getLessonPlans();
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));

            setIsLoading(false);
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        // Realtime listeners
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => setAttendanceLogs(logs));
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
            setConfigTvStart(cfg.tvStart || '');
            setConfigTvEnd(cfg.tvEnd || '');
        });
        const unsubEvents = listenToEvents((evs) => setEvents(evs));

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
        };
    }, []);

    // --- HANDLERS ---

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
            tvStart: configTvStart,
            tvEnd: configTvEnd
        };
        await updateSystemConfig(newConfig);
        alert("Configurações salvas!");
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
        if(confirm("Excluir evento?")) {
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

    // --- HELPERS ---
    const getStudentCountByClass = (classId: string) => {
        return students.filter(s => s.classId === classId).length;
    };

    const navigateToClassStudents = (classId: string) => {
        setStudentFilterClass(classId);
        setStudentSearch('');
        setActiveTab('students');
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    const filteredExams = exams.filter(e => {
        const matchStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchStatus && matchSearch;
    });

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                              s.className.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesClass = studentFilterClass === 'ALL' || s.classId === studentFilterClass;
        return matchesSearch && matchesClass;
    });

    const presentStudentIds = new Set(attendanceLogs.map(log => log.studentId));
    const presentCountFiltered = filteredStudents.filter(s => presentStudentIds.has(s.id)).length;
    
    const filteredPlans = plans.filter(p => {
        const matchClass = planFilterClass ? p.className === planFilterClass : true;
        const matchType = planTypeFilter === 'ALL' || p.type === planTypeFilter;
        return matchClass && matchType;
    });

    // --- CALENDAR RENDER ---
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay(); // 0 = Sunday
        const totalDays = lastDay.getDate();
        
        const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        const days = [];
        // Empty cells for previous month
        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-[#202022] border border-gray-800/50 min-h-[100px]"></div>);
        }
        
        // Days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div key={day} className={`bg-[#202022] border border-gray-800/50 min-h-[120px] p-2 relative hover:bg-[#2a2a2c] transition-colors group`}>
                    <span className={`text-sm font-bold ${isToday ? 'bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-400'}`}>
                        {day}
                    </span>
                    <button 
                        onClick={() => {
                            openEventModal(undefined, dateStr);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-400 transition-opacity"
                    >
                        <Plus size={14}/>
                    </button>
                    <div className="mt-2 space-y-1">
                        {dayEvents.map(ev => (
                            <div 
                                key={ev.id} 
                                onClick={(e) => { e.stopPropagation(); openEventModal(ev); }}
                                className={`text-xs p-1.5 rounded cursor-pointer truncate font-medium border-l-2 ${
                                    ev.type === 'holiday' ? 'bg-red-900/20 text-red-300 border-red-500' :
                                    ev.type === 'exam' ? 'bg-purple-900/20 text-purple-300 border-purple-500' :
                                    ev.type === 'meeting' ? 'bg-blue-900/20 text-blue-300 border-blue-500' :
                                    'bg-green-900/20 text-green-300 border-green-500'
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
            <div className="bg-[#18181b] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-[#202022]">
                     <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white capitalize">{capitalizedMonth}</h2>
                        <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronLeft size={20} /></button>
                            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronRight size={20} /></button>
                        </div>
                     </div>
                     <Button onClick={() => openEventModal()}>
                        <Plus size={16} className="mr-2"/> Novo Evento
                     </Button>
                </div>
                <div className="grid grid-cols-7 bg-[#202022] border-b border-gray-800 text-center py-2 text-xs font-bold text-gray-500 uppercase">
                    <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div>
                </div>
                <div className="grid grid-cols-7">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                 <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel da Escola</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                 </div>
                 
                 <div className="mt-auto pt-6 border-t border-white/10">
                     <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                         <p className="text-xs font-bold text-blue-300 mb-2">Resumo do Dia</p>
                         <div className="space-y-2">
                             <div className="flex justify-between text-xs text-gray-300">
                                 <span>Cópias Pendentes:</span>
                                 <span className="font-bold text-white">{exams.filter(e => e.status === ExamStatus.PENDING).length}</span>
                             </div>
                             <div className="flex justify-between text-xs text-gray-300">
                                 <span>Alunos Presentes:</span>
                                 <span className="font-bold text-white">{presentStudentIds.size}</span>
                             </div>
                         </div>
                     </div>
                 </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 bg-transparent">
                {/* EXAMS TAB */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Central de Cópias</h1>
                                <p className="text-gray-400">Gerencie as solicitações de impressão dos professores.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 outline-none w-64"
                                        value={examSearch}
                                        onChange={e => setExamSearch(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-red-500"
                                    value={examFilter}
                                    onChange={e => setExamFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-gray-900">Todos</option>
                                    <option value={ExamStatus.PENDING} className="bg-gray-900">Pendentes</option>
                                    <option value={ExamStatus.IN_PROGRESS} className="bg-gray-900">Imprimindo</option>
                                    <option value={ExamStatus.COMPLETED} className="bg-gray-900">Concluídos</option>
                                </select>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:border-gray-700 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                exam.status === ExamStatus.PENDING ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/20' :
                                                exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-900/20 text-blue-500 border-blue-500/20' :
                                                'bg-green-900/20 text-green-500 border-green-500/20'
                                            }`}>
                                                {exam.status === ExamStatus.PENDING ? 'Pendente' :
                                                 exam.status === ExamStatus.IN_PROGRESS ? 'Em Andamento' : 'Concluído'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {new Date(exam.createdAt).toLocaleDateString()}
                                            </span>
                                            {exam.materialType === 'handout' && (
                                                <span className="text-[10px] bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase">Apostila</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{exam.title}</h3>
                                        <p className="text-sm text-gray-400 mb-2">
                                            Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel} • <span className="text-white font-bold">{exam.quantity} cópias</span>
                                        </p>
                                        {exam.instructions && (
                                            <p className="text-xs text-gray-500 italic bg-black/20 p-2 rounded border border-white/5 inline-block">
                                                Obs: {exam.instructions}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a 
                                            href={exam.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors"
                                        >
                                            Ver Arquivo
                                        </a>
                                        {exam.status === ExamStatus.PENDING && (
                                            <button 
                                                onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                                            >
                                                Iniciar Impressão
                                            </button>
                                        )}
                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button 
                                                onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
                                            >
                                                Concluir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredExams.length === 0 && (
                                <div className="text-center py-20 text-gray-500">
                                    Nenhuma solicitação encontrada.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STUDENTS TAB */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                             <div>
                                <h1 className="text-3xl font-bold text-white">Gestão de Alunos</h1>
                                <p className="text-gray-400">Monitoramento de frequência em tempo real.</p>
                            </div>
                        </header>
                        
                        {/* CLASSES GRID */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(cls => {
                                const count = getStudentCountByClass(cls);
                                return (
                                    <button 
                                        key={cls}
                                        onClick={() => navigateToClassStudents(cls)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            studentFilterClass === cls 
                                            ? 'bg-red-600/20 border-red-500 text-white' 
                                            : 'bg-[#18181b] border-gray-800 text-gray-400 hover:border-gray-600'
                                        }`}
                                    >
                                        <p className="text-xs font-bold uppercase mb-1">Turma</p>
                                        <h3 className="text-sm font-black mb-2">{cls}</h3>
                                        <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">{count} Alunos</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* STUDENTS LIST */}
                        <div className="bg-[#18181b] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#202022]">
                                <h3 className="font-bold text-white flex items-center gap-2"><Users size={16} /> Lista de Alunos</h3>
                                <div className="flex items-center gap-2">
                                     <input 
                                        type="text" 
                                        placeholder="Buscar aluno..." 
                                        className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-white text-xs focus:ring-1 focus:ring-red-500 outline-none w-48"
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                    />
                                    <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-gray-300">
                                        {presentCountFiltered} / {filteredStudents.length} Presentes
                                    </span>
                                </div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-[#121214] text-gray-500 font-bold uppercase text-[10px] sticky top-0">
                                        <tr>
                                            <th className="p-3">Aluno</th>
                                            <th className="p-3">Turma</th>
                                            <th className="p-3">Status Biometria</th>
                                            <th className="p-3 text-center">Presença Hoje</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {filteredStudents.map(student => {
                                            const isPresent = presentStudentIds.has(student.id);
                                            const entryTime = attendanceLogs.find(l => l.studentId === student.id)?.timestamp;

                                            return (
                                                <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                                                            {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : <Users className="p-1.5 text-gray-600 w-full h-full"/>}
                                                        </div>
                                                        <span className="font-bold text-gray-200">{student.name}</span>
                                                    </td>
                                                    <td className="p-3">{student.className}</td>
                                                    <td className="p-3">
                                                        {student.photoUrl ? (
                                                            <span className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle size={10} /> Cadastrado</span>
                                                        ) : (
                                                            <span className="text-[10px] text-red-500 flex items-center gap-1"><XCircle size={10} /> Pendente</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {isPresent ? (
                                                            <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                                                Presente às {new Date(entryTime!).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                            </span>
                                                        ) : (
                                                            <span className="bg-gray-800 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase">Ausente</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* CALENDAR TAB */}
                {activeTab === 'calendar' && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Agenda Escolar</h1>
                            <p className="text-gray-400">Eventos, feriados e cronograma de provas.</p>
                        </header>
                        
                        {renderCalendar()}

                        {/* EVENT MODAL */}
                        {showEventModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                <div className="bg-[#18181b] border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-white">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                                        <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                            <input className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-red-500 outline-none" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Ex: Conselho de Classe" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                            <input type="date" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-red-500 outline-none" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                            <select className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-red-500 outline-none" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                                <option value="event">Evento Geral</option>
                                                <option value="holiday">Feriado / Recesso</option>
                                                <option value="exam">Prova / Avaliação</option>
                                                <option value="meeting">Reunião</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                                            <textarea rows={3} className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-red-500 outline-none" value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} placeholder="Detalhes opcionais..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        {selectedEvent && (
                                            <button onClick={handleDeleteEvent} className="px-4 py-2 text-red-500 hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors">
                                                Excluir
                                            </button>
                                        )}
                                        <Button onClick={handleSaveEvent}>
                                            Salvar Evento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PLANS TAB */}
                {activeTab === 'plans' && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Planejamentos</h1>
                                <p className="text-gray-400">Acompanhamento pedagógico.</p>
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-red-500"
                                    value={planFilterClass}
                                    onChange={e => setPlanFilterClass(e.target.value)}
                                >
                                    <option value="" className="bg-gray-900">Todas as Turmas</option>
                                    {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                        <option key={c} value={c} className="bg-gray-900">{c}</option>
                                    ))}
                                </select>
                            </div>
                        </header>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPlans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${plan.type === 'daily' ? 'bg-blue-900/20 text-blue-400 border border-blue-500/20' : 'bg-green-900/20 text-green-400 border border-green-500/20'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-white font-bold mb-1">{plan.className}</h3>
                                    <p className="text-sm text-gray-400 mb-2">Prof. {plan.teacherName}</p>
                                    <p className="text-xs text-gray-500 bg-black/20 p-2 rounded border border-white/5 line-clamp-3">
                                        {plan.type === 'daily' ? (plan.topic || 'Sem tema') : (plan.period || 'Sem período')}
                                    </p>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {/* CONFIG TAB */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Configurações do Sistema</h1>
                            <p className="text-gray-400">Avisos na TV e parâmetros gerais.</p>
                        </header>

                        <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Megaphone size={20} className="text-yellow-500"/> Banner de Avisos (TV)</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="bannerActive" className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} />
                                        <label htmlFor="bannerActive" className="text-sm font-bold text-gray-300">Ativar Banner na TV</label>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                                        <textarea 
                                            rows={3}
                                            className="w-full bg-black/30 border border-gray-700 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                            value={configBannerMsg}
                                            onChange={e => setConfigBannerMsg(e.target.value)}
                                            placeholder="Ex: Reunião de Pais nesta sexta-feira às 19h"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Aviso</label>
                                        <div className="flex gap-2">
                                            {(['info', 'warning', 'error', 'success'] as const).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setConfigBannerType(type)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                                                        configBannerType === type 
                                                        ? (type === 'error' ? 'bg-red-900/40 border-red-500 text-red-400' : type === 'warning' ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400' : type === 'success' ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-blue-900/40 border-blue-500 text-blue-400')
                                                        : 'bg-black/20 border-gray-700 text-gray-500 hover:border-gray-500'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                         <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início da Exibição (Opcional)</label>
                                            <input type="datetime-local" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-xs" value={configTvStart} onChange={e => setConfigTvStart(e.target.value)} />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim da Exibição (Opcional)</label>
                                            <input type="datetime-local" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-xs" value={configTvEnd} onChange={e => setConfigTvEnd(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800 flex justify-end">
                                <Button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20">
                                    <Save size={18} className="mr-2"/> Salvar Configurações
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};