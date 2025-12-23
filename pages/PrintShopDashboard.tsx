
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
    deleteExamRequest
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
    Printer, Search, Calendar, Users, Settings, Megaphone, Trash2, 
    BookOpenCheck, Plus, ChevronLeft, ChevronRight, Save, X, 
    CheckCircle, XCircle, ScanLine, Target, GraduationCap, Download,
    FileText, Clock, ClipboardCheck, Eye, Loader2, CalendarDays
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'config' | 'omr'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Exams
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examFilter, setExamFilter] = useState<string>('ALL');
    const [examSearch, setExamSearch] = useState('');

    // Students & Attendance
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');

    // Calendar
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState<'event' | 'holiday' | 'exam' | 'meeting'>('event');

    // OMR Correction States
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [showKeyForm, setShowKeyForm] = useState(false);
    const [newKeyData, setNewKeyData] = useState<Partial<AnswerKey>>({ subject: '', answers: {} });
    const [numQuestions, setNumQuestions] = useState(10);
    const [correctionFile, setCorrectionFile] = useState<File | null>(null);
    const [selectedStudentForCorrection, setSelectedStudentForCorrection] = useState('');
    const [currentCorrections, setCurrentCorrections] = useState<StudentCorrection[]>([]);
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Plans
    const [plans, setPlans] = useState<LessonPlan[]>([]);

    // Config
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
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

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
        };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        const [allStudents, allExams, allPlans, allKeys] = await Promise.all([
            getStudents(),
            getExams(),
            getLessonPlans(),
            getAnswerKeys()
        ]);
        setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
        setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
        setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
        setAnswerKeys(allKeys);
        setIsLoading(false);
    };

    // --- OMR HANDLERS ---
    const handleSaveNewKey = async () => {
        if (!newKeyData.subject || !newKeyData.answers) return;
        setIsSaving(true);
        try {
            await saveAnswerKey({
                id: '',
                examId: 'manual_' + Date.now(),
                subject: newKeyData.subject,
                answers: newKeyData.answers as Record<number, string>
            });
            setShowKeyForm(false);
            fetchInitialData();
        } catch (e) { alert("Erro ao salvar gabarito"); }
        finally { setIsSaving(false); }
    };

    const handleSelectKey = async (key: AnswerKey) => {
        setSelectedKey(key);
        const corrs = await getCorrections(key.id);
        setCurrentCorrections(corrs);
    };

    const handleCorrectSheet = async () => {
        if (!selectedKey || !correctionFile || !selectedStudentForCorrection) return;
        setIsCorrecting(true);
        try {
            const student = students.find(s => s.id === selectedStudentForCorrection);
            const detectedAnswers = await analyzeAnswerSheet(correctionFile, Object.keys(selectedKey.answers).length);
            
            let scoreCount = 0;
            Object.entries(selectedKey.answers).forEach(([q, ans]) => {
                if (detectedAnswers[Number(q)] === ans) scoreCount++;
            });

            const finalScore = (scoreCount / Object.keys(selectedKey.answers).length) * 10;

            await saveCorrection({
                id: '',
                studentId: student!.id,
                studentName: student!.name,
                answerKeyId: selectedKey.id,
                score: finalScore,
                answers: detectedAnswers
            });
            
            setCorrectionFile(null);
            setSelectedStudentForCorrection('');
            const updatedCorrs = await getCorrections(selectedKey.id);
            setCurrentCorrections(updatedCorrs);
            alert("Prova corrigida com sucesso!");
        } catch (e) { alert("Erro na leitura I.A. Verifique a imagem."); }
        finally { setIsCorrecting(false); }
    };

    const handleDeleteExam = async (id: string) => {
        if (confirm("Excluir este pedido?")) {
            await deleteExamRequest(id);
            setExams(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleUpdateStatus = async (examId: string, status: ExamStatus) => {
        await updateExamStatus(examId, status);
        setExams(prev => prev.map(e => e.id === examId ? { ...e, status } : e));
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

    const handleSaveEvent = async () => {
        if (!newEventTitle || !newEventDate) return alert("Preencha título e data");
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    // Calendar Logic
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const calendarDays = [];
        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

        return (
            <div className="bg-[#18181b] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{monthName}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-4 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 min-h-[400px]">
                    {calendarDays.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} className="border-b border-r border-white/5 bg-black/20"></div>;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = events.filter(e => e.date === dateStr);
                        return (
                            <div key={day} className="border-b border-r border-white/5 p-2 min-h-[100px] hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => {setNewEventDate(dateStr); setShowEventModal(true); setSelectedEvent(null); setNewEventTitle('');}}>
                                <span className="text-xs font-bold text-gray-500 group-hover:text-white">{day}</span>
                                <div className="mt-1 space-y-1">
                                    {dayEvents.map(ev => (
                                        <div key={ev.id} className={`text-[8px] p-1 rounded font-black uppercase truncate ${ev.type === 'holiday' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {ev.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const filteredExams = exams.filter(e => {
        const matchesStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchesSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesClass = studentFilterClass === 'ALL' || s.classId === studentFilterClass;
        return matchesSearch && matchesClass;
    });

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Administração</p>
                    <SidebarItem id="exams" label="Gráfica / Pedidos" icon={Printer} />
                    <SidebarItem id="omr" label="Correção I.A." icon={ScanLine} />
                    <SidebarItem id="students" label="Gestão de Turmas" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda / Eventos" icon={CalendarDays} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Printer className="text-red-500" /> Gráfica e Cópias</h1>
                                <p className="text-gray-400">Gerenciamento de pedidos de impressão.</p>
                            </div>
                            <div className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/10">
                                <button onClick={() => setExamFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${examFilter === 'ALL' ? 'bg-white text-black' : 'text-gray-400'}`}>Todos</button>
                                <button onClick={() => setExamFilter(ExamStatus.PENDING)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${examFilter === ExamStatus.PENDING ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>Pendentes</button>
                                <button onClick={() => setExamFilter(ExamStatus.COMPLETED)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${examFilter === ExamStatus.COMPLETED ? 'bg-green-500 text-black' : 'text-gray-400'}`}>Concluídos</button>
                            </div>
                        </header>
                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none" placeholder="Buscar pedidos..." value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex items-center justify-between gap-6 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}><FileText size={32} /></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">Prof. {exam.teacherName} • {exam.gradeLevel} • <b>{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400"><Download size={20} /></a>
                                        {exam.status === ExamStatus.PENDING && (
                                            <button onClick={() => handleUpdateStatus(exam.id, ExamStatus.IN_PROGRESS)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">Iniciar</button>
                                        )}
                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button onClick={() => handleUpdateStatus(exam.id, ExamStatus.COMPLETED)} className="bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase">Concluir</button>
                                        )}
                                        <button onClick={() => handleDeleteExam(exam.id)} className="p-3 text-gray-500 hover:text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ABA CORREÇÃO OMR --- */}
                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><ScanLine className="text-red-500" /> Correção Automática</h1>
                                <p className="text-gray-400">Leitura de cartões-resposta via inteligência artificial.</p>
                            </div>
                            <Button onClick={() => { setShowKeyForm(true); setNewKeyData({subject: '', answers: {}}); setNumQuestions(10); }}>
                                <Plus size={18} className="mr-2"/> Novo Gabarito
                            </Button>
                        </header>

                        {showKeyForm ? (
                            <div className="bg-white rounded-[2.5rem] p-10 animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-8 border-b pb-6">
                                    <h3 className="text-2xl font-black text-gray-800 uppercase">Configurar Gabarito</h3>
                                    <button onClick={() => setShowKeyForm(false)} className="text-gray-400 hover:text-red-500"><X size={28}/></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Disciplina</label>
                                        <select className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none" value={newKeyData.subject} onChange={e => setNewKeyData({...newKeyData, subject: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nº de Questões</label>
                                        <input type="number" className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                                    {Array.from({ length: numQuestions }).map((_, i) => (
                                        <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <span className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Q. {i+1}</span>
                                            <div className="flex gap-1 justify-between">
                                                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                    <button 
                                                        key={opt}
                                                        onClick={() => {
                                                            const current = {...newKeyData.answers};
                                                            current[i+1] = opt;
                                                            setNewKeyData({...newKeyData, answers: current});
                                                        }}
                                                        className={`w-8 h-8 rounded-full text-[10px] font-black transition-all ${newKeyData.answers?.[i+1] === opt ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" className="h-14 px-8" onClick={() => setShowKeyForm(false)}>Cancelar</Button>
                                    <Button className="h-14 px-12" onClick={handleSaveNewKey} isLoading={isSaving}><Save size={20} className="mr-2"/> Salvar Gabarito</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-4">
                                    <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2"><Target size={20} className="text-red-500"/> Gabaritos Ativos</h3>
                                    {answerKeys.map(key => (
                                        <button 
                                            key={key.id}
                                            onClick={() => handleSelectKey(key)}
                                            className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all ${selectedKey?.id === key.id ? 'bg-white border-red-500 text-gray-900' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'}`}
                                        >
                                            <h4 className="font-black text-sm uppercase leading-tight">{key.subject}</h4>
                                            <p className="text-[10px] font-bold opacity-60 mt-1">{Object.keys(key.answers).length} Questões</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="lg:col-span-2">
                                    {selectedKey ? (
                                        <div className="space-y-6 animate-in slide-in-from-right-4">
                                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                                                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                                                    <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">Scanner OMR: {selectedKey.subject}</h3>
                                                    <button onClick={async () => { if(confirm("Remover gabarito?")) { await deleteAnswerKey(selectedKey.id); setSelectedKey(null); fetchInitialData(); } }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Aluno</label>
                                                        <select className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-800 outline-none" value={selectedStudentForCorrection} onChange={e => setSelectedStudentForCorrection(e.target.value)}>
                                                            <option value="">Selecione o Aluno...</option>
                                                            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Foto da Prova</label>
                                                        <div className="relative">
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => e.target.files && setCorrectionFile(e.target.files[0])} />
                                                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs font-bold text-gray-400 bg-gray-50">
                                                                {correctionFile ? correctionFile.name : 'Clique para selecionar foto'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest" isLoading={isCorrecting} onClick={handleCorrectSheet} disabled={!correctionFile || !selectedStudentForCorrection}>
                                                    Iniciar Correção I.A.
                                                </Button>
                                            </div>

                                            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
                                                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                                                    <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><GraduationCap size={20} className="text-red-600"/> Histórico de Notas</h3>
                                                </div>
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                                        <tr>
                                                            <th className="p-6">Aluno</th>
                                                            <th className="p-6 text-center">Nota</th>
                                                            <th className="p-6 text-right">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {currentCorrections.map(c => (
                                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="p-6 font-bold text-gray-800">{c.studentName}</td>
                                                                <td className="p-6 text-center">
                                                                    <span className={`text-lg font-black ${c.score >= 6 ? 'text-green-600' : 'text-red-600'}`}>{c.score.toFixed(1)}</span>
                                                                </td>
                                                                <td className="p-6 text-right">
                                                                    <button className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {currentCorrections.length === 0 && (
                                                            <tr><td colSpan={3} className="p-12 text-center text-gray-400 italic font-medium uppercase text-xs tracking-widest">Nenhuma correção realizada.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center bg-white/5 border-4 border-dashed border-white/5 rounded-[4rem] p-20 text-center opacity-30">
                                            <ScanLine size={100} className="text-gray-500 mb-6" />
                                            <h3 className="text-2xl font-black text-gray-500 uppercase">Selecione um Gabarito para Corrigir</h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA TURMAS --- */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Users className="text-red-500" /> Gestão de Turmas</h1></header>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(cls => (
                                <button key={cls} onClick={() => setStudentFilterClass(cls)} className={`p-4 rounded-2xl border text-left transition-all ${studentFilterClass === cls ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}>
                                    <h3 className="font-black text-sm uppercase">{cls}</h3>
                                    <p className="text-[10px] opacity-70 mt-1">{students.filter(s => s.className === cls).length} Alunos</p>
                                </button>
                            ))}
                            <button onClick={() => setStudentFilterClass('ALL')} className={`p-4 rounded-2xl border text-left transition-all ${studentFilterClass === 'ALL' ? 'bg-white text-black' : 'bg-black/40 border-white/10 text-gray-400'}`}>TODOS</button>
                        </div>
                        <div className="bg-black/20 rounded-[2.5rem] border border-white/10 overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/10">
                                    <tr><th className="p-6">Aluno</th><th className="p-6">Turma</th><th className="p-6">Biometria</th><th className="p-6 text-center">Presença</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-white/5">
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-800 border border-white/5 overflow-hidden">{student.photoUrl && <img src={student.photoUrl} className="w-full h-full object-cover"/>}</div>
                                                <span className="font-bold text-white">{student.name}</span>
                                            </td>
                                            <td className="p-6 text-gray-400">{student.className}</td>
                                            <td className="p-6">{student.photoUrl ? <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded-lg">Cadastrado</span> : <span className="text-[10px] font-black text-red-500 uppercase bg-red-500/10 px-2 py-1 rounded-lg">Pendente</span>}</td>
                                            <td className="p-6 text-center">{attendanceLogs.some(l => l.studentId === student.id) ? <CheckCircle size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-gray-700 mx-auto" />}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {/* --- ABA AGENDA --- */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><CalendarDays className="text-red-500" /> Agenda Escolar</h1></header>
                        {renderCalendar()}
                    </div>
                )}

                {/* --- ABA PLANEJAMENTO --- */}
                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><BookOpenCheck className="text-red-500" /> Planejamentos</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${plan.type === 'daily' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'}`}>{plan.type === 'daily' ? 'Diário' : 'Bimestral'}</span>
                                    <h4 className="font-bold text-white text-lg mt-3">{plan.type === 'daily' ? plan.topic : plan.period}</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase mb-4">{plan.className} • {plan.teacherName}</p>
                                    <div className="text-[10px] text-gray-400 line-clamp-3 bg-black/40 p-3 rounded-xl border border-white/5">{plan.content || plan.semesterContents || 'Sem resumo.'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ABA CONFIG --- */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Settings className="text-red-500" /> Configurações</h1></header>
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><input type="checkbox" id="bannerActive" className="h-6 w-6 rounded border-white/10 bg-black text-red-600" checked={configIsBannerActive} onChange={e => setConfigIsBannerActive(e.target.checked)}/><label htmlFor="bannerActive" className="text-lg font-bold text-white uppercase">Ativar Banner na TV</label></div>
                                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Mensagem</label><textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" rows={3} value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Ex: Reunião de Pais..."/></div>
                                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Tipo de Alerta</label><div className="flex gap-2">{(['info', 'warning', 'error', 'success'] as const).map(type => (<button key={type} onClick={() => setConfigBannerType(type)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${configBannerType === type ? 'bg-red-600 text-white' : 'bg-black/40 text-gray-400 border border-white/10'}`}>{type}</button>))}</div></div>
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-16 rounded-2xl text-lg font-black uppercase"><Save size={20} className="mr-2"/> Salvar Configurações</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* EVENT MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
                        <h3 className="text-2xl font-black text-gray-800 mb-6 uppercase tracking-tight">Evento / Agenda</h3>
                        <div className="space-y-4">
                            <input className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold outline-none" placeholder="Título do Evento" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
                            <input type="date" className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold outline-none" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                            <select className="w-full border-2 border-gray-100 rounded-xl p-4 text-gray-900 font-bold outline-none" value={newEventType} onChange={e => setNewEventType(e.target.value as any)}>
                                <option value="event">Evento Geral</option>
                                <option value="holiday">Feriado / Recesso</option>
                                <option value="exam">Dia de Prova</option>
                            </select>
                        </div>
                        <div className="flex gap-2 mt-8">
                            <Button className="flex-1 h-14" onClick={handleSaveEvent}>Salvar</Button>
                            <Button variant="secondary" className="h-14" onClick={() => setShowEventModal(false)}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
