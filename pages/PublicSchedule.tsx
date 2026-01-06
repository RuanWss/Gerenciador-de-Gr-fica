
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
// Adicionando 'School' aos ícones importados do lucide-react
import { Clock, X, Maximize2, Maximize, Minimize, Volume2, Megaphone, ArrowRight, School } from 'lucide-react';

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

export const PublicSchedule: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentStatus(now);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar entrar no modo tela cheia: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const checkCurrentStatus = (now: Date) => {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        let shift: 'morning' | 'afternoon' | 'off' = 'off';

        if (timeVal >= 420 && timeVal < 750) {
            shift = 'morning';
        } else if (timeVal >= 750 && timeVal < 1260) {
            shift = 'afternoon';
        }

        setCurrentShift(shift);

        if (shift !== 'off') {
            const slots = shift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS;
            const foundSlot = slots.find(s => {
                const [startH, startM] = s.start.split(':').map(Number);
                const [endH, endM] = s.end.split(':').map(Number);
                const startVal = startH * 60 + startM;
                const endVal = endH * 60 + endM;
                return timeVal >= startVal && timeVal < endVal;
            });

            if (foundSlot) {
                if (foundSlot.id !== lastSlotId.current) {
                    lastSlotId.current = foundSlot.id;
                    setCurrentSlot(foundSlot);
                    playAlert();
                }
            } else {
                lastSlotId.current = '';
                setCurrentSlot(null);
            }
        } else {
            setCurrentSlot(null);
        }
    };

    const isBannerVisible = () => {
        if (!sysConfig?.isBannerActive || !sysConfig.bannerMessage) return false;
        const now = currentTime.getTime();
        if (sysConfig.tvStart && now < new Date(sysConfig.tvStart).getTime()) return false;
        if (sysConfig.tvEnd && now > new Date(sysConfig.tvEnd).getTime()) return false;
        return true;
    };

    const enableAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setAudioEnabled(true);
            }).catch(() => {});
        }
    };

    const playAlert = () => {
        if (audioRef.current && audioEnabled) {
            audioRef.current.play().catch(() => {});
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }, 6000);
        }
    };

    const getEntry = (classId: string) => {
        if (!currentSlot) return null;
        const day = currentTime.getDay();
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === currentSlot.id);
    };

    const getNextEntry = (classId: string) => {
        if (!currentSlot) return null;
        const slots = currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS;
        const currentIndex = slots.findIndex(s => s.id === currentSlot.id);
        if (currentIndex === -1 || currentIndex === slots.length - 1) return null;
        let nextSlotIndex = currentIndex + 1;
        let nextSlot = slots[nextSlotIndex];
        if (nextSlot.type === 'break') {
            nextSlotIndex++;
            nextSlot = slots[nextSlotIndex];
        }
        if (!nextSlot) return null;
        const day = currentTime.getDay();
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === nextSlot.id);
    };

    const getFullEntry = (classId: string, slotId: string, day: number) => {
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === slotId);
    };

    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const activeClasses = currentShift === 'morning' ? MORNING_CLASSES : (currentShift === 'afternoon' ? AFTERNOON_CLASSES : []);

    return (
        <div className="h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col relative font-sans">
            {/* GRADIENT OVERLAY TOP */}
            <div className="absolute top-0 left-0 w-full h-[60%] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-transparent to-transparent pointer-events-none" />
            
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/98 flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                    <div className="bg-red-600 p-8 rounded-full mb-6 animate-pulse shadow-[0_0_60px_rgba(220,38,38,0.4)]">
                        <Volume2 size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Monitor CEMAL</h1>
                    <p className="text-lg font-medium text-gray-500">Clique para ativar áudio e sincronizar</p>
                </div>
            )}

            {/* HEADER AREA - AS PER IMAGE */}
            <header className="shrink-0 w-full flex flex-col items-center pt-8 pb-4 z-10">
                {/* LOGO */}
                <div className="mb-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[4.5vh] w-auto object-contain brightness-110" alt="Logo CEMAL" />
                </div>

                {/* CLOCK */}
                <h1 className="text-[clamp(6rem,18vh,24vh)] leading-[0.9] font-clock font-black text-white tabular-nums drop-shadow-2xl">
                    {timeString}
                </h1>

                {/* DATE PILL */}
                <div className="mt-6 bg-white/5 border border-white/10 px-10 py-2.5 rounded-full backdrop-blur-md">
                    <p className="text-[clamp(0.7rem,1.8vh,2.2vh)] text-gray-400 font-bold tracking-[0.25em] uppercase">{dateString}</p>
                </div>

                {/* SHIFT STATUS PILL */}
                <div className="mt-8 flex items-center gap-3 px-6 py-2 bg-black/40 rounded-full border border-white/5 shadow-xl">
                    <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[clamp(0.6rem,1.5vh,1.8vh)] font-black tracking-[0.2em] text-white uppercase">
                        {currentShift === 'morning' ? 'TURNO MATUTINO' : currentShift === 'afternoon' ? 'TURNO VESPERTINO' : 'SESSÃO ENCERRADA'}
                    </span>
                </div>
            </header>

            {/* SYSTEM BANNER - OPTIONAL OVERLAY */}
            {isBannerVisible() && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl z-50 animate-in slide-in-from-top-4">
                    <div className={`mx-4 p-4 rounded-2xl border-[4px] shadow-2xl flex items-center justify-center gap-4 ${
                        sysConfig?.bannerType === 'error' ? 'border-red-600 bg-red-900/60' : 
                        sysConfig?.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-900/60' : 
                        'border-blue-600 bg-blue-900/60'
                    }`}>
                        <Megaphone size={32} className="animate-bounce shrink-0" />
                        <p className="text-2xl md:text-3xl font-black uppercase text-center text-white">{sysConfig?.bannerMessage}</p>
                    </div>
                </div>
            )}

            {/* MAIN GRID - DYNAMIC AS PER IMAGE */}
            <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 pb-12 overflow-hidden flex items-center justify-center">
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] rounded-[3rem] border border-white/5 backdrop-blur-xl">
                        <School size={80} className="text-red-600/20 mb-6"/>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">C.E. Prof. Manoel Leite</h2>
                        <p className="text-xl text-red-500 font-bold uppercase tracking-[0.3em]">Aguardando próximo turno</p>
                     </div>
                ) : (
                    <div className="grid gap-6 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch content-center">
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <article key={cls.id} className="flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all hover:scale-[1.02] hover:border-red-900/50 group">
                                    <div className="shrink-0 bg-[#0a0a0a] flex items-center justify-center border-b border-white/5 p-4">
                                        <h2 className="text-[clamp(1.1rem,2.8vh,3.2vh)] font-black text-white uppercase tracking-tight truncate w-full text-center">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="flex-1 min-h-[180px] flex flex-col p-6">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
                                                <Clock size={40} className="text-yellow-600/40"/>
                                                <span className="text-2xl font-black text-yellow-600 uppercase tracking-widest">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="flex-[2] flex flex-col items-center justify-center text-center gap-1.5 mb-6">
                                                    <p className="text-[0.6rem] font-black text-red-600 uppercase tracking-[0.2em] opacity-80">AULA AGORA</p>
                                                    <h3 className="text-[clamp(1.4rem,4vh,5vh)] leading-[1.1] font-black text-white uppercase line-clamp-2">{entry.subject}</h3>
                                                    <p className="text-[clamp(0.8rem,1.8vh,2.2vh)] font-bold text-gray-400 uppercase truncate w-full">{entry.professor}</p>
                                                </div>

                                                <div className="shrink-0 flex flex-col items-center justify-center p-3.5 bg-white/[0.02] rounded-xl border border-white/5 relative group-hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[0.55rem] font-black text-gray-500 uppercase tracking-widest">A SEGUIR</span>
                                                        <ArrowRight size={10} className="text-red-900"/>
                                                    </div>

                                                    {nextEntry ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <p className="text-[clamp(0.8rem,2vh,2.4vh)] font-black text-gray-300 uppercase truncate w-full tracking-tight">{nextEntry.subject}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[clamp(0.7rem,1.8vh,2vh)] font-black text-gray-700 uppercase tracking-widest">FIM DO TURNO</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                                                <span className="text-[clamp(1.5rem,4vh,5vh)] font-black tracking-[0.4em] uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* FLOATING ACTION BUTTONS */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                <button 
                    onClick={toggleFullScreen} 
                    className="p-4 bg-black/60 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl active:scale-95"
                    aria-label={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-4 bg-black/60 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl active:scale-95"
                    aria-label="Ver Quadro Completo"
                >
                    <Maximize2 size={22} />
                </button>
            </div>

             {/* FULL SCHEDULE MODAL */}
             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-[#0c0c0e] rounded-[2rem] border border-white/10 flex flex-col overflow-hidden">
                        <header className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-[#141417] shrink-0">
                            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                                Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-red-600/10 p-3 rounded-xl hover:bg-red-600 text-red-500 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-auto p-6 md:p-10 custom-scrollbar">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                {/* MATUTINO */}
                                <section className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                                    <div className="bg-blue-600/10 p-4 border-b border-blue-600/10 text-center">
                                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Matutino (EFAF)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-black/60 text-white border-b border-white/10">
                                            <tr>
                                                <th className="p-3 font-black uppercase text-[10px] w-20 text-center">Hora</th>
                                                {MORNING_CLASSES.map(c => <th key={c.id} className="p-3 font-black uppercase text-[10px] text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {MORNING_SLOTS.map(slot => (
                                                <tr key={slot.id} className={`${slot.type === 'break' ? 'bg-yellow-500/5' : ''}`}>
                                                    <td className="p-3 text-center border-r border-white/5">
                                                        <span className="text-[10px] font-black text-red-600 font-mono">{slot.start}</span>
                                                    </td>
                                                    {MORNING_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                {slot.type === 'break' ? (
                                                                    <span className="text-[8px] font-black text-yellow-600 uppercase">INTERVALO</span>
                                                                ) : entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-[10px] uppercase truncate">{entry.subject}</span>
                                                                        <span className="text-[8px] text-gray-500 font-bold uppercase truncate">{entry.professor}</span>
                                                                    </div>
                                                                ) : <span className="text-gray-800 text-xs">—</span>}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>

                                {/* VESPERTINO */}
                                <section className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                                     <div className="bg-red-600/10 p-4 border-b border-red-600/10 text-center">
                                        <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">Vespertino (E.M.)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-black/60 text-white border-b border-white/10">
                                            <tr>
                                                <th className="p-3 font-black uppercase text-[10px] w-20 text-center">Hora</th>
                                                {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-3 font-black uppercase text-[10px] text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {AFTERNOON_SLOTS.map(slot => (
                                                <tr key={slot.id} className={`${slot.type === 'break' ? 'bg-yellow-500/5' : ''}`}>
                                                    <td className="p-3 text-center border-r border-white/5">
                                                        <span className="text-[10px] font-black text-red-600 font-mono">{slot.start}</span>
                                                    </td>
                                                    {AFTERNOON_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                {slot.type === 'break' ? (
                                                                    <span className="text-[8px] font-black text-yellow-600 uppercase">INTERVALO</span>
                                                                ) : entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-[10px] uppercase truncate">{entry.subject}</span>
                                                                        <span className="text-[8px] text-gray-500 font-bold uppercase truncate">{entry.professor}</span>
                                                                    </div>
                                                                ) : <span className="text-gray-800 text-xs">—</span>}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};
