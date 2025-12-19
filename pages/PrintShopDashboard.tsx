
import React, { useState, useEffect } from 'react';
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
    getStaffMembers
} from '../services/firebaseService';
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
    EventTask
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
    Briefcase
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
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'planning' | 'config' | 'corrections'>('calendar');
    const [isLoading, setIsLoading] = useState(false);

    // --- DATA STATES ---
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [staff, setStaff] = useState<StaffMember[]>([]);

    // Filter States for Students
    const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Gabaritos & Correção States
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [keyTitle, setKeyTitle] = useState('');
    const [keyQuestions, setKeyQuestions] = useState(10);
    const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
    const [corrections, setCorrections] = useState<StudentCorrection[]>([]);
    const [correctingImage, setCorrectingImage] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [correctionResult, setCorrectionResult] = useState<StudentCorrection | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // Agenda / Eventos States
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventEndDate, setNewEventEndDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
    
    // Task Form
    const [taskDesc, setTaskDesc] = useState('');
    const [taskMaterials, setTaskMaterials] = useState('');
    const [taskAssigneeId, setTaskAssigneeId] = useState('');

    // Modal de Planejamento
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);

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
            const [allExams, allStudents, keys, plans, allStaff] = await Promise.all([
                getExams(),
                getStudents(),
                getAnswerKeys(),
                getLessonPlans(),
                getStaffMembers()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setAnswerKeys(keys.sort((a,b) => b.createdAt - a.createdAt));
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
            setStaff(allStaff.filter(s => s.active));
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
        setIsLoading(false);
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleDeleteLessonPlan = async (id: string) => {
        if (!window.confirm("Deseja realmente apagar este planejamento? Esta ação é irreversível.")) return;
        try {
            await deleteLessonPlan(id);
            setLessonPlans(lessonPlans.filter(p => p.id !== id));
            alert("Planejamento excluído com sucesso.");
        } catch (error) {
            alert("Erro ao excluir planejamento.");
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

    // --- AGENDA HANDLERS ---
    const openEventModal = (event?: SchoolEvent, prefillDate?: string) => {
        if (event) {
            setSelectedEvent(event);
            setNewEventTitle(event.title);
            setNewEventDate(event.date);
            setNewEventEndDate(event.endDate || '');
            setNewEventType(event.type);
            setNewEventDesc(event.description || '');
            setEventTasks(event.tasks || []);
        } else {
            setSelectedEvent(null);
            setNewEventTitle('');
            setNewEventDate(prefillDate || new Date().toISOString().split('T')[0]);
            setNewEventEndDate('');
            setNewEventType('event');
            setNewEventDesc('');
            setEventTasks([]);
        }
        setShowEventModal(true);
    };

    const handleAddTask = () => {
        if (!taskDesc || !taskAssigneeId) return alert("Preencha a descrição e o responsável.");
        const member = staff.find(s => s.id === taskAssigneeId);
        const newTask: EventTask = {
            id: Math.random().toString(36).substr(2, 9),
            description: taskDesc,
            materials: taskMaterials,
            assigneeId: taskAssigneeId,
            assigneeName: member?.name || 'Equipe',
            status: 'todo'
        };
        setEventTasks([...eventTasks, newTask]);
        setTaskDesc('');
        setTaskMaterials('');
        setTaskAssigneeId('');
    };

    const handleRemoveTask = (taskId: string) => {
        setEventTasks(eventTasks.filter(t => t.id !== taskId));
    };

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return alert("Título e data são obrigatórios.");
        const event: SchoolEvent = {
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            endDate: newEventEndDate || undefined,
            type: newEventType,
            description: newEventDesc,
            tasks: eventTasks
        };
        try {
            await saveSchoolEvent(event);
            setShowEventModal(false);
        } catch (e) {
            alert("Erro ao salvar evento.");
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if(confirm("Deseja excluir este evento permanentemente?")) {
            try {
                await deleteSchoolEvent(selectedEvent.id);
                setShowEventModal(false);
            } catch (e) {
                alert("Erro ao excluir evento.");
            }
        }
    };

    const handleSelectKey = async (key: AnswerKey) => {
        setSelectedKey(key);
        const data = await getCorrections(key.id);
        setCorrections(data.sort((a,b) => b.date - a.date));
    };

    const handleCreateKey = async () => {
        if (!keyTitle || Object.keys(keyAnswers).length < keyQuestions) return alert("Preencha o título e o gabarito completo.");
        const newKey: AnswerKey = {
            id: '',
            title: keyTitle,
            numQuestions: keyQuestions,
            correctAnswers: keyAnswers,
            createdAt: Date.now()
        };
        await saveAnswerKey(newKey);
        loadInitialData();
        setShowNewKeyModal(false);
        setKeyTitle(''); setKeyAnswers({});
    };

    const handleAutoCorrect = async () => {
        if (!correctingImage || !selectedKey || !selectedStudentId) return alert("Dados incompletos.");
        setIsAnalyzing(true);
        try {
            const studentAnswers = await analyzeAnswerSheet(correctingImage, selectedKey.numQuestions);
            const student = students.find(s => s.id === selectedStudentId);
            let scoreCount = 0;
            const hits: number[] = [];
            for (let i = 1; i <= selectedKey.numQuestions; i++) {
                if (studentAnswers[i] === selectedKey.correctAnswers[i]) {
                    scoreCount++; hits.push(i);
                }
            }
            const res: StudentCorrection = {
                id: '',
                answerKeyId: selectedKey.id,
                studentName: student?.name || 'Aluno',
                score: (scoreCount / selectedKey.numQuestions) * 10,
                answers: studentAnswers,
                hits: hits,
                date: Date.now()
            };
            await saveCorrection(res);
            setCorrectionResult(res);
            setCorrections([res, ...corrections]);
        } catch (e) { alert("Erro IA: " + (e as any).message); }
        finally { setIsAnalyzing(false); }
    };

    const printAnswerSheet = (key: AnswerKey) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Cartão Resposta - ${key.title}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                        .bubble { width: 22px; height: 22px; border: 1.5px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 8px; font-size: 10px; font-weight: bold; }
                        .row { margin-bottom: 8px; display: flex; align-items: center; border-bottom: 1px dashed #eee; padding: 4px 0; }
                        .num { width: 30px; font-weight: bold; font-size: 14px; }
                        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
                        .info-box { border: 1.5px solid #000; padding: 15px; margin-bottom: 25px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2 style="margin:0">CEMAL EQUIPE</h2>
                        <h3 style="margin:5px 0">CARTÃO RESPOSTA OFICIAL: ${key.title}</h3>
                    </div>
                    <div class="info-box">
                        <div style="font-size:10px; font-weight:bold; text-transform:uppercase">Nome do Aluno</div><div style="border-bottom: 1px solid #ccc; height: 20px; margin-bottom: 10px;"></div>
                        <div style="display:flex; gap:20px">
                            <div style="flex:1"><div style="font-size:10px; font-weight:bold; text-transform:uppercase">Turma</div><div style="border-bottom: 1px solid #ccc; height: 20px;"></div></div>
                            <div style="flex:1"><div style="font-size:10px; font-weight:bold; text-transform:uppercase">Data</div><div style="border-bottom: 1px solid #ccc; height: 20px;"></div></div>
                        </div>
                    </div>
                    <div class="container">
                        <div>${Array.from({length: Math.ceil(key.numQuestions/2)}).map((_, i) => `
                            <div class="row">
                                <span class="num">${String(i+1).padStart(2, '0')}</span>
                                <span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span>
                            </div>
                        `).join('')}</div>
                        <div>${Array.from({length: Math.floor(key.numQuestions/2)}).map((_, i) => `
                            <div class="row">
                                <span class="num">${String(i+Math.ceil(key.numQuestions/2)+1).padStart(2, '0')}</span>
                                <span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span>
                            </div>
                        `).join('')}</div>
                    </div>
                </body>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </html>
        `);
        printWindow.document.close();
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
            const dayEvents = events.filter(e => {
                if (!e.endDate) return e.date === dateStr;
                return dateStr >= e.date && dateStr <= e.endDate;
            });
            days.push(
                <div key={d} className="bg-white/5 h-24 border border-white/5 p-2 overflow-y-auto relative group">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <button 
                        onClick={() => openEventModal(undefined, dateStr)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white/10 hover:bg-red-600 rounded transition-all text-white"
                    >
                        <Plus size={10}/>
                    </button>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(e => (
                            <div 
                                key={e.id} 
                                onClick={() => openEventModal(e)}
                                className={`text-[9px] p-1 rounded border truncate cursor-pointer transition-colors ${
                                    e.type === 'holiday' ? 'bg-red-900/40 text-red-100 border-red-500/50' :
                                    e.type === 'exam' ? 'bg-purple-900/40 text-purple-100 border-purple-500/50' :
                                    e.type === 'meeting' ? 'bg-blue-900/40 text-blue-100 border-blue-500/50' :
                                    'bg-green-900/40 text-green-100 border-green-500/50'
                                } hover:brightness-125`}
                            >
                                {e.title}
                            </div>
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

    // Filtros de Alunos
    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClassName ? s.className === selectedClassName : true;
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const presentStudentIds = new Set(attendanceLogs.map(log => log.studentId));

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
                    <SidebarItem id="corrections" label="Correção via IA" icon={ScanLine} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-transparent">
                
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Agenda Institucional</h1>
                                <p className="text-gray-400">Controle de eventos e calendário escolar.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button onClick={() => openEventModal()} className="bg-red-600 hover:bg-red-700">
                                    <Plus size={18} className="mr-2"/> Novo Evento
                                </Button>
                                <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/10">
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronLeft/></button>
                                    <span className="font-bold text-white uppercase tracking-widest text-sm min-w-[140px] text-center">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronRight/></button>
                                </div>
                            </div>
                        </header>
                        {renderCalendar()}
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Central de Impressão</h1>
                            <p className="text-gray-400">Pedidos de provas e materiais dos professores.</p>
                        </header>
                        <div className="space-y-4">
                            {exams.length === 0 && <p className="text-gray-500 italic text-center py-20">Nenhum pedido de impressão no momento.</p>}
                            {exams.map(e => (
                                <div key={e.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 text-lg">{e.title}</h3>
                                            {e.materialType === 'handout' && <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Apostila</span>}
                                        </div>
                                        <p className="text-sm text-gray-500">Prof. {e.teacherName} • {e.gradeLevel} • <b>{e.quantity} cópias</b></p>
                                        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={e.fileUrl} target="_blank" rel="noreferrer" className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2"><FileText size={16}/> Ver PDF</a>
                                        {e.status === ExamStatus.PENDING && (
                                            <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.IN_PROGRESS)}>Iniciar</Button>
                                        )}
                                        {e.status === ExamStatus.IN_PROGRESS && (
                                            <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700">Concluir</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                        <header className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Gestão de Turmas</h1>
                                <p className="text-gray-400">Filtragem por turma e status de biometria facial.</p>
                            </div>
                            {selectedClassName && (
                                <button 
                                    onClick={() => setSelectedClassName(null)}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold uppercase text-xs"
                                >
                                    <ArrowLeft size={16}/> Ver Todas as Turmas
                                </button>
                            )}
                        </header>

                        {!selectedClassName ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-95">
                                {CLASSES.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => setSelectedClassName(c.name)}
                                        className="bg-[#18181b] border border-gray-800 p-6 rounded-3xl hover:border-red-600 hover:scale-[1.02] transition-all cursor-pointer group shadow-xl"
                                    >
                                        <div className="h-14 w-14 bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            <Users size={32}/>
                                        </div>
                                        <h3 className="text-xl font-black text-white leading-tight uppercase">{c.name}</h3>
                                        <div className="mt-4 flex justify-between items-center">
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{students.filter(s => s.className === c.name).length} Alunos</p>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded ${c.shift === 'morning' ? 'bg-blue-900/40 text-blue-400' : 'bg-orange-900/40 text-orange-400'}`}>
                                                {c.shift === 'morning' ? 'MANHÃ' : 'TARDE'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {/* CARD ADICIONAL: TODOS */}
                                <div 
                                    onClick={() => setSelectedClassName('ALL')}
                                    className="bg-red-600 p-6 rounded-3xl hover:bg-red-700 transition-all cursor-pointer group shadow-2xl flex flex-col justify-between"
                                >
                                    <div className="h-14 w-14 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6">
                                        <Filter size={32}/>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white leading-tight uppercase">Geral</h3>
                                        <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1">Todos os {students.length} Alunos</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                <div className="bg-[#18181b] border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                            <School size={24}/>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase">{selectedClassName === 'ALL' ? 'Todos os Alunos' : selectedClassName}</h2>
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{filteredStudents.length} Estudantes Filtrados</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-96">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                        <input 
                                            type="text" 
                                            className="w-full bg-black/40 border border-gray-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                                            placeholder="Buscar aluno pelo nome..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                                            <tr>
                                                <th className="p-6">Estudante</th>
                                                <th className="p-6">Turma Atual</th>
                                                <th className="p-6 text-center">Biometria</th>
                                                <th className="p-6 text-center">Frequência Hoje</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredStudents.map(s => {
                                                const isPresent = presentStudentIds.has(s.id);
                                                return (
                                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="p-6 flex items-center gap-4">
                                                            <div className="h-12 w-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                                                {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover"/> : <Users className="text-gray-300 w-full h-full p-3" />}
                                                            </div>
                                                            <span className="font-bold text-gray-800 text-lg">{s.name}</span>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="text-gray-500 font-bold bg-gray-100 px-3 py-1 rounded-full text-xs">{s.className}</span>
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            {s.photoUrl ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-black uppercase border border-green-100">
                                                                    <CheckCircle size={12}/> Ativo
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase border border-red-100">
                                                                    <XCircle size={12}/> Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            {isPresent ? (
                                                                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-900/20">Presente</span>
                                                            ) : (
                                                                <span className="bg-gray-200 text-gray-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase">Ausente</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredStudents.length === 0 && (
                                                <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">Nenhum aluno encontrado para os critérios selecionados.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Frequência em Tempo Real</h1>
                            <p className="text-gray-400">Logs de acesso pelo terminal facial hoje.</p>
                        </header>
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4">Horário</th>
                                        <th className="p-4">Aluno</th>
                                        <th className="p-4">Turma</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-green-50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-blue-600">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-4 font-bold text-gray-800">{log.studentName}</td>
                                            <td className="p-4 text-gray-500">{log.className}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Gestão Pedagógica</h1>
                            <p className="text-gray-400">Acompanhamento dos planejamentos enviados pelos professores.</p>
                        </header>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {lessonPlans.map(plan => (
                                <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-red-700">{plan.teacherName}</h4>
                                            <p className="text-xs text-gray-500">{plan.subject}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${plan.type === 'daily' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                    </div>
                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Turma</p>
                                        <p className="font-bold text-gray-800">{plan.className}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                        <button onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                                            <Eye size={14}/> Ver Detalhes
                                        </button>
                                        <button onClick={() => handleDeleteLessonPlan(plan.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Apagar Planejamento">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'corrections' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><ScanLine className="text-red-500"/> Correção Automática</h1>
                                <p className="text-gray-400">Gabaritos oficiais e visão computacional para correção.</p>
                            </div>
                            <Button onClick={() => setShowNewKeyModal(true)}>
                                <Plus size={18} className="mr-2"/> Novo Gabarito
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* LISTA DE GABARITOS */}
                            <div className="bg-[#18181b] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-280px)]">
                                <div className="p-4 bg-gray-900/50 border-b border-gray-800 font-bold text-gray-300">Avaliações Ativas</div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {answerKeys.map(key => (
                                        <div key={key.id} onClick={() => handleSelectKey(key)} className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedKey?.id === key.id ? 'bg-red-600/10 border-red-500/50' : 'bg-gray-900/30 border-gray-800 hover:border-gray-700'}`}>
                                            <div>
                                                <h4 className={`font-bold text-sm ${selectedKey?.id === key.id ? 'text-red-400' : 'text-white'}`}>{key.title}</h4>
                                                <p className="text-[10px] text-gray-500 uppercase">{key.numQuestions} Questões</p>
                                            </div>
                                            {selectedKey?.id === key.id && (
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); printAnswerSheet(key); }} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" title="Imprimir Cartão"><Printer size={14}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteAnswerKey(key.id); loadInitialData(); }} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AREA DE CORREÇÃO */}
                            <div className="lg:col-span-2 space-y-6">
                                {selectedKey ? (
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-6 uppercase text-xs tracking-widest text-red-600 flex items-center gap-2"><ScanLine size={16}/> Corrigir Cartão: {selectedKey.title}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Selecionar Aluno</label>
                                                    <select className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                                                        <option value="">-- Buscar Aluno --</option>
                                                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                    </select>
                                                </div>
                                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center relative hover:bg-gray-50 transition-colors cursor-pointer">
                                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setCorrectingImage(e.target.files?.[0] || null)}/>
                                                    {correctingImage ? (
                                                        <div className="text-green-600 font-bold">
                                                            <CheckCircle size={48} className="mx-auto mb-2"/>
                                                            <p className="text-sm">{correctingImage.name}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400">
                                                            <UploadCloud size={48} className="mx-auto mb-2 opacity-30"/>
                                                            <p className="font-bold">Foto do Cartão</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button onClick={handleAutoCorrect} isLoading={isAnalyzing} className="w-full h-14 text-lg font-black tracking-widest uppercase">Processar Correção IA</Button>
                                            </div>

                                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                                                {correctionResult ? (
                                                    <div className="animate-in zoom-in-95 duration-500">
                                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black mb-6 border-8 ${correctionResult.score >= 6 ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                                                            {correctionResult.score.toFixed(1)}
                                                        </div>
                                                        <h4 className="font-black text-gray-800 uppercase">{correctionResult.studentName}</h4>
                                                        <p className="text-xs text-gray-500 mt-1">Acertou {correctionResult.hits.length} de {selectedKey.numQuestions}</p>
                                                    </div>
                                                ) : (
                                                    <div className="opacity-20 flex flex-col items-center">
                                                        <History size={80} className="mb-4 text-gray-400"/>
                                                        <p className="font-bold uppercase text-xs">Aguardando Análise</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-600 border-2 border-dashed border-white/5 rounded-3xl opacity-40 py-20">
                                        <ScanLine size={80} className="mb-4"/>
                                        <p className="font-black uppercase tracking-widest">Selecione um gabarito para começar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Configurações do Sistema</h1>
                        </header>
                        <div className="bg-[#18181b] border border-gray-800 rounded-3xl p-8 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Megaphone size={24} className="text-yellow-500"/> Banner de Avisos (TV)</h3>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
                                        <input type="checkbox" id="bannerActive" className="w-6 h-6 rounded border-gray-600 bg-gray-700 text-red-600" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} />
                                        <label htmlFor="bannerActive" className="text-sm font-bold text-gray-200">Ativar Banner na TV</label>
                                    </div>
                                    <div>
                                        <textarea rows={3} className="w-full bg-black/30 border border-gray-700 rounded-2xl p-4 text-white outline-none focus:border-red-500" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Mensagem do aviso..."/>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {(['info', 'warning', 'error', 'success'] as const).map(type => (
                                            <button key={type} onClick={() => setConfigBannerType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${configBannerType === type ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5 flex justify-end">
                                <Button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl font-black uppercase"><Save size={20} className="mr-2"/> Salvar Alterações</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EVENTO (AGENDA) - ATUALIZADO COM PERÍODO E TAREFAS */}
            {showEventModal && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-gray-800 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-black/20 shrink-0">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                                <CalendarDays className="text-red-600"/> {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
                            </h3>
                            <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                            {/* INFORMAÇÕES BÁSICAS */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Informações Gerais</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título do Evento</label>
                                    <input 
                                        className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white focus:border-red-600 outline-none transition-all" 
                                        value={newEventTitle} 
                                        onChange={e => setNewEventTitle(e.target.value)} 
                                        placeholder="Ex: Conselho de Classe"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Início</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white focus:border-red-600 outline-none" 
                                            value={newEventDate} 
                                            onChange={e => setNewEventDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Fim (Período)</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white focus:border-red-600 outline-none" 
                                            value={newEventEndDate} 
                                            onChange={e => setNewEventEndDate(e.target.value)}
                                            min={newEventDate}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo</label>
                                        <select 
                                            className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white focus:border-red-600 outline-none" 
                                            value={newEventType} 
                                            onChange={e => setNewEventType(e.target.value as any)}
                                        >
                                            <option value="event">Geral</option>
                                            <option value="holiday">Feriado</option>
                                            <option value="exam">Prova</option>
                                            <option value="meeting">Reunião</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição / Detalhes</label>
                                    <textarea 
                                        rows={3} 
                                        className="w-full bg-black/30 border border-gray-700 rounded-xl p-3 text-white focus:border-red-600 outline-none" 
                                        value={newEventDesc} 
                                        onChange={e => setNewEventDesc(e.target.value)} 
                                        placeholder="Detalhes opcionais sobre o evento..."
                                    />
                                </div>
                            </section>

                            {/* TAREFAS / KANBAN */}
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Tarefas e Processos do Evento</h4>
                                
                                {/* NOVO FORM DE TAREFA */}
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição do Processo</label>
                                            <input className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-sm text-white" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Ex: Preparar som e projetor" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsável (Equipe)</label>
                                            <select className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-sm text-white" value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)}>
                                                <option value="">Selecionar Membro...</option>
                                                {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Materiais Necessários</label>
                                        <input className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-sm text-white" value={taskMaterials} onChange={e => setTaskMaterials(e.target.value)} placeholder="Ex: Extensão, Microfone..." />
                                    </div>
                                    <button onClick={handleAddTask} className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-black uppercase rounded-lg border border-blue-500/20 transition-all">
                                        Adicionar Tarefa ao Planejamento
                                    </button>
                                </div>

                                {/* LISTA DE TAREFAS ADICIONADAS */}
                                <div className="space-y-2">
                                    {eventTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 bg-[#202022] rounded-xl border border-gray-800 group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-8 w-8 rounded-full bg-blue-900/20 text-blue-400 flex items-center justify-center shrink-0">
                                                    <Briefcase size={16}/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-tight">{task.description}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Resp: <span className="text-gray-300 font-bold">{task.assigneeName}</span> • Mat: <span className="text-gray-400 italic">{task.materials || 'Nenhum'}</span></p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveTask(task.id)} className="text-gray-600 hover:text-red-500 p-1 transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                    {eventTasks.length === 0 && (
                                        <p className="text-center text-xs text-gray-600 py-4 italic">Nenhuma tarefa adicionada a este evento.</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-white/5 flex justify-between items-center bg-black/20 shrink-0">
                            {selectedEvent ? (
                                <button onClick={handleDeleteEvent} className="text-red-500 hover:text-red-400 font-bold uppercase text-xs flex items-center gap-2">
                                    <Trash2 size={16}/> Excluir Registro
                                </button>
                            ) : <div></div>}
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowEventModal(false)} className="border-gray-700 text-gray-400">Cancelar</Button>
                                <Button onClick={handleSaveEvent} className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/40 px-10">
                                    <Save size={18} className="mr-2"/> Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES PLANEJAMENTO */}
            {showPlanModal && selectedPlan && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                    <BookOpen size={24} className="text-red-600"/> Planejamento {selectedPlan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                </h2>
                                <p className="text-sm text-gray-500">Prof. {selectedPlan.teacherName} • {selectedPlan.className}</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-red-600"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white text-gray-800">
                             <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Disciplina</span>
                                    <span className="font-bold text-lg">{selectedPlan.subject}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Data/Período</span>
                                    <span className="font-bold text-lg">{selectedPlan.type === 'daily' ? selectedPlan.date : selectedPlan.period}</span>
                                </div>
                             </div>
                             {selectedPlan.type === 'daily' ? (
                                <div className="space-y-6">
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Tema da Aula</h3><p className="text-lg font-medium">{selectedPlan.topic}</p></div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Conteúdo</h3><p className="whitespace-pre-wrap leading-relaxed">{selectedPlan.content}</p></div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Metodologia</h3><p className="whitespace-pre-wrap leading-relaxed">{selectedPlan.methodology}</p></div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Recursos</h3><p className="bg-gray-50 p-4 rounded-xl">{selectedPlan.resources}</p></div>
                                        <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Avaliação</h3><p className="bg-gray-50 p-4 rounded-xl">{selectedPlan.evaluation}</p></div>
                                    </div>
                                    {selectedPlan.homework && <div className="bg-red-50 p-6 rounded-2xl border border-red-100"><h3 className="font-black text-xs uppercase text-red-600 mb-2">Tarefa de Casa</h3><p className="font-bold">{selectedPlan.homework}</p></div>}
                                </div>
                             ) : (
                                <div className="space-y-8">
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Justificativa</h3><p className="whitespace-pre-wrap text-justify">{selectedPlan.justification}</p></div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100"><h3 className="font-black text-xs uppercase text-blue-700 mb-2">Habilidades Cognitivas</h3><p className="text-sm">{selectedPlan.cognitiveSkills}</p></div>
                                        <div className="bg-green-50 p-5 rounded-2xl border border-green-100"><h3 className="font-black text-xs uppercase text-green-700 mb-2">Socioemocionais</h3><p className="text-sm">{selectedPlan.socialEmotionalSkills}</p></div>
                                    </div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-4">Atividades</h3>
                                        <div className="grid grid-cols-4 gap-4">
                                            {['Prévias','Autodidáticas','Cooperativas','Complementares'].map((t, i) => (
                                                <div key={t} className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">{t}</span>
                                                    <p className="text-xs">{[selectedPlan.activitiesPre, selectedPlan.activitiesAuto, selectedPlan.activitiesCoop, selectedPlan.activitiesCompl][i]}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                            <Button variant="danger" onClick={() => { handleDeleteLessonPlan(selectedPlan.id); setShowPlanModal(false); }} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white border-none shadow-none"><Trash2 size={18} className="mr-2"/> Apagar Registro</Button>
                            <Button onClick={() => setShowPlanModal(false)} className="bg-gray-800 text-white font-bold px-8">Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: NOVO GABARITO */}
            {showNewKeyModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Criar Gabarito Oficial</h3>
                            <button onClick={() => setShowNewKeyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título da Avaliação</label>
                                    <input className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800 font-bold" placeholder="Ex: Simulado Bimestral Matemática" value={keyTitle} onChange={e => setKeyTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantidade de Questões</label>
                                    <input type="number" min="1" max="50" className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800" value={keyQuestions} onChange={e => setKeyQuestions(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ListChecks size={18} className="text-red-500"/> Definir Respostas Corretas</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {Array.from({ length: keyQuestions }).map((_, i) => (
                                        <div key={i} className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-center">Questão {i + 1}</span>
                                            <select 
                                                className="w-full bg-white border border-gray-200 rounded-lg p-1 text-xs font-bold text-gray-800 outline-none focus:border-red-500"
                                                value={keyAnswers[i + 1] || ''}
                                                onChange={e => setKeyAnswers({...keyAnswers, [i + 1]: e.target.value})}
                                            >
                                                <option value="">-</option>
                                                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowNewKeyModal(false)}>Cancelar</Button>
                                <Button onClick={handleCreateKey} className="bg-red-600 hover:bg-red-700 px-8 shadow-lg font-bold uppercase tracking-widest"><Save size={18} className="mr-2"/> Salvar Gabarito</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
