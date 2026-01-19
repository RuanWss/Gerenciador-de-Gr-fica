
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, Scan, Wifi, Zap, User, Ban, ShieldAlert, Database, RefreshCw, Maximize, Minimize } from 'lucide-react';
// @ts-ignore
import * as faceapi from '@vladmandic/face-api';

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
    
    // UI State
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);
    const processedCache = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            // @ts-ignore
            const faceApi = faceapi;
            if (!faceApi || !faceApi.nets) return;

            // OTIMIZAÇÃO: Verifica se TODOS os modelos necessários (Tiny Detector, Tiny Landmarks, Recognition) 
            // já estão carregados para evitar re-download ou reinicialização.
            if (
                faceApi.nets.tinyFaceDetector.isLoaded && 
                faceApi.nets.faceLandmark68TinyNet.isLoaded && 
                faceApi.nets.faceRecognitionNet.isLoaded
            ) {
                setModelsLoaded(true);
                return;
            }

            setLoadingMessage('Carregando Motores de IA (Tiny Mode)...');
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                
                // Carrega apenas os modelos leves (Tiny) e o de reconhecimento
                await Promise.all([
                    faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                
                setModelsLoaded(true);
            } catch (error) {
                console.error("Erro AI:", error);
                setLoadingMessage('Erro de Conexão com IA');
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        const unsubscribe = listenToStudents((newStudents) => {
            setStudents(newStudents);
        });
        return () => unsubscribe();
    }, []);

    // Otimização de Processamento (Cache)
    useEffect(() => {
        if (modelsLoaded && students.length > 0) {
            processStudentFaces(students);
        } else if (modelsLoaded && students.length === 0) {
             setLoadingMessage('Nenhum aluno encontrado');
             setLabeledDescriptors([]);
        }
    }, [modelsLoaded, students]);

    const processStudentFaces = async (studentList: Student[]) => {
        // @ts-ignore
        const faceApi = faceapi;
        
        const validStudents = studentList.filter(s => s.photoUrl);
        const toProcess = validStudents.filter(s => {
            const cachedUrl = processedCache.current.get(s.id);
            return cachedUrl !== s.photoUrl && s.photoUrl;
        });

        if (toProcess.length === 0) {
            const currentIds = new Set(validStudents.map(s => s.id));
            if (labeledDescriptors.length !== validStudents.length) {
                const validDescriptors = labeledDescriptors.filter(ld => currentIds.has(ld.label));
                setLabeledDescriptors(validDescriptors);
            }
            setLoadingMessage('');
            return;
        }

        setLoadingMessage(`Otimizando Biometria (${toProcess.length})...`);
        const newDescriptors: any[] = [];

        for (const student of toProcess) {
            if (!student.photoUrl) continue;
            try {
                await new Promise(resolve => setTimeout(resolve, 10));
                const img = await faceApi.fetchImage(student.photoUrl);
                // Usa TinyFaceDetector e TinyLandmarks (via withFaceLandmarks(true))
                const detection = await faceApi.detectSingleFace(img, new faceApi.TinyFaceDetectorOptions())
                    .withFaceLandmarks(true)
                    .withFaceDescriptor();
                
                if (detection) {
                    newDescriptors.push(new faceApi.LabeledFaceDescriptors(student.id, [detection.descriptor]));
                    processedCache.current.set(student.id, student.photoUrl);
                }
            } catch (err) {
                console.warn(`Erro ao processar ${student.name}`);
            }
        }
        
        setLabeledDescriptors(prev => {
            const updatedIds = new Set(newDescriptors.map(d => d.label));
            const currentIds = new Set(validStudents.map(s => s.id));
            const kept = prev.filter(d => !updatedIds.has(d.label) && currentIds.has(d.label));
            return [...kept, ...newDescriptors];
        });
        setLoadingMessage('');
    };

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
                        videoRef.current.setAttribute("playsinline", "true");
                    }
                } catch (err) {
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

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // @ts-ignore
        const faceApi = faceapi;

        if (!video || !canvas || !modelsLoaded || !isVideoReady || labeledDescriptors.length === 0) return;

        let faceMatcher: any;
        try {
            faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.55);
        } catch (e) { return; }

        const detect = async () => {
            if (processingRef.current || lastLog || video.paused || video.ended) return;

            try {
                // Opções otimizadas para Tiny Face Detector
                const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
                const detections = await faceApi.detectAllFaces(video, options)
                    .withFaceLandmarks(true) // Usa Tiny Landmarks
                    .withFaceDescriptors();

                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
                    faceApi.matchDimensions(canvas, displaySize);
                }

                const resizedDetections = faceApi.resizeResults(detections, displaySize);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (resizedDetections.length > 0) {
                    const match = resizedDetections[0];
                    const box = match.detection.box;
                    let label = 'unknown';

                    if (match.descriptor) {
                        const bestMatch = faceMatcher.findBestMatch(match.descriptor);
                        label = bestMatch.label;
                    }

                    const drawBox = new faceApi.draw.DrawBox(box, { 
                        label: label === 'unknown' ? 'Identificando...' : 'Processando...', 
                        boxColor: label === 'unknown' ? '#3b82f6' : '#22c55e',
                        lineWidth: 2
                    });
                    drawBox.draw(canvas);

                    if (label !== 'unknown') {
                        processingRef.current = true;
                        setIsProcessing(true);
                        await processAttendance(label);
                        setTimeout(() => { 
                            processingRef.current = false; 
                            setIsProcessing(false);
                        }, 3000);
                    }
                }
            } catch (err) {}
        };

        const intervalId = setInterval(detect, 200);
        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]);

    const processAttendance = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);

        if (student) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
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
                setLastLog({ id: '', studentId: student.id, studentName: student.name, className: student.className, studentPhotoUrl: student.photoUrl, timestamp: now.getTime(), type: 'entry', dateString: now.toISOString().split('T')[0] });
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
                dateString: now.toISOString().split('T')[0]
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

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    return (
        <div className="h-screen w-screen bg-[#09090b] text-white overflow-hidden flex flex-col font-sans selection:bg-brand-500/30">
            {/* HEADER */}
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
                        <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                         <button onClick={logout} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#09090b] to-[#09090b]">
                <div className={`relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-500 ${getStatusColor()} ${isProcessing ? 'scale-[0.98] opacity-80' : 'scale-100'}`}>
                    <video ref={videoRef} autoPlay muted onPlay={() => setIsVideoReady(true)} className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]" />

                    <div className="absolute inset-0 pointer-events-none">
                        {loadingMessage && !lastLog && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <Loader2 size={64} className="text-brand-500 animate-spin mb-6" />
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase animate-pulse">{loadingMessage}</h2>
                            </div>
                        )}
                        {!loadingMessage && modelsLoaded && students.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <AlertTriangle size={64} className="text-yellow-500 mb-6 animate-bounce" />
                                <h2 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase mb-2">Banco de Faces Vazio</h2>
                            </div>
                        )}
                        {!loadingMessage && !lastLog && !isProcessing && labeledDescriptors.length > 0 && (
                            <div className="absolute inset-0 z-10 opacity-30">
                                <div className="w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
                                <div className="absolute bottom-10 left-0 right-0 text-center">
                                    <span className="bg-black/60 backdrop-blur px-6 py-2 rounded-full text-blue-400 font-bold uppercase tracking-[0.2em] text-sm border border-blue-500/30 animate-pulse">
                                        <Scan className="inline-block mr-2 -mt-1" size={16}/>
                                        Aguardando Identificação
                                    </span>
                                </div>
                            </div>
                        )}
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

                {lastLog && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className={`w-full max-w-md bg-[#18181b] rounded-3xl p-1 shadow-2xl border-t-4 ${
                            statusType === 'success' ? 'border-green-500 shadow-green-900/20' : 
                            statusType === 'warning' ? 'border-yellow-500 shadow-yellow-900/20' : 
                            'border-red-500 shadow-red-900/20'
                        }`}>
                            <div className="bg-[#121214] rounded-[20px] p-8 flex flex-col items-center text-center relative overflow-hidden">
                                <div className={`relative h-40 w-40 rounded-full p-1 mb-6 border-4 ${
                                    statusType === 'success' ? 'border-green-500' : 
                                    statusType === 'warning' ? 'border-yellow-500' : 
                                    'border-red-500'
                                }`}>
                                    <img src={lastLog.studentPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.studentName} alt="Aluno" className="w-full h-full rounded-full object-cover bg-gray-800"/>
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase leading-tight mb-1">{lastLog.studentName}</h2>
                                <p className="text-lg text-gray-400 font-medium mb-8 flex items-center gap-2"><User size={16} /> {lastLog.className}</p>
                                <div className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-[0.15em] flex flex-col items-center justify-center gap-1 ${
                                    statusType === 'success' ? 'bg-green-500/10 text-green-500' : 
                                    statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                                    'bg-red-500/10 text-red-500'
                                }`}>
                                    {statusMessage}
                                    {statusSubMessage && <span className="text-[10px] normal-case font-normal tracking-normal opacity-80">{statusSubMessage}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-12 bg-[#09090b] border-t border-white/5 flex items-center justify-between px-8 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1"><Zap size={10} className="text-brand-600" /> Sistema CEMAL v2.5</span>
                 </div>
                 <div>Desenvolvido pela Equipe de TI</div>
            </div>
            <style>{`@keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
        </div>
    );
};