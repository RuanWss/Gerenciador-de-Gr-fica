
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
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'config' | 'omr' | 'pei'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Data States
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);

    // Filter States
    const [examSearch, setExamSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState('ALL');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Modal States
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventData, setNewEventData] = useState({ title: '', date: '', type: 'event' as any, desc: '' });

    // Config States
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
        if (!confirm("Isso atualizará os alunos com base no sistema Gennera. Continuar?")) return;
        setIsSyncing(true);
        setSyncError(null);
        setSyncMessage("Conectando ao servidor...");
        try {
            await syncAllDataWithGennera((msg) => setSyncMessage(msg));
            await fetchInitialData();
            setTimeout(() => setSyncMessage(''), 5000);
        } catch (e: any) {
            setSyncError(e.message || "Erro desconhecido na sincronização.");
            setSyncMessage('');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        });
        alert("Configurações salvas!");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    // Filter Logic
    const filteredExams = exams.filter(e => e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase()));
    const filteredStudents = students.filter(s => (studentFilterClass === 'ALL' || s.classId === studentFilterClass) && s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    const presentIds = new Set(attendanceLogs.map(l => l.studentId));

    // Calendar Helper
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-white/5 border border-white/5 min-h-[100px]"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="bg-white/5 border border-white/5 min-h-[100px] p-2 relative group hover:bg-white/10 transition-all">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className="text-[9px] p-1 bg-red-600/20 text-red-400 rounded truncate border-l-2 border-red-600">{ev.title}</div>
                        ))}
                    </div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 border border-white/5 rounded-2xl overflow-hidden">{days}</div>;
    };

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 ml-2">Painel Gestor</p>
                    <SidebarItem id="exams" label="Gráfica / Pedidos" icon={Printer} />
                    <SidebarItem id="omr" label="Gabaritos" icon={ScanLine} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={CalendarDays} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="pei" label="Relatórios PEI" icon={Heart} />
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* ABA: GRAFICA */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Printer className="text-red-500" /> Central de Cópias</h1>
                                <p className="text-gray-400">Solicitações de impressão aguardando processamento.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none focus:border-red-500" placeholder="Buscar pedidos..." value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}><FileText size={32} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">Prof. {exam.teacherName} • {exam.gradeLevel} • <b>{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400 transition-all"><Download size={20} /></a>
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="rounded-xl">Concluir</Button>
                                        ) : (
                                            <span className="text-xs font-black text-green-500 uppercase bg-green-500/10 px-4 py-2 rounded-xl">Concluído</span>
                                        )}
                                        <button onClick={() => deleteExamRequest(exam.id)} className="p-3 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: ESTUDANTES */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Users className="text-red-500" /> Gestão de Alunos</h1></header>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex gap-4 bg-white/5">
                                <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white flex-1" placeholder="Filtrar por nome..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase">
                                    <tr><th className="p-6">Aluno</th><th className="p-6">Turma</th><th className="p-6">Presença Hoje</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5">
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                                                    {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover"/> : <Users size={18} className="m-auto mt-2 text-gray-600"/>}
                                                </div>
                                                <span className="font-bold text-gray-200">{s.name}</span>
                                            </td>
                                            <td className="p-6 text-gray-400 font-medium">{s.className}</td>
                                            <td className="p-6">{presentIds.has(s.id) ? <span className="text-green-500 font-black uppercase text-[10px] bg-green-500/10 px-3 py-1 rounded-full">Presente</span> : <span className="text-gray-600 text-[10px]">Ausente</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA: CALENDARIO */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><CalendarDays className="text-red-500" /> Agenda Escolar</h1>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 bg-white/5 rounded-lg"><ChevronLeft size={20}/></button>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 bg-white/5 rounded-lg"><ChevronRight size={20}/></button>
                            </div>
                        </header>
                        {renderCalendar()}
                    </div>
                )}

                {/* ABA: CONFIG */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-bold text-white uppercase flex items-center gap-3"><Settings className="text-red-500" /> Configurações</h1></header>
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-12 shadow-2xl">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Server size={24} className="text-red-500" /><h2 className="text-xl font-black text-white uppercase">Integração Gennera</h2></div>
                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                                    <p className="text-sm text-gray-400 mb-6">Sincronize automaticamente alunos e turmas do sistema Gennera (ID 891).</p>
                                    <Button onClick={handleSyncGennera} isLoading={isSyncing} className="w-full h-16 rounded-2xl text-lg font-black uppercase"><RefreshCw size={24} className={`mr-3 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</Button>
                                    
                                    {syncMessage && (
                                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                                            <Loader2 size={18} className="text-blue-500 animate-spin" />
                                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{syncMessage}</p>
                                        </div>
                                    )}

                                    {syncError && (
                                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <AlertTriangle size={18} />
                                                <p className="text-xs font-black uppercase tracking-widest">Falha na Sincronização</p>
                                            </div>
                                            <p className="text-xs text-red-300 font-medium">{syncError}</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Megaphone size={24} className="text-red-500" /><h2 className="text-xl font-black text-white uppercase">Avisos na TV</h2></div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3"><input type="checkbox" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} className="h-6 w-6 rounded border-white/10 bg-black text-red-600"/><label className="text-lg font-bold text-white uppercase">Ativar Comunicado</label></div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" rows={3} value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                                    <Button onClick={handleSaveConfig} className="w-full py-4 rounded-2xl uppercase font-black">Salvar Alterações</Button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* ABA: OMR */}
                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><ScanLine className="text-red-500" /> Gabaritos Cadastrados</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {answerKeys.map(key => (
                                <div key={key.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 group">
                                    <h3 className="text-lg font-bold text-white">{key.title || key.subject}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase mt-1">{key.className}</p>
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 font-mono">{Object.keys(key.answers).length} Questões</span>
                                        <button onClick={() => deleteAnswerKey(key.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: PEI */}
                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Heart className="text-red-500" /> Documentos PEI</h1></header>
                        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase">
                                    <tr><th className="p-6">Aluno</th><th className="p-6">Professor</th><th className="p-6">Data</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allPeis.map(p => (
                                        <tr key={p.id} className="hover:bg-white/5">
                                            <td className="p-6 font-bold text-gray-200">{p.studentName}</td>
                                            <td className="p-6 text-gray-400">{p.teacherName} ({p.subject})</td>
                                            <td className="p-6 text-gray-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* ABA: PLANS */}
                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><BookOpenCheck className="text-red-500" /> Planejamentos Pedagógicos</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${p.type === 'daily' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{p.type === 'daily' ? 'Diário' : 'Bimestral'}</span>
                                    <h3 className="text-lg font-bold text-white mt-3">{p.className}</h3>
                                    <p className="text-sm text-gray-400">Prof. {p.teacherName}</p>
                                    <p className="text-xs text-gray-500 mt-4 italic line-clamp-2">{p.topic || p.period}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
