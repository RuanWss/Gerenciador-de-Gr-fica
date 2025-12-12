
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, Scan, Wifi, Zap, User, Ban, ShieldAlert, Database, RefreshCw } from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

// Definição das turmas e seus turnos para validação
const CLASSES_CONFIG = [
    { id: '6efaf', name: '6º ANO EFAF', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', shift: 'morning' },
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon' },
];

export const AttendanceTerminal: React.FC = () => {
    const { logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [students, setStudents] = useState<Student[]>([]);
    const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusSubMessage, setStatusSubMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    
    // AI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando Sistema...');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Load AI Models (Apenas uma vez)
    useEffect(() => {
        const loadModels = async () => {
            const faceApi = (faceapi as any).default || faceapi;

            if (!faceApi || !faceApi.nets) {
                console.error("Biblioteca FaceAPI não inicializada corretamente.");
                setLoadingMessage("Erro Fatal: FaceAPI não carregada");
                return;
            }

            if (
                faceApi.nets.ssdMobilenetv1.isLoaded && 
                faceApi.nets.faceLandmark68Net.isLoaded && 
                faceApi.nets.faceRecognitionNet.isLoaded
            ) {
                setModelsLoaded(true);
                return;
            }

            setLoadingMessage('Carregando Modelos de IA...');
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceApi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
                setLoadingMessage('Erro de Conexão com IA');
            }
        };
        loadModels();
    }, []);

    // 3. Listen to Students Data (Tempo Real)
    useEffect(() => {
        // Inscreve no listener do Firestore
        const unsubscribe = listenToStudents((newStudents) => {
            console.log("Lista de alunos atualizada:", newStudents.length);
            setStudents(newStudents);
        });

        return () => unsubscribe();
    }, []);

    // 4. Process Faces (Reage a mudanças na lista ou nos modelos)
    useEffect(() => {
        if (modelsLoaded && students.length > 0) {
            processStudentFaces(students);
        } else if (modelsLoaded && students.length === 0) {
             setLoadingMessage('Nenhum aluno encontrado');
             setLabeledDescriptors([]);
        }
    }, [modelsLoaded, students]);

     // Função auxiliar para carregar imagem com CORS anônimo
     const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Permite que a IA leia os pixels
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    };

    // Helper: Process Student Photos
    const processStudentFaces = async (studentList: Student[]) => {
        setLoadingMessage('Indexando Biometria...');
        
        const faceApi = (faceapi as any).default || faceapi;
        const labeledDescriptorsTemp: any[] = [];
        
        const studentsWithPhoto = studentList.filter(s => s.photoUrl);
        let processedCount = 0;
        let errorCount = 0;

        for (const student of studentsWithPhoto) {
            if (!student.photoUrl) continue;
            try {
                // Usa carregador seguro
                const img = await loadImage(student.photoUrl);
                const detection = await faceApi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                
                if (detection) {
                    labeledDescriptorsTemp.push(new faceApi.LabeledFaceDescriptors(student.id, [detection.descriptor]));
                }
                processedCount++;
                if (studentsWithPhoto.length > 10) {
                     setLoadingMessage(`Indexando: ${Math.round((processedCount / studentsWithPhoto.length) * 100)}%`);
                }
            } catch (err) {
                console.warn(`Erro ao processar foto de ${student.name}`, err);
                errorCount++;
            }
        }
        
        setLabeledDescriptors(labeledDescriptorsTemp);
        setLoadingMessage('');
        
        if (errorCount > 0) {
            console.log(`Finalizado com ${errorCount} erros de imagem.`);
        }
    };

    // 5. Start Camera
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: "user"
                        } 
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Erro ao acessar câmera:", err);
                    setLoadingMessage('Câmera não detectada');
                }
            }
        };
        if (modelsLoaded) {
            startCamera();
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [modelsLoaded]);

    // 6. Detection Loop
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const faceApi = (faceapi as any).default || faceapi;

        // Só inicia se tudo estiver pronto
        if (!video || !canvas || !modelsLoaded || !isVideoReady || labeledDescriptors.length === 0 || !faceApi) return;

        const faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.55);
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        
        // Garante que o canvas tem o tamanho do vídeo
        faceApi.matchDimensions(canvas, displaySize);

        const detect = async () => {
            if (processingRef.current) return; 
            if (lastLog) return; 

            try {
                const detections = await faceApi.detectAllFaces(video, new faceApi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                const resizedDetections = faceApi.resizeResults(detections, displaySize);
                
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (resizedDetections.length > 0) {
                    const box = resizedDetections[0].detection.box;
                    const drawBox = new faceApi.draw.DrawBox(box, { 
                        label: 'Identificando...', 
                        boxColor: '#3b82f6',
                        lineWidth: 2
                    });
                    drawBox.draw(canvas);

                    const bestMatch = faceMatcher.findBestMatch(resizedDetections[0].descriptor);
                    
                    if (bestMatch.label !== 'unknown') {
                        processingRef.current = true;
                        setIsProcessing(true);
                        await processAttendance(bestMatch.label);
                        setTimeout(() => { 
                            processingRef.current = false; 
                            setIsProcessing(false);
                        }, 5000); 
                    }
                }
            } catch (err) {
                // Silently handle
            }
        };

        const intervalId = setInterval(detect, 500);

        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]); // Recria o intervalo quando as dependências mudam

    const processAttendance = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);

        if (student) {
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            // --- VALIDAÇÃO DE TURNO ---
            const classConfig = CLASSES_CONFIG.find(c => c.id === student.classId);
            
            const MORNING_START = 6 * 60;
            const MORNING_END = 12 * 60 + 20;
            const AFTERNOON_START = 12 * 60 + 30;
            const AFTERNOON_END = 19 * 60;

            const MORNING_LATE_LIMIT = 7 * 60 + 20;
            const AFTERNOON_LATE_LIMIT = 13 * 60 + 15;

            let isShiftValid = false;
            let isLate = false;

            if (classConfig) {
                if (classConfig.shift === 'morning') {
                    if (currentMinutes >= MORNING_START && currentMinutes <= MORNING_END) {
                        isShiftValid = true;
                        if (currentMinutes > MORNING_LATE_LIMIT) isLate = true;
                    }
                } else if (classConfig.shift === 'afternoon') {
                    if (currentMinutes >= AFTERNOON_START && currentMinutes <= AFTERNOON_END) {
                        isShiftValid = true;
                        if (currentMinutes > AFTERNOON_LATE_LIMIT) isLate = true;
                    }
                }
            } else {
                isShiftValid = true; 
            }

            if (!isShiftValid) {
                setLastLog({
                    id: '',
                    studentId: student.id,
                    studentName: student.name,
                    className: student.className,
                    studentPhotoUrl: student.photoUrl,
                    timestamp: now.getTime(),
                    type: 'entry',
                    dateString
                });
                setStatusType('error');
                setStatusMessage('FORA DO TURNO');
                setStatusSubMessage('');
                playSound('error');
                setTimeout(() => resetState(), 4000);
                return;
            }

            const log: AttendanceLog = {
                id: '',
                studentId: student.id,
                studentName: student.name,
                className: student.className,
                studentPhotoUrl: student.photoUrl,
                timestamp: now.getTime(),
                type: 'entry',
                dateString: dateString
            };

            const success = await logAttendance(log);

            setLastLog(log);

            if (success) {
                if (isLate) {
                    setStatusType('error');
                    setStatusMessage('IR À COORDENAÇÃO');
                    setStatusSubMessage('Realizar justificativa de atraso');
                    playSound('error');
                    setTimeout(() => resetState(), 8000);
                } else {
                    setStatusType('success');
                    setStatusMessage('PRESENÇA CONFIRMADA');
                    setStatusSubMessage('');
                    playSound('success');
                    setTimeout(() => resetState(), 3000);
                }
            } else {
                setStatusType('warning');
                setStatusMessage('ACESSO JÁ REGISTRADO');
                setStatusSubMessage('');
                playSound('error');
                setTimeout(() => resetState(), 3000);
            }
        }
    };

    const resetState = () => {
        setLastLog(null);
        setStatusType('waiting');
        setStatusMessage('');
        setStatusSubMessage('');
        setIsProcessing(false);
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success' 
            ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3"
        );
        audio.play().catch(e => console.log(e));
    };

    const getStatusColor = () => {
        switch (statusType) {
            case 'success': return 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]';
            case 'warning': return 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]';
            case 'error': return 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]';
            default: return 'border-white/10';
        }
    };

    return (
        <div className="h-screen w-screen bg-[#09090b] text-white overflow-hidden flex flex-col font-sans selection:bg-brand-500/30">
            
            {/* --- HEADER --- */}
            <div className="h-[15vh] bg-[#121214] border-b border-white/5 flex items-center justify-between px-8 z-20 shadow-lg relative">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto drop-shadow-md" alt="Logo" />
                    <div className="h-10 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Terminal de Frequência</h1>
                        <p className="text-xs font-medium text-gray-500 tracking-[0.2em] uppercase">Reconhecimento Facial Ativo</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="text-4xl font-black font-mono leading-none tracking-tight">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${labeledDescriptors.length > 0 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            <Database size={14} />
                            {labeledDescriptors.length > 0 ? `${labeledDescriptors.length} Faces` : 'Sem Dados'}
                        </div>
                         <button onClick={logout} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Sair do Terminal">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#09090b] to-[#09090b]">
                
                {/* CAMERA CONTAINER */}
                <div className={`relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-500 ${getStatusColor()} ${isProcessing ? 'scale-[0.98] opacity-80' : 'scale-100'}`}>
                    
                    {/* VIDEO FEED */}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        onPlay={() => setIsVideoReady(true)}
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]" />

                    {/* OVERLAYS */}
                    <div className="absolute inset-0 pointer-events-none">
                        
                        {/* LOADING OVERLAY */}
                        {loadingMessage && !lastLog && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <Loader2 size={64} className="text-brand-500 animate-spin mb-6" />
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase animate-pulse">{loadingMessage}</h2>
                                <p className="text-gray-500 text-sm mt-2">Por favor, aguarde a calibração da IA</p>
                            </div>
                        )}

                        {/* AVISO DE BANCO VAZIO */}
                        {!loadingMessage && modelsLoaded && students.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <AlertTriangle size={64} className="text-yellow-500 mb-6 animate-bounce" />
                                <h2 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase mb-2">Banco de Faces Vazio</h2>
                                <p className="text-gray-400 max-w-md text-center">Nenhum aluno com foto foi encontrado no sistema. Cadastre as fotos no Painel Escolar para ativar o reconhecimento.</p>
                            </div>
                        )}

                         {/* AVISO DE ERRO NAS FOTOS */}
                         {!loadingMessage && modelsLoaded && students.length > 0 && labeledDescriptors.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <AlertTriangle size={64} className="text-red-500 mb-6 animate-pulse" />
                                <h2 className="text-2xl font-bold text-red-500 tracking-widest uppercase mb-2">Erro de Biometria</h2>
                                <p className="text-gray-400 max-w-md text-center mb-4">
                                    {students.length} alunos encontrados, mas as fotos falharam ao carregar.
                                    Verifique a conexão ou as permissões de acesso.
                                </p>
                                <button 
                                    onClick={() => processStudentFaces(students)}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider flex items-center gap-2 pointer-events-auto"
                                >
                                    <RefreshCw size={18} /> Tentar Novamente
                                </button>
                            </div>
                        )}

                        {/* SCANNING LINE (IDLE) */}
                        {!loadingMessage && !lastLog && !isProcessing && labeledDescriptors.length > 0 && (
                            <div className="absolute inset-0 z-10 opacity-30">
                                <div className="w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
                                <div className="absolute top-8 left-8 p-2 border-l-4 border-t-4 border-blue-500 w-16 h-16 rounded-tl-xl opacity-60"></div>
                                <div className="absolute top-8 right-8 p-2 border-r-4 border-t-4 border-blue-500 w-16 h-16 rounded-tr-xl opacity-60"></div>
                                <div className="absolute bottom-8 left-8 p-2 border-l-4 border-b-4 border-blue-500 w-16 h-16 rounded-bl-xl opacity-60"></div>
                                <div className="absolute bottom-8 right-8 p-2 border-r-4 border-b-4 border-blue-500 w-16 h-16 rounded-br-xl opacity-60"></div>
                                
                                <div className="absolute bottom-10 left-0 right-0 text-center">
                                    <span className="bg-black/60 backdrop-blur px-6 py-2 rounded-full text-blue-400 font-bold uppercase tracking-[0.2em] text-sm border border-blue-500/30 animate-pulse">
                                        <Scan className="inline-block mr-2 -mt-1" size={16}/>
                                        Aguardando Identificação
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* PROCESSING INDICATOR */}
                        {isProcessing && !lastLog && (
                             <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                 <div className="flex flex-col items-center">
                                     <div className="h-16 w-16 border-4 border-t-transparent border-white rounded-full animate-spin mb-4"></div>
                                     <span className="text-xl font-bold text-white tracking-widest uppercase">Processando...</span>
                                 </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* RESULT CARD (POPUP) */}
                {lastLog && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className={`w-full max-w-md bg-[#18181b] rounded-3xl p-1 shadow-2xl border-t-4 ${
                            statusType === 'success' ? 'border-green-500 shadow-green-900/20' : 
                            statusType === 'warning' ? 'border-yellow-500 shadow-yellow-900/20' : 
                            'border-red-500 shadow-red-900/20'
                        }`}>
                            <div className="bg-[#121214] rounded-[20px] p-8 flex flex-col items-center text-center relative overflow-hidden">
                                
                                {/* Background glow */}
                                <div className={`absolute top-0 inset-x-0 h-32 opacity-10 blur-3xl ${
                                    statusType === 'success' ? 'bg-green-500' : 
                                    statusType === 'warning' ? 'bg-yellow-500' : 
                                    'bg-red-500'
                                }`}></div>

                                {/* Avatar */}
                                <div className={`relative h-40 w-40 rounded-full p-1 mb-6 border-4 ${
                                    statusType === 'success' ? 'border-green-500' : 
                                    statusType === 'warning' ? 'border-yellow-500' : 
                                    'border-red-500'
                                }`}>
                                    <img 
                                        src={lastLog.studentPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.studentName} 
                                        alt="Aluno" 
                                        className="w-full h-full rounded-full object-cover bg-gray-800"
                                    />
                                    <div className={`absolute bottom-1 right-1 p-2 rounded-full text-white shadow-lg ${
                                        statusType === 'success' ? 'bg-green-600' : 
                                        statusType === 'warning' ? 'bg-yellow-600' : 
                                        'bg-red-600'
                                    }`}>
                                        {statusType === 'success' && <CheckCircle size={20}/>}
                                        {statusType === 'warning' && <Clock size={20}/>}
                                        {statusType === 'error' && <ShieldAlert size={20}/>}
                                    </div>
                                </div>

                                {/* Info */}
                                <h2 className="text-3xl font-black text-white uppercase leading-tight mb-1">{lastLog.studentName}</h2>
                                <p className="text-lg text-gray-400 font-medium mb-8 flex items-center gap-2">
                                    <User size={16} /> {lastLog.className}
                                </p>

                                {/* Status Badge */}
                                <div className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-[0.15em] flex flex-col items-center justify-center gap-1 ${
                                    statusType === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                                    statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                                    'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                    {statusMessage}
                                    {statusSubMessage && (
                                        <span className="text-[10px] normal-case font-normal tracking-normal opacity-80">
                                            {statusSubMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER --- */}
            <div className="h-12 bg-[#09090b] border-t border-white/5 flex items-center justify-between px-8 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1"><Zap size={10} className="text-brand-600" /> Sistema CEMAL v2.5</span>
                     <span className="hidden md:inline">|</span>
                     <span className="hidden md:inline">Terminal ID: T-01</span>
                 </div>
                 <div>
                     Desenvolvido pela Equipe de TI
                 </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};
