
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
    getAnswerKeys,
    saveAnswerKey,
    deleteAnswerKey,
    saveCorrection,
    getCorrections,
    deleteExamRequest,
    getAllPEIs,
    syncAllDataWithGennera
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
    PEIDocument
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Search, Calendar, Users, Settings, Megaphone, Trash2, 
    BookOpenCheck, Plus, ChevronLeft, ChevronRight, Save, X, 
    CheckCircle, XCircle, ScanLine, Target, GraduationCap, Download,
    FileText, Clock, ClipboardCheck, Eye, Loader2, CalendarDays,
    Layers, QrCode, FileDown, Image as ImageIcon, ExternalLink, Heart, RefreshCw, Server, AlertTriangle
} from 'lucide-center';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'config' | 'omr' | 'pei'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Common States (simplificados para brevidade)
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);

    // Config Banner States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    useEffect(() => {
        fetchInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        const unsubEvents = listenToEvents(setEvents);
        return () => { unsubAttendance(); unsubConfig(); unsubEvents(); };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allStudents, allExams, allPlans, allKeys, peisData] = await Promise.all([
                getStudents(),
                getExams(),
                getLessonPlans(),
                getAnswerKeys(),
                getAllPEIs()
            ]);
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
            setAnswerKeys(allKeys);
            setAllPeis(peisData.sort((a,b) => b.updatedAt - a.updatedAt));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncGennera = async () => {
        if (!confirm("Isso irá atualizar todos os alunos com base na Gennera. Continuar?")) return;
        setIsSyncing(true);
        setSyncError(null);
        setSyncMessage("Iniciando...");
        
        try {
            await syncAllDataWithGennera((msg) => setSyncMessage(msg));
            await fetchInitialData();
            setTimeout(() => setSyncMessage(''), 5000);
        } catch (e: any) {
            setSyncError(e.message || "Erro na sincronização.");
            setSyncMessage('');
        } finally {
            setIsSyncing(false);
        }
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

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Administração</p>
                    <SidebarItem id="exams" label="Gráfica / Pedidos" icon={Printer} />
                    <SidebarItem id="omr" label="Correção I.A." icon={ScanLine} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Printer className="text-red-500" /> Gráfica e Cópias</h1>
                            <p className="text-gray-400">Gerenciamento de pedidos de impressão.</p>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex items-center justify-between gap-6 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}><FileText size={32} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">Prof. {exam.teacherName} • {exam.gradeLevel} • <b>{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400"><Download size={20} /></a>
                                        <button onClick={() => deleteExamRequest(exam.id)} className="p-3 text-gray-500 hover:text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-bold text-white uppercase flex items-center gap-3"><Settings className="text-red-500" /> Configurações</h1></header>
                        
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-12 shadow-2xl">
                            {/* SYNC SECTION */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                    <Server size={24} className="text-red-500" />
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Integração Gennera</h2>
                                </div>
                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                                    <p className="text-sm text-gray-400 mb-6">Importe alunos, turmas e fotos biométricas do sistema de gestão escolar Gennera (ID 891).</p>
                                    
                                    <div className="flex flex-col gap-4">
                                        <Button 
                                            onClick={handleSyncGennera} 
                                            isLoading={isSyncing}
                                            className="h-16 rounded-2xl text-lg font-black uppercase shadow-xl shadow-red-900/20"
                                        >
                                            <RefreshCw size={24} className={`mr-3 ${isSyncing ? 'animate-spin' : ''}`} />
                                            {isSyncing ? 'Sincronizando...' : 'Sincronizar Gennera'}
                                        </Button>

                                        {syncMessage && (
                                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                                                <Loader2 size={18} className="text-blue-500 animate-spin" />
                                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{syncMessage}</p>
                                            </div>
                                        )}

                                        {syncError && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <AlertTriangle size={18} />
                                                    <p className="text-xs font-black uppercase tracking-widest">Falha na Sincronização</p>
                                                </div>
                                                <p className="text-xs text-red-300 font-medium">{syncError}</p>
                                                <p className="text-[10px] text-gray-500 mt-1 italic">Dica: Verifique se o Token JWT está correto ou se o servidor da Gennera permite acesso via navegador.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* COMUNICADOS SECTION */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                    <Megaphone size={24} className="text-red-500" />
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Comunicados na TV</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" className="h-6 w-6 rounded border-white/10 bg-black text-red-600" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)}/>
                                        <label className="text-lg font-bold text-white uppercase">Ativar Comunicado</label>
                                    </div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" rows={3} value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Ex: Matrículas Abertas..."/>
                                    <Button onClick={async () => { await updateSystemConfig({ bannerMessage: configBannerMsg, bannerType: configBannerType, isBannerActive: configIsBannerActive }); alert("Salvo!"); }} className="w-full h-14 rounded-2xl font-black uppercase">Salvar Comunicado</Button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
