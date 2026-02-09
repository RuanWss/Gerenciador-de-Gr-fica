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
    ArrowLeft, Eye, RefreshCw 
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

export const CorrectionDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'create' | 'print' | 'correct' | 'results'>('create');
    const [isLoading, setIsLoading] = useState(false);
    
    // --- CREATE TAB ---
    const [newExamTitle, setNewExamTitle] = useState('');
    const [newExamClass, setNewExamClass] = useState('');
    const [newExamSubject, setNewExamSubject] = useState('');
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
        if (!newExamTitle || !newExamClass || !newExamSubject) return alert("Preencha todos os campos.");
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
                subject: newExamSubject,
                teacherId: user?.id || 'admin',
                numQuestions,
                correctAnswers,
                createdAt: Date.now()
            });
            alert("Gabarito criado com sucesso!");
            setNewExamTitle('');
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
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
        
        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                await processImage(file);
            }
        }, 'image/jpeg');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await processImage(e.target.files[0]);
        }
    };

    const processImage = async (file: File) => {
        setIsLoading(true);
        setCorrectionLog(prev => ["Iniciando análise...", ...prev]);
        try {
            // Assume standard 10-20 questions for detection context or use max
            const result = await analyzeAnswerSheetWithQR(file, 20);
            
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
                            if (result.answers[i] === examKey.correctAnswers[i]) {
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

                        setCorrectionLog(prev => [`✅ SUCESSO: ${student.name} - Nota: ${finalScore.toFixed(1)}`, ...prev]);
                    } else {
                        setCorrectionLog(prev => ["❌ ERRO: Aluno não encontrado na base.", ...prev]);
                    }
                } else {
                    setCorrectionLog(prev => ["❌ ERRO: Gabarito da prova não encontrado.", ...prev]);
                }
            } else {
                setCorrectionLog(prev => ["⚠️ AVISO: QR Code não identificado. Tente melhorar o foco.", ...prev]);
            }
        } catch (error) {
            console.error(error);
            setCorrectionLog(prev => ["❌ ERRO CRÍTICO: Falha na análise de imagem.", ...prev]);
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplina</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500" value={newExamSubject} onChange={e => setNewExamSubject(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {[...EFAF_SUBJECTS, ...EM_SUBJECTS].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Qtd. Questões</label>
                                    <input type="number" min="5" max="50" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} />
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
                                            <p className="text-cyan-500 font-black text-[10px] uppercase tracking-widest mb-6">{key.className} • {key.subject}</p>
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
                            <div className="print:w-full print:h-full print:fixed print:top-0 print:left-0 print:bg-white print:z-50">
                                <div className="print:hidden mb-8 flex justify-between items-center bg-[#18181b] p-6 rounded-3xl border border-white/5">
                                    <button onClick={() => setSelectedKeyForPrint(null)} className="flex items-center gap-2 text-gray-400 hover:text-white font-black uppercase text-xs tracking-widest"><ArrowLeft size={16}/> Voltar</button>
                                    <h2 className="text-white font-black uppercase tracking-tight">{selectedKeyForPrint.title} - {selectedKeyForPrint.className}</h2>
                                    <Button onClick={handlePrint} className="bg-cyan-600"><Printer size={18} className="mr-2"/> Imprimir</Button>
                                </div>

                                {/* LAYOUT DE IMPRESSÃO */}
                                <div className="grid grid-cols-1 gap-8 print:block">
                                    {studentsForPrint.map((student, idx) => (
                                        <div key={student.id} className="bg-white text-black p-8 rounded-xl max-w-3xl mx-auto print:max-w-none print:break-after-page print:h-screen relative border-2 border-black print:border-0">
                                            {/* HEADER */}
                                            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 filter invert grayscale contrast-200" />
                                                    <div>
                                                        <h1 className="text-2xl font-black uppercase tracking-tight">Cartão Resposta</h1>
                                                        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Avaliação Institucional</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${JSON.stringify({e: selectedKeyForPrint.id, s: student.id})}`} 
                                                        className="w-24 h-24"
                                                        alt="QR Code"
                                                    />
                                                </div>
                                            </div>

                                            {/* STUDENT INFO */}
                                            <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-bold uppercase border-b-2 border-black pb-6">
                                                <div>
                                                    <span className="block text-[10px] text-gray-500 tracking-widest mb-1">Aluno</span>
                                                    <div className="text-lg leading-none">{student.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] text-gray-500 tracking-widest mb-1">Turma</span>
                                                    <div className="text-lg leading-none">{student.className}</div>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-gray-500 tracking-widest mb-1">Prova</span>
                                                    <div className="text-lg leading-none">{selectedKeyForPrint.title}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] text-gray-500 tracking-widest mb-1">Disciplina</span>
                                                    <div className="text-lg leading-none">{selectedKeyForPrint.subject}</div>
                                                </div>
                                            </div>

                                            {/* BUBBLE GRID */}
                                            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                                {Array.from({ length: selectedKeyForPrint.numQuestions }).map((_, i) => {
                                                    const qNum = i + 1;
                                                    return (
                                                        <div key={qNum} className="flex items-center justify-between border-b border-gray-200 py-2">
                                                            <span className="font-black text-lg w-8">{qNum < 10 ? `0${qNum}` : qNum}</span>
                                                            <div className="flex gap-4">
                                                                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                                    <div key={opt} className="flex flex-col items-center">
                                                                        <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs mb-1">
                                                                            {opt}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-12 text-center text-[10px] uppercase font-bold text-gray-400">
                                                Preencha completamente a bolha referente à resposta correta com caneta azul ou preta.
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
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
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