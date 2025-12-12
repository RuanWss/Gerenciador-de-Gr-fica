
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, Loader2, Scan, Database, Settings, XCircle, Maximize, Minimize } from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

export const StaffAttendanceTerminal: React.FC = () => {
    const { logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [lastLog, setLastLog] = useState<StaffAttendanceLog | null>(null);
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

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Load AI Models (OTIMIZADO: Tiny Models)
    useEffect(() => {
        const loadModels = async () => {
            const faceApi = (faceapi as any).default || faceapi;

            if (!faceApi || !faceApi.nets) {
                console.error("Biblioteca FaceAPI não inicializada corretamente.");
                setLoadingMessage("Erro Fatal: FaceAPI não carregada");
                return;
            }

            // Verifica se os modelos TINY estão carregados
            if (
                faceApi.nets.tinyFaceDetector.isLoaded && 
                faceApi.nets.faceLandmark68TinyNet.isLoaded && 
                faceApi.nets.faceRecognitionNet.isLoaded
            ) {
                setModelsLoaded(true);
                return;
            }

            setLoadingMessage('Carregando Motores de IA (Modo Leve)...');
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    // Usa TinyFaceDetector (Mais leve e rápido)
                    faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    // Usa TinyLandmarks
                    faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    // Mantém o reconhecimento robusto
                    faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
                setLoadingMessage('Erro de Conexão (IA)');
            }
        };
        loadModels();
    }, []);

    // 3. Listen to Staff Data (Tempo Real)
    useEffect(() => {
        const unsubscribe = listenToStaffMembers((newStaffList) => {
            // Filtro relaxado: se active for undefined, considera true. Garante que tenha foto.
            const activeStaff = newStaffList.filter(s => s.photoUrl && (s.active !== false)); 
            console.log(`Carregados ${activeStaff.length} funcionários com foto.`);
            setStaff(activeStaff);
        });

        return () => unsubscribe();
    }, []);

    // 4. Process Faces (Sempre que Staff ou Models mudarem)
    useEffect(() => {
        if (modelsLoaded && staff.length > 0) {
            processStaffFaces(staff);
        } else if (modelsLoaded && staff.length === 0) {
            setLoadingMessage(''); 
            setLabeledDescriptors([]);
        }
    }, [modelsLoaded, staff]);

    // Helper: Process Staff Photos (Create Descriptors)
    const processStaffFaces = async (staffList: StaffMember[]) => {
        const faceApi = (faceapi as any).default || faceapi;
        setLoadingMessage(`Otimizando ${staffList.length} registros...`);
        
        const labeledDescriptorsTemp: any[] = [];
        let processedCount = 0;
        let errorCount = 0;
        let successCount = 0;

        for (const member of staffList) {
            if (!member.photoUrl) continue;
            try {
                // Yield para a UI não travar (importante em listas grandes)
                await new Promise(resolve => setTimeout(resolve, 0));

                let img;
                try {
                    img = await faceApi.fetchImage(member.photoUrl);
                } catch (fetchErr) {
                    console.warn(`Fetch nativo falhou para ${member.name}, tentando fallback...`);
                    img = await new Promise((resolve, reject) => {
                        const image = new Image();
                        image.crossOrigin = "anonymous";
                        image.src = member.photoUrl!;
                        image.onload = () => resolve(image);
                        image.onerror = reject;
                    });
                }

                // Detecta com TinyFaceDetectorOptions
                const detection = await faceApi.detectSingleFace(
                    img, 
                    new faceApi.TinyFaceDetectorOptions()
                ).withFaceLandmarks(true).withFaceDescriptor(); // true para tiny landmarks
                
                if (detection) {
                    labeledDescriptorsTemp.push(new faceApi.LabeledFaceDescriptors(member.id, [detection.descriptor]));
                    successCount++;
                } else {
                    console.warn(`Rosto não detectado na foto de: ${member.name}`);
                    errorCount++;
                }
            } catch (err) {
                console.error(`Erro crítico ao processar foto de ${member.name}:`, err);
                errorCount++;
            }
            
            processedCount++;
            if (processedCount % 2 === 0 || processedCount === staffList.length) {
                 setLoadingMessage(`Indexando: ${Math.round((processedCount / staffList.length) * 100)}%`);
            }
        }
        
        setLabeledDescriptors(labeledDescriptorsTemp);
        setLoadingMessage('');
        
        console.log(`Finalizado: ${successCount} sucessos, ${errorCount} erros.`);
        
        if (successCount === 0 && staffList.length > 0) {
             setStatusType('error');
             setStatusMessage("ERRO NAS FOTOS");
             setStatusSubMessage("Nenhum rosto válido detectado.");
             setTimeout(() => resetState(), 5000);
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
                        videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
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

        if (!video || !canvas || !modelsLoaded || !isVideoReady || labeledDescriptors.length === 0 || !faceApi) return;

        // FaceMatcher com threshold levemente maior para evitar falsos positivos com TinyModel
        let faceMatcher: any;
        try {
            faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.55);
        } catch (e) {
            return;
        }

        const detect = async () => {
            if (processingRef.current) return; 
            if (lastLog) return; 
            if (video.paused || video.ended) return;

            try {
                // --- OTIMIZAÇÃO: InputSize menor para performance ---
                const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
                
                const detections = await faceApi.detectAllFaces(video, options)
                .withFaceLandmarks(true) // tiny landmarks
                .withFaceDescriptors();

                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceApi.matchDimensions(canvas, displaySize);

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
                        label: label === 'unknown' ? 'Verificando...' : 'Identificado', 
                        boxColor: label === 'unknown' ? '#ffffff' : '#22c55e', 
                        lineWidth: 2,
                        drawLabelOptions: { fontSize: 10 }
                    });
                    drawBox.draw(canvas);

                    if (label !== 'unknown') {
                        processingRef.current = true;
                        setIsProcessing(true);
                        await processAttendance(label);
                        setTimeout(() => { 
                            processingRef.current = false; 
                            setIsProcessing(false);
                        }, 4000); 
                    }
                }
            } catch (err) {
                console.warn("Detection Loop Warning:", err);
            }
        };

        const intervalId = setInterval(detect, 200); // 200ms = 5 FPS de check (suficiente)

        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]); 

    const processAttendance = async (staffId: string) => {
        const member = staff.find(s => s.id === staffId);

        if (member) {
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            
            const log: StaffAttendanceLog = {
                id: '',
                staffId: member.id,
                staffName: member.name,
                staffRole: member.role,
                staffPhotoUrl: member.photoUrl,
                timestamp: now.getTime(),
                dateString: dateString
            };

            const result = await logStaffAttendance(log);

            if (result === 'success') {
                setLastLog(log);
                setStatusType('success');
                setStatusMessage('PONTO REGISTRADO');
                playSound('success');
                setTimeout(() => resetState(), 3000);
            } else if (result === 'too_soon') {
                setLastLog(log);
                setStatusType('warning');
                setStatusMessage('AGUARDE 2 MINUTOS');
                playSound('error');
                setTimeout(() => resetState(), 4000);
            } else {
                setLastLog(log);
                setStatusType('error');
                setStatusMessage('ERRO AO REGISTRAR');
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
            {/* Background Gradients to match the mood */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none" />
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />

            {/* --- HEADER --- */}
            <header className="relative z-10 flex flex-col items-center pt-8 px-4 w-full max-w-md mx-auto animate-in fade-in slide-in-from-top-4 duration-700">
                {/* Logo */}
                <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    className="h-16 md:h-20 w-auto object-contain drop-shadow-xl mb-8" 
                    alt="Logo" 
                />

                {/* Clock Card */}
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
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full animate-in fade-in zoom-in-95 duration-700 delay-150">
                
                {/* The "Red Card" Container - Acts as Camera Frame */}
                <div className={`relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(220,38,38,0.2)] border border-white/10 transition-all duration-500 group transform ${
                    statusType === 'success' ? 'ring-4 ring-green-500 scale-[1.02]' :
                    statusType === 'error' ? 'ring-4 ring-red-500 shake' :
                    statusType === 'warning' ? 'ring-4 ring-yellow-500' :
                    'hover:shadow-[0_20px_60px_rgba(220,38,38,0.3)]'
                }`}>
                    
                    {/* Background Base (Red Gradient from image) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 z-0"></div>

                    {/* Video Layer */}
                    <div className="absolute inset-0 z-10 mix-blend-normal">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted
                            playsInline // IMPORTANTE PARA IOS/MOBILE
                            onPlay={() => setIsVideoReady(true)}
                            className="w-full h-full object-cover transform scale-x-[-1] opacity-90" 
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1] object-cover" />
                    </div>

                    {/* Overlay Content (Always visible to mimic the card design) */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-12 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent">
                        
                        {/* Center Icon (Scan) - Pulse Animation */}
                        {!isProcessing && !lastLog && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full flex items-center justify-center animate-pulse">
                                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                                <Scan size={64} className="text-white relative z-10 drop-shadow-md opacity-80" />
                            </div>
                        )}

                        <div className="text-center transform transition-transform group-hover:-translate-y-2">
                            <h2 className="text-3xl font-black text-white uppercase tracking-wide drop-shadow-md mb-1">
                                Bater Ponto
                            </h2>
                            <p className="text-red-200/80 text-xs font-bold tracking-[0.2em] uppercase">
                                Reconhecimento Facial
                            </p>
                        </div>
                    </div>

                    {/* Status Overlays */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                        {/* Loading / Processing */}
                        {(loadingMessage || isProcessing) && !lastLog && (
                            <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center transition-opacity">
                                <Loader2 size={48} className="text-white animate-spin mb-4" />
                                <p className="text-white font-bold uppercase tracking-widest text-sm">{loadingMessage || 'Verificando...'}</p>
                            </div>
                        )}
                        
                        {/* Error State (Empty DB) */}
                        {!loadingMessage && modelsLoaded && staff.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Banco Vazio</h3>
                                <p className="text-gray-400 text-xs">Cadastre funcionários com fotos no RH.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- RESULT POPUP (Global Overlay) --- */}
            {lastLog && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className={`w-full max-w-sm bg-[#18181b] rounded-[2rem] p-1 shadow-2xl border-t-4 ${
                        statusType === 'success' ? 'border-green-500 shadow-green-900/40' : 
                        statusType === 'warning' ? 'border-yellow-500 shadow-yellow-900/40' : 
                        'border-red-500 shadow-red-900/40'
                    }`}>
                        <div className="bg-[#121214] rounded-[1.8rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
                            {/* Avatar */}
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
                                <div className={`absolute bottom-0 right-0 p-2 rounded-full text-white shadow-lg ${
                                    statusType === 'success' ? 'bg-green-600' : 
                                    statusType === 'warning' ? 'bg-yellow-600' : 
                                    'bg-red-600'
                                }`}>
                                    {statusType === 'success' && <CheckCircle size={20}/>}
                                    {statusType === 'warning' && <Clock size={20}/>}
                                    {statusType === 'error' && <XCircle size={20}/>}
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white uppercase leading-tight mb-1">{lastLog.staffName}</h2>
                            <p className="text-sm text-gray-400 font-bold uppercase mb-6 flex items-center gap-2 tracking-wider">
                                {lastLog.staffRole}
                            </p>

                            <div className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-[0.15em] flex flex-col items-center justify-center gap-1 ${
                                statusType === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                                statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                                'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                {statusMessage}
                            </div>
                            <p className="text-gray-500 text-xs mt-4 font-mono">Horário: {new Date(lastLog.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER --- */}
            <footer className="relative z-10 p-6 w-full max-w-md mx-auto flex justify-end gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider h-12 mr-auto ${labeledDescriptors.length > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <Database size={14} />
                    {/* Status detalhado no rodapé */}
                    {labeledDescriptors.length > 0 
                        ? `${labeledDescriptors.length} Faces Carregadas` 
                        : (staff.length > 0 ? 'Processando Fotos...' : 'Aguardando Faces...')}
                </div>

                <button 
                    onClick={toggleFullscreen}
                    className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
                    title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                <button 
                    onClick={() => {
                        if(confirm("Deseja sair do modo terminal?")) logout();
                    }}
                    className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg group"
                    title="Configurações / Sair"
                >
                    <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500"/>
                </button>
            </footer>
        </div>
    );
};
