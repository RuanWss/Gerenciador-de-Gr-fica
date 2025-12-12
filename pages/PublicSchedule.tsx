
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Megaphone, Volume2, Maximize, Minimize, LayoutGrid, Table as TableIcon, Sun, Moon, Calendar } from 'lucide-react';

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
    { id: '1em', name: '1ª SÉRIE' },
    { id: '2em', name: '2ª SÉRIE' },
    { id: '3em', name: '3ª SÉRIE' },
];

// Som de Alerta (Sino de Serviço / Aeroporto)
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const PublicSchedule: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    
    // UI State
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [manualShift, setManualShift] = useState<'morning' | 'afternoon'>('morning');
    const [audioEnabled, setAudioEnabled] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    // 1. Realtime Database Listener
    useEffect(() => {
        const unsubscribeSchedule = listenToSchedule((data) => setSchedule(data || []));
        const unsubscribeConfig = listenToSystemConfig((config) => setSysConfig(config));
        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
        };
    }, []);

    // 2. Clock & Shift Logic
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentSlot(now);
            
            // Initial Shift Set Logic
            if (now.getHours() >= 13 && manualShift !== 'afternoon') {
                // Could auto-switch here if needed
            }
        }, 1000);
        
        // Set initial shift based on time
        if (new Date().getHours() >= 13) setManualShift('afternoon');

        return () => clearInterval(timer);
    }, []);

    const checkCurrentSlot = (now: Date) => {
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        if (day === 0 || day === 6) {
            setCurrentSlot(null);
            return;
        }

        const allSlots = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];
        const foundSlot = allSlots.find(s => {
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
                
                // Switch view to cards on slot change to show new info automatically
                setViewMode('cards');
            }
        } else {
            if (lastSlotId.current !== '') {
                lastSlotId.current = '';
                setCurrentSlot(null);
            }
        }
    };

    const enableAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setAudioEnabled(true);
            }).catch(e => console.error("Erro ao desbloquear áudio:", e));
        }
    };

    const playAlert = () => {
        if (audioRef.current) {
            audioRef.current.volume = 1.0;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {});
            }
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }, 6000);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const getEntry = (classId: string) => {
        if (!currentSlot) return null;
        return schedule.find(s => 
            s.classId === classId && 
            s.dayOfWeek === currentTime.getDay() && 
            s.slotId === currentSlot.id
        );
    };

    const getFullEntry = (classId: string, slotId: string, day: number) => {
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === slotId);
    };

    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Warning Visibility
    const isWarningVisible = () => {
        if (!sysConfig?.isBannerActive || !sysConfig?.showOnTV || !sysConfig?.bannerMessage) return false;
        const now = new Date();
        if (sysConfig.tvStart && sysConfig.tvStart.trim() !== '') {
            const startDate = new Date(sysConfig.tvStart);
            if (!isNaN(startDate.getTime()) && now < startDate) return false;
        }
        if (sysConfig.tvEnd && sysConfig.tvEnd.trim() !== '') {
            const endDate = new Date(sysConfig.tvEnd);
            if (!isNaN(endDate.getTime()) && now > endDate) return false;
        }
        return true;
    };

    const showWarning = isWarningVisible();
    
    // Determine active classes based on current slot shift or manual toggle
    const activeClasses = (currentSlot?.shift === 'afternoon' || (!currentSlot && manualShift === 'afternoon')) 
        ? AFTERNOON_CLASSES 
        : MORNING_CLASSES;

    const activeSlots = (currentSlot?.shift === 'afternoon' || (!currentSlot && manualShift === 'afternoon'))
        ? AFTERNOON_SLOTS
        : MORNING_SLOTS;

    const currentShiftLabel = (currentSlot?.shift === 'afternoon' || (!currentSlot && manualShift === 'afternoon'))
        ? 'Vespertino'
        : 'Matutino';

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-[#0f0f10] via-[#1a0505] to-[#0f0f10] text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
                    <div className="bg-red-600 p-8 rounded-full mb-6 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                        <Volume2 size={64} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Iniciar Sistema de TV</h1>
                    <p className="text-gray-400 text-xl">Toque para ativar o áudio</p>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="h-24 w-full flex items-center justify-between px-8 border-b border-white/10 bg-black/30 backdrop-blur-md z-10">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" alt="Logo" className="h-16 w-auto object-contain drop-shadow-xl" />
                    <div className="h-10 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-200 uppercase tracking-[0.2em] mb-1">Quadro de Horários</h1>
                        <p className="text-xs text-gray-400 font-medium">{dateString}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                     {/* Dynamic Warning Banner in Header */}
                     {showWarning && (
                        <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 px-6 py-2 rounded-full animate-pulse">
                            <Megaphone size={18} className="text-yellow-500" />
                            <span className="text-sm font-bold text-yellow-50 max-w-md truncate">{sysConfig?.bannerMessage}</span>
                        </div>
                    )}
                    <h1 className="text-6xl font-['Montserrat'] font-black text-white tracking-tighter drop-shadow-2xl tabular-nums">
                        {timeString}
                    </h1>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 relative overflow-hidden p-8">
                
                {/* VIEW MODE: CARDS (Current Status) */}
                {viewMode === 'cards' && (
                    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500">
                        {currentSlot ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${currentSlot.shift === 'morning' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {currentSlot.shift === 'morning' ? <Sun size={24} /> : <Moon size={24} />}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black uppercase tracking-wide text-white">{currentSlot.label}</h2>
                                            <p className="text-gray-400 font-mono text-lg">{currentSlot.start} - {currentSlot.end}</p>
                                        </div>
                                    </div>
                                    <span className="bg-white/5 px-4 py-2 rounded-full text-sm font-bold text-gray-400 border border-white/10">
                                        {currentSlot.shift === 'morning' ? 'Matutino' : 'Vespertino'}
                                    </span>
                                </div>

                                {currentSlot.type === 'break' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-3xl border border-white/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                        <h1 className="text-[12vh] font-black text-white uppercase tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] animate-pulse">
                                            Intervalo
                                        </h1>
                                        <p className="text-2xl text-blue-200 font-bold mt-4">Retornaremos em breve</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full pb-8">
                                        {activeClasses.map(cls => {
                                            const entry = getEntry(cls.id);
                                            return (
                                                <div key={cls.id} className="relative group perspective">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl transform rotate-1 opacity-20 group-hover:rotate-2 transition-transform duration-500"></div>
                                                    <div className="relative h-full bg-[#121212] border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl group-hover:translate-y-[-5px] transition-transform duration-300">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-4xl font-black text-white/10 absolute top-4 right-4">{cls.name.split(' ')[0]}</span>
                                                            <h3 className="text-xl font-bold text-white uppercase tracking-wider relative z-10 border-b border-red-500/50 pb-2 inline-block">
                                                                {cls.name}
                                                            </h3>
                                                        </div>

                                                        <div className="flex-1 flex flex-col justify-center items-center text-center my-4">
                                                            {entry ? (
                                                                <>
                                                                    <h4 className="text-2xl md:text-3xl font-black text-white uppercase leading-tight mb-2 drop-shadow-md">
                                                                        {entry.subject}
                                                                    </h4>
                                                                    <p className="text-lg text-gray-400 font-bold uppercase tracking-widest">
                                                                        {entry.professor}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-600 font-bold text-xl uppercase">Sem Aula</span>
                                                            )}
                                                        </div>

                                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-600 w-2/3 animate-[shimmer_2s_infinite]"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <Clock size={80} className="text-gray-600 mb-6 opacity-50" />
                                <h2 className="text-4xl font-bold text-gray-500 uppercase mb-2">Aguardando Início das Aulas</h2>
                                <p className="text-gray-600">O quadro de horários será exibido automaticamente.</p>
                                <button 
                                    onClick={() => setViewMode('table')} 
                                    className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-bold transition-all"
                                >
                                    Ver Grade Completa
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW MODE: TABLE (Full Schedule) */}
                {viewMode === 'table' && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="flex justify-center mb-6">
                            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex gap-2">
                                <button 
                                    onClick={() => setManualShift('morning')}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${manualShift === 'morning' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Sun size={16} /> Matutino
                                </button>
                                <button 
                                    onClick={() => setManualShift('afternoon')}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${manualShift === 'afternoon' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Moon size={16} /> Vespertino
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-[#121212] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                            <div className="bg-white/5 p-4 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={20} className="text-red-500" /> 
                                    Grade Curricular - {currentShiftLabel}
                                </h3>
                                <div className="text-xs font-bold text-gray-500 uppercase">
                                    {currentTime.toLocaleDateString('pt-BR', {weekday: 'long'})}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-auto custom-scrollbar p-4">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-4 text-left text-gray-400 font-bold uppercase text-xs border-b border-white/10 w-32">Horário</th>
                                            {activeClasses.map(c => (
                                                <th key={c.id} className="p-4 text-center text-white font-black uppercase text-sm border-b border-white/10 border-l border-white/5 bg-white/5">
                                                    {c.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSlots.map((slot, index) => {
                                            const isRowActive = currentSlot?.id === slot.id;
                                            if (slot.type === 'break') {
                                                return (
                                                    <tr key={slot.id} className="bg-white/5">
                                                        <td className="p-4 font-mono text-gray-400 font-bold border-r border-white/5 text-xs">{slot.start}</td>
                                                        <td colSpan={activeClasses.length} className="p-4 text-center font-black text-gray-500 uppercase tracking-[0.5em] text-xs">
                                                            Intervalo
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            return (
                                                <tr key={slot.id} className={`transition-colors ${isRowActive ? 'bg-red-900/20' : index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-white/5`}>
                                                    <td className={`p-4 border-r border-white/5 font-mono text-xs font-bold ${isRowActive ? 'text-red-400' : 'text-gray-500'}`}>
                                                        {slot.start} <span className="opacity-50 block">{slot.end}</span>
                                                    </td>
                                                    {activeClasses.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="p-3 text-center border-l border-white/5 relative group">
                                                                {entry ? (
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <span className={`font-black uppercase text-xs md:text-sm leading-tight mb-1 ${isRowActive ? 'text-white' : 'text-gray-300'} group-hover:text-white transition-colors`}>
                                                                            {entry.subject}
                                                                        </span>
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isRowActive ? 'text-red-300' : 'text-gray-600'}`}>
                                                                            {entry.professor.split(' ')[0]}
                                                                        </span>
                                                                    </div>
                                                                ) : <span className="text-gray-800 font-bold text-lg">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER CONTROLS --- */}
            <div className="h-16 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-8 z-20">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sistema Online</span>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all"
                    >
                        {viewMode === 'cards' ? <TableIcon size={16} /> : <LayoutGrid size={16} />}
                        {viewMode === 'cards' ? 'Ver Grade Completa' : 'Ver Cards em Tempo Real'}
                    </button>
                    <button 
                        onClick={toggleFullscreen}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/20"
                    >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
};
