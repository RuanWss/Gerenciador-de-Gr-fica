
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Wifi, WifiOff, Clock, Calendar, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// --- CONFIGURAÇÃO DE SONS ---
const SOUND_SCHOOL_BELL = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=school-bell-199584.mp3";

// --- CONFIGURAÇÃO DE HORÁRIOS (Sincronizado com Admin) ---
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
];

// --- TURMAS (IDs devem ser IDENTICOS aos do PrintShopDashboard.tsx) ---
const FUND_II_CLASSES = [
    { id: '6efaf', name: '6º EFAF' },
    { id: '7efaf', name: '7º EFAF' },
    { id: '8efaf', name: '8º EFAF' },
    { id: '9efaf', name: '9º EFAF' },
];

const MEDIO_CLASSES = [
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

    useEffect(() => {
        audioRef.current = new Audio(SOUND_SCHOOL_BELL);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Listener de tempo real
    useEffect(() => {
        if (!isAuthorized) return;
        const unsubscribe = listenToSchedule((data) => {
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

        // Lógica de Turno: Fund II Manhã / Médio Tarde
        const isMorning = nowMins < 760; // Antes de 12:40
        const activeClasses = isMorning ? FUND_II_CLASSES : MEDIO_CLASSES;
        const activeSlots = isMorning ? MORNING_SLOTS : AFTERNOON_SLOTS;

        const currentSlot = activeSlots.find(s => {
            const start = timeToMins(s.start);
            const end = timeToMins(s.end);
            return nowMins >= start && nowMins < end;
        });

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
                currentSlotLabel: currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : '-- : --',
                isBreak: currentSlot?.type === 'break'
            };
        });

        return { cards, currentSlot };
    }, [currentTime, schedule]);

    // Lógica do Alarme de troca de horário
    useEffect(() => {
        const slotId = dashboardData.currentSlot?.id || 'free';
        if (lastPlayedSlotId.current !== null && lastPlayedSlotId.current !== slotId) {
            if (audioEnabled && slotId !== 'free') {
                audioRef.current?.play().catch(() => {});
            }
        }
        lastPlayedSlotId.current = slotId;
    }, [dashboardData.currentSlot, audioEnabled]);

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
            {/* BACKGROUND DECORATION */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent opacity-50 pointer-events-none" />

            {/* HEADER AREA */}
            <div className="h-[40vh] flex flex-col items-center justify-center relative z-10 pt-10">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 mb-6 opacity-90 drop-shadow-2xl" alt="Logo" />
                
                <h1 className="text-[14rem] leading-[0.8] font-clock font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.05)] tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>

                <div className="mt-10 bg-[#141414] border border-white/5 px-12 py-3 rounded-full flex items-center gap-6 shadow-2xl backdrop-blur-md">
                    <span className="text-xl font-black text-gray-300 uppercase tracking-[0.3em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                        {connectionStatus ? <Wifi size={18} className="text-green-600"/> : <WifiOff size={18} className="text-red-600 animate-pulse"/>}
                    </div>
                </div>
            </div>

            {/* GRID AREA */}
            <div className="h-[50vh] w-full px-16 flex items-center justify-center">
                <div className="w-full max-w-[1920px] grid grid-cols-4 gap-8">
                    {dashboardData.cards.map((card) => (
                        <div 
                            key={card.id} 
                            className={`
                                relative overflow-hidden rounded-[2.5rem] bg-[#0d0d0e] border-2 h-72 flex flex-col transition-all duration-700
                                ${card.subject ? 'border-red-900/30 shadow-[0_30px_60px_rgba(0,0,0,0.5)]' : 'border-white/5 opacity-80'}
                            `}
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-center p-6 bg-white/[0.02] border-b border-white/5">
                                <h2 className="text-xl font-black text-white uppercase tracking-widest">{card.name}</h2>
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
                                    <div className="opacity-[0.03] group-hover:opacity-10 transition-opacity duration-1000">
                                        <h3 className="text-6xl font-black text-white uppercase tracking-[0.2em] select-none">LIVRE</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MARQUEE AVISOS */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 w-full bg-red-600 py-4 overflow-hidden shadow-[0_-15px_40px_rgba(220,38,38,0.2)] z-50 border-t border-white/20">
                    <div className="animate-marquee whitespace-nowrap">
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-12">AVISO: {sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-12">AVISO: {sysConfig.bannerMessage}</span>
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
                .animate-marquee { display: inline-block; animation: marquee 35s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }
            `}</style>
        </div>
    );
};
