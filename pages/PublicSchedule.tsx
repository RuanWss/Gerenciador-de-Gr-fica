
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Maximize2, Minimize, Volume2, VolumeX, ShieldCheck, Monitor, Bell } from 'lucide-react';

const EFAI_SLOTS: TimeSlot[] = [
    { id: 'e1', start: '07:30', end: '08:25', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'e2', start: '08:25', end: '09:20', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'eb1', start: '09:20', end: '09:40', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'e3', start: '09:40', end: '10:35', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'e4', start: '10:35', end: '11:30', type: 'class', label: '4º Horário', shift: 'morning' },
];

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

// Classes organizadas por turno para o Painel TV
const MORNING_CLASSES = [
    { id: '1efai', name: '1º EFAI', type: 'efai' },
    { id: '2efai', name: '2º EFAI', type: 'efai' },
    { id: '3efai', name: '3º EFAI', type: 'efai' },
    { id: '4efai', name: '4º EFAI', type: 'efai' },
    { id: '5efai', name: '5º EFAI', type: 'efai' },
    { id: '6efaf', name: '6º EFAF', type: 'efaf' },
    { id: '7efaf', name: '7º EFAF', type: 'efaf' },
    { id: '8efaf', name: '8º EFAF', type: 'efaf' },
    { id: '9efaf', name: '9º EFAF', type: 'efaf' },
];

const AFTERNOON_CLASSES = [
    { id: '1em', name: '1ª SÉRIE EM', type: 'em' },
    { id: '2em', name: '2ª SÉRIE EM', type: 'em' },
    { id: '3em', name: '3ª SÉRIE EM', type: 'em' },
];

const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const DEFAULT_PIN = "2016";

export const PublicSchedule: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('monitor_auth') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSlotId = useRef<string>('');

    // Efeito para sincronização em Tempo Real via Firebase Listener
    useEffect(() => {
        if (!isAuthorized) return;
        const unsubscribeSchedule = listenToSchedule((entries) => {
            console.log("Horários atualizados em tempo real:", entries.length);
            setSchedule(entries);
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

    useEffect(() => {
        const now = currentTime;
        const totalMinutes = now.getHours() * 60 + now.getMinutes();

        if (totalMinutes >= 420 && totalMinutes <= 750) setCurrentShift('morning');
        else if (totalMinutes >= 780 && totalMinutes <= 1260) setCurrentShift('afternoon');
        else setCurrentShift('morning'); // Default morning para visualização fora de hora
    }, [currentTime]);

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
            <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center p-6 z-[1000]">
                <div className="max-w-xs w-full text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 mx-auto" />
                    <h2 className="text-white font-black text-xl uppercase tracking-widest">Painel TV</h2>
                    <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'border-gray-800'}`}></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                            <button key={n} onClick={() => handlePinPress(n.toString())} className="h-16 bg-white/5 text-white text-2xl font-black rounded-2xl border border-white/5 active:scale-95 transition-all">{n}</button>
                        ))}
                    </div>
                    {pinError && <p className="text-red-500 font-black uppercase text-[10px] tracking-widest animate-bounce">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    const currentClasses = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
    const dayOfWeek = currentTime.getDay() || 1; // 1-5 (Seg-Sex)
    const dayName = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' });

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#220000_0%,_transparent_60%)] opacity-30 pointer-events-none"></div>

            <header className="relative z-10 flex items-center justify-between px-12 py-10 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
                <div className="flex items-center gap-10">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 w-auto" />
                    <div className="h-14 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Matriz de Horários</h1>
                        <p className="text-red-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Atualização em Tempo Real
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-1">{dayName}</p>
                        <p className="text-2xl font-black text-white uppercase tracking-tight">{currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                    </div>
                    <div className="text-center bg-white/5 px-10 py-4 rounded-[2rem] border border-white/10 shadow-2xl min-w-[240px]">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">Hora Certa</p>
                        <p className="text-6xl font-clock font-black tracking-tighter leading-none text-white">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 p-12 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {currentClasses.map(cls => {
                        const slots = cls.type === 'efai' ? EFAI_SLOTS : (currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS);
                        
                        // Encontra o slot atual baseado na hora do sistema
                        const currentSlot = slots.find(s => {
                            const [hS, mS] = s.start.split(':').map(Number);
                            const [hE, mE] = s.end.split(':').map(Number);
                            const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                            return nowMins >= (hS * 60 + mS) && nowMins < (hE * 60 + mE);
                        });

                        const currentEntry = currentSlot ? schedule.find(s => s.classId === cls.id && s.slotId === currentSlot.id && s.dayOfWeek === dayOfWeek) : null;

                        return (
                            <div key={cls.id} className={`bg-[#121214] rounded-[2rem] border transition-all duration-500 flex flex-col overflow-hidden shadow-2xl ${currentSlot ? 'border-white/10 scale-100' : 'border-white/5 opacity-60 scale-95'}`}>
                                <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">{cls.name}</h3>
                                    {currentSlot && <div className="px-3 py-1 bg-red-600/10 text-red-500 text-[8px] font-black uppercase rounded-full border border-red-500/20">Ao Vivo</div>}
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-center">
                                    {currentSlot ? (
                                        currentSlot.type === 'break' ? (
                                            <div className="text-center animate-pulse">
                                                <p className="text-yellow-500 font-black uppercase text-xl tracking-tighter">INTERVALO</p>
                                                <p className="text-[9px] text-gray-500 font-bold mt-1 uppercase">{currentSlot.start} - {currentSlot.end}</p>
                                            </div>
                                        ) : currentEntry ? (
                                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                                <h4 className="text-xl font-black text-white uppercase leading-tight mb-2">{currentEntry.subject}</h4>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-red-600 rounded-full"></div>
                                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{currentEntry.professor}</p>
                                                </div>
                                                <p className="text-[9px] text-gray-600 font-bold mt-4 uppercase">Horário: {currentSlot.start} - {currentSlot.end}</p>
                                            </div>
                                        ) : (
                                            <div className="text-center opacity-20">
                                                <p className="text-gray-500 font-black uppercase text-sm tracking-widest">Sem Aula</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center opacity-20 py-4">
                                            <p className="text-gray-700 font-black uppercase text-[10px] tracking-widest">Fora de Horário</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
                <div className="relative z-20 w-full bg-red-600 py-4 px-12 flex items-center justify-center gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
                    <Bell className="text-white shrink-0" size={24} />
                    <p className="text-xl font-black text-white uppercase tracking-tighter whitespace-nowrap animate-marquee">
                        AVISO IMPORTANTE: {sysConfig.bannerMessage} • {sysConfig.bannerMessage} • {sysConfig.bannerMessage}
                    </p>
                </div>
            )}

            <div className={`fixed right-8 bottom-8 z-50 flex flex-col gap-4 transition-all duration-700 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <button onClick={toggleFullscreen} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-white/10 transition-all">
                    {isFullscreen ? <Minimize size={24}/> : <Maximize2 size={24}/>}
                </button>
                <button onClick={() => { sessionStorage.removeItem('monitor_auth'); window.location.reload(); }} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-gray-500 rounded-2xl flex items-center justify-center shadow-2xl hover:text-red-500 transition-all">
                    <Monitor size={24}/>
                </button>
            </div>
            
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(20%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                    display: inline-block;
                }
            `}</style>
        </div>
    );
};
