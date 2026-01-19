
import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToSystemConfig, 
    updateSystemConfig,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAttendanceLogs
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig,
    ScheduleEntry,
    TimeSlot,
    StaffMember,
    AttendanceLog
} from '../types';
import { 
    Printer, Search, Users, Settings, RefreshCw, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Truck, Save, X, Loader2, Megaphone, ToggleLeft, ToggleRight, Download,
    Database, CalendarClock, Trash2, Edit, Monitor, GraduationCap, Radio
} from 'lucide-react';
import { Button } from '../components/Button';
import { CLASSES, EFAI_CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { GenneraSyncPanel } from './GenneraSyncPanel';

// --- CONFIGURAÇÃO DE HORÁRIOS (Espelhado do PublicSchedule) ---
const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:00', end: '09:20', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const MORNING_SLOTS_EFAI: TimeSlot[] = [
    { id: 'm1', start: '07:30', end: '08:25', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:25', end: '09:20', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'mb1', start: '09:20', end: '09:40', type: 'break', label: 'INTERVALO', shift: 'morning' },
    { id: 'm3', start: '09:40', end: '10:35', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:35', end: '11:30', type: 'class', label: '4º Horário', shift: 'morning' },
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

const EFAI_CLASSES_LIST = EFAI_CLASSES.map(c => ({
    id: c.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: c
}));

const MORNING_CLASSES_LIST = [
    { id: '6efaf', name: '6º EFAF' },
    { id: '7efaf', name: '7º EFAF' },
    { id: '8efaf', name: '8º EFAF' },
    { id: '9efaf', name: '9º EFAF' },
];

const AFTERNOON_CLASSES_LIST = [
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
];

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-lg flex items-center gap-6">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${color}/20 text-${color}`}>
            <Icon size={32} />
        </div>
        <div>
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">{title}</p>
            <p className="text-4xl font-black text-white">{value}</p>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => {
    const statusInfo = {
        [ExamStatus.PENDING]: { text: 'Pendente', icon: Hourglass, color: 'yellow' },
        [ExamStatus.IN_PROGRESS]: { text: 'Em Produção', icon: Printer, color: 'blue' },
        [ExamStatus.READY]: { text: 'Pronto p/ Retirada', icon: ClipboardCheck, color: 'purple' },
        [ExamStatus.COMPLETED]: { text: 'Entregue', icon: CheckCircle, color: 'green' },
    }[status] || { text: status, icon: Clock, color: 'gray' };

    const Icon = statusInfo.icon;

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusInfo.color}-500/10 text-${statusInfo.color}-400 border-${statusInfo.color}-500/20`}>
            <Icon size={14} />
            {statusInfo.text}
        </span>
    );
};

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'sync' | 'schedule' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Data States
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examSearch, setExamSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    
    // Config States
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Schedule States
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [scheduleDay, setScheduleDay] = useState(new Date().getDay() || 1);
    const [scheduleLevel, setScheduleLevel] = useState<'EFAI' | 'EFAF' | 'EM'>('EFAF');
    const [editingSlot, setEditingSlot] = useState<{classId: string, slotId: string} | null>(null);
    const [editForm, setEditForm] = useState({ subject: '', professor: '' });
    const [isSyncingTV, setIsSyncingTV] = useState(false);

    useEffect(() => {
        const fetchInitial = async () => {
            setIsLoading(true);
            try {
                const [allExams, allStudents] = await Promise.all([ getExams(), getStudents() ]);
                setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
                setStudents(allStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitial();

        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
        });

        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubStaff = listenToStaffMembers(setStaffList);

        // Listen to today's attendance
        const today = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(today, (logs) => {
            setAttendanceLogs(logs);
        });

        return () => { unsubConfig(); unsubSchedule(); unsubStaff(); unsubAttendance(); };
    }, []);

    // --- HANDLERS ---

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };
    
    const handleSaveConfig = async () => {
        const newConfig: SystemConfig = {
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
        };
        await updateSystemConfig(newConfig);
        alert("Configurações salvas!");
    };

    const handleSyncTV = async () => {
        setIsSyncingTV(true);
        try {
            await updateSystemConfig({
                ...(sysConfig || { bannerMessage: '', bannerType: 'info', isBannerActive: false }),
                lastScheduleSync: Date.now()
            });
            alert("Sinal de sincronização enviado para a TV com sucesso!");
        } catch (e) {
            console.error(e);
            alert("Erro ao enviar sinal.");
        } finally {
            setIsSyncingTV(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!editingSlot) return;
        
        // Find existing entry ID if any
        const existingEntry = schedule.find(s => 
            s.dayOfWeek === scheduleDay && 
            s.classId === editingSlot.classId && 
            s.slotId === editingSlot.slotId
        );

        if (!editForm.subject && !editForm.professor) {
            // Delete if empty
            if (existingEntry) await deleteScheduleEntry(existingEntry.id);
        } else {
            // Save/Update
            const entry: ScheduleEntry = {
                id: existingEntry?.id || '',
                dayOfWeek: scheduleDay,
                classId: editingSlot.classId,
                className: [...EFAI_CLASSES_LIST, ...MORNING_CLASSES_LIST, ...AFTERNOON_CLASSES_LIST].find(c => c.id === editingSlot.classId)?.name || '',
                slotId: editingSlot.slotId,
                subject: editForm.subject,
                professor: editForm.professor
            };
            await saveScheduleEntry(entry);
        }
        setEditingSlot(null);
        setEditForm({ subject: '', professor: '' });
    };

    const getScheduleEntry = (classId: string, slotId: string) => {
        return schedule.find(s => s.dayOfWeek === scheduleDay && s.classId === classId && s.slotId === slotId);
    };

    // --- FILTERS & STATS ---

    const filteredExams = exams.filter(e => 
        String(e.title || '').toLowerCase().includes(examSearch.toLowerCase()) || 
        String(e.teacherName || '').toLowerCase().includes(examSearch.toLowerCase())
    );

    const pendingExams = exams.filter(e => e.status === ExamStatus.PENDING).length;
    const inProgressExams = exams.filter(e => e.status === ExamStatus.IN_PROGRESS).length;
    const readyExams = exams.filter(e => e.status === ExamStatus.READY).length;
    const today = new Date().toDateString();
    const completedToday = exams.filter(e => e.status === ExamStatus.COMPLETED && new Date(e.createdAt).toDateString() === today).length;

    const SidebarItem = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    // Schedule Helpers
    let activeClasses = MORNING_CLASSES_LIST;
    let activeSlots = MORNING_SLOTS;
    let activeShiftLabel = 'Turno Matutino (Fundamental II)';
    let ActiveShiftIcon = Clock;
    let activeShiftColor = 'text-yellow-500';

    if (scheduleLevel === 'EFAI') {
        activeClasses = EFAI_CLASSES_LIST;
        activeSlots = MORNING_SLOTS_EFAI;
        activeShiftLabel = 'Turno Matutino (Fundamental I)';
    } else if (scheduleLevel === 'EM') {
        activeClasses = AFTERNOON_CLASSES_LIST;
        activeSlots = AFTERNOON_SLOTS;
        activeShiftLabel = 'Turno Vespertino (Ensino Médio)';
        activeShiftColor = 'text-orange-500';
    }

    const availableTeachers = staffList.filter(s => s.isTeacher).map(s => s.name).sort();
    const availableSubjects = scheduleLevel === 'EM' ? EM_SUBJECTS : EFAF_SUBJECTS;

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 flex-1 overflow-y-auto">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 ml-2">Escola & Cópias</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="schedule" label="Gestão de Horários" icon={CalendarClock} />
                    <SidebarItem id="sync" label="Integração Gennera" icon={Database} />
                    <SidebarItem id="config" label="Sistema" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-transparent custom-scrollbar">
                
                {/* --- EXAMS TAB --- */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Solicitações de professores em tempo real</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard title="Pendentes" value={pendingExams} icon={Hourglass} color="yellow-500" />
                            <StatCard title="Em Produção" value={inProgressExams} icon={Printer} color="blue-500" />
                            <StatCard title="Pronto p/ Retirada" value={readyExams} icon={ClipboardCheck} color="purple-400" />
                            <StatCard title="Concluídos Hoje" value={completedToday} icon={CheckCircle} color="green-500" />
                        </div>
                        
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-6 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">Todas as Solicitações</h3>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar prova ou professor..." className="pl-12 pr-6 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-600 outline-none w-80 transition-all" value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-6">Data</th>
                                            <th className="p-6">Detalhes da Solicitação</th>
                                            <th className="p-6">Turma / Qtd</th>
                                            <th className="p-6">Status</th>
                                            <th className="p-6 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredExams.map(exam => (
                                            <tr key={exam.id} className="hover:bg-white/[0.02] group">
                                                <td className="p-6 text-sm text-gray-500 font-bold align-top w-32">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                                <td className="p-6 align-top">
                                                    <div className="flex flex-col gap-4">
                                                        <div>
                                                            <p className="font-black text-white uppercase tracking-tight text-lg leading-tight">{String(exam.title || '')}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Prof. {String(exam.teacherName || '')}</p>
                                                        </div>

                                                        {/* Observações */}
                                                        {exam.instructions && exam.instructions !== 'Sem instruções' && (
                                                            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl relative">
                                                                <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest block mb-2">Observações do Professor:</span>
                                                                <p className="text-xs text-gray-300 leading-relaxed font-medium italic">"{exam.instructions}"</p>
                                                            </div>
                                                        )}

                                                        {/* Arquivos */}
                                                        {exam.fileUrls && exam.fileUrls.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Materiais para Impressão:</p>
                                                                <div className="grid gap-2">
                                                                    {exam.fileUrls.map((url, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-[#0f0f10] border border-white/5 p-3 rounded-xl hover:border-white/10 transition-all group">
                                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                                <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center text-red-500 shrink-0">
                                                                                    <FileText size={16}/>
                                                                                </div>
                                                                                <span className="text-[10px] font-bold text-gray-400 truncate uppercase">
                                                                                    {exam.fileNames?.[idx] || `Arquivo ${idx + 1}`}
                                                                                </span>
                                                                            </div>
                                                                            <a 
                                                                                href={url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                className="h-8 w-8 flex items-center justify-center bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-all"
                                                                                title="Baixar para Impressão"
                                                                            >
                                                                                <Download size={14}/>
                                                                            </a>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 align-top">
                                                    <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{String(exam.gradeLevel || '')}</span>
                                                    <span className="ml-4 text-red-500 font-black text-lg">{exam.quantity}x</span>
                                                </td>
                                                <td className="p-6 align-top"><StatusBadge status={exam.status} /></td>
                                                <td className="p-6 text-right align-top">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {exam.status === ExamStatus.PENDING && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-blue-600 hover:!bg-blue-700">Produzir</Button>}
                                                        {exam.status === ExamStatus.IN_PROGRESS && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.READY)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-purple-600 hover:!bg-purple-700">Finalizar</Button>}
                                                        {exam.status === ExamStatus.READY && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="h-10 px-4 text-xs font-black uppercase tracking-widest !bg-green-600 hover:!bg-green-700">Entregar</Button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SCHEDULE TAB --- */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Horários</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Edição do quadro exibido na TV</p>
                            </div>
                            
                            <div className="flex flex-col gap-4 items-end">
                                {/* SYNC BUTTON */}
                                <Button onClick={handleSyncTV} isLoading={isSyncingTV} className="bg-red-600 h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-900/30">
                                    <Radio size={18} className="mr-2"/> {isSyncingTV ? 'Enviando...' : 'Sincronizar Grade na TV'}
                                </Button>

                                {/* LEVEL SELECTOR */}
                                <div className="flex bg-[#18181b] p-1 rounded-2xl border border-white/10">
                                    <button onClick={() => setScheduleLevel('EFAI')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAI' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                                        Fund. I (EFAI)
                                    </button>
                                    <button onClick={() => setScheduleLevel('EFAF')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EFAF' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                                        Fund. II (EFAF)
                                    </button>
                                    <button onClick={() => setScheduleLevel('EM')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scheduleLevel === 'EM' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                                        Ensino Médio
                                    </button>
                                </div>

                                {/* DAY SELECTOR */}
                                <div className="flex bg-[#18181b] p-1 rounded-xl border border-white/10">
                                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((d, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setScheduleDay(i + 1)}
                                            className={`px-6 py-3 rounded-lg text-xs font-black transition-all ${scheduleDay === i + 1 ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </header>

                        <div className="space-y-12 pb-20">
                            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                                <div className="p-6 bg-black/20 border-b border-white/5 flex justify-between items-center">
                                    <h3 className={`text-lg font-black text-white uppercase tracking-widest flex items-center gap-3`}>
                                        <ActiveShiftIcon size={20} className={activeShiftColor}/> {activeShiftLabel}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-black/30 border-b border-white/5">
                                                <th className="p-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest w-32">Horário</th>
                                                {activeClasses.map(cls => (
                                                    <th key={cls.id} className="p-4 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest border-l border-white/5">{cls.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {activeSlots.map(slot => (
                                                <tr key={slot.id} className={slot.type === 'break' ? 'bg-white/[0.02]' : ''}>
                                                    <td className="p-4 text-xs font-bold text-gray-400 border-r border-white/5">
                                                        <span className="block text-white font-mono">{slot.start} - {slot.end}</span>
                                                        <span className="text-[9px] uppercase tracking-wider opacity-50">{slot.label}</span>
                                                    </td>
                                                    {slot.type === 'break' ? (
                                                        <td colSpan={activeClasses.length} className="p-4 text-center text-xs font-black text-yellow-600 uppercase tracking-[0.5em] opacity-50">Intervalo</td>
                                                    ) : (
                                                        activeClasses.map(cls => {
                                                            const entry = getScheduleEntry(cls.id, slot.id);
                                                            const isEditing = editingSlot?.classId === cls.id && editingSlot?.slotId === slot.id;
                                                            
                                                            return (
                                                                <td key={cls.id + slot.id} className="p-2 border-l border-white/5 relative group h-24 align-middle">
                                                                    {isEditing ? (
                                                                        <div className="absolute inset-0 bg-[#0f0f10] z-20 flex flex-col p-3 gap-2 shadow-2xl border-2 border-red-600 animate-in zoom-in-95">
                                                                            <input 
                                                                                list="subjects-list"
                                                                                autoFocus 
                                                                                className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-red-500 font-bold uppercase placeholder-gray-500" 
                                                                                placeholder="Matéria" 
                                                                                value={editForm.subject} 
                                                                                onChange={e => setEditForm({...editForm, subject: e.target.value})} 
                                                                            />
                                                                            <datalist id="subjects-list">
                                                                                {availableSubjects.map(s => <option key={s} value={s} />)}
                                                                            </datalist>

                                                                            <input 
                                                                                list="teachers-list"
                                                                                className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-gray-300 outline-none focus:border-red-500 uppercase placeholder-gray-500" 
                                                                                placeholder="Professor" 
                                                                                value={editForm.professor} 
                                                                                onChange={e => setEditForm({...editForm, professor: e.target.value})} 
                                                                            />
                                                                            <datalist id="teachers-list">
                                                                                {availableTeachers.map(t => <option key={t} value={t} />)}
                                                                            </datalist>

                                                                            <div className="flex gap-2 mt-auto">
                                                                                <button onClick={handleSaveSchedule} className="flex-1 bg-green-600 rounded-lg py-1.5 text-[10px] font-black text-white hover:bg-green-700 transition-colors uppercase tracking-widest">Salvar</button>
                                                                                <button onClick={() => setEditingSlot(null)} className="flex-1 bg-red-600 rounded-lg py-1.5 text-[10px] font-black text-white hover:bg-red-700 transition-colors uppercase tracking-widest">Cancelar</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div 
                                                                            onClick={() => {
                                                                                setEditingSlot({ classId: cls.id, slotId: slot.id });
                                                                                setEditForm({ subject: entry?.subject || '', professor: entry?.professor || '' });
                                                                            }}
                                                                            className="w-full h-full rounded-xl hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center transition-all p-2 group-hover:shadow-inner"
                                                                        >
                                                                            {entry ? (
                                                                                <>
                                                                                    <span className="text-xs font-black text-white uppercase text-center leading-tight line-clamp-2">{entry.subject}</span>
                                                                                    <span className="text-[9px] font-bold text-gray-500 uppercase mt-1 truncate max-w-full">{entry.professor}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[9px] text-gray-700 font-black uppercase opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity"><Edit size={10}/> Editar</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                 {/* --- STUDENTS TAB --- */}
                 {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Base de Alunos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gestão de matrículas e enturmação</p>
                            </div>
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar aluno por nome ou turma..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" 
                                    value={studentSearch} 
                                    onChange={e => setStudentSearch(e.target.value)} 
                                />
                            </div>
                        </header>

                        {/* Class Statistics Grid with Attendance */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                            {CLASSES.map(cls => {
                                const classStudents = students.filter(s => s.className === cls);
                                const totalStudents = classStudents.length;
                                // Use Set for unique student count (prevents duplicate checks for same student)
                                const uniquePresentStudents = new Set(
                                    attendanceLogs
                                        .filter(log => log.className === cls)
                                        .map(log => log.studentId)
                                );
                                const presentCount = uniquePresentStudents.size;
                                
                                return (
                                    <div 
                                        key={cls} 
                                        onClick={() => setSelectedClassFilter(selectedClassFilter === cls ? null : cls)}
                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between ${
                                            selectedClassFilter === cls 
                                            ? 'bg-red-600 border-red-500 shadow-xl shadow-red-900/40 scale-105 z-10' 
                                            : 'bg-[#18181b] border-white/5 hover:border-white/10 hover:bg-[#202022]'
                                        }`}
                                    >
                                        <h3 className={`text-[10px] font-black mb-4 uppercase tracking-widest truncate ${selectedClassFilter === cls ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} title={cls}>{cls}</h3>
                                        
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className={`text-3xl font-black ${selectedClassFilter === cls ? 'text-white' : 'text-white'}`}>{totalStudents}</p>
                                                <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedClassFilter === cls ? 'text-red-200' : 'text-gray-600'}`}>Matriculados</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black ${selectedClassFilter === cls ? 'text-white' : 'text-green-500'}`}>{presentCount}</p>
                                                <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedClassFilter === cls ? 'text-red-200' : 'text-gray-600'}`}>Presentes</p>
                                            </div>
                                        </div>

                                        {/* Attendance Progress Bar */}
                                        <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${selectedClassFilter === cls ? 'bg-white' : 'bg-green-500'}`}
                                                style={{ width: `${totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-320px)]">
                            <div className="p-6 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">
                                    {selectedClassFilter ? `Listagem - ${selectedClassFilter}` : 'Listagem Geral'}
                                </h3>
                                <div className="flex gap-2">
                                    {selectedClassFilter && (
                                        <button onClick={() => setSelectedClassFilter(null)} className="bg-red-600/10 text-red-500 px-4 py-1 rounded-full text-[10px] font-black border border-red-600/20 hover:bg-red-600 hover:text-white transition-colors">
                                            Limpar Filtro
                                        </button>
                                    )}
                                    <span className="bg-white/5 px-4 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/5">
                                        {students.filter(s => {
                                            const matchesSearch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || String(s.className || '').toLowerCase().includes(studentSearch.toLowerCase());
                                            const matchesClass = selectedClassFilter ? s.className === selectedClassFilter : true;
                                            return matchesSearch && matchesClass;
                                        }).length} Alunos
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-[0.2em] sticky top-0 z-10 backdrop-blur-xl">
                                        <tr>
                                            <th className="p-6">Aluno</th>
                                            <th className="p-6">Turma</th>
                                            <th className="p-6 text-right">Matrícula</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {students
                                            .filter(s => {
                                                const matchesSearch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || String(s.className || '').toLowerCase().includes(studentSearch.toLowerCase());
                                                const matchesClass = selectedClassFilter ? s.className === selectedClassFilter : true;
                                                return matchesSearch && matchesClass;
                                            })
                                            .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                            .map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] group transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center font-black text-gray-500 text-xs shrink-0">
                                                            {String(student.name || '').charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-white text-sm uppercase tracking-tight">{String(student.name || '')}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-300 uppercase tracking-widest">{String(student.className || '')}</span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <span className="font-mono text-xs text-gray-600 group-hover:text-gray-400 transition-colors">{student.id}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SYNC TAB (RESTAURADA) --- */}
                {activeTab === 'sync' && <GenneraSyncPanel />}

                 {/* --- CONFIG TAB --- */}
                 {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto">
                         <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações do Sistema</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes globais e comunicação</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-6"><Megaphone size={24} className="text-red-500"/> Banner de Avisos</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10">
                                        <label className="text-sm font-bold text-white uppercase tracking-widest">Ativar Banner Global</label>
                                        <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                                            {configIsBannerActive ? <ToggleRight size={32} className="text-green-500"/> : <ToggleLeft size={32} className="text-gray-600"/>}
                                            <span className={configIsBannerActive ? 'text-green-400' : 'text-gray-500'}>{configIsBannerActive ? 'Ativo' : 'Inativo'}</span>
                                        </button>
                                    </div>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[120px]" placeholder="Digite a mensagem de aviso aqui..." value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} />
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}>
                                        <option value="info">Informativo (Azul)</option>
                                        <option value="warning">Atenção (Amarelo)</option>
                                        <option value="error">Urgente (Vermelho)</option>
                                        <option value="success">Sucesso (Verde)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-10 border-t border-white/10 flex justify-end">
                                <Button onClick={handleSaveConfig} className="h-16 px-12 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest"><Save size={18} className="mr-3"/> Salvar Alterações</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
