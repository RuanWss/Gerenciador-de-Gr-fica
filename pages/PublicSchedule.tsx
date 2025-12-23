
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
    const gridCols = currentShift === 'morning' ? 4 : 3;

    const showWarning = isBannerVisible();

    return (
        <div className="h-screen w-screen bg-[#050000] bg-gradient-to-br from-black via-[#2a0000] to-black text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer">
                    <div className="bg-red-600 p-10 rounded-full mb-6 animate-pulse shadow-[0_0_80px_rgba(220,38,38,0.6)]"><Volume2 size={80} /></div>
                    <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">Monitor CEMAL EQUIPE</h1>
                    <p className="text-gray-400 text-2xl font-medium">Toque na tela para sincronizar áudio e horários</p>
                </div>
            )}

            {/* HEADER */}
            <div className="h-[38%] w-full flex flex-row border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
                <div className={`${showWarning ? 'w-[60%] border-r border-white/10' : 'w-full'} h-full flex flex-col items-center justify-center relative p-6 transition-all duration-700 ease-in-out`}>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-[10vh] w-auto object-contain mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
                    <h1 className="text-[24vh] leading-none tracking-tighter text-white drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] font-clock font-black tabular-nums text-center">{timeString}</h1>
                    <div className="mt-4 bg-red-600/10 px-12 py-3 rounded-full border border-red-600/20 shadow-2xl backdrop-blur-md">
                        <p className="text-[2.2vh] text-red-500 font-black tracking-[0.4em] uppercase">{dateString}</p>
                    </div>
                </div>

                {showWarning && (
                    <div className="w-[40%] h-full flex items-center justify-center p-10 bg-red-950/20 animate-in slide-in-from-right duration-700">
                        <div className={`w-full h-auto min-h-[250px] backdrop-blur-3xl border-[12px] rounded-[4rem] p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center gap-10 relative overflow-hidden transition-all duration-500 ${
                            sysConfig?.bannerType === 'error' ? 'border-red-600 bg-red-900/40' : 
                            sysConfig?.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-900/40' : 
                            sysConfig?.bannerType === 'success' ? 'border-green-500 bg-green-900/40' : 
                            'border-blue-600 bg-blue-900/40'
                        }`}>
                            <div className="absolute top-0 left-0 w-full h-4 bg-white/20 animate-[pulse_2s_infinite]"></div>
                            <Megaphone size={120} className={`${
                                sysConfig?.bannerType === 'error' ? 'text-red-500' : 
                                sysConfig?.bannerType === 'warning' ? 'text-yellow-500' :
                                sysConfig?.bannerType === 'success' ? 'text-green-500' :
                                'text-blue-500'
                            } animate-bounce`} />
                            <p className="text-[5.5vh] font-black uppercase text-center leading-[1.0] tracking-tighter text-white drop-shadow-[0_8px_8px_rgba(0,0,0,1)]">
                                {sysConfig?.bannerMessage}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* INDICATOR */}
            <div className="h-[6%] flex items-center justify-center shrink-0 z-10">
                 <div className="flex items-center gap-6 px-10 py-3 bg-white/5 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
                    <span className={`h-4 w-4 rounded-full shadow-[0_0_20px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[2vh] font-black tracking-[0.3em] text-white uppercase">
                        {currentShift === 'morning' ? 'Turno Matutino (EFAF)' : currentShift === 'afternoon' ? 'Turno Vespertino (E.M.)' : 'Aguardando Início das Aulas'}
                    </span>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="flex-1 w-full p-8 flex items-center justify-center">
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
                        <div className="bg-white/5 p-16 rounded-[5rem] border border-white/10 shadow-2xl mb-8 backdrop-blur-xl">
                            <School size={150} className="text-red-600/40 mb-8 mx-auto"/>
                            <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">C.E. Prof. Manoel Leite</h2>
                            <p className="text-3xl text-red-500 font-bold uppercase tracking-[0.5em] drop-shadow-lg">CEMAL EQUIPE • 10 ANOS</p>
                        </div>
                     </div>
                ) : (
                    <div className="grid gap-10 w-full h-full max-w-[98vw] mx-auto" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            const nextEntry = getNextEntry(cls.id);

                            return (
                                <div key={cls.id} className="flex flex-col bg-black/60 backdrop-blur-2xl border-2 border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] h-full transition-transform hover:scale-[1.02] hover:border-red-600/50">
                                    <div className="h-[18%] bg-gradient-to-b from-red-600/20 to-black/40 flex items-center justify-center border-b border-white/10">
                                        <h2 className="text-[4.5vh] font-black text-white uppercase tracking-tighter drop-shadow-lg">{cls.name}</h2>
                                    </div>
                                    
                                    <div className="h-[82%] relative w-full flex flex-col">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/10 z-20 animate-pulse">
                                                <Clock size={120} className="text-yellow-500 mb-8 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]"/>
                                                <span className="text-[7vh] font-black text-yellow-500 uppercase tracking-[0.4em]">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="h-[68%] flex flex-col items-center justify-center border-b border-white/10 px-8 bg-gradient-to-b from-white/5 to-transparent w-full text-center">
                                                    <p className="text-[1.6vh] font-black text-red-500 uppercase tracking-[0.4em] mb-4">Aula Agora</p>
                                                    <h3 className="text-[6.5vh] leading-[0.8] font-black text-white uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-6 line-clamp-2">{entry.subject}</h3>
                                                    <p className="text-[3vh] font-bold text-gray-300 uppercase tracking-widest truncate w-full">{entry.professor}</p>
                                                </div>

                                                <div className="h-[32%] flex flex-col items-center justify-center px-8 bg-black/40 w-full text-center relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <span className="text-[1.8vh] font-black text-gray-500 uppercase tracking-widest">A Seguir</span>
                                                        <ArrowRight size="2.5vh" className="text-red-600"/>
                                                    </div>

                                                    {nextEntry ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <p className="text-[2.8vh] font-black text-gray-100 uppercase truncate w-full tracking-tight">{nextEntry.subject}</p>
                                                            <p className="text-[2vh] font-bold text-gray-500 uppercase truncate w-full">{nextEntry.professor}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[2.2vh] font-black text-gray-700 uppercase tracking-widest">Fim do Expediente</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-20 bg-white/5">
                                                <span className="text-[5vh] font-black tracking-[0.5em] uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* CONTROLS GROUP */}
            <div className="absolute bottom-12 right-12 flex gap-6 z-50">
                <button 
                    onClick={toggleFullScreen} 
                    className="p-8 bg-black/60 hover:bg-red-600 border-2 border-white/10 rounded-full text-white transition-all backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] group active:scale-90"
                    title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                    {isFullscreen ? <Minimize size={40} /> : <Maximize size={40} className="group-hover:rotate-45 transition-transform" />}
                </button>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="p-8 bg-black/60 hover:bg-blue-600 border-2 border-white/10 rounded-full text-white transition-all backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] group active:scale-90"
                    title="Ver Quadro Geral"
                >
                    <Maximize2 size={40} className="group-hover:scale-125 transition-transform" />
                </button>
            </div>

             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="w-full h-full max-w-[98vw] max-h-[96vh] bg-[#0f0f10] rounded-[4rem] border-2 border-white/10 flex flex-col overflow-hidden shadow-[0_0_150px_rgba(220,38,38,0.2)]">
                        <div className="p-10 border-b border-white/10 flex justify-between items-center bg-[#18181b] shrink-0">
                            <h2 className="text-4xl font-black text-white flex items-center gap-6 uppercase tracking-tighter">
                                <Calendar className="text-red-600" size={48}/> Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-red-600/10 p-6 rounded-[2rem] hover:bg-red-600 text-red-500 hover:text-white transition-all group">
                                <X size={50} className="group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                                <div className="bg-white/[0.03] rounded-[3.5rem] border-2 border-white/5 overflow-hidden shadow-2xl">
                                    <div className="bg-blue-600/20 p-8 border-b border-blue-600/20 text-center">
                                        <h3 className="text-3xl font-black text-blue-400 uppercase tracking-widest">Matutino (6º ao 9º EFAF)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-black/50 text-white border-b border-white/5">
                                                <th className="p-6 font-black uppercase text-xs w-28 text-center">Hora</th>
                                                {MORNING_CLASSES.map(c => <th key={c.id} className="p-6 font-black uppercase text-xs text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {MORNING_SLOTS.map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-6 text-center border-r border-white/5"><span className="text-sm font-black text-red-500 font-mono">{slot.start}</span></td>
                                                    {MORNING_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-4 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-xs uppercase leading-tight">{entry.subject}</span>
                                                                        <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">{entry.professor}</span>
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

                                <div className="bg-white/[0.03] rounded-[3.5rem] border-2 border-white/5 overflow-hidden shadow-2xl">
                                     <div className="bg-red-600/20 p-8 border-b border-red-600/20 text-center">
                                        <h3 className="text-3xl font-black text-red-400 uppercase tracking-widest">Vespertino (E.M.)</h3>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-black/50 text-white border-b border-white/5">
                                                <th className="p-6 font-black uppercase text-xs w-28 text-center">Hora</th>
                                                {AFTERNOON_CLASSES.map(c => <th key={c.id} className="p-6 font-black uppercase text-xs text-center border-l border-white/5">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {AFTERNOON_SLOTS.map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-6 text-center border-r border-white/5"><span className="text-sm font-black text-red-500 font-mono">{slot.start}</span></td>
                                                    {AFTERNOON_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-4 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-white text-xs uppercase leading-tight">{entry.subject}</span>
                                                                        <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">{entry.professor}</span>
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
