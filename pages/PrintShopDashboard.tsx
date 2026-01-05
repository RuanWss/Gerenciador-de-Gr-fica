
import React, { useState, useEffect } from 'react';
import { 
    listenToExams, 
    updateExamStatus, 
    getStudents, 
    listenToStudents,
    listenToAttendanceLogs, 
    getLessonPlans, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera,
    getAllPEIs,
    cleanupSemesterExams
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
    Heart,
    RefreshCw,
    ExternalLink,
    FileDown,
    RotateCcw,
    ChevronRight as ChevronIcon,
    AlertTriangle,
    Eraser
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'plans' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [isCleaning, setIsCleaning] = useState(false);

    // Data states
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    
    // Filters
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    // Config states
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubEvents = listenToEvents(setEvents);
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        getAllPEIs().then(setPeis);
        getLessonPlans().then(setPlans);

        return () => {
            unsubExams();
            unsubStudents();
            unsubEvents();
            unsubAttendance();
            unsubConfig();
        };
    }, []);

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera(setSyncMsg);
            alert("Sincronização concluída com sucesso!");
        } catch (e: any) {
            console.error(e);
            alert(`Erro na sincronização: ${e.message}`);
        } finally {
            setIsSyncing(false);
            setSyncMsg('');
        }
    };

    const handleSemesterCleanup = async (semester: 1 | 2) => {
        const year = new Date().getFullYear();
        const semName = semester === 1 ? "1º Semestre (Jan-Jun)" : "2º Semestre (Jul-Dez)";
        
        if (!confirm(`ATENÇÃO: Deseja apagar permanentemente todos os pedidos de impressão do ${semName} de ${year}? Esta ação não pode ser desfeita.`)) return;
        
        setIsCleaning(true);
        try {
            const count = await cleanupSemesterExams(semester, year);
            alert(`Limpeza concluída! ${count} registros foram removidos.`);
        } catch (e) {
            alert("Erro ao realizar limpeza.");
        } finally {
            setIsCleaning(false);
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
            {activeTab === id && <ChevronIcon size={14} className="animate-pulse" />}
        </button>
    );

    // Filter Logic
    const filteredExams = exams.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeExams = filteredExams.filter(e => e.status !== ExamStatus.COMPLETED).sort((a, b) => b.createdAt - a.createdAt);
    const finishedExams = filteredExams.filter(e => e.status === ExamStatus.COMPLETED).sort((a, b) => b.createdAt - a.createdAt);

    const ExamCard = ({ exam }: { exam: ExamRequest; key?: React.Key }) => (
        <div className={`bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 group hover:border-red-600/40 transition-all shadow-2xl relative overflow-hidden ${exam.status === ExamStatus.COMPLETED ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${exam.status === ExamStatus.COMPLETED ? 'bg-green-600' : 'bg-red-600'}`}></div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center border ${
                        exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                        {exam.status === ExamStatus.COMPLETED ? <CheckCircle size={40} /> : <Printer size={40} />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel}</p>
                        <p className="text-red-500 font-black text-xs uppercase mt-2">{exam.quantity} CÓPIAS</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {exam.status !== ExamStatus.COMPLETED ? (
                        <Button onClick={() => handleUpdateExamStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'}`}>
                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                        </Button>
                    ) : (
                        <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.PENDING)} className="h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 border border-white/5">
                            <RotateCcw size={16} /> Reabrir
                        </button>
                    )}
                </div>
            </div>
            {exam.fileUrls && exam.fileUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {exam.fileUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                            <span className="text-[10px] font-bold text-gray-300 uppercase truncate">{exam.fileNames?.[idx] || 'Arquivo'}</span>
                            <FileDown size={16} className="text-blue-500" />
                        </a>
                    ))}
                </div>
            )}
            {exam.instructions && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Observações:</p>
                    <p className="text-xs text-gray-300 italic">"{exam.instructions}"</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configuração TV" icon={Settings} />
                </div>
                <div className="mt-auto p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Status Gráfica</p>
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Operante</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie o fluxo de trabalho da gráfica.</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm"
                                    placeholder="Buscar por Professor, Título ou Turma..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </header>

                        {/* ATIVOS */}
                        <div className="mb-16">
                            <h2 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                <Printer size={18}/> Fila de Produção
                                <div className="h-px bg-red-600/20 flex-1"></div>
                            </h2>
                            <div className="grid grid-cols-1 gap-8">
                                {activeExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
                                {activeExams.length === 0 && (
                                    <div className="py-12 bg-[#18181b] rounded-3xl border border-dashed border-white/10 text-center">
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Tudo em dia! Sem pedidos pendentes.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HISTORICO */}
                        <div className="mb-12">
                            <h2 className="text-sm font-black text-green-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                <CheckCircle size={18}/> Concluídos recentemente
                                <div className="h-px bg-green-600/20 flex-1"></div>
                            </h2>
                            <div className="grid grid-cols-1 gap-8">
                                {finishedExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
                            </div>
                        </div>
                    </div>
                )}

                {/* ALUNOS */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Base de dados sincronizada com Gennera.</p>
                            </div>
                            <Button onClick={handleSync} isLoading={isSyncing} className="h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-blue-600 shadow-xl shadow-blue-900/20">
                                <RefreshCw size={18} className={`mr-3 ${isSyncing ? 'animate-spin' : ''}`}/> {isSyncing ? syncMsg : 'Sincronizar Gennera'}
                            </Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-[0.3em] border-b border-white/5">
                                    <tr><th className="p-10">Nome</th><th className="p-10">Turma</th><th className="p-10">Frequência</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="p-10 font-bold text-white uppercase text-sm">{s.name}</td>
                                            <td className="p-10 font-black text-[10px] text-gray-400 uppercase tracking-widest">{s.className}</td>
                                            <td className="p-10">
                                                {attendanceLogs.some(l => l.studentId === s.id) ? 
                                                    <span className="text-green-500 font-black text-[10px] uppercase">Presente</span> : 
                                                    <span className="text-gray-600 font-black text-[10px] uppercase">Ausente</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CONFIGURAÇÕES / CONFIG */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações do Sistema</h1></header>
                        
                        <div className="space-y-8">
                            {/* TV BANNER */}
                            <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <Megaphone className="text-red-600" /> Banner de Avisos (TV)
                                </h3>
                                <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                    <span className="font-black text-white uppercase text-xs tracking-[0.3em]">Exibir Banner Hall</span>
                                    <button onClick={() => setIsBannerActive(!isBannerActive)} className={`w-18 h-10 rounded-full p-1.5 transition-all ${isBannerActive ? 'bg-red-600' : 'bg-gray-700'}`}>
                                        <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-all ${isBannerActive ? 'translate-x-8' : ''}`} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem de Aviso</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} />
                                </div>
                                <Button onClick={handleSaveConfig} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl bg-red-600"><Save size={24} className="mr-4"/> Aplicar na Rede</Button>
                            </div>

                            {/* DATA MANAGEMENT / CLEANUP */}
                            <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <Eraser className="text-yellow-500" /> Manutenção de Dados
                                </h3>
                                <div className="p-8 bg-yellow-500/5 rounded-[2rem] border border-yellow-500/20 flex items-start gap-4">
                                    <AlertTriangle className="text-yellow-500 shrink-0" size={32} />
                                    <div>
                                        <p className="text-yellow-500 font-black uppercase text-xs tracking-widest mb-1">Política de Descarte Semestral</p>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Para garantir a performance do sistema, os arquivos e pedidos de impressão devem ser limpos ao final de cada semestre. Recomenda-se realizar a limpeza antes do início de um novo período letivo.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => handleSemesterCleanup(1)}
                                        disabled={isCleaning}
                                        className="flex flex-col items-center justify-center p-10 bg-black/40 border border-white/5 rounded-[2.5rem] hover:bg-white/5 transition-all group"
                                    >
                                        <Trash2 className="text-gray-500 group-hover:text-red-500 mb-4" size={32} />
                                        <span className="font-black text-white uppercase text-[10px] tracking-widest">Limpar 1º Semestre</span>
                                        <span className="text-[9px] text-gray-600 uppercase mt-1">Janeiro - Junho</span>
                                    </button>
                                    <button 
                                        onClick={() => handleSemesterCleanup(2)}
                                        disabled={isCleaning}
                                        className="flex flex-col items-center justify-center p-10 bg-black/40 border border-white/5 rounded-[2.5rem] hover:bg-white/5 transition-all group"
                                    >
                                        <Trash2 className="text-gray-500 group-hover:text-red-500 mb-4" size={32} />
                                        <span className="font-black text-white uppercase text-[10px] tracking-widest">Limpar 2º Semestre</span>
                                        <span className="text-[9px] text-gray-600 uppercase mt-1">Julho - Dezembro</span>
                                    </button>
                                </div>
                                {isCleaning && (
                                    <div className="flex items-center justify-center gap-3 text-yellow-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
                                        <RefreshCw className="animate-spin" size={14} /> Processando limpeza de semestre...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
