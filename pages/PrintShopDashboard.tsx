
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
    getAllPEIs
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
    ChevronRight as ChevronIcon
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'plans' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    // Data states
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    
    // Filters
    const [examSearch, setExamSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Config states
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    // Modal states
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');

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
            alert("Sincronização concluída!");
        } catch (e) {
            alert("Erro na sincronização Gennera.");
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

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return;
        await saveSchoolEvent({
            id: selectedEvent?.id || '',
            title: newEventTitle,
            date: newEventDate,
            type: newEventType,
            tasks: selectedEvent?.tasks || []
        });
        setShowEventModal(false);
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

    // --- RENDER CALENDAR ---
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-transparent border border-white/5"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="h-32 bg-[#18181b]/50 border border-white/5 p-3 group relative hover:bg-red-600/10 transition-colors">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className="text-[9px] font-black uppercase p-1 rounded bg-red-600/20 text-red-400 border border-red-600/20 truncate">
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 flex justify-between items-center bg-black/20 border-b border-white/5">
                    <h2 className="text-2xl font-black uppercase text-white tracking-tighter">{monthName}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-white"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-white"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 bg-black/20 text-center py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">{days}</div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-[#0f0f10]">
            {/* SIDEBAR PREMIUM */}
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
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Cloud Gateway</p>
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Status: Online</span>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                
                {/* 1. GRÁFICA / EXAMS */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Fila de Impressão</h1>
                            <p className="text-gray-400 text-lg mt-1 font-medium italic">Pedidos pendentes de cópias e apostilas.</p>
                        </header>
                        <div className="grid grid-cols-1 gap-8">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 group hover:border-red-600/40 transition-all shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div className="h-20 w-20 rounded-[1.8rem] bg-red-600/10 text-red-600 flex items-center justify-center border border-red-600/20">
                                                <Printer size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel}</p>
                                                <p className="text-red-500 font-black text-xs uppercase mt-2">{exam.quantity} CÓPIAS</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleUpdateExamStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'}`}>
                                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                                        </Button>
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. ALUNOS / STUDENTS */}
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
                                    <tr><th className="p-10">Nome</th><th className="p-10">Turma</th><th className="p-10">Frequência Hoje</th></tr>
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

                {/* 3. PEI / AEE */}
                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Documentos AEE (PEI)</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {peis.map(pei => (
                                <div key={pei.id} className="bg-[#18181b] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
                                    <h3 className="text-xl font-bold text-white uppercase mb-2">{pei.studentName}</h3>
                                    <p className="text-red-500 font-black text-[10px] uppercase mb-6 tracking-widest">{pei.subject} • Prof. {pei.teacherName}</p>
                                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 text-xs text-gray-400 leading-relaxed mb-6 line-clamp-3">
                                        {pei.essentialCompetencies}
                                    </div>
                                    <Button variant="outline" className="w-full h-14 rounded-xl font-black uppercase text-[10px] tracking-widest"><ExternalLink size={14} className="mr-2"/> Abrir Relatório</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. CALENDÁRIO / AGENDA */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1></header>
                        {renderCalendar()}
                    </div>
                )}

                {/* 5. PLANEJAMENTOS / PLANS */}
                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos Pedagógicos</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] hover:border-red-600/30 transition-all shadow-xl">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">{plan.type === 'daily' ? 'Diário' : 'Bimestral'}</span>
                                        <span className="text-[10px] font-bold text-gray-600">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{plan.className}</h3>
                                    <p className="text-xs text-gray-500 mb-6 italic">Prof. {plan.teacherName}</p>
                                    <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] font-black uppercase"><Search size={14} className="mr-2"/> Ver Detalhes</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. CONFIGURAÇÕES / CONFIG */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configuração TV</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
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
                    </div>
                )}
            </div>
        </div>
    );
};
