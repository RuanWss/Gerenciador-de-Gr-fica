
import React, { useState, useEffect } from 'react';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents,
    listenToAttendanceLogs, 
    getLessonPlans, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera,
    getAllPEIs,
    cleanupSemesterExams,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent,
    PEIDocument,
    ScheduleEntry,
    TimeSlot,
    StaffMember
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, 
    Search, 
    Calendar, 
    Users, 
    Settings, 
    Megaphone, 
    Trash2, 
    BookOpenCheck, 
    Plus, 
    Save,
    X,
    CheckCircle,
    Heart,
    RefreshCw,
    FileDown,
    RotateCcw,
    ChevronRight as ChevronIcon,
    AlertTriangle,
    Eraser,
    Clock,
    LayoutGrid,
    List as ListIcon,
    UserCircle,
    BookOpen,
    Users2
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

const AFTERNOON_SLOTS: TimeSlot[] = [
    { id: 'a1', start: '13:00', end: '13:50', type: 'class', label: '1º Horário', shift: 'afternoon' },
    { id: 'a2', start: '13:50', end: '14:40', type: 'class', label: '2º Horário', shift: 'afternoon' },
    { id: 'a3', start: '14:40', end: '15:30', type: 'class', label: '3º Horário', shift: 'afternoon' },
    { id: 'a4', start: '16:00', end: '16:50', type: 'class', label: '4º Horário', shift: 'afternoon' },
    { id: 'a5', start: '16:50', end: '17:40', type: 'class', label: '5º Horário', shift: 'afternoon' },
    { id: 'a6', start: '17:40', end: '18:30', type: 'class', label: '6º Horário', shift: 'afternoon' },
    { id: 'a7', start: '18:30', end: '19:20', type: 'class', label: '7º Horário', shift: 'afternoon' },
    { id: 'a8', start: '19:20', end: '20:00', type: 'class', label: '8º Horário', shift: 'afternoon' },
];

const GRID_CLASSES = [
    { id: '6efaf', name: '6º EFAF', type: 'efaf' },
    { id: '7efaf', name: '7º EFAF', type: 'efaf' },
    { id: '8efaf', name: '8º EFAF', type: 'efaf' },
    { id: '9efaf', name: '9º EFAF', type: 'efaf' },
    { id: '1em', name: '1ª E.M.', type: 'em' },
    { id: '2em', name: '2ª E.M.', type: 'em' },
    { id: '3em', name: '3ª E.M.', type: 'em' },
];

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'plans' | 'schedule' | 'config'>('exams');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [scheduleView, setScheduleView] = useState<'grid' | 'list'>('grid');
    const [selectedDay, setSelectedDay] = useState(1); 

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState<Partial<ScheduleEntry>>({
        subject: '', professor: ''
    });

    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubStaff = listenToStaffMembers(setStaff);
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        return () => {
            unsubExams(); unsubStudents(); unsubAttendance(); unsubConfig(); unsubSchedule(); unsubStaff();
        };
    }, []);

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
    };

    const handleSaveSchedule = async () => {
        if (!editingCell || !newSchedule.subject) return alert("Selecione a disciplina");
        
        const classInfo = GRID_CLASSES.find(c => c.id === editingCell.classId);
        
        await saveScheduleEntry({
            id: '',
            classId: editingCell.classId,
            className: classInfo?.name || editingCell.classId,
            dayOfWeek: selectedDay,
            slotId: editingCell.slotId,
            subject: newSchedule.subject!,
            professor: newSchedule.professor || 'Não informado'
        });
        
        setShowScheduleModal(false);
        setEditingCell(null);
        setNewSchedule({ subject: '', professor: '' });
    };

    const handleDeleteSchedule = async (id: string) => {
        if (confirm("Excluir este horário?")) {
            await deleteScheduleEntry(id);
        }
    };

    const handleQuickAdd = (classId: string, slotId: string) => {
        setEditingCell({ classId, slotId });
        const existing = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        if (existing) {
            setNewSchedule({ subject: existing.subject, professor: existing.professor });
        } else {
            setNewSchedule({ subject: '', professor: '' });
        }
        setShowScheduleModal(true);
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <div className="flex items-center gap-4 font-black text-[10px] uppercase tracking-widest">
                <Icon size={18} />
                <span>{label}</span>
            </div>
            {activeTab === id && <ChevronIcon size={14} className="animate-pulse" />}
        </button>
    );

    const ExamCard = ({ exam }: { exam: ExamRequest; key?: React.Key }) => (
        <div className={`bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 group hover:border-red-600/40 transition-all shadow-2xl relative overflow-hidden ${exam.status === ExamStatus.COMPLETED ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${exam.status === ExamStatus.COMPLETED ? 'bg-green-600' : 'bg-red-600'}`}></div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center border ${
                        exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                        {exam.status === ExamStatus.COMPLETED ? <CheckCircle size={40} /> : <Printer size={40} />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{exam.title}</h3>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. <span className="text-white">{exam.teacherName}</span> • {exam.gradeLevel}</p>
                        <p className="text-red-500 font-black text-xs uppercase mt-2">{exam.quantity} CÓPIAS</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {exam.status !== ExamStatus.COMPLETED ? (
                        <Button onClick={() => handleUpdateExamStatus(exam.id, exam.status === ExamStatus.PENDING ? ExamStatus.IN_PROGRESS : ExamStatus.COMPLETED)} className={`h-16 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl ${exam.status === ExamStatus.IN_PROGRESS ? 'bg-green-600' : 'bg-red-600'}`}>
                            {exam.status === ExamStatus.PENDING ? 'Imprimir' : 'Finalizar'}
                        </Button>
                    ) : (
                        <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.PENDING)} className="h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 border border-white/5">
                            <RotateCcw size={16} /> Reabrir
                        </button>
                    )}
                </div>
            </div>
            {exam.fileUrls && exam.fileUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    {exam.fileUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                            <span className="text-[10px] font-bold text-gray-300 uppercase truncate">{exam.fileNames?.[idx] || 'Arquivo'}</span>
                            <FileDown size={16} className="text-blue-500" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );

    const GridCell = ({ classId, slotId }: { classId: string, slotId: string }) => {
        const entry = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        
        if (!entry) {
            return (
                <button 
                    onClick={() => handleQuickAdd(classId, slotId)}
                    className="w-full h-full min-h-[90px] border border-dashed border-white/5 rounded-2xl flex items-center justify-center group hover:bg-white/5 hover:border-white/20 transition-all p-4"
                >
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest group-hover:text-gray-400 transition-colors">Livre</span>
                </button>
            );
        }

        return (
            <div 
                onClick={() => handleQuickAdd(classId, slotId)}
                className="w-full h-full min-h-[90px] bg-red-600/10 border border-red-600/20 rounded-2xl p-4 relative group hover:bg-red-600/20 hover:border-red-600/40 transition-all cursor-pointer"
            >
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(entry.id); }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                >
                    <X size={12}/>
                </button>
                <p className="text-[11px] font-black text-white uppercase line-clamp-2 leading-tight mb-1">{entry.subject}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase truncate">{entry.professor}</p>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
            </div>
        );
    };

    // Filtra professores disponíveis com base na disciplina selecionada
    const availableTeachers = staff.filter(s => {
        if (!s.isTeacher || !s.active) return false;
        if (!newSchedule.subject) return true; // Se não escolheu matéria, mostra todos os professores ativos
        
        // Verifica se a matéria está no cargo/role do professor (Ex: "Professor de Matemática")
        const subjectLower = newSchedule.subject.toLowerCase();
        const roleLower = s.role.toLowerCase();
        return roleLower.includes(subjectLower) || roleLower.includes('professor');
    }).sort((a,b) => a.name.localeCompare(b.name));

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="schedule" label="Quadro de Horários" icon={Clock} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="pei" label="Documentos AEE" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={Calendar} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="config" label="Configuração TV" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                         <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie o fluxo de trabalho da gráfica.</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm"
                                    placeholder="Buscar por Professor ou Turma..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 gap-8">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => <ExamCard key={exam.id} exam={exam} />)}
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-[1600px] mx-auto">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Matriz de Horários</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Clique nas células para editar ou adicionar aulas.</p>
                            </div>
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((day, idx) => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(idx + 1)}
                                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedDay === idx + 1 ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="space-y-12">
                            {/* MATUTINO */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-4">
                                    <Clock size={16}/> TURNO MATUTINO (EFAF)
                                </h3>
                                <div className="overflow-x-auto custom-scrollbar pb-4">
                                    <table className="w-full border-separate border-spacing-2">
                                        <thead>
                                            <tr>
                                                <th className="min-w-[100px] p-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Hora</th>
                                                {GRID_CLASSES.filter(c => c.type === 'efaf').map(c => (
                                                    <th key={c.id} className="min-w-[170px] p-4 bg-white/5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/5">{c.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {MORNING_SLOTS.map(slot => (
                                                <tr key={slot.id}>
                                                    <td className="p-2 text-center">
                                                        <span className="text-[10px] font-black text-red-600 font-mono opacity-60">{slot.start}</span>
                                                    </td>
                                                    {GRID_CLASSES.filter(c => c.type === 'efaf').map(c => (
                                                        <td key={c.id + slot.id} className="p-0">
                                                            <GridCell classId={c.id} slotId={slot.id} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* VESPERTINO */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-4">
                                    <Clock size={16}/> TURNO VESPERTINO (E.M.)
                                </h3>
                                <div className="overflow-x-auto custom-scrollbar pb-4">
                                    <table className="w-full border-separate border-spacing-2">
                                        <thead>
                                            <tr>
                                                <th className="min-w-[100px] p-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Hora</th>
                                                {GRID_CLASSES.filter(c => c.type === 'em').map(c => (
                                                    <th key={c.id} className="min-w-[170px] p-4 bg-white/5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/5">{c.name}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {AFTERNOON_SLOTS.map(slot => (
                                                <tr key={slot.id}>
                                                    <td className="p-2 text-center">
                                                        <span className="text-[10px] font-black text-blue-600 font-mono opacity-60">{slot.start}</span>
                                                    </td>
                                                    {GRID_CLASSES.filter(c => c.type === 'em').map(c => (
                                                        <td key={c.id + slot.id} className="p-0">
                                                            <GridCell classId={c.id} slotId={slot.id} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE EDIÇÃO RÁPIDA DE HORÁRIO */}
                {showScheduleModal && editingCell && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <BookOpen className="text-red-600"/> Registrar Aula
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                        {GRID_CLASSES.find(c => c.id === editingCell.classId)?.name} • {
                                            [...MORNING_SLOTS, ...AFTERNOON_SLOTS].find(s => s.id === editingCell.slotId)?.label
                                        } • {['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][selectedDay]}
                                    </p>
                                </div>
                                <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={24}/></button>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selecione a Disciplina</label>
                                    <select 
                                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none"
                                        value={newSchedule.subject} 
                                        onChange={e => {
                                            setNewSchedule({...newSchedule, subject: e.target.value, professor: ''});
                                        }}
                                    >
                                        <option value="">-- Escolher Matéria --</option>
                                        {(GRID_CLASSES.find(c => c.id === editingCell.classId)?.type === 'efaf' ? EFAF_SUBJECTS : EM_SUBJECTS).sort().map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Professor(a)</label>
                                    <div className="relative">
                                        <Users2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={20}/>
                                        <select 
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none"
                                            value={newSchedule.professor} 
                                            onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})}
                                            disabled={!newSchedule.subject}
                                        >
                                            <option value="">{newSchedule.subject ? '-- Selecione o Professor --' : 'Selecione a disciplina primeiro'}</option>
                                            {availableTeachers.map(t => (
                                                <option key={t.id} value={t.name}>{t.name}</option>
                                            ))}
                                            {newSchedule.subject && <option value="Outro">Outro (Não listado)</option>}
                                        </select>
                                    </div>
                                    {newSchedule.professor === 'Outro' && (
                                        <div className="animate-in slide-in-from-top-2 pt-2">
                                            <input 
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-red-600 text-xs" 
                                                placeholder="Digite o nome do professor manual"
                                                onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setShowScheduleModal(false)}
                                        className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <Button 
                                        onClick={handleSaveSchedule} 
                                        className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-green-600 shadow-xl shadow-green-900/20"
                                    >
                                        Salvar Registro
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* OUTRAS ABAS (SÓ PARA MANTER O COMPONENTE FUNCIONAL) */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações TV</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Megaphone className="text-red-600" /> Banner de Avisos
                            </h3>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} />
                            </div>
                            <Button onClick={async () => {
                                await updateSystemConfig({ bannerMessage: bannerMsg, bannerType, isBannerActive });
                                alert("Salvo!");
                            }} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] bg-red-600">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
