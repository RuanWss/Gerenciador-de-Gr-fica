
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    getAllPEIs,
    syncAllDataWithGennera,
    getAnswerKeys,
    getCorrections,
    saveCorrection
} from '../services/firebaseService';
import { analyzeAnswerSheet } from '../services/geminiService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    SystemConfig, 
    SchoolEvent,
    PEIDocument,
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
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Save,
    X,
    Heart,
    Eye,
    RefreshCw,
    ScanLine,
    BookOpenCheck,
    CheckCircle,
    Activity,
    ClipboardList,
    Layers,
    Loader2
} from 'lucide-react';
import { CLASSES } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'omr' | 'pei' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    // --- DATA STATES ---
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    
    // --- OCR STATES ---
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ocrResult, setOcrResult] = useState<any>(null);

    // --- CONFIG LOCAL STATES ---
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerActive, setBannerActive] = useState(false);

    // --- UI STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState<string>('ALL');

    useEffect(() => {
        fetchInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, (logs) => setAttendanceLogs(logs));
        const unsubEvents = listenToEvents((evs) => setEvents(evs));
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setBannerMsg(cfg.bannerMessage || '');
            setBannerActive(cfg.isBannerActive || false);
        });

        return () => {
            unsubAttendance();
            unsubEvents();
            unsubConfig();
        };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents, peis, keys] = await Promise.all([
                getExams(),
                getStudents(),
                getAllPEIs(),
                getAnswerKeys()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setAllPeis(peis.sort((a,b) => b.updatedAt - a.updatedAt));
            setAnswerKeys(keys);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncGennera = async () => {
        if (!confirm("Isso irá sincronizar todos os alunos e turmas da Gennera via Cloud Proxy. Continuar?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização concluída com sucesso!");
            fetchInitialData();
        } catch (e: any) {
            alert(`Erro na Sincronização: ${e.message}`);
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    const handleOCRProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedKey || !e.target.files?.[0]) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeAnswerSheet(e.target.files[0], Object.keys(selectedKey.answers).length);
            setOcrResult(result);
        } catch (err) {
            alert("Erro ao processar imagem.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUpdateExam = async (exam: ExamRequest, status: ExamStatus) => {
        await updateExamStatus(exam.id, status);
        setExams(exams.map(e => e.id === exam.id ? { ...e, status } : e));
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

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = studentFilterClass === 'ALL' || s.className === studentFilterClass;
        return matchesSearch && matchesClass;
    });

    const presentStudentIds = new Set(attendanceLogs.map(log => log.studentId));

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Escola Admin</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="students" label="Alunos / Turmas" icon={Users} />
                    <SidebarItem id="omr" label="Correção OMR" icon={ScanLine} />
                    <SidebarItem id="calendar" label="Agenda" icon={Calendar} />
                    <SidebarItem id="pei" label="AEE (PEI)" icon={Heart} />
                    <SidebarItem id="config" label="Configuração" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-red-600/30 transition-all shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                            <Printer size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">{exam.teacherName} • {exam.gradeLevel} • <b className="text-white">{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {exam.fileUrl ? (
                                            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 transition-all text-xs font-bold uppercase tracking-widest">PDF</a>
                                        ) : (
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Sem arquivo</span>
                                        )}
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateExam(exam, ExamStatus.COMPLETED)} className="rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest">Concluir</Button>
                                        ) : (
                                            <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20">Finalizado</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                                <p className="text-gray-400">Total: {students.length} alunos cadastrados.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none w-64" placeholder="Buscar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <Button onClick={handleSyncGennera} isLoading={isSyncing} variant="outline" className="border-white/10 text-white font-black uppercase text-xs px-6 rounded-xl">
                                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Sincronizar Gennera
                                </Button>
                            </div>
                        </header>

                        {isSyncing && (
                            <div className="mb-6 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-blue-400 font-bold text-center animate-pulse flex items-center justify-center gap-4">
                                <Activity size={24}/> {syncProgress || 'Iniciando sincronização...'}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {['ALL', ...CLASSES].map(cls => (
                                <button key={cls} onClick={() => setStudentFilterClass(cls)} className={`p-4 rounded-2xl border transition-all text-left group ${studentFilterClass === cls ? 'bg-red-600 border-red-600' : 'bg-[#18181b] border-white/5 hover:border-red-600/50'}`}>
                                    <h4 className={`text-xs font-black uppercase tracking-widest ${studentFilterClass === cls ? 'text-red-100' : 'text-gray-500'}`}>{cls === 'ALL' ? 'Total Geral' : 'Turma'}</h4>
                                    <p className={`text-lg font-black ${studentFilterClass === cls ? 'text-white' : 'text-gray-200'}`}>{cls === 'ALL' ? 'Todos' : cls}</p>
                                    <p className={`text-[10px] font-bold ${studentFilterClass === cls ? 'text-red-200' : 'text-gray-500'}`}>{students.filter(s => cls === 'ALL' || s.className === cls).length} ALUNOS</p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Presença</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{s.name}</td>
                                            <td className="p-6 text-gray-400 font-medium">{s.className}</td>
                                            <td className="p-6">
                                                {presentStudentIds.has(s.id) ? (
                                                    <span className="text-green-500 font-black text-[10px] uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Presente</span>
                                                ) : (
                                                    <span className="text-gray-600 font-black text-[10px] uppercase">Ausente</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Correção de Provas (OCR)</h1>
                            <p className="text-gray-400">Realize a correção automática de gabaritos em massa via I.A.</p>
                        </header>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 shadow-2xl">
                                    <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-2"><ClipboardList className="text-brand-500"/> Gabaritos Ativos</h3>
                                    <div className="space-y-3">
                                        {answerKeys.map(key => (
                                            <button key={key.id} onClick={() => setSelectedKey(key)} className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedKey?.id === key.id ? 'bg-brand-600 border-brand-600 shadow-lg' : 'bg-black/40 border-white/5 hover:border-brand-500/50'}`}>
                                                <p className="text-[10px] font-black uppercase text-brand-200">{key.className}</p>
                                                <p className="font-bold text-white truncate uppercase">{key.title}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{Object.keys(key.answers).length} Questões</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                {selectedKey ? (
                                    <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[400px] flex flex-col">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black text-white uppercase">{selectedKey.title}</h3>
                                                <p className="text-gray-400 font-bold uppercase text-xs">{selectedKey.className} • {selectedKey.subject}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" className="border-white/10 text-white" onClick={() => setSelectedKey(null)}>Trocar Gabarito</Button>
                                            </div>
                                        </div>

                                        <div className="flex-1 border-4 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center group hover:border-brand-600 transition-all relative">
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleOCRProcess} disabled={isAnalyzing} />
                                            {isAnalyzing ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={64} className="text-brand-500 animate-spin" />
                                                    <p className="text-xl font-black text-white uppercase animate-pulse">Analisando Gabarito via I.A...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <ScanLine size={80} className="text-gray-700 group-hover:text-brand-500 transition-colors mb-6" />
                                                    <p className="text-xl font-black text-white uppercase mb-2">Clique ou arraste a imagem do cartão</p>
                                                    <p className="text-gray-500 max-w-xs">Certifique-se que o cartão está bem iluminado e reto para uma correção 100% precisa.</p>
                                                </>
                                            )}
                                        </div>

                                        {ocrResult && (
                                            <div className="mt-8 bg-green-600/10 border border-green-500/20 rounded-3xl p-6 animate-in zoom-in-95">
                                                <h4 className="text-lg font-black text-green-500 uppercase mb-4 flex items-center gap-2"><CheckCircle size={20}/> Resultado Detectado</h4>
                                                <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl mb-4">
                                                    <p className="text-gray-400 text-xs font-bold">ALUNO IDENTIFICADO</p>
                                                    <p className="text-white font-black uppercase">{ocrResult.studentId || 'NÃO IDENTIFICADO'}</p>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {Object.entries(ocrResult.answers).map(([q, ans]) => (
                                                        <div key={q} className="bg-black/40 p-2 rounded-xl text-center border border-white/5">
                                                            <p className="text-[10px] text-gray-500 font-black">Q{q}</p>
                                                            <p className="text-lg font-black text-white">{ans as string}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center bg-black/20 border-2 border-dashed border-white/10 rounded-3xl p-20 text-center opacity-40">
                                        <Layers size={80} className="text-gray-500 mb-6" />
                                        <h3 className="text-2xl font-black text-white uppercase">Selecione um gabarito à esquerda</h3>
                                        <p className="text-gray-500 mt-2">Para iniciar a correção por OMR/OCR, é necessário escolher o gabarito oficial.</p>
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
