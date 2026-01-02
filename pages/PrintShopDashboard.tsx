import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent,
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
    FileDown, Clock, Layers, Loader2, Heart, Save, Eye, Plus, ChevronRight
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    
    // Config states
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubEvents = listenToEvents(setEvents);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        getAllPEIs().then(setPeis);
        setIsLoading(false);

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

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: bannerMsg,
            bannerType: bannerType,
            isBannerActive: isBannerActive
        });
        alert("Configurações do sistema aplicadas com sucesso!");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all mb-1 group ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
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
            {/* SIDEBAR FIXA PREMIUM */}
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Gestão Administrativa</p>
                    <SidebarItem id="exams" label="Gráfica Escolar" icon={Printer} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda & Eventos" icon={Calendar} />
                    <SidebarItem id="config" label="Configuração TV" icon={Settings} />
                </div>
                
                <div className="mt-auto p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Servidor Nuvem</p>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Google Cloud Active</span>
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
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie os pedidos enviados pela equipe docente.</p>
                            </div>
                            <div className="bg-red-600/10 px-8 py-3 rounded-2xl border border-red-600/20 shadow-lg">
                                <span className="text-red-500 font-black text-xs uppercase tracking-widest">{exams.filter(e => e.status !== ExamStatus.COMPLETED).length} Trabalhos Pendentes</span>
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
                                                {exam.instructions && <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Obs: {exam.instructions}</span>}
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
                                            className={`h-16 px-10 ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600 shadow-green-900/40' : 'bg-red-600 shadow-red-900/40'} rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95`}
                                        >
                                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).length === 0 && (
                                <div className="text-center py-40 opacity-20 flex flex-col items-center">
                                    <Layers size={120} className="mb-8" />
                                    <p className="text-3xl font-black uppercase tracking-[0.4em]">Fila Vazia</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Base de Alunos</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Dados cadastrais de todos os estudantes matriculados.</p>
                            </div>
                            <Button className="h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-red-600 shadow-lg shadow-red-900/20"><Plus size={18} className="mr-3"/> Novo Registro</Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-[0.3em] border-b border-white/5">
                                    <tr><th className="p-10">Nome Completo</th><th className="p-10">Turma</th><th className="p-10">AEE</th><th className="p-10 text-center">Situação</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="p-10 font-bold text-white uppercase text-sm tracking-tight">{s.name}</td>
                                            <td className="p-10 font-black text-[10px] text-gray-400 uppercase tracking-widest">{s.className}</td>
                                            <td className="p-10">{s.isAEE ? <Heart size={20} className="text-red-500 fill-red-500/20" /> : <span className="text-gray-800">-</span>}</td>
                                            <td className="p-10 text-center"><span className="text-[10px] text-green-500 font-black uppercase bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">Ativo</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Documentos AEE</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Controle de Planejamentos Educacionais Individualizados.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {peis.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-2xl hover:border-red-600/30 transition-all flex flex-col justify-between group">
                                    <div>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="h-16 w-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Heart size={32} /></div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{p.period}</span>
                                        </div>
                                        <h3 className="font-black text-white uppercase text-xl leading-tight mb-3 tracking-tighter">{p.studentName}</h3>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-10">Prof. {p.teacherName} • {p.subject}</p>
                                    </div>
                                    <button className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-3"><Eye size={18}/> Abrir PEI</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Comunicados TV</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Configure os avisos do monitor principal do Hall.</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 shadow-inner">
                                <span className="font-black text-white uppercase text-xs tracking-[0.3em]">Ativar Banner Hall</span>
                                <button onClick={() => setIsBannerActive(!isBannerActive)} className={`w-18 h-10 rounded-full p-1.5 transition-all ${isBannerActive ? 'bg-red-600 shadow-[0_0_25px_rgba(220,38,38,0.5)]' : 'bg-gray-700'}`}>
                                    <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-all ${isBannerActive ? 'translate-x-8' : ''}`} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem Principal</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all shadow-inner text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} placeholder="Digite o aviso para exibição na TV..." />
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl bg-red-600 hover:bg-red-700 active:scale-95 transition-all"><Save size={24} className="mr-4"/> Aplicar Configuração</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};