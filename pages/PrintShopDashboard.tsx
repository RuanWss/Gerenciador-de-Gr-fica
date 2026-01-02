
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera,
    getAnswerKeys,
    getAllPEIs
} from '../services/firebaseService';
import { analyzeAnswerSheet } from '../services/geminiService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    SystemConfig, 
    SchoolEvent,
    AnswerKey,
    PEIDocument
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Search, Calendar, Users, Settings, Plus, ChevronLeft, ChevronRight,
    Save, X, CheckCircle, Activity, FileDown, Clock, AlertTriangle, Layers, Loader2, RefreshCw,
    ScanLine, Heart, BookOpen, Trash2, Eye, Megaphone
} from 'lucide-react';
import { CLASSES } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'omr' | 'pei' | 'calendar' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

    // Config form states
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);
    
    // OCR State
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        fetchInitialData();
        const unsubEvents = listenToEvents(setEvents);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        return () => { unsubEvents(); unsubConfig(); };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, keys, allPeis] = await Promise.all([
                getExams(),
                getStudents(),
                getAnswerKeys(),
                getAllPEIs()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setAnswerKeys(keys);
            setPeis(allPeis);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleUpdateStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleOCRProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedKey || !e.target.files?.[0]) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeAnswerSheet(e.target.files[0], Object.keys(selectedKey.answers).length);
            alert(`Leitura Concluída! Aluno: ${result.studentId || 'N/A'}`);
        } catch (err) { alert("Erro ao processar cartão."); }
        finally { setIsAnalyzing(false); }
    };

    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        };
        await updateSystemConfig(newConfig);
        alert("Configurações salvas!");
    };

    const handleSyncGennera = async () => {
        if (!confirm("Sincronizar Gennera agora?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização concluída!");
            fetchInitialData();
        } catch (e: any) { alert(e.message); }
        finally { setIsSyncing(false); setSyncProgress(''); }
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
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                 <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gestão Escolar</p>
                    <SidebarItem id="exams" label="Fila da Gráfica" icon={Printer} />
                    <SidebarItem id="students" label="Alunos / Sincronia" icon={Users} />
                    <SidebarItem id="omr" label="Correção de Provas" icon={ScanLine} />
                    <SidebarItem id="pei" label="AEE / PEIs" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-transparent custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila da Gráfica</h1><p className="text-gray-400">Solicitações de impressão recebidas.</p></header>
                        <div className="grid grid-cols-1 gap-4">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-[2rem] p-6 flex items-center justify-between group hover:border-red-600/30 transition-all shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}><Printer size={32} /></div>
                                        <div><h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3><p className="text-gray-400 text-sm font-medium uppercase tracking-tight">Prof. <b className="text-white">{exam.teacherName}</b> • {exam.gradeLevel} • <span className="text-red-500 font-black">{exam.quantity} CÓPIAS</span></p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {exam.fileUrl && (<a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2"><FileDown size={14} /> Abrir Material</a>)}
                                        <Button onClick={() => handleUpdateStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : ''} rounded-xl px-8 h-12 font-black uppercase text-xs`}>{exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1><p className="text-gray-400">Visualize eventos e feriados.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(ev => (
                                <div key={ev.id} className="bg-[#18181b] border border-white/5 p-6 rounded-3xl shadow-xl">
                                    <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{ev.type}</span>
                                    <h3 className="text-white font-bold uppercase mb-2">{ev.title}</h3>
                                    <p className="text-gray-500 text-xs font-black flex items-center gap-2"><Calendar size={14}/> {ev.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Configurações</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <span className="font-bold text-white uppercase text-sm">Banner na TV Principal</span>
                                <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className={`w-14 h-8 rounded-full p-1 transition-all ${configIsBannerActive ? 'bg-red-600' : 'bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all ${configIsBannerActive ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Mensagem do Banner</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold" rows={3} value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl"><Save size={18} className="mr-2"/> Salvar Sistema</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Integração Gennera</h1><p className="text-gray-400">Sincronize o banco de dados oficial.</p></div>
                            <Button onClick={handleSyncGennera} isLoading={isSyncing} className="rounded-xl px-8 h-12 font-black uppercase text-xs"><RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Sincronizar Tudo</Button>
                        </header>
                        {isSyncing && <div className="p-4 mb-4 bg-blue-600/20 text-blue-400 rounded-xl font-bold text-center animate-pulse">{syncProgress}</div>}
                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-6">Nome do Aluno</th><th className="p-6">Turma</th><th className="p-6">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.slice(0, 50).map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase text-sm">{s.name}</td>
                                            <td className="p-6"><span className="text-xs text-gray-400 font-bold uppercase">{s.className}</span></td>
                                            <td className="p-6"><span className="text-[10px] text-green-500 font-black uppercase">Sincronizado</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4 text-center py-20 opacity-40">
                        <ScanLine size={80} className="mx-auto mb-4 text-red-600"/>
                        <h2 className="text-2xl font-black text-white uppercase">Módulo de Correção Ativo</h2>
                        <p className="text-gray-500">Selecione um gabarito para iniciar a leitura por IA.</p>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4 text-center py-20 opacity-40">
                        <Heart size={80} className="mx-auto mb-4 text-red-600"/>
                        <h2 className="text-2xl font-black text-white uppercase">Acompanhamento AEE</h2>
                        <p className="text-gray-500">Consulte os PEIs e documentos de alunos especiais.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
