
import React, { useState, useEffect } from 'react';
import { listenToSchedule, listenToSystemConfig } from '../services/firebaseService';
import { ScheduleEntry, TimeSlot, SystemConfig } from '../types';
import { Clock, Maximize2, Minimize, Monitor, Bell, BookOpen } from 'lucide-react';

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
        else setCurrentShift('morning');
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
            <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center p-6 z-[1000]">
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
    const dayName = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' });

    return (
        <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
            <header className="relative z-10 flex items-center justify-between px-12 py-8 border-b border-white/5 bg-black/40 backdrop-blur-3xl shrink-0">
                <div className="flex items-center gap-10">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto" alt="CEMAL" />
                    <div className="h-12 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Grade de Horários</h1>
                        <p className="text-red-600 font-bold uppercase text-[9px] mt-2 tracking-widest">Sistema em Tempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-500 uppercase mb-1">{String(dayName)}</p>
                        <p className="text-xl font-black text-white uppercase">{currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                    </div>
                    <div className="text-center bg-white/5 px-8 py-3 rounded-2xl border border-white/10 min-w-[200px]">
                        <p className="text-5xl font-clock font-black text-white">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="grid h-full gap-4" style={{ gridTemplateColumns: `repeat(${currentClasses.length}, 1fr)` }}>
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
                            <div key={cls.id} className="bg-[#121214] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl h-full">
                                <div className="py-6 bg-black/40 border-b border-white/5 text-center">
                                    <h3 className="text-xl font-black text-white uppercase">{String(cls.name || '')}</h3>
                                </div>
                                <div className="p-8 flex-1 flex flex-col justify-center text-center">
                                    {currentSlot ? (
                                        currentSlot.type === 'break' ? (
                                            <p className="text-yellow-500 font-black uppercase text-2xl tracking-tighter">INTERVALO</p>
                                        ) : currentEntry ? (
                                            <>
                                                <h4 className="text-2xl font-black text-white uppercase mb-4">{String(currentEntry.subject || '')}</h4>
                                                <p className="text-gray-300 font-bold uppercase text-sm">{String(currentEntry.professor || '')}</p>
                                                <p className="text-[10px] text-gray-600 font-bold mt-8 uppercase">{currentSlot.start} - {currentSlot.end}</p>
                                            </>
                                        ) : (
                                            <p className="text-gray-700 font-black uppercase text-xs">Vago</p>
                                        )
                                    ) : (
                                        <p className="text-gray-800 font-black uppercase text-xs">Turno Encerrado</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {sysConfig?.isBannerActive && (
                <div className="bg-red-600 py-3 px-12 shrink-0">
                    <p className="text-lg font-black text-white uppercase text-center truncate">
                        AVISO: {String(sysConfig.bannerMessage || '')}
                    </p>
                </div>
            )}
            
            <div className="fixed right-8 bottom-8 flex gap-4">
                <button onClick={toggleFullscreen} className="w-12 h-12 bg-black/80 border border-white/10 text-white rounded-2xl flex items-center justify-center shadow-2xl"><Maximize2 size={20}/></button>
                <button onClick={() => { sessionStorage.removeItem('monitor_auth'); window.location.reload(); }} className="w-12 h-12 bg-black/80 border border-white/10 text-gray-500 rounded-2xl flex items-center justify-center shadow-2xl"><Monitor size={20}/></button>
            </div>
        </div>
    );
};
