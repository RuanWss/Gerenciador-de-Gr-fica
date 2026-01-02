
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
    
    // --- OCR/OMR STATES ---
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
        if (!confirm("Isso irá sincronizar todos os alunos e turmas cadastrados no Gennera. Deseja continuar?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização com Gennera finalizada!");
            fetchInitialData();
        } catch (e: any) {
            alert(`Erro na sincronização: ${e.message}`);
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
            if (result.studentId) {
                // Tenta encontrar o aluno
                const studentFound = students.find(s => s.id === result.studentId);
                if (studentFound) {
                    alert(`Gabarito identificado para: ${studentFound.name}`);
                }
            }
        } catch (err) {
            alert("Erro ao processar imagem para OCR.");
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
            {/* Sidebar Admin */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Painel Gestão</p>
                    <SidebarItem id="exams" label="Gráfica / Cópias" icon={Printer} />
                    <SidebarItem id="students" label="Alunos / Turmas" icon={Users} />
                    <SidebarItem id="omr" label="Correção OCR" icon={ScanLine} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="pei" label="AEE (PEI)" icon={Heart} />
                    <SidebarItem id="config" label="Configuração" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* GRÁFICA / CÓPIAS */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pedidos da Gráfica</h1>
                            <p className="text-gray-400">Gerenciamento de impressões pendentes dos professores.</p>
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
                                            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 transition-all text-xs font-bold uppercase tracking-widest">Abrir PDF</a>
                                        ) : (
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Manual</span>
                                        )}
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateExam(exam, ExamStatus.COMPLETED)} className="rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest">Finalizar</Button>
                                        ) : (
                                            <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20">Concluído</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ALUNOS / TURMAS */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                                <p className="text-gray-400">Sincronização com Gennera e monitoramento de presença.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white outline-none w-64" placeholder="Filtrar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <Button onClick={handleSyncGennera} isLoading={isSyncing} variant="outline" className="border-white/10 text-white font-black uppercase text-xs px-6 rounded-xl hover:bg-white/5 transition-all">
                                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Sincronizar Gennera
                                </Button>
                            </div>
                        </header>

                        {isSyncing && (
                            <div className="mb-6 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-blue-400 font-bold text-center animate-pulse flex items-center justify-center gap-4">
                                <Activity size={24}/> {syncProgress || 'Iniciando integração...'}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                            {['ALL', ...CLASSES].map(cls => {
                                const count = students.filter(s => cls === 'ALL' || s.className === cls).length;
                                return (
                                    <button key={cls} onClick={() => setStudentFilterClass(cls)} className={`p-4 rounded-2xl border transition-all text-left group ${studentFilterClass === cls ? 'bg-red-600 border-red-600 shadow-lg shadow-red-900/20' : 'bg-[#18181b] border-white/5 hover:border-red-600/50'}`}>
                                        <h4 className={`text-[9px] font-black uppercase tracking-widest ${studentFilterClass === cls ? 'text-red-100' : 'text-gray-500'}`}>{cls === 'ALL' ? 'Total' : 'Turma'}</h4>
                                        <p className={`text-sm font-black truncate ${studentFilterClass === cls ? 'text-white' : 'text-gray-200'}`}>{cls === 'ALL' ? 'Todos' : cls}</p>
                                        <p className={`text-[10px] font-bold ${studentFilterClass === cls ? 'text-red-200' : 'text-gray-500'}`}>{count} ALUNOS</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Nome do Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Status Presença (Hoje)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase">{s.name}</td>
                                            <td className="p-6 text-gray-400 font-medium uppercase">{s.className}</td>
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

                {/* CORREÇÃO OMR/OCR */}
                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Correção de Gabaritos (OCR)</h1>
                            <p className="text-gray-400">Utilize a I.A. Gemini para corrigir cartões-resposta escaneados ou fotografados.</p>
                        </header>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 shadow-2xl">
                                    <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-2"><ClipboardList className="text-brand-500"/> Gabaritos Oficiais</h3>
                                    <div className="space-y-3">
                                        {answerKeys.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum gabarito cadastrado pelos professores.</p>}
                                        {answerKeys.map(key => (
                                            <button key={key.id} onClick={() => { setSelectedKey(key); setOcrResult(null); }} className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedKey?.id === key.id ? 'bg-brand-600 border-brand-600 shadow-lg' : 'bg-black/40 border-white/5 hover:border-brand-500/50'}`}>
                                                <p className="text-[10px] font-black uppercase text-brand-200 tracking-widest">{key.className}</p>
                                                <p className="font-bold text-white truncate uppercase">{key.title}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{Object.keys(key.answers).length} Questões de Múltipla Escolha</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                {selectedKey ? (
                                    <div className="bg-[#18181b] border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            <div>
                                                <h3 className="text-2xl font-black text-white uppercase">{selectedKey.title}</h3>
                                                <p className="text-gray-400 font-bold uppercase text-xs tracking-wider">{selectedKey.className} • {selectedKey.subject}</p>
                                            </div>
                                            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => setSelectedKey(null)}>Trocar Gabarito</Button>
                                        </div>

                                        <div className="flex-1 border-4 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center group hover:border-brand-600 transition-all relative z-10">
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleOCRProcess} disabled={isAnalyzing} />
                                            {isAnalyzing ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={80} className="text-brand-500 animate-spin" />
                                                    <p className="text-2xl font-black text-white uppercase animate-pulse">Analisando Gabarito com I.A...</p>
                                                    <p className="text-gray-500">Isso pode levar alguns segundos.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <ScanLine size={100} className="text-gray-700 group-hover:text-brand-500 transition-colors mb-6" />
                                                    <p className="text-2xl font-black text-white uppercase mb-2">Selecione a Foto do Cartão</p>
                                                    <p className="text-gray-500 max-w-sm">Capture a imagem do cartão-resposta. Garanta que o cabeçalho e todas as questões estejam nítidos.</p>
                                                </>
                                            )}
                                        </div>

                                        {ocrResult && (
                                            <div className="mt-8 bg-green-600/10 border border-green-500/20 rounded-3xl p-8 animate-in zoom-in-95 relative z-10 shadow-2xl">
                                                <h4 className="text-xl font-black text-green-500 uppercase mb-6 flex items-center gap-3"><CheckCircle size={24}/> Resultado da Identificação</h4>
                                                <div className="flex justify-between items-center bg-black/40 p-6 rounded-2xl mb-6 border border-white/5 shadow-inner">
                                                    <div>
                                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">ID Aluno Identificado</p>
                                                        <p className="text-white text-2xl font-black uppercase tracking-tighter">{ocrResult.studentId || 'NÃO IDENTIFICADO'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Nota Preliminar</p>
                                                        <p className="text-brand-500 text-3xl font-black">---</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                                                    {Object.entries(ocrResult.answers).map(([q, ans]) => (
                                                        <div key={q} className="bg-black/60 p-3 rounded-xl text-center border border-white/5 group hover:border-brand-500 transition-all">
                                                            <p className="text-[10px] text-gray-500 font-black mb-1">Q{q}</p>
                                                            <p className="text-xl font-black text-white uppercase">{ans as string || '-'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-600/5 rounded-full blur-3xl pointer-events-none"></div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center bg-black/20 border-2 border-dashed border-white/10 rounded-3xl p-20 text-center opacity-40">
                                        <Layers size={100} className="text-gray-600 mb-8" />
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Aguardando Seleção de Gabarito</h3>
                                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Escolha o gabarito de referência na lista lateral para iniciar o processamento de correção por visão computacional.</p>
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
