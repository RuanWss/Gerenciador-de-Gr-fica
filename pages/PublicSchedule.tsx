
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Maximize2, Minimize, Volume2, VolumeX, ShieldCheck, Monitor, Bell } from 'lucide-react';

const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const AFTERNOON_SLOTS: TimeSlot[] = [
    { id: 'a1', start: '13:00', end: '13:50', type: 'class', label: '1º Horário', shift: 'afternoon' },
    { id: 'a2', start: '13:50', end: '14:40', type: 'class', label: '2º Horário', shift: 'afternoon' },
    { id: 'a3', start: '14:40', end: '15:30', type: 'class', label: '3º Horário', shift: 'afternoon' },
    { id: 'ab1', start: '15:30', end: '16:00', type: 'break', label: 'INTERVALO', shift: 'afternoon' },
    { id: 'a4', start: '16:00', end: '16:50', type: 'class', label: '4º Horário', shift: 'afternoon' },
    { id: 'a5', start: '16:50', end: '17:40', type: 'class', label: '5º Horário', shift: 'afternoon' },
    { id: 'a6', start: '17:40', end: '18:30', type: 'class', label: '6º Horário', shift: 'afternoon' },
    { id: 'a7', start: '18:30', end: '19:20', type: 'class', label: '7º Horário', shift: 'afternoon' },
    { id: 'a8', start: '19:20', end: '20:00', type: 'class', label: '8º Horário', shift: 'afternoon' },
];

const MORNING_CLASSES = [
    { id: '6efaf', name: '6º EFAF' },
    { id: '7efaf', name: '7º EFAF' },
    { id: '8efaf', name: '8º EFAF' },
    { id: '9efaf', name: '9º EFAF' },
];

const AFTERNOON_CLASSES = [
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
];

const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const DEFAULT_PIN = "2016";

export const PublicSchedule: React.FC = () => {
    // --- AUTH STATE ---
    const [isAuthorized, setIsAuthorized] = useState(() => {
        return sessionStorage.getItem('monitor_auth') === 'true';
    });
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);

    // --- MAIN STATE ---
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSlotId = useRef<string>('');

    // --- INACTIVITY LOGIC (AUTO-HIDE BUTTONS) ---
    useEffect(() => {
        const resetTimer = () => {
            setShowControls(true);
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, 5000);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        };
    }, []);

    // --- FIREBASE REALTIME LISTENERS ---
    useEffect(() => {
        if (!isAuthorized) return;

        const unsubscribeSchedule = listenToSchedule(setSchedule);
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isAuthorized]);

    // --- CLOCK AND SLOT TRACKER ---
    useEffect(() => {
        if (!isAuthorized) return;

        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentStatus(now);
        }, 1000);
        return () => clearInterval(timer);
    }, [isAuthorized]);

    const checkCurrentStatus = (now: Date) => {
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const totalMinutes = currentHour * 60 + currentMinutes;

        let shift: 'morning' | 'afternoon' | 'off' = 'off';
        let slots: TimeSlot[] = [];

        // Manhã: 07:00 às 12:30
        if (totalMinutes >= 420 && totalMinutes <= 750) {
            shift = 'morning';
            slots = MORNING_SLOTS;
        } 
        // Tarde: 13:00 às 21:00
        else if (totalMinutes >= 780 && totalMinutes <= 1260) {
            shift = 'afternoon';
            slots = AFTERNOON_SLOTS;
        }

        setCurrentShift(shift);

        const slot = slots.find(s => {
            const [hS, mS] = s.start.split(':').map(Number);
            const [hE, mE] = s.end.split(':').map(Number);
            const startTotal = hS * 60 + mS;
            const endTotal = hE * 60 + mE;
            return totalMinutes >= startTotal && totalMinutes < endTotal;
        });

        if (slot) {
            // ALERTA SONORO DE TROCA DE HORÁRIO
            if (lastSlotId.current !== slot.id) {
                if (lastSlotId.current !== '' && audioEnabled) {
                    const audio = new Audio(ALERT_SOUND_URL);
                    audio.play().catch(e => console.log("Áudio bloqueado", e));
                }
                lastSlotId.current = slot.id;
            }
            setCurrentSlot(slot);
        } else {
            setCurrentSlot(null);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePinPress = (num: string) => {
        if (pin.length >= 4) return;
        setPinError(false);
        const newPin = pin + num;
        setPin(newPin);
        
        if (newPin.length === 4) {
            if (newPin === DEFAULT_PIN) {
                setIsAuthorized(true);
                sessionStorage.setItem('monitor_auth', 'true');
            } else {
                setPinError(true);
                setTimeout(() => setPin(''), 500);
            }
        }
    };

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center p-6 z-[1000]">
                <div className="max-w-xs w-full text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 mx-auto" alt="CEMAL" />
                    <div>
                        <h2 className="text-white font-black text-xl uppercase tracking-widest mb-2">Painel TV</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-tight">Digite o PIN para ativar o monitor</p>
                    </div>
                    
                    <div className="flex justify-center gap-4 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'border-gray-800'}`}></div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                            <button key={n} onClick={() => handlePinPress(n.toString())} className="h-16 bg-white/5 hover:bg-white/10 text-white text-2xl font-black rounded-2xl border border-white/5 transition-all active:scale-95">{n}</button>
                        ))}
                        <button onClick={() => setPin('')} className="h-16 bg-red-600/10 text-red-500 font-black rounded-2xl border border-red-600/20 col-span-2 uppercase text-xs tracking-widest">Limpar</button>
                    </div>
                    {pinError && <p className="text-red-500 font-black uppercase text-[10px] tracking-widest animate-bounce">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    const currentClasses = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
    const dayName = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none" onMouseMove={() => setShowControls(true)}>
            {/* BG GRADIENT */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#220000_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>

            {/* HEADER - O RELÓGIO PERMANECE */}
            <header className="relative z-10 flex items-center justify-between px-12 py-10 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
                <div className="flex items-center gap-10">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 w-auto" alt="Logo" />
                    <div className="h-14 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Matriz de Horários</h1>
                        <p className="text-red-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Atualização em Tempo Real</p>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-1">{dayName}</p>
                        <p className="text-2xl font-black text-white uppercase tracking-tight">{formattedDate}</p>
                    </div>
                    <div className="h-16 w-px bg-white/10"></div>
                    {/* RELÓGIO DIGITAL PRINCIPAL - MANTIDO E DESTACADO */}
                    <div className="text-center bg-white/5 px-10 py-4 rounded-[2rem] border border-white/10 shadow-2xl min-w-[240px]">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">Hora Certa</p>
                        <p className="text-6xl font-clock font-black tracking-tighter leading-none text-white">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 relative z-10 p-12 flex flex-col gap-12">
                
                {/* INFO STRIP */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] border ${currentShift === 'off' ? 'bg-gray-900 text-gray-500 border-gray-800' : 'bg-green-600/10 text-green-500 border-green-600/30'}`}>
                            {currentShift === 'morning' ? 'TURNO MATUTINO' : currentShift === 'afternoon' ? 'TURNO VESPERTINO' : 'SISTEMA EM ESPERA'}
                        </div>
                        {currentSlot && (
                            <div className="flex items-center gap-4 bg-red-600/10 px-6 py-2.5 rounded-full border border-red-600/30 animate-in fade-in zoom-in duration-500">
                                <Clock size={16} className="text-red-500" />
                                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{currentSlot.label} ({currentSlot.start} - {currentSlot.end})</span>
                            </div>
                        )}
                    </div>
                    {currentSlot?.type === 'break' && (
                        <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest animate-pulse">
                            Intervalo em andamento
                        </div>
                    )}
                </div>

                {/* TURMAS GRID - REMOVIDO CRONÔMETRO DE FINALIZAÇÃO */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 flex-1">
                    {currentClasses.map(cls => {
                        const nowLesson = currentSlot ? schedule.find(s => s.classId === cls.id && s.slotId === currentSlot.id && s.dayOfWeek === (currentTime.getDay() || 1)) : null;
                        
                        // Encontrar Próxima Aula
                        const currentIdx = (currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS).findIndex(s => s.id === currentSlot?.id);
                        const nextSlot = (currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS)[currentIdx + 1];
                        const nextLesson = nextSlot ? schedule.find(s => s.classId === cls.id && s.slotId === nextSlot.id && s.dayOfWeek === (currentTime.getDay() || 1)) : null;

                        return (
                            <div key={cls.id} className="bg-[#121214] rounded-[3rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl relative group transition-all duration-500 hover:border-red-600/30">
                                <div className="p-8 bg-black/40 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{cls.name}</h3>
                                    <div className="h-3 w-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                </div>

                                <div className="p-10 flex-1 flex flex-col justify-center gap-10">
                                    {/* AULA ATUAL */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Agora</p>
                                        {nowLesson ? (
                                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                                <h4 className="text-4xl font-black text-white uppercase tracking-tight leading-tight">{nowLesson.subject}</h4>
                                                <p className="text-red-500 font-bold uppercase text-sm mt-2 tracking-widest">{nowLesson.professor}</p>
                                            </div>
                                        ) : (
                                            <p className="text-2xl font-black text-gray-700 uppercase tracking-widest italic">Livre</p>
                                        )}
                                    </div>

                                    <div className="h-px bg-white/5"></div>

                                    {/* PRÓXIMA AULA */}
                                    <div className="space-y-4 opacity-50">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">A Seguir</p>
                                        {nextLesson ? (
                                            <div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{nextLesson.subject}</h4>
                                                <p className="text-gray-500 font-bold uppercase text-[10px] mt-1 tracking-widest">{nextLesson.professor}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-black text-gray-700 uppercase tracking-widest">Fim do Período</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* SYSTEM BANNER */}
            {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
                <div className="relative z-20 w-full bg-red-600 py-6 px-12 flex items-center justify-center gap-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/10">
                    <Bell className="text-white animate-bounce" size={28} />
                    <p className="text-2xl font-black text-white uppercase tracking-tighter whitespace-nowrap overflow-hidden">
                        Aviso: {sysConfig.bannerMessage}
                    </p>
                </div>
            )}

            {/* FLOATING CONTROLS - AUTO HIDE (OCULTA EM 5s DE INATIVIDADE) */}
            <div className={`fixed right-8 bottom-8 z-50 flex flex-col gap-4 transition-all duration-700 ${showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
                <button onClick={() => setAudioEnabled(!audioEnabled)} className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all border ${audioEnabled ? 'bg-red-600 text-white border-red-500' : 'bg-black/80 text-gray-500 border-white/10'}`}>
                    {audioEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>}
                </button>
                <button onClick={toggleFullscreen} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-white/10 transition-all">
                    {isFullscreen ? <Minimize size={24}/> : <Maximize2 size={24}/>}
                </button>
                <button onClick={() => { sessionStorage.removeItem('monitor_auth'); window.location.reload(); }} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-gray-500 rounded-2xl flex items-center justify-center shadow-2xl hover:text-red-500 transition-all">
                    <Monitor size={24}/>
                </button>
            </div>
        </div>
    );
};
