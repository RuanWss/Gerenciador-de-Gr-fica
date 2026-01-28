
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, Loader2, Scan, Database, Settings, XCircle, Maximize, Minimize, RefreshCw } from 'lucide-react';
// @ts-ignore
import * as faceapi from '@vladmandic/face-api';

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
    
    const [isFullscreen, setIsFullscreen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);
    
    // Stability Refs
    const matchCounter = useRef<number>(0);
    const lastMatchLabel = useRef<string>('unknown');
    const CONFIDENCE_THRESHOLD = 5;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            // @ts-ignore
            const faceApi = faceapi;
            if (!faceApi || !faceApi.nets) return;

            if (faceApi.nets.tinyFaceDetector.isLoaded) {
                setModelsLoaded(true);
                return;
            }

            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceApi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceApi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                setLoadingMessage('Erro no Módulo de IA');
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        const unsubscribe = listenToStaffMembers((newStaffList) => {
            setStaff(newStaffList.filter(s => s.photoUrl && s.active));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (modelsLoaded && staff.length > 0) {
            processStaffFaces(staff);
        }
    }, [modelsLoaded, staff]);

    const processStaffFaces = async (staffList: StaffMember[]) => {
        // @ts-ignore
        const faceApi = faceapi;
        const toProcess: StaffMember[] = [];
        const cachedDescriptors: any[] = [];

        for (const member of staffList) {
            const cacheKey = `staff_face_v3_${member.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.url === member.photoUrl) {
                        cachedDescriptors.push(new faceApi.LabeledFaceDescriptors(member.id, [new Float32Array(parsed.descriptor)]));
                        continue;
                    }
                } catch(e) {}
            }
            toProcess.push(member);
        }

        setLabeledDescriptors(cachedDescriptors);

        if (toProcess.length > 0) {
            setLoadingMessage(`Sincronizando faces: 0/${toProcess.length}`);
            const BATCH_SIZE = 3;
            for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
                const batch = toProcess.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(async (member) => {
                    try {
                        const img = await faceApi.fetchImage(member.photoUrl);
                        const detection = await faceApi.detectSingleFace(img, new faceApi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptor();
                        if (detection) {
                            localStorage.setItem(`staff_face_v3_${member.id}`, JSON.stringify({
                                url: member.photoUrl,
                                descriptor: Array.from(detection.descriptor)
                            }));
                            return new faceApi.LabeledFaceDescriptors(member.id, [detection.descriptor]);
                        }
                    } catch (err) {}
                    return null;
                }));
                const valid = results.filter(r => r !== null);
                setLabeledDescriptors(prev => [...prev, ...valid]);
                setLoadingMessage(`Sincronizando faces: ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length}`);
            }
        }
        setLoadingMessage('');
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) { setLoadingMessage('Câmera Indisponível'); }
            }
        };
        if (modelsLoaded) startCamera();
        return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
    }, [modelsLoaded]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // @ts-ignore
        const faceApi = faceapi;

        if (!video || !canvas || !modelsLoaded || !isVideoReady || labeledDescriptors.length === 0) return;

        const faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.45);
        const detectorOptions = new faceApi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

        const detect = async () => {
            if (processingRef.current || lastLog || video.paused || video.ended) return;

            try {
                const detections = await faceApi.detectAllFaces(video, detectorOptions).withFaceLandmarks(true).withFaceDescriptors();
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                if (canvas.width !== displaySize.width) faceApi.matchDimensions(canvas, displaySize);

                const resized = faceApi.resizeResults(detections, displaySize);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (resized.length > 0) {
                    const match = resized[0];
                    const bestMatch = faceMatcher.findBestMatch(match.descriptor);
                    const label = bestMatch.label;

                    if (label !== 'unknown' && label === lastMatchLabel.current) {
                        matchCounter.current++;
                    } else {
                        matchCounter.current = 0;
                        lastMatchLabel.current = label;
                    }

                    const isConfirmed = matchCounter.current >= CONFIDENCE_THRESHOLD;
                    setDetectedName(label !== 'unknown' ? staff.find(s => s.id === label)?.name || null : null);
                    setConfidenceScore(matchCounter.current);

                    const drawBox = new faceApi.draw.DrawBox(match.detection.box, { 
                        label: isConfirmed ? 'Confirmado' : (label !== 'unknown' ? 'Verificando...' : ''), 
                        boxColor: isConfirmed ? '#22c55e' : (label !== 'unknown' ? '#eab308' : 'rgba(255,255,255,0.2)')
                    });
                    drawBox.draw(canvas);

                    if (isConfirmed && label !== 'unknown') {
                        processingRef.current = true;
                        setIsProcessing(true);
                        matchCounter.current = 0;
                        await processAttendance(label);
                        setTimeout(() => { processingRef.current = false; setIsProcessing(false); }, 4000);
                    }
                } else {
                    matchCounter.current = 0;
                    lastMatchLabel.current = 'unknown';
                    setDetectedName(null);
                }
            } catch (err) {}
        };

        const intervalId = setInterval(detect, 150);
        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors, lastLog]);

    const processAttendance = async (staffId: string) => {
        const member = staff.find(s => s.id === staffId);
        if (!member) return;

        const now = new Date();
        const log: StaffAttendanceLog = {
            id: '', staffId: member.id, staffName: member.name, staffRole: member.role,
            staffPhotoUrl: member.photoUrl || '', timestamp: now.getTime(), dateString: now.toISOString().split('T')[0]
        };

        const result = await logStaffAttendance(log);
        setLastLog(log);

        if (result.startsWith('success')) {
            const type = result.split('_')[1] === 'entry' ? 'ENTRADA' : 'SAÍDA';
            setStatusType('success');
            setStatusMessage(`PONTO DE ${type} REGISTRADO`);
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
        setTimeout(() => { setLastLog(null); setStatusType('waiting'); setStatusMessage(''); }, 3500);
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(type === 'success' ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3");
        audio.play().catch(() => {});
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); }
        else { document.exitFullscreen(); setIsFullscreen(false); }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0000] text-white flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none" />
            
            <header className="relative z-10 flex flex-col items-center pt-8 px-4 w-full max-w-md mx-auto">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 md:h-20 w-auto object-contain drop-shadow-xl mb-8" alt="Logo" />
                <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center shadow-2xl">
                    <p className="text-red-200/70 text-xs font-bold tracking-[0.2em] uppercase mb-2">Relógio de Ponto Facial</p>
                    <h1 className="text-5xl md:text-6xl font-clock font-extrabold tracking-tighter text-white drop-shadow-lg mb-2 tabular-nums">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm font-bold capitalize">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full">
                <div className={`relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 ${
                    statusType === 'success' ? 'ring-4 ring-green-500' :
                    statusType === 'error' ? 'ring-4 ring-red-500' :
                    detectedName ? 'ring-4 ring-yellow-500' : ''
                }`}>
                    <video ref={videoRef} autoPlay muted playsInline onPlay={() => setIsVideoReady(true)} className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1] object-cover" />

                    {(loadingMessage || isProcessing) && !lastLog && (
                        <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
                            <Loader2 size={48} className="text-white animate-spin mb-4" />
                            <p className="text-white font-bold uppercase tracking-widest text-sm">{loadingMessage || 'Processando...'}</p>
                        </div>
                    )}
                    
                    {!isProcessing && !lastLog && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-12 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent">
                            <div className="text-center">
                                {detectedName ? (
                                    <div className="animate-in slide-in-from-bottom-4">
                                        <p className="text-yellow-400 font-bold text-lg mb-1">Verificando...</p>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-wide">{detectedName}</h2>
                                        <div className="w-48 h-2 bg-gray-700 rounded-full mt-3 mx-auto overflow-hidden">
                                            <div className="h-full bg-yellow-500 transition-all duration-150" style={{ width: `${(confidenceScore/CONFIDENCE_THRESHOLD)*100}%` }} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-1">Posicione o Rosto</h2>
                                        <p className="text-red-200/80 text-xs font-bold tracking-[0.2em] uppercase">Sincronização Automática</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {lastLog && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-in fade-in duration-200">
                    <div className={`w-full max-w-sm bg-[#18181b] rounded-[2rem] p-1 shadow-2xl border-t-4 ${statusType === 'success' ? 'border-green-500' : statusType === 'warning' ? 'border-yellow-500' : 'border-red-500'}`}>
                        <div className="bg-[#121214] rounded-[1.8rem] p-8 flex flex-col items-center text-center">
                            <img src={lastLog.staffPhotoUrl || `https://ui-avatars.com/api/?name=${lastLog.staffName}`} alt="Func" className="h-32 w-32 rounded-full object-cover border-4 border-white/5 mb-6 shadow-xl" />
                            <h2 className="text-2xl font-black text-white uppercase leading-tight mb-1">{lastLog.staffName}</h2>
                            <p className="text-sm text-gray-500 font-bold uppercase mb-8">{lastLog.staffRole}</p>
                            <div className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest ${statusType === 'success' ? 'bg-green-500/10 text-green-500' : statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                {statusMessage}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <footer className="relative z-10 p-6 w-full max-w-md mx-auto flex justify-end gap-4">
                <button onClick={() => window.location.reload()} className="w-12 h-12 bg-black/40 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all"><RefreshCw size={20}/></button>
                <button onClick={toggleFullscreen} className="w-12 h-12 bg-black/40 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">{isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
                <button onClick={() => { if(confirm("Sair?")) logout(); }} className="w-12 h-12 bg-black/40 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all"><Settings size={20}/></button>
            </footer>
        </div>
    );
};
