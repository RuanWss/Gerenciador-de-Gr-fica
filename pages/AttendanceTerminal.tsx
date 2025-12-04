import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut, Loader2, RefreshCw } from 'lucide-react';
import * as faceapi from 'face-api.js';

export const AttendanceTerminal: React.FC = () => {
    const { logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [students, setStudents] = useState<Student[]>([]);
    const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    
    // AI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);
    const [loadingMessage, setLoadingMessage] = useState('Inicializando Sistema...');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processingRef = useRef(false);

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Load Students & AI Models
    useEffect(() => {
        const loadModels = async () => {
            setLoadingMessage('Carregando Modelos de IA...');
            try {
                // Load models from a public CDN
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setLoadingMessage('Modelos Carregados.');
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
                setLoadingMessage('Erro ao carregar IA.');
            }
        };

        const fetchStudents = async () => {
            try {
                const list = await getStudents();
                setStudents(list);
                return list;
            } catch (error) {
                console.error("Erro ao buscar alunos:", error);
                return [];
            }
        };

        const init = async () => {
            await loadModels();
            const studentList = await fetchStudents();
            if (studentList.length > 0) {
                await processStudentFaces(studentList);
            }
        };

        init();
    }, []);

    // 3. Process Student Photos (Create Descriptors)
    const processStudentFaces = async (studentList: Student[]) => {
        setLoadingMessage('Aprendendo Rostos dos Alunos...');
        const labeledDescriptorsTemp: faceapi.LabeledFaceDescriptors[] = [];
        
        const studentsWithPhoto = studentList.filter(s => s.photoUrl);
        let processedCount = 0;

        for (const student of studentsWithPhoto) {
            if (!student.photoUrl) continue;
            try {
                const img = await faceapi.fetchImage(student.photoUrl);
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                
                if (detection) {
                    labeledDescriptorsTemp.push(new faceapi.LabeledFaceDescriptors(student.id, [detection.descriptor]));
                }
                processedCount++;
                setLoadingMessage(`Indexando: ${Math.round((processedCount / studentsWithPhoto.length) * 100)}%`);
            } catch (err) {
                console.warn(`Erro ao processar foto de ${student.name}`, err);
            }
        }
        
        setLabeledDescriptors(labeledDescriptorsTemp);
        setLoadingMessage('');
    };

    // 4. Start Camera
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: {} });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Erro ao acessar câmera:", err);
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

    // 5. Detection Loop
    const handleVideoPlay = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || labeledDescriptors.length === 0) return;

        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        const detect = async () => {
            if (processingRef.current) return; // Prevent overlapping calls
            if (lastLog) return; // Pause detection while showing result

            const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            // Clear canvas
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);

            // Draw detections (Optional - for debug visual)
            // faceapi.draw.drawDetections(canvas, resizedDetections);

            if (resizedDetections.length > 0) {
                const bestMatch = faceMatcher.findBestMatch(resizedDetections[0].descriptor);
                
                if (bestMatch.label !== 'unknown') {
                    // Match found!
                    processingRef.current = true;
                    await processAttendance(bestMatch.label);
                    // Wait a bit before resuming to avoid double triggers
                    setTimeout(() => { processingRef.current = false; }, 3000);
                }
            }
        };

        const intervalId = setInterval(() => {
            detect();
        }, 500); // Check every 500ms

        return () => clearInterval(intervalId);
    };

    const processAttendance = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);

        if (student) {
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            
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

            if (success) {
                setLastLog(log);
                setStatusType('success');
                setStatusMessage('PRESENÇA REGISTRADA');
                playSound('success');

                const minutes = now.getHours() * 60 + now.getMinutes();
                const morningLimit = 7 * 60 + 20; 
                const afternoonLimit = 13 * 60 + 15;
                
                let isLate = false;
                if (now.getHours() < 12) {
                    if (minutes > morningLimit) isLate = true;
                } else {
                    if (minutes > afternoonLimit) isLate = true;
                }

                if (isLate) {
                    setTimeout(() => {
                        setStatusType('warning');
                        setStatusMessage('ALUNO EM ATRASO - COMPARECER À COORDENAÇÃO');
                        playSound('error');
                        setTimeout(() => resetState(), 5000);
                    }, 2000);
                } else {
                    setTimeout(() => resetState(), 2500);
                }

            } else {
                setLastLog(log);
                setStatusType('error');
                setStatusMessage('ACESSO JÁ REGISTRADO HOJE');
                playSound('error');
                setTimeout(() => resetState(), 2500);
            }
        }
    };

    const resetState = () => {
        setLastLog(null);
        setStatusType('waiting');
        setStatusMessage('');
        // Canvas clear is handled in loop
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success' 
            ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3"
        );
        audio.play().catch(e => console.log(e));
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-black via-red-900 to-black flex flex-col items-center justify-start py-6 relative overflow-hidden font-sans text-white">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#500 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <button 
                onClick={logout} 
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors z-50 opacity-50 hover:opacity-100"
            >
                <LogOut size={16} />
            </button>

            <div className="relative z-10 mb-2">
                 <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto drop-shadow-lg" alt="Logo" />
            </div>

            <div className="text-center relative z-10 mb-6">
                <h1 className="text-[9rem] leading-none font-black font-['Montserrat'] tracking-tighter text-gray-100 drop-shadow-2xl">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>
                <p className="text-lg font-bold uppercase tracking-[0.15em] text-red-100/80 mt-2">
                     {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="relative z-10 w-full max-w-5xl aspect-video bg-[#3f2008] rounded-3xl p-3 shadow-2xl border border-[#5c2e10]">
                
                <div className="absolute top-6 right-6 z-20 bg-[#2a1205]/90 text-[#8a4a20] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#5c2e10] flex items-center gap-2 shadow-lg">
                        <span className={`w-2 h-2 rounded-full ${loadingMessage ? 'bg-yellow-500' : 'bg-green-600'} animate-pulse`}></span>
                        {loadingMessage ? "INICIALIZANDO IA..." : "RECONHECIMENTO ATIVO"}
                </div>

                <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-inner border border-black/50">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        onPlay={handleVideoPlay}
                        className="w-full h-full object-cover" 
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                    <div className="absolute inset-0 pointer-events-none opacity-30">
                         <div className="absolute top-[15%] left-[20%] w-16 h-16 border-t-4 border-l-4 border-gray-400 rounded-tl-3xl"></div>
                         <div className="absolute top-[15%] right-[20%] w-16 h-16 border-t-4 border-r-4 border-gray-400 rounded-tr-3xl"></div>
                         <div className="absolute bottom-[15%] left-[20%] w-16 h-16 border-b-4 border-l-4 border-gray-400 rounded-bl-3xl"></div>
                         <div className="absolute bottom-[15%] right-[20%] w-16 h-16 border-b-4 border-r-4 border-gray-400 rounded-br-3xl"></div>
                    </div>
                    
                    {/* LOADING STATE */}
                    {loadingMessage && !lastLog && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                             <div className="text-center">
                                 <Loader2 size={48} className="text-brand-500 animate-spin mx-auto mb-4" />
                                 <p className="text-white font-bold tracking-widest">{loadingMessage}</p>
                             </div>
                         </div>
                    )}

                    {/* IDLE STATE */}
                    {statusType === 'waiting' && !lastLog && !loadingMessage && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="bg-[#7f1d1d]/80 backdrop-blur-md border border-red-500/30 px-10 py-8 rounded-2xl text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md animate-pulse">
                                 <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Sistema Aguardando</h3>
                                 <p className="text-red-100 text-sm font-medium">Aproxime o rosto para identificação.</p>
                             </div>
                         </div>
                    )}

                    {/* RESULT OVERLAY */}
                    {lastLog && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                            <div className="text-center">
                                <div className={`mx-auto h-48 w-48 rounded-full border-8 p-1 mb-6 shadow-2xl ${
                                    statusType === 'success' ? 'border-green-500 shadow-green-900/50' : 
                                    statusType === 'warning' ? 'border-yellow-500 shadow-yellow-900/50' :
                                    'border-red-500 shadow-red-900/50'
                                }`}>
                                    <img 
                                        src={lastLog.studentPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.studentName} 
                                        alt="Aluno" 
                                        className="w-full h-full rounded-full object-cover bg-gray-800"
                                    />
                                </div>

                                <h2 className="text-5xl font-black uppercase mb-2 text-white tracking-wide">{lastLog.studentName}</h2>
                                <p className="text-2xl text-gray-400 font-bold mb-8">{lastLog.className}</p>

                                <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white font-bold text-xl uppercase tracking-widest shadow-lg ${
                                    statusType === 'success' ? 'bg-green-600' : 
                                    statusType === 'warning' ? 'bg-yellow-600 text-yellow-50' :
                                    'bg-red-600'
                                }`}>
                                    {statusType === 'success' && <CheckCircle size={32}/>}
                                    {statusType === 'error' && <AlertTriangle size={32}/>}
                                    {statusType === 'warning' && <Clock size={32}/>}
                                    {statusMessage}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};