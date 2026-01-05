
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
        <div className="h-screen w-screen bg-[#050000] bg-gradient-to-br from-black via-[#2a0000] to-black text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                    <div className="bg-red-600 p-8 md:p-10 rounded-full mb-6 animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]">
                        <Volume2 size={60} className="md:w-20 md:h-20" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">Monitor CEMAL EQUIPE</h1>
                    <p className="text-xl md:text-2xl font-medium text-gray-400">Toque na tela para sincronizar áudio e horários</p>
                </div>
            )}

            {/* HEADER - RESPONSIVE HEIGHT */}
            <div className="min-h-[35%] md:h-[40%] w-full flex flex-col md:flex-row border-b border-white/10 bg-black/40 backdrop-blur-md z-10 overflow-hidden">
                <div className={`flex-1 flex flex-col items-center justify-center relative p-4 md:p-8 transition-all duration-700 ease-in-out`}>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[8vh] md:h-[10vh] w-auto object-contain mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
                    
                    {/* FLUID CLOCK TEXT */}
                    <h1 className="text-[clamp(6rem,22vh,28vh)] leading-none tracking-tighter text-white drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] font-clock font-black tabular-nums text-center">
                        {timeString}
                    </h1>
                    
                    <div className="mt-2 md:mt-4 bg-red-600/10 px-8 md:px-12 py-2 md:py-3 rounded-full border border-red-600/20 shadow-2xl backdrop-blur-md">
                        <p className="text-[clamp(0.875rem,2.2vh,2.8vh)] text-red-500 font-black tracking-[0.4em] uppercase">{dateString}</p>
                    </div>
                </div>

                {showWarning && (
                    <div className="w-full md:w-[45%] h-full flex items-center justify-center p-4 md:p-8 bg-red-950/20 animate-in slide-in-from-right duration-700">
                        <div className={`w-full h-full flex flex-col items-center justify-center gap-6 md:gap-8 relative overflow-hidden transition-all duration-500 border-[8px] md:border-[12px] rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] ${
                            sysConfig?.bannerType === 'error' ? 'border-red-600 bg-red-900/40' : 
                            sysConfig?.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-900/40' : 
                            sysConfig?.bannerType === 'success' ? 'border-green-500 bg-green-900/40' : 
                            'border-blue-600 bg-blue-900/40'
                        }`}>
                            <div className="absolute top-0 left-0 w-full h-2 md:h-4 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            <Megaphone size={80} className={`${
                                sysConfig?.bannerType === 'error' ? 'text-red-500' : 
                                sysConfig?.bannerType === 'warning' ? 'text-yellow-500' :
                                sysConfig?.bannerType === 'success' ? 'text-green-500' :
                                'text-blue-500'
                            } animate-bounce md:w-32 md:h-32`} />
                            <p className="text-[clamp(1.5rem,5.5vh,7vh)] font-black uppercase text-center leading-[1.1] tracking-tighter text-white drop-shadow-[0_8px_8px_rgba(0,0,0,1)]">
                                {sysConfig?.bannerMessage}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* STATUS BAR */}
            <div className="h-[6vh] flex items-center justify-center shrink-0 z-10 px-4">
                 <div className="flex items-center gap-4 md:gap-6 px-6 md:px-10 py-2 bg-white/5 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
                    <span className={`h-3 w-3 md:h-4 md:w-4 rounded-full shadow-[0_0_20px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[clamp(0.75rem,1.8vh,2.2vh)] font-black tracking-[0.2em] md:tracking-[0.3em] text-white uppercase whitespace-nowrap">
                        {currentShift === 'morning' ? 'Turno Matutino (EFAF)' : currentShift === 'afternoon' ? 'Turno Vespertino (E.M.)' : 'Aguardando Início das Aulas'}
                    </span>
                </div>
            </div>

            {/* MAIN GRID - DYNAMIC ADAPTIVE COLUMNS */}
            <div className="flex-1 w-full p-4 md:p-8 overflow-hidden flex items-center justify-center">
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                        <div className="bg-white/5 p-10 md:p-16 rounded-[3rem] md:rounded-[5rem] border border-white/10 shadow-2xl mb-4 backdrop-blur-xl">
                            <School className="text-red-600/40 mb-6 mx-auto w-24 h-24 md:w-40 md:h-40"/>
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">C.E. Prof. Manoel Leite</h2>
                            <p className="text-xl md:text-3xl text-red-500 font-bold uppercase tracking-[0.4em] drop-shadow-lg">CEMAL EQUIPE • 10 ANOS</p>
                        </div>
                     </div>
                ) : (
                    <div className="grid gap-6 md:gap-10 w-full h-full max-w-[98vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-center">
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <div key={cls.id} className="flex flex-col bg-black/60 backdrop-blur-2xl border-2 border-white/10 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] h-full min-h-[300px] transition-transform hover:scale-[1.02] hover:border-red-600/50">
                                    <div className="h-[15%] md:h-[18%] bg-gradient-to-b from-red-600/20 to-black/40 flex items-center justify-center border-b border-white/10 px-4">
                                        <h2 className="text-[clamp(1.25rem,4vh,4.5vh)] font-black text-white uppercase tracking-tighter drop-shadow-lg text-center truncate">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="flex-1 relative w-full flex flex-col">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/10 z-20 animate-pulse">
                                                <Clock className="text-yellow-500 mb-4 md:mb-8 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)] w-16 h-16 md:w-28 md:h-28"/>
                                                <span className="text-[clamp(2rem,6vh,8vh)] font-black text-yellow-500 uppercase tracking-[0.4em]">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="flex-[2] flex flex-col items-center justify-center border-b border-white/10 px-6 bg-gradient-to-b from-white/5 to-transparent w-full text-center py-4">
                                                    <p className="text-[clamp(0.65rem,1.4vh,1.8vh)] font-black text-red-500 uppercase tracking-[0.3em] mb-2 md:mb-4">Aula Agora</p>
                                                    <h3 className="text-[clamp(1.75rem,5.5vh,7vh)] leading-[1.0] font-black text-white uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-2 md:mb-4 line-clamp-2">{entry.subject}</h3>
                                                    <p className="text-[clamp(0.9rem,2.5vh,3.5vh)] font-bold text-gray-300 uppercase tracking-widest truncate w-full">{entry.professor}</p>
                                                </div>

                                                <div className="flex-1 flex flex-col items-center justify-center px-6 bg-black/40 w-full text-center relative overflow-hidden py-3">
                                                    <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
                                                    <div className="flex items-center gap-2 md:gap-4 mb-1 md:mb-3">
                                                        <span className="text-[clamp(0.6rem,1.6vh,2vh)] font-black text-gray-500 uppercase tracking-widest">A Seguir</span>
                                                        <ArrowRight className="text-red-600 w-4 h-4 md:w-6 md:h-6"/>
                                                    </div>

                                                    {nextEntry ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <p className="text-[clamp(1rem,2.6vh,3vh)] font-black text-gray-100 uppercase truncate w-full tracking-tight">{nextEntry.subject}</p>
                                                            <p className="text-[clamp(0.7rem,1.8vh,2.2vh)] font-bold text-gray-500 uppercase truncate w-full">{nextEntry.professor}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[clamp(0.8rem,2vh,2.5vh)] font-black text-gray-700 uppercase tracking-widest">Fim do Expediente</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-20 bg-white/5">
                                                <span className="text-[clamp(1.5rem,4vh,5vh)] font-black tracking-[0.4em] uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 flex gap-4 md:gap-6 z-50">
                <button 
                    onClick={toggleFullScreen} 
                    className="p-4 md:p-8 bg-black/60 hover:bg-red-600 border-2 border-white/10 rounded-full text-white transition-all backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] group active:scale-90"
                    title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize className="w-6 h-6 md:w-10 md:h-10" /> : <Maximize className="w-6 h-6 md:w-10 md:h-10 group-hover:rotate-45 transition-transform" />}
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-4 md:p-8 bg-black/60 hover:bg-blue-600 border-2 border-white/10 rounded-full text-white transition-all backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] group active:scale-90"
                    title="Ver Quadro Geral"
                >
                    <Maximize2 className="w-6 h-6 md:w-10 md:h-10 group-hover:scale-125 transition-transform" />
                </button>
            </div>

             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-[98vw] max-h-[96vh] bg-[#0f0f10] rounded-[2rem] md:rounded-[4rem] border-2 border-white/10 flex flex-col overflow-hidden shadow-[0_0_150px_rgba(220,38,38,0.2)]">
                        <div className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0">
                            <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-4 md:gap-6 uppercase tracking-tighter">
                                <Calendar className="text-red-600 w-8 h-8 md:w-12 md:h-12"/> Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-red-600/10 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] hover:bg-red-600 text-red-500 hover:text-white transition-all group">
                                <X className="w-8 h-8 md:w-12 md:h-12 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 md:p-12 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 md:gap-16">
                                {/* MATUTINO TABLE */}
                                <div className="bg-white/[0.03] rounded-[2rem] md:rounded-[3.5rem] border-2 border-white/5 overflow-hidden shadow-2xl">
                                    <div className="bg-blue-600/20 p-6 md:p-8 border-b border-blue-600/20 text-center">
                                        <h3 className="text-xl md:text-3xl font-black text-blue-400 uppercase tracking-widest">Matutino (6º ao 9º EFAF)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead>
                                                <tr className="bg-black/50 text-white border-b border-white/5">
                                                    <th className="p-4 md:p-6 font-black uppercase text-[10px] md:text-xs w-24 md:w-28 text-center">Hora</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="p-4 md:p-6 font-black uppercase text-[10px] md:text-xs text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {MORNING_SLOTS.map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4 md:p-6 text-center border-r border-white/5"><span className="text-xs md:text-sm font-black text-red-500 font-mono">{slot.start}</span></td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-3 md:p-4 text-center border-l border-white/5">
                                                                    {entry ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-black text-white text-[10px] md:text-xs uppercase leading-tight">{entry.subject}</span>
                                                                            <span className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase mt-1">{entry.professor}</span>
                                                                        </div>
                                                                    ) : <span className="text-gray-800 text-xs">-</span>}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* VESPERTINO TABLE */}
                                <div className="bg-white/[0.03] rounded-[2rem] md:rounded-[3.5rem] border-2 border-white/5 overflow-hidden shadow-2xl">
                                     <div className="bg-red-600/20 p-6 md:p-8 border-b border-red-600/20 text-center">
                                        <h3 className="text-xl md:text-3xl font-black text-red-400 uppercase tracking-widest">Vespertino (E.M.)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[600px]">
                                            <thead>
                                                <tr className="bg-black/50 text-white border-b border-white/5">
                                                    <th className="p-4 md:p-6 font-black uppercase text-[10px] md:text-xs w-24 md:w-28 text-center">Hora</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-4 md:p-6 font-black uppercase text-[10px] md:text-xs text-center border-l border-white/5">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {AFTERNOON_SLOTS.map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4 md:p-6 text-center border-r border-white/5"><span className="text-xs md:text-sm font-black text-red-500 font-mono">{slot.start}</span></td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-3 md:p-4 text-center border-l border-white/5">
                                                                    {entry ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-black text-white text-[10px] md:text-xs uppercase leading-tight">{entry.subject}</span>
                                                                            <span className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase mt-1">{entry.professor}</span>
                                                                        </div>
                                                                    ) : <span className="text-gray-800 text-xs">-</span>}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};
