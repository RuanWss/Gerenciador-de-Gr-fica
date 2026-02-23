import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    deleteLessonPlan,
    saveLessonPlan,
    listenToClassGradebooks,
    listenToAllDiagrammedExams
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
    LessonPlan,
    DiagrammedExam
} from '../types';
import { 
    Printer, Search, Users, Settings, FileText, CheckCircle, Clock, Hourglass, 
    ClipboardCheck, Save, X, Download,
    FileCheck, Calculator, Calendar, BookOpen, BookMarked, CalendarClock,
    Heart, ChevronLeft, ChevronRight, Plus, Trash2,
    FileBarChart, Edit, Camera, AlertTriangle, Repeat, Layout, Info, UserCircle,
    Sparkles, Filter, FilterX, Check, History,
    CheckSquare, Rocket, Lightbulb, Target, Box, Layers, Cpu, ExternalLink,
    Map as MapIcon,
    MapPin,
    LayoutGrid
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

const KNOWLEDGE_AREAS: Record<string, string> = {
    "LÍNGUA PORTUGUESA": "Linguagens",
    "ARTE": "Linguagens",
    "EDUCAÇÃO FÍSICA": "Linguagens",
    "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS": "Linguagens",
    "REDAÇÃO": "Linguagens",
    "LITERATURA": "Linguagens",
    "PRODUÇÃO TEXTUAL": "Linguagens",
    "MATEMÁTICA": "Matemática",
    "MATEMÁTICA II": "Matemática",
    "EDUCAÇÃO FINANCEIRA": "Matemática",
    "BIOLOGIA": "Ciências da Natureza",
    "BIOLOGIA II": "Ciências da Natureza",
    "FÍSICA": "Ciências da Natureza",
    "QUÍMICA": "Ciências da Natureza",
    "QUÍMICA II": "Ciências da Natureza",
    "CIÊNCIAS": "Ciências da Natureza",
    "HISTÓRIA": "Ciências Humanas",
    "GEOGRAFIA": "Ciências Humanas",
    "SOCIOLOGIA": "Ciências Humanas",
    "FILOSOFIA": "Ciências Humanas",
    "PROJETO DE VIDA": "Outros/Projetos",
    "PENSAMENTO COMPUTACIONAL": "Outros/Projetos",
    "DINÂMICAS DE LEITURA": "Outros/Projetos",
    "ITINERÁRIO FORMATIVO": "Outros/Projetos",
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO": "Outros/Projetos",
    "ELETIVA 04: PROJETO DE VIDA": "Outros/Projetos"
};

const getArea = (subject?: string) => {
    if (!subject) return "Geral";
    return KNOWLEDGE_AREAS[subject.trim().toUpperCase()] || "Geral";
};

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
    const statusInfo: Record<string, { text: string; icon: any; color: string }> = {
        [ExamStatus.PENDING]: { text: 'Pendente', icon: Hourglass, color: 'yellow' },
        [ExamStatus.RECEIVED]: { text: 'Recebido', icon: Clock, color: 'blue' },
        [ExamStatus.IN_PROGRESS]: { text: 'Em Produção', icon: Printer, color: 'blue' },
        [ExamStatus.READY]: { text: 'Pronto p/ Retirada', icon: ClipboardCheck, color: 'purple' },
        [ExamStatus.COMPLETED]: { text: 'Entregue', icon: CheckCircle, color: 'green' },
    };

    const info = statusInfo[status] || { text: status, icon: Clock, color: 'gray' };
    const Icon = info.icon;

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${info.color}-500/10 text-${info.color}-500 border-${info.color}-500/20`}>
            <Icon size={14} />
            {info.text}
        </span>
    );
};

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'grades_admin' | 'students' | 'aee_agenda' | 'occurrences' | 'lesson_plans' | 'schedule' | 'mapa' | 'diagrammed_exams' | 'reports'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    
    // Data Collections
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [diagrammedExams, setDiagrammedExams] = useState<DiagrammedExam[]>([]);
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
    const [planFilterTeacher, setPlanFilterTeacher] = useState('');
    const [planFilterType, setPlanFilterType] = useState<string>('todos');
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
    const [showPlanViewModal, setShowPlanViewModal] = useState(false);
    const [showPlanEditModal, setShowPlanEditModal] = useState(false);
    const [planningTab, setPlanningTab] = useState<'diario' | 'bimestral' | 'inova'>('diario');
    const [planForm, setPlanForm] = useState<Partial<LessonPlan>>({});

    // Occurrences States
    const [occFilterClass, setOccFilterClass] = useState('');
    const [occFilterTeacher, setOccFilterTeacher] = useState('');
    const [occFilterStudent, setOccFilterStudent] = useState('');
    const [selectedOccurrence, setSelectedOccurrence] = useState<StudentOccurrence | null>(null);
    const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
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

    // Mapa de Atividades State
    const [mapaClass, setMapaClass] = useState('');
    const [mapaGradebooks, setMapaGradebooks] = useState<GradebookEntry[]>([]);

    // --- PDF GENERATION ---
    const handleDownloadPDF = async (exam: DiagrammedExam) => {
        const doc = new jsPDF();
        
        // Helper to load image
        const loadImage = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg'));
                    } else {
                        reject(new Error('Canvas context is null'));
                    }
                };
                img.onerror = reject;
            });
        };

        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CENTRO DE ESTUDOS PROF. MANOEL LESTE", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.text(`AVALIAÇÃO DE ${exam.subject.toUpperCase()}`, 105, 30, { align: "center" });
        doc.text(`${exam.bimester} - ${exam.className}`, 105, 38, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Professor(a): ${exam.teacherName}`, 14, 50);
        doc.text(`Aluno(a): ___________________________________________________`, 14, 58);
        doc.text(`Data: ____/____/________`, 150, 58);

        let yPos = 70;

        for (const q of exam.questions) {
            // Check page break
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.text(`QUESTÃO ${q.number}`, 14, yPos);
            yPos += 5;

            if (q.skill) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8);
                doc.text(`Habilidade: ${q.skill}`, 14, yPos);
                doc.setFontSize(10);
                yPos += 5;
            } else {
                yPos += 2;
            }

            doc.setFont("helvetica", "normal");
            const splitStatement = doc.splitTextToSize(q.statement, 180);
            doc.text(splitStatement, 14, yPos);
            yPos += (splitStatement.length * 5) + 5;

            // Image Handling
            if (q.headerImage) {
                try {
                    const imgData = await loadImage(q.headerImage);
                    const imgProps = doc.getImageProperties(imgData);
                    const pdfWidth = 100; // max width in mm
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    
                    if (yPos + pdfHeight > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.addImage(imgData, 'JPEG', 14, yPos, pdfWidth, pdfHeight);
                    yPos += pdfHeight + 5;
                } catch (err) {
                    console.error("Error loading image for question " + q.number, err);
                }
            }

            if (q.type === 'objective' && q.alternatives) {
                q.alternatives.forEach(alt => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    const altText = `${alt.label}) ${alt.text}`;
                    const splitAlt = doc.splitTextToSize(altText, 170);
                    doc.text(splitAlt, 20, yPos);
                    yPos += (splitAlt.length * 5) + 2;
                });
                yPos += 5;
            } else if (q.type === 'discursive') {
                const lines = q.lines || 5;
                for (let i = 0; i < lines; i++) {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.line(14, yPos, 196, yPos);
                    yPos += 8;
                }
                yPos += 5;
            }
        }

        // --- ANSWER KEY PAGE ---
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("GABARITO", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text(`AVALIAÇÃO DE ${exam.subject.toUpperCase()} - ${exam.className}`, 105, 30, { align: "center" });

        let gabaritoY = 50;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        // Create a table-like structure or just list them
        // Let's list them in columns if possible, but simple list is safer
        
        const objectiveQuestions = exam.questions.filter(q => q.type === 'objective');
        
        if (objectiveQuestions.length > 0) {
            objectiveQuestions.forEach(q => {
                if (gabaritoY > 270) {
                    doc.addPage();
                    gabaritoY = 20;
                }
                
                const correctAlt = q.alternatives?.find(a => a.isCorrect);
                const answerText = correctAlt ? correctAlt.label : "Sem resposta definida";
                
                doc.text(`Questão ${q.number}: ${answerText}`, 20, gabaritoY);
                gabaritoY += 10;
            });
        } else {
            doc.text("Esta prova não contém questões objetivas.", 20, gabaritoY);
        }

        doc.save(`${exam.className} - ${exam.subject} - ${exam.bimester}.pdf`);
    };

    const teachersWithExams = useMemo(() => {
        // Filter for teachers
        const teachers = staffMembers.filter(s => s.role === 'TEACHER' || s.isTeacher);
        
        return teachers.map(t => {
            const exams = diagrammedExams.filter(e => e.teacherId === t.id);
            // Get unique classes from exams
            const classes = [...new Set(exams.map(e => e.className))];
            
            return {
                id: t.id,
                name: t.name,
                hasExams: exams.length > 0,
                classes
            };
        });
    }, [staffMembers, diagrammedExams]);
    const [mapaFilters, setMapaFilters] = useState({
        search: '',
        area: '',
        professor: '',
        bimester: '1º BIMESTRE'
    });


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

        if (activeTab === 'students' || activeTab === 'grades_admin') {
            unsubscribe = listenToStudents(setStudents, (err) => console.warn("Students listener restricted", err));
        } else if (activeTab === 'occurrences') {
            unsubscribe = listenToOccurrences(setOccurrences, (err) => console.warn("Occurrences listener restricted", err));
        } else if (activeTab === 'lesson_plans') {
            unsubscribe = listenToAllLessonPlans(setLessonPlans, (err) => console.warn("Lesson Plans listener restricted", err));
        } else if (activeTab === 'diagrammed_exams') {
            unsubscribe = listenToAllDiagrammedExams(setDiagrammedExams, (err) => console.warn("Diagrammed Exams listener restricted", err));
        } else if (activeTab === 'schedule') {
            unsubscribe = listenToSchedule(setSchedule, (err) => console.warn("Schedule listener restricted", err));
            /* FIX: Changed setStaff to setStaffMembers to resolve "Cannot find name 'setStaff'" error */
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

    // 5. Mapa Gradebook Listener
    useEffect(() => {
        if (activeTab === 'mapa' && mapaClass) {
            const unsub = listenToClassGradebooks(mapaClass, (data) => {
                setMapaGradebooks(data);
            });
            return () => unsub();
        } else if (activeTab === 'mapa') {
            setMapaGradebooks([]);
        }
    }, [activeTab, mapaClass]);

    const filteredMapa = useMemo(() => {
        let activities: Array<{ 
            gradebookId: string, 
            subject: string, 
            area: string, 
            activity: any,
            bimester: string
        }> = [];

        // Flatten activities from all gradebooks of the class
        mapaGradebooks.forEach(gb => {
            if (gb.av1Config) {
                gb.av1Config.forEach(act => {
                    activities.push({
                        gradebookId: gb.id,
                        subject: gb.subject || '',
                        area: getArea(gb.subject),
                        activity: act,
                        bimester: gb.bimester
                    });
                });
            }
        });

        return activities.filter(item => {
            const activityName = item.activity.activityName || '';
            const subject = item.subject || '';
            const searchLower = mapaFilters.search.toLowerCase();

            const matchesSearch = activityName.toLowerCase().includes(searchLower) ||
                                subject.toLowerCase().includes(searchLower);
            const matchesArea = !mapaFilters.area || item.area === mapaFilters.area;
            const matchesBimester = item.bimester === mapaFilters.bimester;
            
            return matchesSearch && matchesArea && matchesBimester;
        });
    }, [mapaGradebooks, mapaFilters]);

    const mapaGroupedByArea = useMemo(() => {
        const grouped: Record<string, typeof filteredMapa> = {};
        filteredMapa.forEach(item => {
            if (!grouped[item.area]) grouped[item.area] = [];
            grouped[item.area].push(item);
        });
        return grouped;
    }, [filteredMapa]);

    const handleUpdateAdminGrade = async (studentId: string, type: 'av2' | 'av3', value: number) => {
        if (!gradeAdminClass || !gradeAdminSubject) return;
        
        // FEATURE: Clamping admin grades
        let clampedValue = value;
        if (value > 10) clampedValue = 10;
        if (value < 0) clampedValue = 0;

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
        updatedGrades[studentId][type] = clampedValue;
        
        await saveGradebook({ ...currentData, grades: updatedGrades });
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        if (selectedExam && selectedExam.id === id) {
            setSelectedExam({ ...selectedExam, status });
        }
    };

    const generateActivityMapPDF = () => {
        if (!mapaClass) return alert("Selecione uma turma.");
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = filteredMapa.map(item => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.area}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.subject}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.activity.activityName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.activity.applicationDate ? new Date(item.activity.applicationDate).toLocaleDateString() : '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.activity.deliveryDate ? new Date(item.activity.deliveryDate).toLocaleDateString() : '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.activity.location === 'CASA' ? 'CASA' : 'ESCOLA'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.activity.maxScore}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html><body style="font-family: sans-serif; padding: 20px;">
                <h2>Mapa de Atividades - ${mapaClass}</h2>
                <p>${mapaFilters.bimester}</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead><tr style="background: #f4f4f4;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Área</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Disciplina</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Atividade</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Aplicação</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Entrega</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Local</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Valor</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body></html>
        `);
        printWindow.document.close();
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

    const SidebarItem = ({ id, label, icon: Icon, onClick }: { id: typeof activeTab, label: string, icon: any, onClick?: () => void }) => (
        <button
            onClick={onClick || (() => setActiveTab(id))}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-brand-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} /> <span>{label}</span>
        </button>
    );

    const filteredExams = exams.filter(e => 
        (e.title || '').toLowerCase().includes(examSearch.toLowerCase()) || 
        (e.teacherName || '').toLowerCase().includes(examSearch.toLowerCase())
    );

    /* FIX: Added filteredStudents useMemo to resolve "Cannot find name 'filteredStudents'" error */
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch = (student.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                                 (student.id || '').toLowerCase().includes(studentSearch.toLowerCase());
            const matchesClass = !selectedClassFilter || student.className === selectedClassFilter;
            return matchesSearch && matchesClass;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [students, studentSearch, selectedClassFilter]);

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
            const matchTeacher = !planFilterTeacher || p.teacherName.toLowerCase().includes(planFilterTeacher.toLowerCase());
            let matchType = planFilterType === 'todos';
            if (planFilterType === 'diario') matchType = type === 'diario' || type === 'daily';
            if (planFilterType === 'bimestral') matchType = type === 'bimestral' || type === 'bimester';
            if (planFilterType === 'inova') matchType = type === 'inova';
            
            return matchClass && matchType && matchTeacher;
        });
    }, [lessonPlans, planFilterClass, planFilterType, planFilterTeacher]);

    const filteredOccurrences = useMemo(() => {
        return occurrences.filter(occ => {
            const matchClass = !occFilterClass || occ.studentClass === occFilterClass;
            const matchTeacher = !occFilterTeacher || occ.reportedBy.toLowerCase().includes(occFilterTeacher.toLowerCase());
            const matchStudent = !occFilterStudent || occ.studentName.toLowerCase().includes(occFilterStudent.toLowerCase());
            return matchClass && matchTeacher && matchStudent;
        });
    }, [occurrences, occFilterClass, occFilterTeacher, occFilterStudent]);

    const generateOccurrencesPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = filteredOccurrences.map(occ => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date(occ.timestamp).toLocaleDateString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${occ.studentName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${occ.studentClass}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${occ.reportedBy}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${occ.description}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html><body style="font-family: sans-serif; padding: 20px;">
                <h2>Diário de Ocorrências</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead><tr style="background: #f4f4f4;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Data</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Aluno</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Turma</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Relatado por</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Descrição</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body></html>
        `);
        printWindow.document.close();
    };

    const handleViewPlan = (plan: LessonPlan) => {
        setSelectedPlan(plan);
        setShowPlanViewModal(true);
    };

    const handleEditPlan = (plan: LessonPlan) => {
        setPlanForm({ ...plan });
        if (plan.type) {
            setPlanningTab(plan.type as any);
        } else {
            setPlanningTab('diario');
        }
        setShowPlanEditModal(true);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const planToSave: LessonPlan = {
                ...planForm,
                id: planForm.id || '',
                teacherId: planForm.teacherId || '',
                teacherName: planForm.teacherName || '',
                createdAt: planForm.createdAt || Date.now(),
                type: planningTab,
                className: planForm.className || '',
                subject: planForm.subject || 'Geral',
            } as LessonPlan;
            await saveLessonPlan(planToSave);
            alert("Planejamento salvo com sucesso!");
            setShowPlanEditModal(false);
        } catch (err) {
            alert("Erro ao salvar planejamento.");
        } finally {
            setIsLoading(false);
        }
    };

    const subjects = Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS]));

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
                    <SidebarItem id="mapa" label="Mapa de Atividades" icon={MapIcon} />
                    <SidebarItem id="grades_admin" label="Lançamento ADM" icon={Calculator} />
                    <SidebarItem id="students" label="Base de Alunos" icon={Users} />
                    <SidebarItem id="aee_agenda" label="Agenda AEE" icon={Heart} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertTriangle} />
                    <SidebarItem id="lesson_plans" label="Planejamentos" icon={BookMarked} />
                    <SidebarItem id="diagrammed_exams" label="Provas" icon={FileCheck} />
                    <SidebarItem id="reports" label="Relatórios" icon={FileBarChart} />
                    <SidebarItem 
                        id="schedule" 
                        label="Horários TV" 
                        icon={CalendarClock} 
                        onClick={() => window.open('https://lightgrey-goat-712571.hostingersite.com/', '_blank')}
                    />
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
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">Prof. {exam.teacherName}</p>
                                                    {exam.instructions && (
                                                        <div className="mb-4 bg-red-500/10 border-l-2 border-red-500 p-2 rounded-r-lg max-w-md">
                                                            <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Info size={10}/> Observações:</p>
                                                            <p className="text-[10px] text-gray-400 italic leading-tight line-clamp-2">{exam.instructions}</p>
                                                        </div>
                                                    )}
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

                {activeTab === 'mapa' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Mapa de Atividades</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Visão geral das avaliações cadastradas</p>
                            </div>
                            <div className="w-full md:w-64 space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Selecionar Turma</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-3 px-4 text-white text-sm font-bold outline-none focus:border-red-600 transition-all appearance-none cursor-pointer shadow-xl"
                                        value={mapaClass}
                                        onChange={e => setMapaClass(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button 
                                        onClick={generateActivityMapPDF}
                                        className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl shadow-lg transition-all"
                                        title="Gerar PDF"
                                    >
                                        <FileText size={20} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {mapaClass ? (
                            <>
                                {/* Mapa Filters */}
                                <div className="bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-col md:flex-row gap-6 items-end">
                                    <div className="flex-1 w-full space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pesquisar Atividade</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                            <input 
                                                className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all placeholder-gray-600"
                                                placeholder="Ex: Seminário, Prova, Trabalho..."
                                                value={mapaFilters.search}
                                                onChange={e => setMapaFilters({...mapaFilters, search: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-56 space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bimestre</label>
                                        <select 
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 px-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                                            value={mapaFilters.bimester}
                                            onChange={e => setMapaFilters({...mapaFilters, bimester: e.target.value})}
                                        >
                                            <option value="1º BIMESTRE">1º BIMESTRE</option>
                                            <option value="2º BIMESTRE">2º BIMESTRE</option>
                                            <option value="3º BIMESTRE">3º BIMESTRE</option>
                                            <option value="4º BIMESTRE">4º BIMESTRE</option>
                                        </select>
                                    </div>
                                    <div className="w-full md:w-56 space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Área</label>
                                        <select 
                                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 px-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                                            value={mapaFilters.area}
                                            onChange={e => setMapaFilters({...mapaFilters, area: e.target.value})}
                                        >
                                            <option value="">Todas as Áreas</option>
                                            <option value="Linguagens">Linguagens</option>
                                            <option value="Matemática">Matemática</option>
                                            <option value="Ciências da Natureza">Ciências da Natureza</option>
                                            <option value="Ciências Humanas">Ciências Humanas</option>
                                            <option value="Outros/Projetos">Outros/Projetos</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={() => setMapaFilters({search: '', area: '', professor: '', bimester: '1º BIMESTRE'})}
                                        className="h-[52px] w-[52px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5"
                                        title="Limpar Filtros"
                                    >
                                        <Filter size={20}/>
                                    </button>
                                </div>

                                {/* Mapa Content Grouped by Area */}
                                <div className="space-y-12 pb-20">
                                    {Object.entries(mapaGroupedByArea).length > 0 ? Object.entries(mapaGroupedByArea).map(([area, items]) => (
                                        <section key={area} className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-px flex-1 bg-white/5"></div>
                                                <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <Layers size={14}/> {area}
                                                </h2>
                                                <div className="h-px flex-1 bg-white/5"></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {/* FIX: Cast items to any[] to fix 'map' does not exist on type 'unknown' error */}
                                                {(items as any[]).map((item, idx) => (
                                                    <div key={`${item.gradebookId}-${idx}`} className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 shadow-2xl hover:border-blue-500/30 transition-all relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                            <Target size={80} />
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">{item.subject}</span>
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{item.activity.activityName}</h3>
                                                            </div>
                                                            <div className="bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-xl text-blue-500 font-black text-xs">
                                                                {item.activity.maxScore.toFixed(1)} <span className="text-[8px] opacity-60">PTS</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10}/> Aplicação</p>
                                                                <p className="text-xs font-bold text-white">{item.activity.applicationDate}</p>
                                                            </div>
                                                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10}/> Entrega</p>
                                                                <p className="text-xs font-bold text-white">{item.activity.deliveryDate}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${item.activity.location === 'CASA' ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-orange-600/10 border-orange-500/20 text-orange-400'}`}>
                                                                    {item.activity.location === 'CASA' ? <MapPin size={14}/> : <LayoutGrid size={14}/>}
                                                                </div>
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                    {item.activity.location === 'CASA' ? 'Tarefa/Casa' : 'Sala de Aula'}
                                                                </span>
                                                            </div>
                                                            <div className="h-8 w-px bg-white/5"></div>
                                                            <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
                                                                <UserCircle size={14}/>
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Avaliação AV1</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )) : (
                                        <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                            <MapIcon size={64} className="mx-auto mb-6 text-gray-600" />
                                            <h3 className="text-xl font-black text-white uppercase tracking-[0.4em]">Nenhuma atividade encontrada</h3>
                                            <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Verifique o bimestre ou aguarde lançamento dos professores</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                <Search size={64} className="mx-auto mb-6 text-gray-600" />
                                <h3 className="text-xl font-black text-white uppercase tracking-[0.4em]">Selecione uma Turma</h3>
                                <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Utilize o seletor acima para visualizar o mapa</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
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
                                                                <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">{entry.professor?.split(' ')[0] || ''}</span>
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
                                        <tr><th className="p-8">Aluno</th><th className="p-8">Turma</th><th className="p-8">Matrícula</th><th className="p-8 text-center">Status</th><th className="p-8 text-right">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-gray-500 text-xs uppercase group-hover:border-brand-600 group-hover:text-brand-500 transition-all overflow-hidden">{student.photoUrl ? <img src={student.photoUrl} className="h-full w-full object-cover" alt={student.name} /> : student.name.charAt(0)}</div><span className="font-black text-white uppercase text-xs tracking-tight">{student.name}</span></div></td>
                                                <td className="p-8"><span className="bg-black/40 border border-white/5 px-3 py-1 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest">{student.className}</span></td>
                                                <td className="p-8 text-xs font-mono text-gray-600 uppercase tracking-widest">{student.id.substring(0, 8)}</td>
                                                <td className="p-8 text-center">
                                                    {(() => {
                                                        const log = todayAttendance.find(l => l.studentId === student.id);
                                                        if (!log) return <span className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Sem Registro</span>;
                                                        return log.type === 'entry' 
                                                            ? <span className="text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Presente</span>
                                                            : <span className="text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Ausente</span>;
                                                    })()}
                                                </td>
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
                            <div className="flex flex-wrap gap-4"><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminClass} onChange={e => setGradeAdminClass(e.target.value)}><option value="">Turma</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminSubject} onChange={e => setGradeAdminSubject(e.target.value)}><option value="">Disciplina</option>{allSubjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]" value={gradeAdminBimester} onChange={e => setGradeAdminBimester(e.target.value)}><option>1º BIMESTRE</option><option>2º BIMESTRE</option><option>3º BIMESTRE</option><option>4º BIMESTRE</option></select><Button onClick={generateGradeMap} className="bg-blue-600 h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20"><FileBarChart size={16} className="mr-2"/> Mapa de Notas</Button></div>
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
                         <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Ocorrências Global</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Visualização de todos os registros da escola</p>
                            </div>
                            <div className="flex flex-wrap gap-4 bg-[#18181b] p-4 rounded-3xl border border-white/5 shadow-xl">
                                <select 
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[150px]"
                                    value={occFilterClass}
                                    onChange={e => setOccFilterClass(e.target.value)}
                                >
                                    <option value="">Todas as Turmas</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Filtrar por Professor..." 
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none focus:border-brand-600 min-w-[150px]"
                                    value={occFilterTeacher}
                                    onChange={e => setOccFilterTeacher(e.target.value)}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Filtrar por Aluno..." 
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none focus:border-brand-600 min-w-[150px]"
                                    value={occFilterStudent}
                                    onChange={e => setOccFilterStudent(e.target.value)}
                                />
                                <button 
                                    onClick={generateOccurrencesPDF}
                                    className="p-2 bg-brand-600/10 text-brand-500 hover:bg-brand-600 hover:text-white rounded-xl transition-all"
                                    title="Imprimir Ocorrências Filtradas"
                                >
                                    <Printer size={16}/>
                                </button>
                                {(occFilterClass || occFilterTeacher || occFilterStudent) && (
                                    <button 
                                        onClick={() => { setOccFilterClass(''); setOccFilterTeacher(''); setOccFilterStudent(''); }}
                                        className="p-2 bg-brand-600/10 text-brand-500 hover:bg-brand-600 hover:text-white rounded-xl transition-all"
                                    >
                                        <FilterX size={16}/>
                                    </button>
                                )}
                            </div>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Data</th><th className="p-8">Aluno / Turma</th><th className="p-8">Relatado por</th><th className="p-8">Descrição</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredOccurrences.map(occ => (
                                        <tr key={occ.id} className="hover:bg-white/[0.02]"><td className="p-8 text-xs font-bold text-gray-500">{new Date(occ.timestamp).toLocaleDateString()}</td><td className="p-8"><p className="font-black text-white uppercase text-sm">{occ.studentName}</p><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{occ.studentClass}</p></td><td className="p-8 font-black text-brand-500 text-xs uppercase tracking-widest">{occ.reportedBy}</td><td className="p-8"><p className="text-xs text-gray-400 line-clamp-2 max-w-md">{occ.description}</p></td><td className="p-8 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setSelectedOccurrence(occ); setShowOccurrenceModal(true); }} className="p-3 bg-white/5 hover:bg-brand-600/10 text-gray-600 hover:text-brand-500 rounded-xl transition-all"><FileText size={16}/></button><button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id); }} className="p-3 bg-white/5 hover:bg-brand-600/10 text-gray-600 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16}/></button></div></td></tr>
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
                            <div className="flex flex-wrap items-center gap-4 bg-[#18181b] border border-white/5 p-4 rounded-3xl shadow-xl">
                                <div className="relative group">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                    <select className="bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 appearance-none min-w-[200px] cursor-pointer" value={planFilterClass} onChange={e => setPlanFilterClass(e.target.value)}>
                                        <option value="">Todas as Turmas</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="relative group">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por Professor..."
                                        className="bg-black/40 border border-white/10 rounded-xl px-10 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-brand-600 min-w-[200px]"
                                        value={planFilterTeacher}
                                        onChange={e => setPlanFilterTeacher(e.target.value)}
                                    />
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                    {['todos', 'diario', 'bimestral', 'inova'].map(type => (<button key={type} onClick={() => setPlanFilterType(type)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${planFilterType === type ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>{type}</button>))}
                                </div>
                                {(planFilterClass || planFilterType !== 'todos' || planFilterTeacher) && (
                                    <button onClick={() => { setPlanFilterClass(''); setPlanFilterType('todos'); setPlanFilterTeacher(''); }} className="p-3 bg-brand-600/10 text-brand-500 hover:bg-brand-600 hover:text-white rounded-xl transition-all" title="Limpar Filtros"><FilterX size={18}/></button>
                                )}
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLessonPlans.map(plan => {
                                const type = getNormalizedType(plan.type);
                                const isProjectInova = type === 'inova';
                                return (
                                    <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-brand-600/30 transition-all flex flex-col relative overflow-hidden"><div className="flex justify-between items-start mb-6"><div className={`p-4 rounded-2xl ${isProjectInova ? 'bg-[#9D44FF]/10 text-[#9D44FF]' : 'bg-brand-600/10 text-brand-500'}`}>{isProjectInova ? <Sparkles size={24}/> : <BookOpen size={24}/>}</div><div className="text-right flex items-center gap-2"><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">{new Date(plan.createdAt).toLocaleDateString()}</span><button onClick={async () => { if(confirm("Excluir planejamento?")) await deleteLessonPlan(plan.id); }} className="text-gray-800 hover:text-red-500"><Trash2 size={16}/></button></div></div><h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{plan.className}</h3><p className="text-brand-500 font-black uppercase text-[10px] tracking-widest mb-6">{plan.subject} • {plan.teacherName}</p><div className="mt-auto flex gap-2"><button onClick={() => handleViewPlan(plan)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">Visualizar Completo</button><button onClick={() => handleEditPlan(plan)} className="p-4 bg-white/5 hover:bg-brand-600/10 text-gray-500 hover:text-brand-500 rounded-2xl transition-all border border-white/5" title="Editar Planejamento"><Edit size={18}/></button></div></div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'diagrammed_exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Provas Diagramadas</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Banco de provas criadas pelos professores</p>
                        </header>

                        {/* Teachers Status Section */}
                        <div className="mb-12">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                                <Users size={20} className="text-brand-500" />
                                Controle de Entregas
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teachersWithExams.map(teacher => (
                                    <div key={teacher.id} className="bg-[#18181b] border border-white/5 p-6 rounded-2xl flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white text-sm">{teacher.name}</h4>
                                            {teacher.hasExams ? (
                                                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <CheckCircle size={12} />
                                                    Entregue
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Clock size={12} />
                                                    Pendente
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {teacher.classes.map(c => (
                                                <span key={c} className="text-[10px] bg-white/5 px-2 py-1 rounded-md text-gray-400 border border-white/5">{c}</span>
                                            ))}
                                            {teacher.classes.length === 0 && <span className="text-[10px] text-gray-600 italic">Nenhuma turma registrada</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {diagrammedExams.map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-brand-600/30 transition-all flex flex-col relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 rounded-2xl bg-brand-600/10 text-brand-500">
                                            <FileCheck size={24}/>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">{new Date(exam.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{exam.title}</h3>
                                    <p className="text-brand-500 font-black uppercase text-[10px] tracking-widest mb-6">{exam.subject} • {exam.className}</p>
                                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-end">
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Prof. {exam.teacherName}</p>
                                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{exam.questions.length} Questões • {exam.bimester}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDownloadPDF(exam)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors border border-white/5 hover:border-white/20"
                                            title="Baixar PDF"
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {diagrammedExams.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                    <FileCheck size={64} className="mx-auto mb-4 text-gray-500" />
                                    <p className="font-black uppercase tracking-widest text-sm text-gray-500">Nenhuma prova diagramada encontrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Relatórios Específicos</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gere documentos detalhados para análise da coordenação.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Frequência por Turma */}
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex flex-col h-full">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 shrink-0">
                                        <FileBarChart size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Frequência por Turma</h3>
                                        <p className="text-gray-400 text-[10px] font-medium leading-tight">Relatório padrão com a frequência % de todos os alunos de uma turma.</p>
                                    </div>
                                </div>
                                
                                <div className="mt-auto space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-1 block">SELECIONE A TURMA:</label>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-brand-600 appearance-none"
                                            value={occFilterClass}
                                            onChange={e => setOccFilterClass(e.target.value)}
                                        >
                                            <option value="">-- Selecione --</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (!occFilterClass) return alert("Selecione uma turma");
                                            alert("Gerando PDF de Frequência para " + occFilterClass);
                                        }}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
                                    >
                                        Gerar PDF da Turma
                                    </button>
                                </div>
                            </div>

                            {/* Card 2: Relatório do Aluno */}
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex flex-col h-full">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
                                        <UserCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Relatório do Aluno</h3>
                                        <p className="text-gray-400 text-[10px] font-medium leading-tight">Extrato detalhado de presenças e faltas de um único aluno.</p>
                                    </div>
                                </div>
                                
                                <div className="mt-auto space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-1 block">SELECIONE O ALUNO:</label>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar aluno..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-brand-600 mb-2"
                                            value={occFilterStudent}
                                            onChange={e => setOccFilterStudent(e.target.value)}
                                        />
                                        {occFilterStudent && filteredStudents.length > 0 && (
                                            <div className="max-h-32 overflow-y-auto bg-black/60 rounded-xl border border-white/5 p-2 custom-scrollbar">
                                                {filteredStudents.slice(0, 5).map(s => (
                                                    <div key={s.id} className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-xs text-gray-300" onClick={() => setOccFilterStudent(s.name)}>
                                                        {s.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (!occFilterStudent) return alert("Selecione um aluno");
                                            alert("Gerando Relatório Individual para " + occFilterStudent);
                                        }}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
                                    >
                                        Gerar PDF Individual
                                    </button>
                                </div>
                            </div>

                            {/* Card 3: Relatório de Atrasos */}
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex flex-col h-full">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-4 rounded-2xl bg-yellow-500/10 text-yellow-500 shrink-0">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Relatório de Atrasos</h3>
                                        <p className="text-gray-400 text-[10px] font-medium leading-tight">Lista alunos que registraram presença após o horário limite.</p>
                                    </div>
                                </div>
                                
                                <div className="mt-auto space-y-4">
                                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
                                        <p className="text-[10px] text-gray-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> Manhã: Após <span className="text-red-400 font-bold">07:20</span></p>
                                        <p className="text-[10px] text-gray-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> Tarde: Após <span className="text-red-400 font-bold">13:00</span></p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            alert("Gerando Relatório de Atrasos...");
                                        }}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-red-900/20"
                                    >
                                        Gerar Relatório de Atrasos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
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
                                    <FileCheck size={20}/> Imprimir Ficha de Produção
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
                                            className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg"
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
                             <div className="space-y-4">
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nome Completo</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600 transition-all uppercase" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} /></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma Atual</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600 transition-all appearance-none" value={editingStudent.className} onChange={e => setEditingStudent({...editingStudent, className: e.target.value, classId: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                
                                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                                    <div className="flex items-center gap-3">
                                        <Heart size={18} className={editingStudent.isAEE ? 'text-red-500 fill-red-500/20' : 'text-gray-600'} />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atendimento AEE / Especial</span>
                                    </div>
                                    <button 
                                        onClick={() => setEditingStudent({...editingStudent, isAEE: !editingStudent.isAEE})}
                                        className={`w-12 h-6 rounded-full transition-all relative ${editingStudent.isAEE ? 'bg-red-600' : 'bg-gray-800'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingStudent.isAEE ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                             </div>
                             <div className="flex gap-4"><Button variant="outline" onClick={() => setShowStudentModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest border-2">Cancelar</Button><Button onClick={handleSaveStudentEdit} isLoading={isLoading} className="flex-1 h-16 bg-brand-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40"><Save size={20} className="mr-3"/> Salvar Alterações</Button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Plan Editing */}
            {showPlanEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#121214] border border-white/10 w-full max-w-6xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center">
                                    {planningTab === 'inova' ? <Sparkles className="text-purple-500" size={32} /> : <History className="text-red-600" size={32} />}
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Editar Planejamento</h3>
                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
                                        {planningTab === 'diario' ? 'Registro de Aula' : planningTab === 'bimestral' ? 'Guia de Aprendizagem' : 'Projeto Acadêmico'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowPlanEditModal(false)} className="text-gray-600 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Tipo</label>
                                    <div className="relative group">
                                        <select 
                                            className="w-full bg-black/40 border-2 border-red-600/30 rounded-2xl p-4 text-white font-black uppercase text-xs tracking-widest outline-none focus:border-red-600 transition-all appearance-none cursor-pointer shadow-inner"
                                            value={planningTab}
                                            onChange={(e) => setPlanningTab(e.target.value as any)}
                                        >
                                            <option value="diario">Diário</option>
                                            <option value="bimestral">Bimestral</option>
                                            <option value="inova">Projeto Inova</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-red-600/50 group-hover:text-red-600 transition-colors">
                                            <ChevronRight size={14} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label>
                                    <select required className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs transition-all" value={planForm.className} onChange={e => setPlanForm({...planForm, className: e.target.value})}>
                                        <option value="">Selecionar...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {(planningTab === 'diario' || planningTab === 'bimestral') && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label>
                                        <div className="relative group">
                                            <select 
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs transition-all cursor-pointer shadow-inner"
                                                value={planForm.subject}
                                                onChange={e => setPlanForm({...planForm, subject: e.target.value})}
                                            >
                                                <option value="">Selecionar...</option>
                                                {subjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <ChevronRight size={14} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {planningTab === 'bimestral' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Bimestre</label>
                                        <div className="relative group">
                                            <select 
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs transition-all cursor-pointer"
                                                value={planForm.bimester}
                                                onChange={e => setPlanForm({...planForm, bimester: e.target.value})}
                                            >
                                                <option value="1º BIMESTRE">1º BIMESTRE</option>
                                                <option value="2º BIMESTRE">2º BIMESTRE</option>
                                                <option value="3º BIMESTRE">3º BIMESTRE</option>
                                                <option value="4º BIMESTRE">4º BIMESTRE</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                <ChevronRight size={14} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(planningTab === 'diario') && (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Data da Aula</label>
                                        <input type="date" required className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 text-xs transition-all" value={planForm.date} onChange={e => setPlanForm({...planForm, date: e.target.value})} />
                                    </div>
                                )}
                            </div>

                            {planningTab === 'diario' && (
                                <>
                                    <div className="space-y-2 animate-in fade-in">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Assunto / Tema</label>
                                        <input required className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 text-xs transition-all" placeholder="Tema da aula..." value={planForm.topic} onChange={e => setPlanForm({...planForm, topic: e.target.value})} />
                                    </div>
                                    <div className="space-y-2 animate-in fade-in duration-500">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Conteúdo e Metodologia</label>
                                        <textarea required className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white text-sm min-h-[300px] focus:border-red-600 outline-none transition-all resize-none shadow-inner" placeholder="Descreva os objetivos e etapas da aula..." value={planForm.content} onChange={e => setPlanForm({...planForm, content: e.target.value})} />
                                    </div>
                                </>
                            )}

                            {planningTab === 'bimestral' && (
                                <div className="space-y-12 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Breve Justificativa</label>
                                            <textarea required className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.justification} onChange={e => setPlanForm({...planForm, justification: e.target.value})} placeholder="Descrição da importância pedagógica..."/>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Conteúdos Prioritários</label>
                                            <textarea required className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.contents} onChange={e => setPlanForm({...planForm, contents: e.target.value})} placeholder="Descrição dos conteúdos centrais..."/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Habilidades Cognitivas</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.cognitiveSkills} onChange={e => setPlanForm({...planForm, cognitiveSkills: e.target.value})} placeholder="Quais habilidades mentais serão trabalhadas?"/>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Habilidades Socioemocionais</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.socioEmotionalSkills} onChange={e => setPlanForm({...planForm, socioEmotionalSkills: e.target.value})} placeholder="Soft skills e inteligência emocional..."/>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3 border-b border-white/5 pb-4"><CheckSquare size={18} className="text-red-500"/> Tipologia de Atividades</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            {[{ key: 'Previous', label: 'Prévias' }, { key: 'Autodidactic', label: 'Autodidáticas' }, { key: 'Cooperative', label: 'Cooperativas' }, { key: 'Complementary', label: 'Complementares' }].map(item => (
                                                <div key={item.key} className="space-y-3">
                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] block text-center">{item.label}</span>
                                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs min-h-[150px] focus:border-red-600 outline-none" value={(planForm as any)[`activities${item.key}`]} onChange={e => setPlanForm({...planForm, [`activities${item.key}`]: e.target.value})} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Situações Didáticas</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.didacticSituations} onChange={e => setPlanForm({...planForm, didacticSituations: e.target.value})} placeholder="Descrição do cenário de aprendizagem..."/>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Estratégias de Avaliação</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.evaluationStrategies} onChange={e => setPlanForm({...planForm, evaluationStrategies: e.target.value})} placeholder="Como o progresso será medido?"/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Práticas Educativas</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.educationalPractices} onChange={e => setPlanForm({...planForm, educationalPractices: e.target.value})} placeholder="Quais práticas serão utilizadas?"/>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Espaços Educativos</label>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[120px] focus:border-red-600 outline-none" value={planForm.educationalSpaces} onChange={e => setPlanForm({...planForm, educationalSpaces: e.target.value})} placeholder="Onde as atividades ocorrerão?"/>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {planningTab === 'inova' && (
                                <div className="space-y-12 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-2 flex items-center gap-2"><Rocket size={14}/> 1. Tema do Subprojeto</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-purple-600" value={planForm.inovaTheme} onChange={e => setPlanForm({...planForm, inovaTheme: e.target.value})} placeholder="Título criativo do projeto..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-2 flex items-center gap-2"><Lightbulb size={14}/> 2. Questão Norteadora</label>
                                                <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[100px] focus:border-purple-600 outline-none" value={planForm.guidingQuestion} onChange={e => setPlanForm({...planForm, guidingQuestion: e.target.value})} placeholder="Que problema real vamos investigar e melhorar?" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-2 flex items-center gap-2"><Target size={14}/> 3. Objetivo Geral do Subprojeto</label>
                                                <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[100px] focus:border-purple-600 outline-none" value={planForm.subprojectGoal} onChange={e => setPlanForm({...planForm, subprojectGoal: e.target.value})} placeholder="Ao final, os alunos serão capazes de...?" />
                                            </div>
                                        </div>
                                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-[2.5rem] p-8">
                                            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-3"><Sparkles size={18}/> 4. Resultados Esperados</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {["Consciência ambiental/consumo responsável", "Criatividade e autoria (criar algo)", "Colaboração e protagonismo", "Comunicação (apresentar/explicar)", "Investigação (observação/pesquisa/dados)", "Uso responsável de tecnologia/IA"].map(res => (
                                                    <label key={res} className="flex items-center gap-4 cursor-pointer group">
                                                        <input type="checkbox" className="hidden" checked={planForm.expectedResults?.includes(res)} onChange={() => { const current = planForm.expectedResults || []; const updated = current.includes(res) ? current.filter(r => r !== res) : [...current, res]; setPlanForm({...planForm, expectedResults: updated}); }} />
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${planForm.expectedResults?.includes(res) ? 'bg-purple-600 border-purple-500 shadow-lg' : 'border-white/10 group-hover:border-purple-600'}`}>
                                                            {planForm.expectedResults?.includes(res) && <Check size={14} className="text-white"/>}
                                                        </div>
                                                        <span className={`text-[11px] font-bold uppercase tracking-tight transition-colors ${planForm.expectedResults?.includes(res) ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{res}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3"><Box size={18} className="text-purple-500"/> 5. Produto Final</h4>
                                            <div className="grid grid-cols-1 gap-2 mb-4">
                                                {["Painel/Cartaz", "Maquete Digital/Protótipo", "Experimento", "Podcast/Vídeo", "Campanha/Intervenção", "Seminário", "Outro"].map(prod => (
                                                    <label key={prod} className="flex items-center gap-3 cursor-pointer">
                                                        <input type="radio" className="hidden" name="productType" checked={planForm.finalProductType === prod} onChange={() => setPlanForm({...planForm, finalProductType: prod})} />
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${planForm.finalProductType === prod ? 'bg-purple-600 border-purple-500' : 'border-white/20'}`}>
                                                            {planForm.finalProductType === prod && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase text-gray-500">{prod}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm min-h-[80px] focus:border-purple-600 outline-none" value={planForm.finalProductDescription} onChange={e => setPlanForm({...planForm, finalProductDescription: e.target.value})} placeholder="Descrição do produto final..." />
                                        </div>
                                        <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3"><Layers size={18} className="text-purple-500"/> 6. Etapas do Projeto</h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                {[{ key: 'sensitize', label: '1. Sensibilizar' }, { key: 'investigate', label: '2. Investigar' }, { key: 'create', label: '3. Criar' }, { key: 'test', label: '4. Testar e melhorar' }, { key: 'present', label: '5. Apresentar' }, { key: 'register', label: '6. Registrar' }].map(step => (
                                                    <label key={step.key} className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="hidden" checked={planForm.projectSteps?.[step.key as keyof typeof planForm.projectSteps]} onChange={() => { const steps = planForm.projectSteps || { sensitize: false, investigate: false, create: false, test: false, present: false, register: false }; setPlanForm({...planForm, projectSteps: { ...steps, [step.key]: !steps[step.key as keyof typeof steps] }}); }} />
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${planForm.projectSteps?.[step.key as keyof typeof planForm.projectSteps] ? 'bg-purple-600 border-purple-500' : 'border-white/20'}`}>
                                                            {planForm.projectSteps?.[step.key as keyof typeof planForm.projectSteps] && <Check size={12} className="text-white"/>}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-gray-300">{step.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3 border-b border-white/5 pb-6"><Cpu size={20} className="text-purple-500"/> 9. Uso de IA</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Ferramenta(s)</label>
                                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs min-h-[120px] focus:border-purple-600 outline-none" value={planForm.aiTools} onChange={e => setPlanForm({...planForm, aiTools: e.target.value})} placeholder="Ex: Gemini, ChatGPT..."/>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest ml-1">Cuidado adotado</label>
                                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs min-h-[120px] focus:border-purple-600 outline-none" value={planForm.aiCare} onChange={e => setPlanForm({...planForm, aiCare: e.target.value})} placeholder="Ética, curadoria..."/>
                                            </div>
                                            <div className="bg-purple-900/5 p-6 rounded-2xl border border-purple-500/10">
                                                <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-4 block">Objetivo IA</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {["Ideias", "Roteiro", "Texto", "Imagem", "Vídeo", "Dados/gráficos"].map(purp => (
                                                        <label key={purp} className="flex items-center gap-3 cursor-pointer">
                                                            <input type="checkbox" className="hidden" checked={planForm.aiPurpose?.includes(purp)} onChange={() => { const current = planForm.aiPurpose || []; const updated = current.includes(purp) ? current.filter(p => p !== purp) : [...current, purp]; setPlanForm({...planForm, aiPurpose: updated}); }} />
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${planForm.aiPurpose?.includes(purp) ? 'bg-purple-600 border-purple-500' : 'border-white/10'}`}>
                                                                {planForm.aiPurpose?.includes(purp) && <Check size={10} className="text-white"/>}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">{purp}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-8 border-t border-white/5 flex justify-end gap-4">
                                <Button type="button" onClick={() => setShowPlanEditModal(false)} className="px-8 h-16 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em]">Cancelar</Button>
                                <Button type="submit" isLoading={isLoading} className="px-12 h-16 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-900/40">Salvar Alterações</Button>
                            </div>
                        </form>
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
                            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={scheduleFormData.subject} onChange={e => setScheduleFormData({...scheduleFormData, subject: e.target.value})}><option value="">Selecione...</option>{allSubjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}</select></div>
                            <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Professor</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={scheduleFormData.professor} onChange={e => setScheduleFormData({...scheduleFormData, professor: e.target.value})}><option value="">Selecione...</option>{staffMembers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                            <div className="flex gap-4">{scheduleFormData.id && (<button onClick={handleDeleteSchedule} className="h-16 w-16 bg-white/5 hover:bg-red-600/10 text-gray-600 hover:text-red-500 rounded-2xl border border-white/5 flex items-center justify-center transition-all"><Trash2 size={24}/></button>)}<Button onClick={handleSaveSchedule} isLoading={isLoading} className="flex-1 h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40"><Save size={20} className="mr-3"/> Salvar</Button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Occurrence Details */}
            {showOccurrenceModal && selectedOccurrence && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Detalhes da Ocorrência</h3>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">{new Date(selectedOccurrence.timestamp).toLocaleDateString()} • {selectedOccurrence.studentClass}</p>
                            </div>
                            <button onClick={() => setShowOccurrenceModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Aluno</p>
                                <p className="text-white font-bold text-lg">{selectedOccurrence.studentName}</p>
                            </div>
                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Relatado por</p>
                                <p className="text-brand-500 font-bold text-lg">{selectedOccurrence.reportedBy}</p>
                            </div>
                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Descrição do Fato</p>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">{selectedOccurrence.description}</p>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => setShowOccurrenceModal(false)} className="h-16 px-8 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest border border-white/10">Fechar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};