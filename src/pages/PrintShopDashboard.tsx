import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToSystemConfig, 
    updateSystemConfig,
    syncAllDataWithGennera
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig 
} from '../types';
import { 
    Printer, Search, Users, Settings, RefreshCw, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Truck, Save, X, Loader2, Megaphone, ToggleLeft, ToggleRight, Download
} from 'lucide-react';
import { Button } from '../components/Button';
import { CLASSES } from '../constants';

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-lg flex items-center gap-6">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${color}/20 text-${color}`}>
            <Icon size={32} />
        </div>
        <div>
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">{title}</p>
            <p className="text-4xl font-black text-white">{value}</p>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => {
    const statusInfo = {
        [ExamStatus.PENDING]: { text: 'Pendente', icon: Hourglass, color: 'yellow' },
        [ExamStatus.IN_PROGRESS]: { text: 'Em Produção', icon: Printer, color: 'blue' },
        [ExamStatus.READY]: { text: 'Pronto p/ Retirada', icon: ClipboardCheck, color: 'purple' },
        [ExamStatus.COMPLETED]: { text: 'Entregue', icon: CheckCircle, color: 'green' },
    }[status] || { text: status, icon: Clock, color: 'gray' };

    const Icon = statusInfo.icon;

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusInfo.color}-500/10 text-${statusInfo.color}-400 border-${statusInfo.color}-500/20`}>
            <Icon size={14} />
            {statusInfo.text}
        </span>
    );
};

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examSearch, setExamSearch] = useState('');

    const [students, setStudents] = useState<Student[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    useEffect(() => {
        const fetchInitial = async () => {
            setIsLoading(true);
            try {
                const [allExams, allStudents] = await Promise.all([ getExams(), getStudents() ]);
                setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
                setStudents(allStudents.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitial();

        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
        });
        return () => unsubConfig();
    }, []);

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };
    
    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
        };
        await updateSystemConfig(newConfig);
        alert("Configurações salvas!");
    };

    const handleSyncGennera = async () => {
        if (!confirm("Sincronizar dados com Gennera?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncMsg(msg));
            const allStudents = await getStudents();
            setStudents(allStudents);
        } catch (e) { console.error(e); } finally {
            setIsSyncing(false);
            setSyncMsg('');
        }
    };

    const filteredExams = exams.filter(e => 
        e.title.toLowerCase().includes(examSearch.toLowerCase()) || 
        e.teacherName.toLowerCase().includes(examSearch.toLowerCase())
    );

    const pendingExams = exams.filter(e => e.status === ExamStatus.PENDING).length;
    const inProgressExams = exams.filter(e => e.status === ExamStatus.IN_PROGRESS).length;
    const readyExams = exams.filter(e => e.status === ExamStatus.READY).length;
    const today = new Date().toDateString();
    const completedToday = exams.filter(e => e.status === ExamStatus.COMPLETED && new Date(e.createdAt).toDateString() === today).length;

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 flex-1 overflow-y-auto">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 ml-2">Escola & Cópias</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="config" label="Sistema" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-transparent custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Solicitações de professores em tempo real</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard title="Pendentes" value={pendingExams} icon={Hourglass} color="yellow-500" />
                            <StatCard title="Em Produção" value={inProgressExams} icon={Printer} color="blue-500" />
                            <StatCard title="Pronto p/ Retirada" value={readyExams} icon={ClipboardCheck} color="purple-400" />
                            <StatCard title="Concluídos Hoje" value={completedToday} icon={CheckCircle} color="green-500" />
                        </div>
                        
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-6 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">Todas as Solicitações</h3>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar prova ou professor..." className="pl-12 pr-6 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-600 outline-none w-80 transition-all" value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-6">Data</th>
                                            <th className="p-6">Professor / Material</th>
                                            <th className="p-6">Turma / Qtd</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredExams.map(exam => (
                                            <tr key={exam.id} className="hover:bg-white/[0.02] group">
                                                <td className="p-6 text-sm text-gray-500 font-bold">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                                <td className="p-6">
                                                    <p className="font-black text-white uppercase tracking-tight">{exam.title}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Prof. {exam.teacherName}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{exam.gradeLevel}</span>
                                                    <span className="ml-4 text-red-500 font-black text-lg">{exam.quantity}x</span>
                                                </td>
                                                <td className="p-6"><StatusBadge status={exam.status} /></td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a href={exam.fileUrls?.[0]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-10 w-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"><Download size={18}/></a>
                                                        {exam.status === ExamStatus.PENDING && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-blue-600 hover:!bg-blue-700">Produzir</Button>}
                                                        {exam.status === ExamStatus.IN_PROGRESS && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.READY)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-purple-600 hover:!bg-purple-700">Finalizar</Button>}
                                                        {exam.status === ExamStatus.READY && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-green-600 hover:!bg-green-700">Entregar</Button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                 {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Base de Alunos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Sincronização com ERP Gennera</p>
                            </div>
                            <div className="flex items-center gap-6">
                                {isSyncing && <p className="text-[9px] font-black text-blue-400 animate-pulse uppercase tracking-[0.2em]">{syncMsg}</p>}
                                <button onClick={handleSyncGennera} disabled={isSyncing} className="flex items-center gap-3 px-8 py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-2xl shadow-blue-900/40 transition-all">
                                    <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar Alunos
                                </button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                            {CLASSES.slice(0, 8).map(cls => (
                                <div key={cls} className="p-8 rounded-[2.5rem] border bg-[#18181b] border-white/5 text-gray-500 shadow-xl">
                                    <h3 className="text-xs font-black mb-3 uppercase tracking-widest text-white">{cls}</h3>
                                    <span className="bg-black/40 px-3 py-1 rounded-full text-[10px] font-mono border border-white/5">{students.filter(s => s.className === cls).length} Matrículas</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto">
                         <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações do Sistema</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes globais e comunicação</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-6"><Megaphone size={24} className="text-red-500"/> Banner de Avisos</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10">
                                        <label className="text-sm font-bold text-white uppercase tracking-widest">Ativar Banner Global</label>
                                        <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                                            {configIsBannerActive ? <ToggleRight size={32} className="text-green-500"/> : <ToggleLeft size={32} className="text-gray-600"/>}
                                            <span className={configIsBannerActive ? 'text-green-400' : 'text-gray-500'}>{configIsBannerActive ? 'Ativo' : 'Inativo'}</span>
                                        </button>
                                    </div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[120px]" placeholder="Digite a mensagem de aviso aqui..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}>
                                        <option value="info">Informativo (Azul)</option>
                                        <option value="warning">Atenção (Amarelo)</option>
                                        <option value="error">Urgente (Vermelho)</option>
                                        <option value="success">Sucesso (Verde)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-10 border-t border-white/10 flex justify-end">
                                <Button onClick={handleSaveConfig} className="h-16 px-12 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest"><Save size={18} className="mr-3"/> Salvar Alterações</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
