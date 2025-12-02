import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot } from '../types';
import { Clock, Calendar, X, Maximize2, AlertCircle } from 'lucide-react';

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
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [showModal, setShowModal] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    // 1. Realtime Database Listener
    useEffect(() => {
        const unsubscribe = listenToSchedule((data) => {
            setSchedule(data || []);
        });
        return () => unsubscribe();
    }, []);

    // 2. Clock & Shift Logic
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentStatus(now);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const checkCurrentStatus = (now: Date) => {
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        // Weekend Check (Optional)
        if (day === 0 || day === 6) {
            setCurrentShift('off');
            setCurrentSlot(null);
            return;
        }

        // Shift Logic
        let shift: 'morning' | 'afternoon' | 'off' = 'off';

        if (timeVal >= 420 && timeVal < 750) { // 07:00 - 12:30
            shift = 'morning';
        } else if (timeVal >= 750 && timeVal < 1260) { // 12:30 - 21:00
            shift = 'afternoon';
        }

        setCurrentShift(shift);

        // Slot Detection
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
                setCurrentSlot(foundSlot);
                if (foundSlot.id !== lastSlotId.current) {
                    lastSlotId.current = foundSlot.id;
                    playAlert();
                }
            } else {
                setCurrentSlot(null);
                lastSlotId.current = ''; 
            }
        } else {
            setCurrentSlot(null);
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
            }, 3000);
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

    const activeClasses = currentShift === 'morning' ? MORNING_CLASSES : (currentShift === 'afternoon' ? AFTERNOON_CLASSES : []);

    // Definição rígida de grid para alinhamento
    const gridCols = currentShift === 'morning' ? 4 : 3;

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-[#0f0f10] via-[#2a0a0a] to-[#0f0f10] text-white overflow-hidden flex flex-col relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {/* --- HEADER SECTION (Fixed Height 20%) --- */}
            <div className="h-[20%] w-full flex flex-col items-center justify-center relative shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-8 justify-center w-full">
                         <img 
                            src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                            alt="Logo" 
                            className="h-[10vh] w-auto object-contain drop-shadow-xl"
                        />
                        <h1 className="text-[11vh] leading-none font-bold tracking-tighter text-white drop-shadow-2xl font-mono tabular-nums">
                            {timeString}
                        </h1>
                    </div>
                    <div className="mt-2 bg-white/5 px-8 py-1 rounded-full border border-white/5">
                        <p className="text-[2vh] text-gray-300 font-bold tracking-[0.3em] uppercase">
                            {dateString}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- STATUS INDICATOR BAR (Fixed Height 6%) --- */}
            <div className="h-[6%] flex items-center justify-center shrink-0 z-10 mt-2">
                 <div className="flex items-center gap-3 px-6 py-1.5 bg-black/40 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                    <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></span>
                    <span className="text-[1.6vh] font-bold tracking-[0.15em] text-gray-200 uppercase">
                        {currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno Vespertino' : 'Fora de Horário'}
                    </span>
                </div>
            </div>

            {/* --- CARDS GRID SECTION (Remaining Height) --- */}
            <div className="flex-1 w-full p-8 pb-10 flex items-center justify-center">
                
                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center opacity-40 animate-pulse">
                        <AlertCircle size={100} className="mb-6 text-gray-600"/>
                        <p className="text-4xl font-bold text-gray-500 tracking-widest uppercase">Sem Atividades</p>
                     </div>
                ) : (
                    <div 
                        className="grid gap-6 w-full h-full" 
                        style={{ 
                            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` 
                        }}
                    >
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            return (
                                <div key={cls.id} className="flex flex-col bg-[#121212] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl h-full relative group">
                                    
                                    {/* Card Header (Fixed Height 15%) */}
                                    <div className="h-[15%] bg-gradient-to-b from-[#1a1a1a] to-[#121212] flex items-center justify-center border-b border-white/5">
                                        <h2 className="text-[2.5vh] font-black text-gray-200 uppercase tracking-widest">
                                            {cls.name}
                                        </h2>
                                    </div>
                                    
                                    {/* Card Body (Remaining 85%) */}
                                    <div className="h-[85%] relative w-full">
                                        {currentSlot?.type === 'break' ? (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/10 z-20">
                                                <Clock size={64} className="text-yellow-500 mb-6 drop-shadow-lg animate-bounce"/>
                                                <span className="text-[4vh] font-black text-yellow-500 uppercase tracking-[0.2em]">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <div className="flex flex-col h-full">
                                                {/* Subject Section - Fixed 60% Height */}
                                                <div className="h-[60%] flex flex-col items-center justify-center border-b border-white/5 px-4 bg-gradient-to-b from-[#151515] to-[#121212]">
                                                    <p className="text-[1.2vh] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Disciplina</p>
                                                    <h3 className="text-[3.2vh] leading-none font-black text-white text-center uppercase drop-shadow-md line-clamp-2">
                                                        {entry.subject}
                                                    </h3>
                                                </div>

                                                {/* Professor Section - Fixed 40% Height */}
                                                <div className="h-[40%] flex flex-col items-center justify-center px-4 bg-[#101010]">
                                                    <p className="text-[1.2vh] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Professor</p>
                                                    <p className="text-[2.2vh] font-bold text-red-500 text-center uppercase tracking-wide truncate w-full">
                                                        {entry.professor}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                                <span className="text-[3vh] font-bold tracking-widest uppercase text-gray-600">LIVRE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Floating Button for Full View */}
            <button 
                onClick={() => setShowModal(true)}
                className="absolute bottom-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-gray-500 hover:text-white transition-all backdrop-blur-md z-50"
            >
                <Maximize2 size={24} />
            </button>

             {/* MODAL FULL VIEW */}
             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-[#0f0f10] rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#18181b] shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
                                <Calendar className="text-red-500"/> Quadro Geral
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-gray-800 p-2 rounded-full hover:bg-red-600 hover:text-white text-gray-400 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Morning Table */}
                                <div className="bg-[#18181b] rounded-2xl border border-gray-800/50 overflow-hidden">
                                    <div className="bg-blue-900/20 p-3 border-b border-blue-900/30">
                                        <h3 className="text-lg font-bold text-blue-400 uppercase tracking-wide text-center">Matutino</h3>
                                    </div>
                                    <table className="w-full text-sm text-gray-400">
                                        <thead>
                                            <tr className="bg-white/5 text-white">
                                                <th className="py-3 px-2 font-bold w-20 border-r border-white/10">HORA</th>
                                                {MORNING_CLASSES.map(c => <th key={c.id} className="py-3 px-1 font-bold text-center border-l border-white/10">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {MORNING_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 font-mono text-gray-500 text-xs font-bold border-r border-white/10 text-center">{slot.start}</td>
                                                    {MORNING_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="py-2 px-1 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-white text-xs">{entry.subject}</span>
                                                                        <span className="text-[10px] text-gray-500 uppercase">{entry.professor.split(' ')[0]}</span>
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

                                {/* Afternoon Table */}
                                <div className="bg-[#18181b] rounded-2xl border border-gray-800/50 overflow-hidden">
                                     <div className="bg-red-900/20 p-3 border-b border-red-900/30">
                                        <h3 className="text-lg font-bold text-red-400 uppercase tracking-wide text-center">Vespertino</h3>
                                    </div>
                                    <table className="w-full text-sm text-gray-400">
                                        <thead>
                                            <tr className="bg-white/5 text-white">
                                                <th className="py-3 px-2 font-bold w-20 border-r border-white/10">HORA</th>
                                                {AFTERNOON_CLASSES.map(c => <th key={c.id} className="py-3 px-1 font-bold text-center border-l border-white/10">{c.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {AFTERNOON_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                <tr key={slot.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-2 font-mono text-gray-500 text-xs font-bold border-r border-white/10 text-center">{slot.start}</td>
                                                    {AFTERNOON_CLASSES.map(cls => {
                                                        const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                        return (
                                                            <td key={cls.id + slot.id} className="py-2 px-1 text-center border-l border-white/5">
                                                                {entry ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-white text-xs">{entry.subject}</span>
                                                                        <span className="text-[10px] text-gray-500 uppercase">{entry.professor.split(' ')[0]}</span>
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
            )}
        </div>
    );
};