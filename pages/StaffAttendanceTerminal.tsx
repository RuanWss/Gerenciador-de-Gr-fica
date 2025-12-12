
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, Scan, Wifi, Zap, User, Database } from 'lucide-react';
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
    const [loadingMessage, setLoadingMessage] = useState('Inicializando Sistema da Equipe...');
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

    // 3. Listen to Staff Data (Tempo Real)
    useEffect(() => {
        // Inscreve no listener do Firestore
        const unsubscribe = listenToStaffMembers((newStaffList) => {
            console.log("Lista de funcionários atualizada:", newStaffList.length);
            const activeStaff = newStaffList.filter(s => s.active); // Apenas ativos
            setStaff(activeStaff);
        });

        return () => unsubscribe();
    }, []);

    // 4. Process Faces (Sempre que Staff ou Models mudarem)
    useEffect(() => {
        if (modelsLoaded && staff.length > 0) {
            processStaffFaces(staff);
        } else if (modelsLoaded && staff.length === 0) {
            setLoadingMessage(''); // Limpa msg se carregou mas não tem ninguém
            setLabeledDescriptors([]);
        }
    }, [modelsLoaded, staff]);

    // Helper: Process Student Photos (Create Descriptors)
    const processStaffFaces = async (staffList: StaffMember[]) => {
        setLoadingMessage('Sincronizando Biometria...');
        
        const faceApi = (faceapi as any).default || faceapi;
        const labeledDescriptorsTemp: any[] = [];
        
        const staffWithPhoto = staffList.filter(s => s.photoUrl);
        let processedCount = 0;

        for (const member of staffWithPhoto) {
            if (!member.photoUrl) continue;
            try {
                const img = await faceApi.fetchImage(member.photoUrl);
                const detection = await faceApi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                
                if (detection) {
                    labeledDescriptorsTemp.push(new faceApi.LabeledFaceDescriptors(member.id, [detection.descriptor]));
                }
                processedCount++;
                // Atualiza progresso visualmente apenas se houver muitos
                if (staffWithPhoto.length > 5) {
                     setLoadingMessage(`Sincronizando: ${Math.round((processedCount / staffWithPhoto.length) * 100)}%`);
                }
            } catch (err) {
                console.warn(`Erro ao processar foto de ${member.name}`, err);
            }
        }
        
        setLabeledDescriptors(labeledDescriptorsTemp);
        setLoadingMessage('');
        console.log("Biometria atualizada para", labeledDescriptorsTemp.length, "funcionários.");
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
                        boxColor: '#dc2626', 
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
                        }, 4000); 
                    }
                }
            } catch (err) {
                // Silently handle
            }
        };

        const intervalId = setInterval(detect, 500);

        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]); // Recria o intervalo quando as dependências mudam

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

            // Chama o logStaffAttendance que verifica a regra de 2 minutos
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

    const getStatusColor = () => {
        switch (statusType) {
            case 'success': return 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]';
            case 'warning': return 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]';
            case 'error': return 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]';
            default: return 'border-white/10';
        }
    };

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-red-900 to-black text-white overflow-hidden flex flex-col font-sans">
            
            {/* --- HEADER --- */}
            <div className="h-[15vh] bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 z-20 shadow-lg relative">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto drop-shadow-md" alt="Logo" />
                    <div className="h-10 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Ponto Eletrônico</h1>
                        <p className="text-xs font-medium text-red-400 tracking-[0.2em] uppercase">Controle de Equipe</p>
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
                        {/* Indicador de Status do Banco */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${labeledDescriptors.length > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-500'}`} title="Funcionários com biometria carregada">
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
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-transparent">
                
                {/* CAMERA CONTAINER */}
                <div className={`relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-500 ${getStatusColor()} ${isProcessing ? 'scale-[0.98] opacity-80' : 'scale-100'}`}>
                    
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
                        
                        {loadingMessage && !lastLog && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <Loader2 size={64} className="text-red-500 animate-spin mb-6" />
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase animate-pulse">{loadingMessage}</h2>
                            </div>
                        )}

                        {/* AVISO DE BANCO VAZIO */}
                        {!loadingMessage && modelsLoaded && labeledDescriptors.length === 0 && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                <AlertTriangle size={64} className="text-yellow-500 mb-6 animate-bounce" />
                                <h2 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase mb-2">Banco de Faces Vazio</h2>
                                <p className="text-gray-400 max-w-md text-center">Nenhum funcionário com foto foi encontrado no sistema. Cadastre as fotos no Painel de RH para ativar o reconhecimento.</p>
                            </div>
                        )}

                        {!loadingMessage && !lastLog && !isProcessing && labeledDescriptors.length > 0 && (
                            <div className="absolute inset-0 z-10 opacity-30">
                                <div className="w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
                                <div className="absolute bottom-10 left-0 right-0 text-center">
                                    <span className="bg-black/60 backdrop-blur px-6 py-2 rounded-full text-red-400 font-bold uppercase tracking-[0.2em] text-sm border border-red-500/30 animate-pulse">
                                        <Scan className="inline-block mr-2 -mt-1" size={16}/>
                                        Aproxime-se para registrar o ponto
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {isProcessing && !lastLog && (
                             <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                 <div className="flex flex-col items-center">
                                     <div className="h-16 w-16 border-4 border-t-transparent border-white rounded-full animate-spin mb-4"></div>
                                     <span className="text-xl font-bold text-white tracking-widest uppercase">Validando Biometria...</span>
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
                                
                                <div className={`relative h-40 w-40 rounded-full p-1 mb-6 border-4 ${
                                    statusType === 'success' ? 'border-green-500' : 
                                    statusType === 'warning' ? 'border-yellow-500' : 
                                    'border-red-500'
                                }`}>
                                    <img 
                                        src={lastLog.staffPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.staffName} 
                                        alt="Funcionario" 
                                        className="w-full h-full rounded-full object-cover bg-gray-800"
                                    />
                                </div>

                                <h2 className="text-3xl font-black text-white uppercase leading-tight mb-1">{lastLog.staffName}</h2>
                                <p className="text-lg text-gray-400 font-medium mb-8 flex items-center gap-2">
                                    <User size={16} /> {lastLog.staffRole}
                                </p>

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
                                <p className="text-gray-500 text-xs mt-4">Horário: {new Date(lastLog.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-12 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-8 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1"><Zap size={10} className="text-red-600" /> Sistema CEMAL RH</span>
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
