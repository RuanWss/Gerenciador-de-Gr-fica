import React, { useState, useEffect, useRef } from 'react';
import { getStudents, logAttendance } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { Clock, User, CheckCircle, AlertTriangle, ScanFace } from 'lucide-react';

export const AttendanceTerminal: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [students, setStudents] = useState<Student[]>([]);
    const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'waiting'>('waiting');
    
    // Simulação de Input (Scanner/Biometria envia o ID como texto)
    const [inputBuffer, setInputBuffer] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);

    // 1. Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Load Students & Setup Camera
    useEffect(() => {
        const init = async () => {
            const list = await getStudents();
            setStudents(list);
            startCamera();
        };
        init();

        // Keyboard Listener (Simula entrada da biometria/scanner)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                processAttendance(inputBuffer);
                setInputBuffer('');
            } else if (e.key.length === 1) {
                setInputBuffer(prev => prev + e.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputBuffer, students]); // Dependencias para garantir estado atualizado

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

    const processAttendance = async (studentIdOrCode: string) => {
        if (!studentIdOrCode) return;
        
        // Simulação: Encontrar aluno (em produção, o ID viria da API de biometria)
        // Aqui buscamos pelo ID ou simulamos um match
        const student = students.find(s => s.id === studentIdOrCode);

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
            } else {
                // Já registrado
                setLastLog(log); // Mostra quem é, mas com erro
                setStatusType('error');
                setStatusMessage('ACESSO JÁ REGISTRADO HOJE');
                playSound('error');
            }

            // Reset após 2 segundos
            setTimeout(() => {
                setLastLog(null);
                setStatusType('waiting');
                setStatusMessage('');
            }, 2500);

        } else {
            // Aluno não encontrado
            setStatusType('error');
            setStatusMessage('ALUNO NÃO ENCONTRADO');
            setTimeout(() => setStatusType('waiting'), 2000);
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

    // Função de Teste para o Admin
    const simulateBiometricMatch = () => {
        if (students.length > 0) {
            const randomStudent = students[Math.floor(Math.random() * students.length)];
            processAttendance(randomStudent.id);
        } else {
            alert("Nenhum aluno cadastrado para testar.");
        }
    };

    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-between overflow-hidden relative font-sans text-white">
            
            {/* Header */}
            <div className="w-full p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto mb-2" alt="Logo" />
                    <h1 className="text-xl font-bold tracking-widest text-gray-400">TERMINAL DE FREQUÊNCIA</h1>
                </div>
                <div className="text-right">
                    <h2 className="text-6xl font-black text-white font-mono leading-none">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h2>
                    <p className="text-xl text-gray-400 font-bold uppercase mt-1">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            {/* Main Content (Camera & Feedback) */}
            <div className="flex-1 w-full flex items-center justify-center relative">
                
                {/* Camera Feed Container */}
                <div className={`relative w-[600px] h-[600px] rounded-full overflow-hidden border-8 transition-colors duration-300 shadow-[0_0_100px_rgba(0,0,0,0.5)] ${statusType === 'success' ? 'border-green-500 shadow-green-900' : statusType === 'error' ? 'border-red-500 shadow-red-900' : 'border-gray-800'}`}>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]" 
                    />
                    
                    {/* Overlay de Scan */}
                    {statusType === 'waiting' && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[80%] h-[80%] border-4 border-white/20 rounded-full animate-pulse"></div>
                            <ScanFace size={64} className="text-white/50 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* POPUP DE RECONHECIMENTO */}
                {lastLog && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                        <div className={`bg-white text-gray-900 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center border-b-8 ${statusType === 'success' ? 'border-green-600' : 'border-red-600'}`}>
                            
                            {/* Foto */}
                            <div className={`mx-auto h-40 w-40 rounded-full border-4 p-1 mb-6 ${statusType === 'success' ? 'border-green-500' : 'border-red-500'}`}>
                                <img 
                                    src={lastLog.studentPhotoUrl || "https://ui-avatars.com/api/?name=" + lastLog.studentName} 
                                    alt="Aluno" 
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>

                            <h2 className="text-3xl font-black uppercase mb-1">{lastLog.studentName}</h2>
                            <p className="text-xl text-gray-500 font-bold mb-6">{lastLog.className}</p>

                            <div className={`p-4 rounded-xl text-white font-bold text-xl uppercase flex items-center justify-center gap-3 ${statusType === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                                {statusType === 'success' ? <CheckCircle size={28}/> : <AlertTriangle size={28}/>}
                                {statusMessage}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="w-full p-4 text-center text-gray-600 text-sm pb-8">
                <p>Posicione o rosto no centro da câmera. O reconhecimento é automático.</p>
                <button onClick={simulateBiometricMatch} className="mt-2 text-xs text-gray-800 hover:text-white transition-colors opacity-20 hover:opacity-100">
                    [Debug: Simular Reconhecimento]
                </button>
            </div>

        </div>
    );
};