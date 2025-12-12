
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Megaphone, Volume2, Sun, Moon } from 'lucide-react';

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
    
    // Estado para controlar se o áudio foi ativado pelo usuário
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
        }, 1000);
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

    const getFullEntry = (classId: string, slotId: string, day: number) => {
        return schedule.find(s => s.classId === classId && s.dayOfWeek === day && s.slotId === slotId);
    };

    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Warning Visibility Logic
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

            {/* --- HEADER (20% Height) --- */}
            <div className="h-[20vh] w-full flex flex-row border-b border-white/10 bg-black/30 backdrop-blur-md z-10">
                <div className={`${showWarning ? 'w-[70%] border-r border-white/10' : 'w-full'} h-full flex items-center justify-between px-12`}>
                    {/* Logo & Info */}
                    <div className="flex items-center gap-8">
                        <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" alt="Logo" className="h-[12vh] w-auto object-contain drop-shadow-xl" />
                        <div className="h-[8vh] w-px bg-white/10"></div>
                        <div>
                            <h1 className="text-[2.5vh] font-bold text-gray-200 uppercase tracking-[0.2em] mb-1">Quadro de Horários</h1>
                            <p className="text-[1.8vh] text-gray-400 font-medium">{dateString}</p>
                        </div>
                    </div>

                    {/* Clock */}
                    <div className="text-right">
                        <h1 className="text-[10vh] leading-none font-['Montserrat'] font-black text-white tracking-tighter drop-shadow-2xl tabular-nums">
                            {timeString}
                        </h1>
                    </div>
                </div>

                {/* Banner Area */}
                {showWarning && (
                    <div className="w-[30%] h-full flex items-center justify-center p-4 bg-red-900/10">
                        <div className="w-full h-full border-4 border-yellow-500/50 rounded-2xl flex flex-col items-center justify-center p-4 text-center animate-pulse bg-black/40">
                            <Megaphone size={32} className="text-yellow-500 mb-2" />
                            <p className="text-[2vh] font-bold text-yellow-50 uppercase leading-snug line-clamp-3">
                                {sysConfig?.bannerMessage}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MAIN CONTENT (80% Height) --- */}
            <div className="flex-1 p-6 overflow-hidden">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                    
                    {/* MATUTINO TABLE */}
                    <div className="flex flex-col bg-[#121212] rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                        {/* Table Header Section */}
                        <div className="bg-[#1a1a1a] p-4 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Sun size={24} /></div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Matutino</h3>
                            </div>
                            <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded text-sm font-bold border border-blue-500/20">07:20 às 12:00</span>
                        </div>

                        {/* Scrollable Table Area */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-[#121212] z-10 shadow-sm text-gray-400 text-[1.2vh] uppercase tracking-wider">
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 px-4 text-left w-24 bg-[#1a1a1a]">Horário</th>
                                        {MORNING_CLASSES.map(c => (
                                            <th key={c.id} className="py-3 px-2 text-center border-l border-white/5 bg-[#1a1a1a]">{c.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {MORNING_SLOTS.map(slot => {
                                        const isActive = currentSlot?.id === slot.id;
                                        if (slot.type === 'break') {
                                            return (
                                                <tr key={slot.id} className={`bg-blue-900/10 ${isActive ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
                                                    <td className="py-3 px-4 font-mono text-blue-300 font-bold border-r border-white/5 text-[1.4vh]">{slot.start}</td>
                                                    <td colSpan={MORNING_CLASSES.length} className="py-3 text-center font-bold text-blue-400 tracking-[0.3em] uppercase text-[1.4vh] animate-pulse">
                                                        Intervalo
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={slot.id} className={`transition-colors ${isActive ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}>
                                                <td className={`py-2 px-4 border-r border-white/5 font-mono text-[1.4vh] font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                    {slot.start} <span className="opacity-50 text-[1vh] block">{slot.end}</span>
                                                </td>
                                                {MORNING_CLASSES.map(cls => {
                                                    const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                    return (
                                                        <td key={cls.id + slot.id} className="py-2 px-2 text-center border-l border-white/5 relative group">
                                                            {entry ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className={`font-black uppercase text-[1.6vh] leading-tight mb-0.5 line-clamp-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                                        {entry.subject}
                                                                    </span>
                                                                    <span className={`text-[1.1vh] font-bold uppercase tracking-wider ${isActive ? 'text-blue-200' : 'text-gray-600'}`}>
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

                    {/* VESPERTINO TABLE */}
                    <div className="flex flex-col bg-[#121212] rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                        {/* Table Header Section */}
                        <div className="bg-[#1a1a1a] p-4 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Moon size={24} /></div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Vespertino</h3>
                            </div>
                            <span className="bg-red-900/30 text-red-300 px-3 py-1 rounded text-sm font-bold border border-red-500/20">13:00 às 20:00</span>
                        </div>

                        {/* Scrollable Table Area */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-[#121212] z-10 shadow-sm text-gray-400 text-[1.2vh] uppercase tracking-wider">
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 px-4 text-left w-24 bg-[#1a1a1a]">Horário</th>
                                        {AFTERNOON_CLASSES.map(c => (
                                            <th key={c.id} className="py-3 px-2 text-center border-l border-white/5 bg-[#1a1a1a]">{c.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {AFTERNOON_SLOTS.map(slot => {
                                        const isActive = currentSlot?.id === slot.id;
                                        if (slot.type === 'break') {
                                            return (
                                                <tr key={slot.id} className={`bg-red-900/10 ${isActive ? 'ring-2 ring-inset ring-red-500' : ''}`}>
                                                    <td className="py-3 px-4 font-mono text-red-300 font-bold border-r border-white/5 text-[1.4vh]">{slot.start}</td>
                                                    <td colSpan={AFTERNOON_CLASSES.length} className="py-3 text-center font-bold text-red-400 tracking-[0.3em] uppercase text-[1.4vh] animate-pulse">
                                                        Intervalo
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={slot.id} className={`transition-colors ${isActive ? 'bg-red-600/20' : 'hover:bg-white/5'}`}>
                                                <td className={`py-2 px-4 border-r border-white/5 font-mono text-[1.4vh] font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                    {slot.start} <span className="opacity-50 text-[1vh] block">{slot.end}</span>
                                                </td>
                                                {AFTERNOON_CLASSES.map(cls => {
                                                    const entry = getFullEntry(cls.id, slot.id, currentTime.getDay());
                                                    return (
                                                        <td key={cls.id + slot.id} className="py-2 px-2 text-center border-l border-white/5 relative group">
                                                            {entry ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className={`font-black uppercase text-[1.6vh] leading-tight mb-0.5 line-clamp-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                                        {entry.subject}
                                                                    </span>
                                                                    <span className={`text-[1.1vh] font-bold uppercase tracking-wider ${isActive ? 'text-red-200' : 'text-gray-600'}`}>
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
            </div>
        </div>
    );
};
