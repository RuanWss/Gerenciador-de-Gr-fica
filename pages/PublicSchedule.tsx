
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Calendar, X, Maximize2, AlertCircle, Volume2, Megaphone, ArrowRight, School } from 'lucide-react';

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
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    useEffect(() => {
        const unsubscribeSchedule = listenToSchedule(setSchedule);
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
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
        
        // Scheduled visibility check
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
    const gridCols = currentShift === 'morning' ? 4 : 3;

    const showWarning = isBannerVisible();

    return (
        <div className="h-screen w-screen bg-[#0f0f10] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-950/20 via-[#0f0f10] to-[#0f0f10] text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer">
                    <div className="bg-red-600 p-8 rounded-full mb-6 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]"><Volume2 size={64} /></div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Ativar Áudio da TV</h1>
                    <p className="text-gray-400 text-xl font-medium">Toque em qualquer lugar para carregar os alertas sonoros</p>
                </div>
            )}

            {/* HEADER */}
            <div className="h-[40%] w-full flex flex-row border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
                <div className={`${showWarning ? 'w-[62%] border-r border-white/10' : 'w-full'} h-full flex flex-col items-center justify-center relative p-4 transition-all duration-700 ease-in-out`}>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[8vh] w-auto object-contain mb-4 drop-shadow-2xl" />
                    <h1 className="text-[22vh] leading-none tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] font-clock font-extrabold tabular-nums text-center">{timeString}</h1>
                    <div className="mt-4 bg-white/5 px-10 py-3 rounded-full border border-white/10 shadow-2xl backdrop-blur-md">
                        <p className="text-[2vh] text-gray-300 font-bold tracking-[0.3em] uppercase">{dateString}</p>
                    </div>
                </div>

                {showWarning && (
                    <div className="w-[38%] h-full flex items-center justify-center p-10 bg-black/50 animate-in slide-in-from-right duration-700">
                        <div className={`w-full h-auto min-h-[220px] backdrop-blur-2xl border-[10px] rounded-[3.5rem] p-12 shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center gap-8 relative overflow-hidden transition-all duration-500 ${
                            sysConfig?.bannerType === 'error' ? 'border-red-600 bg-red-900/30' : 
                            sysConfig?.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-900/30' : 
                            sysConfig?.bannerType === 'success' ? 'border-green-500 bg-green-900/30' : 
                            'border-blue-600 bg-blue-900/30'
                        }`}>
                            <div className="absolute top-0 left-0 w-full h-3 bg-white/10 animate-[pulse_2s_infinite]"></div>
                            <Megaphone size={100} className={`${
                                sysConfig?.bannerType === 'error' ? 'text-red-500' : 
                                sysConfig?.bannerType === 'warning' ? 'text-yellow-500' :
                                sysConfig?.bannerType === 'success' ? 'text-green-500' :
                                'text-blue-500'
                            } animate-bounce`} />
                            <p className="text-[4.8vh] font-black uppercase text-center leading-[1.1] tracking-tighter text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                                {sysConfig?.bannerMessage}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* INDICATOR */}
            <div className="h-[5%] flex items-center justify-center shrink-0 z-10 mt-6">
                 <div className="flex items-center gap-4 px-8 py-2 bg-white/5 rounded-full border border-white/10 shadow-2xl backdrop-blur-md">
                    <span className={`h-3 w-3 rounded-full shadow-[0_0_15px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[1.8vh] font-black tracking-[0.2em] text-gray-200 uppercase">
                        {currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno Vespertino' : 'Aguardando Início das Aulas'}
                    </span>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="flex-1 w-full p-6 flex items-center justify-center">
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
                        <div className="bg-white/5 p-12 rounded-[4rem] border border-white/10 shadow-2xl mb-8">
                            <School size={120} className="text-gray-700 mb-6 mx-auto"/>
                            <h2 className="text-5xl font-black text-gray-500 uppercase tracking-tighter mb-4">C.E. Prof. Manoel Leite</h2>
                            <p className="text-2xl text-gray-600 font-bold uppercase tracking-[0.4em]">Ensino de Qualidade • 10 Anos</p>
                        </div>
                     </div>
                ) : (
                    <div className="grid gap-6 w-full h-full max-w-[98vw] mx-auto" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <div key={cls.id} className="flex flex-col bg-[#121214] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl h-full transition-transform hover:scale-[1.01] hover:border-red-600/30">
                                    <div className="h-[15%] bg-gradient-to-b from-[#1a1a1c] to-[#121214] flex items-center justify-center border-b border-white/5">
                                        <h2 className="text-[3.5vh] font-black text-white uppercase tracking-tighter">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="h-[85%] relative w-full flex flex-col">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/5 z-20 animate-pulse">
                                                <Clock size={80} className="text-yellow-500 mb-6 drop-shadow-2xl"/>
                                                <span className="text-[5vh] font-black text-yellow-500 uppercase tracking-[0.3em]">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="h-[65%] flex flex-col items-center justify-center border-b border-white/5 px-4 bg-gradient-to-b from-[#151517] to-[#121214] w-full text-center">
                                                    <p className="text-[1.4vh] font-black text-red-500 uppercase tracking-[0.3em] mb-3">Aula Agora</p>
                                                    <h3 className="text-[5.5vh] leading-[0.85] font-black text-white uppercase drop-shadow-2xl mb-4 line-clamp-2">{entry.subject}</h3>
                                                    <p className="text-[2.5vh] font-bold text-gray-400 uppercase tracking-wide truncate">{entry.professor}</p>
                                                </div>

                                                <div className="h-[35%] flex flex-col items-center justify-center px-4 bg-black/40 w-full text-center relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[1.4vh] font-black text-gray-500 uppercase tracking-widest">A Seguir</span>
                                                        <ArrowRight size="1.8vh" className="text-gray-600"/>
                                                    </div>

                                                    {nextEntry ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <p className="text-[2.2vh] font-black text-gray-200 uppercase truncate w-full">{nextEntry.subject}</p>
                                                            <p className="text-[1.6vh] font-bold text-gray-500 uppercase truncate w-full">{nextEntry.professor}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[1.8vh] font-black text-gray-700 uppercase tracking-widest">Fim das Aulas</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-20 bg-white/5">
                                                <span className="text-[4vh] font-black tracking-[0.4em] uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <button onClick={() => setShowModal(true)} className="absolute bottom-10 right-10 p-5 bg-white/5 hover:bg-red-600 border border-white/10 rounded-full text-white transition-all backdrop-blur-xl z-50 group shadow-2xl">
                <Maximize2 size={32} className="group-hover:scale-110 transition-transform" />
            </button>

             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-[98vw] max-h-[95vh] bg-[#0f0f10] rounded-[3rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.1)]">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0">
                            <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                                <Calendar className="text-red-600"/> Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-red-600/10 p-4 rounded-3xl hover:bg-red-600 text-red-500 hover:text-white transition-all">
                                <X size={40} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-10 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                                <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/5 overflow-hidden">
                                    <div className="bg-blue-600/20 p-6 border-b border-blue-600/20 text-center">
                                        <h3 className="text-2xl font-black text-blue-400 uppercase tracking-widest">Matutino (6º ao 9º EFAF)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-black/40 text-white border-b border-white/5">
                                                <th className="p-4 font-black uppercase text-[10px] w-24 text-center">Hora</th>
                                                {MORNING_CLASSES.map(c => <th key={c.id} className="p-4 font-black uppercase text-[10px] text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {MORNING_SLOTS.map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/[0.01]">
                                                    <td className="p-4 text-center border-r border-white/5"><span className="text-xs font-black text-red-500 font-mono">{slot.start}</span></td>
                                                    {MORNING_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-xs uppercase">{entry.subject}</span>
                                                                        <span className="text-[9px] text-gray-500 font-bold">{entry.professor}</span>
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

                                <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/5 overflow-hidden">
                                     <div className="bg-red-600/20 p-6 border-b border-red-600/20 text-center">
                                        <h3 className="text-2xl font-black text-red-400 uppercase tracking-widest">Vespertino (1ª a 3ª Ensino Médio)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-black/40 text-white border-b border-white/5">
                                                <th className="p-4 font-black uppercase text-[10px] w-24 text-center">Hora</th>
                                                {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-4 font-black uppercase text-[10px] text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {AFTERNOON_SLOTS.map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/[0.01]">
                                                    <td className="p-4 text-center border-r border-white/5"><span className="text-xs font-black text-red-500 font-mono">{slot.start}</span></td>
                                                    {AFTERNOON_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-xs uppercase">{entry.subject}</span>
                                                                        <span className="text-[9px] text-gray-500 font-bold">{entry.professor}</span>
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
             )}
        </div>
    );
};
