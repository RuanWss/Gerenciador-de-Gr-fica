
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    getStaffMembers,
    listenToSystemConfig,
    updateSystemConfig,
    deleteExamRequest,
    listenToAttendanceLogs,
    getLessonPlans,
    listenToEvents,
    saveSchoolEvent,
    deleteSchoolEvent
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig, 
    StaffMember,
    AttendanceLog,
    LessonPlan,
    SchoolEvent
} from '../types';
import { 
    Printer, Search, Calendar, Users, Settings, X, BookOpen, ClipboardCheck, 
    CalendarDays, ExternalLink, FileText, CheckCircle2, Clock, Trash2, 
    ChevronRight, Download, Plus, ChevronLeft, Megaphone, Save, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '../components/Button';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'calendar' | 'students' | 'attendance' | 'planning' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Data States
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    
    // Filters & UI States
    const [examFilter, setExamFilter] = useState<ExamStatus | 'ALL'>('ALL');
    const [examSearch, setExamSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);

    // Config States
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Event Form States
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');

    useEffect(() => {
        loadData();
        
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        const unsubEvents = listenToEvents(setEvents);

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
        };
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [allStudents, allExams, allPlans] = await Promise.all([
            getStudents(),
            getExams(),
            getLessonPlans()
        ]);
        setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
        setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
        setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
        setIsLoading(false);
    };

    const handleUpdateStatus = async (examId: string, status: ExamStatus) => {
        try {
            await updateExamStatus(examId, status);
            setExams(prev => prev.map(e => e.id === examId ? { ...e, status } : e));
        } catch (e) {
            alert("Erro ao atualizar status");
        }
    };

    const handleDeleteExam = async (id: string) => {
        if (confirm("Deseja excluir este pedido de impressão?")) {
            await deleteExamRequest(id);
            setExams(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleSaveConfig = async () => {
        if (!sysConfig) return;
        await updateSystemConfig({
            ...sysConfig,
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        });
        alert("Configurações atualizadas!");
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    // --- CALENDAR RENDER LOGIC ---
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const calendarDays = [];

        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

        return (
            <div className="bg-[#18181b] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{monthName}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-4 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 min-h-[400px]">
                    {calendarDays.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} className="border-b border-r border-white/5 bg-black/20"></div>;
                        
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = events.filter(e => e.date === dateStr);
                        
                        return (
                            <div 
                                key={day} 
                                className="border-b border-r border-white/5 p-2 min-h-[100px] hover:bg-white/5 transition-colors cursor-pointer group"
                                onClick={() => {
                                    setNewEventDate(dateStr);
                                    setNewEventTitle('');
                                    setNewEventType('event');
                                    setSelectedEvent(null);
                                    setShowEventModal(true);
                                }}
                            >
                                <span className="text-xs font-bold text-gray-500 group-hover:text-white">{day}</span>
                                <div className="mt-1 space-y-1">
                                    {dayEvents.map(ev => (
                                        <div 
                                            key={ev.id} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEvent(ev);
                                                setNewEventTitle(ev.title);
                                                setNewEventDate(ev.date);
                                                setNewEventType(ev.type);
                                                setShowEventModal(true);
                                            }}
                                            className={`text-[8px] p-1 rounded font-black uppercase truncate ${
                                            ev.type === 'holiday' ? 'bg-red-500/20 text-red-500' :
                                            ev.type === 'exam' ? 'bg-purple-500/20 text-purple-500' :
                                            'bg-blue-500/20 text-blue-500'
                                        }`}>
                                            {ev.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Filter Logic
    const filteredExams = exams.filter(e => {
        const matchesStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchesSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesClass = studentFilterClass === 'ALL' || s.classId === studentFilterClass;
        return matchesSearch && matchesClass;
    });

    const presentIds = new Set(attendanceLogs.map(l => l.studentId));

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Painel Administrativo</p>
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência Hoje" icon={ClipboardCheck} />
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* --- ABA EXAMES --- */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Printer className="text-red-500" /> Gráfica e Cópias
                                </h1>
                                <p className="text-gray-400">Recebimento e gerenciamento de pedidos de impressão.</p>
                            </div>
                            <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/10">
                                <button onClick={() => setExamFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>Todos</button>
                                <button onClick={() => setExamFilter(ExamStatus.PENDING)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.PENDING ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>Pendentes</button>
                                <button onClick={() => setExamFilter(ExamStatus.COMPLETED)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.COMPLETED ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>Concluídos</button>
                            </div>
                        </header>

                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none" 
                                placeholder="Buscar por título ou professor..."
                                value={examSearch}
                                onChange={e => setExamSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${
                                            exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                            exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-green-500/10 text-green-500'
                                        }`}>
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold text-white leading-tight">{exam.title}</h3>
                                            </div>
                                            <p className="text-gray-400 text-sm font-medium">Prof. {exam.teacherName} • {exam.gradeLevel}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg">
                                                    {exam.quantity} CÓPIAS
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400"><Download size={20} /></a>
                                        {exam.status === ExamStatus.PENDING && (
                                            <button onClick={() => handleUpdateStatus(exam.id, ExamStatus.IN_PROGRESS)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">Iniciar</button>
                                        )}
                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button onClick={() => handleUpdateStatus(exam.id, ExamStatus.COMPLETED)} className="bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">Concluir</button>
                                        )}
                                        <button onClick={() => handleDeleteExam(exam.id)} className="p-3 text-gray-500 hover:text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ABA TURMAS --- */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Users className="text-red-500" /> Gestão de Turmas
                            </h1>
                            <p className="text-gray-400">Visualização de alunos por classe.</p>
                        </header>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(cls => (
                                <button 
                                    key={cls} 
                                    onClick={() => setStudentFilterClass(cls)}
                                    className={`p-4 rounded-2xl border text-left transition-all ${studentFilterClass === cls ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}
                                >
                                    <h3 className="font-black text-sm uppercase">{cls}</h3>
                                    <p className="text-[10px] opacity-70 mt-1">{students.filter(s => s.className === cls).length} Alunos</p>
                                </button>
                            ))}
                            <button onClick={() => setStudentFilterClass('ALL')} className={`p-4 rounded-2xl border text-left transition-all ${studentFilterClass === 'ALL' ? 'bg-white text-black' : 'bg-black/40 border-white/10 text-gray-400'}`}>TODOS</button>
                        </div>

                        <div className="bg-black/20 rounded-[2.5rem] border border-white/10 overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="p-6">Nome do Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Biometria</th>
                                        <th className="p-6 text-center">Presença Hoje</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-white/5">
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-800 border border-white/5 overflow-hidden">
                                                    {student.photoUrl && <img src={student.photoUrl} className="w-full h-full object-cover"/>}
                                                </div>
                                                <span className="font-bold text-white">{student.name}</span>
                                            </td>
                                            <td className="p-6 text-gray-400 font-medium">{student.className}</td>
                                            <td className="p-6">
                                                {student.photoUrl ? (
                                                    <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded-lg">Cadastrado</span>
                                                ) : (
                                                    <span className="text-[10px] font-black text-red-500 uppercase bg-red-500/10 px-2 py-1 rounded-lg">Pendente</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                {presentIds.has(student.id) ? (
                                                    <CheckCircle2 size={20} className="text-green-500 mx-auto" />
                                                ) : (
                                                    <X size={20} className="text-gray-700 mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {/* --- ABA FREQUÊNCIA --- */}
                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <ClipboardCheck className="text-red-500" /> Frequência de Hoje
                                </h1>
                                <p className="text-gray-400">Histórico de registros biométricos do dia atual.</p>
                            </div>
                            <div className="bg-green-600/10 border border-green-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
                                <span className="text-3xl font-black text-green-500">{attendanceLogs.length}</span>
                                <p className="text-[10px] font-black text-green-500 uppercase leading-tight">Alunos<br/>Registrados</p>
                            </div>
                        </header>

                        <div className="bg-black/20 rounded-[2.5rem] border border-white/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase border-b border-white/10">
                                    <tr>
                                        <th className="p-6">Horário</th>
                                        <th className="p-6">Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Tipo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5">
                                            <td className="p-6 font-mono font-bold text-red-500">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-6 font-bold text-white">{log.studentName}</td>
                                            <td className="p-6 text-gray-400 font-medium">{log.className}</td>
                                            <td className="p-6">
                                                <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded-lg">Entrada</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {attendanceLogs.length === 0 && (
                                        <tr><td colSpan={4} className="p-20 text-center text-gray-500 uppercase font-black tracking-widest">Nenhum registro ainda</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- ABA AGENDA --- */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <CalendarDays className="text-red-500" /> Agenda Escolar
                            </h1>
                            <p className="text-gray-400">Eventos, feriados e cronograma institucional.</p>
                        </header>
                        {renderCalendar()}

                        {showEventModal && (
                            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
                                    <h3 className="text-2xl font-black text-gray-800 mb-6 uppercase tracking-tight">Evento / Agenda</h3>
                                    <div className="space-y-4">
                                        <input className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold" placeholder="Título do Evento" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                                        <input type="date" className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                                        <select className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                            <option value="event">Evento Geral</option>
                                            <option value="holiday">Feriado / Recesso</option>
                                            <option value="exam">Dia de Prova</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 mt-8">
                                        <Button className="flex-1 h-14" onClick={handleSaveEvent}>Salvar</Button>
                                        <Button variant="secondary" className="h-14" onClick={() => setShowEventModal(false)}>Cancelar</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA PLANEJAMENTO --- */}
                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <BookOpen className="text-red-500" /> Planejamentos Pedagogicos
                            </h1>
                            <p className="text-gray-400">Análise de conteúdos enviados pelos professores.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${plan.type === 'daily' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white text-lg mb-1 leading-tight">{plan.type === 'daily' ? plan.topic : plan.period}</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-4">{plan.className} • {plan.teacherName}</p>
                                    <div className="text-[10px] text-gray-400 line-clamp-3 bg-black/40 p-3 rounded-xl border border-white/5">
                                        {plan.content || plan.semesterContents || 'Sem resumo disponível.'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ABA CONFIG --- */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Settings className="text-red-500" /> Configurações do Monitor
                            </h1>
                            <p className="text-gray-400">Controle de avisos globais e TV.</p>
                        </header>

                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="bannerActive" 
                                        className="h-6 w-6 rounded border-white/10 bg-black text-red-600 focus:ring-0" 
                                        checked={configIsBannerActive}
                                        onChange={e => setConfigIsBannerActive(e.target.checked)}
                                    />
                                    <label htmlFor="bannerActive" className="text-lg font-bold text-white uppercase tracking-tight">Ativar Banner de Aviso na TV</label>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Mensagem do Banner</label>
                                    <textarea 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600"
                                        rows={3}
                                        value={configBannerMsg}
                                        onChange={e => setConfigBannerMsg(e.target.value)}
                                        placeholder="Ex: Reunião de Pais nesta sexta-feira às 19:00..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Tipo de Alerta</label>
                                    <div className="flex gap-2">
                                        {(['info', 'warning', 'error', 'success'] as const).map(type => (
                                            <button 
                                                key={type} 
                                                onClick={() => setConfigBannerType(type)}
                                                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${configBannerType === type ? 'bg-red-600 text-white' : 'bg-black/40 text-gray-400 border border-white/10'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleSaveConfig} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest">
                                <Save size={20} className="mr-2"/> Salvar Configurações
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
