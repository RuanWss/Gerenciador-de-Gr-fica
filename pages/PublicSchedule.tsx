
import React, { useState, useEffect, useRef } from 'react';
import { getFullSchedule } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot } from '../types';
import { Clock, Calendar, X, AlertCircle, Maximize2 } from 'lucide-react';

// --- CONFIGURATIONS ---

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
        const data = await getFullSchedule();
        setSchedule(data);
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

    // Format Date: SEXTA-FEIRA, 28 DE NOVEMBRO DE 2025
    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

    const classes = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-black text-white overflow-hidden flex relative selection:bg-red-500/30">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {/* LEFT SIDE: CARDS GRID */}
            <div className="flex-1 p-6 flex flex-col justify-center h-screen relative z-10">
                {/* Button Floating within left area like image */}
                <div className="absolute top-1/2 -translate-y-1/2 -right-6 z-20">
                     <button 
                        onClick={() => setShowModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-red-900/50 flex flex-col items-center gap-1 transition-transform hover:scale-105"
                    >
                        <Maximize2 size={24} />
                        <span className="text-[10px] uppercase tracking-widest">Visualizar</span>
                        <span className="text-sm">Quadro Geral</span>
                    </button>
                </div>

                <div className={`grid gap-4 w-full max-w-4xl ${classes.length > 3 ? 'grid-cols-2' : 'grid-cols-1'} h-full max-h-[90vh]`}>
                    {classes.map(cls => {
                        const entry = getEntry(cls.id);
                        return (
                            <div key={cls.id} className="group relative bg-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl flex transition-all hover:bg-blue-900/30">
                                {/* Vertical Label */}
                                <div className="w-16 bg-blue-600/20 border-r border-blue-500/30 flex items-center justify-center relative">
                                    <span className="transform -rotate-90 whitespace-nowrap font-bold tracking-widest text-blue-100 text-sm absolute">
                                        {cls.name}
                                    </span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                    {currentSlot?.type === 'break' ? (
                                        <div className="text-yellow-400 animate-pulse">
                                            <p className="text-2xl font-black uppercase">Intervalo</p>
                                        </div>
                                    ) : entry ? (
                                        <>
                                            <div className="mb-2">
                                                <Clock size={24} className="text-blue-400 mx-auto mb-1 opacity-50"/>
                                                <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">{currentSlot?.start} - {currentSlot?.end}</p>
                                            </div>
                                            <h3 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">{entry.subject}</h3>
                                            <p className="text-lg text-gray-300 font-medium">{entry.professor}</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-40">
                                            <div className="w-12 h-12 rounded-full border-2 border-gray-500 flex items-center justify-center mb-2">
                                                <Clock size={24} />
                                            </div>
                                            <span className="text-xl font-bold tracking-widest uppercase">Sem Aula</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT SIDE: INFO & CLOCK */}
            <div className="w-[35%] relative flex flex-col items-center justify-center p-8 border-l border-white/5 bg-black/20">
                {/* Vertical Date Line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-red-600/50 to-transparent"></div>
                <div className="absolute left-6 h-full flex items-center">
                    <p className="transform -rotate-180 text-gray-500 font-mono text-sm tracking-[0.3em] font-bold whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                        {dateString}
                    </p>
                </div>

                <div className="flex flex-col items-center text-center z-10 pl-12">
                     {/* Shift Badge */}
                    <div className="mb-12">
                        <span className="px-6 py-2 rounded-full bg-blue-900/50 border border-blue-500/50 text-blue-200 font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            {currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno da Tarde' : 'Sem Turno Ativo'}
                        </span>
                    </div>

                    {/* Clock */}
                    <div className="relative mb-12">
                        <h1 className="text-[10rem] leading-none font-bold font-sans tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h1>
                        <p className="text-right text-4xl font-light text-gray-400 -mt-4 mr-4">
                            {currentTime.getSeconds().toString().padStart(2, '0')}
                        </p>
                    </div>

                    {/* Logo */}
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="w-64 opacity-90 drop-shadow-lg" alt="Logo" />
                </div>
            </div>

            {/* MODAL FULL VIEW */}
            {showModal && (
                 <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-7xl bg-gray-900 rounded-3xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Calendar className="text-red-500"/> Grade Completa
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-gray-700 p-2 rounded-full hover:bg-red-600 hover:text-white text-gray-300 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-gray-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Morning */}
                                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-700 pb-2 uppercase">Manhã</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-gray-300">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white">Horário</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="py-2 px-2 font-bold text-white">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {MORNING_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-gray-700/50">
                                                        <td className="py-3 font-mono text-gray-500 text-xs font-bold">{slot.start}</td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-xs">{entry.subject.slice(0, 15)}</p>
                                                                            <p className="text-[10px] text-gray-500 font-medium">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-gray-600">-</span>}
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
                                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-xl font-bold text-red-400 mb-4 border-b border-gray-700 pb-2 uppercase">Tarde</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-gray-300">
                                            <thead>
                                                <tr className="text-left border-b border-gray-700">
                                                    <th className="py-2 font-bold text-white">Horário</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="py-2 px-2 font-bold text-white">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {AFTERNOON_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-gray-700/50">
                                                        <td className="py-3 font-mono text-gray-500 text-xs font-bold">{slot.start}</td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white text-xs">{entry.subject.slice(0, 15)}</p>
                                                                            <p className="text-[10px] text-gray-500 font-medium">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-gray-600">-</span>}
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
