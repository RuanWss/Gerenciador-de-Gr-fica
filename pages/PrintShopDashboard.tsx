// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    listenToSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera,
    saveAnswerKey,
    getAnswerKeys,
    deleteAnswerKey,
    saveCorrection,
    getCorrectionsByGabarito,
    getLessonPlans
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
    Trash2, 
    BookOpen, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    CheckCircle,
    RefreshCw,
    FileText, // Usando FileText como substituto seguro para ScanLine/Scan
    Camera,
    Loader2,
    Trophy,
    Target
} from 'lucide-react';
import { CLASSES } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'plans' | 'config' | 'answer_keys'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

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
    const [newEventDesc, setNewEventDesc] = useState('');

    // Answer Keys & OCR
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [keyForm, setKeyForm] = useState<{examTitle: string, className: string, numQuestions: number, answers: Record<number, string>}>({
        examTitle: '', className: '', numQuestions: 10, answers: {}
    });
    const [correctionMode, setCorrectionMode] = useState<AnswerKey | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [correctionResults, setCorrectionResults] = useState<StudentCorrection[]>([]);
    const [lastScanResult, setLastScanResult] = useState<StudentCorrection | null>(null);

    // Config
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

    // --- EFFECTS ---

    useEffect(() => {
        const fetchInitial = async () => {
            setIsLoading(true);
            try {
                const [allExams, allStudents, keys] = await Promise.all([
                    getExams(),
                    getStudents(),
                    getAnswerKeys()
                ]);
                
                setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
                setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
                setAnswerKeys(keys);
            } catch (e) {
                console.error("Erro ao carregar dados iniciais:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => setAttendanceLogs(logs));
        const unsubConfig = listenToSystemConfig(setSysConfig);
        const unsubEvents = listenToEvents(setEvents);

        return () => {
            unsubAttendance();
            unsubConfig();
            unsubEvents();
        };
    }, []);

    // --- HANDLERS (OCR) ---

    const handleSaveKey = async () => {
        if (!keyForm.examTitle || !keyForm.className) return alert("Preencha título e turma.");
        setIsSavingKey(true);
        try {
            await saveAnswerKey({ 
                ...keyForm, 
                id: '', 
                subject: 'Geral', 
                createdAt: Date.now() 
            });
            setShowKeyModal(false);
            setAnswerKeys(await getAnswerKeys());
            setKeyForm({ examTitle: '', className: '', numQuestions: 10, answers: {} });
        } catch (e) { 
            alert("Erro ao salvar gabarito."); 
        } finally { 
            setIsSavingKey(false); 
        }
    };

    const handleDeleteKey = async (id: string) => {
        if(confirm("Excluir este gabarito?")) {
            await deleteAnswerKey(id);
            setAnswerKeys(await getAnswerKeys());
        }
    };

    const handleFileOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !correctionMode) return;
        setIsAnalyzing(true);
        setLastScanResult(null);
        try {
            const file = e.target.files[0];
            const result = await analyzeAnswerSheet(file, correctionMode.numQuestions);
            
            let corrects = 0;
            const studentAnswers = result.answers || {};
            
            // Calculate Score
            for (let i = 1; i <= correctionMode.numQuestions; i++) {
                if (studentAnswers[i] && correctionMode.answers[i] && studentAnswers[i].toUpperCase() === correctionMode.answers[i].toUpperCase()) {
                    corrects++;
                }
            }

            // Match Student
            const matchedStudent = students.find(s => s.id === result.studentId || (result.studentId && s.name.toUpperCase().includes(result.studentId.toUpperCase())));
            const finalStudentName = matchedStudent ? matchedStudent.name : (result.studentId || 'ESTUDANTE NÃO IDENTIFICADO');
            const finalStudentId = matchedStudent ? matchedStudent.id : 'ID_' + Date.now();

            const finalResult: StudentCorrection = {
                id: '',
                answerKeyId: correctionMode.id,
                studentId: finalStudentId,
                studentName: finalStudentName,
                studentClass: matchedStudent?.className || correctionMode.className,
                score: (corrects / correctionMode.numQuestions) * 10,
                totalQuestions: correctionMode.numQuestions,
                correctAnswers: corrects,
                answers: studentAnswers,
                timestamp: Date.now()
            };

            await saveCorrection(finalResult);
            setLastScanResult(finalResult);
            setCorrectionResults(await getCorrectionsByGabarito(correctionMode.id));
        } catch (e) {
            console.error(e);
            alert("Erro no processamento da imagem.");
        } finally {
            setIsAnalyzing(false);
            e.target.value = ''; // Reset input
        }
    };

    const openCorrectionMode = async (key: AnswerKey) => {
        setCorrectionMode(key);
        setIsLoading(true);
        try {
            setCorrectionResults(await getCorrectionsByGabarito(key.id));
        } finally {
            setIsLoading(false);
        }
    };

    // --- OTHER HANDLERS ---

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSyncGennera = async () => {
        if (!confirm("Sincronizar dados?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncMsg(msg));
            const allStudents = await getStudents();
            setStudents(allStudents);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncing(false);
            setSyncMsg('');
        }
    };

    const filteredExams = exams.filter(e => {
        const matchStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchStatus && matchSearch;
    });

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                 <div className="mb-6 flex-1 overflow-y-auto">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel da Escola</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="answer_keys" label="Gabaritos & OCR" icon={FileText} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                 </div>
                 
                 <div className="mt-auto pt-6 border-t border-white/10">
                     <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                         <p className="text-xs font-bold text-blue-300 mb-2">Resumo do Dia</p>
                         <div className="flex justify-between text-xs text-gray-300">
                             <span>Cópias Pendentes:</span>
                             <span className="font-bold text-white">{exams.filter(e => e.status === ExamStatus.PENDING).length}</span>
                         </div>
                     </div>
                 </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 bg-transparent custom-scrollbar">
                
                {/* --- TAB: ANSWER KEYS & OCR --- */}
                {activeTab === 'answer_keys' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                        {!correctionMode ? (
                            <>
                                <header className="mb-10 flex justify-between items-center">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Gabaritos & OCR</h1>
                                        <p className="text-gray-400 text-sm mt-1">Gerencie gabaritos e faça a correção automática de cartões.</p>
                                    </div>
                                    <Button onClick={() => setShowKeyModal(true)} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">
                                        <Plus size={18} className="mr-2"/> Criar Gabarito
                                    </Button>
                                </header>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {answerKeys.map(key => (
                                        <div key={key.id} className="bg-[#18181b] border-2 border-white/5 p-8 rounded-[2.5rem] flex flex-col relative group hover:border-red-600/30 transition-all">
                                            <button onClick={() => handleDeleteKey(key.id)} className="absolute top-6 right-6 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                            <div className="mb-6">
                                                <h3 className="text-xl font-black uppercase tracking-tight mb-1 text-white">{key.examTitle}</h3>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{key.className} • {key.numQuestions} Questões</p>
                                            </div>
                                            <Button onClick={() => openCorrectionMode(key)} className="w-full bg-white/5 hover:bg-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                                Corrigir Cartões
                                            </Button>
                                        </div>
                                    ))}
                                    {answerKeys.length === 0 && (
                                        <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                            <FileText size={48} className="mx-auto mb-4 text-gray-600" />
                                            <p className="font-black uppercase tracking-widest text-sm text-gray-500">Nenhum gabarito cadastrado.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="animate-in fade-in">
                                <button onClick={() => setCorrectionMode(null)} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 font-black uppercase text-[10px] tracking-widest">
                                    <ChevronLeft size={16}/> Voltar para Gabaritos
                                </button>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* SCAN AREA */}
                                    <div className="bg-[#1c1917] border-2 border-red-600/50 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-white">Scan IA</h3>
                                        <div className="border-3 border-dashed border-white/10 rounded-[2rem] p-12 text-center hover:border-red-600 relative bg-black/20 group cursor-pointer overflow-hidden transition-all">
                                            <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileOCR} disabled={isAnalyzing} />
                                            {isAnalyzing ? (
                                                <Loader2 size={48} className="text-red-500 animate-spin mx-auto" />
                                            ) : (
                                                <Camera size={48} className="mx-auto text-gray-700 group-hover:text-red-500 transition-all" />
                                            )}
                                            <p className="text-gray-500 font-black uppercase text-[10px] mt-4 tracking-widest group-hover:text-white">
                                                {isAnalyzing ? 'Processando...' : 'Capturar Foto do Cartão'}
                                            </p>
                                        </div>

                                        {lastScanResult && (
                                            <div className="mt-8 p-6 bg-green-600/10 border border-green-500/30 rounded-2xl animate-in zoom-in-95">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Resultado</p>
                                                    <Trophy size={16} className="text-yellow-500"/>
                                                </div>
                                                <p className="text-lg font-black text-white uppercase leading-tight mb-2">{lastScanResult.studentName}</p>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl font-black text-green-500">{lastScanResult.score.toFixed(1)}</span>
                                                    <span className="text-xs text-gray-500 font-bold mb-1">/ 10.0</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                                    Acertos: {lastScanResult.correctAnswers} de {lastScanResult.totalQuestions}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* RESULTS TABLE */}
                                    <div className="lg:col-span-2 bg-[#18181b] border-2 border-white/5 rounded-[3rem] overflow-hidden flex flex-col h-[600px]">
                                        <div className="p-8 bg-black/20 border-b border-white/5 flex justify-between items-center">
                                            <span className="font-black uppercase text-xs tracking-widest text-gray-400">Correções Realizadas</span>
                                            <span className="bg-white/10 text-white px-3 py-1 rounded-full text-[10px] font-black">{correctionResults.length}</span>
                                        </div>
                                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#121214] text-gray-500 font-bold uppercase text-[9px] sticky top-0">
                                                    <tr>
                                                        <th className="p-6">Estudante</th>
                                                        <th className="p-6 text-center">Nota</th>
                                                        <th className="p-6 text-right">Data</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {correctionResults.map(res => (
                                                        <tr key={res.id} className="hover:bg-white/[0.02]">
                                                            <td className="p-6 font-black uppercase text-sm text-gray-300">{res.studentName}</td>
                                                            <td className="p-6 font-black text-center text-white text-lg">{res.score.toFixed(1)}</td>
                                                            <td className="p-6 text-[10px] text-gray-600 font-bold text-right">{new Date(res.timestamp).toLocaleTimeString()}</td>
                                                        </tr>
                                                    ))}
                                                    {correctionResults.length === 0 && (
                                                        <tr><td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-30">Nenhuma correção ainda</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* KEY CREATION MODAL */}
                        {showKeyModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-4xl rounded-[3.5rem] shadow-2xl p-10 overflow-y-auto max-h-[90vh] custom-scrollbar">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white">Novo Gabarito Oficial</h3>
                                        <button onClick={() => setShowKeyModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                                    </div>
                                    <div className="space-y-8">
                                        <input 
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" 
                                            placeholder="Título da Prova" 
                                            value={keyForm.examTitle} 
                                            onChange={e => setKeyForm({...keyForm, examTitle: e.target.value})} 
                                        />
                                        <div className="grid grid-cols-2 gap-6">
                                            <select 
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-red-600" 
                                                value={keyForm.className} 
                                                onChange={e => setKeyForm({...keyForm, className: e.target.value})}
                                            >
                                                <option value="">-- Turma --</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="100"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" 
                                                value={keyForm.numQuestions} 
                                                onChange={e => setKeyForm({...keyForm, numQuestions: Number(e.target.value)})} 
                                                placeholder="Qtd Questões"
                                            />
                                        </div>
                                        
                                        <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Respostas Corretas</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {Array.from({length: keyForm.numQuestions}).map((_, i) => (
                                                    <div key={i} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                                                        <span className="text-[10px] font-black text-gray-400 text-center">Questão {i+1}</span>
                                                        <div className="flex justify-center gap-1">
                                                            {['A','B','C','D','E'].map(opt => (
                                                                <button 
                                                                    key={opt} 
                                                                    onClick={() => setKeyForm({...keyForm, answers: {...keyForm.answers, [i+1]: opt}})} 
                                                                    className={`w-6 h-6 rounded text-[9px] font-black transition-all ${keyForm.answers[i+1] === opt ? 'bg-red-600 text-white' : 'bg-black/40 text-gray-500 hover:text-white'}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Button onClick={handleSaveKey} isLoading={isSavingKey} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-red-700 transition-colors">
                                            <Save size={18} className="mr-2"/> Salvar Gabarito
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* EXAMS TAB */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Central de Cópias</h1>
                                <p className="text-gray-400">Gerencie as solicitações de impressão dos professores.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 outline-none w-64"
                                        value={examSearch}
                                        onChange={e => setExamSearch(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="bg-white/5 border border-white/10 rounded-lg text-white text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-red-500"
                                    value={examFilter}
                                    onChange={e => setExamFilter(e.target.value)}
                                >
                                    <option value="ALL" className="bg-gray-900">Todos</option>
                                    <option value={ExamStatus.PENDING} className="bg-gray-900">Pendentes</option>
                                    <option value={ExamStatus.IN_PROGRESS} className="bg-gray-900">Imprimindo</option>
                                    <option value={ExamStatus.COMPLETED} className="bg-gray-900">Concluídos</option>
                                </select>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:border-gray-700 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                exam.status === ExamStatus.PENDING ? 'bg-yellow-900/20 text-yellow-500 border-yellow-500/20' :
                                                exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-900/20 text-blue-500 border-blue-500/20' :
                                                'bg-green-900/20 text-green-500 border-green-500/20'
                                            }`}>
                                                {exam.status === ExamStatus.PENDING ? 'Pendente' :
                                                 exam.status === ExamStatus.IN_PROGRESS ? 'Em Andamento' : 'Concluído'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {new Date(exam.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{exam.title}</h3>
                                        <p className="text-sm text-gray-400 mb-2">
                                            Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel} • <span className="text-white font-bold">{exam.quantity} cópias</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a 
                                            href={exam.fileUrls?.[0]} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors"
                                        >
                                            Ver Arquivo
                                        </a>
                                        {exam.status === ExamStatus.PENDING && (
                                            <button 
                                                onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                                            >
                                                Iniciar Impressão
                                            </button>
                                        )}
                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                            <button 
                                                onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
                                            >
                                                Concluir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredExams.length === 0 && (
                                <div className="text-center py-20 text-gray-500">
                                    Nenhuma solicitação encontrada.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STUDENTS TAB (Mantido Simplificado) */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                             <div>
                                <h1 className="text-3xl font-bold text-white">Gestão de Alunos</h1>
                                <p className="text-gray-400">Monitoramento de frequência em tempo real.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {isSyncing && <p className="text-[10px] font-black text-blue-400 animate-pulse">{syncMsg}</p>}
                                <button 
                                    onClick={handleSyncGennera}
                                    disabled={isSyncing}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg transition-all"
                                >
                                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                    Sincronizar
                                </button>
                            </div>
                        </header>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {CLASSES.slice(0, 4).map(cls => (
                                <div key={cls} className="p-4 rounded-xl border bg-[#18181b] border-gray-800 text-gray-400">
                                    <h3 className="text-sm font-black mb-2">{cls}</h3>
                                    <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">{students.filter(s => s.className === cls).length} Alunos</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
