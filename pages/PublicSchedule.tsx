
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Maximize2, Monitor, Volume2, VolumeX, Wifi, WifiOff, Clock, AlertCircle, RefreshCw, Calendar } from 'lucide-react';

// Sons para os alertas
const SOUND_SHORT = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 
const SOUND_LONG = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=school-bell-199584.mp3";

// --- CONFIGURAÇÃO DE SLOTS (IDs devem bater com o Admin) ---
const SLOTS: TimeSlot[] = [
    // Manhã (Abrange EFAI e EFAF com IDs unificados onde possível ou faixas de tempo aproximadas)
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
    
    // Tarde
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

// LISTA COMPLETA DE TURMAS (Normalizada com Admin)
const MORNING_CLASSES = [
    { id: '1anoefai', name: '1º EFAI' },
    { id: '2anoefai', name: '2º EFAI' },
    { id: '3anoefai', name: '3º EFAI' },
    { id: '4anoefai', name: '4º EFAI' },
    { id: '5anoefai', name: '5º EFAI' },
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
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    
    const lastProcessedSlotId = useRef<string | null>(null);
    const audioShortRef = useRef<HTMLAudioElement | null>(null);
    const audioLongRef = useRef<HTMLAudioElement | null>(null);

    const timeToMins = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    useEffect(() => {
        audioShortRef.current = new Audio(SOUND_SHORT);
        audioLongRef.current = new Audio(SOUND_LONG);
    }, []);

    // FETCH DATA
    useEffect(() => {
        if (!isAuthorized) return;
        const unsubscribeSchedule = listenToSchedule((data) => {
            console.log("TV: Dados recebidos", data.length);
            setSchedule([...data]); // Force refresh
            setConnectionStatus(true);
        });
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
        };
    }, [isAuthorized]);

    // TIMER
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // SHIFT CONTROL
    useEffect(() => {
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        let newShift: 'morning' | 'afternoon' | 'off' = 'morning';
        // Ajuste fino dos turnos
        if (nowMins >= 360 && nowMins <= 760) newShift = 'morning'; // 06:00 - 12:40
        else if (nowMins > 760 && nowMins <= 1320) newShift = 'afternoon'; // 12:40 - 22:00
        else newShift = 'morning'; // Default madrugada
        
        if (newShift !== currentShift) setCurrentShift(newShift);

        // Sound Logic
        const activeSlots = SLOTS.filter(s => s.shift === newShift);
        const currentSlot = activeSlots.find(s => {
            const start = timeToMins(s.start);
            const end = timeToMins(s.end);
            return nowMins >= start && nowMins < end;
        });

        const currentSlotId = currentSlot ? currentSlot.id : 'free';

        if (lastProcessedSlotId.current !== null && lastProcessedSlotId.current !== currentSlotId) {
            if (audioEnabled) {
                const isBreak = currentSlot?.type === 'break';
                if (isBreak) audioLongRef.current?.play().catch(() => {});
                else if (currentSlotId !== 'free') audioShortRef.current?.play().catch(() => {});
            }
        }
        lastProcessedSlotId.current = currentSlotId;
    }, [currentTime, audioEnabled, currentShift]);

    const normalizeId = (id: string) => id?.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || '';

    // DISPLAY LOGIC
    const displayData = useMemo(() => {
        const rawDay = currentTime.getDay();
        // Força Segunda-feira (1) se for Sábado(6) ou Domingo(0) para testes
        const dayOfWeek = (rawDay === 0 || rawDay === 6) ? 1 : rawDay;
        
        const slots = SLOTS.filter(s => s.shift === currentShift);
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        
        const currentSlotIndex = slots.findIndex(s => {
            const start = timeToMins(s.start);
            const end = timeToMins(s.end);
            return nowMins >= start && nowMins < end;
        });
        
        const currentSlot = currentSlotIndex !== -1 ? slots[currentSlotIndex] : null;
        const nextSlot = currentSlotIndex !== -1 && currentSlotIndex + 1 < slots.length ? slots[currentSlotIndex + 1] : null;

        const classes = currentShift === 'afternoon' ? AFTERNOON_CLASSES : MORNING_CLASSES;

        return classes.map(cls => {
            const normalizedClsId = normalizeId(cls.id);

            // 1. Tenta achar aula no slot atual exato
            let currentEntry = schedule.find(s => 
                normalizeId(s.classId) === normalizedClsId && 
                s.slotId === (currentSlot?.id || 'none') && 
                Number(s.dayOfWeek) === Number(dayOfWeek)
            );

            // 2. Se não achou aula agora, mas existe slot (buraco), verifica se tem aula depois
            // 3. FALLBACK: Se estamos "fora de horário" mas queremos testar, mostra a primeira aula do dia
            if (!currentEntry) {
                // Procura qualquer aula desse dia para essa turma para não ficar vazio
                const anyEntryToday = schedule.find(s => 
                    normalizeId(s.classId) === normalizedClsId && 
                    Number(s.dayOfWeek) === Number(dayOfWeek)
                );
                
                // Só mostra o fallback se não estivermos num intervalo
                if (anyEntryToday && (!currentSlot || currentSlot.type !== 'break')) {
                    // Se não tem slot atual (ex: 20:00 da noite), mostra a aula para fins de visualização
                    if (!currentSlot) currentEntry = anyEntryToday;
                }
            }

            let nextEntry = null;
            if (nextSlot) {
                if (nextSlot.type === 'break') {
                    nextEntry = { subject: 'INTERVALO', professor: '', start: nextSlot.start };
                } else {
                    const entry = schedule.find(s => 
                        normalizeId(s.classId) === normalizedClsId && 
                        s.slotId === nextSlot.id && 
                        Number(s.dayOfWeek) === Number(dayOfWeek)
                    );
                    nextEntry = entry ? { subject: entry.subject, professor: entry.professor, start: nextSlot.start } : null;
                }
            }

            return { cls, currentSlot, currentEntry, nextEntry, nextSlot };
        });
    }, [currentTime, schedule, currentShift]);

    const handlePinPress = (num: string) => {
        if (pin.length >= 4) return;
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
            if (newPin === DEFAULT_PIN) {
                setIsAuthorized(true);
                sessionStorage.setItem('monitor_auth', 'true');
            } else {
                setPinError(true);
                setTimeout(() => { setPin(''); setPinError(false); }, 1000);
            }
        }
    };

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 bg-[#0a0000] flex flex-col items-center justify-center p-6 z-[1000]">
                <div className="max-w-xs w-full text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 mx-auto" alt="CEMAL" />
                    <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'border-gray-800'}`}></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((n) => (
                            <button key={n} onClick={() => handlePinPress(n)} className="h-16 bg-white/5 text-white text-2xl font-black rounded-2xl border border-white/5 active:scale-95 transition-all">{n}</button>
                        ))}
                    </div>
                    {pinError && <p className="text-red-500 font-black uppercase text-[10px] tracking-widest">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    const dayName = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'][currentTime.getDay()];
    // Visual day (forced monday on weekends)
    const visualDayName = (currentTime.getDay() === 0 || currentTime.getDay() === 6) ? 'SEGUNDA-FEIRA (TESTE)' : dayName;

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#050505] to-[#050505]">
            
            <header className="flex flex-col items-center justify-center pt-6 pb-2 shrink-0 z-10 relative">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-12 mb-2 opacity-90 drop-shadow-lg" alt="CEMAL Logo" />
                <div className="text-[7rem] md:text-[9rem] leading-[0.85] font-clock font-black tracking-tighter text-white drop-shadow-2xl tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-4 bg-[#1a1a1a]/80 border border-white/5 px-8 py-2 rounded-full backdrop-blur-md shadow-xl flex items-center gap-4">
                    <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.25em] flex items-center gap-2">
                        <Calendar size={14} className="text-red-500 mb-0.5"/> {visualDayName}
                    </p>
                    {connectionStatus ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14} className="text-red-500"/>}
                </div>
            </header>

            <main className="flex-1 px-4 md:px-8 pb-8 w-full max-w-[1920px] mx-auto flex flex-col justify-center">
                {/* AUTO FIT GRID FOR MORE CLASSES */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 h-full max-h-[70vh] content-start overflow-y-auto custom-scrollbar">
                     {displayData.map(({ cls, currentSlot, currentEntry, nextEntry, nextSlot }) => (
                        <div key={cls.id} className={`bg-[#0f0f10] rounded-[2rem] border flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-sm min-h-[200px] transition-all duration-500 ${currentEntry ? 'border-red-600/30' : 'border-white/5'}`}>
                            <div className="py-3 bg-white/[0.02] border-b border-white/5 text-center flex justify-between px-4 items-center">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">{cls.name}</h3>
                                {currentSlot ? (
                                    <span className="text-[9px] font-mono text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded flex items-center gap-1">
                                        <Clock size={10}/> {currentSlot.start}
                                    </span>
                                ) : (
                                    <span className="text-[8px] text-gray-700 font-bold uppercase tracking-wider">Aguardando</span>
                                )}
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center relative">
                                {currentSlot && currentSlot.type === 'break' ? (
                                     <div className="animate-pulse flex flex-col items-center gap-1">
                                        <p className="text-yellow-500 font-black uppercase text-2xl tracking-widest">Intervalo</p>
                                        <p className="text-[9px] text-yellow-500/50 font-bold uppercase tracking-widest">{currentSlot.label}</p>
                                     </div>
                                ) : currentEntry ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 w-full">
                                        <h4 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter mb-2 leading-none line-clamp-2 px-1 drop-shadow-lg">
                                            {currentEntry.subject}
                                        </h4>
                                        <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-900/40">
                                            <span className="text-white font-black uppercase text-[9px] tracking-widest truncate max-w-[120px]">
                                                {currentEntry.professor}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="opacity-10 flex flex-col items-center gap-2">
                                        <Monitor size={32} className="text-white"/>
                                        <p className="text-white font-black uppercase text-2xl tracking-[0.2em] select-none">LIVRE</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-black/40 border-t border-white/5 px-4 py-3 flex items-center justify-between gap-2 h-12">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest shrink-0">Próxima:</span>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-300 uppercase truncate">
                                    {nextEntry ? (
                                        nextEntry.subject === 'INTERVALO' ? (
                                            <span className="text-yellow-600 flex items-center gap-1 font-black"><Clock size={10}/> INTERVALO</span>
                                        ) : (
                                            <div className="flex flex-col items-end leading-none gap-0.5">
                                                <span className="text-white truncate font-black tracking-tight">{nextEntry.subject}</span>
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-gray-800 italic tracking-widest">--</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {schedule.length === 0 && connectionStatus && (
                    <div className="mt-8 mx-auto bg-red-600/20 border border-red-600/50 p-6 rounded-3xl flex items-center gap-4 text-red-500 animate-pulse w-fit">
                        <AlertCircle size={24}/>
                        <div>
                            <p className="font-black uppercase text-xs tracking-widest">Sincronização Pendente</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase">Aguardando dados do Painel Administrativo...</p>
                        </div>
                    </div>
                )}
            </main>

            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-600 z-50 py-3 overflow-hidden shadow-[0_-15px_40px_rgba(220,38,38,0.4)] border-t border-white/20">
                    <div className="animate-marquee whitespace-nowrap">
                        <p className="text-xl font-black text-white uppercase tracking-widest inline-block px-12">
                            AVISO: {sysConfig.bannerMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="fixed right-8 bottom-12 z-50 flex gap-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
                <button onClick={() => setAudioEnabled(!audioEnabled)} className="w-12 h-12 bg-black/80 border border-white/20 rounded-full text-gray-400 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all">
                    {audioEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                </button>
                <button onClick={() => window.location.reload()} className="w-12 h-12 bg-black/80 border border-white/20 rounded-full text-gray-400 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all">
                    <RefreshCw size={20}/>
                </button>
                <button onClick={() => document.documentElement.requestFullscreen()} className="w-12 h-12 bg-black/80 border border-white/20 rounded-full text-gray-400 hover:text-white flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all">
                    <Maximize2 size={20}/>
                </button>
            </div>

            <style>{`
                .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 30s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 38, 38, 0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
};
