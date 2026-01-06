
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
    getAllPEIs,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAllMaterials,
    saveStudent,
    uploadStudentPhoto,
    uploadExamFile,
    saveClassMaterial,
    deleteClassMaterial,
    listenToOccurrences,
    saveOccurrence,
    deleteOccurrence
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
    StaffMember,
    ClassMaterial,
    StudentOccurrence
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
    X,
    CheckCircle,
    Heart,
    FileDown,
    RotateCcw,
    ChevronRight as ChevronIcon,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    UserCircle,
    BookOpen,
    Users2,
    Eye,
    Filter,
    Layers,
    Folder,
    FileText,
    Download,
    UserPlus,
    Camera,
    Upload,
    Zap,
    ShieldCheck,
    AlertCircle,
    MessageSquare
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS, CLASSES } from '../constants';

const GRID_CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF', type: 'efaf' },
    { id: '7efaf', name: '7º ANO EFAF', type: 'efaf' },
    { id: '8efaf', name: '8º ANO EFAF', type: 'efaf' },
    { id: '9efaf', name: '9º ANO EFAF', type: 'efaf' },
    { id: '1em', name: '1ª SÉRIE EM', type: 'em' },
    { id: '2em', name: '2ª SÉRIE EM', type: 'em' },
    { id: '3em', name: '3ª SÉRIE EM', type: 'em' },
];

const MORNING_SLOTS: TimeSlot[] = [
    { id: 'm1', start: '07:20', end: '08:10', type: 'class', label: '1º Horário', shift: 'morning' },
    { id: 'm2', start: '08:10', end: '09:00', type: 'class', label: '2º Horário', shift: 'morning' },
    { id: 'm3', start: '09:20', end: '10:10', type: 'class', label: '3º Horário', shift: 'morning' },
    { id: 'm4', start: '10:10', end: '11:00', type: 'class', label: '4º Horário', shift: 'morning' },
    { id: 'm5', start: '11:00', end: '12:00', type: 'class', label: '5º Horário', shift: 'morning' },
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'pei' | 'calendar' | 'plans' | 'schedule' | 'config' | 'materials' | 'occurrences'>('exams');
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [peis, setPeis] = useState<PEIDocument[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    
    const [examSearch, setExamSearch] = useState('');
    const [selectedDay, setSelectedDay] = useState(1); 
    const [selectedStudentClass, setSelectedStudentClass] = useState<string>('6efaf');
    const [occurrenceSearch, setOccurrenceSearch] = useState('');

    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Student Registration State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [regMode, setRegMode] = useState<'individual' | 'batch'>('individual');
    const [isSavingStudent, setIsSavingStudent] = useState(false);
    const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: '', classId: '', className: '' });
    const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
    const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null);
    const [batchList, setBatchList] = useState('');

    // Coordination Material State
    const [showCoordModal, setShowCoordModal] = useState(false);
    const [isSavingCoord, setIsSavingCoord] = useState(false);
    const [coordFile, setCoordFile] = useState<File | null>(null);
    const [coordTitle, setCoordTitle] = useState('');
    const [coordClass, setCoordClass] = useState('');

    // Occurrence State
    const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
    const [isSavingOccurrence, setIsSavingOccurrence] = useState(false);
    const [newOccurrence, setNewOccurrence] = useState<Partial<StudentOccurrence>>({
        studentId: '',
        category: 'indisciplina',
        severity: 'low',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubExams = listenToExams(setExams);
        const unsubStudents = listenToStudents(setStudents);
        const unsubSchedule = listenToSchedule(setSchedule);
        const unsubStaff = listenToStaffMembers(setStaff);
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubEvents = listenToEvents(setEvents);
        const unsubMaterials = listenToAllMaterials(setMaterials);
        const unsubOccurrences = listenToOccurrences(setOccurrences);
        
        const fetchData = async () => {
            const [peiData, plansData] = await Promise.all([ getAllPEIs(), getLessonPlans() ]);
            setPeis(peiData);
            setPlans(plansData);
        };
        fetchData();

        const unsubConfig = listenToSystemConfig((cfg) => {
            setBannerMsg(cfg.bannerMessage || '');
            setBannerType(cfg.bannerType || 'info');
            setIsBannerActive(cfg.isBannerActive || false);
        });

        return () => {
            unsubExams(); unsubStudents(); unsubAttendance(); unsubConfig(); unsubSchedule(); unsubStaff(); unsubEvents(); unsubMaterials(); unsubOccurrences();
        };
    }, []);

    // Registration Handlers
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setStudentPhoto(file);
            setStudentPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveIndividual = async () => {
        if (!newStudent.name || !newStudent.classId) return alert("Preencha nome e turma.");
        setIsSavingStudent(true);
        try {
            let photoUrl = '';
            if (studentPhoto) {
                photoUrl = await uploadStudentPhoto(studentPhoto, newStudent.name);
            }
            
            const classInfo = GRID_CLASSES.find(c => c.id === newStudent.classId);
            await saveStudent({
                id: '',
                name: newStudent.name.toUpperCase(),
                classId: newStudent.classId,
                className: classInfo?.name || '',
                photoUrl: photoUrl
            });
            
            setShowStudentModal(false);
            setNewStudent({ name: '', classId: '', className: '' });
            setStudentPhoto(null);
            setStudentPhotoPreview(null);
            alert("Aluno matriculado com sucesso!");
        } catch (e) { alert("Erro ao salvar."); }
        finally { setIsSavingStudent(false); }
    };

    const handleSaveOccurrence = async () => {
        if (!newOccurrence.studentId || !newOccurrence.description) return alert("Selecione o aluno e descreva o ocorrido.");
        setIsSavingOccurrence(true);
        try {
            const student = students.find(s => s.id === newOccurrence.studentId);
            await saveOccurrence({
                id: '',
                studentId: student?.id || '',
                studentName: student?.name || '',
                studentClass: student?.className || '',
                category: newOccurrence.category || 'outros',
                severity: newOccurrence.severity || 'low',
                description: newOccurrence.description || '',
                date: newOccurrence.date || new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                reportedBy: user?.name || 'Coordenação'
            });
            setShowOccurrenceModal(false);
            setNewOccurrence({ studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0] });
            alert("Ocorrência registrada!");
        } catch (e) { alert("Erro ao salvar ocorrência."); }
        finally { setIsSavingOccurrence(false); }
    };

    const handleDeleteOccurrence = async (id: string) => {
        if (confirm("Deseja realmente excluir este registro?")) await deleteOccurrence(id);
    };

    const handleSaveBatch = async () => {
        if (!newStudent.classId || !batchList) return alert("Selecione a turma e insira a lista de nomes.");
        const names = batchList.split('\n').filter(n => n.trim() !== '');
        if (names.length === 0) return alert("Lista vazia.");
        
        setIsSavingStudent(true);
        try {
            const classInfo = GRID_CLASSES.find(c => c.id === newStudent.classId);
            for (const name of names) {
                await saveStudent({
                    id: '',
                    name: name.trim().toUpperCase(),
                    classId: newStudent.classId,
                    className: classInfo?.name || '',
                    photoUrl: ''
                });
            }
            setShowStudentModal(false);
            setBatchList('');
            alert(`${names.length} alunos matriculados com sucesso!`);
        } catch (e) { alert("Erro no processamento em lote."); }
        finally { setIsSavingStudent(false); }
    };

    const handleSaveCoordMaterial = async () => {
        if (!coordFile || !coordTitle || !coordClass) return alert("Preencha o título, selecione a turma e anexe um arquivo.");
        setIsSavingCoord(true);
        try {
            const fileUrl = await uploadExamFile(coordFile, "COORDENACAO");
            const materialData: ClassMaterial = {
                id: '',
                teacherId: 'coord_admin',
                teacherName: 'Coordenação',
                className: coordClass,
                title: coordTitle,
                subject: 'COORDENAÇÃO',
                fileUrl: fileUrl,
                fileName: coordFile.name,
                fileType: coordFile.type,
                createdAt: Date.now()
            };
            await saveClassMaterial(materialData);
            setShowCoordModal(false);
            setCoordFile(null);
            setCoordTitle('');
            alert("Arquivo enviado para a turma com sucesso!");
        } catch (e) {
            alert("Erro ao enviar arquivo.");
        } finally {
            setIsSavingCoord(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (confirm("Deseja realmente excluir este arquivo? Alunos perderão o acesso imediatamente.")) {
            await deleteClassMaterial(id);
        }
    };

    const [bannerMsg, setBannerMsg] = useState('');
    const [bannerType, setBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [isBannerActive, setIsBannerActive] = useState(false);

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
        if (confirm("Excluir este horário?")) await deleteScheduleEntry(id);
    };

    const handleQuickAdd = (classId: string, slotId: string) => {
        setEditingCell({ classId, slotId });
        const existing = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        setNewSchedule(existing ? { subject: existing.subject, professor: existing.professor } : { subject: '', professor: '' });
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

    const ExamCard: React.FC<{ exam: ExamRequest }> = ({ exam }) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {exam.fileUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                            <span className="text-[10px] font-bold text-gray-300 uppercase truncate">{exam.fileNames?.[idx] || 'Arquivo'}</span>
                            <FileDown size={16} className="text-red-500" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );

    const GridCell = ({ classId, slotId }: { classId: string, slotId: string }) => {
        const entry = schedule.find(s => s.classId === classId && s.slotId === slotId && s.dayOfWeek === selectedDay);
        if (!entry) return <button onClick={() => handleQuickAdd(classId, slotId)} className="w-full h-full min-h-[90px] border border-dashed border-white/5 rounded-2xl flex items-center justify-center group hover:bg-white/5 hover:border-white/20 transition-all p-4"><span className="text-[10px] font-black text-gray-700 uppercase tracking-widest group-hover:text-gray-400 transition-colors">Livre</span></button>;
        return (
            <div onClick={() => handleQuickAdd(classId, slotId)} className="w-full h-full min-h-[90px] bg-red-600/10 border border-red-600/20 rounded-2xl p-4 relative group hover:bg-red-600/20 hover:border-red-600/40 transition-all cursor-pointer">
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(entry.id); }} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"><X size={12}/></button>
                <p className="text-[11px] font-black text-white uppercase line-clamp-2 leading-tight mb-1">{entry.subject}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase truncate">{entry.professor}</p>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
            </div>
        );
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const days = [];
        for (let i = 0; i < startingDay; i++) days.push(<div key={`empty-${i}`} className="bg-white/5 border border-white/5 min-h-[100px] opacity-20"></div>);
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={day} className="bg-white/5 border border-white/5 min-h-[120px] p-4 relative group hover:bg-white/10 transition-all">
                    <span className="text-xs font-black text-gray-500">{day}</span>
                    <div className="mt-2 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className={`text-[9px] font-black uppercase p-1.5 rounded-lg border-l-4 truncate ${ev.type === 'holiday' ? 'bg-red-900/20 text-red-500 border-red-500' : ev.type === 'exam' ? 'bg-purple-900/20 text-purple-500 border-purple-500' : 'bg-blue-900/20 text-blue-500 border-blue-500'}`}>
                                {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 flex items-center justify-between bg-black/40 border-b border-white/5">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{monthName}</h2>
                    <div className="flex gap-4">
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white"><ChevronLeft size={24}/></button>
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white"><ChevronRight size={24}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center py-4 bg-black/20 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7">{days}</div>
            </div>
        );
    };

    // --- RENDER ---
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState<Partial<ScheduleEntry>>({ subject: '', professor: '' });

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="schedule" label="Quadro de Horários" icon={Clock} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertCircle} />
                    <SidebarItem id="materials" label="Materiais Aula" icon={Folder} />
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
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Gerencie o fluxo de trabalho da gráfica.</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar professor ou título..." value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                            </div>
                        </header>
                        <div className="space-y-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-red-500 ml-4"><Layers size={18} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Pedidos Pendentes</span></div>
                                <div className="grid grid-cols-1 gap-8">
                                    {exams.filter(e => e.status !== ExamStatus.COMPLETED && (e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase()))).map(exam => <ExamCard key={exam.id} exam={exam} />)}
                                </div>
                            </div>
                            <div className="space-y-6 pt-10">
                                <div className="flex items-center gap-3 text-green-500 ml-4"><CheckCircle size={18} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Concluídos Recentemente</span></div>
                                <div className="grid grid-cols-1 gap-8">
                                    {exams.filter(e => e.status === ExamStatus.COMPLETED).slice(0, 5).map(exam => <ExamCard key={exam.id} exam={exam} />)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                         <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências Diárias</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Registro de eventos disciplinares e elogios.</p>
                            </div>
                            <Button onClick={() => setShowOccurrenceModal(true)} className="bg-red-600 h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">
                                <Plus size={18} className="mr-2"/> Nova Ocorrência
                            </Button>
                        </header>
                        
                        <div className="mb-10 relative">
                             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                             <input 
                                className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" 
                                placeholder="Filtrar por nome do aluno, turma ou descrição..." 
                                value={occurrenceSearch}
                                onChange={e => setOccurrenceSearch(e.target.value)}
                             />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {occurrences.filter(o => 
                                o.studentName.toLowerCase().includes(occurrenceSearch.toLowerCase()) || 
                                o.studentClass.toLowerCase().includes(occurrenceSearch.toLowerCase()) ||
                                o.description.toLowerCase().includes(occurrenceSearch.toLowerCase())
                            ).map(occ => (
                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {occ.category === 'elogio' ? <CheckCircle size={28}/> : <AlertCircle size={28}/>}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white uppercase">{occ.studentName}</h3>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{occ.studentClass} • {new Date(occ.timestamp).toLocaleDateString()} • {new Date(occ.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${occ.severity === 'high' ? 'bg-red-900/20 text-red-500 border-red-500/20' : occ.severity === 'medium' ? 'bg-orange-900/20 text-orange-500 border-orange-500/20' : 'bg-blue-900/20 text-blue-500 border-blue-500/20'}`}>
                                                {occ.severity === 'high' ? 'Grave' : occ.severity === 'medium' ? 'Média' : 'Leve'}
                                            </span>
                                            <button onClick={() => handleDeleteOccurrence(occ.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-4">
                                        <p className="text-gray-300 text-sm leading-relaxed">{occ.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                        <span className="flex items-center gap-2"><UserCircle size={14}/> Relatado por: {occ.reportedBy}</span>
                                        <span className="bg-white/5 px-3 py-1 rounded-full">{occ.category}</span>
                                    </div>
                                </div>
                            ))}
                            {occurrences.length === 0 && (
                                <div className="py-20 text-center text-gray-600 uppercase font-black tracking-widest opacity-40">Nenhuma ocorrência registrada.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-[1600px]">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Matriz de Horários</h1><p className="text-gray-400 text-lg mt-1 font-medium italic">Clique nas células para editar ou adicionar aulas.</p></div>
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((day, idx) => (
                                    <button key={day} onClick={() => setSelectedDay(idx + 1)} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedDay === idx + 1 ? 'bg-red-600 text-white' : 'text-gray-500'}`}>{day}</button>
                                ))}
                            </div>
                        </header>
                        <div className="overflow-x-auto custom-scrollbar pb-4">
                            <table className="w-full border-separate border-spacing-2">
                                <thead><tr><th className="min-w-[100px] p-4 text-[10px] font-black text-gray-600 uppercase">Hora</th>{GRID_CLASSES.map(c => <th key={c.id} className="min-w-[170px] p-4 bg-white/5 rounded-2xl text-[10px] font-black text-white uppercase border border-white/5">{c.name}</th>)}</tr></thead>
                                <tbody>{MORNING_SLOTS.map(slot => (<tr key={slot.id}><td className="p-2 text-center"><span className="text-[10px] font-black text-red-600 font-mono">{slot.start}</span></td>{GRID_CLASSES.map(c => (<td key={c.id + slot.id} className="p-0"><GridCell classId={c.id} slotId={slot.id} /></td>))}</tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Alunos</h1>
                                <p className="text-gray-400 text-lg mt-1 font-medium italic">Selecione a turma para visualizar a frequência.</p>
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={() => { setRegMode('individual'); setShowStudentModal(true); }} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">
                                    <UserPlus size={18} className="mr-2"/> Matrícula Individual
                                </Button>
                                <button onClick={() => { setRegMode('batch'); setShowStudentModal(true); }} className="bg-white/5 border border-white/10 hover:bg-white/10 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-300 transition-all flex items-center gap-2">
                                    <Zap size={18} className="text-red-500"/> Cadastro em Lote
                                </button>
                            </div>
                        </header>
                        <div className="flex flex-wrap gap-3 mb-10">{GRID_CLASSES.map(cls => <button key={cls.id} onClick={() => setSelectedStudentClass(cls.id)} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border ${selectedStudentClass === cls.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>{cls.name}</button>)}</div>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Biometria</th><th className="p-10">Status Hoje</th><th className="p-10 text-center">Entrada</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.filter(s => s.classId === selectedStudentClass).map(s => {
                                        const att = attendanceLogs.find(l => l.studentId === s.id);
                                        return (
                                            <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="p-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-gray-900 border border-white/5 overflow-hidden">
                                                            {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <UserCircle size={40} className="text-gray-800"/>}
                                                        </div>
                                                        <p className="font-bold text-white uppercase text-sm">{s.name}</p>
                                                    </div>
                                                </td>
                                                <td className="p-10">
                                                    {s.photoUrl ? <span className="text-green-500 font-black text-[9px] uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10}/> Ativa</span> : <span className="text-gray-600 font-black text-[9px] uppercase tracking-widest">Pendente</span>}
                                                </td>
                                                <td className="p-10">{att ? <span className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full font-black text-[9px] uppercase">Presente</span> : <span className="px-4 py-1.5 bg-gray-800 text-gray-500 rounded-full font-black text-[9px] uppercase">Ausente</span>}</td>
                                                <td className="p-10 text-center">{att ? <span className="text-xs font-mono font-bold text-gray-400">{new Date(att.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span> : <span className="text-gray-800">—</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                         <header className="mb-12 flex justify-between items-center">
                             <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Materiais de Aula</h1>
                                <p className="text-gray-400 text-lg mt-1 italic">Todos os arquivos enviados para as salas de aula.</p>
                             </div>
                             <Button onClick={() => setShowCoordModal(true)} className="bg-blue-600 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-900/20 hover:bg-blue-700">
                                <ShieldCheck size={18} className="mr-2"/> Enviar p/ Coordenação
                             </Button>
                         </header>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {materials.sort((a,b) => b.createdAt - a.createdAt).map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${mat.subject === 'COORDENAÇÃO' ? 'bg-blue-600/10 text-blue-500' : 'bg-red-600/10 text-red-500'}`}>
                                            <FileText size={24}/>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{new Date(mat.createdAt).toLocaleDateString()}</span>
                                            <button onClick={() => handleDeleteMaterial(mat.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 leading-tight uppercase truncate">{mat.title}</h3>
                                    <p className={`text-[10px] font-black uppercase mb-6 ${mat.subject === 'COORDENAÇÃO' ? 'text-blue-500' : 'text-red-500'}`}>{mat.className} • {mat.subject}</p>
                                    <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-2"><UserCircle size={14} className="text-gray-600"/><span className="text-[9px] font-bold text-gray-400 uppercase">{mat.teacherName}</span></div>
                                        <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="p-2 text-white hover:bg-red-600/20 rounded-lg transition-colors"><Download size={18} className={mat.subject === 'COORDENAÇÃO' ? 'text-blue-500' : 'text-red-500'}/></a>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Documentos AEE (PEI)</h1><p className="text-gray-400 text-lg mt-1 italic">Consulte o histórico de planejamentos especializados.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {peis.map(p => (
                                <div key={p.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div><h3 className="text-xl font-bold text-white">{p.studentName}</h3><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">{p.subject} • {p.period}</p></div>
                                        <div className="h-12 w-12 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center"><Heart size={24}/></div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3 leading-relaxed">{p.selectedContents}</p>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center"><span className="text-[9px] font-bold text-gray-600 uppercase">Prof. {p.teacherName}</span><button className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Visualizar PEI</button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-end"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda Escolar</h1></header>
                        {renderCalendar()}
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos</h1><p className="text-gray-400 text-lg mt-1 italic">Visualize as aulas planejadas pelo corpo docente.</p></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(pl => (
                                <div key={pl.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-blue-600/30 transition-all flex flex-col h-full group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div><span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${pl.type === 'semester' ? 'bg-blue-600/10 text-blue-500' : 'bg-gray-800 text-gray-400'}`}>{pl.type === 'semester' ? 'Semestral' : 'Diário'}</span><h3 className="text-lg font-bold text-white mt-3 leading-tight">{pl.subject}</h3><p className="text-[10px] font-black text-gray-500 uppercase mt-1">{pl.className}</p></div>
                                        <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors"><BookOpenCheck size={20}/></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-6 flex-1 line-clamp-4 leading-relaxed italic">{pl.topic || 'Sem descrição.'}</p>
                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-2"><UserCircle size={14} className="text-gray-600"/><span className="text-[9px] font-bold text-gray-500 uppercase">{pl.teacherName}</span></div><button className="p-2 text-white hover:bg-blue-600/20 rounded-lg transition-colors"><Eye size={18} className="text-blue-500"/></button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações TV</h1></header>
                        <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3"><Megaphone className="text-red-600" /> Banner de Avisos</h3>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4">Mensagem</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" rows={4} value={bannerMsg} onChange={e => setBannerMsg(e.target.value)} />
                                <div className="flex items-center gap-4"><input type="checkbox" checked={isBannerActive} onChange={e => setIsBannerActive(e.target.checked)} className="w-6 h-6 text-red-600 rounded bg-black/40 border-white/10" /><span className="text-white font-bold">Banner Ativado</span></div>
                            </div>
                            <Button onClick={async () => { await updateSystemConfig({ bannerMessage: bannerMsg, bannerType, isBannerActive }); alert("Salvo!"); }} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] bg-red-600">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL OCORRÊNCIA */}
            {showOccurrenceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <AlertCircle className="text-red-600" size={28}/> Registrar Ocorrência
                                </h3>
                                <p className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mt-1">Controle disciplinar e acadêmico</p>
                            </div>
                            <button onClick={() => setShowOccurrenceModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Selecionar Aluno</label>
                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={newOccurrence.studentId} onChange={e => setNewOccurrence({...newOccurrence, studentId: e.target.value})}>
                                    <option value="">-- Escolher Aluno --</option>
                                    {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={newOccurrence.category} onChange={e => setNewOccurrence({...newOccurrence, category: e.target.value as any})}>
                                        <option value="indisciplina">Indisciplina</option>
                                        <option value="atraso">Atraso</option>
                                        <option value="desempenho">Desempenho</option>
                                        <option value="uniforme">Uniforme</option>
                                        <option value="elogio">Elogio</option>
                                        <option value="outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Gravidade</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={newOccurrence.severity} onChange={e => setNewOccurrence({...newOccurrence, severity: e.target.value as any})}>
                                        <option value="low">Leve</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Grave</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Relato Detalhado</label>
                                <textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" rows={4} value={newOccurrence.description} onChange={e => setNewOccurrence({...newOccurrence, description: e.target.value})} placeholder="Descreva o que aconteceu..." />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowOccurrenceModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button>
                                <Button onClick={handleSaveOccurrence} isLoading={isSavingOccurrence} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-red-600 shadow-xl shadow-red-900/20">Salvar Registro</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ... rest of the modals ... */}
            
            {/* MODAL MATRÍCULA DE ALUNOS */}
            {showStudentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                                    <UserPlus className="text-red-600" size={32}/> Central de Matrículas
                                </h3>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gestão de biometria facial</p>
                            </div>
                            <button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={32}/></button>
                        </div>
                        
                        <div className="p-10">
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-10">
                                <button onClick={() => setRegMode('individual')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${regMode === 'individual' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-500'}`}>Matrícula Individual</button>
                                <button onClick={() => setRegMode('batch')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${regMode === 'batch' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-500'}`}>Importação em Lote</button>
                            </div>

                            {regMode === 'individual' ? (
                                <div className="space-y-8 animate-in slide-in-from-bottom-2">
                                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                        <div className="shrink-0">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Foto Biometria</label>
                                            <div className="relative group">
                                                <div className="w-44 h-44 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center overflow-hidden bg-black/40 group-hover:border-red-600 transition-all cursor-pointer">
                                                    {studentPhotoPreview ? (
                                                        <img src={studentPhotoPreview} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera size={48} className="text-gray-800 group-hover:text-red-600 transition-colors" />
                                                    )}
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                                <div className="absolute -bottom-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg pointer-events-none group-hover:scale-110 transition-transform">
                                                    <Upload size={16}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-6 w-full">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                                                <input className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="EX: JOÃO DA SILVA OLIVEIRA" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma</label>
                                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}>
                                                    <option value="">-- Selecione a Turma --</option>
                                                    {GRID_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 pt-6"><button onClick={() => setShowStudentModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button><Button onClick={handleSaveIndividual} isLoading={isSavingStudent} className="flex-[2] h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] bg-red-600 shadow-2xl shadow-red-900/40">Finalizar Matrícula</Button></div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-bottom-2">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma de Destino</label>
                                            <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}>
                                                <option value="">-- Selecione a Turma --</option>
                                                {GRID_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Lista de Nomes (Um por linha)</label>
                                            <textarea className="w-full bg-black/60 border border-white/10 rounded-3xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all custom-scrollbar font-mono text-xs leading-relaxed" rows={10} value={batchList} onChange={e => setBatchList(e.target.value)} placeholder="JOÃO SILVA&#10;MARIA OLIVEIRA&#10;CARLOS SOUZA..." />
                                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2 ml-1">Dica: Você pode copiar e colar uma coluna inteira do Excel aqui.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 pt-6"><button onClick={() => setShowStudentModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button><Button onClick={handleSaveBatch} isLoading={isSavingStudent} className="flex-[2] h-16 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] bg-red-600 shadow-2xl shadow-red-900/40">Importar Todos</Button></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ENVIO COORDENAÇÃO */}
            {showCoordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <ShieldCheck className="text-blue-500" size={28}/> Envio da Coordenação
                                </h3>
                                <p className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mt-1">Material para exibição na sala</p>
                            </div>
                            <button onClick={() => setShowCoordModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título do Material</label>
                                <input className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-600 transition-all" value={coordTitle} onChange={e => setCoordTitle(e.target.value)} placeholder="Ex: Cronograma de Provas Bimestrais" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma de Destino</label>
                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-600 transition-all appearance-none" value={coordClass} onChange={e => setCoordClass(e.target.value)}>
                                    <option value="">-- Selecione a Turma --</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Anexar Arquivo</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-blue-500 transition-all relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setCoordFile(e.target.files?.[0] || null)} />
                                    {coordFile ? (
                                        <div className="flex flex-col items-center gap-2 text-green-500">
                                            <CheckCircle size={32}/>
                                            <span className="text-xs font-bold truncate max-w-full">{coordFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-600">
                                            <Upload size={32}/>
                                            <span className="text-[10px] font-black uppercase">Clique para selecionar</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowCoordModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button>
                                <Button onClick={handleSaveCoordMaterial} isLoading={isSavingCoord} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-blue-600 shadow-xl shadow-blue-900/20">Enviar Arquivo</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDIÇÃO RÁPIDA DE HORÁRIO */}
            {showScheduleModal && editingCell && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div><h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><BookOpen className="text-red-600"/> Registrar Aula</h3></div>
                            <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white p-2 transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selecione a Disciplina</label>
                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none" value={newSchedule.subject} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value, professor: ''})}>
                                    <option value="">-- Escolher Matéria --</option>
                                    {(GRID_CLASSES.find(c => c.id === editingCell.classId)?.type === 'efaf' ? EFAF_SUBJECTS : EM_SUBJECTS).sort().map(sub => (<option key={sub} value={sub}>{sub}</option>))}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Professor(a)</label>
                                <div className="relative">
                                    <Users2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={20}/>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm appearance-none" value={newSchedule.professor} onChange={e => setNewSchedule({...newSchedule, professor: e.target.value})} disabled={!newSchedule.subject}>
                                        <option value="">{newSchedule.subject ? '-- Selecione o Professor --' : 'Selecione a disciplina primeiro'}</option>
                                        {staff.filter(s => s.isTeacher).map(t => (<option key={t.id} value={t.name}>{t.name}</option>))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4"><button onClick={() => setShowScheduleModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-all">Cancelar</button><Button onClick={handleSaveSchedule} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-green-600 shadow-xl shadow-green-900/20">Salvar Registro</Button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
