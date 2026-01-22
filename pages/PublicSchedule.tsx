
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Wifi, WifiOff, Clock, Calendar, Volume2, VolumeX, Maximize2, Monitor, ChevronRight, ChevronLeft } from 'lucide-react';

// --- CONFIGURAÇÃO DE SONS ---
const SOUND_SCHOOL_BELL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// --- CONFIGURAÇÃO DE HORÁRIOS (Sincronizado Rigorosamente com Admin) ---
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

// --- TODAS AS TURMAS ---
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
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('monitor_auth') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [carouselIndex, setCarouselIndex] = useState(0);
    
    const lastPlayedSlotIds = useRef<Record<string, string>>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(SOUND_SCHOOL_BELL);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Carrossel de turmas (Muda a cada 15 segundos se houver mais que 8 turmas)
    useEffect(() => {
        const timer = setInterval(() => {
            setCarouselIndex(prev => prev + 1);
        }, 15000);
        return () => clearInterval(timer);
    }, []);

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

        const isMorning = nowMins < 750; // 12:30 PM corte
        
        const activeClassesInShift = ALL_CLASSES.filter(c => c.shift === (isMorning ? 'morning' : 'afternoon'));

        const cards = activeClassesInShift.map(cls => {
            // Seleciona os slots corretos baseado no nível da turma
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
                currentSlotLabel: currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : '--:--',
                isBreak: currentSlot?.type === 'break',
                slotId: currentSlot?.id || 'none'
            };
        });

        // Paginação do carrossel (8 cards por vez no máximo para legibilidade)
        const itemsPerPage = 8;
        const totalPages = Math.ceil(cards.length / itemsPerPage);
        const actualPageIndex = carouselIndex % totalPages;
        const visibleCards = cards.slice(actualPageIndex * itemsPerPage, (actualPageIndex + 1) * itemsPerPage);

        return { 
            cards: visibleCards, 
            isMorning, 
            isLunchTime: !isMorning && nowMins < 780 && nowMins >= 720,
            pageInfo: { current: actualPageIndex + 1, total: totalPages }
        };
    }, [currentTime, schedule, carouselIndex]);

    // Lógica do sinal sonoro por nível (opcional, aqui simplificado)
    useEffect(() => {
        // Verifica se algum slot mudou para tocar o sinal
        const morningEFafSlot = SLOTS_EFAF_MORNING.find(s => {
            const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
            return nowMins === timeToMins(s.start);
        });

        if (morningEFafSlot && audioEnabled) {
             // Toca apenas no minuto exato do início
             if (currentTime.getSeconds() === 0) {
                audioRef.current?.play().catch(() => {});
             }
        }
    }, [currentTime, audioEnabled]);

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
            {/* BACKGROUND ANIMADO */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black opacity-80 pointer-events-none" />

            {/* HEADER */}
            <div className="h-[30vh] flex flex-col items-center justify-center relative z-10 pt-4">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-12 mb-2 opacity-80" alt="Logo" />
                
                <div className="flex flex-col items-center">
                    <h1 className="text-[10rem] leading-none font-clock font-black tracking-tighter text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] tabular-nums">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h1>
                    <p className="text-3xl font-black text-gray-400 uppercase tracking-[0.4em] -mt-4 mb-4">
                        {currentTime.toLocaleTimeString([], { second: '2-digit' })}
                    </p>
                </div>

                <div className="bg-[#141414]/80 border border-white/5 px-8 py-3 rounded-full flex items-center gap-6 shadow-2xl backdrop-blur-md">
                    <span className="text-lg font-black text-gray-300 uppercase tracking-[0.2em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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
            <div className="h-[65vh] w-full px-12 flex flex-col items-center justify-center pb-12">
                
                {dashboardData.isLunchTime ? (
                    <div className="flex flex-col items-center justify-center animate-pulse">
                        <Clock size={80} className="text-blue-500 mb-6 opacity-80" />
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-2">Troca de Turno</h2>
                        <p className="text-xl text-blue-400 font-bold uppercase tracking-[0.5em]">Aguardando início das aulas</p>
                    </div>
                ) : (
                    <>
                        <div className="w-full max-w-[1800px] grid grid-cols-4 gap-6">
                            {dashboardData.cards.map((card) => (
                                <div 
                                    key={card.id} 
                                    className={`
                                        relative overflow-hidden rounded-[2rem] bg-[#0d0d0e] border-2 h-64 flex flex-col transition-all duration-1000 animate-in fade-in zoom-in
                                        ${card.subject ? 'border-red-900/40 shadow-[0_20px_60px_rgba(220,38,38,0.12)]' : 'border-white/5 opacity-40'}
                                    `}
                                >
                                    <div className="flex justify-between items-center p-5 bg-white/[0.03] border-b border-white/5">
                                        <h2 className="text-xl font-black text-white uppercase tracking-widest">{card.name}</h2>
                                        <div className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-gray-500">
                                            {card.currentSlotLabel}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
                                        {card.isBreak ? (
                                            <div className="animate-pulse">
                                                <p className="text-3xl font-black text-yellow-500 uppercase tracking-widest">INTERVALO</p>
                                            </div>
                                        ) : card.subject ? (
                                            <div className="w-full">
                                                <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-[1.1] mb-4 drop-shadow-lg line-clamp-2">
                                                    {card.subject}
                                                </h3>
                                                <div className="inline-flex bg-red-600 px-5 py-1.5 rounded-full shadow-lg">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest truncate max-w-[200px]">
                                                        {card.professor}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="opacity-20">
                                                <Monitor size={40} className="mb-2 mx-auto" />
                                                <h3 className="text-xl font-black uppercase tracking-[0.2em]">LIVRE</h3>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Indicador de Páginas do Carrossel */}
                        {dashboardData.pageInfo.total > 1 && (
                            <div className="mt-10 flex items-center gap-6">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Exibindo Grupo {dashboardData.pageInfo.current} de {dashboardData.pageInfo.total}</span>
                                <div className="flex gap-2">
                                    {Array.from({ length: dashboardData.pageInfo.total }).map((_, i) => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${dashboardData.pageInfo.current === i + 1 ? 'w-12 bg-red-600' : 'w-3 bg-gray-800'}`} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MARQUEE AVISOS */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 w-full bg-red-600 py-4 overflow-hidden z-50 border-t border-white/20 shadow-[0_-20px_50px_rgba(220,38,38,0.3)]">
                    <div className="animate-marquee whitespace-nowrap">
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-20">{sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-20">{sysConfig.bannerMessage}</span>
                    </div>
                </div>
            )}

            {/* CONTROLES ESCONDIDOS */}
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
                .animate-marquee { display: inline-block; animation: marquee 30s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }
            `}</style>
        </div>
    );
};
