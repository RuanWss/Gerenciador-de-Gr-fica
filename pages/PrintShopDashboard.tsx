
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    getStaffMembers,
    listenToSystemConfig,
    deleteExamRequest
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig, 
    StaffMember
} from '../types';
import { 
    Printer, 
    Search, 
    Calendar, 
    Users, 
    Settings, 
    X,
    MessageSquare,
    Phone,
    Send,
    BookOpen,
    ClipboardCheck,
    CalendarDays,
    ExternalLink,
    FileText,
    CheckCircle2,
    Clock,
    Trash2,
    ChevronRight,
    Download
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'attendance' | 'planning' | 'config' | 'whatsapp'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Data States
    const [students, setStudents] = useState<Student[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examFilter, setExamFilter] = useState<ExamStatus | 'ALL'>('ALL');
    const [examSearch, setExamSearch] = useState('');

    // WhatsApp States
    const [waSearch, setWaSearch] = useState('');
    const [waMessage, setWaMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [allStudents, allExams, allStaff] = await Promise.all([
            getStudents(),
            getExams(),
            getStaffMembers()
        ]);
        setStudents(allStudents);
        setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
        setStaff(allStaff);
        setIsLoading(false);
    };

    const handleUpdateStatus = async (examId: string, status: ExamStatus) => {
        try {
            await updateExamStatus(examId, status);
            setExams(prev => prev.map(e => e.id === examId ? { ...e, status } : e));
        } catch (e) {
            alert("Erro ao atualizar status");
        }
    };

    const handleDeleteExam = async (id: string) => {
        if (confirm("Deseja excluir este pedido de impressão?")) {
            await deleteExamRequest(id);
            setExams(prev => prev.filter(e => e.id !== id));
        }
    };

    const sendWhatsApp = (number: string, name: string) => {
        if (!number) return alert("Número não cadastrado.");
        const cleanNumber = number.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
        const text = encodeURIComponent(`Olá ${name}, aqui é do C.E. Prof. Manoel Leite. \n\n${waMessage}`);
        window.open(`https://wa.me/${finalNumber}?text=${text}`, '_blank');
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

    const filteredExams = exams.filter(e => {
        const matchesStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchesSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const filteredContacts = [
        ...students.map(s => ({ id: s.id, name: s.name, info: s.className, phone: s.contacts || '', type: 'Aluno/Responsável' })),
        ...staff.map(st => ({ id: st.id, name: st.name, info: st.role, phone: '', type: 'Funcionário' }))
    ].filter(c => c.name.toLowerCase().includes(waSearch.toLowerCase()));

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Painel Administrativo</p>
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="whatsapp" label="Comunicação WA" icon={MessageSquare} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência Hoje" icon={ClipboardCheck} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-transparent">
                
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Printer className="text-red-500" /> Gráfica e Cópias
                                </h1>
                                <p className="text-gray-400">Recebimento e gerenciamento de pedidos de impressão.</p>
                            </div>
                            <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/10">
                                <button onClick={() => setExamFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>Todos</button>
                                <button onClick={() => setExamFilter(ExamStatus.PENDING)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.PENDING ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>Pendentes</button>
                                <button onClick={() => setExamFilter(ExamStatus.COMPLETED)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${examFilter === ExamStatus.COMPLETED ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>Concluídos</button>
                            </div>
                        </header>

                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none" 
                                placeholder="Buscar por título ou professor..."
                                value={examSearch}
                                onChange={e => setExamSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${
                                            exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                            exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-green-500/10 text-green-500'
                                        }`}>
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold text-white leading-tight">{exam.title}</h3>
                                                {exam.materialType === 'handout' && (
                                                    <span className="bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-purple-600/30">Apostila</span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-sm font-medium">Prof. {exam.teacherName} • {exam.gradeLevel}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg">
                                                    {exam.quantity} CÓPIAS
                                                </span>
                                                <span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1">
                                                    <Clock size={12}/> {new Date(exam.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                                        <a 
                                            href={exam.fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400 transition-all border border-white/5"
                                            title="Visualizar PDF"
                                        >
                                            <Download size={20} />
                                        </a>

                                        {exam.status === ExamStatus.PENDING && (
                                            <button 
                                                onClick={() => handleUpdateStatus(exam.id, ExamStatus.IN_PROGRESS)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                                            >
                                                Iniciar Impressão
                                            </button>
                                        )}

                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button 
                                                onClick={() => handleUpdateStatus(exam.id, ExamStatus.COMPLETED)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={16}/> Marcar Concluído
                                            </button>
                                        )}

                                        {exam.status === ExamStatus.COMPLETED && (
                                            <div className="flex items-center gap-2 text-green-500 font-black text-[10px] uppercase bg-green-500/10 px-4 py-3 rounded-xl border border-green-500/20">
                                                <CheckCircle2 size={16}/> Entregue
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => handleDeleteExam(exam.id)}
                                            className="p-3 hover:bg-red-600/20 text-gray-500 hover:text-red-500 rounded-xl transition-all"
                                        >
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredExams.length === 0 && (
                                <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/5">
                                    <Printer size={64} className="mx-auto text-gray-700 mb-4 opacity-20"/>
                                    <p className="text-gray-500 font-bold uppercase tracking-[0.3em]">Nenhum pedido encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                                <MessageSquare className="text-green-500" /> Central de Comunicação
                            </h1>
                            <p className="text-gray-400">Envio de avisos rápidos via WhatsApp para pais e equipe.</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] shadow-xl">
                                    <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-widest flex items-center gap-2">
                                        <Send size={14} className="text-blue-400"/> Mensagem Rápida
                                    </h3>
                                    <textarea 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-green-500 min-h-[200px] transition-all"
                                        placeholder="Digite o aviso que deseja enviar..."
                                        value={waMessage}
                                        onChange={e => setWaMessage(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 italic">O nome do destinatário será adicionado automaticamente.</p>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[600px]">
                                    <div className="p-6 border-b border-white/5 bg-black/20">
                                        <div className="relative w-full">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                            <input 
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-green-600 outline-none" 
                                                placeholder="Buscar contatos..."
                                                value={waSearch}
                                                onChange={e => setWaSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left">
                                            <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                                <tr><th className="p-6">Nome</th><th className="p-6 text-center">Ação</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredContacts.map(contact => (
                                                    <tr key={contact.id} className="hover:bg-white/[0.02]">
                                                        <td className="p-6"><p className="font-bold text-gray-200">{contact.name}</p><p className="text-[10px] text-gray-500">{contact.info}</p></td>
                                                        <td className="p-6 text-center"><button onClick={() => sendWhatsApp(contact.phone, contact.name)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"><Phone size={14}/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab !== 'exams' && activeTab !== 'whatsapp' && (
                    <div className="py-20 text-center text-gray-500 uppercase font-black tracking-widest">
                        Funcionalidade em desenvolvimento
                    </div>
                )}
            </div>
        </div>
    );
};
