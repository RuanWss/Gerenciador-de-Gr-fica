
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    listenToExams, 
    updateExamStatus, 
    listenToStudents,
    listenToAttendanceLogs, 
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
    deleteOccurrence,
    deleteStudent
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
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
    FileDown,
    RotateCcw,
    ChevronRight as ChevronIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    UserCircle,
    BookOpen,
    Users2,
    Eye,
    Folder,
    FileText,
    Download,
    UserPlus,
    Camera,
    Upload,
    Zap,
    ShieldCheck,
    AlertCircle,
    MessageSquare,
    Edit3,
    Layers,
    Filter,
    Heart
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
    const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: '', classId: '', className: '', isAEE: false });
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
            const peiData = await getAllPEIs();
            setPeis(peiData);
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
            let photoUrl = newStudent.photoUrl || '';
            if (studentPhoto) photoUrl = await uploadStudentPhoto(studentPhoto, newStudent.name);
            const classInfo = GRID_CLASSES.find(c => c.id === newStudent.classId);
            await saveStudent({
                id: newStudent.id || '',
                name: newStudent.name.toUpperCase(),
                classId: newStudent.classId,
                className: classInfo?.name || '',
                photoUrl: photoUrl,
                isAEE: newStudent.isAEE || false
            });
            setShowStudentModal(false);
            setNewStudent({ name: '', classId: '', className: '', isAEE: false });
            setStudentPhoto(null); setStudentPhotoPreview(null);
            alert("Cadastro salvo!");
        } catch (e) { alert("Erro ao salvar."); }
        finally { setIsSavingStudent(false); }
    };

    const handleSaveOccurrence = async () => {
        if (!newOccurrence.studentId || !newOccurrence.description) return alert("Preencha todos os campos.");
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
                reportedBy: user?.name || 'Escola'
            });
            setShowOccurrenceModal(false);
            setNewOccurrence({ studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0] });
            alert("Ocorrência registrada!");
        } catch (e) { alert("Erro ao salvar."); }
        finally { setIsSavingOccurrence(false); }
    };

    const handleDeleteOccurrence = async (id: string) => {
        if (confirm("Excluir este registro?")) await deleteOccurrence(id);
    };

    const handleSaveBatch = async () => {
        if (!newStudent.classId || !batchList) return alert("Preencha os campos.");
        const names = batchList.split('\n').filter(n => n.trim() !== '');
        setIsSavingStudent(true);
        try {
            const classInfo = GRID_CLASSES.find(c => c.id === newStudent.classId);
            for (const name of names) {
                await saveStudent({
                    id: '', name: name.trim().toUpperCase(), classId: newStudent.classId,
                    className: classInfo?.name || '', photoUrl: '', isAEE: false
                });
            }
            setShowStudentModal(false); setBatchList(''); alert("Importação concluída!");
        } catch (e) { alert("Erro no processamento."); }
        finally { setIsSavingStudent(false); }
    };

    const handleSaveCoordMaterial = async () => {
        if (!coordFile || !coordTitle || !coordClass) return alert("Preencha tudo.");
        setIsSavingCoord(true);
        try {
            const fileUrl = await uploadExamFile(coordFile, "COORDENACAO");
            await saveClassMaterial({
                id: '', teacherId: 'coord_admin', teacherName: 'Coordenação',
                className: coordClass, title: coordTitle, subject: 'COORDENAÇÃO',
                fileUrl: fileUrl, fileName: coordFile.name, fileType: coordFile.type, createdAt: Date.now()
            });
            setShowCoordModal(false); setCoordFile(null); setCoordTitle(''); alert("Enviado!");
        } catch (e) { alert("Erro."); }
        finally { setIsSavingCoord(false); }
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

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{classId: string, slotId: string} | null>(null);
    const [newSchedule, setNewSchedule] = useState<Partial<ScheduleEntry>>({ subject: '', professor: '' });

    return (
        <div className="flex h-full bg-[#0f0f10]">
            <div className="w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col h-full shrink-0 z-20 shadow-2xl">
                <div className="mb-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 ml-2 opacity-50">Administração</p>
                    <SidebarItem id="exams" label="Gráfica" icon={Printer} />
                    <SidebarItem id="schedule" label="Horários" icon={Clock} />
                    <SidebarItem id="students" label="Alunos" icon={Users} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertCircle} />
                    <SidebarItem id="materials" label="Materiais Aula" icon={Folder} />
                    <SidebarItem id="pei" label="AEE (PEI)" icon={Heart} />
                    <SidebarItem id="calendar" label="Agenda" icon={Calendar} />
                    <SidebarItem id="config" label="Configuração" icon={Settings} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl">
                         <header className="mb-12 flex justify-between items-end">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1><p className="text-gray-400">Fila de impressões solicitadas pelos professores.</p></div>
                            <div className="relative w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar professor ou título..." value={examSearch} onChange={e => setExamSearch(e.target.value)} /></div>
                        </header>
                        <div className="space-y-6">
                            {exams.filter(e => e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase())).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-8 flex items-center justify-between shadow-xl">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{exam.status}</span><span className="text-xs text-gray-500 font-bold">{new Date(exam.createdAt).toLocaleDateString()}</span></div>
                                        <h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3>
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Prof. {exam.teacherName} • {exam.gradeLevel} • <span className="text-red-500">{exam.quantity} Cópias</span></p>
                                    </div>
                                    <div className="flex gap-4">
                                        <a href={exam.fileUrls?.[0]} target="_blank" className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"><Download size={20}/></a>
                                        {exam.status !== ExamStatus.COMPLETED && <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="bg-red-600 px-8 rounded-2xl font-black uppercase text-xs tracking-widest">Concluir</Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl">
                         <header className="mb-12 flex justify-between items-center">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências</h1><p className="text-gray-400">Registros disciplinares criados pela escola e professores.</p></div>
                            <Button onClick={() => setShowOccurrenceModal(true)} className="bg-red-600 h-16 px-8 rounded-2xl font-black uppercase text-xs tracking-widest"><Plus size={18} className="mr-2"/> Nova Ocorrência</Button>
                        </header>
                        
                        <div className="mb-10 relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} /><input className="w-full bg-[#18181b] border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" placeholder="Filtrar por Professor, Aluno ou Turma..." value={occurrenceSearch} onChange={e => setOccurrenceSearch(e.target.value)} /></div>

                        <div className="grid grid-cols-1 gap-4">
                            {occurrences.filter(occ => 
                                occ.studentName.toLowerCase().includes(occurrenceSearch.toLowerCase()) || 
                                occ.studentClass.toLowerCase().includes(occurrenceSearch.toLowerCase()) ||
                                occ.reportedBy.toLowerCase().includes(occurrenceSearch.toLowerCase())
                            ).map(occ => (
                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-red-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><AlertCircle size={28}/></div>
                                            <div><h3 className="text-xl font-bold text-white uppercase">{occ.studentName}</h3><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{occ.studentClass} • {occ.date}</p></div>
                                        </div>
                                        <div className="flex gap-4"><span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-white/10 text-gray-400">{occ.severity}</span><button onClick={() => handleDeleteOccurrence(occ.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button></div>
                                    </div>
                                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 mb-4 text-gray-300 italic">"{occ.description}"</div>
                                    <div className="flex justify-between items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                        <span className="flex items-center gap-2 bg-red-600/10 text-red-500 px-3 py-1 rounded-full"><UserCircle size={14}/> Relatado por: {occ.reportedBy}</span>
                                        <span className="bg-white/5 px-3 py-1 rounded-full">{occ.category}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Alunos</h1><p className="text-gray-400">Gestão de matrículas e frequência.</p></div>
                            <Button onClick={() => setShowStudentModal(true)} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest"><UserPlus size={18} className="mr-2"/> Matrícula</Button>
                        </header>
                        <div className="flex flex-wrap gap-3 mb-10">{GRID_CLASSES.map(cls => <button key={cls.id} onClick={() => setSelectedStudentClass(cls.id)} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border ${selectedStudentClass === cls.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400'}`}>{cls.name}</button>)}</div>
                        <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5"><tr><th className="p-10">Aluno</th><th className="p-10">Status</th><th className="p-10 text-center">Ações</th></tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.filter(s => s.classId === selectedStudentClass).map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.03] transition-colors"><td className="p-10 font-bold text-white uppercase text-sm">{s.name}</td><td className="p-10"><span className="text-gray-500 font-black text-[9px] uppercase tracking-widest">{s.isAEE ? 'AEE' : 'Regular'}</span></td><td className="p-10 text-center"><button onClick={() => deleteStudent(s.id)} className="p-2 text-gray-600 hover:text-red-500 transition-all"><Trash2 size={18} /></button></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL OCORRÊNCIA ESCOLA */}
            {showOccurrenceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><AlertCircle className="text-red-600" size={28}/> Registrar Ocorrência</h3><button onClick={() => setShowOccurrenceModal(false)} className="text-gray-500 hover:text-white p-2"><X size={24}/></button></div>
                        <div className="p-8 space-y-6">
                            <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={newOccurrence.studentId} onChange={e => setNewOccurrence({...newOccurrence, studentId: e.target.value})}><option value="">-- Escolher Aluno --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}</select>
                            <div className="grid grid-cols-2 gap-4"><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none" value={newOccurrence.category} onChange={e => setNewOccurrence({...newOccurrence, category: e.target.value as any})}><option value="indisciplina">Indisciplina</option><option value="atraso">Atraso</option><option value="elogio">Elogio</option></select><select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none" value={newOccurrence.severity} onChange={e => setNewOccurrence({...newOccurrence, severity: e.target.value as any})}><option value="low">Leve</option><option value="medium">Média</option><option value="high">Grave</option></select></div>
                            <textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" rows={4} value={newOccurrence.description} onChange={e => setNewOccurrence({...newOccurrence, description: e.target.value})} placeholder="Relato do ocorrido..." />
                            <Button onClick={handleSaveOccurrence} isLoading={isSavingOccurrence} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-red-600">Salvar Registro</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
