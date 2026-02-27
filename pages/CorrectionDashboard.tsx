import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    saveAnswerKey, 
    getAnswerKeys, 
    deleteAnswerKey,
    getStudents,
    saveCorrectionResult,
    getCorrectionResults
} from '../services/firebaseService';
import { analyzeAnswerSheetWithQR } from '../services/geminiService';
import { AnswerKey, Student, CorrectionResult } from '../types';
import { Button } from '../components/Button';
import { 
    CheckSquare, Printer, Camera, UploadCloud, Search, Trash2, 
    FileText, CheckCircle2, AlertTriangle, X, ScanLine, Save, 
    ArrowLeft, Eye, RefreshCw, Plus 
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

export const CorrectionDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'create' | 'print' | 'correct' | 'results'>('create');
    const [isLoading, setIsLoading] = useState(false);
    
    // --- CREATE TAB ---
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamClass, setNewExamClass] = useState('');
    const [newExamSubjects, setNewExamSubjects] = useState<{name: string, startQuestion: number, endQuestion: number}[]>([{name: '', startQuestion: 1, endQuestion: 10}]);
    const [numQuestions, setNumQuestions] = useState(10);
    const [correctAnswers, setCorrectAnswers] = useState<Record<string, string>>({});

    // --- PRINT TAB ---
    const [savedKeys, setSavedKeys] = useState<AnswerKey[]>([]);
    const [selectedKeyForPrint, setSelectedKeyForPrint] = useState<AnswerKey | null>(null);
    const [studentsForPrint, setStudentsForPrint] = useState<Student[]>([]);

    // --- CORRECT TAB ---
    const [cameraActive, setCameraActive] = useState(false);
    const [correctionLog, setCorrectionLog] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- RESULTS TAB ---
    const [results, setResults] = useState<CorrectionResult[]>([]);
    const [selectedResultKey, setSelectedResultKey] = useState<AnswerKey | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        const keys = await getAnswerKeys();
        setSavedKeys(keys.sort((a,b) => b.createdAt - a.createdAt));
    };

    const handleSaveKey = async () => {
        if (!newExamTitle || !newExamClass || newExamSubjects.length === 0) return alert("Preencha todos os campos.");
        // Validate if all questions have answers
        for (let i = 1; i <= numQuestions; i++) {
            if (!correctAnswers[i]) return alert(`Informe o gabarito da questão ${i}.`);
        }

        setIsLoading(true);
        try {
            await saveAnswerKey({
                id: '',
                title: newExamTitle.toUpperCase(),
                className: newExamClass,
                subjects: newExamSubjects.map(s => ({
                    name: s.name,
                    startQuestion: Number(s.startQuestion),
                    endQuestion: Number(s.endQuestion)
                })),
                teacherId: user?.id || 'admin',
                numQuestions,
                correctAnswers,
                createdAt: Date.now()
            });
            alert("Gabarito criado com sucesso!");
            setNewExamTitle('');
            setNewExamSubjects([{name: '', startQuestion: 1, endQuestion: 10}]);
            setCorrectAnswers({});
            loadKeys();
            setActiveTab('print');
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const preparePrint = async (key: AnswerKey) => {
        setIsLoading(true);
        setSelectedKeyForPrint(key);
        const allStudents = await getStudents();
        const classStudents = allStudents.filter(s => s.className === key.className).sort((a,b) => a.name.localeCompare(b.name));
        setStudentsForPrint(classStudents);
        setIsLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const startCamera = async () => {
        setCameraActive(true);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                alert("Erro ao acessar câmera. Verifique permissões.");
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
    };

    const captureAndAnalyze = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context?.drawImage(videoRef.current, 0, 0);
        
        // Compress to JPEG 0.8 quality to reduce payload size
        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                await processImage(file);
            }
        }, 'image/jpeg', 0.8);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf') {
                await processPdf(file);
            } else {
                await processImage(file);
            }
        }
    };

    const processPdf = async (file: File) => {
        setIsLoading(true);
        setCorrectionLog(prev => ["Processando PDF...", ...prev]);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;
            
            setCorrectionLog(prev => [`PDF carregado com ${numPages} páginas. Iniciando correção...`, ...prev]);
            
            for (let i = 1; i <= numPages; i++) {
                setCorrectionLog(prev => [`Extraindo página ${i} de ${numPages}...`, ...prev]);
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
                    
                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                    if (blob) {
                        const imageFile = new File([blob], `page_${i}.jpg`, { type: 'image/jpeg' });
                        await processImage(imageFile, `Página ${i}: `);
                    }
                }
            }
            setCorrectionLog(prev => ["✅ Processamento do PDF concluído.", ...prev]);
        } catch (error) {
            console.error("Error processing PDF:", error);
            setCorrectionLog(prev => ["❌ ERRO ao processar PDF.", ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    const processImage = async (file: File, prefix: string = '') => {
        setIsLoading(true);
        setCorrectionLog(prev => [`${prefix}Iniciando análise...`, ...prev]);
        try {
            // Assume max questions from the saved key if possible, but here we don't know the key yet.
            // Using 50 as a safe upper bound for detection.
            const result = await analyzeAnswerSheetWithQR(file, 50);
            
            if (result.qrData && result.qrData.e && result.qrData.s) {
                const examKey = savedKeys.find(k => k.id === result.qrData.e);
                
                if (examKey) {
                    const allStudents = await getStudents();
                    const student = allStudents.find(s => s.id === result.qrData.s);
                    
                    if (student) {
                        // Calculate Score
                        let score = 0;
                        const total = examKey.numQuestions;
                        
                        for (let i = 1; i <= total; i++) {
                            // Compare safely handling potential missing keys in result
                            const studentAns = result.answers[String(i)] || 'X';
                            const correctAns = examKey.correctAnswers[String(i)];
                            
                            if (studentAns === correctAns) {
                                score++;
                            }
                        }

                        const finalScore = (score / total) * 10; // Scale to 10

                        await saveCorrectionResult({
                            id: '',
                            examId: examKey.id,
                            studentId: student.id,
                            studentName: student.name,
                            className: examKey.className,
                            score: finalScore,
                            totalQuestions: total,
                            studentAnswers: result.answers,
                            scannedAt: Date.now()
                        });

                        setCorrectionLog(prev => [`${prefix}✅ SUCESSO: ${student.name} - Nota: ${finalScore.toFixed(1)} (${score}/${total})`, ...prev]);
                    } else {
                        setCorrectionLog(prev => [`${prefix}❌ ERRO: Aluno não encontrado na base de dados.`, ...prev]);
                    }
                } else {
                    setCorrectionLog(prev => [`${prefix}❌ ERRO: Gabarito da prova não encontrado no sistema.`, ...prev]);
                }
            } else {
                setCorrectionLog(prev => [`${prefix}⚠️ AVISO: QR Code não identificado. Melhore o foco ou iluminação.`, ...prev]);
            }
        } catch (error) {
            console.error(error);
            setCorrectionLog(prev => [`${prefix}❌ ERRO DE SISTEMA: Tente novamente.`, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    const viewResults = async (key: AnswerKey) => {
        setIsLoading(true);
        setSelectedResultKey(key);
        const res = await getCorrectionResults(key.id);
        setResults(res.sort((a,b) => b.score - a.score));
        setActiveTab('results');
        setIsLoading(false);
    };

    // Helper to split questions into columns
    const getQuestionColumns = (total: number) => {
        const cols = [];
        const perCol = Math.ceil(total / 4); // Max 4 columns
        for (let i = 0; i < total; i += perCol) {
            cols.push({ start: i + 1, end: Math.min(i + perCol, total) });
        }
        return cols;
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
            <div className="w-64 bg-[#121214] border-r border-white/5 p-6 flex flex-col h-full z-20 shadow-2xl print:hidden">
                <div className="mb-8 pl-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Área de Correção</p>
                </div>
                <nav className="flex-1 space-y-1">
                    <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><CheckSquare size={18}/> Novo Gabarito</button>
                    <button onClick={() => setActiveTab('print')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'print' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><Printer size={18}/> Gerar Cartões</button>
                    <button onClick={() => setActiveTab('correct')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'correct' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}><ScanLine size={18}/> Corrigir (OCR)</button>
                </nav>
            </div>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
                
                {/* CONFIGURAR GABARITO */}
                {activeTab === 'create' && (
                    <div className="animate-in fade-in max-w-4xl mx-auto">
                        <header className="mb-10">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Criar Gabarito</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Configure a prova matriz para correção automática</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título da Prova</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500" placeholder="EX: PROVA MENSAL 1" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value.toUpperCase())} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500" value={newExamClass} onChange={e => setNewExamClass(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplinas e Intervalo de Questões</label>
                                        <button 
                                            onClick={() => setNewExamSubjects([...newExamSubjects, {name: '', startQuestion: 1, endQuestion: numQuestions}])}
                                            className="text-xs font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Adicionar Disciplina
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {newExamSubjects.map((subj, idx) => (
                                            <div key={idx} className="flex gap-3 items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                                                <select 
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-cyan-500 text-sm" 
                                                    value={subj.name} 
                                                    onChange={e => {
                                                        const newSubjs = [...newExamSubjects];
                                                        newSubjs[idx].name = e.target.value;
                                                        setNewExamSubjects(newSubjs);
                                                    }}
                                                >
                                                    <option value="">Selecione a disciplina...</option>
                                                    {Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS])).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 font-bold">De</span>
                                                    <input 
                                                        type="number" min="1" max={numQuestions}
                                                        className="w-16 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-cyan-500 text-center text-sm"
                                                        value={subj.startQuestion}
                                                        onChange={e => {
                                                            const newSubjs = [...newExamSubjects];
                                                            newSubjs[idx].startQuestion = Number(e.target.value);
                                                            setNewExamSubjects(newSubjs);
                                                        }}
                                                    />
                                                    <span className="text-xs text-gray-500 font-bold">Até</span>
                                                    <input 
                                                        type="number" min="1" max={numQuestions}
                                                        className="w-16 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-cyan-500 text-center text-sm"
                                                        value={subj.endQuestion}
                                                        onChange={e => {
                                                            const newSubjs = [...newExamSubjects];
                                                            newSubjs[idx].endQuestion = Number(e.target.value);
                                                            setNewExamSubjects(newSubjs);
                                                        }}
                                                    />
                                                </div>
                                                {newExamSubjects.length > 1 && (
                                                    <button 
                                                        onClick={() => {
                                                            const newSubjs = [...newExamSubjects];
                                                            newSubjs.splice(idx, 1);
                                                            setNewExamSubjects(newSubjs);
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Qtd. Total de Questões</label>
                                    <input type="number" min="5" max="100" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500" value={numQuestions} onChange={e => {
                                        const newNum = Number(e.target.value);
                                        setNumQuestions(newNum);
                                        // Update the last subject's endQuestion if it was the old max
                                        if (newExamSubjects.length > 0) {
                                            const lastSubj = newExamSubjects[newExamSubjects.length - 1];
                                            if (lastSubj.endQuestion > newNum) {
                                                const newSubjs = [...newExamSubjects];
                                                newSubjs[newSubjs.length - 1].endQuestion = newNum;
                                                setNewExamSubjects(newSubjs);
                                            }
                                        }
                                    }} />
                                </div>
                            </div>

                            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 mb-8">
                                <h3 className="text-sm font-black text-cyan-500 uppercase tracking-widest mb-6">Definir Respostas Corretas</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {Array.from({ length: numQuestions }).map((_, i) => {
                                        const qNum = i + 1;
                                        return (
                                            <div key={qNum} className="flex flex-col items-center gap-2 bg-white/5 p-3 rounded-xl">
                                                <span className="text-[10px] font-black text-gray-500">QUESTÃO {qNum}</span>
                                                <div className="flex gap-1">
                                                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                        <button 
                                                            key={opt}
                                                            onClick={() => setCorrectAnswers({...correctAnswers, [qNum]: opt})}
                                                            className={`w-6 h-6 rounded-full text-[10px] font-black transition-all ${correctAnswers[qNum] === opt ? 'bg-cyan-600 text-white' : 'bg-black/40 text-gray-600 hover:bg-white/10'}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button onClick={handleSaveKey} isLoading={isLoading} className="w-full h-16 bg-cyan-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-cyan-900/40">Salvar Gabarito</Button>
                        </div>
                    </div>
                )}

                {/* IMPRIMIR CARTÕES */}
                {activeTab === 'print' && (
                    <div className="animate-in fade-in">
                        {!selectedKeyForPrint ? (
                            <div className="max-w-5xl mx-auto">
                                <header className="mb-10">
                                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gerar Cartões Resposta</h1>
                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Selecione uma prova para gerar os cartões da turma</p>
                                </header>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {savedKeys.map(key => (
                                        <div key={key.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-cyan-500/30 transition-all">
                                            <h3 className="text-xl font-black text-white mb-2">{key.title}</h3>
                                            <p className="text-cyan-500 font-black text-[10px] uppercase tracking-widest mb-6">
                                                {key.className} • {key.subjects ? key.subjects.map(s => s.name).join(', ') : key.subject}
                                            </p>
                                            <div className="flex gap-2">
                                                <button onClick={() => preparePrint(key)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black text-[10px] uppercase tracking-widest">Imprimir</button>
                                                <button onClick={() => viewResults(key)} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg">Resultados</button>
                                                <button onClick={async () => { if(confirm("Excluir?")) { await deleteAnswerKey(key.id); loadKeys(); }}} className="p-3 text-gray-600 hover:text-red-500"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="print:w-full print:h-full print:fixed print:top-0 print:left-0 print:bg-white print:z-50 print:overflow-visible">
                                <div className="print:hidden mb-8 flex justify-between items-center bg-[#18181b] p-6 rounded-3xl border border-white/5">
                                    <button onClick={() => setSelectedKeyForPrint(null)} className="flex items-center gap-2 text-gray-400 hover:text-white font-black uppercase text-xs tracking-widest"><ArrowLeft size={16}/> Voltar</button>
                                    <div>
                                        <h2 className="text-white font-black uppercase tracking-tight text-center">{selectedKeyForPrint.title} - {selectedKeyForPrint.className}</h2>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">Modelo de Impressão (A4)</p>
                                    </div>
                                    <Button onClick={handlePrint} className="bg-cyan-600"><Printer size={18} className="mr-2"/> Gerar Arquivo de Impressão (PDF)</Button>
                                </div>

                                {/* LAYOUT DE IMPRESSÃO ESTILO ENEM */}
                                <div className="flex flex-col gap-8 print:block print:gap-0">
                                    {studentsForPrint.map((student, idx) => (
                                        <div key={student.id} className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-12 relative box-border border border-gray-200 print:border-0 shadow-xl print:shadow-none mb-8 print:mb-0 font-sans" style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
                                            
                                            {/* Header Principal */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-10 filter invert grayscale contrast-200" alt="Logo" />
                                                    </div>
                                                    <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-1 border-b-4 border-black inline-block pb-1">CARTÃO-RESPOSTA</h1>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mt-1">SIMULADO / AVALIAÇÃO INSTITUCIONAL - CEMAL</p>
                                                </div>
                                                <div className="flex flex-col items-end justify-center shrink-0">
                                                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest mb-1">TURMA</span>
                                                    <span className="text-2xl font-black uppercase text-right leading-none">{selectedKeyForPrint.className}</span>
                                                </div>
                                            </div>

                                            {/* Dados do Aluno e QR Code */}
                                            <div className="border-4 border-black mb-3 flex h-32">
                                                <div className="flex-1 p-4 border-r-4 border-black flex flex-col justify-center">
                                                    <span className="block text-[10px] font-black uppercase mb-1 tracking-widest">NOME COMPLETO DO PARTICIPANTE:</span>
                                                    <div className="text-2xl font-black uppercase truncate leading-tight">{student.name}</div>
                                                </div>
                                                <div className="w-56 relative bg-gray-50 flex items-center justify-center overflow-hidden">
                                                    <div className="absolute top-1 left-2 text-[8px] font-black uppercase z-10 text-gray-500">USO EXCLUSIVO SISTEMA</div>
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${JSON.stringify({e: selectedKeyForPrint.id, s: student.id})}`} 
                                                        className="h-24 w-24 object-contain mix-blend-multiply"
                                                        alt="QR"
                                                    />
                                                    <div className="absolute bottom-1 right-2 text-[8px] font-mono text-gray-400">{student.id.substring(0,6)}</div>
                                                </div>
                                            </div>

                                            {/* Assinatura e Info da Prova */}
                                            <div className="mb-8 flex justify-between items-end">
                                                <div className="flex-1 mr-8">
                                                    <div className="border-b-2 border-black h-8 w-full"></div>
                                                    <span className="text-[10px] font-bold uppercase mt-1 block">ASSINATURA DO PARTICIPANTE:</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black uppercase">{selectedKeyForPrint.subjects ? selectedKeyForPrint.subjects.map(s => s.name).join(' / ') : selectedKeyForPrint.subject}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedKeyForPrint.title}</p>
                                                </div>
                                            </div>

                                            {/* Instruções e Exemplo */}
                                            <div className="flex gap-8 mb-8">
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-black uppercase text-blue-800 mb-2">INSTRUÇÕES</h3>
                                                    <ol className="text-[10px] font-bold space-y-1 list-decimal list-inside text-gray-800">
                                                        <li>Verifique se seu nome e turma estão corretos no cabeçalho.</li>
                                                        <li>Utilize <strong>caneta esferográfica de tinta preta ou azul</strong>.</li>
                                                        <li>Preencha completamente a bolha correspondente à sua resposta.</li>
                                                        <li>Não rasure, não amasse e não dobre este cartão-resposta.</li>
                                                        <li>Apenas uma resposta por questão é válida.</li>
                                                    </ol>
                                                </div>
                                                <div className="w-64 bg-gray-100 border border-gray-300 p-4 rounded-xl shrink-0">
                                                    <p className="text-[9px] font-black text-center mb-3 uppercase">EXEMPLO DE PREENCHIMENTO</p>
                                                    <div className="flex justify-center gap-3 mb-2">
                                                        <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-xs font-bold bg-white">A</div>
                                                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">B</div>
                                                        <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-xs font-bold bg-white">C</div>
                                                    </div>
                                                    <p className="text-[8px] text-center mt-2 font-medium uppercase">Correto</p>
                                                </div>
                                            </div>

                                            {/* Grade de Respostas */}
                                            <div className="border-t-4 border-black pt-6 flex-1">
                                                <div className="grid grid-cols-4 gap-6">
                                                    {getQuestionColumns(selectedKeyForPrint.numQuestions).map((col, colIdx) => (
                                                        <div key={colIdx} className="flex flex-col">
                                                            <div className="bg-blue-800 text-white text-[10px] font-black uppercase text-center py-1.5 mb-1">
                                                                QUESTÃO / RESPOSTA
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                {Array.from({ length: col.end - col.start + 1 }).map((_, i) => {
                                                                    const qNum = col.start + i;
                                                                    return (
                                                                        <div key={qNum} className={`flex items-center justify-between px-2 py-1 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}>
                                                                            <span className="font-black text-sm w-6 text-center">{qNum < 10 ? `0${qNum}` : qNum}</span>
                                                                            <div className="flex gap-1.5">
                                                                                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                                    <div key={opt} className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold bg-white">
                                                                                        {opt}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="absolute bottom-4 left-0 w-full text-center">
                                                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Modelo baseado no CARTÃO-RESPOSTA do Enem • Sistema CEMAL</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CORREÇÃO */}
                {activeTab === 'correct' && (
                    <div className="animate-in fade-in max-w-6xl mx-auto h-full flex flex-col">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Correção Automática</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Leitor OCR via Câmera ou Upload</p>
                            </div>
                            {cameraActive ? (
                                <Button onClick={stopCamera} className="bg-red-600 h-12 rounded-xl text-xs font-black uppercase">Parar Câmera</Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button onClick={startCamera} className="bg-cyan-600 h-12 rounded-xl text-xs font-black uppercase"><Camera size={18} className="mr-2"/> Ativar Webcam</Button>
                                    <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white h-12 px-6 rounded-xl flex items-center justify-center font-black uppercase text-xs transition-all border border-white/10">
                                        <UploadCloud size={18} className="mr-2"/> Upload
                                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            )}
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                            {/* CAMERA / PREVIEW AREA */}
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex items-center justify-center bg-black">
                                {cameraActive ? (
                                    <>
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                        <canvas ref={canvasRef} className="hidden" />
                                        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                            <button onClick={captureAndAnalyze} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-2xl hover:scale-105 transition-transform flex items-center justify-center">
                                                <div className="w-16 h-16 bg-white rounded-full border-2 border-black"></div>
                                            </button>
                                        </div>
                                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-[20px] border-black/50">
                                            <div className="w-full h-full border-2 border-cyan-500/50 relative">
                                                <div className="absolute top-4 right-4 text-cyan-500 text-xs font-black bg-black/50 px-2 py-1 rounded">QR CODE</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center opacity-30">
                                        <ScanLine size={80} className="mx-auto mb-4"/>
                                        <p className="font-black uppercase tracking-widest">Aguardando Imagem</p>
                                    </div>
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                                        <RefreshCw size={48} className="text-cyan-500 animate-spin mb-4"/>
                                        <p className="text-white font-black uppercase tracking-widest animate-pulse">Processando IA...</p>
                                    </div>
                                )}
                            </div>

                            {/* LOGS */}
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-[600px]">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3"><FileText size={20}/> Log de Correção</h3>
                                <div className="flex-1 overflow-y-auto bg-black/40 rounded-2xl p-4 space-y-2 custom-scrollbar font-mono text-xs">
                                    {correctionLog.map((log, i) => (
                                        <div key={i} className={`p-3 rounded-lg border border-white/5 ${log.includes('SUCESSO') ? 'bg-green-900/20 text-green-400' : log.includes('ERRO') ? 'bg-red-900/20 text-red-400' : 'text-gray-400'}`}>
                                            {log}
                                        </div>
                                    ))}
                                    {correctionLog.length === 0 && <p className="text-gray-600 text-center mt-10">Nenhuma atividade recente.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESULTADOS TAB */}
                {activeTab === 'results' && (
                    <div className="animate-in fade-in">
                        <header className="mb-10 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Resultados</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{selectedResultKey?.title} - {selectedResultKey?.className}</p>
                            </div>
                            <Button onClick={() => setActiveTab('print')} className="bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs"><ArrowLeft size={16} className="mr-2"/> Voltar</Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-500 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr>
                                        <th className="p-8">Aluno</th>
                                        <th className="p-8 text-center">Acertos</th>
                                        <th className="p-8 text-center">Nota (0-10)</th>
                                        <th className="p-8 text-right">Data Correção</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.map(res => (
                                        <tr key={res.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 font-black text-white">{res.studentName}</td>
                                            <td className="p-8 text-center text-gray-400 font-bold">{Math.round((res.score / 10) * res.totalQuestions)} / {res.totalQuestions}</td>
                                            <td className="p-8 text-center">
                                                <span className={`text-xl font-black ${res.score >= 6 ? 'text-green-500' : 'text-red-500'}`}>{res.score.toFixed(1)}</span>
                                            </td>
                                            <td className="p-8 text-right text-gray-500 text-xs font-mono">{new Date(res.scannedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {results.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-gray-600 font-black uppercase tracking-widest">Sem resultados ainda</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};