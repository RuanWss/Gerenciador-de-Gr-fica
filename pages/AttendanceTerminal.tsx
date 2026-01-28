
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, logAttendance, listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { Student, AttendanceLog, StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, Scan, Database, RefreshCw, User, Briefcase, XCircle } from 'lucide-react';
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
    
    // Data Bases
    const [students, setStudents] = useState<Student[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    
    // UI Feedback State
    const [lastLog, setLastLog] = useState<{name: string, role: string, photo: string, type: 'student' | 'staff', status: 'success' | 'warning' | 'error', message: string, subMessage?: string} | null>(null);
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    const [loadingMessage, setLoadingMessage] = useState('Iniciando Sistema...');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
    // AI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);

    // Stability Refs
    const matchCounter = useRef<number>(0);
    const lastMatchLabel = useRef<string>('unknown');
    const CONFIDENCE_THRESHOLD = 5; // Frames necessários para confirmação

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
                setLoadingMessage('Erro ao carregar IA');
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        const unsubStudents = listenToStudents(setStudents);
        const unsubStaff = listenToStaffMembers(setStaff);
        return () => { unsubStudents(); unsubStaff(); };
    }, []);

    useEffect(() => {
        if (modelsLoaded && (students.length > 0 || staff.length > 0)) {
            syncAllFaces();
        }
    }, [modelsLoaded, students, staff]);

    const syncAllFaces = async () => {
        // @ts-ignore
        const faceApi = faceapi;
        
        const allSubjects = [
            ...students.filter(s => s.photoUrl).map(s => ({ id: `std_${s.id}`, name: s.name, photo: s.photoUrl! })),
            ...staff.filter(s => s.photoUrl && s.active).map(s => ({ id: `stf_${s.id}`, name: s.name, photo: s.photoUrl! }))
        ];

        const cachedDescriptors: any[] = [];
        const toProcess: typeof allSubjects = [];

        // Check Cache first
        for (const subj of allSubjects) {
            const cacheKey = `face_desc_v3_${subj.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.url === subj.photo) {
                        cachedDescriptors.push(new faceApi.LabeledFaceDescriptors(subj.id, [new Float32Array(parsed.descriptor)]));
                        continue;
                    }
                } catch(e) {}
            }
            toProcess.push(subj);
        }

        setLabeledDescriptors(cachedDescriptors);

        if (toProcess.length > 0) {
            setLoadingMessage(`Sincronizando: 0/${toProcess.length}`);
            const BATCH_SIZE = 3;
            for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
                const batch = toProcess.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map(async (subj) => {
                    try {
                        const img = await faceApi.fetchImage(subj.photo);
                        const detection = await faceApi.detectSingleFace(img, new faceApi.TinyFaceDetectorOptions())
                            .withFaceLandmarks(true)
                            .withFaceDescriptor();
                        
                        if (detection) {
                            const descriptor = detection.descriptor;
                            localStorage.setItem(`face_desc_v3_${subj.id}`, JSON.stringify({
                                url: subj.photo,
                                descriptor: Array.from(descriptor)
                            }));
                            return new faceApi.LabeledFaceDescriptors(subj.id, [descriptor]);
                        }
                    } catch (err) {}
                    return null;
                }));
                
                const validResults = results.filter(r => r !== null);
                setLabeledDescriptors(prev => [...prev, ...validResults]);
                setLoadingMessage(`Sincronizando: ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length}`);
            }
        }
        
        setLoadingMessage('');
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
                    });
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
                const detections = await faceApi.detectAllFaces(video, detectorOptions)
                    .withFaceLandmarks(true)
                    .withFaceDescriptors();

                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                if (canvas.width !== displaySize.width) faceApi.matchDimensions(canvas, displaySize);

                const resizedDetections = faceApi.resizeResults(detections, displaySize);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (resizedDetections.length > 0) {
                    const match = resizedDetections[0];
                    const bestMatch = faceMatcher.findBestMatch(match.descriptor);
                    const label = bestMatch.label;

                    if (label !== 'unknown' && label === lastMatchLabel.current) {
                        matchCounter.current++;
                    } else {
                        matchCounter.current = 0;
                        lastMatchLabel.current = label;
                    }

                    const isConfirmed = matchCounter.current >= CONFIDENCE_THRESHOLD;
                    
                    const drawBox = new faceApi.draw.DrawBox(match.detection.box, { 
                        label: isConfirmed ? 'Confirmado' : (label !== 'unknown' ? 'Verificando...' : ''), 
                        boxColor: isConfirmed ? '#22c55e' : (label !== 'unknown' ? '#eab308' : 'rgba(255,255,255,0.2)')
                    });
                    drawBox.draw(canvas);

                    if (isConfirmed && !processingRef.current) {
                        processingRef.current = true;
                        setIsProcessing(true);
                        matchCounter.current = 0;
                        await handleCapture(label);
                    }
                } else {
                    matchCounter.current = 0;
                    lastMatchLabel.current = 'unknown';
                }
            } catch (err) {}
        };

        const intervalId = setInterval(detect, 150);
        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors, lastLog]);

    const handleCapture = async (compositeId: string) => {
        const isStaff = compositeId.startsWith('stf_');
        const realId = compositeId.split('_')[1];
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];

        if (isStaff) {
            const member = staff.find(s => s.id === realId);
            if (!member) return;

            const result = await logStaffAttendance({
                id: '', staffId: member.id, staffName: member.name, staffRole: member.role,
                staffPhotoUrl: member.photoUrl || '', timestamp: now.getTime(), dateString
            });

            if (result.startsWith('success')) {
                const pointType = result.split('_')[1] === 'entry' ? 'ENTRADA' : 'SAÍDA';
                setLastLog({
                    name: member.name, role: member.role, photo: member.photoUrl || '', type: 'staff',
                    status: 'success', message: `PONTO DE ${pointType}`, subMessage: 'Registro realizado com sucesso.'
                });
                setStatusType('success');
                playSound('success');
            } else {
                setLastLog({
                    name: member.name, role: member.role, photo: member.photoUrl || '', type: 'staff',
                    status: 'warning', message: 'AGUARDE 2 MINUTOS', subMessage: 'Tente novamente em breve.'
                });
                setStatusType('warning');
                playSound('error');
            }
        } else {
            const student = students.find(s => s.id === realId);
            if (!student) return;

            const MORNING_LIMIT = 7 * 60 + 20;
            const AFTERNOON_LIMIT = 13 * 60 + 15;
            const mins = now.getHours() * 60 + now.getMinutes();
            const shift = CLASSES_CONFIG.find(c => c.id === student.classId)?.shift;
            const isLate = (shift === 'morning' && mins > MORNING_LIMIT) || (shift === 'afternoon' && mins > AFTERNOON_LIMIT);

            await logAttendance({
                id: '', studentId: student.id, studentName: student.name, className: student.className,
                studentPhotoUrl: student.photoUrl, timestamp: now.getTime(), type: 'entry', dateString
            });

            setLastLog({
                name: student.name, role: student.className, photo: student.photoUrl || '', type: 'student',
                status: isLate ? 'error' : 'success', 
                message: isLate ? 'IR À COORDENAÇÃO' : 'PRESENÇA CONFIRMADA',
                subMessage: isLate ? 'Justificar atraso no guichê' : 'Seja bem-vindo!'
            });
            setStatusType(isLate ? 'error' : 'success');
            playSound(isLate ? 'error' : 'success');
        }

        setTimeout(() => {
            setLastLog(null);
            setStatusType('waiting');
            processingRef.current = false;
            setIsProcessing(false);
        }, 3500);
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(type === 'success' ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3");
        audio.play().catch(() => {});
    };

    return (
        <div className="h-screen w-screen bg-[#09090b] text-white flex flex-col relative overflow-hidden font-sans">
            <div className="h-[15vh] bg-[#121214] border-b border-white/5 flex items-center justify-between px-8 z-20 shadow-lg">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto" alt="Logo" />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Terminal Unificado</h1>
                        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Controle de Acesso Biométrico</p>
                    </div>
                </div>
                <div className="text-right flex items-center gap-8">
                    <div>
                        <p className="text-4xl font-black font-mono leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <button onClick={logout} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"><LogOut size={20} /></button>
                </div>
            </div>

            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#09090b] to-[#09090b]">
                <div className={`relative w-full max-w-5xl aspect-video bg-black rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-500 ${
                    statusType === 'success' ? 'border-green-500 shadow-green-500/20' : 
                    statusType === 'warning' ? 'border-yellow-500 shadow-yellow-500/20' : 
                    statusType === 'error' ? 'border-red-500 shadow-red-500/20' : 'border-white/10'
                }`}>
                    <video ref={videoRef} autoPlay muted onPlay={() => setIsVideoReady(true)} className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]" />

                    {loadingMessage && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                            <Loader2 size={64} className="text-red-600 animate-spin mb-6" />
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">{loadingMessage}</h2>
                        </div>
                    )}
                    
                    {!lastLog && !isProcessing && !loadingMessage && (
                        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-12">
                            <Scan size={64} className="text-white/40 animate-pulse mb-4" />
                            <span className="bg-black/60 backdrop-blur-md px-8 py-3 rounded-full text-white font-black uppercase tracking-[0.2em] text-xs border border-white/10">Aproxime o rosto para identificação</span>
                        </div>
                    )}
                </div>

                {lastLog && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className={`w-full max-w-lg bg-[#18181b] rounded-[3.5rem] p-1 shadow-2xl overflow-hidden border-t-4 ${statusType === 'success' ? 'border-green-500' : statusType === 'warning' ? 'border-yellow-500' : 'border-red-500'}`}>
                            <div className="bg-[#121214] rounded-[3.4rem] p-10 flex flex-col items-center text-center">
                                <div className={`relative h-48 w-48 rounded-full p-2 mb-8 border-4 ${statusType === 'success' ? 'border-green-500 shadow-green-500/20' : statusType === 'warning' ? 'border-yellow-500 shadow-yellow-500/20' : 'border-red-500 shadow-red-500/20 shadow-xl'}`}>
                                    <img src={lastLog.photo || `https://ui-avatars.com/api/?name=${lastLog.name}&background=18181b&color=fff`} alt="Face" className="w-full h-full rounded-full object-cover"/>
                                    <div className={`absolute -bottom-2 -right-2 p-4 rounded-full border-4 border-[#121214] ${lastLog.type === 'staff' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                                        {lastLog.type === 'staff' ? <Briefcase size={24} className="text-white"/> : <User size={24} className="text-white"/>}
                                    </div>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none mb-2">{lastLog.name}</h2>
                                <p className="text-lg text-gray-500 font-bold uppercase tracking-widest mb-10">{lastLog.role}</p>
                                <div className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-[0.1em] flex flex-col items-center justify-center gap-1 ${statusType === 'success' ? 'bg-green-500/10 text-green-500' : statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {lastLog.message}
                                    <span className="text-[10px] font-bold opacity-60 uppercase mt-1">{lastLog.subMessage}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="h-10 bg-black border-t border-white/5 flex items-center justify-center gap-6 text-[9px] text-gray-600 font-black uppercase tracking-[0.4em]">
                <span>CEMAL EQUIPE</span>
                <div className="h-1 w-1 rounded-full bg-gray-800"></div>
                <span className="flex items-center gap-2"><Database size={10}/> {labeledDescriptors.length} Biometrias Ativas</span>
            </div>
        </div>
    );
};
