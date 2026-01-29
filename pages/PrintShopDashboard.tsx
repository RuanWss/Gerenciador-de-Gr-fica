import React, { useState, useEffect, useMemo } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    listenToStudents, 
    listenToSystemConfig, 
    updateSystemConfig,
    listenToSchedule,
    saveScheduleEntry,
    deleteScheduleEntry,
    listenToStaffMembers,
    listenToAEEAppointments,
    saveAEEAppointment,
    deleteAEEAppointment,
    listenToGradebook,
    saveGradebook,
    listenToOccurrences,
    deleteOccurrence,
    updateStudent,
    uploadStudentPhoto,
    listenToAttendanceLogs,
    listenToAllLessonPlans,
    deleteStudent,
    deleteLessonPlan
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    SystemConfig, 
    GradebookEntry,
    AEEAppointment,
    ScheduleEntry,
    StaffMember,
    StudentOccurrence,
    AttendanceLog,
    LessonPlan
} from '../types';
import { 
    Printer, Search, Users, Settings, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Save, X, Download,
    FileCheck, Calculator, Calendar, BookOpen, BookMarked, CalendarClock,
    Heart, ChevronLeft, ChevronRight, Plus, Trash2,
    FileBarChart, Edit, Camera, AlertTriangle, Repeat, Layout, Info, UserCircle,
    Sparkles, Filter, FilterX, Check, History,
    CheckSquare, Rocket, Lightbulb, Target, Box, Layers, Cpu, ExternalLink, PrinterCheck
} from 'lucide-react';
import { Button } from '../components/Button';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { GenneraSyncPanel } from './GenneraSyncPanel';
import { useAuth } from '../context/AuthContext';

const GRID_SLOTS = [
    { id: 'm1', label: '1º Horário', time: '07:20 - 08:10' },
    { id: 'm2', label: '2º Horário', time: '08:10 - 09:00' },
    { id: 'm3', label: '3º Horário', time: '09:20 - 10:10' },
    { id: 'm4', label: '4º Horário', time: '10:10 - 11:00' },
    { id: 'm5', label: '5º Horário', time: '11:00 - 12:00' },
];

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
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'answer_keys' | 'grades_admin' | 'students' | 'aee_agenda' | 'occurrences' | 'lesson_plans' | 'schedule' | 'sync' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    
    // Data Collections
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [examSearch, setExamSearch] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState('');
    const [gradeAdminClass, setGradeAdminClass] = useState('');
    const [gradeAdminSubject, setGradeAdminSubject] = useState('');
    const [gradeAdminBimester, setGradeAdminBimester] = useState('1º BIMESTRE');
    const [gradebookData, setGradebookData] = useState<GradebookEntry | null>(null);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [aeeAppointments, setAeeAppointments] = useState<AEEAppointment[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceLog[]>([]);

    // Detail Modal State
    const [selectedExam, setSelectedExam] = useState<ExamRequest | null>(null);
    const [showExamDetail, setShowExamDetail] = useState(false);

    // Student Edit State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null);
    const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null);

    // Lesson Plan States
    const [planFilterClass, setPlanFilterClass] = useState('');
    const [planFilterType, setPlanFilterType] = useState<string>('todos');
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanViewModal, setShowPlanViewModal] = useState(false);

    // Schedule Grid States
    const [selectedSegment, setSelectedSegment] = useState<'INFANTIL' | 'EFAI' | 'EFAF' | 'MÉDIO'>('EFAF');
    const [selectedDay, setSelectedDay] = useState<number>(4);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleFormData, setScheduleFormData] = useState({
        slotId: '', className: '', subject: '', professor: '', id: ''
    });

    // Agenda Admin State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Config States
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    // 1. Listeners for UI state that are needed globally or for the initial view (Exams)
    useEffect(() => {
        if (!user) return;
        getExams().then(data => setExams(data.sort((a,b) => b.createdAt - a.createdAt)));
        
        const unsubConfig = listenToSystemConfig((cfg) => {
            setSysConfig(cfg);
            setConfigBannerMsg(cfg.bannerMessage || '');
            setConfigBannerType(cfg.bannerType || 'info');
            setConfigIsBannerActive(cfg.isBannerActive || false);
        }, () => {}); // Suppress config permission errors if any

        return () => {
            unsubConfig();
        };
    }, [user]);

    // 2. Tab-Specific Listeners to avoid "Insufficient Permissions" on background tabs
    useEffect(() => {
        if (!user) return;
        let unsubscribe: () => void = () => {};

        if (activeTab === 'students' || activeTab === 'grades_admin' || activeTab === 'aee_agenda') {
            unsubscribe = listenToStudents(setStudents, (err) => console.warn("Students listener restricted", err));
        } else if (activeTab === 'occurrences') {
            unsubscribe = listenToOccurrences(setOccurrences, (err) => console.warn("Occurrences listener restricted", err));
        } else if (activeTab === 'lesson_plans') {
            unsubscribe = listenToAllLessonPlans(setLessonPlans, (err) => console.warn("Lesson Plans listener restricted", err));
        } else if (activeTab === 'schedule') {
            unsubscribe = listenToSchedule(setSchedule, (err) => console.warn("Schedule listener restricted", err));
            const unsubStaff = listenToStaffMembers(setStaffMembers, () => {});
            return () => { unsubscribe(); unsubStaff(); };
        } else if (activeTab === 'aee_agenda') {
            unsubscribe = listenToAEEAppointments(setAeeAppointments, (err) => console.warn("AEE listener restricted", err));
        }

        return () => unsubscribe();
    }, [user, activeTab]);

    // 3. Today's Attendance listener (only if on Students tab)
    useEffect(() => {
        if (!user || activeTab !== 'students') return;
        const today = new Date().toISOString().split('T')[0];
        const unsubscribe = listenToAttendanceLogs(today, setTodayAttendance, () => {});
        return () => unsubscribe();
    }, [user, activeTab]);

    // 4. Gradebook Admin Listener
    useEffect(() => {
        if (user && activeTab === 'grades_admin' && gradeAdminClass && gradeAdminSubject && gradeAdminBimester) {
            const unsub = listenToGradebook(gradeAdminClass, gradeAdminSubject, gradeAdminBimester, (data) => {
                setGradebookData(data);
            });
            return () => unsub();
        }
    }, [user, activeTab, gradeAdminClass, gradeAdminSubject, gradeAdminBimester]);

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
        if (selectedExam && selectedExam.id === id) {
            setSelectedExam({ ...selectedExam, status });
        }
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive,
        });
        alert("Configurações atualizadas!");
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent({ ...student });
        setStudentPhotoPreview(student.photoUrl || null);
        setStudentPhotoFile(null);
        setShowStudentModal(true);
    };

    const handleSaveStudentEdit = async () => {
        if (!editingStudent) return;
        setIsLoading(true);
        try {
            let photoUrl = editingStudent.photoUrl || '';
            if (studentPhotoFile) {
                photoUrl = await uploadStudentPhoto(studentPhotoFile, editingStudent.name);
            }
            await updateStudent({ ...editingStudent, photoUrl });
            setShowStudentModal(false);
            alert("Cadastro do aluno atualizado com sucesso!");
        } catch (error) {
            alert("Erro ao atualizar aluno.");
        } finally {
            setIsLoading(false);
        }
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
                    <td style="text-align: center; padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${Number(final) >= 7 ? 'green' : 'red'};">${final}</td>
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

    const handlePrintSlip = (exam: ExamRequest) => {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) return;
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Ficha de Produção - ${exam.title}</title>
                <style>
                    body { font-family: 'Poppins', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { height: 60px; }
                    .badge { background: #000; color: #fff; padding: 5px 15px; border-radius: 5px; font-weight: bold; text-transform: uppercase; font-size: 14px; }
                    .title { font-size: 28px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px; }
                    .grid { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 30px; }
                    .field { border-bottom: 1px solid #eee; padding: 10px 0; }
                    .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #666; display: block; margin-bottom: 4px; }
                    .value { font-size: 18px; font-weight: bold; }
                    .instructions { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 10px; margin-top: 30px; }
                    .quantity-box { border: 4px solid #000; padding: 30px; text-align: center; border-radius: 20px; margin: 40px 0; }
                    .quantity-box .num { font-size: 80px; font-weight: 900; }
                    .footer { margin-top: 100px; display: flex; justify-content: space-between; font-size: 12px; }
                    .sig { border-top: 1px solid #000; padding-top: 5px; width: 250px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" class="logo" style="filter: brightness(0)">
                    <div class="badge">Ordem de Produção</div>
                </div>
                
                <h1 class="title">${exam.title}</h1>
                
                <div style="display: flex; gap: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px;">
                    <div style="flex: 1">
                        <span class="label">Professor solicitante</span>
                        <div class="value">${exam.teacherName}</div>
                    </div>
                    <div style="width: 150px">
                        <span class="label">Data Solicitação</span>
                        <div class="value">${new Date(exam.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div class="field">
                        <span class="label">Turma / Nível</span>
                        <div class="value">${exam.gradeLevel}</div>
                    </div>
                    <div class="field">
                        <span class="label">Disciplina</span>
                        <div class="value">${exam.subject}</div>
                    </div>
                </div>

                <div class="quantity-box">
                    <span class="label">Total de Cópias Necessárias</span>
                    <div class="num">${exam.quantity}</div>
                </div>

                <div class="instructions">
                    <span class="label">Observações da Impressão</span>
                    <div style="font-size: 16px; white-space: pre-wrap;">${exam.instructions || 'Nenhuma instrução específica fornecida.'}</div>
                </div>

                <div class="footer">
                    <div>
                        <span class="label">ID Sistema</span>
                        <div>${exam.id}</div>
                    </div>
                    <div class="sig">
                        Assinatura Responsável Gráfica
                    </div>
                </div>

                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-brand-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    const filteredExams = exams.filter(e => 
        e.title.toLowerCase().includes(examSearch.toLowerCase()) || 
        e.teacherName.toLowerCase().includes(examSearch.toLowerCase())
    );

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                             s.className.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesClass = selectedClassFilter === '' || s.className === selectedClassFilter;
        return matchesSearch && matchesClass;
    }).sort((a,b) => a.name.localeCompare(b.name));

    const allSubjects = Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS, "GERAL", "PROJETOS", "AVALIAÇÕES"])).sort();

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

    const getNormalizedType = (type?: string) => {
        return String(type || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredLessonPlans = useMemo(() => {
        return lessonPlans.filter(p => {
            const type = getNormalizedType(p.type);
            const matchClass = !planFilterClass || p.className === planFilterClass;
            let matchType = planFilterType === 'todos';
            if (planFilterType === 'diario') matchType = type === 'diario' || type === 'daily';
            if (planFilterType === 'bimestral') matchType = type === 'bimestral' || type === 'bimester';
            if (planFilterType === 'inova') matchType = type === 'inova';
            
            return matchClass && matchType;
        });
    }, [lessonPlans, planFilterClass, planFilterType]);

    const handleViewPlan = (plan: LessonPlan) => {
        setSelectedPlan(plan);
        setShowPlanViewModal(true);
    };

    const filteredClassesForGrid = useMemo(() => {
        switch(selectedSegment) {
            case 'INFANTIL': return ["JARDIM I", "JARDIM II"];
            case 'EFAI': return ["1º ANO EFAI", "2º ANO EFAI", "3º ANO EFAI", "4º ANO EFAI", "5º ANO EFAI"];
            case 'EFAF': return ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF"];
            case 'MÉDIO': return ["1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"];
            default: return [];
        }
    }, [selectedSegment]);

    const handleCellClick = (slotId: string, className: string) => {
        const entry = schedule.find(s => s.className === className && s.slotId === slotId && s.dayOfWeek === selectedDay);
        setScheduleFormData({
            slotId,
            className,
            subject: entry?.subject || '',
            professor: entry?.professor || '',
            id: entry?.id || ''
        });
        setShowScheduleModal(true);
    };

    const handleSaveSchedule = async () => {
        if (!scheduleFormData.subject || !scheduleFormData.professor) {
            alert("Preencha disciplina e professor");
            return;
        }

        setIsLoading(true);
        try {
            const classId = scheduleFormData.className.toLowerCase().replace(/\s+/g, '');
            await saveScheduleEntry({
                id: scheduleFormData.id,
                classId,
                className: scheduleFormData.className,
                dayOfWeek: selectedDay,
                slotId: scheduleFormData.slotId,
                subject: scheduleFormData.subject,
                professor: scheduleFormData.professor
            });
            setShowScheduleModal(false);
        } catch (err) {
            alert("Erro ao salvar horário");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSchedule = async () => {
        if (!scheduleFormData.id) return;
        if (!confirm("Remover esta aula do horário?")) return;
        
        setIsLoading(true);
        try {
            await deleteScheduleEntry(scheduleFormData.id);
            setShowScheduleModal(false);
        } catch (err) {
            alert("Erro ao excluir");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenExamDetail = (exam: ExamRequest) => {
        setSelectedExam(exam);
        setShowExamDetail(true);
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
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
                                    <input type="text" placeholder="Buscar..." className="pl-12 pr-6 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-brand-600 transition-all w-80" value={examSearch} onChange={e => setExamSearch(e.target.value)} />
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
                                                    <p className="font-black text-white uppercase tracking-tight text-sm mb-1">{exam.title}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-4">Prof. {exam.teacherName}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {exam.fileUrls?.map((url, idx) => (
                                                            <div key={idx} className="flex items-center gap-1">
                                                                <a 
                                                                    href={url} 
                                                                    target="_blank" 
                                                                    className="flex items-center gap-2 bg-white/5 hover:bg-brand-600/10 px-3 py-1.5 rounded-lg text-gray-400 hover:text-brand-500 transition-all border border-white/5 group/file text-[10px] font-bold"
                                                                    title={exam.fileNames?.[idx] || 'Ver Arquivo'}
                                                                >
                                                                    <FileText size={14}/>
                                                                    <span className="truncate max-w-[100px] uppercase">
                                                                        {exam.fileNames?.[idx] || `F${idx + 1}`}
                                                                    </span>
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/5">{exam.gradeLevel}</span>
                                                        <span className="text-brand-500 font-black text-lg">{exam.quantity}x</span>
                                                    </div>
                                                </td>
                                                <td className="p-8"><StatusBadge status={exam.status} /></td>
                                                <td className="p-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleOpenExamDetail(exam)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all" title="Ver Detalhes">
                                                            <ExternalLink size={18}/>
                                                        </button>
                                                        {exam.status === ExamStatus.PENDING && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.IN_PROGRESS)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">Iniciar</button>
                                                        )}
                                                        {exam.status === ExamStatus.IN_PROGRESS && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.READY)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">Finalizar</button>
                                                        )}
                                                        {exam.status === ExamStatus.READY && (
                                                            <button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">Retirado</button>
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

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
                        {/* ... existing schedule content ... */}
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-8">
                            <div>
                                <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">Grade Horária</h1>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-4">Distribuição semanal de aulas.</p>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="flex bg-[#121214] p-1.5 rounded-[1.5rem] border border-white/5 shadow-2xl">
                                    {['INFANTIL', 'EFAI', 'EFAF', 'MÉDIO'].map((seg) => (
                                        <button 
                                            key={seg}
                                            onClick={() => setSelectedSegment(seg as any)}
                                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSegment === seg ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {seg}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex bg-[#121214] p-1.5 rounded-[1.5rem] border border-white/5 shadow-2xl">
                                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((day, idx) => (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDay(idx + 1)}
                                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedDay === (idx + 1) ? 'bg-red-600 text-white shadow-lg shadow-red-950/40' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </header>

                        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                            <div className="grid grid-cols-[240px_repeat(auto-fit,minmax(180px,1fr))] bg-black/40 border-b border-white/5">
                                <div className="p-8 text-[11px] font-black text-gray-500 uppercase tracking-widest border-r border-white/5">Horário</div>
                                {filteredClassesForGrid.map(cls => (
                                    <div key={cls} className="p-8 text-[11px] font-black text-white uppercase tracking-widest text-center border-r border-white/5 last:border-r-0">
                                        {cls}
                                    </div>
                                ))}
                            </div>

                            <div className="divide-y divide-white/5">
                                {GRID_SLOTS.map((slot) => (
                                    <div key={slot.id} className="grid grid-cols-[240px_repeat(auto-fit,minmax(180px,1fr))] items-stretch hover:bg-white/[0.01] transition-colors">
                                        <div className="p-8 border-r border-white/5 flex flex-col justify-center">
                                            <p className="text-white font-black text-lg leading-tight">{slot.label}</p>
                                            <p className="text-[10px] text-gray-600 font-bold tracking-widest mt-1 uppercase">{slot.time}</p>
                                        </div>

                                        {filteredClassesForGrid.map(cls => {
                                            const entry = schedule.find(s => s.className === cls && s.slotId === slot.id && s.dayOfWeek === selectedDay);
                                            
                                            return (
                                                <div key={cls} className="p-4 border-r border-white/5 last:border-r-0 flex items-center justify-center">
                                                    <button 
                                                        onClick={() => handleCellClick(slot.id, cls)}
                                                        className={`w-full h-24 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 group ${entry ? 'bg-red-600/10 border-red-600/20' : 'bg-black/20 border-dashed border-white/10 hover:border-red-600/30'}`}
                                                    >
                                                        {entry ? (
                                                            <>
                                                                <span className="text-white font-black text-[13px] uppercase tracking-tight">{entry.subject}</span>
                                                                <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">{entry.professor.split(' ')[0]}</span>
                                                            </>
                                                        ) : (
                                                            <Plus size={24} className="text-gray-800 group-hover:text-red-500 group-hover:scale-110 transition-all"/>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
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
                            <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <Calendar className="text-brand-500" size={24}/> Atendimentos no Mês
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
                                            <div key={idx} onClick={() => setSelectedDate(dateStr)} className={`h-20 md:h-24 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all relative group ${isSelected ? 'bg-brand-600 border-red-500 text-white shadow-xl' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
                                                <span className={`text-sm font-black ${isSelected ? 'text-white' : (isToday ? 'text-brand-500' : 'text-gray-600')}`}>{day}</span>
                                                {hasApps && (
                                                    <div className="mt-2 flex gap-1">
                                                        {dayApps.slice(0, 3).map((_, i) => (
                                                            <div key={i} className={`h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-600'}`}></div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[600px]">
                                <div className="mb-6">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{dayAppointments.length} Atendimentos</p>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                    {dayAppointments.length > 0 ? dayAppointments.map(app => (
                                        <div key={app.id} className="bg-black/30 border border-white/5 p-5 rounded-2xl group hover:border-brand-600/30 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-lg font-black text-brand-500">{app.time}</span>
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
                                <input type="text" placeholder="Buscar aluno por nome ou turma..." className="w-[450px] bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white font-bold outline-none focus:border-brand-600 transition-all shadow-xl" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            {CLASSES.map(cls => {
                                const matriculados = students.filter(s => s.className === cls).length;
                                const presentes = todayAttendance.filter(a => a.className === cls && a.type === 'entry').length;
                                const isSelected = selectedClassFilter === cls;
                                return (
                                    <div key={cls} onClick={() => setSelectedClassFilter(isSelected ? '' : cls)} className={`bg-[#121214] border rounded-[2rem] p-6 hover:border-brand-600/30 transition-all group shadow-xl cursor-pointer ${isSelected ? 'border-brand-600 ring-1 ring-red-600/50' : 'border-white/5'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isSelected ? 'text-brand-500' : 'text-gray-500'}`}>{cls}</p>
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
                        <section className="bg-[#121214] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Listagem Geral</h2>
                                    {selectedClassFilter && (
                                        <span className="inline-flex items-center gap-2 bg-brand-600/20 text-brand-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-brand-500/20">
                                            {selectedClassFilter}
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedClassFilter(''); }} className="hover:text-white transition-colors"><X size={12}/></button>
                                        </span>
                                    )}
                                </div>
                                <span className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest border border-white/10">{filteredStudents.length} Alunos</span>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] sticky top-0 z-10 backdrop-blur-sm">
                                        <tr><th className="p-8">Aluno</th><th className="p-8">Turma</th><th className="p-8">Matrícula</th><th className="p-8 text-right">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-gray-500 text-xs uppercase group-hover:border-brand-600 group-hover:text-brand-500 transition-all overflow-hidden">{student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} /> : student.name.charAt(0)}</div><span className="font-black text-white uppercase text-xs tracking-tight">{student.name}</span></div></td>
                                                <td className="p-8"><span className="bg-black/40 border border-white/5 px-3 py-1 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest">{student.className}</span></td>
                                                <td className="p-8 text-xs font-mono text-gray-600 uppercase tracking-widest">{student.id.substring(0, 8)}</td>
                                                <td className="p-8 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEditStudent(student)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-600 hover:text-white transition-all border border-white/5"><Edit size={14} /></button><button onClick={async () => { if(confirm(`Excluir ${student.name}?`)) await deleteStudent(student.id); }} className="p-3 bg-white/5 hover:bg-brand-600/10 rounded-xl text-gray-600 hover:text-red-500 transition-all border border-white/5"><Trash2 size={14} /></button></div></td>
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
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Lançamento de Notas ADM</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Preenchimento de Simulados e Provas Bimestrais</p></div>
                            <div className="flex flex-wrap gap-4"><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminClass} onChange={e => setGradeAdminClass(e.target.value)}><option value="">Turma</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminSubject} onChange={e => setGradeAdminSubject(e.target.value)}><option value="">Disciplina</option>{allSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminBimester} onChange={e => setGradeAdminBimester(e.target.value)}><option>1º BIMESTRE</option><option>2º BIMESTRE</option><option>3º BIMESTRE</option><option>4º BIMESTRE</option></select><Button onClick={generateGradeMap} className="bg-blue-600 h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20"><FileBarChart size={16} className="mr-2"/> Mapa de Notas</Button></div>
                        </header>
                        {gradeAdminClass && gradeAdminSubject ? (
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-[#121214] text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                        <tr><th className="p-8 sticky left-0 bg-[#121214] z-10">Aluno</th><th className="p-8 text-center text-brand-500">AV1 (Professor)</th><th className="p-8 text-center text-blue-400">AV2 (Simulado)</th><th className="p-8 text-center text-purple-400">AV3 (Prova)</th><th className="p-8 text-center text-green-500">Média Final</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {students.filter(s => s.className === gradeAdminClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => {
                                            const sGrades = (gradebookData?.grades[student.id] || { av1: {} }) as { av1: Record<string, number>, av2?: number, av3?: number };
                                            const av1Total = Object.values(sGrades.av1 || {}).reduce((a: number, b: number) => a + b, 0);
                                            const final = ((av1Total + (sGrades.av2 || 0) + (sGrades.av3 || 0)) / 3).toFixed(1);
                                            return (
                                                <tr key={student.id} className="hover:bg-white/[0.02]"><td className="p-8 sticky left-0 bg-[#18181b] font-black text-xs text-white uppercase tracking-tight">{student.name}</td><td className="p-8 text-center font-black text-brand-500 text-lg opacity-50">{av1Total.toFixed(1)}</td><td className="p-8 text-center"><input type="number" step="0.1" max="10" className="w-20 bg-[#121214] border-2 border-blue-900/30 rounded-xl p-3 text-center text-blue-400 font-black outline-none focus:border-blue-500 transition-all" value={sGrades.av2 ?? ''} onChange={e => handleUpdateAdminGrade(student.id, 'av2', Number(e.target.value))} /></td><td className="p-8 text-center"><input type="number" step="0.1" max="10" className="w-20 bg-[#121214] border-2 border-purple-900/30 rounded-xl p-3 text-center text-purple-400 font-black outline-none focus:border-purple-500 transition-all" value={sGrades.av3 ?? ''} onChange={e => handleUpdateAdminGrade(student.id, 'av3', Number(e.target.value))} /></td><td className="p-8 text-center"><span className={`text-2xl font-black ${Number(final) >= 7 ? 'text-green-500' : 'text-brand-500'}`}>{final === '0.0' ? '0' : final}</span></td></tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30"><Calculator size={64} className="mx-auto mb-4 text-gray-500" /><p className="font-black uppercase tracking-widest text-sm text-gray-500">Selecione Turma e Disciplina para iniciar o lançamento</p></div>}
                    </div>
                )}

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
                                        <tr key={occ.id} className="hover:bg-white/[0.02]"><td className="p-8 text-xs font-bold text-gray-500">{new Date(occ.timestamp).toLocaleDateString()}</td><td className="p-8"><p className="font-black text-white uppercase text-sm">{occ.studentName}</p><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{occ.studentClass}</p></td><td className="p-8 font-black text-brand-500 text-xs uppercase tracking-widest">{occ.reportedBy}</td><td className="p-8"><p className="text-xs text-gray-400 line-clamp-2 max-w-md">{occ.description}</p></td><td className="p-8 text-right"><button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id); }} className="p-3 bg-white/5 hover:bg-brand-600/10 text-gray-600 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'lesson_plans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos Recebidos</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Monitoramento pedagógico centralizado</p></div>
                            <div className="flex flex-wrap items-center gap-4 bg-[#18181b] border border-white/5 p-4 rounded-3xl shadow-xl"><div className="relative group"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/><select className="bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[200px] cursor-pointer" value={planFilterClass} onChange={e => setPlanFilterClass(e.target.value)}><option value="">Todas as Turmas</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="flex bg-black/40 p-1 rounded-xl border border-white/10">{['todos', 'diario', 'bimestral', 'inova'].map(type => (<button key={type} onClick={() => setPlanFilterType(type)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${planFilterType === type ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>{type}</button>))}</div>{(planFilterClass || planFilterType !== 'todos') && (<button onClick={() => { setPlanFilterClass(''); setPlanFilterType('todos'); }} className="p-3 bg-brand-600/10 text-brand-500 hover:bg-brand-600 hover:text-white rounded-xl transition-all" title="Limpar Filtros"><FilterX size={18}/></button>)}</div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLessonPlans.map(plan => {
                                const type = getNormalizedType(plan.type);
                                const isProjectInova = type === 'inova';
                                return (
                                    <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-brand-600/30 transition-all flex flex-col relative overflow-hidden"><div className="flex justify-between items-start mb-6"><div className={`p-4 rounded-2xl ${isProjectInova ? 'bg-[#9D44FF]/10 text-[#9D44FF]' : 'bg-brand-600/10 text-brand-500'}`}>{isProjectInova ? <Sparkles size={24}/> : <BookOpen size={24}/>}</div><div className="text-right flex items-center gap-2"><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">{new Date(plan.createdAt).toLocaleDateString()}</span><button onClick={async () => { if(confirm("Excluir planejamento?")) await deleteLessonPlan(plan.id); }} className="text-gray-800 hover:text-red-500"><Trash2 size={16}/></button></div></div><h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{plan.className}</h3><p className="text-brand-500 font-black uppercase text-[10px] tracking-widest mb-6">{plan.subject} • {plan.teacherName}</p><button onClick={() => handleViewPlan(plan)} className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">Visualizar Completo</button></div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                        <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configurações Globais</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajustes de sistema e comunicação</p></header>
                        <div className="bg-[#18181b] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl space-y-12">
                            <div className="space-y-6"><h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4"><Settings size={28} className="text-brand-600"/> Comunicado no Mural</h3><div className="flex items-center justify-between bg-black/40 p-6 rounded-3xl border border-white/5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exibir Aviso Público</label><button onClick={() => setConfigIsBannerActive(!configIsBannerActive)}>{configIsBannerActive ? <Check size={40} className="text-green-500" /> : <X size={40} className="text-gray-800" />}</button></div><textarea className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-white font-medium outline-none focus:border-brand-600 transition-all min-h-[150px]" value={configBannerMsg} onChange={e => setConfigBannerMsg(e.target.value)} placeholder="Mensagem do banner..." /><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-brand-600 appearance-none" value={configBannerType} onChange={e => setConfigBannerType(e.target.value as any)}><option value="info">Informação (Azul)</option><option value="warning">Aviso (Amarelo)</option><option value="error">Crítico (Vermelho)</option><option value="success">Sucesso (Verde)</option></select></div><Button onClick={handleSaveConfig} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-brand-600 shadow-2xl shadow-red-900/40 text-sm"><Save size={24} className="mr-3"/> Atualizar Sistema</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'sync' && <GenneraSyncPanel />}
            </div>

            {/* Modal for Exam Detail & Slips */}
            {showExamDetail && selectedExam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 bg-black/20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-brand-600/10 flex items-center justify-center text-brand-500">
                                    <FileText size={24}/>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Detalhes da Produção</h3>
                                    <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">{selectedExam.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExamDetail(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Professor(a)</span>
                                    <p className="text-white font-bold text-lg">{selectedExam.teacherName}</p>
                                </div>
                                <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Volume Necessário</span>
                                    <p className="text-brand-500 font-black text-3xl">{selectedExam.quantity} <span className="text-xs text-gray-600 uppercase tracking-widest ml-1">unid.</span></p>
                                </div>
                            </div>

                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5">
                                <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Info size={14}/> Instruções de Execução
                                </span>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedExam.instructions || 'Nenhuma instrução específica fornecida pelo professor.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={() => handlePrintSlip(selectedExam)}
                                    className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 h-16 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl"
                                >
                                    <PrinterCheck size={20}/> Imprimir Ficha de Produção
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <a 
                                        href={selectedExam.fileUrls?.[0]} 
                                        target="_blank"
                                        className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/10"
                                    >
                                        <Download size={18}/> Baixar Arquivos
                                    </a>
                                    {selectedExam.status === ExamStatus.PENDING && (
                                        <button 
                                            onClick={() => handleUpdateExamStatus(selectedExam.id, ExamStatus.IN_PROGRESS)}
                                            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg"
                                        >
                                            <Printer size={18}/> Iniciar Produção
                                        </button>
                                    )}
                                    {selectedExam.status === ExamStatus.IN_PROGRESS && (
                                        <button 
                                            onClick={() => handleUpdateExamStatus(selectedExam.id, ExamStatus.READY)}
                                            className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg"
                                        >
                                            <CheckCircle size={18}/> Marcar como Pronto
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Student Edit */}
            {showStudentModal && editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3"><Edit size={24} className="text-brand-500" /> Editar Aluno</h3><button onClick={() => setShowStudentModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button></div>
                        <div className="space-y-8">
                             <div className="flex flex-col items-center gap-4"><div className="relative group"><div className="h-40 w-40 rounded-[2rem] bg-black/40 border-4 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">{studentPhotoPreview ? <img src={studentPhotoPreview} className="h-full w-full object-cover" alt="Preview"/> : <UserCircle size={80} className="text-gray-700"/>}<label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"><Camera size={32} className="text-white mb-2"/><span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar Foto</span><input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setStudentPhotoFile(file); setStudentPhotoPreview(URL.createObjectURL(file)); } }}/></label></div></div></div>
                             <div className="space-y-4"><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nome Completo</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600 transition-all uppercase" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} /></div><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma Atual</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600 transition-all appearance-none" value={editingStudent.className} onChange={e => setEditingStudent({...editingStudent, className: e.target.value, classId: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
                             <div className="flex gap-4"><Button variant="outline" onClick={() => setShowStudentModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border-2">Cancelar</Button><Button onClick={handleSaveStudentEdit} isLoading={isLoading} className="flex-1 h-16 bg-brand-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40"><Save size={20} className="mr-3"/> Salvar Alterações</Button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Plan Viewing */}
            {showPlanViewModal && selectedPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-6xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-6"><div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${getNormalizedType(selectedPlan.type) === 'inova' ? 'bg-[#9D44FF]/10 border border-[#9D44FF]/20 text-[#9D44FF]' : 'bg-brand-600/10 border border-brand-600/20 text-brand-500'}`}>{getNormalizedType(selectedPlan.type) === 'inova' ? <Sparkles size={32} /> : <BookOpen size={32} />}</div><div><h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Planejamento Detalhado</h3><p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{selectedPlan.className} • {selectedPlan.subject} • Prof. {selectedPlan.teacherName}</p></div></div>
                            <button onClick={() => setShowPlanViewModal(false)} className="text-gray-600 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                             {/* ... logic for rendering plan details ... */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5"><p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Tema / Tópico</p><p className="text-white font-bold">{selectedPlan.topic || selectedPlan.inovaTheme || '---'}</p></div>
                                 <div className="bg-black/40 p-6 rounded-3xl border border-white/5"><p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Conteúdo</p><p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedPlan.content || selectedPlan.contents || '---'}</p></div>
                             </div>
                             {getNormalizedType(selectedPlan.type) === 'inova' && (
                                <div className="bg-purple-900/10 p-8 rounded-[2.5rem] border border-purple-500/20"><h4 className="text-xs font-black text-[#9D44FF] uppercase tracking-widest mb-4">Projeto Inova - Resultados Esperados</h4><div className="flex flex-wrap gap-2">{selectedPlan.expectedResults?.map((r, i) => <span key={i} className="bg-[#9D44FF]/10 text-[#9D44FF] px-3 py-1 rounded-lg text-[9px] font-black border border-[#9D44FF]/20">{r}</span>)}</div></div>
                             )}
                        </div>
                        <div className="p-8 border-t border-white/5 bg-black/20 flex justify-end"><Button onClick={() => setShowPlanViewModal(false)} className="px-12 h-16 bg-gray-800 hover:bg-gray-700 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl">Fechar</Button></div>
                    </div>
                </div>
            )}

            {/* Modal for Schedule Config */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20"><div><h3 className="text-2xl font-black text-white uppercase tracking-tight">Configurar Aula</h3><p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">{scheduleFormData.className} • {GRID_SLOTS.find(s => s.id === scheduleFormData.slotId)?.label}</p></div><button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button></div>
                        <div className="p-10 space-y-8">
                            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={scheduleFormData.subject} onChange={e => setScheduleFormData({...scheduleFormData, subject: e.target.value})}><option value="">Selecione...</option>{allSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Professor</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={scheduleFormData.professor} onChange={e => setScheduleFormData({...scheduleFormData, professor: e.target.value})}><option value="">Selecione...</option>{staffMembers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                            <div className="flex gap-4">{scheduleFormData.id && (<button onClick={handleDeleteSchedule} className="h-16 w-16 bg-white/5 hover:bg-red-600/10 text-gray-600 hover:text-red-500 rounded-2xl border border-white/5 flex items-center justify-center transition-all"><Trash2 size={24}/></button>)}<Button onClick={handleSaveSchedule} isLoading={isLoading} className="flex-1 h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40"><Save size={20} className="mr-3"/> Salvar</Button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
