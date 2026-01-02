
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
    FileDown, Clock, Layers, Loader2, ScanLine, Heart, Save, Eye, Plus
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'config' | 'pei'>('exams');
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
        alert("Configurações aplicadas ao sistema!");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-full bg-[#0f0f10]">
            {/* SIDEBAR POLIDA */}
            <div className="w-72 bg-black/40 border-r border-white/10 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 ml-2">Painel de Gestão</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                </div>
                
                <div className="mt-auto p-5 bg-red-600/5 rounded-3xl border border-red-600/10">
                    <p className="text-[10px] font-black text-red-500 uppercase mb-3">Servidor Google Cloud</p>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-xs font-bold text-gray-300">Porta 8080 Ativa</span>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                        <header className="mb-12 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Fila de Provas</h1>
                                <p className="text-gray-400 text-lg">Pedidos de professores aguardando processamento na gráfica.</p>
                            </div>
                            <div className="bg-red-600/10 px-6 py-3 rounded-2xl border border-red-600/20 shadow-lg">
                                <span className="text-red-500 font-black text-xs uppercase tracking-widest">{exams.filter(e => e.status !== ExamStatus.COMPLETED).length} Pendentes</span>
                            </div>
                        </header>
                        
                        <div className="grid grid-cols-1 gap-5">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-red-600/40 transition-all shadow-2xl">
                                    <div className="flex items-center gap-8">
                                        <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <Printer size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                                            <p className="text-gray-400 font-medium uppercase text-xs tracking-wider mb-2">Prof. <b className="text-white">{exam.teacherName}</b> • {exam.gradeLevel}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase shadow-lg shadow-red-900/20">{exam.quantity} CÓPIAS</span>
                                                {exam.instructions && <span className="text-gray-500 text-[10px] font-bold uppercase italic">Obs: {exam.instructions}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {exam.fileUrl && (
                                            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="h-14 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all">
                                                <FileDown size={18} /> Arquivo
                                            </a>
                                        )}
                                        <Button 
                                            onClick={() => handleUpdateStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} 
                                            className={`h-14 px-8 ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'} rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl`}
                                        >
                                            {exam.status === ExamStatus.PENDING ? 'Iniciar' : 'Concluir'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).length === 0 && (
                                <div className="text-center py-32 opacity-20 flex flex-col items-center">
                                    <Layers size={100} className="mb-6" />
                                    <p className="text-2xl font-black uppercase tracking-[0.3em]">Gráfica Vazia</p>
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
                                <p className="text-gray-400 text-lg">Controle da base local de estudantes.</p>
                            </div>
                            <Button className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest"><Plus size={16} className="mr-2"/> Adicionar Aluno</Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                    <tr><th className="p-8">Nome do Aluno</th><th className="p-8">Turma</th><th className="p-8">AEE</th><th className="p-8 text-center">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-8 font-bold text-white uppercase text-sm tracking-tight">{s.name}</td>
                                            <td className="p-8"><span className="text-[10px] text-gray-400 font-black uppercase border border-white/10 px-4 py-1.5 rounded-full">{s.className}</span></td>
                                            <td className="p-8">{s.isAEE ? <Heart size={18} className="text-red-500 fill-red-500/20" /> : <span className="text-gray-700">-</span>}</td>
                                            <td className="p-8 text-center">
                                                <button className="p-2 text-gray-500 hover:text-white transition-colors"><Settings size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Documentos AEE</h1><p className="text-gray-400 text-lg">Planejamentos Educacionais Individualizados (PEIs) registrados.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {peis.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="h-14 w-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500"><Heart size={28} /></div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{p.period}</span>
                                    </div>
                                    <h3 className="font-bold text-white uppercase text-xl leading-tight mb-2">{p.studentName}</h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-6">Prof. {p.teacherName} • {p.subject}</p>
                                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-3"><Eye size={18}/> Ver Completo</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Sistema</h1><p className="text-gray-400 text-lg">Configurações de avisos e monitor de TV.</p></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3rem] shadow-2xl space-y-10">
                            <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2rem] border border-white/5 shadow-inner">
                                <span className="font-black text-white uppercase text-xs tracking-[0.2em]">Exibir Banner no Hall</span>
                                <button onClick={() => setIsBannerActive(!isBannerActive)} className={`w-16 h-10 rounded-full p-1.5 transition-all ${isBannerActive ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-gray-700'}`}>
                                    <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-all ${isBannerActive ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Texto do Aviso na TV</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 transition-all shadow-inner" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} placeholder="Digite o aviso para exibição pública..." />
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-18 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl bg-red-600 hover:bg-red-700 active:scale-95 transition-all"><Save size={24} className="mr-3"/> Salvar e Aplicar</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
