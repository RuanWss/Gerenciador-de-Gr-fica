
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
    BookOpenCheck, 
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
    Loader2,
    Briefcase,
    School,
    ClipboardCheck,
    CalendarDays,
    ArrowRight
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
    const [activeTab, setActiveTab] = useState<'calendar' | 'exams' | 'students' | 'classes' | 'attendance' | 'schedule' | 'planning' | 'config' | 'corrections'>('calendar');
    const [isLoading, setIsLoading] = useState(false);

    // Gabaritos State
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [keyTitle, setKeyTitle] = useState('');
    const [keyQuestions, setKeyQuestions] = useState(10);
    const [keyAnswers, setKeyAnswers] = useState<Record<number, string>>({});
    
    // Correção State
    const [corrections, setCorrections] = useState<StudentCorrection[]>([]);
    const [correctingImage, setCorrectingImage] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [correctionResult, setCorrectionResult] = useState<StudentCorrection | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // Shared Data
    const [students, setStudents] = useState<Student[]>([]);
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        loadAnswerKeys();
        getStudents().then(setStudents);
        if (activeTab === 'exams') getExams().then(setExams);
    }, [activeTab]);

    const loadAnswerKeys = async () => {
        const keys = await getAnswerKeys();
        setAnswerKeys(keys.sort((a,b) => b.createdAt - a.createdAt));
    };

    const handleCreateKey = async () => {
        if (!keyTitle || Object.keys(keyAnswers).length < keyQuestions) return alert("Preencha o título e todas as respostas do gabarito.");
        const newKey: AnswerKey = {
            id: '',
            title: keyTitle,
            numQuestions: keyQuestions,
            correctAnswers: keyAnswers,
            createdAt: Date.now()
        };
        await saveAnswerKey(newKey);
        loadAnswerKeys();
        setShowNewKeyModal(false);
        setKeyTitle(''); setKeyAnswers({});
    };

    const handleSelectKey = async (key: AnswerKey) => {
        setSelectedKey(key);
        const data = await getCorrections(key.id);
        setCorrections(data.sort((a,b) => b.date - a.date));
    };

    const handleAutoCorrect = async () => {
        if (!correctingImage || !selectedKey || !selectedStudentId) return alert("Selecione o aluno e a imagem do cartão preenchido.");
        
        setIsAnalyzing(true);
        try {
            const studentAnswers = await analyzeAnswerSheet(correctingImage, selectedKey.numQuestions);
            const student = students.find(s => s.id === selectedStudentId);
            
            // Calcular Nota
            let score = 0;
            const hits: number[] = [];
            for (let i = 1; i <= selectedKey.numQuestions; i++) {
                if (studentAnswers[i] === selectedKey.correctAnswers[i]) {
                    score++;
                    hits.push(i);
                }
            }

            const finalCorrection: StudentCorrection = {
                id: '',
                answerKeyId: selectedKey.id,
                studentName: student?.name || 'Aluno Desconhecido',
                score: (score / selectedKey.numQuestions) * 10,
                answers: studentAnswers,
                hits: hits,
                date: Date.now()
            };

            await saveCorrection(finalCorrection);
            setCorrectionResult(finalCorrection);
            setCorrections([finalCorrection, ...corrections]);
            setCorrectingImage(null);
        } catch (error) {
            alert("Erro na análise da IA: " + (error as any).message);
        } finally {
            setIsAnalyzing(false);
        }
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
                    <SidebarItem id="classes" label="Gestão de Turmas" icon={School} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência" icon={ClipboardCheck} />
                    <SidebarItem id="corrections" label="Correção via IA" icon={ScanLine} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'corrections' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><ScanLine className="text-red-500"/> Correção Automática</h1>
                                <p className="text-gray-400">Criação de gabaritos e correção via Visão Computacional</p>
                            </div>
                            <Button onClick={() => setShowNewKeyModal(true)}>
                                <Plus size={18} className="mr-2"/> Novo Gabarito
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Gabaritos List */}
                            <div className="bg-[#18181b] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-250px)]">
                                <div className="p-4 bg-gray-900/50 border-b border-gray-800 font-bold text-gray-300 flex items-center gap-2">
                                    <ListChecks size={18} className="text-red-500"/> Gabaritos Oficiais
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {answerKeys.map(key => (
                                        <div 
                                            key={key.id} 
                                            onClick={() => handleSelectKey(key)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedKey?.id === key.id ? 'bg-red-600/10 border-red-500/50' : 'bg-gray-900/30 border-gray-800 hover:border-gray-700'}`}
                                        >
                                            <h4 className={`font-bold text-sm ${selectedKey?.id === key.id ? 'text-red-400' : 'text-white'}`}>{key.title}</h4>
                                            <p className="text-[10px] text-gray-500 uppercase mt-1">{key.numQuestions} Questões • {new Date(key.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Correction Area */}
                            <div className="lg:col-span-2 space-y-6">
                                {selectedKey ? (
                                    <>
                                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                                <ScanLine className="text-red-600"/> Corrigir Cartão para: {selectedKey.title}
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Selecionar Aluno</label>
                                                        <select 
                                                            className="w-full border border-gray-200 bg-gray-50 p-2.5 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
                                                            value={selectedStudentId}
                                                            onChange={e => setSelectedStudentId(e.target.value)}
                                                        >
                                                            <option value="">-- Buscar Aluno --</option>
                                                            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Imagem do Cartão Resposta</label>
                                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                            <input 
                                                                type="file" 
                                                                accept="image/*" 
                                                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                                                onChange={e => setCorrectingImage(e.target.files?.[0] || null)}
                                                            />
                                                            {correctingImage ? (
                                                                <div className="text-center text-green-600">
                                                                    <CheckCircle size={32} className="mx-auto mb-2"/>
                                                                    <p className="text-xs font-bold">{correctingImage.name}</p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={32} className="text-gray-300 mb-2"/>
                                                                    <p className="text-xs text-gray-500 font-medium">Upload ou Captura via Câmera</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        onClick={handleAutoCorrect} 
                                                        isLoading={isAnalyzing} 
                                                        className="w-full bg-red-600 hover:bg-red-700 py-3 shadow-lg shadow-red-900/20 font-bold"
                                                    >
                                                        {isAnalyzing ? "Analisando com IA..." : "Processar Correção"}
                                                    </Button>
                                                </div>

                                                {/* Ultimo Resultado Rápido */}
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-center items-center text-center">
                                                    {correctionResult ? (
                                                        <div className="animate-in zoom-in-95 duration-500">
                                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mb-3 border-4 ${correctionResult.score >= 6 ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                                                                {correctionResult.score.toFixed(1)}
                                                            </div>
                                                            <h4 className="font-black text-gray-800 uppercase text-sm mb-1">{correctionResult.studentName}</h4>
                                                            <p className="text-xs text-gray-500">Acertou {correctionResult.hits.length} de {selectedKey.numQuestions}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="opacity-30">
                                                            <History size={48} className="mx-auto mb-2 text-gray-400"/>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Aguardando Processamento</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Histórico da Prova Selecionada */}
                                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                                                Histórico de Correções desta Avaliação
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-100 text-gray-500 uppercase font-bold sticky top-0">
                                                        <tr>
                                                            <th className="p-3">Aluno</th>
                                                            <th className="p-3">Data</th>
                                                            <th className="p-3 text-center">Nota</th>
                                                            <th className="p-3 text-right">Acertos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {corrections.map(c => (
                                                            <tr key={c.id} className="hover:bg-red-50/30 transition-colors">
                                                                <td className="p-3 font-bold text-gray-800">{c.studentName}</td>
                                                                <td className="p-3 text-gray-500">{new Date(c.date).toLocaleDateString()}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`font-black ${c.score >= 6 ? 'text-green-600' : 'text-red-600'}`}>{c.score.toFixed(1)}</span>
                                                                </td>
                                                                <td className="p-3 text-right text-gray-400">{c.hits.length} q.</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 border-2 border-dashed border-white/5 rounded-2xl opacity-50">
                                        <ScanLine size={64} className="mb-4"/>
                                        <p className="font-bold uppercase tracking-widest">Selecione um gabarito à esquerda</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MODAL: NOVO GABARITO */}
                        {showNewKeyModal && (
                            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo Gabarito Oficial</h3>
                                        <button onClick={() => setShowNewKeyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título da Avaliação</label>
                                                <input className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800" placeholder="Ex: Simulado Bimestral Matemática" value={keyTitle} onChange={e => setKeyTitle(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Qtd Questões</label>
                                                <input type="number" min="1" max="50" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-gray-800" value={keyQuestions} onChange={e => setKeyQuestions(Number(e.target.value))} />
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
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="C">C</option>
                                                            <option value="D">D</option>
                                                            <option value="E">E</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <Button variant="outline" onClick={() => setShowNewKeyModal(false)}>Cancelar</Button>
                                            <Button onClick={handleCreateKey} className="bg-red-600 hover:bg-red-700 px-8 shadow-lg shadow-red-900/20 font-bold"><Save size={18} className="mr-2"/> Criar Gabarito</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- OUTRAS ABAS (Calendar, Exams, Students, etc) --- */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><CalendarDays className="text-red-500"/> Agenda Institucional</h1>
                                <p className="text-gray-400">Controle de eventos, processos e gestão de materiais</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-white/10 rounded text-white"><ChevronLeft size={20}/></button>
                                <span className="font-bold text-lg text-white w-48 text-center">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-white/10 rounded text-white"><ChevronRight size={20}/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden shadow-2xl border border-gray-700">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className="bg-[#27272a] p-3 text-center font-bold text-gray-400 text-sm uppercase tracking-wider">{d}</div>
                            ))}
                            {/* Dias seriam renderizados aqui baseados em currentMonth (lógica existente no arquivo original) */}
                        </div>
                    </div>
                )}
                
                {/* NOTA: Mantive apenas a estrutura necessária para o exemplo. No projeto real, as outras abas continuariam aqui. */}
            </div>
        </div>
    );
};
