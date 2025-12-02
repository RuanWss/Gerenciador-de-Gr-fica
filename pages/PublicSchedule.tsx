import React, { useState, useEffect, useRef } from 'react';
import { getFullSchedule } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot } from '../types';
import { Clock, Calendar, ArrowLeft, Maximize2, X } from 'lucide-react';

// --- FIXED CONFIGURATIONS ---

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
    { id: '1em', name: '1ª Série EM' },
    { id: '2em', name: '2ª Série EM' },
    { id: '3em', name: '3ª Série EM' },
];

// Alert Sound (Soft Chime)
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";

export const PublicSchedule: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'night' | 'weekend'>('morning');
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    const [showModal, setShowModal] = useState(false);
    
    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    // Clock & Slot Calculation
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentStatus(now);
        }, 1000);
        
        // Initial Data Load
        loadSchedule();

        return () => clearInterval(timer);
    }, []);

    const loadSchedule = async () => {
        const data = await getFullSchedule();
        setSchedule(data);
    };

    const checkCurrentStatus = (now: Date) => {
        const day = now.getDay(); // 0 = Sunday
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        // Check Weekend
        if (day === 0 || day === 6) {
            setCurrentShift('weekend');
            setCurrentSlot(null);
            return;
        }

        // Determine Shift based on hour
        let shift: 'morning' | 'afternoon' | 'night' = 'night';
        if (timeVal >= (7 * 60 + 20) && timeVal < (12 * 60)) {
            shift = 'morning';
        } else if (timeVal >= (13 * 60) && timeVal < (20 * 60)) {
            shift = 'afternoon';
        }

        setCurrentShift(shift as any);

        // Find Current Slot
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
            // Play Audio if slot changed
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
            audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));
            // Stop after 4 seconds logic handled by track duration usually, but ensuring:
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
        return schedule.find(s => 
            s.classId === classId && 
            s.dayOfWeek === day && 
            s.slotId === currentSlot.id
        );
    };

    const getFullEntry = (classId: string, slotId: string, day: number) => {
        return schedule.find(s => 
            s.classId === classId && 
            s.dayOfWeek === day && 
            s.slotId === slotId
        );
    };

    const renderGrid = () => {
        const isMorning = currentShift === 'morning';
        const classes = isMorning ? MORNING_CLASSES : AFTERNOON_CLASSES;

        if (currentShift === 'night' || currentShift === 'weekend') {
            return (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <Clock size={80} className="text-white/20 mb-4 animate-pulse" />
                    <h2 className="text-4xl font-bold text-white mb-2">Turno Encerrado</h2>
                    <p className="text-xl text-gray-400">Não há aulas acontecendo neste momento.</p>
                </div>
            );
        }

        // Show Break
        if (currentSlot?.type === 'break') {
            return (
                <div className="flex flex-col items-center justify-center h-[50vh] animate-in zoom-in duration-500">
                    <div className="bg-yellow-500 text-black px-12 py-6 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.5)]">
                        <h2 className="text-6xl font-black uppercase tracking-widest">INTERVALO</h2>
                        <p className="text-center text-xl font-bold mt-2">{currentSlot.start} - {currentSlot.end}</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={`grid gap-6 ${isMorning ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'} h-full`}>
                {classes.map(cls => {
                    const entry = getEntry(cls.id);
                    return (
                        <div key={cls.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-brand-600"></div>
                            <div className="mb-4">
                                <h3 className="text-4xl font-black text-white mb-1">{cls.name}</h3>
                                <div className="h-1 w-12 bg-white/20 rounded-full"></div>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center">
                                {entry ? (
                                    <>
                                        <p className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-2">Disciplina</p>
                                        <p className="text-3xl font-bold text-white mb-6 leading-tight">{entry.subject}</p>
                                        
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Professor(a)</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                                {entry.professor.charAt(0)}
                                            </div>
                                            <p className="text-xl font-medium text-gray-200">{entry.professor}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center opacity-50">
                                        <p className="text-2xl font-bold text-gray-500">Aula Vaga</p>
                                        <p className="text-sm text-gray-600">ou não cadastrada</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-sm font-mono text-white">
                                    {currentSlot ? `${currentSlot.start} - ${currentSlot.end}` : '--:--'}
                                </span>
                                <span className="text-xs font-bold text-green-400 uppercase flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Em andamento
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-transparent p-6 flex flex-col text-white font-sans overflow-hidden">
            <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />

            {/* HEADER */}
            <header className="flex justify-between items-center mb-10 bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-6">
                    <a href="/" className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all">
                        <ArrowLeft />
                    </a>
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto" alt="Logo" />
                    <div className="h-12 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">Quadro de Horários</h1>
                        <p className="text-brand-400 font-medium">{currentShift === 'morning' ? 'Turno Matutino' : currentShift === 'afternoon' ? 'Turno Vespertino' : 'Escola Fechada'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-6xl font-black font-mono tracking-tighter leading-none">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-lg text-gray-400 font-medium uppercase mt-1 flex items-center justify-end gap-2">
                            <Calendar size={18} />
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </p>
                    </div>
                </div>
            </header>

            {/* CURRENT STATUS BAR */}
            <div className="mb-8 flex justify-center">
                {currentSlot ? (
                    <div className="bg-brand-600 text-white px-8 py-2 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-3 animate-pulse">
                        <Clock size={20} />
                        <span className="font-bold text-lg uppercase">{currentSlot.label} ({currentSlot.start} - {currentSlot.end})</span>
                    </div>
                ) : (
                    <div className="bg-gray-800 text-gray-400 px-8 py-2 rounded-full">
                        Aguardando início das aulas
                    </div>
                )}
            </div>

            {/* MAIN GRID */}
            <main className="flex-1">
                {renderGrid()}
            </main>
            
            {/* FOOTER ACTIONS */}
            <div className="mt-8 flex justify-center">
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl border border-white/20 transition-all font-bold uppercase tracking-wider shadow-lg"
                >
                    <Maximize2 size={20} />
                    Visão Geral do Quadro
                </button>
            </div>

            {/* FULL SCHEDULE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
                    <div className="w-full h-full max-w-7xl bg-[#0f172a] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Calendar /> Grade Completa
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-red-600 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                            {/* Simplified Matrix View */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Morning */}
                                <div>
                                    <h3 className="text-xl font-bold text-brand-400 mb-4 border-b border-brand-900 pb-2">Manhã</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-white/10">
                                                    <th className="py-2">Horário</th>
                                                    {MORNING_CLASSES.map(c => <th key={c.id} className="py-2 px-2 text-white">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {MORNING_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-400 text-xs">{slot.start}</td>
                                                        {MORNING_CLASSES.map(cls => {
                                                            // Assuming View for TODAY, otherwise we need a Day Selector in modal
                                                            // For simplicity showing TODAY's full schedule
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white">{entry.subject.slice(0, 10)}..</p>
                                                                            <p className="text-[10px] text-gray-500">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-white/10">-</span>}
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
                                <div>
                                    <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-blue-900 pb-2">Tarde</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b border-white/10">
                                                    <th className="py-2">Horário</th>
                                                    {AFTERNOON_CLASSES.map(c => <th key={c.id} className="py-2 px-2 text-white">{c.name}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {AFTERNOON_SLOTS.filter(s => s.type === 'class').map(slot => (
                                                    <tr key={slot.id} className="hover:bg-white/5">
                                                        <td className="py-3 font-mono text-gray-400 text-xs">{slot.start}</td>
                                                        {AFTERNOON_CLASSES.map(cls => {
                                                            const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                            return (
                                                                <td key={cls.id + slot.id} className="py-3 px-2">
                                                                    {entry ? (
                                                                        <div>
                                                                            <p className="font-bold text-white">{entry.subject.slice(0, 10)}..</p>
                                                                            <p className="text-[10px] text-gray-500">{entry.professor.split(' ')[0]}</p>
                                                                        </div>
                                                                    ) : <span className="text-white/10">-</span>}
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