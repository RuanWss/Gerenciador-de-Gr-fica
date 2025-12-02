import React, { useState, useEffect, useRef } from 'react';
import { getFullSchedule } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot } from '../types';
import { Clock, Calendar, X, Maximize2 } from 'lucide-react';

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

const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export const PublicSchedule: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'night' | 'weekend'>('morning');
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [showModal, setShowModal] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentStatus(now);
        }, 1000);
        loadSchedule();
        return () => clearInterval(timer);
    }, []);

    const loadSchedule = async () => {
        try {
            const data = await getFullSchedule();
            setSchedule(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const checkCurrentStatus = (now: Date) => {
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        if (day === 0 || day === 6) {
            setCurrentShift('weekend');
            setCurrentSlot(null);
            return;
        }

        let shift: 'morning' | 'afternoon' | 'night' = 'night';
        if (timeVal >= (7 * 60) && timeVal < (12 * 60 + 30)) {
            shift = 'morning';
        } else if (timeVal >= (12 * 60 + 30) && timeVal < (22 * 60)) {
            shift = 'afternoon';
        }

        setCurrentShift(shift as any);

        const slots = shift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS;
        const foundSlot = slots.find(s => {
            const [startH, startM] = s.start.split(':').map(Number);
            const [endH, endM] = s.end.split(':').map(Number);
            const startVal = startH * 60 + startM;
            const endVal = endH * 60 + endM;
            return timeVal >= startVal && timeVal < endVal;
        });

        if (foundSlot) {
            setCurrentSlot(foundSlot);
            if (foundSlot.id !== lastSlotId.current) {
                lastSlotId.current = foundSlot.id;
                playAlert();
            }
        } else {
            setCurrentSlot(null);
            lastSlotId.current = '';
        }
    };

    const playAlert = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }, 4000);
        }
    };

    const getEntry = (classId: string) => {
        if (!currentSlot) return null;
        const day = currentTime.getDay();
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === currentSlot.id);
    };

    const getFullEntry = (classId: string, slotId: string, day: number) => {
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === slotId);
    };

    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const classes = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-[#0f0f10] via-[#2a0a0a] to-[#0f0f10] text-white overflow-hidden flex relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {/* LEFT SIDE: CLASS CARDS */}
            <div className="flex-1 p-8 flex flex-col justify-center h-full relative z-10 pl-16">
                
                {/* Floating Action Button */}
                <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+2rem)] z-30">
                     <button 
                        onClick={() => setShowModal(true)}
                        className="bg-[#ef4444] hover:bg-red-700 text-white font-bold py-6 px-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] flex flex-col items-center gap-2 transition-transform hover:scale-105"
                    >
                        <Maximize2 size={28} />
                        <span className="text-[10px] uppercase tracking-widest text-center" style={{ writingMode: 'vertical-rl' }}>
                            VISUALIZAR<br/>QUADRO
                        </span>
                    </button>
                </div>

                <div className={`grid gap-6 w-full max-w-2xl ${classes.length > 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {classes.map(cls => {
                        const entry = getEntry(cls.id);
                        return (
                            <div key={cls.id} className="group relative h-40 bg-blue-600/20 backdrop-blur-md border border-blue-400/30 rounded-3xl overflow-hidden shadow-2xl flex transition-all hover:bg-blue-600/30">
                                {/* Vertical Label Strip */}
                                <div className="w-14 h-full bg-blue-800/60 border-r border-blue-400/30 flex items-center justify-center relative">
                                    <span className="transform -rotate-90 whitespace-nowrap font-bold tracking-[0.2em] text-blue-100 text-sm absolute w-40 text-center">
                                        {cls.name}
                                    </span>
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                    {currentSlot?.type === 'break' ? (
                                        <div className="text-yellow-400 animate-pulse">
                                            <p className="text-2xl font-black uppercase tracking-widest">Intervalo</p>
                                        </div>
                                    ) : entry ? (
                                        <>
                                            <div className="w-full flex justify-between items-start mb-1 px-2">
                                                 <Clock size={16} className="text-blue-300 opacity-60"/>
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-black text-white leading-none mb-1">{entry.subject}</h3>
                                            <p className="text-sm text-blue-200 font-medium tracking-wide">{entry.professor}</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-40">
                                            <div className="w-10 h-10 rounded-full border border-blue-300/50 flex items-center justify-center mb-1">
                                                <Clock size={20} />
                                            </div>
                                            <span className="text-sm font-bold tracking-widest uppercase text-blue-200">SEM AULA</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT SIDE: INFO & CLOCK */}
            <div className="w-[400px] h-full relative flex flex-col items-center justify-center p-0 bg-black/20 backdrop-blur-sm border-l border-white/5">
                
                {/* Vertical Date Line */}
                <div className="absolute left-8 h-full flex items-center justify-center w-8">
                     <div className="h-full w-px bg-gradient-to-b from-transparent via-red-600/50 to-transparent absolute left-1/2"></div>
                     <p className="transform -rotate-180 text-gray-400 font-mono text-xs tracking-[0.4em] font-bold whitespace-nowrap z-10 bg-[#150505] py-4" style={{ writingMode: 'vertical-rl' }}>
                        {dateString}
                    </p>
                </div>

                <div className="flex flex-col items-center text-center z-10 pl-16 pr-8 w-full">
                     {/* Shift Badge */}
                    <div className="mb-16">
                        <span className="px-6 py-2 rounded-full bg-[#1e1b4b] border border-[#4f46e5] text-[#818cf8] font-bold uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                            {currentShift === 'morning' ? 'TURNO DA MANHÃ' : currentShift === 'afternoon' ? 'TURNO DA TARDE' : 'SEM TURNO'}
                        </span>
                    </div>

                    {/* Clock */}
                    <div className="relative mb-20 text-center">
                        <h1 className="text-8xl leading-none font-bold tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                            {timeString}
                        </h1>
                    </div>

                    {/* Logo */}
                    <div className="mt-auto mb-12">
                         <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="w-48 opacity-90 drop-shadow-lg" alt="Logo" />
                    </div>
                </div>
            </div>

            {/* MODAL FULL VIEW */}
            {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full h-full max-w-[90vw] max-h-[90vh] bg-[#0f0f10] rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#18181b]">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
                                <Calendar className="text-red-500"/> Quadro Geral de Horários
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-gray-800 p-2 rounded-full hover:bg-red-600 hover:text-white text-gray-400 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Morning */}
                                <div className="bg-[#18181b] p-6 rounded-2xl border border-gray-800/50">
                                    <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wide">Matutino</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-gray-400">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white w-20">H</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="py-2 px-2 font-bold text-white text-center">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {MORNING_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-500 text-xs font-bold">{slot.start}</td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2 text-center border-l border-gray-800">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-xs">{entry.subject.slice(0, 15)}</p>
                                                                            <p className="text-[10px] text-gray-500 font-medium uppercase">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-gray-700 text-xs">-</span>}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Afternoon */}
                                <div className="bg-[#18181b] p-6 rounded-2xl border border-gray-800/50">
                                    <h3 className="text-lg font-bold text-red-400 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wide">Vespertino</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-gray-400">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white w-20">H</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="py-2 px-2 font-bold text-white text-center">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {AFTERNOON_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-500 text-xs font-bold">{slot.start}</td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2 text-center border-l border-gray-800">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-xs">{entry.subject.slice(0, 15)}</p>
                                                                            <p className="text-[10px] text-gray-500 font-medium uppercase">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-gray-700 text-xs">-</span>}
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