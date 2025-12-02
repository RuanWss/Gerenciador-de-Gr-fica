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

        // Shift Logic:
        // Morning: 07:00 (420) to 12:30 (750)
        // Afternoon: 12:30 (750) to 21:00 (1260)
        let shift: 'morning' | 'afternoon' | 'off' = 'off';

        if (timeVal >= 420 && timeVal < 750) {
            shift = 'morning';
        } else if (timeVal >= 750 && timeVal < 1260) {
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
                // Trigger Alarm on Change
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

    // Definição de colunas baseado no turno e responsividade
    const gridCols = currentShift === 'morning' 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    return (
        <div className="h-screen w-screen bg-gradient-to-b from-[#0f0f10] via-[#2a0a0a] to-[#0f0f10] text-white overflow-hidden flex flex-col items-center relative font-sans">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {/* --- HEADER SECTION (30% Height max) --- */}
            <div className="w-full flex flex-col items-center justify-center py-4 z-10 shrink-0 h-[30vh] min-h-[200px]">
                {/* 1. Logo */}
                <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    alt="Logo SchoolPrint" 
                    className="h-[8vh] object-contain mb-2 drop-shadow-xl"
                />

                {/* 2. Clock */}
                <h1 className="text-[12vh] leading-none font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] font-mono">
                    {timeString}
                </h1>

                {/* 3. Date */}
                <div className="bg-white/10 px-6 py-1 rounded-full backdrop-blur-sm border border-white/5 mt-2">
                     <p className="text-[1.8vh] text-gray-200 font-bold tracking-widest uppercase text-center whitespace-nowrap">
                        {dateString}
                    </p>
                </div>
            </div>

            {/* --- MAIN CONTENT SECTION (Fill remaining height) --- */}
            <div className="flex-1 w-full max-w-[98%] mx-auto flex flex-col items-center pb-4 z-10 min-h-0">
                
                {/* Shift Indicator */}
                <div className="mb-4 flex items-center gap-3 shrink-0">
                    <span className={`h-3 w-3 rounded-full ${currentShift !== 'off' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-sm font-bold tracking-[0.2em] text-gray-400 uppercase">
                        {currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno Vespertino' : 'Fora de Horário'}
                    </span>
                </div>

                {currentShift === 'off' ? (
                     <div className="flex flex-col items-center justify-center h-full w-full opacity-50">
                        <AlertCircle size={64} className="mb-4 text-gray-500"/>
                        <p className="text-2xl font-bold text-gray-400 text-center">Escola Fechada / Intervalo entre Turnos</p>
                     </div>
                ) : (
                    <div className={`grid ${gridCols} gap-4 w-full h-full`}>
                        {activeClasses.map(cls => {
                            const entry = getEntry(cls.id);
                            return (
                                <div key={cls.id} className="relative group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-500 hover:bg-white/10 h-full min-h-[140px]">
                                    {/* Class Label Header */}
                                    <div className="bg-[#ef4444] py-2 px-3 flex items-center justify-center shadow-lg shrink-0">
                                        <h2 className="text-[2.5vh] font-black text-white uppercase tracking-wider truncate">
                                            {cls.name}
                                        </h2>
                                    </div>
                                    
                                    {/* Info Body */}
                                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center relative">
                                        
                                        {currentSlot?.type === 'break' ? (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/20 backdrop-blur-sm animate-pulse">
                                                <Clock size={40} className="text-yellow-400 mb-2"/>
                                                <span className="text-2xl font-black text-yellow-100 uppercase tracking-widest">INTERVALO</span>
                                             </div>
                                        ) : entry ? (
                                            <>
                                                <div className="mb-1 w-full">
                                                    <p className="text-[1.2vh] font-bold text-gray-400 uppercase tracking-widest mb-1">Disciplina</p>
                                                    <h3 className="text-[3vh] leading-tight font-black text-white line-clamp-2">
                                                        {entry.subject}
                                                    </h3>
                                                </div>
                                                
                                                <div className="w-12 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent my-2 shrink-0"></div>

                                                <div className="w-full">
                                                    <p className="text-[1.2vh] font-bold text-gray-400 uppercase tracking-widest mb-1">Professor(a)</p>
                                                    <p className="text-[2.2vh] font-bold text-red-200 line-clamp-1">
                                                        {entry.professor}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center opacity-30">
                                                <div className="w-12 h-12 rounded-full border-2 border-gray-500 flex items-center justify-center mb-2">
                                                    <Clock size={24} />
                                                </div>
                                                <span className="text-lg font-bold tracking-widest uppercase text-gray-400">SEM AULA</span>
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
                className="absolute bottom-4 right-4 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all backdrop-blur-md z-50"
                title="Ver Grade Completa"
            >
                <Maximize2 size={20} />
            </button>

             {/* MODAL FULL VIEW */}
             {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-[#0f0f10] rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#18181b] shrink-0">
                            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3 uppercase tracking-wider">
                                <Calendar className="text-red-500"/> Quadro Geral
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-gray-800 p-2 rounded-full hover:bg-red-600 hover:text-white text-gray-400 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#0f0f10]">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Morning */}
                                <div className="bg-[#18181b] p-4 rounded-2xl border border-gray-800/50">
                                    <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wide">Matutino</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs md:text-sm text-gray-400">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white w-16">H</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="py-2 px-1 font-bold text-white text-center">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {MORNING_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-500 text-[10px] md:text-xs font-bold whitespace-nowrap">{slot.start}</td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-2 px-1 text-center border-l border-gray-800">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-[10px] md:text-xs truncate max-w-[80px] md:max-w-none mx-auto">{entry.subject}</p>
                                                                            <p className="text-[9px] text-gray-500 font-medium uppercase truncate max-w-[80px] md:max-w-none mx-auto">{entry.professor.split(' ')[0]}</p>
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
                                <div className="bg-[#18181b] p-4 rounded-2xl border border-gray-800/50">
                                    <h3 className="text-lg font-bold text-red-400 mb-4 border-b border-gray-700 pb-2 uppercase tracking-wide">Vespertino</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs md:text-sm text-gray-400">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white w-16">H</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="py-2 px-1 font-bold text-white text-center">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {AFTERNOON_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-500 text-[10px] md:text-xs font-bold whitespace-nowrap">{slot.start}</td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-2 px-1 text-center border-l border-gray-800">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-[10px] md:text-xs truncate max-w-[80px] md:max-w-none mx-auto">{entry.subject}</p>
                                                                            <p className="text-[9px] text-gray-500 font-medium uppercase truncate max-w-[80px] md:max-w-none mx-auto">{entry.professor.split(' ')[0]}</p>
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