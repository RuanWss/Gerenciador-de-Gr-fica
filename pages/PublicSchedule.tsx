
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Wifi, WifiOff, Clock, Calendar, Volume2, VolumeX, Maximize2, Monitor } from 'lucide-react';

// --- CONFIGURAÇÃO DE SONS ---
const SOUND_SCHOOL_BELL = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=school-bell-199584.mp3";

// --- CONFIGURAÇÃO DE HORÁRIOS (Sincronizado Rigorosamente com Admin) ---
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

// --- TURMAS (IDs devem ser IDENTICOS aos do PrintShopDashboard.tsx) ---
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

const DEFAULT_PIN = "2016";

export const PublicSchedule: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('monitor_auth') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    
    const lastPlayedSlotId = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Inicializa Audio
    useEffect(() => {
        audioRef.current = new Audio(SOUND_SCHOOL_BELL);
    }, []);

    // Relógio
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Listener Real-time
    useEffect(() => {
        if (!isAuthorized) return;
        const unsubscribe = listenToSchedule((data) => {
            console.log("TV Recebeu dados:", data); // Debug
            setSchedule([...data]);
            setConnectionStatus(true);
        });
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        return () => {
            unsubscribe();
            unsubscribeConfig();
        };
    }, [isAuthorized]);

    const timeToMins = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const dashboardData = useMemo(() => {
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        const rawDay = currentTime.getDay();
        const dayOfWeek = (rawDay === 0 || rawDay === 6) ? 1 : rawDay;

        // 12:30 é o ponto de corte visual entre Manhã e Tarde
        // 750 minutos = 12:30 PM
        const isMorning = nowMins < 750; 
        
        const activeClasses = isMorning ? MORNING_CLASSES : AFTERNOON_CLASSES;
        const activeSlots = isMorning ? MORNING_SLOTS : AFTERNOON_SLOTS;

        const currentSlot = activeSlots.find(s => {
            const start = timeToMins(s.start);
            const end = timeToMins(s.end);
            return nowMins >= start && nowMins < end;
        });

        // Se não houver slot ativo (ex: hora do almoço), verifica se está no intervalo de troca
        const isLunchTime = !currentSlot && nowMins >= 720 && nowMins < 780; // 12:00 - 13:00

        const cards = activeClasses.map(cls => {
            const entry = schedule.find(s => 
                s.classId === cls.id && 
                s.dayOfWeek === dayOfWeek && 
                s.slotId === currentSlot?.id
            );

            return {
                ...cls,
                subject: entry?.subject || null,
                professor: entry?.professor || null,
                currentSlotLabel: currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : '--:--',
                isBreak: currentSlot?.type === 'break'
            };
        });

        return { cards, currentSlot, isMorning, isLunchTime };
    }, [currentTime, schedule]);

    // Alarme Sonoro
    useEffect(() => {
        const slotId = dashboardData.currentSlot?.id || 'free';
        if (lastPlayedSlotId.current !== null && lastPlayedSlotId.current !== slotId) {
            if (audioEnabled && slotId !== 'free') {
                audioRef.current?.play().catch(() => {});
            }
        }
        lastPlayedSlotId.current = slotId;
    }, [dashboardData.currentSlot, audioEnabled]);

    // Tela de PIN
    if (!isAuthorized) {
        const handlePin = (n: string) => {
            const next = pin + n;
            setPin(next);
            if (next.length === 4) {
                if (next === DEFAULT_PIN) {
                    setIsAuthorized(true);
                    sessionStorage.setItem('monitor_auth', 'true');
                } else {
                    setPinError(true);
                    setTimeout(() => { setPin(''); setPinError(false); }, 800);
                }
            }
        };

        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center font-sans z-[1000]">
                <div className="text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 mx-auto mb-8" alt="CEMAL"/>
                    <div className="flex gap-4 justify-center">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length >= i ? 'bg-red-600 border-red-600' : 'border-gray-700'}`}/>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                            <button key={n} onClick={() => handlePin(String(n))} className="w-20 h-20 bg-white/10 rounded-full text-2xl font-bold text-white hover:bg-white/20 active:scale-90 transition-all">{n}</button>
                        ))}
                    </div>
                    {pinError && <p className="text-red-500 font-bold uppercase tracking-widest animate-pulse">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#000000] text-white font-sans overflow-hidden cursor-none selection:bg-none">
            {/* BACKGROUND */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-transparent to-transparent opacity-60 pointer-events-none" />

            {/* HEADER */}
            <div className="h-[35vh] flex flex-col items-center justify-center relative z-10 pt-8">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-14 mb-4 opacity-90 drop-shadow-2xl" alt="Logo" />
                
                <h1 className="text-[11rem] leading-[0.85] font-clock font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.08)] tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>

                <div className="mt-8 bg-[#141414] border border-white/5 px-10 py-3 rounded-full flex items-center gap-6 shadow-2xl backdrop-blur-md">
                    <span className="text-xl font-black text-gray-300 uppercase tracking-[0.3em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                        <span className={`text-xs font-black uppercase tracking-widest ${dashboardData.isMorning ? 'text-yellow-500' : 'text-orange-500'}`}>
                            {dashboardData.isMorning ? 'Turno Matutino' : 'Turno Vespertino'}
                        </span>
                        {connectionStatus ? <Wifi size={16} className="text-green-600"/> : <WifiOff size={16} className="text-red-600 animate-pulse"/>}
                    </div>
                </div>
            </div>

            {/* GRID AREA */}
            <div className="h-[60vh] w-full px-16 flex items-center justify-center pb-20">
                
                {dashboardData.isLunchTime ? (
                    <div className="flex flex-col items-center justify-center animate-pulse">
                        <Clock size={80} className="text-blue-500 mb-6 opacity-80" />
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-2">Troca de Turno</h2>
                        <p className="text-xl text-blue-400 font-bold uppercase tracking-[0.5em]">Aguardando início das aulas</p>
                    </div>
                ) : (
                    <div className="w-full max-w-[1920px] grid grid-cols-4 gap-8">
                        {dashboardData.cards.map((card) => (
                            <div 
                                key={card.id} 
                                className={`
                                    relative overflow-hidden rounded-[2.5rem] bg-[#0d0d0e] border-2 h-72 flex flex-col transition-all duration-700
                                    ${card.subject ? 'border-red-900/40 shadow-[0_20px_50px_rgba(220,38,38,0.15)] opacity-100' : 'border-white/5 opacity-60'}
                                `}
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-center p-6 bg-white/[0.02] border-b border-white/5">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">{card.name}</h2>
                                    <div className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-gray-500 uppercase tracking-tighter">
                                        {card.currentSlotLabel}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative group">
                                    {card.isBreak ? (
                                        <div className="animate-pulse flex flex-col items-center">
                                            <p className="text-4xl font-black text-yellow-500 uppercase tracking-widest mb-3">INTERVALO</p>
                                            <Clock size={32} className="text-yellow-600/30"/>
                                        </div>
                                    ) : card.subject ? (
                                        <div className="w-full animate-in fade-in zoom-in duration-500">
                                            <h3 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4 drop-shadow-lg line-clamp-2">
                                                {card.subject}
                                            </h3>
                                            <div className="inline-flex bg-red-600 px-6 py-2 rounded-full shadow-lg shadow-red-950/50">
                                                <p className="text-xs font-black text-white uppercase tracking-[0.2em] truncate max-w-[220px]">
                                                    {card.professor}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-30">
                                            <Monitor size={40} className="mb-2 text-gray-600" />
                                            <h3 className="text-2xl font-black text-gray-500 uppercase tracking-[0.2em] select-none">LIVRE</h3>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MARQUEE AVISOS */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 w-full bg-red-600 py-4 overflow-hidden shadow-[0_-15px_40px_rgba(220,38,38,0.2)] z-50 border-t border-white/20">
                    <div className="animate-marquee whitespace-nowrap">
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-20">{sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-20">{sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-20">{sysConfig.bannerMessage}</span>
                    </div>
                </div>
            )}

            {/* HIDDEN CONTROLS */}
            <div className="fixed bottom-10 right-10 flex gap-4 opacity-0 hover:opacity-100 transition-opacity z-[100]">
                <button onClick={() => setAudioEnabled(!audioEnabled)} className="p-4 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/20">
                    {audioEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>}
                </button>
                <button onClick={() => document.documentElement.requestFullscreen()} className="p-4 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/20">
                    <Maximize2 size={24}/>
                </button>
            </div>

            <style>{`
                @font-face { font-family: 'Montserrat'; font-weight: 900; }
                .font-clock { font-family: 'Montserrat', sans-serif; }
                .animate-marquee { display: inline-block; animation: marquee 40s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }
            `}</style>
        </div>
    );
};
