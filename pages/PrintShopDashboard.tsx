
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    syncAllDataWithGennera,
    getAllPEIs
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig, 
    SchoolEvent,
    PEIDocument
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Calendar, Users, Settings, X, CheckCircle, 
    FileDown, Clock, Layers, Loader2, Heart, Save, Eye, Plus, RefreshCw, ChevronRight
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    
    // Config states
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    useEffect(() => {
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubEvents = listenToEvents(setEvents);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        getAllPEIs().then(setPeis);

        return () => {
            unsubExams();
            unsubStudents();
            unsubEvents();
            unsubConfig();
        };
    }, []);

    const handleUpdateStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera(setSyncMsg);
            alert("Sincronização com Gennera concluída!");
        } catch (e) {
            alert("Erro ao conectar com Cloud Run/Gennera.");
        } finally {
            setIsSyncing(false);
            setSyncMsg('');
        }
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: bannerMsg,
            bannerType: bannerType,
            isBannerActive: isBannerActive
        });
        alert("Configurações aplicadas!");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <div className="flex items-center gap-4 font-black text-[10px] uppercase tracking-widest">
                <Icon size={18} />
                <span>{label}</span>
            </div>
            {activeTab === id && <ChevronRight size={14} className="animate-pulse" />}
        </button>
    );

    return (
        <div className="flex h-full bg-[#0f0f10]">
            {/* SIDEBAR PREMIUM */}
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Gráfica Escolar" icon={Printer} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda & Eventos" icon={Calendar} />
                    <SidebarItem id="config" label="Configuração TV" icon={Settings} />
                </div>
                
                <div className="mt-auto p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Google Cloud</p>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Cloud Run Active</span>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                        <header className="mb-12 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Fila de Impressão</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie os pedidos de cópias da equipe docente.</p>
                            </div>
                        </header>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 flex items-center justify-between group hover:border-red-600/40 transition-all shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                                    <div className="flex items-center gap-10">
                                        <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center shadow-2xl ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                            <Printer size={40} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel}</p>
                                            <div className="flex items-center gap-6 mt-4">
                                                <span className="bg-red-600 text-white font-black text-xs px-5 py-2 rounded-xl uppercase shadow-lg shadow-red-900/20">{exam.quantity} CÓPIAS</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {exam.fileUrl && (
                                            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="h-16 px-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all">
                                                <FileDown size={20} /> Ver Arquivo
                                            </a>
                                        )}
                                        <Button 
                                            onClick={() => handleUpdateStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} 
                                            className={`h-16 px-10 ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'} rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl`}
                                        >
                                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Base de Alunos</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Sincronização direta com Gennera via Cloud Run.</p>
                            </div>
                            <Button onClick={handleSync} isLoading={isSyncing} className="h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-blue-600 shadow-lg shadow-blue-900/20">
                                <RefreshCw size={18} className={`mr-3 ${isSyncing ? 'animate-spin' : ''}`}/> {isSyncing ? syncMsg : 'Sincronizar Gennera'}
                            </Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-[0.3em] border-b border-white/5">
                                    <tr><th className="p-10">Nome Completo</th><th className="p-10">Turma</th><th className="p-10">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="p-10 font-bold text-white uppercase text-sm tracking-tight">{s.name}</td>
                                            <td className="p-10 font-black text-[10px] text-gray-400 uppercase tracking-widest">{s.className}</td>
                                            <td className="p-10 text-green-500 font-black uppercase text-[10px]">Sincronizado</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Sistema TV</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                <span className="font-black text-white uppercase text-xs tracking-[0.3em]">Exibir Banner Hall</span>
                                <button onClick={() => setIsBannerActive(!isBannerActive)} className={`w-18 h-10 rounded-full p-1.5 transition-all ${isBannerActive ? 'bg-red-600' : 'bg-gray-700'}`}>
                                    <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-all ${isBannerActive ? 'translate-x-8' : ''}`} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem de Aviso</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} placeholder="Digite o aviso para a TV..." />
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl bg-red-600 active:scale-95 transition-all"><Save size={24} className="mr-4"/> Salvar e Aplicar</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
