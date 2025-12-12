
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    saveStudent, 
    updateStudent, 
    deleteStudent, 
    uploadStudentPhoto,
    getFullSchedule,
    saveScheduleEntry,
    getLessonPlans,
    listenToSystemConfig,
    updateSystemConfig,
    getAttendanceLogs
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    ScheduleEntry, 
    LessonPlan, 
    SystemConfig,
    AttendanceLog
} from '../types';
import { Button } from '../components/Button';
import { 
  Printer, 
  CheckCircle, 
  Clock, 
  FileText, 
  Download, 
  AlertCircle, 
  Search, 
  BookOpen, 
  Loader2,
  Users,
  Calendar,
  Settings,
  Tv,
  Trash2,
  Edit3,
  Plus,
  Save,
  Upload,
  Layout,
  GraduationCap,
  Megaphone,
  School,
  ClipboardCheck,
  CalendarDays,
  ArrowRight,
  FileSpreadsheet,
  XCircle
} from 'lucide-react';

// --- CONSTANTES DE HORÁRIOS E TURMAS (Mesmos do PublicSchedule) ---
const MORNING_SLOTS = [
    { id: 'm1', label: '1º Horário (07:20)' },
    { id: 'm2', label: '2º Horário (08:10)' },
    { id: 'm3', label: '3º Horário (09:20)' },
    { id: 'm4', label: '4º Horário (10:10)' },
    { id: 'm5', label: '5º Horário (11:00)' },
];

const AFTERNOON_SLOTS = [
    { id: 'a1', label: '1º Horário (13:00)' },
    { id: 'a2', label: '2º Horário (13:50)' },
    { id: 'a3', label: '3º Horário (14:40)' },
    { id: 'a4', label: '4º Horário (16:00)' },
    { id: 'a5', label: '5º Horário (16:50)' },
    { id: 'a6', label: '6º Horário (17:40)' },
    { id: 'a7', label: '7º Horário (18:30)' },
    { id: 'a8', label: '8º Horário (19:20)' },
];

const CLASSES = [
    { id: '6efaf', name: '6º ANO EFAF', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', shift: 'morning' },
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon' },
];

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'classes' | 'attendance' | 'schedule' | 'planning' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // --- STATES: EXAMS ---
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examFilter, setExamFilter] = useState<ExamStatus | 'ALL'>('ALL');
    const [examSearch, setExamSearch] = useState('');

    // --- STATES: STUDENTS ---
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState('ALL'); // New: Filtro de turma
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [studentClassId, setStudentClassId] = useState('');
    const [studentPhoto, setStudentPhoto] = useState<File | null>(null);

    // --- STATES: ATTENDANCE ---
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

    // --- STATES: SCHEDULE ---
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [selectedScheduleClass, setSelectedScheduleClass] = useState(CLASSES[0].id);
    const [selectedDay, setSelectedDay] = useState(1); // 1 = Segunda

    // --- STATES: PLANNING ---
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [planFilterClass, setPlanFilterClass] = useState('');

    // --- STATES: CONFIG ---
    const [config, setConfig] = useState<SystemConfig>({ bannerMessage: '', bannerType: 'info', isBannerActive: false });

    // --- LOAD DATA ---
    useEffect(() => {
        if (activeTab === 'exams') loadExams();
        // Carrega alunos e frequência juntos para exibir status na lista de alunos
        if (activeTab === 'students' || activeTab === 'classes') {
            loadStudents();
            loadAttendance(); 
        }
        if (activeTab === 'attendance') loadAttendance();
        if (activeTab === 'schedule') loadSchedule();
        if (activeTab === 'planning') loadPlans();
        if (activeTab === 'config') {
            const unsub = listenToSystemConfig((c) => setConfig(c));
            return () => unsub();
        }
    }, [activeTab]);

    useEffect(() => {
        // Recarrega frequência se mudar a data (mesmo estando na aba de alunos se quiser implementar filtro de data lá depois)
        if (activeTab === 'attendance' || activeTab === 'students') {
            loadAttendance();
        }
    }, [attendanceDate]);

    // --- ACTIONS: EXAMS ---
    const loadExams = async () => {
        setIsLoading(true);
        const data = await getExams();
        setExams(data.sort((a,b) => b.createdAt - a.createdAt));
        setIsLoading(false);
    };

    const handleStatusUpdate = async (examId: string, newStatus: ExamStatus) => {
        if (!confirm("Confirmar alteração de status?")) return;
        await updateExamStatus(examId, newStatus);
        loadExams();
    };

    // --- ACTIONS: STUDENTS ---
    const loadStudents = async () => {
        setIsLoading(true);
        const data = await getStudents();
        setStudents(data.sort((a,b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let photoUrl = editingStudent?.photoUrl;
            if (studentPhoto) {
                photoUrl = await uploadStudentPhoto(studentPhoto);
            }

            const className = CLASSES.find(c => c.id === studentClassId)?.name || '';

            const studentData: Student = {
                id: editingStudent ? editingStudent.id : '',
                name: studentName,
                classId: studentClassId,
                className,
                photoUrl
            };

            if (editingStudent) {
                await updateStudent(studentData);
            } else {
                await saveStudent(studentData);
            }
            setShowStudentForm(false);
            setEditingStudent(null);
            setStudentName('');
            setStudentPhoto(null);
            loadStudents();
        } catch (error) {
            alert("Erro ao salvar aluno");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setStudentName(student.name);
        setStudentClassId(student.classId);
        setShowStudentForm(true);
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este aluno?")) return;
        await deleteStudent(id);
        loadStudents();
    };

    // --- ACTIONS: ATTENDANCE ---
    const loadAttendance = async () => {
        // Não ativa loading global se estiver na aba de alunos para não piscar a tela toda
        if (activeTab === 'attendance') setIsLoading(true);
        const data = await getAttendanceLogs(attendanceDate);
        setAttendanceLogs(data);
        if (activeTab === 'attendance') setIsLoading(false);
    };

    const handleExportAttendanceReport = () => {
        const headers = ["Data", "Horário", "Nome do Aluno", "Turma", "Status"];
        const csvContent = [
            headers.join(","),
            ...attendanceLogs.map(log => {
                const date = new Date(log.timestamp);
                const time = date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                return [`"${log.dateString}"`, `"${time}"`, `"${log.studentName}"`, `"${log.className}"`, `"PRESENTE"`].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `frequencia_cemal_${attendanceDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- ACTIONS: SCHEDULE ---
    const loadSchedule = async () => {
        const data = await getFullSchedule();
        setSchedule(data);
    };

    const handleScheduleChange = async (slotId: string, field: 'subject' | 'professor', value: string) => {
        const currentClass = CLASSES.find(c => c.id === selectedScheduleClass);
        if (!currentClass) return;

        const existingEntry = schedule.find(s => 
            s.classId === selectedScheduleClass && 
            s.dayOfWeek === selectedDay && 
            s.slotId === slotId
        );

        const newEntry: ScheduleEntry = {
            id: existingEntry ? existingEntry.id : `${selectedScheduleClass}_${selectedDay}_${slotId}`,
            classId: selectedScheduleClass,
            className: currentClass.name,
            dayOfWeek: selectedDay,
            slotId: slotId,
            subject: field === 'subject' ? value : (existingEntry?.subject || ''),
            professor: field === 'professor' ? value : (existingEntry?.professor || '')
        };

        const newSchedule = schedule.filter(s => s.id !== newEntry.id);
        newSchedule.push(newEntry);
        setSchedule(newSchedule);

        await saveScheduleEntry(newEntry);
    };

    // --- ACTIONS: PLANNING ---
    const loadPlans = async () => {
        setIsLoading(true);
        const data = await getLessonPlans();
        setPlans(data.sort((a,b) => b.createdAt - a.createdAt));
        setIsLoading(false);
    };

    // --- ACTIONS: CONFIG ---
    const handleSaveConfig = async () => {
        await updateSystemConfig(config);
        alert("Configurações atualizadas com sucesso!");
    };

    // --- HELPERS ---
    const getStudentCountByClass = (classId: string) => {
        return students.filter(s => s.classId === classId).length;
    };

    const navigateToClassStudents = (classId: string) => {
        setStudentFilterClass(classId); // Set specific filter
        setStudentSearch('');
        setActiveTab('students');
    };

    // --- RENDER HELPERS ---
    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    const filteredExams = exams.filter(e => {
        const matchStatus = examFilter === 'ALL' || e.status === examFilter;
        const matchSearch = e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase());
        return matchStatus && matchSearch;
    });

    // Filtra alunos
    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                              s.className.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesClass = studentFilterClass === 'ALL' || s.classId === studentFilterClass;
        return matchesSearch && matchesClass;
    });

    // Set de IDs presentes para busca rápida
    const presentStudentIds = new Set(attendanceLogs.map(log => log.studentId));
    
    // Contagem de presentes (apenas dos alunos filtrados atualmente ou totais?)
    // Vamos contar quantos da lista filtrada estão presentes
    const presentCountFiltered = filteredStudents.filter(s => presentStudentIds.has(s.id)).length;
    
    // Contagem total de presentes hoje (independente do filtro de busca/turma na tela)
    const totalPresentToday = presentStudentIds.size;

    const filteredPlans = planFilterClass 
        ? plans.filter(p => p.className === planFilterClass)
        : plans;

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Painel Escolar</p>
                    <SidebarItem id="exams" label="Gráfica / Impressão" icon={Printer} />
                    <SidebarItem id="classes" label="Gestão de Turmas" icon={School} />
                    <SidebarItem id="students" label="Gestão de Alunos" icon={Users} />
                    <SidebarItem id="attendance" label="Frequência" icon={ClipboardCheck} />
                    <SidebarItem id="schedule" label="Quadro de Horários" icon={Calendar} />
                    <SidebarItem id="planning" label="Planejamento" icon={BookOpen} />
                    <div className="my-4 border-t border-white/10"></div>
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
                
                {/* --- TAB: EXAMS (GRÁFICA) --- */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Printer className="text-red-500"/> Central de Cópias</h1>
                                <p className="text-gray-400">Gerenciamento de solicitações de impressão</p>
                            </div>
                            <Button onClick={loadExams} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10"><Loader2 size={16} className={isLoading ? "animate-spin" : ""}/> Atualizar</Button>
                        </header>

                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between">
                            <div className="flex gap-2">
                                {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setExamFilter(s as any)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${examFilter === s ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {s === 'ALL' ? 'Todos' : s === 'PENDING' ? 'Pendentes' : s === 'IN_PROGRESS' ? 'Em Produção' : 'Concluídos'}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 bg-gray-50 focus:bg-white transition-colors" 
                                    placeholder="Buscar por título ou professor..."
                                    value={examSearch}
                                    onChange={e => setExamSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className={`w-1 self-stretch rounded-full ${exam.status === 'PENDING' ? 'bg-yellow-400' : exam.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                                            <p className="text-sm text-gray-500 mb-2">Prof. {exam.teacherName} • {exam.gradeLevel}</p>
                                            <div className="flex gap-2 mb-3">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{exam.quantity} cópias</span>
                                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{exam.materialType === 'handout' ? 'Apostila' : 'Prova'}</span>
                                            </div>
                                            {exam.instructions && <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100"><span className="font-bold">Nota:</span> {exam.instructions}</div>}
                                            {exam.fileUrl && (
                                                <a href={exam.fileUrl} target="_blank" className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-blue-600 hover:underline">
                                                    <Download size={14} /> Baixar Arquivo
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {exam.status === 'PENDING' && <Button size="sm" onClick={() => handleStatusUpdate(exam.id, ExamStatus.IN_PROGRESS)}><Printer size={14} className="mr-2"/> Imprimir</Button>}
                                        {exam.status === 'IN_PROGRESS' && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(exam.id, ExamStatus.COMPLETED)}><CheckCircle size={14} className="mr-2"/> Concluir</Button>}
                                        {exam.status === 'COMPLETED' && <span className="text-green-600 font-bold text-sm flex items-center gap-1"><CheckCircle size={16}/> Entregue</span>}
                                    </div>
                                </div>
                            ))}
                            {filteredExams.length === 0 && <div className="bg-white/10 backdrop-blur rounded-xl p-10 text-center border border-white/20 text-gray-300">Nenhum pedido encontrado.</div>}
                        </div>
                    </div>
                )}

                {/* --- TAB: CLASSES (GESTÃO DE TURMAS) --- */}
                {activeTab === 'classes' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><School className="text-red-500"/> Gestão de Turmas</h1>
                            <p className="text-gray-400">Visão geral das salas e alunos matriculados</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {CLASSES.map(cls => (
                                <div key={cls.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <School size={64} className="text-gray-800" />
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{cls.name}</h3>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase mb-4 ${cls.shift === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {cls.shift === 'morning' ? 'Matutino' : 'Vespertino'}
                                    </span>

                                    <div className="flex items-center gap-2 mb-6">
                                        <Users size={18} className="text-gray-400" />
                                        <span className="text-2xl font-black text-gray-700">{getStudentCountByClass(cls.id)}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase mt-1">Alunos</span>
                                    </div>

                                    <button 
                                        onClick={() => navigateToClassStudents(cls.id)}
                                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Ver Lista de Alunos <ArrowRight size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB: ATTENDANCE (FREQUÊNCIA) --- */}
                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><ClipboardCheck className="text-red-500"/> Frequência Escolar</h1>
                                <p className="text-gray-400">Registros de entrada dos alunos via reconhecimento facial</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 p-1 rounded-lg">
                                <CalendarDays className="text-gray-300 ml-2" size={18} />
                                <input 
                                    type="date" 
                                    value={attendanceDate} 
                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                    className="bg-transparent border-none text-white font-bold text-sm focus:ring-0 p-2"
                                />
                                <Button size="sm" onClick={handleExportAttendanceReport} className="ml-2 bg-green-600 hover:bg-green-700 text-white font-bold">
                                    <FileSpreadsheet size={16} className="mr-2"/> Baixar Relatório
                                </Button>
                            </div>
                        </header>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Clock size={16} /> Registros do Dia
                                </h3>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {attendanceLogs.length} Presenças
                                </span>
                            </div>
                            
                            {attendanceLogs.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Nenhum registro de frequência encontrado para esta data.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-500 border-b border-gray-200 uppercase text-xs">
                                            <tr>
                                                <th className="p-4">Horário</th>
                                                <th className="p-4">Aluno</th>
                                                <th className="p-4">Turma</th>
                                                <th className="p-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {attendanceLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-mono font-bold text-blue-600">
                                                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                                            {log.studentPhotoUrl ? (
                                                                <img src={log.studentPhotoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Users className="p-1.5 text-gray-400 w-full h-full" />
                                                            )}
                                                        </div>
                                                        {log.studentName}
                                                    </td>
                                                    <td className="p-4 text-gray-500">
                                                        {log.className}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                                            PRESENTE
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: STUDENTS (ALUNOS) --- */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Users className="text-red-500"/> Gestão de Alunos</h1>
                                <p className="text-gray-400">Cadastro e controle de fotos para reconhecimento facial</p>
                            </div>
                            <Button onClick={() => { setEditingStudent(null); setStudentName(''); setStudentClassId(CLASSES[0].id); setShowStudentForm(true); }}>
                                <Plus size={16} className="mr-2"/> Novo Aluno
                            </Button>
                        </header>

                        {/* CLASS FILTERS */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                            <button 
                                onClick={() => setStudentFilterClass('ALL')} 
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${studentFilterClass === 'ALL' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                            >
                                Todas as Turmas
                            </button>
                            {CLASSES.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => setStudentFilterClass(c.id)} 
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${studentFilterClass === c.id ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>

                        {showStudentForm && (
                            <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-lg mb-6 animate-in slide-in-from-top-4">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">{editingStudent ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h3>
                                <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                        <input className="w-full border p-2 rounded" value={studentName} onChange={e => setStudentName(e.target.value)} required />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Turma</label>
                                        <select className="w-full border p-2 rounded" value={studentClassId} onChange={e => setStudentClassId(e.target.value)}>
                                            {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Foto (Reconhecimento Facial)</label>
                                        <input type="file" accept="image/*" onChange={e => setStudentPhoto(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                        <p className="text-xs text-gray-400 mt-1">Apenas rosto, fundo claro, sem óculos escuros.</p>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2 mt-2">
                                        <Button type="button" variant="outline" onClick={() => setShowStudentForm(false)}>Cancelar</Button>
                                        <Button type="submit" isLoading={isLoading}>Salvar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" placeholder="Buscar aluno..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                                </div>
                                <div className="flex flex-wrap gap-4 items-center justify-end">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <Users size={14} /> {filteredStudents.length} cadastrados
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <CheckCircle size={14} /> {presentCountFiltered} presentes hoje
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="p-4">Foto</th>
                                            <th className="p-4">Nome</th>
                                            <th className="p-4">Turma</th>
                                            <th className="p-4">Frequência</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredStudents.map(student => {
                                            const isPresent = presentStudentIds.has(student.id);
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="p-4">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                                            {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : <Users className="p-2 text-gray-400 w-full h-full"/>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-800">{student.name}</td>
                                                    <td className="p-4 text-gray-500">{student.className}</td>
                                                    <td className="p-4">
                                                        {isPresent ? (
                                                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                                                <CheckCircle size={12}/> PRESENTE
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                                                                <XCircle size={12}/> AUSENTE
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => handleEditStudent(student)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit3 size={16}/></button>
                                                        <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: SCHEDULE (HORÁRIOS) --- */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Layout className="text-red-500"/> Quadro de Horários</h1>
                            <p className="text-gray-400">Edição da grade exibida no painel público</p>
                        </header>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex gap-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Turma</label>
                                    <select 
                                        className="border p-2 rounded-lg font-bold text-gray-800"
                                        value={selectedScheduleClass} 
                                        onChange={e => setSelectedScheduleClass(e.target.value)}
                                    >
                                        {CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia da Semana</label>
                                    <select 
                                        className="border p-2 rounded-lg font-bold text-gray-800"
                                        value={selectedDay} 
                                        onChange={e => setSelectedDay(Number(e.target.value))}
                                    >
                                        <option value={1}>Segunda-feira</option>
                                        <option value={2}>Terça-feira</option>
                                        <option value={3}>Quarta-feira</option>
                                        <option value={4}>Quinta-feira</option>
                                        <option value={5}>Sexta-feira</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="p-3 text-left w-32">Horário</th>
                                            <th className="p-3 text-left">Disciplina</th>
                                            <th className="p-3 text-left">Professor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {(CLASSES.find(c => c.id === selectedScheduleClass)?.shift === 'morning' ? MORNING_SLOTS : AFTERNOON_SLOTS).map(slot => {
                                            const entry = schedule.find(s => s.classId === selectedScheduleClass && s.dayOfWeek === selectedDay && s.slotId === slot.id);
                                            return (
                                                <tr key={slot.id} className="group hover:bg-blue-50">
                                                    <td className="p-3 font-mono text-xs font-bold text-gray-500 border-r border-gray-100">{slot.label}</td>
                                                    <td className="p-3">
                                                        <input 
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-gray-800 group-hover:bg-white rounded px-2 transition-colors"
                                                            placeholder="Vazio"
                                                            value={entry?.subject || ''}
                                                            onChange={e => handleScheduleChange(slot.id, 'subject', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input 
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-600 group-hover:bg-white rounded px-2 transition-colors"
                                                            placeholder="-"
                                                            value={entry?.professor || ''}
                                                            onChange={e => handleScheduleChange(slot.id, 'professor', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Save size={12}/> Alterações salvas automaticamente ao digitar.</p>
                        </div>
                    </div>
                )}

                {/* --- TAB: PLANNING (PLANEJAMENTO) --- */}
                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><BookOpen className="text-red-500"/> Planejamentos de Aula</h1>
                            <p className="text-gray-400">Acompanhamento dos envios dos professores</p>
                        </header>

                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                            <button onClick={() => setPlanFilterClass('')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${planFilterClass === '' ? 'bg-red-600 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>Todos</button>
                            {CLASSES.map(c => (
                                <button key={c.id} onClick={() => setPlanFilterClass(c.name)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${planFilterClass === c.name ? 'bg-red-600 text-white shadow-md' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{c.name}</button>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredPlans.map(plan => (
                                <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                                {plan.teacherName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm">{plan.teacherName}</h4>
                                                <p className="text-xs text-gray-500">{plan.subject}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${plan.type === 'daily' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {plan.type === 'daily' ? 'Diário' : 'Semestral'}
                                        </span>
                                    </div>
                                    
                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Turma</p>
                                        <p className="font-bold text-gray-800">{plan.className}</p>
                                    </div>

                                    {plan.type === 'daily' ? (
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-bold text-gray-600">Data:</span> {plan.date}</p>
                                            <p className="text-sm line-clamp-2"><span className="font-bold text-gray-600">Tema:</span> {plan.topic}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-bold text-gray-600">Semestre:</span> {plan.semester}</p>
                                        </div>
                                    )}
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                                        <Clock size={12} className="mr-1"/> Enviado em {new Date(plan.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {filteredPlans.length === 0 && <div className="col-span-3 text-center text-gray-300 py-10 bg-white/10 backdrop-blur rounded-xl border border-white/20">Nenhum planejamento encontrado.</div>}
                        </div>
                    </div>
                )}

                {/* --- TAB: CONFIG (TV) --- */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Tv className="text-red-500"/> Configuração da TV</h1>
                            <p className="text-gray-400">Controle de avisos e exibição pública</p>
                        </header>

                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg relative overflow-hidden">
                             {config.isBannerActive && (
                                 <div className={`absolute top-0 left-0 right-0 h-2 ${config.bannerType === 'warning' ? 'bg-yellow-500' : config.bannerType === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                             )}
                             
                             <div className="mb-6">
                                 <label className="flex items-center gap-3 cursor-pointer">
                                     <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.isBannerActive ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setConfig({...config, isBannerActive: !config.isBannerActive})}>
                                         <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.isBannerActive ? 'translate-x-6' : ''}`}></div>
                                     </div>
                                     <span className="font-bold text-gray-700">Ativar Aviso na TV</span>
                                 </label>
                             </div>

                             <div className={`space-y-6 transition-opacity ${config.isBannerActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem do Aviso</label>
                                     <textarea 
                                         className="w-full border border-gray-300 rounded-lg p-3 text-lg" 
                                         rows={3}
                                         placeholder="Ex: Reunião de Pais hoje às 19h"
                                         value={config.bannerMessage}
                                         onChange={e => setConfig({...config, bannerMessage: e.target.value})}
                                     />
                                 </div>

                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Alerta (Cor)</label>
                                     <div className="flex gap-4">
                                         <button onClick={() => setConfig({...config, bannerType: 'info'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'info' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Informativo (Azul)</button>
                                         <button onClick={() => setConfig({...config, bannerType: 'warning'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Atenção (Amarelo)</button>
                                         <button onClick={() => setConfig({...config, bannerType: 'error'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'error' ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Urgente (Vermelho)</button>
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                     <div>
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início da Exibição</label>
                                         <input type="datetime-local" className="w-full border p-2 rounded" value={config.tvStart || ''} onChange={e => setConfig({...config, tvStart: e.target.value})} />
                                     </div>
                                     <div>
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim da Exibição</label>
                                         <input type="datetime-local" className="w-full border p-2 rounded" value={config.tvEnd || ''} onChange={e => setConfig({...config, tvEnd: e.target.value})} />
                                     </div>
                                 </div>
                             </div>

                             <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                 <Button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-700 shadow-lg text-white"><Save size={18} className="mr-2"/> Salvar Configuração</Button>
                             </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
