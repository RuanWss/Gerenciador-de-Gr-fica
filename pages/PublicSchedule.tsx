
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Maximize2, Monitor, Volume2, VolumeX, Wifi, WifiOff, ArrowRight } from 'lucide-react';
import { EFAI_CLASSES } from '../constants';

// Sons para os alertas
const SOUND_SHORT = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; // Ding discreto
const SOUND_LONG = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=school-bell-199584.mp3"; // Sino de escola

// --- CONFIGURAÇÃO DE HORÁRIOS (Idêntico ao Admin) ---

// Horários do Fundamental II (6º ao 9º)
const MORNING_SLOTS_EFAF: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

// Horários do Fundamental I (1º ao 5º)
const MORNING_SLOTS_EFAI: TimeSlot[] = [
    { id: 'm1', start: '07:30', end: '08:25', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:25', end: '09:20', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:20', end: '09:40', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:40', end: '10:35', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:35', end: '11:30', type: 'class', label: '4º Horário', shift: 'morning' },
];

// Horários do Ensino Médio
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

// Gerar lista de IDs compatíveis
const EFAI_CLASSES_LIST = EFAI_CLASSES.map(c => ({
    id: c.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: c,
    type: 'EFAI'
}));

const MORNING_CLASSES = [
    ...EFAI_CLASSES_LIST,
    { id: '6efaf', name: '6º EFAF', type: 'EFAF' },
    { id: '7efaf', name: '7º EFAF', type: 'EFAF' },
    { id: '8efaf', name: '8º EFAF', type: 'EFAF' },
    { id: '9efaf', name: '9º EFAF', type: 'EFAF' },
];

const AFTERNOON_CLASSES = [
    { id: '1em', name: '1ª SÉRIE EM', type: 'EM' },
    { id: '2em', name: '2ª SÉRIE EM', type: 'EM' },
    { id: '3em', name: '3ª SÉRIE EM', type: 'EM' },
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(true);
    
    // Audio
    const [audioEnabled, setAudioEnabled] = useState(true);
    // Armazena o ID do slot atual para cada TIPO de horário (EFAI, EFAF, EM) para evitar conflitos de alarme
    const lastSlotsRef = useRef<{EFAI: string|null, EFAF: string|null, EM: string|null}>({ EFAI: null, EFAF: null, EM: null });
    const audioShortRef = useRef<HTMLAudioElement | null>(null);
    const audioLongRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioShortRef.current = new Audio(SOUND_SHORT);
        audioLongRef.current = new Audio(SOUND_LONG);
        audioShortRef.current.load();
        audioLongRef.current.load();
    }, []);

    useEffect(() => {
        if (!isAuthorized) return;
        
        const unsubscribeSchedule = listenToSchedule((data) => {
            setSchedule(data);
            setConnectionStatus(true);
        });
        
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        
        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
        };
    }, [isAuthorized]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Lógica Central de Horário e Alarme
    useEffect(() => {
        const now = currentTime;
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const seconds = now.getSeconds();
        
        // Determinar Turno Geral (para exibir as turmas corretas)
        let newShift: 'morning' | 'afternoon' | 'off' = 'morning';
        if (totalMinutes >= 420 && totalMinutes <= 750) newShift = 'morning'; // 07:00 - 12:30
        else if (totalMinutes >= 780 && totalMinutes <= 1260) newShift = 'afternoon'; // 13:00 - 21:00
        setCurrentShift(newShift);

        // Função para verificar mudança de slot em um grupo de horários
        const checkSlotChange = (slots: TimeSlot[], type: 'EFAI' | 'EFAF' | 'EM') => {
            const currentSlot = slots.find(s => {
                const [hS, mS] = s.start.split(':').map(Number);
                const [hE, mE] = s.end.split(':').map(Number);
                const startMins = hS * 60 + mS;
                const endMins = hE * 60 + mE;
                return totalMinutes >= startMins && totalMinutes < endMins;
            });

            const currentId = currentSlot ? currentSlot.id : 'free';
            const lastId = lastSlotsRef.current[type];

            if (lastId !== null && lastId !== currentId && audioEnabled) {
                // Tocar som apenas se não tocou recentemente (evita flood se EFAI e EFAF trocarem quase juntos)
                console.log(`[ALARM ${type}] Change from ${lastId} to ${currentId}`);
                
                const prevSlot = slots.find(s => s.id === lastId);
                const isBreak = currentSlot?.type === 'break' || prevSlot?.type === 'break';

                // Prioridade: Intervalo (Longo) > Troca (Curto)
                if (isBreak) {
                    audioLongRef.current?.play().catch(e => console.warn("Audio blocked:", e));
                } else if (currentId !== 'free') {
                    audioShortRef.current?.play().catch(e => console.warn("Audio blocked:", e));
                }
            }
            lastSlotsRef.current[type] = currentId;
        };

        // Verifica alarmes para todos os tipos relevantes no turno atual
        if (seconds === 0 || lastSlotsRef.current.EFAF === null) { // Checa a cada minuto ou na inicialização
            if (newShift === 'morning') {
                checkSlotChange(MORNING_SLOTS_EFAI, 'EFAI');
                checkSlotChange(MORNING_SLOTS_EFAF, 'EFAF');
            } else if (newShift === 'afternoon') {
                checkSlotChange(AFTERNOON_SLOTS, 'EM');
            }
        }

    }, [currentTime, audioEnabled]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
        setIsFullscreen(!isFullscreen);
    };

    const handlePinPress = (num: string) => {
        if (pin.length >= 4) return;
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
            if (newPin === DEFAULT_PIN) {
                // Unlock Audio Context
                const unlock = () => {
                    if (audioShortRef.current) {
                        audioShortRef.current.play().then(() => {
                            audioShortRef.current?.pause();
                            audioShortRef.current!.currentTime = 0;
                        }).catch(() => {});
                    }
                };
                unlock();
                
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
                    <h2 className="text-white font-black text-xl uppercase tracking-widest">Painel TV</h2>
                    <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'border-gray-800'}`}></div>
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

    const currentClasses = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
    const rawDay = currentTime.getDay();
    const dayOfWeek = (rawDay === 0 || rawDay === 6) ? 1 : rawDay;

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#050505] to-[#050505]">
            
            {/* Header Section */}
            <header className="flex flex-col items-center justify-center pt-6 pb-2 shrink-0 z-10 relative">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-12 mb-2 opacity-90 drop-shadow-lg" alt="CEMAL Logo" />
                <div className="text-[7rem] md:text-[9rem] leading-[0.85] font-clock font-black tracking-tighter text-white drop-shadow-2xl tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-4 bg-[#1a1a1a]/80 border border-white/5 px-8 py-2 rounded-full backdrop-blur-md shadow-xl flex items-center gap-4">
                    <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.25em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {connectionStatus ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14} className="text-red-500"/>}
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 px-4 md:px-8 pb-8 w-full max-w-[1920px] mx-auto flex flex-col justify-center">
                <div className="grid h-full max-h-[60vh] gap-4" style={{ gridTemplateColumns: `repeat(${Math.ceil(currentClasses.length / 2)}, 1fr)` }}>
                    <div className="contents">
                         {currentClasses.map(cls => {
                            // 1. Determina qual grade de horários usar para esta turma específica
                            let slots: TimeSlot[] = [];
                            if (currentShift === 'morning') {
                                slots = cls.type === 'EFAI' ? MORNING_SLOTS_EFAI : MORNING_SLOTS_EFAF;
                            } else {
                                slots = AFTERNOON_SLOTS;
                            }

                            // 2. Encontra o slot atual baseado na hora
                            const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                            const currentSlotIndex = slots.findIndex(s => {
                                const [hS, mS] = s.start.split(':').map(Number);
                                const [hE, mE] = s.end.split(':').map(Number);
                                return nowMins >= (hS * 60 + mS) && nowMins < (hE * 60 + mE);
                            });
                            
                            const currentSlot = currentSlotIndex !== -1 ? slots[currentSlotIndex] : null;
                            const nextSlot = currentSlotIndex !== -1 && currentSlotIndex + 1 < slots.length ? slots[currentSlotIndex + 1] : null;

                            // 3. Busca os dados no Schedule do Firebase
                            const currentEntry = schedule.find(s => 
                                s.classId === cls.id && 
                                s.slotId === (currentSlot?.id || 'free') && 
                                s.dayOfWeek === dayOfWeek
                            );

                            // 4. Busca a próxima aula (Se não for intervalo)
                            let nextEntry = null;
                            if (nextSlot) {
                                if (nextSlot.type === 'break') {
                                    nextEntry = { subject: 'INTERVALO', professor: '' };
                                } else {
                                    const entry = schedule.find(s => 
                                        s.classId === cls.id && 
                                        s.slotId === nextSlot.id && 
                                        s.dayOfWeek === dayOfWeek
                                    );
                                    nextEntry = entry ? { subject: entry.subject, professor: entry.professor } : null;
                                }
                            }

                            return (
                                <div key={cls.id} className="bg-[#0f0f10] rounded-[1.5rem] border border-white/5 flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-sm min-h-[160px]">
                                    <div className="py-2 bg-white/[0.02] border-b border-white/5 text-center flex justify-between px-4 items-center">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{cls.name}</h3>
                                        {currentSlot && <span className="text-[9px] font-mono text-gray-600">{currentSlot.start} - {currentSlot.end}</span>}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center relative">
                                        {currentSlot && currentSlot.type === 'break' ? (
                                             <div className="animate-pulse">
                                                <p className="text-yellow-500/80 font-black uppercase text-xl tracking-widest">Intervalo</p>
                                             </div>
                                        ) : currentEntry ? (
                                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 w-full">
                                                <h4 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter mb-1 leading-tight break-words max-w-full line-clamp-2">
                                                    {currentEntry.subject}
                                                </h4>
                                                <span className="bg-white/5 border border-white/10 px-3 py-0.5 rounded-full text-gray-400 font-bold uppercase text-[9px] tracking-widest truncate max-w-[90%]">
                                                    {currentEntry.professor}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-[#1a1a1a] font-black uppercase text-2xl tracking-widest select-none">LIVRE</p>
                                        )}
                                    </div>

                                    {/* PRÓXIMA AULA (RODAPÉ DISCRETO) */}
                                    {nextEntry && (
                                        <div className="bg-black/40 border-t border-white/5 px-4 py-2 flex items-center justify-center gap-2">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">A SEGUIR:</span>
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase">
                                                {nextEntry.subject === 'INTERVALO' ? (
                                                    <span className="text-yellow-600">INTERVALO</span>
                                                ) : (
                                                    <>
                                                        <span className="text-gray-300 truncate max-w-[100px]">{nextEntry.subject}</span>
                                                        {nextEntry.professor && <span className="text-gray-600">({nextEntry.professor})</span>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Banner Overlay */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-600 z-50 py-3 overflow-hidden shadow-[0_-10px_30px_rgba(220,38,38,0.3)]">
                    <div className="animate-marquee whitespace-nowrap">
                        <p className="text-xl font-black text-white uppercase tracking-widest inline-block px-8">
                            AVISO IMPORTANTE: {sysConfig.bannerMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="fixed right-8 bottom-8 z-50 flex gap-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
                <button onClick={() => setAudioEnabled(!audioEnabled)} className="w-12 h-12 bg-black/50 border border-white/10 rounded-full text-gray-500 hover:text-white flex items-center justify-center backdrop-blur-md">
                    {audioEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
                </button>
                <button onClick={() => window.location.reload()} className="w-12 h-12 bg-black/50 border border-white/10 rounded-full text-gray-500 hover:text-white flex items-center justify-center backdrop-blur-md">
                    <Monitor size={18}/>
                </button>
                <button onClick={toggleFullscreen} className="w-12 h-12 bg-black/50 border border-white/10 rounded-full text-gray-500 hover:text-white flex items-center justify-center backdrop-blur-md">
                    <Maximize2 size={18}/>
                </button>
            </div>

            <style>{`
                .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 20s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
            `}</style>
        </div>
    );
};
