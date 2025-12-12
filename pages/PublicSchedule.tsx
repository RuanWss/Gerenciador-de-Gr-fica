
import React, { useState, useEffect, useRef } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Megaphone, Volume2, Maximize, Minimize } from 'lucide-react';

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
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [currentSlot, setCurrentSlot] = useState<TimeSlot | null>(null);
    
    // UI State
    const [manualShift, setManualShift] = useState<'morning' | 'afternoon'>('morning');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSlotId = useRef<string>('');

    // 1. Listeners
    useEffect(() => {
        const unsubscribeSchedule = listenToSchedule((data) => setSchedule(data || []));
        const unsubscribeConfig = listenToSystemConfig((config) => setSysConfig(config));
        return () => { unsubscribeSchedule(); unsubscribeConfig(); };
    }, []);

    // 2. Relógio e Detecção de Turno/Slot
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            checkCurrentSlot(now);

            // Auto-switch turno apenas se o usuário não tiver interagido recentemente (opcional, aqui forçamos pelo horário)
            const hour = now.getHours();
            if (hour >= 13 && manualShift === 'morning') setManualShift('afternoon');
            if (hour < 12 && manualShift === 'afternoon') setManualShift('morning');

        }, 1000);
        
        // Define turno inicial
        const h = new Date().getHours();
        if (h >= 13) setManualShift('afternoon');

        return () => clearInterval(timer);
    }, []);

    const checkCurrentSlot = (now: Date) => {
        const day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeVal = hours * 60 + minutes;

        if (day === 0 || day === 6) { setCurrentSlot(null); return; }

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
            }).catch(() => {});
        }
    };

    const playAlert = () => {
        if (audioRef.current) {
            audioRef.current.volume = 1.0;
            audioRef.current.play().catch(() => {});
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
        // Se estivermos mostrando o turno da tarde, mas o slot atual for da manhã (ou vice versa), não mostra nada
        if (currentSlot.shift !== manualShift) return null;

        return schedule.find(s => 
            s.classId === classId && 
            s.dayOfWeek === currentTime.getDay() && 
            s.slotId === currentSlot.id
        );
    };

    const activeClasses = manualShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
    
    // Formatação
    const dateString = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-[#0f0f10] text-white overflow-hidden flex flex-col font-sans relative selection:bg-red-500 selection:text-white">
            <audio ref={audioRef} src={ALERT_SOUND_URL} />

            {/* Audio overlay fix */}
            {!audioEnabled && (
                <div onClick={enableAudio} className="fixed inset-0 z-[9999] cursor-pointer flex items-center justify-center">
                    <div className="bg-red-600/90 backdrop-blur px-8 py-4 rounded-full animate-pulse shadow-lg flex items-center gap-4">
                        <Volume2 size={24} />
                        <span className="font-bold uppercase tracking-widest">Clique para ativar o som</span>
                    </div>
                </div>
            )}

            {/* HEADER CENTRALIZADO (CLOCK) */}
            <div className="pt-10 pb-6 text-center z-10 flex flex-col items-center">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" alt="Logo" className="h-16 w-auto mb-6 object-contain drop-shadow-xl" />
                
                <h1 className="text-[140px] leading-[0.8] font-['Montserrat'] font-black text-white tracking-tighter drop-shadow-2xl tabular-nums">
                    {timeString}
                </h1>
                
                <div className="bg-[#1a1a1a] border border-white/10 px-8 py-2 rounded-full mt-8 shadow-lg">
                    <span className="text-sm font-bold tracking-[0.2em] text-gray-400 uppercase">
                        {dateString}
                    </span>
                </div>
            </div>

            {/* CONTROLES / TURNO */}
            <div className="flex justify-center items-center gap-4 my-6 z-10">
                <button 
                    onClick={() => setManualShift(manualShift === 'morning' ? 'afternoon' : 'morning')}
                    className="group bg-black/40 border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 transition-all hover:bg-white/5 hover:border-white/20 shadow-lg"
                >
                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] transition-colors ${manualShift === 'morning' ? 'bg-green-500 text-green-500' : 'bg-blue-500 text-blue-500'} animate-pulse`}></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-300 group-hover:text-white">
                        Turno {manualShift === 'morning' ? 'Matutino' : 'Vespertino'}
                    </span>
                </button>
            </div>

            {/* WARNING BANNER */}
            {sysConfig?.isBannerActive && sysConfig?.showOnTV && (
                <div className="w-full max-w-5xl mx-auto mb-8 animate-in slide-in-from-top-4">
                    <div className={`border-l-4 ${sysConfig.bannerType === 'error' ? 'border-red-500 bg-red-900/20' : 'border-yellow-500 bg-yellow-900/20'} p-4 rounded-r-lg flex items-center gap-4 shadow-lg backdrop-blur-sm`}>
                        <Megaphone size={24} className={sysConfig.bannerType === 'error' ? 'text-red-500' : 'text-yellow-500'} />
                        <span className="text-lg font-bold text-white uppercase tracking-wide">{sysConfig.bannerMessage}</span>
                    </div>
                </div>
            )}

            {/* GRADE DE CARDS */}
            <div className="flex-1 w-full max-w-[1800px] mx-auto px-8 pb-8 z-10 flex flex-col justify-center">
                <div className={`grid gap-6 w-full ${activeClasses.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                    {activeClasses.map(cls => {
                        const entry = getEntry(cls.id);
                        
                        // Lógica de Estado do Card
                        let statusText = "LIVRE";
                        let statusSub = "";
                        let cardColor = "text-gray-700"; // Cor padrão para 'LIVRE' (escuro)
                        
                        if (currentSlot?.type === 'break' && currentSlot.shift === manualShift) {
                            statusText = "INTERVALO";
                            cardColor = "text-yellow-500";
                        } else if (entry) {
                            statusText = entry.subject;
                            statusSub = entry.professor;
                            cardColor = "text-white";
                        } else if (!currentSlot) {
                            statusText = "AGUARDANDO";
                            cardColor = "text-gray-800";
                        }

                        return (
                            <div key={cls.id} className="bg-[#0a0a0a] border border-white/10 rounded-xl h-[35vh] flex flex-col relative overflow-hidden group shadow-2xl transition-transform hover:scale-[1.01]">
                                {/* Header do Card */}
                                <div className="bg-[#121212] py-5 text-center border-b border-white/5 shadow-sm">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">{cls.name}</h2>
                                </div>
                                
                                {/* Conteúdo do Card */}
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                                    {/* Texto Principal */}
                                    <h3 className={`text-4xl md:text-5xl font-black uppercase tracking-tight leading-none mb-3 drop-shadow-lg ${cardColor} transition-colors duration-500`}>
                                        {statusText}
                                    </h3>
                                    
                                    {/* Subtexto (Professor) */}
                                    {statusSub && (
                                        <div className="bg-white/5 px-6 py-2 rounded-full border border-white/5 mt-4">
                                            <p className="text-lg font-bold text-gray-300 uppercase tracking-widest">
                                                {statusSub}
                                            </p>
                                        </div>
                                    )}

                                    {/* Efeito sutil de brilho no fundo para aulas ativas */}
                                    {entry && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FOOTER BUTTON */}
            <div className="absolute bottom-6 right-6 z-50">
                <button 
                    onClick={toggleFullscreen}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-500 hover:text-white transition-colors"
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
            </div>
        </div>
    );
};
