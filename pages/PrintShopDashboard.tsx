
import React, { useState, useEffect } from 'react';
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
    saveCorrection
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
    StudentCorrection
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
    Clock
} from 'lucide-react';

const CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', shift: 'morning' },
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon' },
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'planning' | 'config' | 'corrections'>('calendar');
    const [isLoading, setIsLoading] = useState(false);

    // --- DATA STATES ---
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

    // Gabaritos & Correção States
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [keyTitle, setKeyTitle] = useState('');
    const [keyQuestions, setKeyQuestions] = useState(10);
    const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
    const [corrections, setCorrections] = useState<StudentCorrection[]>([]);
    const [correctingImage, setCorrectingImage] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [correctionResult, setCorrectionResult] = useState<StudentCorrection | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // Modal de Planejamento
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // Config States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Calendar States
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
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
            const [allExams, allStudents, keys, plans] = await Promise.all([
                getExams(),
                getStudents(),
                getAnswerKeys(),
                getLessonPlans()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setAnswerKeys(keys.sort((a,b) => b.createdAt - a.createdAt));
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
        setIsLoading(false);
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleDeleteLessonPlan = async (id: string) => {
        if (!window.confirm("Deseja realmente apagar este planejamento? Esta ação é irreversível.")) return;
        try {
            await deleteLessonPlan(id);
            setLessonPlans(lessonPlans.filter(p => p.id !== id));
            alert("Planejamento excluído com sucesso.");
        } catch (error) {
            alert("Erro ao excluir planejamento.");
        }
    };

    const handleSaveConfig = async () => {
        if (!sysConfig) return;
        await updateSystemConfig({
            ...sysConfig,
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        });
        alert("Configurações atualizadas!");
    };

    const handleSelectKey = async (key: AnswerKey) => {
        setSelectedKey(key);
        const data = await getCorrections(key.id);
        setCorrections(data.sort((a,b) => b.date - a.date));
    };

    const handleCreateKey = async () => {
        if (!keyTitle || Object.keys(keyAnswers).length < keyQuestions) return alert("Preencha o título e o gabarito completo.");
        const newKey: AnswerKey = {
            id: '',
            title: keyTitle,
            numQuestions: keyQuestions,
            correctAnswers: keyAnswers,
            createdAt: Date.now()
        };
        await saveAnswerKey(newKey);
        loadInitialData();
        setShowNewKeyModal(false);
        setKeyTitle(''); setKeyAnswers({});
    };

    const handleAutoCorrect = async () => {
        if (!correctingImage || !selectedKey || !selectedStudentId) return alert("Dados incompletos.");
        setIsAnalyzing(true);
        try {
            const studentAnswers = await analyzeAnswerSheet(correctingImage, selectedKey.numQuestions);
            const student = students.find(s => s.id === selectedStudentId);
            let scoreCount = 0;
            const hits: number[] = [];
            for (let i = 1; i <= selectedKey.numQuestions; i++) {
                if (studentAnswers[i] === selectedKey.correctAnswers[i]) {
                    scoreCount++; hits.push(i);
                }
            }
            const res: StudentCorrection = {
                id: '',
                answerKeyId: selectedKey.id,
                studentName: student?.name || 'Aluno',
                score: (scoreCount / selectedKey.numQuestions) * 10,
                answers: studentAnswers,
                hits: hits,
                date: Date.now()
            };
            await saveCorrection(res);
            setCorrectionResult(res);
            setCorrections([res, ...corrections]);
        } catch (e) { alert("Erro IA: " + (e as any).message); }
        finally { setIsAnalyzing(false); }
    };

    const printAnswerSheet = (key: AnswerKey) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const qHtml = Array.from({length: key.numQuestions}).map((_, i) => `
            <div class="row">
                <span class="num">${String(i+1).padStart(2, '0')}</span>
                <span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Cartão Resposta - ${key.title}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                        .bubble { width: 22px; height: 22px; border: 1.5px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 8px; font-size: 10px; font-weight: bold; }
                        .row { margin-bottom: 8px; display: flex; align-items: center; border-bottom: 1px dashed #eee; padding: 4px 0; }
                        .num { width: 30px; font-weight: bold; font-size: 14px; }
                        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
                        .info-box { border: 1.5px solid #000; padding: 15px; margin-bottom: 25px; border-radius: 5px; }
                        .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 5px; }
                        .field { border-bottom: 1px solid #ccc; height: 20px; margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2 style="margin:0">CEMAL EQUIPE</h2>
                        <h3 style="margin:5px 0">CARTÃO RESPOSTA OFICIAL: ${key.title}</h3>
                    </div>
                    <div class="info-box">
                        <div class="label">Nome do Aluno</div><div class="field"></div>
                        <div style="display:flex; gap:20px">
                            <div style="flex:1"><div class="label">Turma</div><div class="field"></div></div>
                            <div style="flex:1"><div class="label">Data</div><div class="field"></div></div>
                        </div>
                    </div>
                    <div class="container">
                        <div>${Array.from({length: Math.ceil(key.numQuestions/2)}).map((_, i) => `
                            <div class="row">
                                <span class="num">${String(i+1).padStart(2, '0')}</span>
                                <span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span>
                            </div>
                        `).join('')}</div>
                        <div>${Array.from({length: Math.floor(key.numQuestions/2)}).map((_, i) => `
                            <div class="row">
                                <span class="num">${String(i+Math.ceil(key.numQuestions/2)+1).padStart(2, '0')}</span>
                                <span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span>
                            </div>
                        `).join('')}</div>
                    </div>
                </body>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </html>
        `);
        printWindow.document.close();
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

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="bg-white/5 h-24 border border-white/5"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="bg-white/5 h-24 border border-white/5 p-2 overflow-y-auto">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    {dayEvents.map(e => (
                        <div key={e.id} className="mt-1 text-[10px] bg-red-600/20 text-red-400 p-1 rounded border border-red-500/20 truncate">
                            {e.title}
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className="grid grid-cols-7 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map(h => <div key={h} className="bg-black/40 p-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest">{h}</div>)}
                {days}
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel Escolar</p>
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="classes" label="Gestão de Turmas" icon={School} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência" icon={ClipboardCheck} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <SidebarItem id="corrections" label="Correção via IA" icon={ScanLine} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Agenda Institucional</h1>
                                <p className="text-gray-400">Controle de eventos e calendário escolar.</p>
                            </div>
                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-white/10 rounded text-white"><ChevronLeft/></button>
                                <span className="font-bold text-white uppercase tracking-widest text-sm">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-white/10 rounded text-white"><ChevronRight/></button>
                            </div>
                        </header>
                        {renderCalendar()}
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Central de Impressão</h1>
                            <p className="text-gray-400">Pedidos de provas e materiais dos professores.</p>
                        </header>
                        <div className="space-y-4">
                            {exams.length === 0 && <p className="text-gray-500 italic text-center py-20">Nenhum pedido de impressão no momento.</p>}
                            {exams.map(e => (
                                <div key={e.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 text-lg">{e.title}</h3>
                                            {e.materialType === 'handout' && <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Apostila</span>}
                                        </div>
                                        <p className="text-sm text-gray-500">Prof. {e.teacherName} • {e.gradeLevel} • <b>{e.quantity} cópias</b></p>
                                        <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={e.fileUrl} target="_blank" rel="noreferrer" className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2"><FileText size={16}/> Ver PDF</a>
                                        {e.status === ExamStatus.PENDING && (
                                            <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.IN_PROGRESS)}>Iniciar</Button>
                                        )}
                                        {e.status === ExamStatus.IN_PROGRESS && (
                                            <Button onClick={() => handleUpdateExamStatus(e.id, ExamStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700">Concluir</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'classes' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Gestão de Turmas</h1>
                            <p className="text-gray-400">Controle de alunos matriculados por sala.</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {CLASSES.map(c => (
                                <div key={c.id} className="bg-[#18181b] border border-gray-800 p-6 rounded-2xl hover:border-red-500 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 bg-red-900/20 text-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <School size={28}/>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{c.name}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{students.filter(s => s.className === c.name).length} Alunos Matriculados</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Lista de Alunos</h1>
                            <p className="text-gray-400">Cadastros e status de biometria facial.</p>
                        </header>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Aluno</th>
                                        <th className="p-4">Turma</th>
                                        <th className="p-4 text-center">Status Foto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                                                    {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover"/> : <Users className="text-gray-400" size={20}/>}
                                                </div>
                                                <span className="font-bold text-gray-800">{s.name}</span>
                                            </td>
                                            <td className="p-4 text-gray-600">{s.className}</td>
                                            <td className="p-4 text-center">
                                                {s.photoUrl ? <CheckCircle size={18} className="text-green-500 mx-auto"/> : <XCircle size={18} className="text-red-400 mx-auto"/>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Frequência em Tempo Real</h1>
                            <p className="text-gray-400">Logs de acesso pelo terminal facial hoje.</p>
                        </header>
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4">Horário</th>
                                        <th className="p-4">Aluno</th>
                                        <th className="p-4">Turma</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendanceLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-green-50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-blue-600">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-4 font-bold text-gray-800">{log.studentName}</td>
                                            <td className="p-4 text-gray-500">{log.className}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Gestão Pedagógica</h1>
                            <p className="text-gray-400">Acompanhamento dos planejamentos enviados pelos professores.</p>
                        </header>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {lessonPlans.map(plan => (
                                <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-red-700">{plan.teacherName}</h4>
                                            <p className="text-xs text-gray-500">{plan.subject}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${plan.type === 'daily' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                    </div>
                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Turma</p>
                                        <p className="font-bold text-gray-800">{plan.className}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                        <button onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                                            <Eye size={14}/> Ver Detalhes
                                        </button>
                                        <button onClick={() => handleDeleteLessonPlan(plan.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Apagar Planejamento">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'corrections' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><ScanLine className="text-red-500"/> Correção Automática</h1>
                                <p className="text-gray-400">Gabaritos oficiais e visão computacional para correção.</p>
                            </div>
                            <Button onClick={() => setShowNewKeyModal(true)}>
                                <Plus size={18} className="mr-2"/> Novo Gabarito
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* LISTA DE GABARITOS */}
                            <div className="bg-[#18181b] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-280px)]">
                                <div className="p-4 bg-gray-900/50 border-b border-gray-800 font-bold text-gray-300">Avaliações Ativas</div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {answerKeys.map(key => (
                                        <div key={key.id} onClick={() => handleSelectKey(key)} className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedKey?.id === key.id ? 'bg-red-600/10 border-red-500/50' : 'bg-gray-900/30 border-gray-800 hover:border-gray-700'}`}>
                                            <div>
                                                <h4 className={`font-bold text-sm ${selectedKey?.id === key.id ? 'text-red-400' : 'text-white'}`}>{key.title}</h4>
                                                <p className="text-[10px] text-gray-500 uppercase">{key.numQuestions} Questões</p>
                                            </div>
                                            {selectedKey?.id === key.id && (
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); printAnswerSheet(key); }} className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" title="Imprimir Cartão"><Printer size={14}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteAnswerKey(key.id); loadInitialData(); }} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AREA DE CORREÇÃO */}
                            <div className="lg:col-span-2 space-y-6">
                                {selectedKey ? (
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-6 uppercase text-xs tracking-widest text-red-600 flex items-center gap-2"><ScanLine size={16}/> Corrigir Cartão: {selectedKey.title}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Selecionar Aluno</label>
                                                    <select className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                                                        <option value="">-- Buscar Aluno --</option>
                                                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                    </select>
                                                </div>
                                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center relative hover:bg-gray-50 transition-colors cursor-pointer">
                                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setCorrectingImage(e.target.files?.[0] || null)}/>
                                                    {correctingImage ? (
                                                        <div className="text-green-600 font-bold">
                                                            <CheckCircle size={48} className="mx-auto mb-2"/>
                                                            <p className="text-sm">{correctingImage.name}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400">
                                                            <UploadCloud size={48} className="mx-auto mb-2 opacity-30"/>
                                                            <p className="font-bold">Foto do Cartão</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button onClick={handleAutoCorrect} isLoading={isAnalyzing} className="w-full h-14 text-lg font-black tracking-widest uppercase">Processar Correção IA</Button>
                                            </div>

                                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                                                {correctionResult ? (
                                                    <div className="animate-in zoom-in-95 duration-500">
                                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black mb-6 border-8 ${correctionResult.score >= 6 ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                                                            {correctionResult.score.toFixed(1)}
                                                        </div>
                                                        <h4 className="font-black text-gray-800 uppercase">{correctionResult.studentName}</h4>
                                                        <p className="text-xs text-gray-500 mt-1">Acertou {correctionResult.hits.length} de {selectedKey.numQuestions}</p>
                                                    </div>
                                                ) : (
                                                    <div className="opacity-20 flex flex-col items-center">
                                                        <History size={80} className="mb-4 text-gray-400"/>
                                                        <p className="font-bold uppercase text-xs">Aguardando Análise</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-600 border-2 border-dashed border-white/5 rounded-3xl opacity-40 py-20">
                                        <ScanLine size={80} className="mb-4"/>
                                        <p className="font-black uppercase tracking-widest">Selecione um gabarito para começar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white">Configurações do Sistema</h1>
                        </header>
                        <div className="bg-[#18181b] border border-gray-800 rounded-3xl p-8 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Megaphone size={24} className="text-yellow-500"/> Banner de Avisos (TV)</h3>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
                                        <input type="checkbox" id="bannerActive" className="w-6 h-6 rounded border-gray-600 bg-gray-700 text-red-600" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)} />
                                        <label htmlFor="bannerActive" className="text-sm font-bold text-gray-200">Ativar Banner na TV</label>
                                    </div>
                                    <div>
                                        <textarea rows={3} className="w-full bg-black/30 border border-gray-700 rounded-2xl p-4 text-white outline-none focus:border-red-500" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Mensagem do aviso..."/>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {(['info', 'warning', 'error', 'success'] as const).map(type => (
                                            <button key={type} onClick={() => setConfigBannerType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${configBannerType === type ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5 flex justify-end">
                                <Button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl font-black uppercase"><Save size={20} className="mr-2"/> Salvar Alterações</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DETALHES PLANEJAMENTO */}
            {showPlanModal && selectedPlan && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                                    <BookOpen size={24} className="text-red-600"/> Planejamento {selectedPlan.type === 'daily' ? 'Diário' : 'Bimestral'}
                                </h2>
                                <p className="text-sm text-gray-500">Prof. {selectedPlan.teacherName} • {selectedPlan.className}</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-red-600"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white text-gray-800">
                             <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Disciplina</span>
                                    <span className="font-bold text-lg">{selectedPlan.subject}</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Data/Período</span>
                                    <span className="font-bold text-lg">{selectedPlan.type === 'daily' ? selectedPlan.date : selectedPlan.period}</span>
                                </div>
                             </div>
                             {selectedPlan.type === 'daily' ? (
                                <div className="space-y-6">
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Tema da Aula</h3><p className="text-lg font-medium">{selectedPlan.topic}</p></div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Conteúdo</h3><p className="whitespace-pre-wrap leading-relaxed">{selectedPlan.content}</p></div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Metodologia</h3><p className="whitespace-pre-wrap leading-relaxed">{selectedPlan.methodology}</p></div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Recursos</h3><p className="bg-gray-50 p-4 rounded-xl">{selectedPlan.resources}</p></div>
                                        <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Avaliação</h3><p className="bg-gray-50 p-4 rounded-xl">{selectedPlan.evaluation}</p></div>
                                    </div>
                                    {selectedPlan.homework && <div className="bg-red-50 p-6 rounded-2xl border border-red-100"><h3 className="font-black text-xs uppercase text-red-600 mb-2">Tarefa de Casa</h3><p className="font-bold">{selectedPlan.homework}</p></div>}
                                </div>
                             ) : (
                                <div className="space-y-8">
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-2">Justificativa</h3><p className="whitespace-pre-wrap text-justify">{selectedPlan.justification}</p></div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100"><h3 className="font-black text-xs uppercase text-blue-700 mb-2">Habilidades Cognitivas</h3><p className="text-sm">{selectedPlan.cognitiveSkills}</p></div>
                                        <div className="bg-green-50 p-5 rounded-2xl border border-green-100"><h3 className="font-black text-xs uppercase text-green-700 mb-2">Socioemocionais</h3><p className="text-sm">{selectedPlan.socialEmotionalSkills}</p></div>
                                    </div>
                                    <div><h3 className="font-black text-xs uppercase text-red-600 mb-4">Atividades</h3>
                                        <div className="grid grid-cols-4 gap-4">
                                            {['Prévias','Autodidáticas','Cooperativas','Complementares'].map((t, i) => (
                                                <div key={t} className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">{t}</span>
                                                    <p className="text-xs">{[selectedPlan.activitiesPre, selectedPlan.activitiesAuto, selectedPlan.activitiesCoop, selectedPlan.activitiesCompl][i]}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                            <Button variant="danger" onClick={() => { handleDeleteLessonPlan(selectedPlan.id); setShowPlanModal(false); }} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white border-none shadow-none"><Trash2 size={18} className="mr-2"/> Apagar Registro</Button>
                            <Button onClick={() => setShowPlanModal(false)} className="bg-gray-800 text-white font-bold px-8">Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: NOVO GABARITO */}
            {showNewKeyModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Criar Gabarito Oficial</h3>
                            <button onClick={() => setShowNewKeyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título da Avaliação</label>
                                    <input className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800 font-bold" placeholder="Ex: Simulado Bimestral Matemática" value={keyTitle} onChange={e => setKeyTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantidade de Questões</label>
                                    <input type="number" min="1" max="50" className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800" value={keyQuestions} onChange={e => setKeyQuestions(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ListChecks size={18} className="text-red-500"/> Definir Respostas Corretas</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {Array.from({ length: keyQuestions }).map((_, i) => (
                                        <div key={i} className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-center">Questão {i + 1}</span>
                                            <select 
                                                className="w-full bg-white border border-gray-200 rounded-lg p-1 text-xs font-bold text-gray-800 outline-none focus:border-red-500"
                                                value={keyAnswers[i + 1] || ''}
                                                onChange={e => setKeyAnswers({...keyAnswers, [i + 1]: e.target.value})}
                                            >
                                                <option value="">-</option>
                                                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowNewKeyModal(false)}>Cancelar</Button>
                                <Button onClick={handleCreateKey} className="bg-red-600 hover:bg-red-700 px-8 shadow-lg font-bold uppercase tracking-widest"><Save size={18} className="mr-2"/> Salvar Gabarito</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
