import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, Clock, LogOut } from 'lucide-react';

export const AttendanceTerminal: React.FC = () => {
    const { logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [students, setStudents] = useState<Student[]>([]);
    const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    
    // Simulação de Input (Scanner/Biometria envia o ID como texto)
    const videoRef = useRef<HTMLVideoElement>(null);
    const studentsRef = useRef<Student[]>([]); // Ref para acesso dentro do listener de teclado
    const inputBufferRef = useRef(''); // Buffer para captura de teclado

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Camera Setup (Run Once & Cleanup)
    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Erro ao acessar câmera:", err);
                }
            }
        };

        startCamera();

        return () => {
            // Cleanup: Parar tracks da câmera ao desmontar
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 3. Load Students
    useEffect(() => {
        const init = async () => {
            const list = await getStudents();
            setStudents(list);
            studentsRef.current = list; // Update ref
        };
        init();
    }, []);

    // 4. Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (inputBufferRef.current) {
                    processAttendance(inputBufferRef.current);
                    inputBufferRef.current = '';
                }
            } else if (e.key.length === 1) {
                inputBufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const processAttendance = async (studentIdOrCode: string) => {
        if (!studentIdOrCode) return;
        
        // Usar ref para garantir dados atuais
        const student = studentsRef.current.find(s => s.id === studentIdOrCode);

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

            // Tenta registrar
            const success = await logAttendance(log);

            if (success) {
                // SUCESSO INICIAL (VERDE)
                setLastLog(log);
                setStatusType('success');
                setStatusMessage('PRESENÇA REGISTRADA');
                playSound('success');

                // Lógica de Atraso
                // Manhã: > 07:20 | Tarde: > 13:15
                const minutes = now.getHours() * 60 + now.getMinutes();
                const morningLimit = 7 * 60 + 20; // 07:20 = 440 min
                const afternoonLimit = 13 * 60 + 15; // 13:15 = 795 min
                
                let isLate = false;
                
                // Heurística de turno (antes das 12h = manhã)
                if (now.getHours() < 12) {
                    if (minutes > morningLimit) isLate = true;
                } else {
                    if (minutes > afternoonLimit) isLate = true;
                }

                if (isLate) {
                    // Se atrasado: Mostra VERDE por 2s, depois AMARELO
                    setTimeout(() => {
                        setStatusType('warning');
                        setStatusMessage('ALUNO EM ATRASO - COMPARECER À COORDENAÇÃO');
                        playSound('error'); // Som de alerta
                        
                        // Fica mais tempo (5s) para leitura do aviso
                        setTimeout(() => {
                            resetState();
                        }, 5000);
                    }, 2000);
                } else {
                    // Sem atraso: Reset normal após 2.5s
                    setTimeout(() => {
                        resetState();
                    }, 2500);
                }

            } else {
                // ERRO: DUPLICIDADE
                setLastLog(log);
                setStatusType('error');
                setStatusMessage('ACESSO JÁ REGISTRADO HOJE');
                playSound('error');
                
                setTimeout(() => {
                    resetState();
                }, 2500);
            }

        } else {
            // ERRO: NÃO ENCONTRADO
            setStatusType('error');
            setStatusMessage('ALUNO NÃO ENCONTRADO');
            setTimeout(() => {
                resetState();
            }, 2000);
        }
    };

    const resetState = () => {
        setLastLog(null);
        setStatusType('waiting');
        setStatusMessage('');
    };

    const playSound = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success' 
            ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
            : "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3"
        );
        audio.play().catch(e => console.log(e));
    };

    const simulateBiometricMatch = () => {
        if (students.length > 0) {
            const randomStudent = students[Math.floor(Math.random() * students.length)];
            processAttendance(randomStudent.id);
        } else {
            alert("Nenhum aluno cadastrado para testar.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-black via-red-950 to-black flex flex-col items-center justify-start py-6 relative overflow-hidden font-sans text-white">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#500 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {/* Logout Button (Small & Discrete) */}
            <button 
                onClick={logout} 
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors z-50 opacity-50 hover:opacity-100"
                title="Sair do Terminal"
            >
                <LogOut size={20} />
            </button>

            {/* Logo */}
            <div className="relative z-10 mb-2">
                 <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto drop-shadow-lg" alt="Logo" />
            </div>

            {/* Clock & Date */}
            <div className="text-center relative z-10 mb-6">
                <h1 className="text-[9rem] leading-none font-black font-['Montserrat'] tracking-tighter text-gray-100 drop-shadow-2xl">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>
                <p className="text-xl font-bold uppercase tracking-[0.15em] text-red-100/80 mt-2">
                     {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Camera Container Frame */}
            <div className="relative z-10 w-full max-w-5xl aspect-video bg-[#3f2008] rounded-3xl p-3 shadow-2xl border border-[#5c2e10]">
                
                {/* Status Indicator */}
                <div className="absolute top-6 right-6 z-20 bg-[#2a1205]/90 text-[#8a4a20] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#5c2e10] flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                        Auto Scan Ativo
                </div>

                {/* Inner Video Container */}
                <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-inner border border-black/50">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1] opacity-80" 
                    />

                    {/* Scan Visuals */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                         <div className="absolute top-[15%] left-[20%] w-16 h-16 border-t-4 border-l-4 border-gray-400 rounded-tl-3xl"></div>
                         <div className="absolute top-[15%] right-[20%] w-16 h-16 border-t-4 border-r-4 border-gray-400 rounded-tr-3xl"></div>
                         <div className="absolute bottom-[15%] left-[20%] w-16 h-16 border-b-4 border-l-4 border-gray-400 rounded-bl-3xl"></div>
                         <div className="absolute bottom-[15%] right-[20%] w-16 h-16 border-b-4 border-r-4 border-gray-400 rounded-br-3xl"></div>
                    </div>
                    
                    {/* IDLE STATE */}
                    {statusType === 'waiting' && !lastLog && (
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="bg-[#7f1d1d]/80 backdrop-blur-md border border-red-500/30 px-10 py-8 rounded-2xl text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md animate-pulse">
                                 <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Sistema Aguardando Dados</h3>
                                 <p className="text-red-100 text-sm font-medium">Nenhum aluno cadastrado para reconhecimento.</p>
                             </div>
                         </div>
                    )}

                    {/* RESULT OVERLAY */}
                    {lastLog && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                            <div className="text-center">
                                {/* Photo Circle */}
                                <div className={`mx-auto h-48 w-48 rounded-full border-8 p-1 mb-6 shadow-2xl ${
                                    statusType === 'success' ? 'border-green-500 shadow-green-900/50' : 
                                    statusType === 'warning' ? 'border-yellow-500 shadow-yellow-900/50' :
                                    'border-red-500 shadow-red-900/50'
                                }`}>
                                    <img 
                                        src={lastLog.studentPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.studentName} 
                                        alt="Aluno" 
                                        className="w-full h-full rounded-full object-cover"
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

            {/* Hidden Button for Testing */}
            <button onClick={simulateBiometricMatch} className="absolute bottom-4 right-4 text-xs text-gray-800 hover:text-white transition-colors opacity-10 hover:opacity-100">
                [Simular]
            </button>
        </div>
    );
};