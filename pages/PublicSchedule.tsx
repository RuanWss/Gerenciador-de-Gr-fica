
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, X, Maximize2, Maximize, Minimize, Volume2, Megaphone, ArrowRight, School, Timer, User, BookOpen, List } from 'lucide-react';

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
    const [progress, setProgress] = useState(0);
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
        const seconds = now.getSeconds();
        const timeVal = hours * 60 + minutes;
        const exactTimeVal = timeVal + seconds / 60;

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
                return exactTimeVal >= startVal && exactTimeVal < endVal;
            });

            if (foundSlot) {
                const [startH, startM] = foundSlot.start.split(':').map(Number);
                const [endH, endM] = foundSlot.end.split(':').map(Number);
                const startVal = startH * 60 + startM;
                const endVal = endH * 60 + endM;
                const totalDuration = endVal - startVal;
                const elapsed = exactTimeVal - startVal;
                setProgress((elapsed / totalDuration) * 100);

                if (foundSlot.id !== lastSlotId.current) {
                    lastSlotId.current = foundSlot.id;
                    setCurrentSlot(foundSlot);
                    playAlert();
                }
            } else {
                lastSlotId.current = '';
                setCurrentSlot(null);
                setProgress(0);
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
    const bannerVisible = isBannerVisible();

    return (
        <div className="h-screen w-full bg-black text-white overflow-hidden flex flex-col relative font-sans">
            {/* BACKGROUND GRADIENT */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black"></div>
            
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                    <div className="bg-red-600 p-8 rounded-full mb-6 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                        <Volume2 size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Monitor CEMAL</h1>
                    <p className="text-lg font-medium text-gray-500">Clique em qualquer lugar para sincronizar o áudio</p>
                </div>
            )}

            {/* HEADER AREA */}
            <header className="shrink-0 w-full flex flex-col items-center pt-8 pb-4 z-10 relative">
                {/* LOGO AND SUBTITLE */}
                <div className="mb-4 flex items-center gap-4">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[4vh] w-auto object-contain" alt="Logo CEMAL" />
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="flex flex-col">
                        <span className="text-[1.6vh] font-black text-red-600 tracking-widest uppercase leading-none">Quadro de Horários</span>
                        <span className="text-[1.2vh] text-gray-500 font-bold uppercase">{currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno Vespertino' : 'Sessão Encerrada'}</span>
                    </div>
                </div>

                {/* CLOCK & ANNOUNCEMENT ROW */}
                <div className={`flex items-center justify-center gap-12 w-full max-w-[1700px] px-10 transition-all duration-700 ease-in-out`}>
                    
                    {/* ANNOUNCEMENT BOX (LEFT) */}
                    {bannerVisible && (
                        <div className="flex-1 max-w-2xl bg-white/[0.03] border-l-8 border-red-600 p-8 rounded-[2rem] backdrop-blur-3xl shadow-2xl animate-in slide-in-from-left duration-700 ease-out border border-white/5">
                            <div className="flex items-center gap-4 mb-4 text-red-500">
                                <div className="p-3 bg-red-600/10 rounded-2xl">
                                    <Megaphone size={32} className="animate-bounce" />
                                </div>
                                <span className="font-black uppercase tracking-[0.2em] text-xl">Comunicado</span>
                            </div>
                            <p className="text-[clamp(1.5rem,3vh,3.5vh)] font-bold leading-tight text-white/90 italic">
                                "{sysConfig?.bannerMessage}"
                            </p>
                        </div>
                    )}

                    {/* CLOCK CONTAINER (MOVES RIGHT IF BANNER IS ACTIVE) */}
                    <div className={`flex flex-col items-center transition-all duration-700 ${bannerVisible ? 'items-end flex-initial' : 'flex-initial'}`}>
                        <h1 className="text-[clamp(6rem,18vh,22vh)] leading-none font-clock font-black text-white tracking-tighter tabular-nums drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] select-none">
                            {timeString}
                        </h1>
                        <div className="mt-2 bg-white/5 border border-white/10 px-8 py-2 rounded-full backdrop-blur-md">
                            <p className="text-[2.2vh] text-gray-300 font-bold tracking-widest uppercase">{dateString}</p>
                        </div>
                    </div>
                </div>

                {/* PROGRESS BAR FOR CURRENT CLASS */}
                {currentSlot && (
                    <div className="w-full max-w-4xl mt-8 px-6">
                        <div className="flex justify-between items-end mb-2">
                             <span className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                <Timer size={14}/> {currentSlot.label} ({currentSlot.start} - {currentSlot.end})
                             </span>
                             <span className="text-xs font-black text-gray-500 uppercase">{Math.round(progress)}% Concluído</span>
                        </div>
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                            <div 
                                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN GRID */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-8 pb-12 overflow-hidden flex items-center justify-center z-10">
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-16 text-center bg-white/[0.03] rounded-[3rem] border border-white/10 backdrop-blur-2xl">
                        <School size={120} className="text-red-600/30 mb-8"/>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">C.E. Prof. Manoel Leite</h2>
                        <p className="text-2xl text-red-500 font-bold uppercase tracking-[0.4em] animate-pulse">Aguardando próximo turno</p>
                     </div>
                ) : (
                    <div className="grid gap-8 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 content-center items-stretch h-full py-4">
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <article key={cls.id} className="flex flex-col bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all relative group hover:bg-white/5 hover:border-red-600/30">
                                    {/* CLASS HEADER */}
                                    <div className="bg-black/40 flex items-center justify-center p-6 border-b border-white/5">
                                        <h2 className="text-[clamp(1.2rem,3vh,3.5vh)] font-black text-white uppercase tracking-tight truncate w-full text-center">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col p-8 space-y-8">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-pulse">
                                                <div className="h-24 w-24 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                                                    <Clock size={48}/>
                                                </div>
                                                <span className="text-3xl font-black text-yellow-500 uppercase tracking-[0.2em]">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                {/* CURRENT SUBJECT */}
                                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                                    <span className="inline-block px-3 py-1 bg-red-600/10 text-red-500 rounded-full text-[1.2vh] font-black uppercase tracking-widest mb-4 border border-red-500/20">
                                                        Aula Agora
                                                    </span>
                                                    <h3 className="text-[clamp(1.5rem,4.5vh,5.5vh)] leading-[1.1] font-black text-white uppercase line-clamp-2 drop-shadow-lg mb-3">
                                                        {entry.subject}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[1.8vh] tracking-tight">
                                                        <User size={16} className="text-red-600"/>
                                                        <span>{entry.professor}</span>
                                                    </div>
                                                </div>

                                                {/* NEXT SUBJECT HINT */}
                                                <div className="shrink-0 bg-black/60 p-5 rounded-3xl border border-white/5 relative">
                                                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-gray-800 rounded-full border border-white/10">
                                                        <span className="text-[1vh] font-black text-gray-500 uppercase tracking-widest">A Seguir</span>
                                                    </div>
                                                    
                                                    {nextEntry ? (
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-[1.8vh] font-black text-gray-300 uppercase truncate tracking-tight">{nextEntry.subject}</p>
                                                            <p className="text-[1.4vh] text-gray-500 font-bold uppercase truncate opacity-80">{nextEntry.professor}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[1.6vh] font-black text-gray-700 uppercase tracking-widest text-center py-2">Fim do Turno</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                                <BookOpen size={80} className="mb-6" />
                                                <span className="text-[3vh] font-black tracking-[0.5em] uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* AMBIENT ACCENT */}
                                    <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600/50 to-transparent transition-all ${entry ? 'opacity-100' : 'opacity-0'}`}></div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* FLOATING ACTION BUTTONS */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
                <button 
                    onClick={toggleFullScreen} 
                    className="p-5 bg-black/40 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl active:scale-95"
                    aria-label={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-5 bg-black/40 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl active:scale-95"
                    aria-label="Ver Quadro Completo"
                >
                    <Maximize2 size={24} />
                </button>
            </div>

             {/* FULL SCHEDULE MODAL (OVERLAY) */}
             {showModal && (
                 <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-7xl bg-[#0c0c0e] rounded-[3rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                        <header className="p-8 border-b border-white/10 flex justify-between items-center bg-[#141417]">
                            <div>
                                <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                                    <List className="text-red-600"/> Grade Geral de Horários
                                </h2>
                                <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">Sincronizado com a base de dados central</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-red-600 text-white p-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
                                <X size={32} />
                            </button>
                        </header>
                        
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                                {/* MATUTINO TABLE */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-xl w-fit">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Matutino (EFAF)</h3>
                                    </div>
                                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-black/60 text-gray-400 border-b border-white/10 text-[10px] font-black uppercase tracking-widest">
                                                <tr>
                                                    <th className="p-4 text-center w-24">Hora</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="p-4 text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {MORNING_SLOTS.map(slot => (
                                                    <tr key={slot.id} className={`hover:bg-white/[0.02] ${slot.type === 'break' ? 'bg-yellow-500/5' : ''}`}>
                                                        <td className="p-4 text-center border-r border-white/5">
                                                            <span className="text-xs font-black text-red-600 font-mono">{slot.start}</span>
                                                        </td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-4 text-center border-l border-white/5">
                                                                    {slot.type === 'break' ? (
                                                                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-tighter">INTERVALO</span>
                                                                    ) : entry ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-white text-[11px] uppercase truncate max-w-[120px]">{entry.subject}</span>
                                                                            <span className="text-[9px] text-gray-500 font-medium uppercase truncate max-w-[120px]">{entry.professor}</span>
                                                                        </div>
                                                                    ) : <span className="text-gray-800 text-xs">—</span>}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* VESPERTINO TABLE */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-xl w-fit">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">Vespertino (E.M.)</h3>
                                    </div>
                                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-black/60 text-gray-400 border-b border-white/10 text-[10px] font-black uppercase tracking-widest">
                                                <tr>
                                                    <th className="p-4 text-center w-24">Hora</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-4 text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {AFTERNOON_SLOTS.map(slot => (
                                                    <tr key={slot.id} className={`hover:bg-white/[0.02] ${slot.type === 'break' ? 'bg-yellow-500/5' : ''}`}>
                                                        <td className="p-4 text-center border-r border-white/5">
                                                            <span className="text-xs font-black text-red-600 font-mono">{slot.start}</span>
                                                        </td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-4 text-center border-l border-white/5">
                                                                    {slot.type === 'break' ? (
                                                                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-tighter">INTERVALO</span>
                                                                    ) : entry ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-white text-[11px] uppercase truncate max-w-[120px]">{entry.subject}</span>
                                                                            <span className="text-[9px] text-gray-500 font-medium uppercase truncate max-w-[120px]">{entry.professor}</span>
                                                                        </div>
                                                                    ) : <span className="text-gray-800 text-xs">—</span>}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
             )}

            <style>{`
                @keyframes pulse-soft {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse-soft {
                    animation: pulse-soft 3s ease-in-out infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};
