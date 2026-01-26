
// ... existing imports ...
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Wifi, WifiOff, Clock, Calendar, Volume2, VolumeX, Maximize2, Monitor, ChevronRight, ChevronLeft, Bell, AlertCircle } from 'lucide-react';

// ... (Constants like SOUND_SCHOOL_BELL, SLOTS_EFAF_MORNING etc. remain unchanged) ...
const SOUND_SCHOOL_BELL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- CONFIGURAÇÃO DE HORÁRIOS ---
const SLOTS_EFAF_MORNING: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const SLOTS_EFAI_MORNING: TimeSlot[] = [
    { id: 'm1', start: '07:30', end: '08:25', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:25', end: '09:20', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:20', end: '09:40', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:40', end: '10:35', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:35', end: '11:30', type: 'class', label: '4º Horário', shift: 'morning' },
];

const SLOTS_EM_AFTERNOON: TimeSlot[] = [
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

const ALL_CLASSES = [
    { id: '1anoefai', name: '1º EFAI', shift: 'morning', level: 'EFAI' },
    { id: '2anoefai', name: '2º EFAI', shift: 'morning', level: 'EFAI' },
    { id: '3anoefai', name: '3º EFAI', shift: 'morning', level: 'EFAI' },
    { id: '4anoefai', name: '4º EFAI', shift: 'morning', level: 'EFAI' },
    { id: '5anoefai', name: '5º EFAI', shift: 'morning', level: 'EFAI' },
    { id: '6efaf', name: '6º EFAF', shift: 'morning', level: 'EFAF' },
    { id: '7efaf', name: '7º EFAF', shift: 'morning', level: 'EFAF' },
    { id: '8efaf', name: '8º EFAF', shift: 'morning', level: 'EFAF' },
    { id: '9efaf', name: '9º EFAF', shift: 'morning', level: 'EFAF' },
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon', level: 'EM' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon', level: 'EM' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon', level: 'EM' },
];

const DEFAULT_PIN = "2016";

export const PublicSchedule: React.FC = () => {
    // ... (State declarations remain unchanged) ...
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('monitor_auth') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [carouselIndex, setCarouselIndex] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- LÓGICA DO PIN E TECLADO ---
    const handlePin = (n: string) => {
        setPin(prev => {
            const next = prev + n;
            if (next.length > 4) return prev;
            if (next.length === 4) {
                if (next === DEFAULT_PIN) {
                    setIsAuthorized(true);
                    sessionStorage.setItem('monitor_auth', 'true');
                } else {
                    setPinError(true);
                    setTimeout(() => { setPin(''); setPinError(false); }, 800);
                }
            }
            return next;
        });
    };

    useEffect(() => {
        if (isAuthorized) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') handlePin(e.key);
            else if (e.key === 'Backspace') setPin(prev => prev.slice(0, -1));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAuthorized]);

    // --- LÓGICA DO ALARME (SINCRONIZADO) ---
    useEffect(() => {
        audioRef.current = new Audio(SOUND_SCHOOL_BELL);
    }, []);

    useEffect(() => {
        const checkBell = () => {
            const now = new Date();
            const nowStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const seconds = now.getSeconds();

            // Só verifica no segundo 0 para não tocar repetidamente no mesmo minuto
            if (seconds !== 0) return;

            // Filtra os slots de início de aula para EFAF e EM
            const morningEFAFStarts = SLOTS_EFAF_MORNING.map(s => s.start);
            const afternoonEMStarts = SLOTS_EM_AFTERNOON.map(s => s.start);
            
            const allStarts = [...morningEFAFStarts, ...afternoonEMStarts];

            if (allStarts.includes(nowStr) && audioEnabled) {
                audioRef.current?.play().catch(e => console.warn("Erro ao tocar alarme:", e));
            }
        };

        const bellInterval = setInterval(checkBell, 1000);
        return () => clearInterval(bellInterval);
    }, [audioEnabled]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCarouselIndex(prev => prev + 1);
        }, 12000); // Rotação a cada 12 segundos
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isAuthorized) return;
        
        const unsubscribe = listenToSchedule(
            (data) => {
                setSchedule([...data]);
                setConnectionStatus(true);
            },
            (err) => console.warn("Schedule listener error:", err.code)
        );
        
        const unsubscribeConfig = listenToSystemConfig(
            setSysConfig,
            (err) => console.warn("Config listener error:", err.code)
        );
        
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

        // Corte de turno às 12:30h
        const isMorning = nowMins < 750; 
        
        const activeClassesInShift = ALL_CLASSES.filter(c => c.shift === (isMorning ? 'morning' : 'afternoon'));

        const cards = activeClassesInShift.map(cls => {
            const levelSlots = cls.level === 'EFAI' ? SLOTS_EFAI_MORNING : 
                              cls.level === 'EFAF' ? SLOTS_EFAF_MORNING : 
                              SLOTS_EM_AFTERNOON;

            const currentSlot = levelSlots.find(s => {
                const start = timeToMins(s.start);
                const end = timeToMins(s.end);
                return nowMins >= start && nowMins < end;
            });

            const entry = schedule.find(s => 
                s.classId === cls.id && 
                s.dayOfWeek === dayOfWeek && 
                s.slotId === currentSlot?.id
            );

            return {
                ...cls,
                subject: entry?.subject || null,
                professor: entry?.professor || null,
                currentSlotLabel: currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : 'LIVRE',
                isBreak: currentSlot?.type === 'break',
                slotId: currentSlot?.id || 'none'
            };
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(cards.length / itemsPerPage);
        const actualPageIndex = totalPages > 0 ? carouselIndex % totalPages : 0;
        const visibleCards = cards.slice(actualPageIndex * itemsPerPage, (actualPageIndex + 1) * itemsPerPage);

        return { 
            cards: visibleCards, 
            isMorning, 
            isLunchTime: nowMins >= 720 && nowMins < 780, // 12:00 às 13:00
            pageInfo: { current: actualPageIndex + 1, total: totalPages }
        };
    }, [currentTime, schedule, carouselIndex]);

    if (!isAuthorized) {
        // ... (Unauthorized view remains unchanged) ...
        return (
            <div className="fixed inset-0 bg-[#09090b] flex items-center justify-center font-sans z-[1000] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent opacity-50" />
                <div className="text-center space-y-12 relative z-10 w-full max-w-sm px-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-32 mx-auto drop-shadow-2xl" alt="CEMAL"/>
                    <div className="space-y-4">
                        <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.5em]">Acesso Monitorado</p>
                        <div className="flex gap-6 justify-center">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${pin.length >= i ? 'bg-red-600 scale-125 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-gray-800'}`}/>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                            <button 
                                key={n} 
                                onClick={() => handlePin(String(n))} 
                                className={`w-20 h-20 bg-white/5 border border-white/5 rounded-full text-3xl font-black text-white hover:bg-red-600 transition-all active:scale-95 ${n === 0 ? 'col-start-2' : ''}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    {pinError && <p className="text-red-500 font-black uppercase text-xs tracking-widest animate-bounce">PIN INVÁLIDO</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#020202] text-white font-sans overflow-hidden select-none">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-red-900/15 via-transparent to-transparent opacity-80 pointer-events-none" />

            {/* --- TOP BAR: CLOCK & STATUS --- */}
            <div className="h-[28vh] flex flex-col items-center justify-center relative z-10 pt-4 px-12">
                <div className="w-full flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 shadow-2xl ${dashboardData.isMorning ? 'text-yellow-500' : 'text-orange-500'}`}>
                            <Clock size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Status do Sistema</p>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-black uppercase tracking-widest ${dashboardData.isMorning ? 'text-yellow-500' : 'text-orange-500'}`}>
                                    {dashboardData.isMorning ? 'Turno Matutino' : 'Turno Vespertino'}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-gray-700" />
                                {connectionStatus ? <span className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest"><Wifi size={14}/> Online</span> : <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse"><WifiOff size={14}/> Offline</span>}
                            </div>
                         </div>
                    </div>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 opacity-90 drop-shadow-2xl" alt="Logo" />
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Calendário Escolar</p>
                        <p className="text-lg font-black text-white uppercase tracking-widest">
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
                
                <div className="relative group">
                    <h1 className="text-[13rem] leading-none font-clock font-black tracking-tighter text-white drop-shadow-[0_10px_60px_rgba(255,255,255,0.05)] tabular-nums animate-in fade-in duration-1000">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h1>
                    <div className="absolute -right-24 bottom-6 text-4xl font-black text-red-600/80 font-clock tabular-nums">
                        :{currentTime.toLocaleTimeString([], { second: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* --- MAIN GRID AREA --- */}
            <div className="h-[62vh] w-full px-12 flex flex-col items-center justify-center pb-8">
                {dashboardData.isLunchTime ? (
                    <div className="bg-[#0a0a0b] border border-white/5 rounded-[4rem] p-20 text-center space-y-8 animate-pulse shadow-2xl">
                        <div className="h-32 w-32 bg-red-600/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-600/20">
                            <Clock size={80} className="text-red-500" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-6xl font-black text-white uppercase tracking-tighter">Troca de Turno</h2>
                            <p className="text-2xl text-gray-500 font-bold uppercase tracking-[0.5em]">Aguardando início do período vespertino</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-[1800px] flex flex-col items-center">
                        <div className="grid grid-cols-4 gap-8 w-full">
                            {dashboardData.cards.map((card) => (
                                <div 
                                    key={card.id} 
                                    className={`
                                        relative overflow-hidden rounded-[2.5rem] bg-[#0d0d0e] border-2 h-72 flex flex-col transition-all duration-1000 shadow-2xl
                                        ${card.subject ? 'border-red-900/40' : 'border-white/5 opacity-30'}
                                    `}
                                >
                                    {/* Card Header */}
                                    <div className="flex justify-between items-center p-6 bg-white/[0.03] border-b border-white/5">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">{card.name}</h2>
                                        <div className="bg-red-600/10 px-4 py-1.5 rounded-xl border border-red-600/20 text-xs font-black text-red-500 uppercase tracking-widest">
                                            {card.currentSlotLabel}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                        {card.isBreak ? (
                                            <div className="animate-pulse space-y-2">
                                                <p className="text-5xl font-black text-yellow-500 uppercase tracking-[0.2em] drop-shadow-2xl">INTERVALO</p>
                                                <p className="text-[10px] text-yellow-500/50 font-black uppercase tracking-[0.5em]">Hora do Lanche</p>
                                            </div>
                                        ) : card.subject ? (
                                            <div className="w-full space-y-6">
                                                <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-[1.05] drop-shadow-2xl line-clamp-2">
                                                    {card.subject}
                                                </h3>
                                                <div className="inline-flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Professor(a)</span>
                                                    <p className="text-sm font-black text-red-500 uppercase tracking-widest truncate max-w-[240px]">
                                                        {card.professor}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="opacity-20 flex flex-col items-center gap-4">
                                                <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
                                                    <Monitor size={32} className="text-gray-500" />
                                                </div>
                                                <h3 className="text-xl font-black uppercase tracking-[0.4em]">LIVRE</h3>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Activity Indicator */}
                                    {card.subject && !card.isBreak && (
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 overflow-hidden">
                                            <div className="h-full bg-white/40 animate-[progress_12s_linear_infinite]" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* --- PAGINATION INDICATOR --- */}
                        {dashboardData.pageInfo.total > 1 && (
                            <div className="mt-12 flex items-center gap-10 bg-white/5 border border-white/5 px-8 py-3 rounded-full backdrop-blur-xl">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Grupo {dashboardData.pageInfo.current} de {dashboardData.pageInfo.total}</span>
                                <div className="flex gap-3">
                                    {Array.from({ length: dashboardData.pageInfo.total }).map((_, i) => (
                                        <div key={i} className={`h-2 rounded-full transition-all duration-700 ${dashboardData.pageInfo.current === i + 1 ? 'w-16 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'w-4 bg-gray-800'}`} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MARQUEE BANNER --- */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 w-full bg-red-600 py-6 overflow-hidden z-50 border-t border-white/20 shadow-[0_-20px_100px_rgba(220,38,38,0.4)]">
                    <div className="animate-marquee whitespace-nowrap flex items-center">
                        <span className="text-3xl font-black text-white uppercase tracking-widest mx-40 flex items-center gap-10">
                            <AlertCircle size={40} className="fill-white/10" /> {sysConfig.bannerMessage}
                        </span>
                        <span className="text-3xl font-black text-white uppercase tracking-widest mx-40 flex items-center gap-10">
                            <AlertCircle size={40} className="fill-white/10" /> {sysConfig.bannerMessage}
                        </span>
                    </div>
                </div>
            )}

            {/* --- SYSTEM CONTROLS (AUTO-HIDE) --- */}
            <div className="fixed bottom-10 right-10 flex gap-4 opacity-0 hover:opacity-100 transition-all duration-500 translate-y-4 hover:translate-y-0 z-[100]">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 pr-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">Sinal Sonoro</span>
                    <button 
                        onClick={() => setAudioEnabled(!audioEnabled)} 
                        className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-green-600 text-white shadow-lg' : 'bg-red-600 text-white'}`}
                    >
                        {audioEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                    </button>
                    <button 
                        onClick={() => document.documentElement.requestFullscreen()} 
                        className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all"
                    >
                        <Maximize2 size={20}/>
                    </button>
                </div>
            </div>

            <style>{`
                @font-face { font-family: 'Montserrat'; font-weight: 900; }
                .font-clock { font-family: 'Montserrat', sans-serif; letter-spacing: -0.05em; }
                .animate-marquee { display: inline-flex; animation: marquee 25s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }
                @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
            `}</style>
        </div>
    );
};
