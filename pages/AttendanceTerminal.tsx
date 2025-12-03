import React, { useState, useEffect, useRef } from 'react';
import { getStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CheckCircle, AlertTriangle, ScanFace, Clock } from 'lucide-react';

export const AttendanceTerminal: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [students, setStudents] = useState<Student[]>([]);
    const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | 'waiting'>('waiting');
    
    // Simulação de Input (Scanner/Biometria envia o ID como texto)
    const [inputBuffer, setInputBuffer] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const studentsRef = useRef<Student[]>([]); // Ref para acesso dentro do listener de teclado sem recriar o listener

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Camera Setup (Run Once)
    useEffect(() => {
        const startCamera = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Erro ao acessar câmera:", err);
                }
            }
        };
        startCamera();
    }, []); // Empty dependency array prevents flicker

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
                // Process input buffer
                if (inputBufferRef.current) {
                    processAttendance(inputBufferRef.current);
                    inputBufferRef.current = ''; // Clear ref buffer
                }
            } else if (e.key.length === 1) {
                inputBufferRef.current += e.key;
            }
        };

        // Usamos um ref para o buffer para evitar que o useEffect dependa dele e recrie o listener
        const inputBufferRef = { current: '' };
        
        // Wrapper para usar o buffer do escopo do efeito
        const listener = (e: KeyboardEvent) => {
             if (e.key === 'Enter') {
                processAttendance(inputBufferRef.current);
                inputBufferRef.current = '';
            } else if (e.key.length === 1) {
                inputBufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []); // Run once, relies on processAttendance accessing latest data via logic or refs if needed, 
            // but here processAttendance depends on 'students' state.
            // To be safe with stale closures in event listeners without dependencies, 
            // we should use the studentsRef inside processAttendance if we moved it out, 
            // or put students in dependency array. BUT putting students in dependency array restarts listener.
            // Best approach: Use studentsRef inside the processing logic called by listener.

    const processAttendance = async (studentIdOrCode: string) => {
        if (!studentIdOrCode) return;
        
        // Use ref to ensure we have latest students without re-binding listener
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

            const success = await logAttendance(log);

            if (success) {
                setLastLog(log);
                setStatusType('success');
                setStatusMessage('PRESENÇA REGISTRADA');
                playSound('success');

                // Lógica de Atraso
                // Manhã: > 07:20
                // Tarde: > 13:15
                const minutes = now.getHours() * 60 + now.getMinutes();
                const morningLimit = 7 * 60 + 20; // 440
                const afternoonLimit = 13 * 60 + 15; // 795
                
                let isLate = false;
                
                // Heurística simples de turno: Se for antes de 12:00 é manhã
                if (now.getHours() < 12) {
                    if (minutes > morningLimit) isLate = true;
                } else {
                    if (minutes > afternoonLimit) isLate = true;
                }

                if (isLate) {
                    // Espera 2 segundos mostrando o verde, depois mostra o alerta de atraso
                    setTimeout(() => {
                        setStatusType('warning');
                        setStatusMessage('ALUNO EM ATRASO - COMPARECER À COORDENAÇÃO');
                        playSound('error'); // Som de alerta para chamar atenção
                        
                        // Fica mais tempo na tela para o aluno ler
                        setTimeout(() => {
                            setLastLog(null);
                            setStatusType('waiting');
                            setStatusMessage('');
                        }, 5000);
                    }, 2000);
                } else {
                    // Fluxo normal
                    setTimeout(() => {
                        setLastLog(null);
                        setStatusType('waiting');
                        setStatusMessage('');
                    }, 2500);
                }

            } else {
                setLastLog(log);
                setStatusType('error');
                setStatusMessage('ACESSO JÁ REGISTRADO HOJE');
                playSound('error');
                
                setTimeout(() => {
                    setLastLog(null);
                    setStatusType('waiting');
                    setStatusMessage('');
                }, 2500);
            }

        } else {
            setStatusType('error');
            setStatusMessage('ALUNO NÃO ENCONTRADO');
            setTimeout(() => {
                setStatusType('waiting');
                setStatusMessage('');
            }, 2000);
        }
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
            // Precisamos chamar a lógica manualmente pois o listener é para teclado
            // Como processAttendance usa o studentsRef, vai funcionar
            processAttendance(randomStudent.id);
        } else {
            alert("Nenhum aluno cadastrado para testar.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0f0a0a] flex flex-col items-center justify-start py-10 relative overflow-hidden font-sans text-white">
            
            {/* Background Pattern (Dots) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'radial-gradient(#500 1px, transparent 1px)', 
                     backgroundSize: '40px 40px' 
                 }}>
            </div>

            {/* Logo */}
            <div className="relative z-10 mb-4">
                 <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto drop-shadow-lg" alt="Logo" />
            </div>

            {/* Clock & Date */}
            <div className="text-center relative z-10 mb-8">
                <h1 className="text-[10rem] leading-none font-black font-['Montserrat'] tracking-tighter text-gray-100 drop-shadow-2xl">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>
                <p className="text-2xl font-bold uppercase tracking-[0.15em] text-red-100/80 mt-2">
                     {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Camera Container Frame */}
            <div className="relative z-10 w-full max-w-5xl aspect-video bg-[#3f2008] rounded-3xl p-3 shadow-2xl border border-[#5c2e10]">
                
                {/* Status Indicator (Top Right) */}
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

                    {/* Scan Reticle (Visual Decoration) */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                         <div className="absolute top-[15%] left-[20%] w-16 h-16 border-t-4 border-l-4 border-gray-400 rounded-tl-3xl"></div>
                         <div className="absolute top-[15%] right-[20%] w-16 h-16 border-t-4 border-r-4 border-gray-400 rounded-tr-3xl"></div>
                         <div className="absolute bottom-[15%] left-[20%] w-16 h-16 border-b-4 border-l-4 border-gray-400 rounded-bl-3xl"></div>
                         <div className="absolute bottom-[15%] right-[20%] w-16 h-16 border-b-4 border-r-4 border-gray-400 rounded-br-3xl"></div>
                    </div>
                    
                    {/* IDLE STATE: "Sistema Aguardando Dados" Box */}
                    {statusType === 'waiting' && !lastLog && (
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="bg-[#7f1d1d]/80 backdrop-blur-md border border-red-500/30 px-10 py-8 rounded-2xl text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md animate-pulse">
                                 <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Sistema Aguardando Dados</h3>
                                 <p className="text-red-100 text-sm font-medium">Nenhum aluno cadastrado para reconhecimento.</p>
                             </div>
                         </div>
                    )}

                    {/* RESULT OVERLAY (Success/Error/Warning) */}
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