
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
    getAllPEIs
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
    PEIDocument
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
    Heart
} from 'lucide-react';

const CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', shift: 'morning' },
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon' },
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'planning' | 'config' | 'corrections' | 'pei'>('calendar');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- DATA STATES ---
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [staff, setStaff] = useState<StaffMember[]>([]);

    // Filter States
    const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
    const [globalSearch, setGlobalSearch] = useState('');

    // Gabaritos & Correção States
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [keyTitle, setKeyTitle] = useState('');
    const [keyQuestions, setKeyQuestions] = useState(10);
    const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
    
    // Agenda / Eventos States
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
    
    // Modal de Planejamento e PEI
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);
    const [showPeiModal, setShowPeiModal] = useState(false);

    // Config States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Calendar States
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadInitialData();
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
    }, [activeTab]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, keys, plans, allStaff, peis] = await Promise.all([
                getExams(),
                getStudents(),
                getAnswerKeys(),
                getLessonPlans(),
                getStaffMembers(),
                getAllPEIs()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setAnswerKeys(keys.sort((a,b) => b.createdAt - a.createdAt));
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
            setStaff(allStaff.filter(s => s.active));
            setAllPeis(peis.sort((a,b) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
        setIsLoading(false);
    };

    // Filtros Genéricos
    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClassName ? s.className === selectedClassName : true;
        const matchesSearch = s.name.toLowerCase().includes(globalSearch.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const filteredPeis = allPeis.filter(p => 
        p.studentName.toLowerCase().includes(globalSearch.toLowerCase()) ||
        p.teacherName.toLowerCase().includes(globalSearch.toLowerCase())
    );

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleDeleteLessonPlan = async (id: string) => {
        if (!window.confirm("Excluir planejamento?")) return;
        await deleteLessonPlan(id);
        setLessonPlans(lessonPlans.filter(p => p.id !== id));
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

    const openEventModal = (event?: SchoolEvent, prefillDate?: string) => {
        if (event) {
            setSelectedEvent(event);
            setNewEventTitle(event.title);
            setNewEventDate(event.date);
            setNewEventType(event.type);
            setNewEventDesc(event.description || '');
            setEventTasks(event.tasks || []);
        } else {
            setSelectedEvent(null);
            setNewEventTitle('');
            setNewEventDate(prefillDate || new Date().toISOString().split('T')[0]);
            setNewEventType('event');
            setNewEventDesc('');
            setEventTasks([]);
        }
        setShowEventModal(true);
    };

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return;
        const event: SchoolEvent = {
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            type: newEventType,
            description: newEventDesc,
            tasks: eventTasks
        };
        await saveSchoolEvent(event);
        setShowEventModal(false);
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

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="bg-white/5 h-24 border border-white/5"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEvents = events.filter(e => dateStr === e.date);
            days.push(
                <div key={d} className="bg-white/5 h-24 border border-white/5 p-2 overflow-y-auto relative group">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <button onClick={() => openEventModal(undefined, dateStr)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white/10 hover:bg-red-600 rounded transition-all text-white"><Plus size={10}/></button>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(e => (
                            <div key={e.id} onClick={() => openEventModal(e)} className="text-[9px] p-1 rounded border bg-green-900/40 text-green-100 border-green-500/50 truncate cursor-pointer hover:brightness-125">{e.title}</div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-7 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map(h => <div key={h} className="bg-black/40 p-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest">{h}</div>)}
                {days}
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel Escolar</p>
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência" icon={ClipboardCheck} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <SidebarItem id="pei" label="Relatórios PEI" icon={Heart} />
                    <SidebarItem id="corrections" label="Correção Automática" icon={ScanLine} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-transparent">
                
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Agenda Institucional</h1>
                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/10">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronLeft/></button>
                                <span className="font-bold text-white uppercase text-sm min-w-[140px] text-center">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronRight/></button>
                            </div>
                        </header>
                        {renderCalendar()}
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

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3"><Heart className="text-red-500"/> Relatórios PEI</h1>
                                <p className="text-gray-400">Acompanhamento dos Planos Educacionais Individualizados.</p>
                            </div>
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white" placeholder="Buscar aluno ou professor..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/>
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
                                            <td className="p-6 text-xs text-gray-500">
                                                {new Date(pei.updatedAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => { setSelectedPei(pei); setShowPeiModal(true); }} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all">Ver Detalhes</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPeis.length === 0 && (
                                        <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase opacity-40">Nenhum PEI registrado</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA DE PLANEJAMENTOS COMUM */}
                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Gestão Pedagógica</h1>
                        </header>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {lessonPlans.map(plan => (
                                <div key={plan.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{plan.teacherName}</h4>
                                            <p className="text-xs text-red-600 font-black uppercase">{plan.subject}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{plan.type === 'daily' ? 'Diário' : 'Bimestral'}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500 mb-2">{plan.className}</p>
                                    <button onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }} className="w-full py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all border border-gray-100">Visualizar Conteúdo</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* CONFIGURACOES */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-bold text-white">Configurações TV</h1></header>
                        <div className="bg-[#18181b] border border-gray-800 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl">
                                <input type="checkbox" id="bannerActive" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)}/>
                                <label htmlFor="bannerActive" className="text-white font-bold">Ativar Banner na TV</label>
                            </div>
                            <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Mensagem do aviso..."/>
                            <Button onClick={handleSaveConfig} className="w-full bg-red-600">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* PEI DETAIL MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3"><Heart className="text-red-600"/> Detalhes do PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • {selectedPei.subject}</p>
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

            {/* LESSON PLAN DETAIL MODAL (Reduzido para brevidade) */}
            {showPlanModal && selectedPlan && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between bg-gray-50">
                            <h2 className="text-xl font-black uppercase">{selectedPlan.teacherName}</h2>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-400"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8"><p className="whitespace-pre-wrap">{selectedPlan.content || selectedPlan.justification}</p></div>
                    </div>
                </div>
            )}
        </div>
    );
};
