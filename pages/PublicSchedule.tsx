
import React, { useState, useEffect } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Maximize2, Monitor } from 'lucide-react';

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

const DEFAULT_PIN = "2016";

export const PublicSchedule: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('monitor_auth') === 'true');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'off'>('morning');
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isAuthorized) return;
        const unsubscribeSchedule = listenToSchedule(setSchedule);
        const unsubscribeConfig = listenToSystemConfig(setSysConfig);
        return () => {
            unsubscribeSchedule();
            unsubscribeConfig();
        };
    }, [isAuthorized]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const now = currentTime;
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        if (totalMinutes >= 420 && totalMinutes <= 750) setCurrentShift('morning');
        else if (totalMinutes >= 780 && totalMinutes <= 1260) setCurrentShift('afternoon');
        else setCurrentShift('morning'); // Default to morning for display if off-hours
    }, [currentTime]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
        setIsFullscreen(!isFullscreen);
    };

    const handlePinPress = (num: string) => {
        if (pin.length >= 4) return;
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) {
            if (newPin === DEFAULT_PIN) {
                setIsAuthorized(true);
                sessionStorage.setItem('monitor_auth', 'true');
            } else {
                setPinError(true);
                setTimeout(() => { setPin(''); setPinError(false); }, 1000);
            }
        }
    };

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 bg-[#0a0000] flex flex-col items-center justify-center p-6 z-[1000]">
                <div className="max-w-xs w-full text-center space-y-8">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-20 mx-auto" alt="CEMAL" />
                    <h2 className="text-white font-black text-xl uppercase tracking-widest">Painel TV</h2>
                    <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'border-gray-800'}`}></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((n) => (
                            <button key={n} onClick={() => handlePinPress(n)} className="h-16 bg-white/5 text-white text-2xl font-black rounded-2xl border border-white/5 active:scale-95 transition-all">{n}</button>
                        ))}
                    </div>
                    {pinError && <p className="text-red-500 font-black uppercase text-[10px] tracking-widest">PIN Incorreto</p>}
                </div>
            </div>
        );
    }

    const currentClasses = currentShift === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
    const dayOfWeek = currentTime.getDay() || 1;

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#050505] to-[#050505]">
            
            {/* Header Section - Centralized */}
            <header className="flex flex-col items-center justify-center pt-10 pb-6 shrink-0 z-10 relative">
                <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-14 mb-2 opacity-90 drop-shadow-lg" alt="CEMAL Logo" />
                
                {/* Giant Clock */}
                <div className="text-[10rem] md:text-[12rem] leading-[0.85] font-clock font-black tracking-tighter text-white drop-shadow-2xl">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                {/* Date Pill */}
                <div className="mt-6 bg-[#1a1a1a]/80 border border-white/5 px-8 py-2 rounded-full backdrop-blur-md shadow-xl">
                    <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.25em]">
                        {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Shift Indicator */}
                <div className="mt-4 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${currentShift !== 'off' ? 'bg-green-500 text-green-500 animate-pulse' : 'bg-red-500 text-red-500'}`}></div>
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                        Turno {currentShift === 'morning' ? 'Matutino' : currentShift === 'afternoon' ? 'Vespertino' : 'Encerrado'}
                    </span>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 px-12 pb-12 w-full max-w-[1920px] mx-auto flex flex-col justify-center">
                <div className="grid h-[55vh] gap-6" style={{ gridTemplateColumns: `repeat(${currentClasses.length}, 1fr)` }}>
                    {currentClasses.map(cls => {
                        const slots = currentShift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS;
                        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const currentSlot = slots.find(s => {
                            const [hS, mS] = s.start.split(':').map(Number);
                            const [hE, mE] = s.end.split(':').map(Number);
                            return nowMins >= (hS * 60 + mS) && nowMins < (hE * 60 + mE);
                        });
                        const currentEntry = currentSlot ? schedule.find(s => s.classId === cls.id && s.slotId === currentSlot.id && s.dayOfWeek === dayOfWeek) : null;

                        return (
                            <div key={cls.id} className="bg-[#0f0f10] rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-sm">
                                {/* Card Header */}
                                <div className="py-6 bg-white/[0.02] border-b border-white/5 text-center">
                                    <h3 className="text-xl font-black text-gray-200 uppercase tracking-widest">{cls.name}</h3>
                                </div>
                                
                                {/* Card Body */}
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                                    {currentSlot && currentSlot.type === 'break' ? (
                                         <div className="animate-pulse">
                                            <p className="text-yellow-500/80 font-black uppercase text-3xl tracking-widest">Intervalo</p>
                                         </div>
                                    ) : currentEntry ? (
                                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                            <h4 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-tight break-words max-w-full">
                                                {currentEntry.subject}
                                            </h4>
                                            <span className="bg-white/5 border border-white/10 px-6 py-2 rounded-full text-gray-400 font-bold uppercase text-xs tracking-widest">
                                                {currentEntry.professor}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-[#1a1a1a] font-black uppercase text-6xl tracking-widest select-none">LIVRE</p>
                                    )}
                                </div>

                                {/* Slot Time (Optional Indicator) */}
                                {currentSlot && (
                                    <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-20">
                                        <p className="text-[10px] font-mono font-bold text-gray-500 tracking-widest">{currentSlot.start} - {currentSlot.end}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Banner Overlay */}
            {sysConfig?.isBannerActive && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-600 z-50 py-3 overflow-hidden shadow-[0_-10px_30px_rgba(220,38,38,0.3)]">
                    <div className="animate-marquee whitespace-nowrap">
                        <p className="text-xl font-black text-white uppercase tracking-widest inline-block px-8">
                            AVISO IMPORTANTE: {sysConfig.bannerMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Controls */}
            <div className="fixed right-8 bottom-8 z-50 flex gap-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
                <button onClick={() => window.location.reload()} className="w-12 h-12 bg-black/50 border border-white/10 rounded-full text-gray-500 hover:text-white flex items-center justify-center backdrop-blur-md">
                    <Monitor size={18}/>
                </button>
                <button onClick={toggleFullscreen} className="w-12 h-12 bg-black/50 border border-white/10 rounded-full text-gray-500 hover:text-white flex items-center justify-center backdrop-blur-md">
                    <Maximize2 size={18}/>
                </button>
            </div>

            <style>{`
                .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 20s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
            `}</style>
        </div>
    );
};
