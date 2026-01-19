
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Wifi, WifiOff, Clock, Calendar, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// --- CONFIGURAÇÃO DE SONS ---
const SOUND_SCHOOL_BELL = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=school-bell-199584.mp3";

// --- CONFIGURAÇÃO DE HORÁRIOS (Matutino - Sincronizado) ---
const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

// --- CONFIGURAÇÃO DE HORÁRIOS (Vespertino - Sincronizado Completo) ---
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

// --- TURMAS POR TURNO (IDs Rigorosamente Iguais ao Dashboard) ---
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
    
    // Estados de Dados
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    
    // Refs para lógica de controle
    const lastPlayedSlotId = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Inicializa Audio
    useEffect(() => {
        audioRef.current = new Audio(SOUND_SCHOOL_BELL);
    }, []);

    // Relógio (1s)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Listener Real-time do Firebase
    useEffect(() => {
        if (!isAuthorized) return;
        const unsubSchedule = listenToSchedule((data) => {
            console.log("🔥 TV: Recebido atualização de horários:", data.length);
            setSchedule([...data]);
            setConnectionStatus(true);
        });
        const unsubConfig = listenToSystemConfig(setSysConfig);
        return () => { unsubSchedule(); unsubConfig(); };
    }, [isAuthorized]);

    // Helpers de Tempo
    const timeToMins = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // LÓGICA PRINCIPAL DE EXIBIÇÃO
    const dashboardData = useMemo(() => {
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        // 1. Determina Turno (12:40 PM como corte)
        let currentShift: 'morning' | 'afternoon' = 'morning';
        if (nowMins >= 760) currentShift = 'afternoon'; 

        // 2. Seleciona Configuração Baseado no Turno
        const activeClasses = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
        const activeSlots = currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS;

        // 3. Determina Slot Atual
        const currentSlot = activeSlots.find(s => {
            const start = timeToMins(s.start);
            const end = timeToMins(s.end);
            return nowMins >= start && nowMins < end;
        });

        // 4. Determina Dia da Semana (Correção para Fim de Semana -> Segunda)
        const rawDay = currentTime.getDay();
        const dayOfWeek = (rawDay === 0 || rawDay === 6) ? 1 : rawDay;

        // 5. Constrói dados dos Cards
        const cards = activeClasses.map(cls => {
            // Busca aula exata para agora
            let entry = schedule.find(s => 
                s.classId === cls.id && 
                s.dayOfWeek === dayOfWeek && 
                s.slotId === currentSlot?.id
            );

            return {
                classId: cls.id,
                className: cls.name,
                currentSlotLabel: currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : '--:--',
                subject: entry?.subject || null,
                professor: entry?.professor || null,
                isBreak: currentSlot?.type === 'break'
            };
        });

        return { currentShift, currentSlot, cards, dayOfWeek };
    }, [currentTime, schedule]);

    // LÓGICA DE ALARME
    useEffect(() => {
        const slotId = dashboardData.currentSlot?.id || 'free';
        
        // Se mudou o slot e não é a primeira carga
        if (lastPlayedSlotId.current !== null && lastPlayedSlotId.current !== slotId) {
            if (audioEnabled && slotId !== 'free') {
                console.log("🔔 Trocando horário - Tocando sinal");
                audioRef.current?.play().catch(e => console.warn("Audio blocked", e));
            }
        }
        lastPlayedSlotId.current = slotId;
    }, [dashboardData.currentSlot, audioEnabled]);


    // TELA DE PIN (Proteção)
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
            <div className="fixed inset-0 bg-black flex items-center justify-center font-sans">
                <div className="text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 mx-auto mb-8"/>
                    <div className="flex gap-4 justify-center">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length >= i ? 'bg-red-600 border-red-600' : 'border-gray-700'}`}/>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => handlePin(String(n))} className="w-20 h-20 bg-white/10 rounded-full text-2xl font-bold text-white hover:bg-white/20 transition-all">{n}</button>
                        ))}
                        <div/>
                        <button onClick={() => handlePin('0')} className="w-20 h-20 bg-white/10 rounded-full text-2xl font-bold text-white hover:bg-white/20 transition-all">0</button>
                    </div>
                    {pinError && <p className="text-red-500 font-bold uppercase tracking-widest animate-pulse">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    // RENDERIZAÇÃO FINAL (LAYOUT TV)
    return (
        <div className="fixed inset-0 bg-[#050505] text-white font-sans overflow-hidden cursor-none selection:bg-none">
            
            {/* --- HEADER (LOGO & CLOCK) --- */}
            <div className="h-[35vh] flex flex-col items-center justify-center relative z-10 pt-10">
                <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    className="h-16 mb-6 opacity-90 drop-shadow-2xl" 
                    alt="Logo"
                />
                
                {/* Relógio Gigante */}
                <h1 className="text-[12rem] leading-[0.8] font-clock font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h1>

                {/* Data Pill */}
                <div className="mt-8 bg-[#1a1a1a] border border-white/5 px-10 py-3 rounded-full flex items-center gap-4 shadow-2xl">
                    <span className="text-lg font-black text-gray-300 uppercase tracking-[0.2em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {connectionStatus ? <Wifi size={18} className="text-green-600"/> : <WifiOff size={18} className="text-red-600"/>}
                </div>
            </div>

            {/* --- CARDS GRID --- */}
            <div className="h-[55vh] w-full px-12 flex items-center justify-center">
                <div className="w-full max-w-[1920px] grid grid-cols-4 gap-8">
                    {dashboardData.cards.map((card) => (
                        <div 
                            key={card.classId} 
                            className={`
                                relative overflow-hidden rounded-[2.5rem] bg-[#0f0f10] border-2 h-80 flex flex-col transition-all duration-700
                                ${card.subject ? 'border-red-900/30 shadow-[0_0_50px_rgba(220,38,38,0.1)]' : 'border-white/5'}
                            `}
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-center p-6 bg-white/[0.02] border-b border-white/5">
                                <h2 className="text-xl font-black text-white uppercase tracking-widest">{card.className}</h2>
                                <span className="bg-white/5 px-3 py-1 rounded-lg text-xs font-mono font-bold text-gray-400">
                                    {card.currentSlotLabel}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative group">
                                {card.isBreak ? (
                                    <div className="animate-pulse">
                                        <p className="text-4xl font-black text-yellow-500 uppercase tracking-widest mb-2">Intervalo</p>
                                        <Clock size={40} className="text-yellow-500/50 mx-auto"/>
                                    </div>
                                ) : card.subject ? (
                                    <div className="w-full animate-in fade-in zoom-in duration-500">
                                        <h3 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4 drop-shadow-lg line-clamp-2">
                                            {card.subject}
                                        </h3>
                                        <div className="inline-block bg-red-600 px-6 py-2 rounded-full shadow-lg shadow-red-900/40">
                                            <p className="text-sm font-black text-white uppercase tracking-[0.2em] truncate max-w-[200px]">
                                                {card.professor}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                        <h3 className="text-6xl font-black text-white uppercase tracking-widest select-none">LIVRE</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MARQUEE / FOOTER --- */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 w-full bg-red-600 py-3 overflow-hidden shadow-[0_-10px_40px_rgba(220,38,38,0.3)] z-50">
                    <div className="animate-marquee whitespace-nowrap">
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-10">AVISO IMPORTANTE: {sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-10">AVISO IMPORTANTE: {sysConfig.bannerMessage}</span>
                        <span className="text-2xl font-black text-white uppercase tracking-widest mx-10">AVISO IMPORTANTE: {sysConfig.bannerMessage}</span>
                    </div>
                </div>
            )}

            {/* --- CONTROLS (Hidden but accessible) --- */}
            <div className="fixed bottom-8 right-8 flex gap-4 opacity-0 hover:opacity-100 transition-opacity z-[60]">
                <button onClick={() => setAudioEnabled(!audioEnabled)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20">
                    {audioEnabled ? <Volume2/> : <VolumeX/>}
                </button>
                <button onClick={() => document.documentElement.requestFullscreen()} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20">
                    <Maximize2/>
                </button>
            </div>

            <style>{`
                .font-clock { font-family: 'Montserrat', sans-serif; font-variant-numeric: tabular-nums; }
                .animate-marquee { display: inline-block; animation: marquee 25s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }
            `}</style>
        </div>
    );
};
