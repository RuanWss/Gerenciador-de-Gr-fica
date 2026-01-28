import React, { useState, useEffect, useMemo } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    listenToStudents, 
    listenToSystemConfig, 
    updateSystemConfig,
    syncAllDataWithGennera,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAEEAppointments,
    saveAEEAppointment,
    deleteAEEAppointment,
    saveAnswerKey,
    getAnswerKeys,
    deleteAnswerKey,
    saveCorrection,
    listenToGradebook,
    saveGradebook,
    listenToOccurrences,
    saveOccurrence,
    deleteOccurrence,
    saveStudent,
    updateStudent,
    deleteStudent,
    uploadStudentPhoto,
    listenToAttendanceLogs,
    listenToAllLessonPlans
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig, 
    GradebookEntry,
    AEEAppointment,
    AnswerKey,
    ScheduleEntry,
    StaffMember,
    StudentOccurrence,
    AttendanceLog,
    TimeSlot,
    LessonPlan
} from '../types';
import { 
    Printer, Search, Users, Settings, RefreshCw, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Save, X, Loader2, Megaphone, ToggleLeft, ToggleRight, Download,
    FileCheck, Calculator, Calendar, BookOpen, BookMarked, CalendarClock, Database,
    Heart, ChevronLeft, ChevronRight, Plus, Trash2, ListOrdered, BrainCircuit, UploadCloud,
    FileBarChart, Edit, Radio, Camera, User, AlertTriangle, Repeat, Layout, Info, UserCircle,
    Sparkles, Filter, FilterX
} from 'lucide-react';
import { Button } from '../components/Button';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { GenneraSyncPanel } from './GenneraSyncPanel';

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-lg flex items-center gap-6">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center bg-${color}-500/10 text-${color}-500`}>
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
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusInfo.color}-500/10 text-${statusInfo.color}-500 border-${statusInfo.color}-500/20`}>
            <Icon size={14} />
            {statusInfo.text}
        </span>
    );
};

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exams' | 'answer_keys' | 'grades_admin' | 'students' | 'aee_agenda' | 'occurrences' | 'lesson_plans' | 'schedule' | 'sync' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    
    // Data Collections
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examSearch, setExamSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [gradeAdminClass, setGradeAdminClass] = useState('');
    const [gradeAdminSubject, setGradeAdminSubject] = useState('');
    const [gradeAdminBimester, setGradeAdminBimester] = useState('1º BIMESTRE');
    const [gradebookData, setGradebookData] = useState<GradebookEntry | null>(null);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [aeeAppointments, setAeeAppointments] = useState<AEEAppointment[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceLog[]>([]);

    // Lesson Plan Filter State
    const [planFilterClass, setPlanFilterClass] = useState('');
    const [planFilterType, setPlanFilterType] = useState<string>('todos');

    // Agenda Admin State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Config States
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // Initial Load
    useEffect(() => {
        setIsLoading(true);
        getExams().then(data => setExams(data.sort((a,b) => b.createdAt - a.createdAt)));
        listenToStudents(setStudents);
        listenToOccurrences(setOccurrences);
        listenToAllLessonPlans(setLessonPlans);
        listenToSchedule(setSchedule);
        listenToAEEAppointments(setAeeAppointments);
        
        const today = new Date().toISOString().split('T')[0];
        listenToAttendanceLogs(today, setTodayAttendance);

        listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
        });
        setIsLoading(false);
    }, []);

    // Gradebook Admin Listener
    useEffect(() => {
        if (gradeAdminClass && gradeAdminSubject && gradeAdminBimester) {
            const unsub = listenToGradebook(gradeAdminClass, gradeAdminSubject, gradeAdminBimester, (data) => {
                setGradebookData(data);
            });
            return () => unsub();
        }
    }, [gradeAdminClass, gradeAdminSubject, gradeAdminBimester]);

    const handleUpdateAdminGrade = async (studentId: string, type: 'av2' | 'av3', value: number) => {
        if (!gradeAdminClass || !gradeAdminSubject) return;
        
        let currentData = gradebookData || {
            id: '',
            className: gradeAdminClass,
            subject: gradeAdminSubject,
            bimester: gradeAdminBimester,
            av1Config: [],
            grades: {},
            updatedAt: Date.now()
        };

        const updatedGrades = { ...currentData.grades };
        if (!updatedGrades[studentId]) updatedGrades[studentId] = { av1: {} };
        updatedGrades[studentId][type] = value;
        
        await saveGradebook({ ...currentData, grades: updatedGrades });
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
        });
        alert("Configurações atualizadas!");
    };

    const generateGradeMap = () => {
        if (!gradebookData || !gradeAdminClass || !gradeAdminSubject) return alert("Dados insuficientes.");
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const classStudents = students.filter(s => s.className === gradeAdminClass).sort((a,b) => (a.name || '').localeCompare(b.name || ''));

        const rows = classStudents.map(student => {
            const grades = (gradebookData.grades[student.id] || { av1: {} }) as { av1: Record<string, number>, av2?: number, av3?: number };
            const av1Total = Object.values(grades.av1 || {}).reduce((a: number, b: number) => a + b, 0).toFixed(1);
            const av2 = grades.av2 !== undefined ? grades.av2.toFixed(1) : '0.0';
            const av3 = grades.av3 !== undefined ? grades.av3.toFixed(1) : '0.0';
            const final = ((parseFloat(av1Total) + parseFloat(av2) + parseFloat(av3)) / 3).toFixed(1);

            return `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${student.name}</td>
                    <td style="text-align: center; padding: 10px; border: 1px solid #ddd;">${av1Total}</td>
                    <td style="text-align: center; padding: 10px; border: 1px solid #ddd;">${av2}</td>
                    <td style="text-align: center; padding: 10px; border: 1px solid #ddd;">${av3}</td>
                    <td style="text-align: center; padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${Number(final) >= 6 ? 'green' : 'red'};">${final}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html><body style="font-family: sans-serif; padding: 40px;">
                <h2>Mapa de Médias - ${gradeAdminClass}</h2>
                <p>${gradeAdminSubject} | ${gradeAdminBimester}</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead><tr style="background: #f4f4f4;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Aluno</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Total AV1</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">AV2 (Simulado)</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">AV3 (Prova)</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Média</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body></html>
        `);
        printWindow.document.close();
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    const filteredExams = exams.filter(e => 
        e.title.toLowerCase().includes(examSearch.toLowerCase()) || 
        e.teacherName.toLowerCase().includes(examSearch.toLowerCase())
    );

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.className.toLowerCase().includes(studentSearch.toLowerCase())
    ).sort((a,b) => a.name.localeCompare(b.name));

    const allSubjects = Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS, "GERAL", "PROJETOS", "AVALIAÇÕES"])).sort();

    // --- CALENDAR HELPERS ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysCount; i++) calendarDays.push(i);

    const dayAppointments = aeeAppointments.filter(a => a.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));

    // Planejamentos Filtrados
    const filteredLessonPlans = useMemo(() => {
        return lessonPlans.filter(p => {
            const matchClass = !planFilterClass || p.className === planFilterClass;
            const matchType = planFilterType === 'todos' || p.type === planFilterType;
            return matchClass && matchType;
        });
    }, [lessonPlans, planFilterClass, planFilterType]);

    // Grupos de Turmas para Grade Horária TV
    const groupedClasses = useMemo(() => {
        return [
            { level: 'Educação Infantil', classes: ["JARDIM I", "JARDIM II"] },
            { level: 'Ensino Fundamental I (EFAI)', classes: ["1º ANO EFAI", "2º ANO EFAI", "3º ANO EFAI", "4º ANO EFAI", "5º ANO EFAI"] },
            { level: 'Ensino Fundamental II (EFAF)', classes: ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF"] },
            { level: 'Ensino Médio (EM)', classes: ["1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"] }
        ];
    }, []);

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
            {/* SIDEBAR ADMINISTRATIVA */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 ml-2">Painel de Gestão</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="answer_keys" label="Gabaritos" icon={FileCheck} />
                    <SidebarItem id="grades_admin" label="Lançamento ADM" icon={Calculator} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="aee_agenda" label="Agenda AEE" icon={Heart} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertTriangle} />
                    <SidebarItem id="lesson_plans" label="Planejamentos" icon={BookMarked} />
                    <SidebarItem id="schedule" label="Horários TV" icon={CalendarClock} />
                    <SidebarItem id="sync" label="Sync Gennera" icon={Repeat} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Central de Cópias</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Controle de solicitações dos professores</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard title="Pendentes" value={exams.filter(e => e.status === ExamStatus.PENDING).length} icon={Hourglass} color="yellow" />
                            <StatCard title="Em Produção" value={exams.filter(e => e.status === ExamStatus.IN_PROGRESS).length} icon={Printer} color="blue" />
                            <StatCard title="Prontos" value={exams.filter(e => e.status === ExamStatus.READY).length} icon={ClipboardCheck} color="purple" />
                            <StatCard title="Entregues" value={exams.filter(e => e.status === ExamStatus.COMPLETED).length} icon={CheckCircle} color="green" />
                        </div>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest">Solicitações de Impressão</h3>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" placeholder="Buscar..." className="pl-12 pr-6 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-red-600 transition-all w-80" value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-8">Data</th>
                                            <th className="p-8">Material / Professor</th>
                                            <th className="p-8">Turma / Qtd</th>
                                            <th className="p-8">Status</th>
                                            <th className="p-8 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredExams.map(exam => (
                                            <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8 text-xs font-bold text-gray-500">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                                <td className="p-8">
                                                    <p className="font-black text-white uppercase tracking-tight text-sm">{exam.title}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Prof. {exam.teacherName}</p>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/5">{exam.gradeLevel}</span>
                                                        <span className="text-red-500 font-black text-lg">{exam.quantity}x</span>
                                                    </div>
                                                </td>
                                                <td className="p-8"><StatusBadge status={exam.status} /></td>
                                                <td className="p-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <a href={exam.fileUrls?.[0]} target="_blank" className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"><Download size={16}/></a>
                                                        {exam.status === ExamStatus.PENDING && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Iniciar</button>
                                                        )}
                                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.READY)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Pronto</button>
                                                        )}
                                                        {exam.status === ExamStatus.READY && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Entregue</button>
                                                        )}
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

                {activeTab === 'aee_agenda' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
                        <header>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Agenda AEE Global</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Monitoramento centralizado de atendimentos especializados</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* CALENDÁRIO ADMIN */}
                            <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <Calendar className="text-red-500" size={24}/> Atendimentos no Mês
                                    </h2>
                                    <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20}/></button>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[140px] text-center">{monthName}</span>
                                        <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-3 mb-4">
                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                        <div key={d} className="text-center text-[9px] font-black text-gray-600 uppercase tracking-widest">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-3">
                                    {calendarDays.map((day, idx) => {
                                        if (!day) return <div key={idx} className="h-20 md:h-24"></div>;
                                        
                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isSelected = selectedDate === dateStr;
                                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                                        const dayApps = aeeAppointments.filter(a => a.date === dateStr);
                                        const hasApps = dayApps.length > 0;

                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedDate(dateStr)}
                                                className={`h-20 md:h-24 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all relative group ${
                                                    isSelected 
                                                    ? 'bg-red-600 border-red-500 text-white shadow-xl' 
                                                    : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                }`}
                                            >
                                                <span className={`text-sm font-black ${isSelected ? 'text-white' : (isToday ? 'text-red-500' : 'text-gray-600')}`}>{day}</span>
                                                {hasApps && (
                                                    <div className="mt-2 flex gap-1">
                                                        {dayApps.slice(0, 3).map((_, i) => (
                                                            <div key={i} className={`h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-600'}`}></div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* LISTA DE ATENDIMENTOS DO DIA */}
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[600px]">
                                <div className="mb-6">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{dayAppointments.length} Atendimentos</p>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                    {dayAppointments.length > 0 ? dayAppointments.map(app => (
                                        <div key={app.id} className="bg-black/30 border border-white/5 p-5 rounded-2xl group hover:border-red-600/30 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-lg font-black text-red-500">{app.time}</span>
                                                <span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">{app.period}</span>
                                            </div>
                                            <h4 className="font-black text-white text-xs uppercase tracking-tight mb-1">{app.studentName}</h4>
                                            {app.description && <p className="text-[10px] text-gray-500 italic line-clamp-2">"{app.description}"</p>}
                                        </div>
                                    )) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-20 text-gray-500">
                                            <Clock size={48} className="mb-4"/>
                                            <p className="font-black uppercase tracking-widest text-[10px]">Sem agendamentos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
                        <header className="flex justify-between items-start">
                            <div>
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Base de Alunos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Gestão de matrículas e enturmação</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar aluno por nome ou turma..." 
                                    className="w-[450px] bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none focus:border-red-600 transition-all shadow-xl" 
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                />
                            </div>
                        </header>

                        {/* GRID DE TURMAS (RESUMO) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            {CLASSES.map(cls => {
                                const matriculados = students.filter(s => s.className === cls).length;
                                const presentes = todayAttendance.filter(a => a.className === cls && a.type === 'entry').length;
                                
                                return (
                                    <div key={cls} className="bg-[#121214] border border-white/5 rounded-[2rem] p-6 hover:border-red-600/30 transition-all group shadow-xl">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">{cls}</p>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-4xl font-black text-white leading-none mb-1">{matriculados}</p>
                                                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Matriculados</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-green-500 leading-none mb-1">{presentes}</p>
                                                <p className="text-[8px] font-black text-green-900 uppercase tracking-widest">Presentes</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* LISTAGEM GERAL */}
                        <section className="bg-[#121214] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                <h2 className="text-xl font-black text-white uppercase tracking-widest">Listagem Geral</h2>
                                <span className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest border border-white/10">{filteredStudents.length} Alunos</span>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-8">Aluno</th>
                                            <th className="p-8">Turma</th>
                                            <th className="p-8">Matrícula</th>
                                            <th className="p-8 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-gray-500 text-xs uppercase group-hover:border-red-600 group-hover:text-red-500 transition-all">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <span className="font-black text-white uppercase text-xs tracking-tight">{student.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <span className="bg-black/40 border border-white/5 px-3 py-1 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest">{student.className}</span>
                                                </td>
                                                <td className="p-8 text-xs font-mono text-gray-600 uppercase tracking-widest">{student.id.substring(0, 8)}</td>
                                                <td className="p-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-600 hover:text-white transition-all border border-white/5">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button onClick={async () => { if(confirm(`Excluir ${student.name}?`)) await deleteStudent(student.id); }} className="p-3 bg-white/5 hover:bg-red-600/10 rounded-xl text-gray-600 hover:text-red-500 transition-all border border-white/5">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'grades_admin' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Lançamento de Notas ADM</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Preenchimento de Simulados e Provas Bimestrais</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={gradeAdminClass} onChange={e => setGradeAdminClass(e.target.value)}>
                                    <option value="">Turma</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={gradeAdminSubject} onChange={e => setGradeAdminSubject(e.target.value)}>
                                    <option value="">Disciplina</option>
                                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={gradeAdminBimester} onChange={e => setGradeAdminBimester(e.target.value)}>
                                    <option>1º BIMESTRE</option><option>2º BIMESTRE</option><option>3º BIMESTRE</option><option>4º BIMESTRE</option>
                                </select>
                                <Button onClick={generateGradeMap} className="bg-blue-600 h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20"><FileBarChart size={16} className="mr-2"/> Mapa de Notas</Button>
                            </div>
                        </header>

                        {gradeAdminClass && gradeAdminSubject ? (
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-[#121214] text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="p-8 sticky left-0 bg-[#121214] z-10">Aluno</th>
                                            <th className="p-8 text-center text-red-500">AV1 (Professor)</th>
                                            <th className="p-8 text-center text-blue-400">AV2 (Simulado)</th>
                                            <th className="p-8 text-center text-purple-400">AV3 (Prova)</th>
                                            <th className="p-8 text-center text-green-500">Média Final</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {students.filter(s => s.className === gradeAdminClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => {
                                            const sGrades = (gradebookData?.grades[student.id] || { av1: {} }) as { av1: Record<string, number>, av2?: number, av3?: number };
                                            const av1Total = Object.values(sGrades.av1 || {}).reduce((a: number, b: number) => a + b, 0);
                                            const final = ((av1Total + (sGrades.av2 || 0) + (sGrades.av3 || 0)) / 3).toFixed(1);

                                            return (
                                                <tr key={student.id} className="hover:bg-white/[0.02]">
                                                    <td className="p-8 sticky left-0 bg-[#18181b] font-black text-xs text-white uppercase tracking-tight">{student.name}</td>
                                                    <td className="p-8 text-center font-black text-red-500 text-lg opacity-50">{av1Total.toFixed(1)}</td>
                                                    <td className="p-8 text-center">
                                                        <input type="number" step="0.1" className="w-20 bg-[#121214] border-2 border-blue-900/30 rounded-xl p-3 text-center text-blue-400 font-black outline-none focus:border-blue-500 transition-all" value={sGrades.av2 ?? ''} onChange={e => handleUpdateAdminGrade(student.id, 'av2', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-8 text-center">
                                                        <input type="number" step="0.1" className="w-20 bg-[#121214] border-2 border-purple-900/30 rounded-xl p-3 text-center text-purple-400 font-black outline-none focus:border-purple-500 transition-all" value={sGrades.av3 ?? ''} onChange={e => handleUpdateAdminGrade(student.id, 'av3', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-8 text-center">
                                                        <span className={`text-2xl font-black ${Number(final) >= 6 ? 'text-green-500' : 'text-red-500'}`}>{final === '0.0' ? '0' : final}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                <Calculator size={64} className="mx-auto mb-4 text-gray-500" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500">Selecione Turma e Disciplina para iniciar o lançamento</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'sync' && <GenneraSyncPanel />}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Ocorrências Global</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Visualização de todos os registros da escola</p>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Data</th><th className="p-8">Aluno / Turma</th><th className="p-8">Relatado por</th><th className="p-8">Descrição</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {occurrences.map(occ => (
                                        <tr key={occ.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 text-xs font-bold text-gray-500">{new Date(occ.timestamp).toLocaleDateString()}</td>
                                            <td className="p-8">
                                                <p className="font-black text-white uppercase text-sm">{occ.studentName}</p>
                                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{occ.studentClass}</p>
                                            </td>
                                            <td className="p-8 font-black text-red-500 text-xs uppercase tracking-widest">{occ.reportedBy}</td>
                                            <td className="p-8"><p className="text-xs text-gray-400 line-clamp-2 max-w-md">{occ.description}</p></td>
                                            <td className="p-8 text-right">
                                                <button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id); }} className="p-3 bg-white/5 hover:bg-red-600/10 text-gray-600 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Grade Horária TV</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Edição do monitor público de horários</p>
                        </header>
                        
                        <div className="space-y-12 pb-20">
                            {groupedClasses.map((group) => (
                                <section key={group.level} className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                    <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-8">
                                        <div className="h-10 w-1.5 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-[0.05em]">{group.level}</h2>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Configuração de Horários por Segmento</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {group.classes.map(cls => (
                                            <div key={cls} className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] hover:border-red-600/30 transition-all group/card shadow-xl flex flex-col justify-between h-48">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-black text-white uppercase tracking-widest text-[13px] leading-tight mb-2">{cls}</h3>
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Ativo no Monitor</span>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-2xl text-gray-700 group-hover/card:text-red-500 group-hover/card:bg-red-600/10 transition-all duration-500">
                                                        <Layout size={20}/>
                                                    </div>
                                                </div>
                                                <button onClick={() => alert(`Configurando grade para: ${cls}`)} className="w-full py-4 bg-white/5 hover:bg-red-600 text-gray-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-inner border border-white/5">
                                                    Configurar Grade
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações Globais</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes de sistema e comunicação</p>
                        </header>
                        <div className="bg-[#18181b] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <div className="space-y-6">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4"><Megaphone size={28} className="text-red-600"/> Comunicado no Mural</h3>
                                <div className="flex items-center justify-between bg-black/40 p-6 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exibir Aviso Público</label>
                                    <button onClick={() => setConfigIsBannerActive(!configIsBannerActive)}>
                                        {configIsBannerActive ? <ToggleRight size={40} className="text-green-500" /> : <ToggleLeft size={40} className="text-gray-800" />}
                                    </button>
                                </div>
                                <textarea className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[150px]" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Mensagem do banner..." />
                                <select className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}>
                                    <option value="info">Informação (Azul)</option>
                                    <option value="warning">Aviso (Amarelo)</option>
                                    <option value="error">Crítico (Vermelho)</option>
                                    <option value="success">Sucesso (Verde)</option>
                                </select>
                            </div>
                            <Button onClick={handleSaveConfig} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 shadow-2xl shadow-red-900/40 text-sm"><Save size={24} className="mr-3"/> Atualizar Sistema</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'lesson_plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos Recebidos</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Monitoramento pedagógico centralizado</p>
                            </div>
                            
                            {/* Filtros */}
                            <div className="flex flex-wrap items-center gap-4 bg-[#18181b] border border-white/5 p-4 rounded-3xl shadow-xl">
                                <div className="relative group">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                    <select 
                                        className="bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[200px] cursor-pointer"
                                        value={planFilterClass}
                                        onChange={e => setPlanFilterClass(e.target.value)}
                                    >
                                        <option value="">Todas as Turmas</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                    {['todos', 'diario', 'bimestral', 'inova'].map(type => (
                                        <button 
                                            key={type}
                                            onClick={() => setPlanFilterType(type)}
                                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${planFilterType === type ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {(planFilterClass || planFilterType !== 'todos') && (
                                    <button 
                                        onClick={() => { setPlanFilterClass(''); setPlanFilterType('todos'); }}
                                        className="p-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                                        title="Limpar Filtros"
                                    >
                                        <FilterX size={18}/>
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLessonPlans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-red-600/30 transition-all flex flex-col relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl ${plan.type === 'inova' ? 'bg-[#9D44FF]/10 text-[#9D44FF]' : 'bg-red-600/10 text-red-500'}`}>
                                            {plan.type === 'inova' ? <Sparkles size={24}/> : <BookOpen size={24}/>}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 inline-block ${plan.type === 'inova' ? 'text-purple-400' : 'text-red-400'}`}>
                                                {plan.type || 'geral'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{plan.className}</h3>
                                    <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-6">{plan.subject} • {plan.teacherName}</p>
                                    <button className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">Visualizar Completo</button>
                                </div>
                            ))}
                            
                            {filteredLessonPlans.length === 0 && (
                                <div className="col-span-full py-40 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                                    <BookMarked size={64} className="mx-auto mb-6" />
                                    <p className="text-xl font-black uppercase tracking-[0.4em]">Nenhum planejamento encontrado para este filtro</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};