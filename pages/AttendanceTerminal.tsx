
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, logAttendance, listenToStaffMembers, logStaffAttendance } from '../services/firebaseService';
import { Student, AttendanceLog, StaffMember, StaffAttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, Scan, Database, RefreshCw, Maximize, Minimize, User, Briefcase, ChevronRight } from 'lucide-react';
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
    
    // AI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledDescriptors, setLabeledDescriptors] = useState<any[]>([]);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando Sistema Unificado...');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    
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

            if (faceApi.nets.tinyFaceDetector.isLoaded && faceApi.nets.faceLandmark68TinyNet.isLoaded) {
                setModelsLoaded(true);
                return;
            }

            setLoadingMessage('Carregando Motores de IA...');
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

    // Combine Students and Staff into labeled descriptors
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

        const toProcess = allSubjects.filter(s => {
            const cachedUrl = processedCache.current.get(s.id);
            return cachedUrl !== s.photo && s.photo;
        });

        if (toProcess.length === 0 && labeledDescriptors.length > 0) {
            setLoadingMessage('');
            return;
        }

        setLoadingMessage(`Sincronizando Faces (${toProcess.length})...`);
        const newDescriptors: any[] = [];

        // Process in small batches
        const BATCH_SIZE = 5;
        for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
            const batch = toProcess.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (subj) => {
                try {
                    const img = await faceApi.fetchImage(subj.photo);
                    const detection = await faceApi.detectSingleFace(img, new faceApi.TinyFaceDetectorOptions())
                        .withFaceLandmarks(true)
                        .withFaceDescriptor();
                    
                    if (detection) {
                        newDescriptors.push(new faceApi.LabeledFaceDescriptors(subj.id, [detection.descriptor]));
                        processedCache.current.set(subj.id, subj.photo);
                    }
                } catch (err) { console.warn(`Erro face: ${subj.name}`); }
            }));
            setLoadingMessage(`Sincronizando... ${Math.min(i + BATCH_SIZE, toProcess.length)}/${toProcess.length}`);
        }
        
        setLabeledDescriptors(prev => {
            const currentIds = new Set(allSubjects.map(s => s.id));
            const kept = prev.filter(d => currentIds.has(d.label));
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
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.setAttribute("playsinline", "true");
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

        let faceMatcher: any;
        try {
            faceMatcher = new faceApi.FaceMatcher(labeledDescriptors, 0.50);
        } catch (e) { return; }

        const detect = async () => {
            if (processingRef.current || lastLog || video.paused || video.ended) return;

            try {
                const options = new faceApi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
                const detections = await faceApi.detectAllFaces(video, options)
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
                    const match = resizedDetections[0];
                    const box = match.detection.box;
                    let label = 'unknown';

                    if (match.descriptor) {
                        const bestMatch = faceMatcher.findBestMatch(match.descriptor);
                        label = bestMatch.label;
                    }

                    const isKnown = label !== 'unknown';
                    const drawBox = new faceApi.draw.DrawBox(box, { 
                        label: isKnown ? 'Processando...' : 'Identificando...', 
                        boxColor: isKnown ? '#eab308' : '#3b82f6',
                        lineWidth: 2
                    });
                    drawBox.draw(canvas);

                    if (isKnown) {
                        processingRef.current = true;
                        setIsProcessing(true);
                        await handleCombinedAttendance(label);
                    }
                }
            } catch (err) {}
        };

        const intervalId = setInterval(detect, 250);
        return () => clearInterval(intervalId);
    }, [modelsLoaded, isVideoReady, labeledDescriptors]);

    const handleCombinedAttendance = async (compositeId: string) => {
        const isStaff = compositeId.startsWith('stf_');
        const realId = compositeId.split('_')[1];
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];

        if (isStaff) {
            const member = staff.find(s => s.id === realId);
            if (!member) return;

            const log: StaffAttendanceLog = {
                id: '',
                staffId: member.id,
                staffName: member.name,
                staffRole: member.role,
                staffPhotoUrl: member.photoUrl || '',
                timestamp: now.getTime(),
                dateString: dateString
            };

            const result = await logStaffAttendance(log);

            if (result.startsWith('success')) {
                const pointType = result.split('_')[1] === 'entry' ? 'ENTRADA' : 'SAÍDA';
                setLastLog({
                    name: member.name,
                    role: member.role,
                    photo: member.photoUrl || '',
                    type: 'staff',
                    status: 'success',
                    message: `PONTO DE ${pointType}`,
                    subMessage: pointType === 'ENTRADA' ? 'Bom trabalho!' : 'Bom descanso!'
                });
                setStatusType('success');
                playSound('success');
            } else if (result === 'too_soon') {
                setLastLog({
                    name: member.name,
                    role: member.role,
                    photo: member.photoUrl || '',
                    type: 'staff',
                    status: 'warning',
                    message: 'AGUARDE 2 MINUTOS',
                    subMessage: 'Registro muito recente detectado.'
                });
                setStatusType('warning');
                playSound('error');
            }
        } else {
            // Student Logic
            const student = students.find(s => s.id === realId);
            if (!student) return;

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const classConfig = CLASSES_CONFIG.find(c => c.id === student.classId);
            
            // Student Shift Logic (simplified)
            const MORNING_LATE_LIMIT = 7 * 60 + 20;
            const AFTERNOON_LATE_LIMIT = 13 * 60 + 15;
            let isLate = false;
            
            if (classConfig) {
                if (classConfig.shift === 'morning' && currentMinutes > MORNING_LATE_LIMIT) isLate = true;
                if (classConfig.shift === 'afternoon' && currentMinutes > AFTERNOON_LATE_LIMIT) isLate = true;
            }

            const log: AttendanceLog = {
                id: '', studentId: student.id, studentName: student.name, className: student.className,
                studentPhotoUrl: student.photoUrl, timestamp: now.getTime(), type: 'entry', dateString
            };

            await logAttendance(log);
            
            setLastLog({
                name: student.name,
                role: student.className,
                photo: student.photoUrl || '',
                type: 'student',
                status: isLate ? 'error' : 'success',
                message: isLate ? 'IR À COORDENAÇÃO' : 'PRESENÇA CONFIRMADA',
                subMessage: isLate ? 'Justificar atraso no guichê' : ''
            });
            setStatusType(isLate ? 'error' : 'success');
            playSound(isLate ? 'error' : 'success');
        }

        setTimeout(() => {
            setLastLog(null);
            setStatusType('waiting');
            processingRef.current = false;
            setIsProcessing(false);
        }, isStaff ? 4000 : 3500);
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success' 
            ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3"
        );
        audio.play().catch(() => {});
    };

    const getStatusStyle = () => {
        switch (statusType) {
            case 'success': return 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]';
            case 'warning': return 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]';
            case 'error': return 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]';
            default: return 'border-white/10';
        }
    };

    return (
        <div className="h-screen w-screen bg-[#09090b] text-white flex flex-col relative overflow-hidden font-sans">
            {/* UNIFIED HEADER */}
            <div className="h-[15vh] bg-[#121214] border-b border-white/5 flex items-center justify-between px-8 z-20 shadow-lg">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto" alt="Logo" />
                    <div className="h-10 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Terminal Unificado</h1>
                        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Alunos & Colaboradores</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-4xl font-black font-mono leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest"><Database size={12}/> {labeledDescriptors.length} Biometrias</span>
                            <span className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest"><RefreshCw size={12} className="animate-spin-slow"/> Monitorando</span>
                        </div>
                        <button onClick={logout} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"><LogOut size={20} /></button>
                    </div>
                </div>
            </div>

            {/* MAIN CAMERA VIEW */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-[#09090b] to-[#09090b]">
                <div className={`relative w-full max-w-5xl aspect-video bg-black rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-500 ${getStatusStyle()} ${isProcessing ? 'scale-[0.99] opacity-90' : ''}`}>
                    <video ref={videoRef} autoPlay muted onPlay={() => setIsVideoReady(true)} className="w-full h-full object-cover transform scale-x-[-1]" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]" />

                    {loadingMessage && !lastLog && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                            <Loader2 size={64} className="text-red-600 animate-spin mb-6" />
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">{loadingMessage}</h2>
                        </div>
                    )}
                    
                    {!lastLog && !isProcessing && labeledDescriptors.length > 0 && (
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/10 rounded-full animate-ping opacity-20"></div>
                            <div className="absolute bottom-10 left-0 right-0 text-center">
                                <span className="bg-black/60 backdrop-blur-md px-8 py-3 rounded-full text-white font-black uppercase tracking-[0.2em] text-xs border border-white/10 animate-pulse">Aproxime o rosto para identificar</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* RESULT OVERLAY */}
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
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">{lastLog.type === 'staff' ? 'Colaborador Identificado' : 'Aluno Identificado'}</p>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none mb-3">{lastLog.name}</h2>
                                <p className="text-lg text-gray-500 font-bold uppercase tracking-widest mb-10">{lastLog.role}</p>
                                
                                <div className={`w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-[0.1em] flex flex-col items-center justify-center gap-1 shadow-inner ${statusType === 'success' ? 'bg-green-500/10 text-green-500' : statusType === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {lastLog.message}
                                    {lastLog.subMessage && <span className="text-xs normal-case font-bold opacity-60 mt-1">{lastLog.subMessage}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="h-10 bg-black border-t border-white/5 flex items-center justify-center text-[9px] text-gray-600 font-black uppercase tracking-[0.4em]">
                CEMAL EQUIPE • Tecnologia Integrada de Reconhecimento Facial
            </div>

            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};
