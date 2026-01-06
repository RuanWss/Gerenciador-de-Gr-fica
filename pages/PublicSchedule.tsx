
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Calendar, X, Maximize2, Maximize, Minimize, Volume2, Megaphone, ArrowRight, School } from 'lucide-react';

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
    { id: '6efaf', name: '6º ANO EFAF' },
    { id: '7efaf', name: '7º ANO EFAF' },
    { id: '8efaf', name: '8º ANO EFAF' },
    { id: '9efaf', name: '9º ANO EFAF' },
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
        
        if (sysConfig.tvStart || sysConfig.tvEnd) {
            const now = currentTime.getTime();
            if (sysConfig.tvStart && now < new Date(sysConfig.tvStart).getTime()) return false;
            if (sysConfig.tvEnd && now > new Date(sysConfig.tvEnd).getTime()) return false;
        }
        
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

    const showWarning = isBannerVisible();

    return (
        <div className="h-[100dvh] w-full bg-[#050000] bg-gradient-to-br from-black via-[#1a0000] to-black text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                    <div className="bg-red-600 p-6 md:p-10 rounded-full mb-6 animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]">
                        <Volume2 size={48} className="md:w-20 md:h-20" />
                    </div>
                    <h1 className="text-2xl md:text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">Monitor CEMAL</h1>
                    <p className="text-lg md:text-2xl font-medium text-gray-400">Toque na tela para ativar áudio</p>
                </div>
            )}

            {/* HEADER - RESPONSIVE STACKING */}
            <header className="shrink-0 w-full flex flex-col lg:flex-row border-b border-white/10 bg-black/40 backdrop-blur-md z-10 transition-all">
                <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 transition-all duration-700`}>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[5vh] md:h-[7vh] lg:h-[8vh] w-auto object-contain mb-2 md:mb-4 drop-shadow-xl" alt="Logo CEMAL" />
                    
                    <h1 className="text-[clamp(3.5rem,14vh,20vh)] leading-none tracking-tighter text-white drop-shadow-2xl font-clock font-black tabular-nums text-center">
                        {timeString}
                    </h1>
                    
                    <div className="mt-1 md:mt-2 bg-red-600/10 px-4 md:px-8 py-1 md:py-2 rounded-full border border-red-600/20 shadow-xl backdrop-blur-sm">
                        <p className="text-[clamp(0.7rem,1.8vh,2.5vh)] text-red-500 font-black tracking-[0.2em] md:tracking-[0.4em] uppercase text-center">{dateString}</p>
                    </div>
                </div>

                {showWarning && (
                    <div className="w-full lg:w-[40%] flex items-center justify-center p-4 lg:p-6 bg-red-950/20 border-t lg:border-t-0 lg:border-l border-white/10 animate-in slide-in-from-right duration-700">
                        <div className={`w-full max-w-2xl flex flex-col items-center justify-center gap-2 md:gap-4 p-4 md:p-6 lg:p-8 border-[4px] md:border-[8px] rounded-3xl md:rounded-[3rem] shadow-2xl relative overflow-hidden transition-all ${
                            sysConfig?.bannerType === 'error' ? 'border-red-600 bg-red-900/40' : 
                            sysConfig?.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-900/40' : 
                            sysConfig?.bannerType === 'success' ? 'border-green-500 bg-green-900/40' : 
                            'border-blue-600 bg-blue-900/40'
                        }`}>
                            <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-white/20 animate-pulse"></div>
                            <Megaphone size={32} className={`${
                                sysConfig?.bannerType === 'error' ? 'text-red-500' : 
                                sysConfig?.bannerType === 'warning' ? 'text-yellow-500' :
                                sysConfig?.bannerType === 'success' ? 'text-green-500' :
                                'text-blue-500'
                            } animate-bounce md:w-16 md:h-16 lg:w-20 lg:h-20`} />
                            <p className="text-[clamp(1.1rem,4vh,5.5vh)] font-black uppercase text-center leading-[1.2] tracking-tighter text-white drop-shadow-lg">
                                {sysConfig?.bannerMessage}
                            </p>
                        </div>
                    </div>
                )}
            </header>

            {/* STATUS BAR */}
            <div className="h-auto py-2 shrink-0 z-10 px-4 bg-black/20 flex items-center justify-center border-b border-white/5">
                 <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-1 bg-white/5 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                    <span className={`h-2 w-2 md:h-3 md:w-3 rounded-full shadow-[0_0_10px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[clamp(0.6rem,1.5vh,1.8vh)] font-black tracking-widest text-white uppercase whitespace-nowrap">
                        {currentShift === 'morning' ? 'Turno Matutino (EFAF)' : currentShift === 'afternoon' ? 'Turno Vespertino (E.M.)' : 'Sessão Encerrada'}
                    </span>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 w-full p-4 md:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden flex items-center justify-center relative bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'url("https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png")', backgroundBlendMode: 'overlay', opacity: 1 }}>
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000 max-w-4xl">
                        <div className="bg-black/60 p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] border border-white/10 shadow-2xl backdrop-blur-xl">
                            <School size={80} className="text-red-600/40 mb-6 mx-auto md:w-32 md:h-32"/>
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">C.E. Prof. Manoel Leite</h2>
                            <p className="text-lg md:text-2xl text-red-500 font-bold uppercase tracking-[0.3em]">CEMAL EQUIPE • 10 ANOS</p>
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <p className="text-gray-400 font-medium italic">Aguardando início do próximo turno...</p>
                            </div>
                        </div>
                     </div>
                ) : (
                    <div className="grid gap-4 md:gap-6 lg:gap-8 w-full h-full max-w-[100vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch content-center">
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <article key={cls.id} className="flex flex-col bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[220px] transition-all hover:scale-[1.02] hover:border-red-600/40 group">
                                    <div className="shrink-0 bg-gradient-to-r from-red-600/20 to-transparent flex items-center justify-center border-b border-white/10 p-3 md:p-4">
                                        <h2 className="text-[clamp(1rem,3vh,3.5vh)] font-black text-white uppercase tracking-tighter truncate w-full text-center drop-shadow-md">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="flex-1 relative w-full flex flex-col p-4 md:p-6">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 animate-pulse">
                                                <Clock size={48} className="text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] md:w-20 md:h-20"/>
                                                <span className="text-[clamp(1.5rem,5vh,7vh)] font-black text-yellow-500 uppercase tracking-widest">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="flex-[2] flex flex-col items-center justify-center text-center gap-1 md:gap-2 mb-4">
                                                    <p className="text-[clamp(0.6rem,1.2vh,1.5vh)] font-black text-red-500 uppercase tracking-[0.2em]">Aula Agora</p>
                                                    <h3 className="text-[clamp(1.5rem,5vh,6.5vh)] leading-[1.1] font-black text-white uppercase drop-shadow-xl line-clamp-2">{entry.subject}</h3>
                                                    <p className="text-[clamp(0.8rem,2.2vh,3vh)] font-bold text-gray-300 uppercase truncate w-full tracking-wide">{entry.professor}</p>
                                                </div>

                                                <div className="shrink-0 flex flex-col items-center justify-center p-3 md:p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:bg-white/10 transition-colors">
                                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600 shadow-[0_0_10px_#dc2626]"></div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[clamp(0.55rem,1.4vh,1.8vh)] font-black text-gray-500 uppercase tracking-widest">Próxima Aula</span>
                                                        <ArrowRight size={12} className="text-red-600 md:w-4 md:h-4"/>
                                                    </div>

                                                    {nextEntry ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <p className="text-[clamp(0.9rem,2.4vh,3vh)] font-black text-gray-100 uppercase truncate w-full tracking-tight">{nextEntry.subject}</p>
                                                            <p className="text-[clamp(0.6rem,1.6vh,2vh)] font-bold text-gray-500 uppercase truncate w-full">{nextEntry.professor}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[clamp(0.7rem,1.8vh,2.2vh)] font-black text-gray-600 uppercase tracking-widest">Final do Turno</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
                                                <span className="text-[clamp(1.2rem,4vh,5vh)] font-black tracking-[0.5em] uppercase text-gray-500">LIVRE</span>
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
            <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col gap-3 md:gap-4 z-50">
                <button 
                    onClick={toggleFullScreen} 
                    className="p-3 md:p-5 lg:p-6 bg-black/60 hover:bg-red-600 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl group active:scale-95"
                    aria-label={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize size={24} className="md:w-8 md:h-8" /> : <Maximize size={24} className="md:w-8 md:h-8 group-hover:rotate-45 transition-transform" />}
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-3 md:p-5 lg:p-6 bg-black/60 hover:bg-blue-600 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl shadow-2xl group active:scale-95"
                    aria-label="Ver Quadro Completo"
                >
                    <Maximize2 size={24} className="md:w-8 md:h-8 group-hover:scale-110 transition-transform" />
                </button>
            </div>

             {/* QUADRO GERAL MODAL */}
             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-[98vw] max-h-[98vh] bg-[#0c0c0e] rounded-2xl md:rounded-[3rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.15)]">
                        <header className="p-4 md:p-8 border-b border-white/10 flex justify-between items-center bg-[#141417] shrink-0">
                            <h2 className="text-xl md:text-3xl font-black text-white flex items-center gap-3 md:gap-4 uppercase tracking-tighter">
                                <Calendar size={24} className="text-red-600 md:w-10 md:h-10"/> Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-red-600/10 p-3 md:p-5 rounded-xl md:rounded-2xl hover:bg-red-600 text-red-500 hover:text-white transition-all group">
                                <X size={24} className="md:w-8 md:h-8 group-hover:rotate-90 transition-transform" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 custom-scrollbar bg-[#0c0c0e]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
                                {/* TABELA MATUTINO */}
                                <section className="bg-white/[0.02] rounded-2xl md:rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                                    <div className="bg-blue-600/10 p-4 md:p-6 border-b border-blue-600/10 text-center">
                                        <h3 className="text-lg md:text-2xl font-black text-blue-400 uppercase tracking-widest">Ensino Fundamental (Matutino)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[700px]">
                                            <thead className="bg-black/60 text-white border-b border-white/10">
                                                <tr>
                                                    <th className="p-4 font-black uppercase text-[10px] md:text-xs w-20 text-center">Hora</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="p-4 font-black uppercase text-[10px] md:text-xs text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {MORNING_SLOTS.map(slot => (
                                                    <tr key={slot.id} className={`${slot.type === 'break' ? 'bg-yellow-500/5' : 'hover:bg-white/[0.02]'} transition-colors`}>
                                                        <td className="p-4 text-center border-r border-white/5">
                                                            <span className="text-xs font-black text-red-500 font-mono tracking-tight">{slot.start}</span>
                                                        </td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                    {slot.type === 'break' ? (
                                                                        <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">INTERVALO</span>
                                                                    ) : entry ? (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="font-black text-white text-[10px] md:text-xs uppercase leading-tight line-clamp-1">{entry.subject}</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold uppercase truncate">{entry.professor}</span>
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

                                {/* TABELA VESPERTINO */}
                                <section className="bg-white/[0.02] rounded-2xl md:rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                                     <div className="bg-red-600/10 p-4 md:p-6 border-b border-red-600/10 text-center">
                                        <h3 className="text-lg md:text-2xl font-black text-red-400 uppercase tracking-widest">Ensino Médio (Vespertino)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[700px]">
                                            <thead className="bg-black/60 text-white border-b border-white/10">
                                                <tr>
                                                    <th className="p-4 font-black uppercase text-[10px] md:text-xs w-20 text-center">Hora</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-4 font-black uppercase text-[10px] md:text-xs text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {AFTERNOON_SLOTS.map(slot => (
                                                    <tr key={slot.id} className={`${slot.type === 'break' ? 'bg-yellow-500/5' : 'hover:bg-white/[0.02]'} transition-colors`}>
                                                        <td className="p-4 text-center border-r border-white/5">
                                                            <span className="text-xs font-black text-red-500 font-mono tracking-tight">{slot.start}</span>
                                                        </td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                    {slot.type === 'break' ? (
                                                                        <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">INTERVALO</span>
                                                                    ) : entry ? (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="font-black text-white text-[10px] md:text-xs uppercase leading-tight line-clamp-1">{entry.subject}</span>
                                                                            <span className="text-[9px] text-gray-500 font-bold uppercase truncate">{entry.professor}</span>
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
        </div>
    );
};
