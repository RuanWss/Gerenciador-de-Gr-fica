
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
    deleteSchoolEvent,
    getAllPEIs
} from '../services/firebaseService';
import { evolutionService } from '../services/evolutionService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent,
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
    BookOpenCheck, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    CheckCircle,
    XCircle,
    Activity,
    Send,
    Globe,
    Key,
    Heart,
    Eye,
    ClipboardList
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'pei' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // --- DATA STATES ---
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    
    // --- WHATSAPP / PROXY STATES ---
    const [instanceStatus, setInstanceStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [isTestingWA, setIsTestingWA] = useState(false);
    const [proxyLog, setProxyLog] = useState<string>('');

    // --- CONFIG LOCAL STATES ---
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [waInstance, setWaInstance] = useState('');
    const [waNumber, setWaNumber] = useState('');
    const [waApiKey, setWaApiKey] = useState('');
    const [waBaseUrl, setWaBaseUrl] = useState('https://api.evolution-api.com');
    const [waEnabled, setWaEnabled] = useState(false);
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [bannerActive, setBannerActive] = useState(false);

    // --- CALENDAR STATES ---
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');

    // --- VIEW STATES ---
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);
    const [showPeiModal, setShowPeiModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => setAttendanceLogs(logs));
        const unsubEvents = listenToEvents((evs) => setEvents(evs));
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setWaInstance(cfg.whatsappInstance || '');
            setWaNumber(cfg.printShopNumber || '');
            setWaApiKey(cfg.whatsappApiKey || '');
            setWaBaseUrl(cfg.whatsappBaseUrl || 'https://api.evolution-api.com');
            setWaEnabled(cfg.enableAutomations || false);
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setBannerActive(cfg.isBannerActive || false);
            
            if (cfg.whatsappInstance && cfg.whatsappBaseUrl && cfg.whatsappApiKey) {
                checkWAStatus(cfg.whatsappBaseUrl, cfg.whatsappApiKey, cfg.whatsappInstance);
            }
        });

        return () => {
            unsubAttendance();
            unsubEvents();
            unsubConfig();
        };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, allPlans, peis] = await Promise.all([
                getExams(),
                getStudents(),
                getLessonPlans(),
                getAllPEIs()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
            setAllPeis(peis.sort((a,b) => b.updatedAt - a.updatedAt));
        } finally {
            setIsLoading(false);
        }
    };

    const checkWAStatus = async (baseUrl: string, apiKey: string, instance: string) => {
        setInstanceStatus('loading');
        try {
            const res = await evolutionService.getInstanceStatus(baseUrl, apiKey, instance);
            if (res.error) {
                setProxyLog(`Proxy: ${res.message || 'Erro de conexão'}`);
                setInstanceStatus('disconnected');
            } else {
                setInstanceStatus(res?.instance?.state === 'open' ? 'connected' : 'disconnected');
                setProxyLog('Proxy Cloud Run: Operacional');
            }
        } catch {
            setInstanceStatus('disconnected');
        }
    };

    const handleTestWA = async () => {
        if (!waInstance || !waNumber || !waApiKey) return alert("Configure a API antes.");
        setIsTestingWA(true);
        try {
            const res = await evolutionService.sendMessage(waBaseUrl, waApiKey, waInstance, waNumber, "🚀 *TESTE CEMAL PROXY*\n\nConexão com Cloud Run validada!");
            if (res.error) throw new Error(res.message);
            alert("Gatilho enviado com sucesso!");
        } catch (e: any) {
            alert(`Erro no Gatilho: ${e.message}`);
        } finally {
            setIsTestingWA(false);
        }
    };

    const handleUpdateExam = async (exam: ExamRequest, status: ExamStatus) => {
        await updateExamStatus(exam.id, status);
        if (status === ExamStatus.COMPLETED && waEnabled && waInstance && waNumber) {
            await evolutionService.sendMessage(waBaseUrl, waApiKey, waInstance, waNumber, `✅ *PEDIDO PRONTO*\n\nProf. ${exam.teacherName}, o material "${exam.title}" (${exam.gradeLevel}) já está disponível na gráfica.`);
        }
        setExams(exams.map(e => e.id === exam.id ? { ...e, status } : e));
    };

    const handleSaveGlobalConfig = async () => {
        if (!sysConfig) return;
        setIsLoading(true);
        try {
            await updateSystemConfig({
                ...sysConfig,
                bannerMessage: bannerMsg,
                bannerType: bannerType,
                isBannerActive: bannerActive,
                whatsappInstance: waInstance,
                whatsappApiKey: waApiKey,
                whatsappBaseUrl: waBaseUrl,
                printShopNumber: waNumber,
                enableAutomations: waEnabled
            });
            alert("Configurações atualizadas!");
            checkWAStatus(waBaseUrl, waApiKey, waInstance);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return;
        const ev: SchoolEvent = {
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            type: newEventType,
            tasks: []
        };
        await saveSchoolEvent(ev);
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

    const filteredPlans = plans.filter(p => 
        p.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPeis = allPeis.filter(p =>
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const days = [];

        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-black/20 border border-white/5 min-h-[100px]"></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="bg-black/20 border border-white/5 min-h-[100px] p-2 hover:bg-white/5 transition-colors group relative">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className="text-[10px] p-1 rounded bg-red-600/20 text-red-400 border border-red-600/20 truncate">
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-[#18181b] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <h2 className="text-xl font-black text-white uppercase">{firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-2 bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gestão Escolar</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="students" label="Alunos" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda" icon={Calendar} />
                    <SidebarItem id="pei" label="PEI (AEE)" icon={Heart} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-red-600/30 transition-all shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                            <Printer size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">{exam.teacherName} • {exam.gradeLevel} • <b className="text-white">{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 transition-all text-xs font-bold uppercase tracking-widest">PDF</a>
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateExam(exam, ExamStatus.COMPLETED)} className="rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest">Concluir</Button>
                                        ) : (
                                            <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20">Finalizado</span>
                                        )}
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
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Planos PEI (Inclusão)</h1>
                                <p className="text-gray-400">Documentos de Atendimento Educacional Especializado.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-red-600 w-64"
                                    placeholder="Buscar por aluno ou disciplina..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </header>
                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Aluno</th>
                                        <th className="p-6">Disciplina</th>
                                        <th className="p-6">Professor</th>
                                        <th className="p-6">Atualização</th>
                                        <th className="p-6 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredPeis.map(pei => (
                                        <tr key={pei.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{pei.studentName}</td>
                                            <td className="p-6 text-red-500 font-black uppercase text-xs">{pei.subject}</td>
                                            <td className="p-6 text-gray-400 font-medium">{pei.teacherName}</td>
                                            <td className="p-6 text-gray-500">{new Date(pei.updatedAt).toLocaleDateString()}</td>
                                            <td className="p-6 text-center">
                                                <button 
                                                    onClick={() => { setSelectedPei(pei); setShowPeiModal(true); }}
                                                    className="p-2 bg-white/5 hover:bg-red-600 hover:text-white rounded-lg transition-all text-gray-400"
                                                >
                                                    <Eye size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Planejamentos Pedagógicos</h1>
                                <p className="text-gray-400">Acompanhamento dos planos de aula semanais e bimestrais.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-red-600 w-64"
                                    placeholder="Filtrar planos..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 hover:border-red-600/30 transition-all shadow-xl group">
                                    <div className="flex justify-between mb-4">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${plan.type === 'daily' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-500'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-600">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white uppercase group-hover:text-red-500 transition-colors">{plan.className}</h3>
                                    <p className="text-xs text-gray-400 mb-4">Prof. {plan.teacherName} • <span className="text-white font-bold">{plan.subject}</span></p>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 h-20 overflow-hidden text-xs text-gray-500 italic">
                                        {plan.topic || plan.content || "Sem descrição informada"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                        </header>
                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Nome</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Presença Hoje</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{s.name}</td>
                                            <td className="p-6 text-gray-400 font-medium">{s.className}</td>
                                            <td className="p-6">
                                                {attendanceLogs.some(l => l.studentId === s.id) ? (
                                                    <span className="text-green-500 font-black text-[10px] uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Presente</span>
                                                ) : (
                                                    <span className="text-gray-600 font-black text-[10px] uppercase">Ausente</span>
                                                )}
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
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1>
                            <Button onClick={() => setShowEventModal(true)}><Plus size={16} className="mr-2"/> Novo Evento</Button>
                        </header>
                        {renderCalendar()}
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Configurações Globais</h1>
                        </header>
                        
                        <div className="space-y-8">
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <Activity size={32} className="text-green-500" />
                                        <h3 className="text-xl font-black text-white uppercase">Gatilho & Proxy WhatsApp</h3>
                                    </div>
                                    <Button variant="outline" onClick={handleTestWA} isLoading={isTestingWA} className="h-12 border-white/10 text-white font-black uppercase text-xs tracking-widest px-6 rounded-xl">
                                        <Send size={16} className="mr-2"/> Testar Disparo
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1"><Globe size={12} className="inline mr-1"/> Evolution URL</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={waBaseUrl} onChange={e => setWaBaseUrl(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1"><Key size={12} className="inline mr-1"/> Global API Key</label>
                                        <input type="password" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={waApiKey} onChange={e => setWaApiKey(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Instância</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={waInstance} onChange={e => setWaInstance(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Número Gráfica</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={waNumber} onChange={e => setWaNumber(e.target.value)} />
                                    </div>
                                </div>
                                <div className="bg-yellow-600/10 border border-yellow-500/20 p-5 rounded-3xl flex items-center justify-between">
                                    <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Ativar automações de notificação</p>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={waEnabled} onChange={e => setWaEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                    </label>
                                </div>
                            </div>
                            <Button onClick={handleSaveGlobalConfig} isLoading={isLoading} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/20">
                                <Save size={24} className="mr-3" /> Salvar Alterações Globais
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* PEI VIEW MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase">Visualização PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • {selectedPei.subject}</p>
                            </div>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-6">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Competências Essenciais</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPei.essentialCompetencies || "Nenhuma informada"}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Conteúdos Selecionados</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPei.selectedContents || "Nenhum informado"}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recursos Didáticos</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPei.didacticResources || "Nenhum informado"}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Avaliação</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPei.evaluation || "Nenhuma informada"}</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiModal(false)} className="bg-gray-800 hover:bg-black uppercase px-8">Fechar Documento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-white uppercase mb-6">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <div className="space-y-4">
                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" placeholder="Título" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                            <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                <option value="event">Evento</option>
                                <option value="holiday">Feriado</option>
                                <option value="exam">Prova</option>
                                <option value="meeting">Reunião</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setShowEventModal(false)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleSaveEvent}>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
