
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
    getAllPEIs,
    syncAllDataWithGennera
} from '../services/firebaseService';
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
    BookOpenCheck, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    Activity,
    Heart,
    Eye,
    RefreshCw,
    Megaphone
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'pei' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    // --- DATA STATES ---
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    
    // --- CONFIG LOCAL STATES ---
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [bannerActive, setBannerActive] = useState(false);

    // --- CALENDAR STATES ---
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');

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
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setBannerActive(cfg.isBannerActive || false);
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

    const handleSyncGennera = async () => {
        if (!confirm("Isso irá puxar todos os alunos e turmas do sistema Gennera. Continuar?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização concluída!");
            fetchInitialData();
        } catch (e: any) {
            alert(`Erro na Sincronização: ${e.message}`);
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    const handleUpdateExam = async (exam: ExamRequest, status: ExamStatus) => {
        await updateExamStatus(exam.id, status);
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
                isBannerActive: bannerActive
            });
            alert("Configurações atualizadas!");
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
            type: 'event',
            tasks: []
        };
        await saveSchoolEvent(ev);
        setShowEventModal(false);
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
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

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Administração</p>
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
                                    placeholder="Buscar por aluno..."
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
                                        <th className="p-6 text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredPeis.map(pei => (
                                        <tr key={pei.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{pei.studentName}</td>
                                            <td className="p-6 text-red-500 font-black uppercase text-xs">{pei.subject}</td>
                                            <td className="p-6 text-gray-400 font-medium">{pei.teacherName}</td>
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

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                            <div className="flex gap-4">
                                <Button onClick={handleSyncGennera} isLoading={isSyncing} variant="outline" className="border-white/10 text-white font-black uppercase text-xs px-6 rounded-xl">
                                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Sincronizar Gennera
                                </Button>
                            </div>
                        </header>
                        {isSyncing && (
                            <div className="mb-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 font-bold text-center animate-pulse">
                                {syncProgress || 'Iniciando sincronização...'}
                            </div>
                        )}
                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Nome</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Situação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{s.name}</td>
                                            <td className="p-6 text-gray-400 font-medium">{s.className}</td>
                                            <td className="p-6">
                                                <span className="text-green-500 font-black text-[10px] uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Regular</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Configurações Globais</h1>
                        </header>
                        <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                            <div className="pb-6 border-b border-white/5">
                                <h3 className="text-xl font-black text-white uppercase flex items-center gap-2"><Megaphone size={20} className="text-red-500"/> Banner de Avisos</h3>
                                <div className="mt-6 space-y-4">
                                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Exibir banner no sistema</span>
                                        <input type="checkbox" checked={bannerActive} onChange={e => setBannerActive(e.target.checked)} className="w-6 h-6 rounded border-white/10 bg-black/40" />
                                    </div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} placeholder="Mensagem de aviso..."/>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={bannerType} onChange={e => setBannerType(e.target.value as any)}>
                                        <option value="info">Informação (Azul)</option>
                                        <option value="warning">Alerta (Amarelo)</option>
                                        <option value="error">Erro (Vermelho)</option>
                                        <option value="success">Sucesso (Verde)</option>
                                    </select>
                                </div>
                            </div>
                            <Button onClick={handleSaveGlobalConfig} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest bg-red-600 hover:bg-red-700">
                                <Save size={24} className="mr-3" /> Salvar Configurações
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* PEI MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase">Visualização PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • {selectedPei.subject}</p>
                            </div>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-6 text-gray-900">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Competências Essenciais</h4>
                                <p className="text-sm">{selectedPei.essentialCompetencies || "Nenhuma informada"}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Conteúdos</h4>
                                <p className="text-sm">{selectedPei.selectedContents || "Nenhum informado"}</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiModal(false)} className="bg-gray-800 hover:bg-black uppercase px-8">Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
