
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    getLessonPlans, 
    deleteLessonPlan,
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    getAnswerKeys,
    saveAnswerKey,
    deleteAnswerKey,
    getCorrections,
    saveCorrection,
    getStaffMembers,
    saveStudent,
    updateStudent,
    getAllPEIs
} from '../services/firebaseService';
import { fetchGenneraClasses, fetchGenneraStudentsByClass } from '../services/genneraService';
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
    StaffMember,
    EventTask,
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
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    CheckCircle,
    XCircle,
    ScanLine,
    ListChecks,
    History,
    UploadCloud,
    School,
    ClipboardCheck,
    CalendarDays,
    FileText,
    ArrowRight,
    Eye,
    BookOpen,
    Clock,
    Filter,
    ArrowLeft,
    ClipboardList,
    Briefcase,
    UserCheck,
    Files,
    Loader2,
    Check,
    LayoutList,
    RefreshCw,
    DatabaseZap,
    Heart,
    Edit3
} from 'lucide-react';

const CLASSES_LABELS = ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'planning' | 'config' | 'corrections' | 'pei'>('calendar');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- DATA STATES ---
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [staff, setStaff] = useState<StaffMember[]>([]);

    // Filter States
    const [selectedClassName, setSelectedClassName] = useState<string>('ALL');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal de Planejamento e PEI
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);
    const [showPeiModal, setShowPeiModal] = useState(false);

    // Config States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Calendar States
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => {
            console.log("Frequência carregada:", logs.length);
            setAttendanceLogs(logs);
        });
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage);
            setConfigBannerType(cfg.bannerType);
            setConfigIsBannerActive(cfg.isBannerActive);
        });
        const unsubEvents = listenToEvents(setEvents);

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
        };
    }, [activeTab]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, plans, allStaff, peis] = await Promise.all([
                getExams(),
                getStudents(),
                getLessonPlans(),
                getStaffMembers(),
                getAllPEIs()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
            setStaff(allStaff.filter(s => s.active));
            setAllPeis(peis.sort((a,b) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
        setIsLoading(false);
    };

    const handleAeeToggle = async (student: Student) => {
        const newState = !student.isAEE;
        try {
            await updateStudent({ ...student, isAEE: newState });
            setStudents(students.map(s => s.id === student.id ? { ...s, isAEE: newState } : s));
        } catch (e) {
            alert("Erro ao atualizar.");
        }
    };

    // ID do Aluno -> Log de Frequência do dia
    const presentMap = React.useMemo(() => {
        const map = new Map<string, AttendanceLog>();
        attendanceLogs.forEach(log => {
            // Se houver múltiplos registros, mantém o mais antigo (entrada)
            if (!map.has(log.studentId)) {
                map.set(log.studentId, log);
            }
        });
        return map;
    }, [attendanceLogs]);

    const getStudentCountByClass = (className: string) => {
        return students.filter(s => s.className === className).length;
    };

    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClassName === 'ALL' || s.className === selectedClassName;
        const matchesSearch = s.name.toLowerCase().includes(globalSearch.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const filteredPeis = allPeis.filter(p => 
        p.studentName.toLowerCase().includes(globalSearch.toLowerCase()) ||
        p.teacherName.toLowerCase().includes(globalSearch.toLowerCase())
    );

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
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

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel Escolar</p>
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência Hoje" icon={ClipboardCheck} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <SidebarItem id="pei" label="Relatórios PEI" icon={Heart} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-transparent">
                
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Agenda Institucional</h1>
                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/10">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronLeft/></button>
                                <span className="font-bold text-white uppercase text-sm min-w-[140px] text-center">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-white/10 rounded text-gray-400"><ChevronRight/></button>
                            </div>
                        </header>
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                            <p className="text-gray-400 text-center py-20 font-bold uppercase tracking-widest opacity-40">Calendário Administrativo Ativo</p>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Gestão de Turmas</h1>
                                <p className="text-gray-400">Administração de alunos e controle de inclusão.</p>
                            </div>
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none" placeholder="Buscar aluno..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/>
                            </div>
                        </header>

                        {/* Grade de Turmas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                            <button 
                                onClick={() => setSelectedClassName('ALL')}
                                className={`p-4 rounded-2xl border transition-all text-center ${selectedClassName === 'ALL' ? 'bg-red-600 border-white text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                <p className="text-[10px] font-black uppercase mb-1">Todas</p>
                                <h3 className="font-bold text-lg">{students.length}</h3>
                                <p className="text-[10px] opacity-60">Alunos</p>
                            </button>
                            {CLASSES_LABELS.map(cls => {
                                const count = getStudentCountByClass(cls);
                                return (
                                    <button 
                                        key={cls}
                                        onClick={() => setSelectedClassName(cls)}
                                        className={`p-4 rounded-2xl border transition-all text-center ${selectedClassName === cls ? 'bg-red-600 border-white text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <p className="text-[10px] font-black uppercase mb-1">{cls.split(' ')[0]}</p>
                                        <h3 className="font-bold text-lg">{count}</h3>
                                        <p className="text-[10px] opacity-60">Alunos</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6 text-center">Frequência Hoje</th>
                                        <th className="p-6 text-center">Inclusão (AEE)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map(student => {
                                        const log = presentMap.get(student.id);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                                                            <img src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-full h-full object-cover"/>
                                                        </div>
                                                        <p className="font-bold text-gray-800">{student.name}</p>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase">
                                                        {student.className}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-center">
                                                    {log ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">
                                                            <CheckCircle size={12}/> {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-400 rounded-full text-[10px] font-black uppercase opacity-60">
                                                            <XCircle size={12}/> Ausente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button 
                                                        onClick={() => handleAeeToggle(student)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 mx-auto ${student.isAEE ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-400 hover:bg-red-600 hover:text-white'}`}
                                                    >
                                                        <Heart size={14} fill={student.isAEE ? "currentColor" : "none"}/>
                                                        {student.isAEE ? 'Atendido' : 'Marcar AEE'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase opacity-40">Nenhum aluno encontrado nesta seleção</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Frequência em Tempo Real</h1>
                            <p className="text-gray-400">Registros automáticos capturados pelos terminais faciais hoje.</p>
                        </header>
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Horário</th>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-6 font-mono font-bold text-red-600">
                                                {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                                                    <img src={log.studentPhotoUrl || `https://ui-avatars.com/api/?name=${log.studentName}`} className="w-full h-full object-cover"/>
                                                </div>
                                                <span className="font-bold text-gray-800">{log.studentName}</span>
                                            </td>
                                            <td className="p-6"><span className="text-xs font-bold text-gray-500">{log.className}</span></td>
                                            <td className="p-6 text-center">
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-tighter">Entrada Registrada</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {attendanceLogs.length === 0 && (
                                        <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-40">Aguardando primeiros acessos do dia...</td></tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3"><Heart className="text-red-500"/> Relatórios PEI</h1>
                                <p className="text-gray-400">Acompanhamento dos Planos Educacionais Individualizados.</p>
                            </div>
                        </header>
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th className="p-6">Estudante</th>
                                        <th className="p-6">Disciplina / Professor</th>
                                        <th className="p-6">Última Atualização</th>
                                        <th className="p-6 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPeis.map(pei => (
                                        <tr key={pei.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-6"><p className="font-bold text-gray-800">{pei.studentName}</p></td>
                                            <td className="p-6">
                                                <p className="font-bold text-gray-700 text-sm">{pei.subject}</p>
                                                <p className="text-[10px] font-black text-red-600 uppercase">Prof. {pei.teacherName}</p>
                                            </td>
                                            <td className="p-6 text-xs text-gray-500">{new Date(pei.updatedAt).toLocaleDateString()}</td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => { setSelectedPei(pei); setShowPeiModal(true); }} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all">Ver Detalhes</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Central de Impressão</h1>
                            <p className="text-gray-400">Gerenciamento de cópias e apostilas.</p>
                        </header>
                        <div className="space-y-4">
                            {exams.map(e => (
                                <div key={e.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{e.title}</h3>
                                        <p className="text-sm text-gray-500">Prof. {e.teacherName} • {e.gradeLevel} • <b>{e.quantity} cópias</b></p>
                                        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{e.status === ExamStatus.PENDING ? 'Pendente' : 'Concluído'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={e.fileUrl} target="_blank" rel="noreferrer" className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileText size={16}/> PDF</a>
                                        {e.status === ExamStatus.PENDING && <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.COMPLETED)}>Concluir</Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* PEI DETAIL MODAL */}
            {showPeiModal && selectedPei && (
                <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3"><Heart size={24} className="text-red-600"/> Detalhes do PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • {selectedPei.subject} • {selectedPei.period || '1º Bimestre'}</p>
                            </div>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Competências Essenciais</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.essentialCompetencies}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Conteúdos Adaptados</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.selectedContents}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Recursos Didáticos</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.didacticResources}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Processo de Avaliação</h4>
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{selectedPei.evaluation}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiModal(false)} className="px-10 bg-gray-800 font-black uppercase">Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
