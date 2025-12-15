
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, Loader2, Scan, Database, Settings, XCircle, Maximize, Minimize, UserCheck } from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

export const StaffAttendanceTerminal: React.FC = () => {
    const { logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [lastLog, setLastLog] = useState<StaffAttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    
    // AI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando Sistema...');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
    // Recognition Stability State
    const [detectedName, setDetectedName] = useState<string | null>(null);
    const [confidenceScore, setConfidenceScore] = useState(0);
    
    // UI State
    const [isFullscreen, setIsFullscreen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);
    
    // Stability Refs (Anti-Jitter)
    const matchCounter = useRef<number>(0);
    const lastMatchLabel = useRef<string>('unknown');
    const CONFIDENCE_THRESHOLD = 5; // Precisa de 5 frames consecutivos confirmando a mesma pessoa

    // Cache para evitar re-processamento pesado
    const processedCache = useRef<Map<string, string>>(new Map());

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Load AI Models (Ultra Lightweight)
    useEffect(() => {
        const loadModels = async () => {
            const faceApi = (faceapi as any).default || faceapi;

            if (!faceApi || !faceApi.nets) return;

            // Se já carregou, não recarrega
            if (faceApi.nets.tinyFaceDetector.isLoaded && faceApi.nets.faceLandmark68TinyNet.isLoaded) {
                setModelsLoaded(true);
                return;
            }

            setLoadingMessage('Carregando IA...');
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Erro AI:", error);
                setLoadingMessage('Erro no Módulo de IA');
            }
        };
        loadModels();
    }, []);

    // 3. Listen to Staff Data
    useEffect(() => {
        const unsubscribe = listenToStaffMembers((newStaffList) => {
            const activeStaff = newStaffList.filter(s => s.photoUrl && (s.active !== false));
            setStaff(activeStaff);
        });
        return () => unsubscribe();
    }, []);

    // 4. Process Faces (Smart Caching Strategy)
    useEffect(() => {
        if (modelsLoaded && staff.length > 0) {
            processStaffFaces(staff);
        } else if (modelsLoaded && staff.length === 0) {
            setLoadingMessage(''); 
            setLabeledDescriptors([]);
        }
    }, [modelsLoaded, staff]);

    const processStaffFaces = async (staffList: StaffMember[]) => {
        const faceApi = (faceapi as any).default || faceapi;
        
        // Identifica quem precisa ser processado (foto nova ou não cacheada)
        const toProcess = staffList.filter(s => {
            const cachedUrl = processedCache.current.get(s.id);
            return cachedUrl !== s.photoUrl && s.photoUrl;
        });

        // Se ninguém mudou, verifica se alguém foi removido
        if (toProcess.length === 0) {
            const currentIds = new Set(staffList.map(s => s.id));
            if (labeledDescriptors.some(ld => !currentIds.has(ld.label)) || labeledDescriptors.length !== staffList.length) {
                // Filtra descritores antigos
                const validDescriptors = labeledDescriptors.filter(ld => currentIds.has(ld.label));
                setLabeledDescriptors(validDescriptors);
            }
            setLoadingMessage('');
            return;
        }

        setLoadingMessage(`Atualizando Biometria (${toProcess.length})...`);
        
        const newDescriptors: any[] = [];
        
        for (const member of toProcess) {
            if (!member.photoUrl) continue;
            try {
                // Yield para não travar a UI
                await new Promise(resolve => setTimeout(resolve, 10));

                const img = await faceApi.fetchImage(member.photoUrl);
                const detection = await faceApi.detectSingleFace(
                    img, 
                    new faceApi.TinyFaceDetectorOptions()
                ).withFaceLandmarks(true).withFaceDescriptor();
                
                if (detection) {
                    newDescriptors.push(new faceApi.LabeledFaceDescriptors(member.id, [detection.descriptor]));
                    processedCache.current.set(member.id, member.photoUrl);
                }
            } catch (err) {
                console.warn(`Erro foto ${member.name}`);
            }
        }
        
        // Merge descritores novos com os antigos (preservando o cache)
        setLabeledDescriptors(prev => {
            const updatedIds = new Set(newDescriptors.map(d => d.label));
            const currentIds = new Set(staffList.map(s => s.id));
            const kept = prev.filter(d => !updatedIds.has(d.label) && currentIds.has(d.label));
            return [...kept, ...newDescriptors];
        });
        
        setLoadingMessage('');
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
                        // Forçar play em navegadores mobile
                        videoRef.current.setAttribute("playsinline", "true"); 
                        videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
                    }
                } catch (err) {
                    console.error("Camera Error:", err);
                    setLoadingMessage('Câmera Indisponível');
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

    // 6. Fast Detection Loop with Stability Check
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const faceApi = (faceapi as any).default || faceapi;

        if (!video || !canvas || !modelsLoaded || !isVideoReady || labeledDescriptors.length === 0) return;

        let faceMatcher: any;
        try {
            // Aumentei a rigidez para 0.45 para evitar falsos positivos
            faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.45);
        } catch (e) { return; }

        // Mover opções para fora do loop para performance
        const detectorOptions = new faceApi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

        const detect = async () => {
            if (processingRef.current || lastLog || video.paused || video.ended) return;

            try {
                const detections = await faceApi.detectAllFaces(video, detectorOptions)
                    .withFaceLandmarks(true)
                    .withFaceDescriptors();

                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
                    faceApi.matchDimensions(canvas, displaySize);
                }

                const resizedDetections = faceApi.resizeResults(detections, displaySize);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (resizedDetections.length > 0) {
                    // Pega o rosto principal (maior área)
                    const match = resizedDetections[0];
                    const box = match.detection.box;
                    
                    let label = 'unknown';
                    let bestDistance = 1;

                    if (match.descriptor) {
                        const bestMatch = faceMatcher.findBestMatch(match.descriptor);
                        label = bestMatch.label;
                        bestDistance = bestMatch.distance;
                    }

                    // --- Lógica de Estabilidade Temporal (Anti-Jitter) ---
                    if (label !== 'unknown' && label === lastMatchLabel.current) {
                        matchCounter.current += 1;
                    } else {
                        matchCounter.current = 0;
                        lastMatchLabel.current = label;
                        setDetectedName(null);
                        setConfidenceScore(0);
                    }

                    // Se confirmou por X frames seguidos
                    const isConfirmed = matchCounter.current >= CONFIDENCE_THRESHOLD;
                    
                    // UI Feedback
                    const staffName = label !== 'unknown' ? staff.find(s => s.id === label)?.name : 'Desconhecido';
                    
                    if (label !== 'unknown') {
                        setDetectedName(staffName || null);
                        setConfidenceScore(matchCounter.current);
                    }

                    const drawBox = new faceApi.draw.DrawBox(box, { 
                        label: isConfirmed ? 'Confirmado' : (label !== 'unknown' ? 'Verificando...' : ''), 
                        boxColor: isConfirmed ? '#22c55e' : (label !== 'unknown' ? '#eab308' : 'rgba(255,255,255,0.3)'), 
                        lineWidth: isConfirmed ? 4 : 2
                    });
                    drawBox.draw(canvas);

                    if (isConfirmed && label !== 'unknown') {
                        processingRef.current = true;
                        setIsProcessing(true);
                        matchCounter.current = 0; // Reset
                        await processAttendance(label);
                        // Delay para evitar múltiplos registros
                        setTimeout(() => { 
                            processingRef.current = false; 
                            setIsProcessing(false);
                            setDetectedName(null);
                        }, 4000); 
                    }
                } else {
                    // Ninguém detectado
                    matchCounter.current = 0;
                    lastMatchLabel.current = 'unknown';
                    setDetectedName(null);
                }
            } catch (err) {
                // Silent error loop
            }
        };

        const intervalId = setInterval(detect, 150); // Loop um pouco mais rápido para fluidez
        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]); 

    const processAttendance = async (staffId: string) => {
        const member = staff.find(s => s.id === staffId);
        if (member) {
            const now = new Date();
            const localDateString = now.toLocaleDateString('en-CA');

            const log: StaffAttendanceLog = {
                id: '',
                staffId: member.id,
                staffName: member.name,
                staffRole: member.role,
                staffPhotoUrl: member.photoUrl,
                timestamp: now.getTime(),
                dateString: localDateString
            };

            const result = await logStaffAttendance(log);

            setLastLog(log);
            if (result === 'success') {
                setStatusType('success');
                setStatusMessage('PONTO REGISTRADO');
                playSound('success');
            } else if (result === 'too_soon') {
                setStatusType('warning');
                setStatusMessage('AGUARDE 2 MINUTOS');
                playSound('error');
            } else {
                setStatusType('error');
                setStatusMessage('ERRO AO REGISTRAR');
                playSound('error');
            }
            setTimeout(() => resetState(), 3500);
        }
    };

    const resetState = () => {
        setLastLog(null);
        setStatusType('waiting');
        setStatusMessage('');
        setIsProcessing(false);
        setDetectedName(null);
        matchCounter.current = 0;
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success' 
            ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3"
        );
        audio.volume = 0.5;
        audio.play().catch(() => {});
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
        <div className="min-h-screen w-full bg-[#0a0000] text-white flex flex-col relative overflow-hidden font-sans selection:bg-red-500/30">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none" />
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* --- HEADER --- */}
            <header className="relative z-10 flex flex-col items-center pt-8 px-4 w-full max-w-md mx-auto">
                <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    className="h-16 md:h-20 w-auto object-contain drop-shadow-xl mb-8" 
                    alt="Logo" 
                />
                <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"/>
                    <p className="text-red-200/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">Horário de Brasília</p>
                    <h1 className="text-5xl md:text-6xl font-clock font-extrabold tracking-tighter text-white drop-shadow-lg mb-2 tabular-nums">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm font-bold capitalize tracking-wide">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </header>

            {/* --- MAIN CONTENT (CAMERA CARD) --- */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full">
                <div className={`relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(220,38,38,0.2)] border border-white/10 transition-all duration-300 ${
                    statusType === 'success' ? 'ring-4 ring-green-500' :
                    statusType === 'error' ? 'ring-4 ring-red-500' :
                    detectedName ? 'ring-4 ring-yellow-500 shadow-yellow-500/20' : ''
                }`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 z-0"></div>
                    <div className="absolute inset-0 z-10 mix-blend-normal">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted
                            playsInline
                            onPlay={() => setIsVideoReady(true)}
                            className="w-full h-full object-cover transform scale-x-[-1] opacity-90" 
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1] object-cover" />
                    </div>

                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-12 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent">
                        {!isProcessing && !lastLog && !detectedName && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full flex items-center justify-center animate-pulse">
                                <Scan size={64} className="text-white relative z-10 drop-shadow-md opacity-80" />
                            </div>
                        )}
                        <div className="text-center">
                            {detectedName && !lastLog ? (
                                <div className="animate-in slide-in-from-bottom-4 fade-in">
                                    <p className="text-yellow-400 font-bold text-lg mb-1 flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin"/> Verificando...
                                    </p>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wide drop-shadow-md">{detectedName}</h2>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-48 h-2 bg-gray-700 rounded-full mt-3 mx-auto overflow-hidden">
                                        <div 
                                            className="h-full bg-yellow-500 transition-all duration-150 ease-out"
                                            style={{ width: `${Math.min((confidenceScore / CONFIDENCE_THRESHOLD) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-wide drop-shadow-md mb-1">Bater Ponto</h2>
                                    <p className="text-red-200/80 text-xs font-bold tracking-[0.2em] uppercase">Reconhecimento Facial</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Status Overlays */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                        {(loadingMessage || isProcessing) && !lastLog && (
                            <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                <Loader2 size={48} className="text-white animate-spin mb-4" />
                                <p className="text-white font-bold uppercase tracking-widest text-sm">{loadingMessage || 'Processando...'}</p>
                            </div>
                        )}
                        {!loadingMessage && modelsLoaded && staff.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Banco Vazio</h3>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- RESULT POPUP --- */}
            {lastLog && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className={`w-full max-w-sm bg-[#18181b] rounded-[2rem] p-1 shadow-2xl border-t-4 ${
                        statusType === 'success' ? 'border-green-500' : 
                        statusType === 'warning' ? 'border-yellow-500' : 
                        'border-red-500'
                    }`}>
                        <div className="bg-[#121214] rounded-[1.8rem] p-8 flex flex-col items-center text-center">
                            <div className={`relative h-32 w-32 rounded-full p-1 mb-6 border-4 ${
                                statusType === 'success' ? 'border-green-500' : 
                                statusType === 'warning' ? 'border-yellow-500' : 
                                'border-red-500'
                            }`}>
                                <img 
                                    src={lastLog.staffPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.staffName} 
                                    alt="Funcionario" 
                                    className="w-full h-full rounded-full object-cover bg-gray-800"
                                />
                                <div className={`absolute bottom-0 right-0 p-2 rounded-full border-4 border-[#121214] ${
                                    statusType === 'success' ? 'bg-green-500 text-white' : 
                                    statusType === 'warning' ? 'bg-yellow-500 text-black' : 
                                    'bg-red-500 text-white'
                                }`}>
                                    {statusType === 'success' ? <CheckCircle size={20} /> : statusType === 'warning' ? <Clock size={20} /> : <XCircle size={20} />}
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase leading-tight mb-1">{lastLog.staffName}</h2>
                            <p className="text-sm text-gray-400 font-bold uppercase mb-6">{lastLog.staffRole}</p>
                            <div className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-[0.15em] ${
                                statusType === 'success' ? 'bg-green-500/10 text-green-500' : 
                                statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                                'bg-red-500/10 text-red-500'
                            }`}>
                                {statusMessage}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER --- */}
            <footer className="relative z-10 p-6 w-full max-w-md mx-auto flex justify-end gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider h-12 mr-auto ${labeledDescriptors.length > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <Database size={14} />
                    {labeledDescriptors.length} Faces
                </div>
                <button onClick={toggleFullscreen} className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button onClick={() => { if(confirm("Sair?")) logout(); }} className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    <Settings size={20} />
                </button>
            </footer>
        </div>
    );
};
