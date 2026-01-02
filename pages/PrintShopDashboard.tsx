
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
    Printer, Calendar, Users, Settings, X, CheckCircle, Activity, 
    FileDown, Clock, AlertTriangle, Layers, Loader2, RefreshCw,
    ScanLine, Heart, Save, Eye, Layout, Plus
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
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
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
            alert(`Leitura Concluída! Aluno ID: ${result.studentId || 'Não identificado'}`);
        } catch (err) { alert("Erro ao processar imagem."); }
        finally { setIsAnalyzing(false); }
    };

    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        };
        await updateSystemConfig(newConfig);
        alert("Configurações aplicadas!");
    };

    const handleSyncGennera = async () => {
        if (!confirm("Sincronizar base de alunos da Gennera agora?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização concluída com sucesso!");
            fetchInitialData();
        } catch (e: any) { alert("Falha na sincronização: " + e.message); }
        finally { setIsSyncing(false); setSyncProgress(''); }
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10'}`}
        >
            <Icon size={18} />
            <span>label</span>
        </button>
    );

    return (
        <div className="flex h-full bg-[#0f0f10]">
            {/* SIDEBAR FIXED */}
            <div className="w-64 bg-black/40 border-r border-white/10 p-6 flex flex-col h-full shrink-0 z-20">
                <div className="mb-8">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Painel Gestão</p>
                    <SidebarItem id="exams" label="Fila da Gráfica" icon={Printer} />
                    <SidebarItem id="students" label="Alunos Gennera" icon={Users} />
                    <SidebarItem id="omr" label="Correção via IA" icon={ScanLine} />
                    <SidebarItem id="pei" label="AEE / PEIs" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                </div>
                
                <div className="mt-auto p-4 bg-red-600/5 rounded-2xl border border-red-600/10">
                    <p className="text-[10px] font-black text-red-500 uppercase mb-2">Status do Servidor</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-300">Proxy 8080 Ativo</span>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila de Impressão</h1><p className="text-gray-400">Solicitações de professores prontas para impressão.</p></header>
                        <div className="grid grid-cols-1 gap-4">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-red-600/40 transition-all shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}><Printer size={28} /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white uppercase">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm font-medium uppercase tracking-tight">Prof. <b className="text-white">{exam.teacherName}</b> • {exam.gradeLevel} • <span className="text-red-500 font-black">{exam.quantity} Cópias</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {exam.fileUrl && (<a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><FileDown size={14} /> Baixar PDF</a>)}
                                        <Button onClick={() => handleUpdateStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : ''} rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest`}>{exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}</Button>
                                    </div>
                                </div>
                            ))}
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).length === 0 && (
                                <div className="text-center py-24 opacity-20"><Layers size={80} className="mx-auto mb-4" /><p className="text-2xl font-black uppercase tracking-widest">Gráfica Limpa</p></div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10 flex justify-between items-end">
                            <div><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Base de Alunos</h1><p className="text-gray-400">Sincronização com o sistema oficial Gennera.</p></div>
                            <Button onClick={handleSyncGennera} isLoading={isSyncing} className="rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest"><RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Sincronizar Agora</Button>
                        </header>
                        {isSyncing && <div className="p-6 mb-6 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 font-black text-center uppercase text-xs tracking-widest animate-pulse">{syncProgress || 'Iniciando...'}</div>}
                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-6">Nome Completo</th><th className="p-6">Turma Atual</th><th className="p-6">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.slice(0, 50).map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase text-sm tracking-tight">{s.name}</td>
                                            <td className="p-6"><span className="text-[10px] text-gray-400 font-black uppercase border border-white/10 px-3 py-1 rounded-full">{s.className}</span></td>
                                            <td className="p-6"><span className="text-[10px] text-green-500 font-black uppercase flex items-center gap-2"><CheckCircle size={12}/> OK</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                        <header className="mb-10"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Correção via IA</h1><p className="text-gray-400">Escaneie os cartões e deixe a inteligência artificial corrigir.</p></header>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                             <div className="bg-[#18181b] border border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Gabaritos Ativos</h3>
                                <div className="space-y-2">
                                    {answerKeys.map(key => (
                                        <button key={key.id} onClick={() => setSelectedKey(key)} className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedKey?.id === key.id ? 'bg-red-600 border-red-500 shadow-xl' : 'bg-black/20 border-white/5 hover:border-red-600/40'}`}>
                                            <p className="font-bold text-white uppercase text-sm">{key.title}</p>
                                            <p className="text-[10px] text-gray-500 font-black uppercase">{key.className} • {key.subject}</p>
                                        </button>
                                    ))}
                                </div>
                             </div>
                             <div className="lg:col-span-2 flex items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-black/20 relative group">
                                {selectedKey ? (
                                    <div className="text-center p-12">
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleOCRProcess} disabled={isAnalyzing} />
                                        {isAnalyzing ? <Loader2 size={64} className="animate-spin text-red-600 mx-auto" /> : <ScanLine size={80} className="text-gray-700 group-hover:text-red-600 transition-colors mx-auto mb-6" />}
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Clique para Escanear</h3>
                                        <p className="text-gray-500 text-sm mt-2 font-medium">Cartão para: {selectedKey.title}</p>
                                    </div>
                                ) : (
                                    <div className="text-center opacity-30"><AlertTriangle size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest">Selecione um Gabarito</p></div>
                                )}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Arquivos AEE</h1><p className="text-gray-400">Documentos e Planejamentos Educacionais Individualizados (PEIs).</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {peis.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 shadow-xl hover:border-red-600/40 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500"><Heart size={24} /></div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase">PEI 2024</span>
                                    </div>
                                    <h3 className="font-bold text-white uppercase text-lg leading-tight mb-1">{p.studentName}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Prof. {p.teacherName} • {p.subject}</p>
                                    <div className="text-xs text-gray-400 bg-black/40 p-4 rounded-xl border border-white/5 italic line-clamp-2 mb-6">{p.essentialCompetencies}</div>
                                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2"><Eye size={14}/> Abrir Completo</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-10 flex justify-between items-end">
                            <div><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1><p className="text-gray-400">Eventos, reuniões e feriados cadastrados.</p></div>
                            <Button className="rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest"><Plus size={16} className="mr-2"/> Novo Evento</Button>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(ev => (
                                <div key={ev.id} className="bg-[#18181b] border border-white/5 p-8 rounded-3xl shadow-xl hover:border-red-600/20 transition-all group">
                                    <div className={`text-[10px] font-black uppercase tracking-widest mb-4 inline-block px-3 py-1 rounded-full ${ev.type === 'holiday' ? 'bg-red-600/10 text-red-500' : 'bg-blue-600/10 text-blue-500'}`}>{ev.type}</div>
                                    <h3 className="text-white font-black uppercase text-xl mb-4 group-hover:text-red-500 transition-colors">{ev.title}</h3>
                                    <p className="text-gray-500 text-sm font-bold flex items-center gap-2 tracking-tight"><Calendar size={16} className="text-red-600"/> {ev.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-10"><h1 className="text-3xl font-black text-white uppercase tracking-tighter">Configurações</h1><p className="text-gray-400">Ajustes globais do sistema de TV e alertas.</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                                <span className="font-bold text-white uppercase text-sm tracking-tight">Ativar Banner na TV (Hall)</span>
                                <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className={`w-14 h-8 rounded-full p-1 transition-all ${configIsBannerActive ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all ${configIsBannerActive ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Mensagem do Comunicado</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all placeholder:text-gray-700" rows={4} value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Digite o aviso para a TV..." />
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl bg-red-600 hover:bg-red-700"><Save size={20} className="mr-2"/> Salvar Sistema</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
