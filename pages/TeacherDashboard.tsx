
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, saveExam, uploadExamFile,
    getClassMaterials, saveClassMaterial, deleteClassMaterial, uploadClassMaterial,
    getLessonPlans, saveLessonPlan, deleteLessonPlan, listenToTeacherLessonPlans,
    listenToOccurrences, saveOccurrence, deleteOccurrence,
    listenToStudents,
    listenToGradebook, saveGradebook,
    getAllPEIs,
    logAttendance,
    savePEIDocument,
    updateExamStatus,
    uploadQuestionImage,
    saveDiagrammedExam
} from '../services/firebaseService';
import { 
    ExamRequest, ExamStatus, ClassMaterial, LessonPlan, 
    StudentOccurrence, Student, GradebookEntry, PEIDocument, AttendanceLog,
    AV1Activity, DiagrammedExam, ExamQuestion, QuestionAlternative
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Plus, Eye, UploadCloud, X, 
    CheckCircle, Clock, Hourglass, ClipboardCheck, FileText,
    List, PlusCircle, Folder, BookOpen, Calculator, Heart, AlertCircle, CalendarClock,
    Trash2, Save, Search, UserCheck, UserX, Download, BrainCircuit, Layout, Sparkles, ChevronRight,
    Edit3, Info, FolderPlus, Smile, AlertTriangle, Calendar as CalendarIcon, FileDown, FileUp, Upload, MousePointerClick, Users, ShieldAlert, FileCheck,
    BookMarked, History, Target, Cpu, CheckSquare, Layers, Rocket, Lightbulb, Box, Check, Briefcase, Camera, PackageCheck, LayoutTemplate, Image as ImageIcon
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS, INFANTIL_CLASSES, EFAI_CLASSES } from '../constants';

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

export const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'send_to_print' | 'materials' | 'planning' | 'gradebook' | 'pei' | 'occurrences' | 'attendance' | 'diagramming'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    
    // Planning Sub-tab state
    const [planningTab, setPlanningTab] = useState<'diario' | 'bimestral' | 'inova'>('inova');
    const [showPlanningModal, setShowPlanningModal] = useState(false);

    // Data Collections
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [occurrences, setOccurrences] = useState<StudentOccurrence[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [gradebookData, setGradebookData] = useState<GradebookEntry | null>(null);
    const [peis, setPeis] = useState<PEIDocument[]>([]);

    // Shared UI State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(''); 
    const [selectedBimester, setSelectedBimester] = useState('1º BIMESTRE');

    // Attendance State
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

    // Forms State
    const [examForm, setExamForm] = useState({ title: '', quantity: 25, gradeLevel: '', instructions: '' });
    const [examFiles, setExamFiles] = useState<File[]>([]);
    
    // Planning Form State
    const [planForm, setPlanForm] = useState<Partial<LessonPlan>>({
        type: 'inova',
        className: '',
        subject: '',
        bimester: '1º BIMESTRE',
        date: new Date().toISOString().split('T')[0],
        topic: '',
        content: '',
        // Bimestral fields
        justification: '',
        contents: '',
        cognitiveSkills: '',
        socioEmotionalSkills: '',
        didacticSituations: '',
        activitiesPrevious: '',
        activitiesAutodidactic: '',
        activitiesCooperative: '',
        activitiesComplementary: '',
        educationalPractices: '',
        educationalSpaces: '',
        didacticResources: '',
        evaluationStrategies: '',
        referenceSources: '',
        // Inova fields
        inovaTheme: '',
        guidingQuestion: '',
        subprojectGoal: '',
        expectedResults: [],
        finalProductType: '',
        finalProductDescription: '',
        projectSteps: { sensitize: false, investigate: false, create: false, test: false, present: false, register: false },
        schedule: '',
        resourcesNeeded: '',
        aiTools: '',
        aiPurpose: [],
        aiCare: '',
        evidence: []
    });

    // Diagramming State
    const [diagramForm, setDiagramForm] = useState<Partial<DiagrammedExam>>({
        className: '',
        subject: '',
        bimester: '1º BIMESTRE',
        title: '',
        questions: []
    });

    const generateQuestionsForClass = (className: string) => {
        const isLowerGrade = [...INFANTIL_CLASSES, ...EFAI_CLASSES].includes(className);
        const numObjective = isLowerGrade ? 5 : 7;
        
        return Array.from({ length: 10 }).map((_, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            number: i + 1,
            type: (i < numObjective ? 'objective' : 'discursive') as 'objective' | 'discursive',
            skill: '',
            statement: '',
            alternatives: i < numObjective ? ['A', 'B', 'C', 'D', 'E'].map(l => ({ id: Math.random().toString(36).substr(2, 9), label: l, text: '', isCorrect: false })) : undefined,
            lines: 5
        }));
    };

    // Material Form State
    const [materialForm, setMaterialForm] = useState({ title: '', className: '', subject: '' });
    const [materialFile, setMaterialFile] = useState<File | null>(null);

    // Occurrences Form State
    const [showOccModal, setShowOccModal] = useState(false);
    const [isEditingOcc, setIsEditingOcc] = useState(false);
    const [occForm, setOccForm] = useState<Partial<StudentOccurrence>>({
        studentId: '',
        category: 'indisciplina',
        severity: 'low',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [occSelectedClass, setOccSelectedClass] = useState('');

    // PEI Modal State
    const [showPeiForm, setShowPeiForm] = useState(false);
    const [currentPeiStudent, setCurrentPeiStudent] = useState<Student | null>(null);
    const [peiData, setPeiData] = useState<Partial<PEIDocument>>({
        essentialCompetencies: '',
        selectedContents: '',
        didacticResources: '',
        evaluation: '',
        period: '1º BIMESTRE'
    });

    // Gradebook AV1 Config
    const [showAV1Modal, setShowAV1Modal] = useState(false);
    const [newAV1, setNewAV1] = useState<Partial<AV1Activity>>({ activityName: '', applicationDate: '', deliveryDate: '', maxScore: 2, location: 'SALA' });

    // Initial Load
    useEffect(() => {
        if (!user) return;
        listenToStudents(setStudents);
    }, [user]);

    // Listener de planejamentos em tempo real
    useEffect(() => {
        if (!user || activeTab !== 'planning') return;
        const unsubscribe = listenToTeacherLessonPlans(user.id, user.name, (data) => {
            const sortedData = data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setPlans(sortedData);
        });
        return () => unsubscribe();
    }, [user, activeTab]);

    useEffect(() => {
        if (examForm.gradeLevel && students.length > 0) {
            const count = students.filter(s => s.className === examForm.gradeLevel).length;
            if (count > 0) {
                setExamForm(prev => ({ ...prev, quantity: count }));
            }
        }
    }, [examForm.gradeLevel, students]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            if (activeTab === 'exams') setExams(await getExams(user.id));
            if (activeTab === 'materials') setMaterials(await getClassMaterials(user.id));
            if (activeTab === 'occurrences') {
                listenToOccurrences((data) => setOccurrences(data.filter(o => o.reportedBy === user.name)));
            }
            if (activeTab === 'pei') {
                const all = await getAllPEIs();
                setPeis(all);
            }
        };
        loadData();
    }, [user, activeTab]);

    useEffect(() => {
        if (activeTab === 'gradebook' && selectedClass && selectedSubject) {
            return listenToGradebook(selectedClass, selectedSubject, selectedBimester, setGradebookData);
        }
    }, [activeTab, selectedClass, selectedSubject, selectedBimester]);

    const myClasses = useMemo(() => {
        if (user?.email === 'ruan.wss@gmail.com') return CLASSES; 
        return user?.classes && user.classes.length > 0 ? user.classes : CLASSES;
    }, [user]);

    const totalAV1Max = useMemo(() => {
        if (!gradebookData || !gradebookData.av1Config) return 0;
        return gradebookData.av1Config.reduce((acc, curr) => acc + (curr.maxScore || 0), 0);
    }, [gradebookData]);

    const monitoredStudents = useMemo(() => {
        const teacherClasses = new Set(user?.classes || []);
        return students.filter(s => s.isAEE && (teacherClasses.has(s.className) || user?.email === 'ruan.wss@gmail.com'));
    }, [students, user]);

    // Fallback for older plans: if type is missing, treat as 'diario'
    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            const type = p.type || 'diario';
            return type === planningTab;
        });
    }, [plans, planningTab]);

    // --- HANDLERS ---

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const planToSave: LessonPlan = {
                ...planForm,
                id: planForm.id || '',
                teacherId: user!.id,
                teacherName: user!.name,
                createdAt: planForm.createdAt || Date.now(),
                type: planningTab, 
                className: planForm.className || '',
                subject: planForm.subject || user!.subject || 'Geral',
            } as LessonPlan;
            await saveLessonPlan(planToSave);
            alert("Planejamento salvo com sucesso!");
            setShowPlanningModal(false);
        } catch (err) {
            alert("Erro ao salvar planejamento.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditPlan = (plan: LessonPlan) => {
        setPlanForm({ ...plan });
        if (plan.type) {
            setPlanningTab(plan.type as any);
        } else {
            setPlanningTab('diario'); 
        }
        setShowPlanningModal(true);
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("Deseja realmente excluir este planejamento?")) return;
        try {
            await deleteLessonPlan(id);
            alert("Planejamento excluído!");
        } catch (err) {
            alert("Erro ao excluir planejamento.");
        }
    };

    const handleExamSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (examFiles.length === 0) return alert("Por favor, anexe ao menos um arquivo.");
        setIsLoading(true);
        try {
            const fileUrls: string[] = [];
            const fileNames: string[] = [];
            for (const f of examFiles) {
                const url = await uploadExamFile(f, user?.name || 'teacher');
                fileUrls.push(url);
                fileNames.push(f.name);
            }
            await saveExam({
                id: '', teacherId: user!.id, teacherName: user!.name, subject: user!.subject || 'Geral',
                title: examForm.title, quantity: examForm.quantity, gradeLevel: examForm.gradeLevel,
                instructions: examForm.instructions, fileNames, fileUrls, status: ExamStatus.PENDING,
                createdAt: Date.now(), dueDate: new Date(Date.now() + 7*24*60*1000).toISOString()
            });
            alert("Solicitação enviada para a gráfica!");
            setExamForm({ title: '', quantity: 25, gradeLevel: '', instructions: '' });
            setExamFiles([]);
            setActiveTab('exams');
            setExams(await getExams(user!.id));
        } catch (e) { alert("Erro ao enviar."); } finally { setIsLoading(false); }
    };

    const handleConfirmReceipt = async (examId: string) => {
        if (!confirm("Confirmar que você já retirou as provas físicas na central?")) return;
        setIsLoading(true);
        try {
            await updateExamStatus(examId, ExamStatus.COMPLETED);
            setExams(await getExams(user!.id));
        } catch (e) {
            alert("Erro ao confirmar recebimento.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMaterialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!materialFile) return alert("Anexe um arquivo.");
        setIsLoading(true);
        try {
            const url = await uploadClassMaterial(materialFile, materialForm.className);
            await saveClassMaterial({
                id: '',
                teacherId: user!.id,
                teacherName: user!.name,
                className: materialForm.className,
                title: materialForm.title,
                subject: materialForm.subject,
                fileUrl: url,
                fileName: materialFile.name,
                fileType: materialFile.type,
                createdAt: Date.now()
            });
            alert("Material publicado!");
            setMaterialForm({ title: '', className: '', subject: '' });
            setMaterialFile(null);
            setMaterials(await getClassMaterials(user!.id));
        } catch (e) { alert("Erro ao publicar."); } finally { setIsLoading(false); }
    };

    const handleGradeUpdate = async (studentId: string, activityId: string, val: number, isAV1 = false) => {
        let currentData = gradebookData;
        
        if (!currentData) {
            currentData = {
                id: '',
                className: selectedClass,
                subject: selectedSubject,
                bimester: selectedBimester,
                av1Config: [],
                grades: {},
                updatedAt: Date.now()
            };
        }

        let finalValue = val;
        if (isAV1) {
            const config = currentData.av1Config.find(a => a.id === activityId);
            if (config && val > config.maxScore) {
                finalValue = config.maxScore;
            }
        } else if (activityId === 'av2' || activityId === 'av3') {
            if (val > 10) finalValue = 10;
        }

        if (finalValue < 0) finalValue = 0;

        const updatedGrades = { ...currentData.grades };
        if (!updatedGrades[studentId]) updatedGrades[studentId] = { av1: {} };
        
        if (isAV1) updatedGrades[studentId].av1[activityId] = finalValue;
        else (updatedGrades[studentId] as any)[activityId] = finalValue;

        await saveGradebook({ ...currentData, grades: updatedGrades });
    };

    const handleAddAV1 = async () => {
        if (!newAV1.activityName) return;
        
        const currentAv1Config = gradebookData?.av1Config || [];

        if (currentAv1Config.length >= 7) {
            return alert("Limite de 7 colunas para AV1 atingido.");
        }

        let score = Number(newAV1.maxScore);
        if (score > 2) score = 2; // Enforce max 2

        if (totalAV1Max + score > 10.1) {
            return alert("A soma das atividades AV1 não pode ultrapassar 10.0.");
        }

        const activity: AV1Activity = { 
            id: Math.random().toString(36).substr(2, 9), 
            activityName: newAV1.activityName,
            applicationDate: newAV1.applicationDate || 'Não informada',
            deliveryDate: newAV1.deliveryDate || 'Não informada',
            maxScore: score,
            location: newAV1.location || 'SALA'
        };
        
        const updatedConfig = [...currentAv1Config, activity];
        
        const gradebookToSave: GradebookEntry = gradebookData 
            ? { ...gradebookData, av1Config: updatedConfig }
            : {
                id: '',
                className: selectedClass,
                subject: selectedSubject,
                bimester: selectedBimester,
                av1Config: updatedConfig,
                grades: {},
                updatedAt: Date.now()
            };

        await saveGradebook(gradebookToSave);
        setShowAV1Modal(false);
        setNewAV1({ activityName: '', maxScore: 2, applicationDate: '', deliveryDate: '', location: 'SALA' });
    };

    const handleSavePei = async () => {
        if (!currentPeiStudent || !user) return;
        setIsLoading(true);
        try {
            await savePEIDocument({
                id: '',
                studentId: currentPeiStudent.id,
                studentName: currentPeiStudent.name,
                teacherId: user.id,
                teacherName: user.name,
                subject: user.subject || 'Geral',
                period: peiData.period || '1º BIMESTRE',
                essentialCompetencies: peiData.essentialCompetencies || '',
                selectedContents: peiData.selectedContents || '',
                didacticResources: peiData.didacticResources || '',
                evaluation: peiData.evaluation || '',
                updatedAt: Date.now()
            });
            alert("PEI salvo com sucesso!");
            setShowPeiForm(false);
            setPeiData({ essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: '', period: '1º BIMESTRE' });
        } catch (e) {
            alert("Erro ao salvar PEI.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAttendanceSubmit = async () => {
        if (!selectedClass) return alert("Selecione uma turma.");
        if (!attendanceDate) return alert("Selecione uma data.");
        setIsLoading(true);
        try {
            const dateString = attendanceDate;
            const parts = dateString.split('-');
            if (parts.length < 3) throw new Error("Data inválida");
            
            const [y, m, d] = parts.map(Number);
            const timestamp = new Date(y, m - 1, d, 12, 0, 0).getTime();

            const classStudents = students.filter(s => s.className === selectedClass);
            
            for (const student of classStudents) {
                if (attendanceRecords[student.id] !== undefined) {
                    await logAttendance({
                        id: '',
                        studentId: student.id,
                        studentName: student.name,
                        className: student.className,
                        timestamp: timestamp,
                        dateString,
                        type: attendanceRecords[student.id] ? 'entry' : 'exit'
                    });
                }
            }
            alert("Chamada registrada com sucesso!");
            setAttendanceRecords({});
        } catch (e) {
            alert("Erro ao salvar frequência.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- DOWNLOAD HEADERS ---
    const handleDownloadHeader = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- OCCURRENCES LOGIC ---
    const openOccModal = (occ?: StudentOccurrence) => {
        if (occ) {
            setIsEditingOcc(true);
            setOccForm(occ);
            const student = students.find(s => s.id === occ.studentId);
            setOccSelectedClass(student?.className || '');
        } else {
            setIsEditingOcc(false);
            setOccForm({
                studentId: '',
                category: 'indisciplina',
                severity: 'low',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
            setOccSelectedClass('');
        }
        setShowOccModal(true);
    };

    const handleSaveOccurrence = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!occForm.studentId || !occForm.description) return alert("Preencha todos os campos.");
        
        setIsLoading(true);
        try {
            const student = students.find(s => s.id === occForm.studentId);
            const dataToSave: StudentOccurrence = {
                id: occForm.id || '',
                studentId: student!.id,
                studentName: student!.name,
                studentClass: student!.className,
                category: occForm.category as any,
                severity: occForm.severity as any,
                description: occForm.description!,
                date: occForm.date!,
                timestamp: occForm.timestamp || Date.now(),
                reportedBy: user!.name
            };

            await saveOccurrence(dataToSave);
            setShowOccModal(false);
            alert(isEditingOcc ? "Ocorrência atualizada!" : "Ocorrência registrada!");
        } catch (err) {
            alert("Erro ao salvar ocorrência.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteOccurrence = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta ocorrência?")) return;
        try {
            await deleteOccurrence(id);
            alert("Ocorrência removida.");
        } catch (err) {
            alert("Erro ao excluir.");
        }
    };

    // --- DIAGRAMMING HANDLERS ---
    const handleDiagramImageUpload = async (file: File, questionIndex: number, altIndex?: number) => {
        if (!file) return;
        setIsLoading(true);
        try {
            const url = await uploadQuestionImage(file);
            const updatedQuestions = [...(diagramForm.questions || [])];
            
            if (altIndex !== undefined && updatedQuestions[questionIndex].alternatives) {
                updatedQuestions[questionIndex].alternatives![altIndex].imageUrl = url;
            } else {
                updatedQuestions[questionIndex].headerImage = url;
            }
            
            setDiagramForm({ ...diagramForm, questions: updatedQuestions });
        } catch (e) {
            alert("Erro ao enviar imagem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDiagram = async () => {
        if (!diagramForm.title || !diagramForm.className || !diagramForm.subject) return alert("Preencha as informações básicas.");
        
        // Validate skills
        const missingSkills = diagramForm.questions?.some(q => !q.skill);
        if (missingSkills) return alert("Preencha a habilidade de todas as questões.");

        setIsLoading(true);
        try {
            await saveDiagrammedExam({
                ...diagramForm,
                id: diagramForm.id || '',
                teacherId: user!.id,
                teacherName: user!.name,
                className: diagramForm.className!,
                subject: diagramForm.subject!,
                bimester: diagramForm.bimester!,
                title: diagramForm.title!,
                questions: diagramForm.questions as ExamQuestion[],
                createdAt: Date.now(),
                updatedAt: Date.now()
            } as DiagrammedExam);
            
            alert("Prova salva com sucesso!");
            setDiagramForm({
                className: '',
                subject: '',
                bimester: '1º BIMESTRE',
                title: '',
                questions: Array.from({ length: 10 }).map((_, i) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    number: i + 1,
                    type: i < 7 ? 'objective' : 'discursive',
                    skill: '',
                    statement: '',
                    alternatives: i < 7 ? ['A', 'B', 'C', 'D', 'E'].map(l => ({ id: Math.random().toString(36).substr(2, 9), label: l, text: '', isCorrect: false })) : undefined,
                    lines: 5
                }))
            });
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon size={18} /> {label}
        </button>
    );

    const subjects = Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS]));

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
            <aside className="w-64 bg-[#18181b] border-r border-white/5 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-8 pl-4"><p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Menu Professor</p></div>
                <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    <SidebarItem id="exams" label="Fila da Gráfica" icon={List} />
                    <SidebarItem id="send_to_print" label="Envio para Gráfica" icon={PlusCircle} />
                    <SidebarItem id="diagramming" label="Diagramação" icon={LayoutTemplate} />
                    <SidebarItem id="materials" label="Materiais de Aula" icon={Folder} />
                    <SidebarItem id="planning" label="Planejamentos" icon={BookOpen} />
                    <SidebarItem id="gradebook" label="Diário de Classe" icon={Calculator} />
                    <SidebarItem id="pei" label="PEI / AEE" icon={Heart} />
                    <SidebarItem id="occurrences" label="Ocorrências" icon={AlertCircle} />
                    <SidebarItem id="attendance" label="Frequência" icon={CalendarClock} />
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'diagramming' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto space-y-12 pb-40">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Diagramação de Provas</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Criação padronizada de avaliações (7 Objetivas + 3 Discursivas)</p>
                            </div>
                            <Button onClick={handleSaveDiagram} isLoading={isLoading} className="bg-red-600 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                <Save size={18} className="mr-3"/> Salvar Prova
                            </Button>
                        </header>

                        <div className="bg-[#18181b] border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs" 
                                        value={diagramForm.className} 
                                        onChange={e => {
                                            const newClass = e.target.value;
                                            setDiagramForm({
                                                ...diagramForm, 
                                                className: newClass,
                                                questions: generateQuestionsForClass(newClass)
                                            });
                                        }}
                                    >
                                        <option value="">Selecione...</option>
                                        {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs" value={diagramForm.subject} onChange={e => setDiagramForm({...diagramForm, subject: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {subjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Bimestre</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none text-xs" value={diagramForm.bimester} onChange={e => setDiagramForm({...diagramForm, bimester: e.target.value})}>
                                        <option>1º BIMESTRE</option>
                                        <option>2º BIMESTRE</option>
                                        <option>3º BIMESTRE</option>
                                        <option>4º BIMESTRE</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título da Prova</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 text-xs" placeholder="EX: AVALIAÇÃO MENSAL" value={diagramForm.title} onChange={e => setDiagramForm({...diagramForm, title: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {diagramForm.questions?.map((q, idx) => (
                                <div key={q.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 bg-white/5 px-6 py-2 rounded-br-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-r border-white/5">
                                        Questão {q.number} • {q.type === 'objective' ? 'Objetiva' : 'Discursiva'}
                                    </div>
                                    
                                    <div className="mt-8 space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Habilidade (BNCC/Matriz)</label>
                                            <input 
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium text-xs outline-none focus:border-red-600" 
                                                placeholder="Código ou descrição da habilidade..."
                                                value={q.skill}
                                                onChange={e => {
                                                    const updated = [...(diagramForm.questions || [])];
                                                    updated[idx].skill = e.target.value;
                                                    setDiagramForm({ ...diagramForm, questions: updated });
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">Enunciado <ImageIcon size={14} className="text-blue-500"/></label>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <textarea 
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[100px]"
                                                        placeholder="Digite o enunciado da questão..."
                                                        value={q.statement}
                                                        onChange={e => {
                                                            const updated = [...(diagramForm.questions || [])];
                                                            updated[idx].statement = e.target.value;
                                                            setDiagramForm({ ...diagramForm, questions: updated });
                                                        }}
                                                    />
                                                </div>
                                                <div className="w-32 shrink-0">
                                                    <label className="block w-full h-full bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-600 transition-all relative overflow-hidden group">
                                                        {q.headerImage ? (
                                                            <img src={q.headerImage} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                        ) : (
                                                            <>
                                                                <UploadCloud size={24} className="text-gray-600 group-hover:text-red-600 mb-2"/>
                                                                <span className="text-[8px] font-black uppercase text-gray-600">Imagem</span>
                                                            </>
                                                        )}
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && handleDiagramImageUpload(e.target.files[0], idx)} />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {q.type === 'objective' && (
                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                {q.alternatives?.map((alt, altIdx) => (
                                                    <div key={alt.id} className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-gray-500 text-xs shrink-0">{alt.label}</div>
                                                        <input 
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-600"
                                                            placeholder={`Alternativa ${alt.label}`}
                                                            value={alt.text}
                                                            onChange={e => {
                                                                const updated = [...(diagramForm.questions || [])];
                                                                updated[idx].alternatives![altIdx].text = e.target.value;
                                                                setDiagramForm({ ...diagramForm, questions: updated });
                                                            }}
                                                        />
                                                        <label className="w-10 h-10 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-600 relative overflow-hidden">
                                                            {alt.imageUrl ? <img src={alt.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-gray-600"/>}
                                                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && handleDiagramImageUpload(e.target.files[0], idx, altIdx)} />
                                                        </label>
                                                        <div 
                                                            onClick={() => {
                                                                const updated = [...(diagramForm.questions || [])];
                                                                updated[idx].alternatives!.forEach(a => a.isCorrect = false);
                                                                updated[idx].alternatives![altIdx].isCorrect = true;
                                                                setDiagramForm({ ...diagramForm, questions: updated });
                                                            }}
                                                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${alt.isCorrect ? 'bg-green-600 border-green-600 text-white' : 'border-white/10 text-gray-700 hover:border-green-600'}`}
                                                        >
                                                            <Check size={16}/>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === 'discursive' && (
                                            <div className="pt-4 border-t border-white/5">
                                                <div className="bg-white/5 p-4 rounded-2xl flex flex-col gap-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <div key={i} className="w-full h-px bg-white/10"></div>
                                                    ))}
                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-center mt-2">Espaço para resposta do aluno</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'planning' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-start">
                            <div>
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Planejamentos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Gestão de conteúdos e projetos acadêmicos</p>
                            </div>
                            <Button 
                                onClick={() => {
                                    setPlanForm({ 
                                        id: '', // Explicitly clear ID for new entry
                                        type: planningTab, 
                                        className: '', 
                                        subject: user?.subject || '', 
                                        bimester: '1º BIMESTRE',
                                        date: new Date().toISOString().split('T')[0],
                                        topic: '',
                                        content: '',
                                        justification: '',
                                        contents: '',
                                        cognitiveSkills: '',
                                        socioEmotionalSkills: '',
                                        didacticSituations: '',
                                        evaluationStrategies: '',
                                        didacticResources: '',
                                        referenceSources: '',
                                        inovaTheme: '',
                                        guidingQuestion: '',
                                        subprojectGoal: '',
                                        expectedResults: [],
                                        finalProductType: '',
                                        finalProductDescription: '',
                                        projectSteps: { sensitize: false, investigate: false, create: false, test: false, present: false, register: false },
                                        schedule: '',
                                        resourcesNeeded: '',
                                        aiTools: '',
                                        aiPurpose: [],
                                        aiCare: '',
                                        evidence: []
                                    });
                                    setShowPlanningModal(true);
                                }} 
                                className="bg-[#E53935] hover:bg-red-700 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-950/40"
                            >
                                <Plus size={18} className="mr-3"/> Novo Planejamento
                            </Button>
                        </header>

                        <div className="bg-[#18181b]/50 border border-white/5 rounded-3xl p-1.5 flex w-fit mb-12 shadow-2xl">
                            <button 
                                onClick={() => setPlanningTab('diario')}
                                className={`flex items-center gap-3 px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${planningTab === 'diario' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <History size={16} /> Diário
                            </button>
                            <button 
                                onClick={() => setPlanningTab('bimestral')}
                                className={`flex items-center gap-3 px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${planningTab === 'bimestral' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <BookMarked size={16} /> Bimestral
                            </button>
                            <button 
                                onClick={() => setPlanningTab('inova')}
                                className={`flex items-center gap-3 px-10 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${planningTab === 'inova' ? 'bg-[#9D44FF] text-white shadow-[0_0_30px_rgba(157,68,255,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Sparkles size={16} /> Projeto Inova
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredPlans.map(plan => (
                                <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl group hover:border-white/10 transition-all flex flex-col relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 rounded-2xl ${planningTab === 'inova' ? 'bg-[#9D44FF]/10 text-[#9D44FF]' : 'bg-red-600/10 text-red-500'}`}>
                                            {planningTab === 'inova' ? <Sparkles size={24}/> : planningTab === 'bimestral' ? <BookMarked size={24}/> : <BookOpen size={24}/>}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '---'}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{plan.className || 'Sem Turma'}</h3>
                                    <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mb-6">{plan.subject} • {plan.teacherName}</p>
                                    <div className="mt-auto flex gap-3">
                                        <button onClick={() => handleEditPlan(plan)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">Visualizar</button>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="p-4 bg-white/5 hover:bg-red-600/10 text-gray-500 hover:text-red-500 rounded-2xl transition-all border border-white/5"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                            {filteredPlans.length === 0 && (
                                <div className="col-span-full py-40 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                                    <BookOpen size={64} className="mx-auto mb-6" />
                                    <p className="text-xl font-black uppercase tracking-[0.4em]">Nenhum planejamento encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL DE PLANEJAMENTO */}
                {showPlanningModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                        <div className="bg-[#121214] border border-white/10 w-full max-w-6xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center">
                                        {planningTab === 'inova' ? <Sparkles className="text-purple-500" size={32} /> : <History className="text-red-600" size={32} />}
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{planForm.id ? 'Editar Planejamento' : 'Novo Planejamento'}</h3>
                                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
                                            {planningTab === 'diario' ? 'Registro de Aula' : planningTab === 'bimestral' ? 'Guia de Aprendizagem' : 'Projeto Acadêmico'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPlanningModal(false)} className="text-gray-600 hover:text-white transition-colors p-2"><X size={32}/></button>
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
                                            {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
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
                            </form>
                            <div className="p-8 border-t border-white/5 bg-black/20 flex justify-end">
                                <Button onClick={handleSavePlan} isLoading={isLoading} className="px-12 h-16 bg-[#E53935] hover:bg-red-700 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-950/40">
                                    <Save size={20} className="mr-3"/> {planForm.id ? 'Atualizar Planejamento' : 'Salvar Planejamento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'occurrences' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Ocorrências</h1>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gestão de registros disciplinares e acadêmicos</p>
                            </div>
                            <Button onClick={() => openOccModal()} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                <PlusCircle size={18} className="mr-2"/> Novo Registro
                            </Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Data</th><th className="p-8">Aluno / Turma</th><th className="p-8">Categoria</th><th className="p-8">Descrição</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {occurrences.map(occ => (
                                        <tr key={occ.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-8 text-xs font-bold text-gray-500 whitespace-nowrap">{new Date(occ.date + 'T12:00:00').toLocaleDateString()}</td>
                                            <td className="p-8"><p className="font-black text-white uppercase text-sm">{occ.studentName}</p><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{occ.studentClass}</p></td>
                                            <td className="p-8"><span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : occ.category === 'indisciplina' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>{occ.category}</span></td>
                                            <td className="p-8"><p className="text-xs text-gray-400 font-medium line-clamp-2 max-w-md">{occ.description}</p></td>
                                            <td className="p-8 text-right"><div className="flex justify-end gap-2"><button onClick={() => openOccModal(occ)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"><Edit3 size={16} /></button><button onClick={() => handleDeleteOccurrence(occ.id)} className="p-3 bg-white/5 hover:bg-red-600/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button></div></td>
                                        </tr>
                                    ))}
                                    {occurrences.length === 0 && (
                                        <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-black uppercase tracking-[0.4em] opacity-30">Nenhuma ocorrência registrada por você.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto space-y-12">
                        <header className="mb-12"><h1 className="text-6xl font-black text-white uppercase tracking-tighter">Frequência</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Chamada diária simplificada</p></header>
                        <section className="bg-[#18181b] border border-white/5 rounded-[3rem] p-12 shadow-2xl">
                            <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 block mb-4">Selecione a Turma</label>
                                    <select className="w-full bg-black/40 border border-red-600/30 rounded-2xl p-6 text-white font-black uppercase tracking-widest outline-none focus:border-red-600 appearance-none text-xl cursor-pointer shadow-inner" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setAttendanceRecords({}); }}><option value="">-- Turma --</option>{myClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 block mb-4">Data da Chamada</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-black/40 border border-red-600/30 rounded-2xl p-6 text-white font-black uppercase tracking-widest outline-none focus:border-red-600 text-xl cursor-pointer shadow-inner"
                                        value={attendanceDate}
                                        onChange={e => setAttendanceDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            {selectedClass ? (
                                <div className="space-y-3">
                                    {students.filter(s => s.className === selectedClass).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(student => (
                                        <div key={student.id} className="bg-black/20 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-white/10 transition-all"><span className="font-black text-white uppercase tracking-tight text-sm">{student.name}</span><div className="flex gap-2"><button onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: true }))} className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all font-black text-xs ${attendanceRecords[student.id] === true ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-[#121214] border-white/5 text-gray-700 hover:text-white hover:border-white/10'}`}>P</button><button onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: false }))} className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all font-black text-xs ${attendanceRecords[student.id] === false ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-[#121214] border-white/5 text-gray-700 hover:text-white hover:border-white/10'}`}>F</button></div></div>
                                    ))}
                                    <div className="pt-10"><Button onClick={handleAttendanceSubmit} isLoading={isLoading} className="w-full h-20 bg-red-600 hover:bg-red-700 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-red-900/40">Finalizar Chamada</Button></div>
                                </div>
                            ) : (
                                <div className="py-40 text-center opacity-20 flex flex-col items-center"><Users size={64} className="mb-4" /><p className="font-black uppercase tracking-[0.4em] text-sm">Selecione uma turma para iniciar</p></div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'pei' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-12">
                        <header><h1 className="text-5xl font-black text-white uppercase tracking-tighter">PEI / AEE</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Planos de Ensino Individualizado</p></header>
                        <section><div className="flex items-center gap-4 mb-10"><Heart className="text-red-600 fill-red-600/10" size={28} /><h2 className="text-xl font-black text-white uppercase tracking-widest">Meus alunos em acompanhamento</h2></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                {monitoredStudents.map(student => (
                                    <div key={student.id} className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group hover:border-red-600/20 transition-all flex flex-col"><div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-5 py-2 rounded-bl-2xl uppercase tracking-widest shadow-lg">AEE</div><div className="flex items-center gap-6 mb-10"><div className="h-28 w-28 rounded-[2rem] bg-[#121214] border-2 border-white/5 flex items-center justify-center text-gray-700 shadow-2xl group-hover:scale-105 transition-transform overflow-hidden shrink-0">{student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : <Users size={40} />}</div><div className="min-w-0"><h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-3 line-clamp-2">{student.name}</h3><span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest">{student.className}</span></div></div><div className="space-y-4 mb-10 flex-1"><div className="bg-black/30 border-l-4 border-red-600 p-6 rounded-2xl"><span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-2">Diagnóstico(s)</span><div className="space-y-1">{(student.disorders || [student.disorder]).filter(d => d).map((d, i) => <p key={i} className="text-sm font-black text-white uppercase tracking-tight">• {d}</p>) || <p className="text-xs text-gray-600 italic">Nenhum diagnóstico registrado.</p>}</div></div><div className="bg-black/30 border-l-4 border-emerald-600 p-6 rounded-2xl"><span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Habilidades</span><p className="text-xs font-bold text-gray-400 leading-relaxed">{student.skills || 'Não registrado.'}</p></div><div className="bg-black/30 border-l-4 border-amber-600 p-6 rounded-2xl"><span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-2">Fragilidades</span><p className="text-xs font-bold text-gray-400 leading-relaxed">{student.weaknesses || 'Não registrado.'}</p></div><div className="bg-black/30 p-4 rounded-2xl flex items-center justify-center gap-3">{student.reportUrl ? <><FileCheck size={16} className="text-green-500" /><span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Laudo Digital Ok</span></> : <><ShieldAlert size={16} className="text-orange-500" /><span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Laudo Pendente</span></>}</div></div><Button onClick={() => { setCurrentPeiStudent(student); setShowPeiForm(true); }} className="w-full h-16 bg-red-600 hover:bg-red-700 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-red-900/40"><Plus size={20} className="mr-3" /> Criar PEI</Button></div>
                                ))}
                                {monitoredStudents.length === 0 && (
                                    <div className="col-span-full py-40 text-center bg-[#18181b] border-2 border-dashed border-white/5 rounded-[3rem] opacity-20"><Heart size={80} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-[0.4em]">Nenhum aluno em acompanhamento AEE</p></div>
                                )}
                            </div></section>
                    </div>
                )}

                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-10">
                        <header><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Materiais de Aula</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Compartilhe arquivos diretamente com os alunos</p></header>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10"><div className="lg:col-span-4"><div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl"><div className="flex items-center gap-4 mb-10"><div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600"><UploadCloud size={24} /></div><h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Material</h2></div><form onSubmit={handleMaterialSubmit} className="space-y-8"><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título do Arquivo</label><input required className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} placeholder="Ex: Slide Aula 1" /></div><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label><select required className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none cursor-pointer" value={materialForm.className} onChange={e => setMaterialForm({...materialForm, className: e.target.value})}><option value="">-- Selecione --</option>{myClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Pasta</label><select required className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none cursor-pointer" value={materialForm.subject} onChange={e => setMaterialForm({...materialForm, subject: e.target.value})}><option value="GERAL">-- Geral --</option>{subjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}</select></div><div className="space-y-3"><div className="border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center hover:border-red-600/30 transition-all relative bg-black/20 group cursor-pointer"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setMaterialFile(e.target.files[0])} /><div className="flex flex-col items-center"><FileUp className="text-gray-700 group-hover:text-red-600 transition-all mb-4" size={40} /><p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">{materialFile ? materialFile.name : 'Clique para anexar'}</p></div></div></div><Button type="submit" isLoading={isLoading} className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-2xl shadow-red-900/40">Publicar Material</Button></form></div></div><div className="lg:col-span-8 space-y-4">
                                {materials.length > 0 ? materials.map(mat => (
                                    <div key={mat.id} className="bg-[#18181b] border border-white/5 rounded-[1.8rem] p-6 flex items-center justify-between group hover:border-red-600/20 transition-all shadow-xl"><div className="flex items-center gap-6"><div className="h-14 w-14 bg-black/40 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-red-500 transition-colors border border-white/5 shadow-inner"><FileText size={24} /></div><div><h3 className="font-black text-white uppercase tracking-tight text-lg mb-1">{mat.title}</h3><div className="flex items-center gap-3"><span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{mat.className}</span><div className="h-1 w-1 rounded-full bg-gray-800" /><span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{mat.subject}</span><div className="h-1 w-1 rounded-full bg-gray-800" /><span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{new Date(mat.createdAt).toLocaleDateString()}</span></div></div></div><div className="flex items-center gap-3"><a href={mat.fileUrl} target="_blank" rel="noreferrer" className="h-12 w-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/5"><Eye size={20} /></a><button onClick={async () => { if(confirm("Deseja excluir este material?")) { await deleteClassMaterial(mat.id); setMaterials(await getClassMaterials(user!.id)); } }} className="h-12 w-12 bg-white/5 hover:bg-red-600/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all border border-white/5"><Trash2 size={20} /></button></div></div>
                                )) : (
                                    <div className="bg-[#18181b] border border-dashed border-white/5 rounded-[2.5rem] p-20 text-center opacity-20"><Folder size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest">Nenhum material publicado</p></div>
                                )}
                            </div></div>
                    </div>
                )}

                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-12 flex justify-between items-center"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Fila de Impressões</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Acompanhamento da gráfica</p></div><Button onClick={() => setActiveTab('send_to_print')} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"><Plus size={18} className="mr-2"/> Nova</Button></header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"><table className="w-full text-left"><thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]"><tr><th className="p-8">Data</th><th className="p-8">Atividade</th><th className="p-8">Turma</th><th className="p-8">Status</th><th className="p-8 text-right">Ações</th></tr></thead><tbody className="divide-y divide-white/5">
                                    {exams.map(e => (
                                        <tr key={e.id} className="hover:bg-white/[0.02]"><td className="p-8 text-xs font-bold text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</td><td className="p-8"><p className="font-black text-white uppercase text-sm">{String(e.title || '')}</p></td><td className="p-8"><span className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black text-red-400 uppercase">{String(e.gradeLevel || '')}</span></td><td className="p-8"><StatusBadge status={e.status}/></td><td className="p-8 text-right"><div className="flex items-center justify-end gap-3">{e.status === ExamStatus.READY && (<button onClick={() => handleConfirmReceipt(e.id)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-green-900/40 animate-pulse"><PackageCheck size={16}/> Retirado</button>)}<div className="flex flex-col gap-2 items-end">{e.fileUrls?.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg text-gray-400 hover:text-white transition-all border border-white/5 group"><span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{e.fileNames?.[i] || 'Ver'}</span><Eye size={12} className="group-hover:text-red-500"/></a>)}</div></div></td></tr>
                                    ))}
                                </tbody></table></div>
                    </div>
                )}

                {activeTab === 'send_to_print' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto space-y-12">
                        <section className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Modelos Padronizados</h2><p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Faça o download dos cabeçalhos oficiais antes de imprimir</p></div><Layout className="text-gray-800" size={48} /></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <button onClick={() => handleDownloadHeader('https://i.ibb.co/2Y0zfZ0W/3.png', 'Cabeçalho_de_Atividades.png')} className="flex items-center gap-4 bg-black/40 border border-white/5 hover:border-red-600/30 p-5 rounded-3xl transition-all group">
                                    <div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all"><Download size={20} /></div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest text-left leading-tight">Cabeçalho de Atividades</span>
                                </button>
                                <button onClick={() => handleDownloadHeader('https://i.ibb.co/zTGFssJs/4.png', 'Cabeçalho_Kronos.png')} className="flex items-center gap-4 bg-black/40 border border-white/5 hover:border-red-600/30 p-5 rounded-3xl transition-all group">
                                    <div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all"><Download size={20} /></div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest text-left leading-tight">Cabeçalho Kronos</span>
                                </button>
                                <button onClick={() => handleDownloadHeader('https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png', 'Cabeçalho_de_Avaliação.png')} className="flex items-center gap-4 bg-black/40 border border-white/5 hover:border-red-600/30 p-5 rounded-3xl transition-all group">
                                    <div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all"><Download size={20} /></div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest text-left leading-tight">Cabeçalho de Avaliação</span>
                                </button>
                            </div>
                        </section>
                        <section className="bg-[#18181b] border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden"><div className="flex items-center gap-6 mb-12"><div className="h-16 w-16 bg-red-600/10 rounded-[1.5rem] flex items-center justify-center text-red-600"><UploadCloud size={40} /></div><h2 className="text-4xl font-black text-white uppercase tracking-tighter">Enviar p/ Gráfica</h2></div><form onSubmit={handleExamSubmit} className="space-y-10"><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título do Material</label><input required className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} placeholder="Ex: Prova Bimestral de Matemática" /></div><div className="grid grid-cols-2 gap-8"><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label><select required className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 appearance-none text-lg cursor-pointer" value={examForm.gradeLevel} onChange={e => setExamForm({...examForm, gradeLevel: e.target.value})}><option value="">-- Turma --</option>{myClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Quantidade</label><input type="number" required className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-bold outline-none focus:border-red-600 transition-all text-lg" value={examForm.quantity} onChange={e => setExamForm({...examForm, quantity: Number(e.target.value)})} placeholder="30" /></div></div><div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Instruções da Impressão</label><textarea className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[150px]" value={examForm.instructions} onChange={e => setExamForm({...examForm, instructions: e.target.value})} placeholder="Ex: Frente e verso, grampeado, papel A4..." /></div><div className="space-y-4"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 block">Anexar Arquivo(s)</label><div className="border-3 border-dashed border-white/10 rounded-[2.5rem] p-20 text-center hover:border-red-600 transition-all relative bg-black/20 group cursor-pointer"><input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setExamFiles([...examFiles, ...Array.from(e.target.files)])} /><div className="flex flex-col items-center"><FileUp className="text-gray-700 group-hover:text-red-600 transition-all mb-6" size={80} /><p className="text-gray-500 font-black uppercase text-sm tracking-widest">Arraste seus arquivos PDF ou Imagens</p></div></div>{examFiles.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">{examFiles.map((f, i) => <div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 text-xs text-white font-bold uppercase"><div className="flex items-center gap-3"><FileText size={18} className="text-red-500" /><span className="truncate max-w-[150px]">{f.name}</span></div><button type="button" onClick={() => setExamFiles(examFiles.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-500 p-1"><X size={18}/></button></div>)}</div>}</div><div className="pt-8"><Button type="submit" isLoading={isLoading} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 hover:bg-red-700 shadow-2xl shadow-red-900/40 text-lg transition-all">Confirmar Envio</Button></div></form></section>
                    </div>
                )}

                {activeTab === 'gradebook' && (
                    <div className="animate-in fade-in slide-in-from-right-4"><header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6"><div><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Classe</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Lançamento de notas e avaliações</p></div><div className="flex flex-wrap gap-4"><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}><option value="">Turma</option>{myClasses.map(c => <option key={c} value={c}>{c}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}><option value="">Disciplina</option>{subjects.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}</select><select className="bg-[#121214] border-2 border-white/10 rounded-xl px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[150px]" value={selectedBimester} onChange={e => setSelectedBimester(e.target.value)}><option>1º BIMESTRE</option><option>2º BIMESTRE</option><option>3º BIMESTRE</option><option>4º BIMESTRE</option></select></div></header>
                        {selectedClass && selectedSubject ? (
                            <div className="space-y-10"><div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-4 mb-4"><Calculator className="text-red-600" size={28} /><h3 className="text-2xl font-black text-white uppercase tracking-tight">Composição da AV1</h3></div><p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-8">Soma Atual: <span className={Math.abs(totalAV1Max - 10) < 0.1 ? 'text-green-500' : 'text-red-500'}>{totalAV1Max.toFixed(1)}</span> / 10.0<span className="ml-4 opacity-50">({(gradebookData?.av1Config || []).length} de 7 atividades)</span></p>{(!gradebookData?.av1Config || gradebookData.av1Config.length === 0) ? <p className="text-gray-700 italic text-sm font-medium mt-10">Nenhuma atividade configurada para AV1.</p> : <div className="flex flex-wrap gap-4">{gradebookData.av1Config.map(av => <div key={av.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl relative group min-w-[200px]"><button onClick={async () => { if(confirm("Remover atividade?")) { const updated = gradebookData.av1Config.filter(a => a.id !== av.id); await saveGradebook({ ...gradebookData, av1Config: updated }); } }} className="absolute top-2 right-2 text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={14}/></button><div className="text-xs font-black text-white uppercase truncate">{av.activityName}</div><div className="mt-1"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${av.location === 'CASA' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : 'bg-orange-600/10 text-orange-400 border-orange-600/20'}`}>{av.location === 'CASA' ? '🏠 TAREFA/CASA' : '🏫 SALA DE AULA'}</span></div><div className="flex flex-col gap-1 mt-3 pt-3 border-t border-white/5"><div className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Aplicação: {av.applicationDate}</div><div className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Entrega: {av.deliveryDate}</div><div className="bg-red-600/10 px-2 py-1 rounded text-[10px] font-black text-red-400 mt-1 inline-block w-fit">{av.maxScore.toFixed(1)} pts</div></div></div>)}</div>}</div><button disabled={(gradebookData?.av1Config || []).length >= 7} onClick={() => setShowAV1Modal(true)} className="bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-black uppercase text-[10px] tracking-[0.2em] px-8 h-14 rounded-2xl transition-all shadow-xl shadow-red-900/40">+ ADD ATIVIDADE</button></div></div><div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-[#121214] text-gray-500 uppercase text-[9px] font-black tracking-[0.3em] border-b border-white/5"><tr><th className="p-8 sticky left-0 bg-[#121214] z-20">Aluno</th>{gradebookData?.av1Config?.map(av => <th key={av.id} className="p-8 text-center min-w-[120px]"><span className="block text-red-500">{av.activityName?.split(' ')[0] || ''}</span><span className="text-[8px] opacity-40">Max {av.maxScore}</span></th>)}<th className="p-8 text-center bg-red-950/10">Total AV1</th><th className="p-8 text-center text-blue-400">AV2 (Simulado)</th><th className="p-8 text-center text-purple-400">AV3 (Prova)</th><th className="p-8 text-center text-green-500">Média Final</th></tr></thead><tbody className="divide-y divide-white/5">
                                                {students.filter(s => s.className === selectedClass).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(student => {
                                                    const grades = (gradebookData?.grades?.[student.id] || { av1: {} }) as { av1: Record<string, number>, av2?: number, av3?: number };
                                                    const av1Sum = Object.values(grades.av1 || {}).reduce((a: number, b: number) => a + b, 0);
                                                    const av2 = grades.av2 || 0;
                                                    const av3 = grades.av3 || 0;
                                                    const final = ((av1Sum + av2 + av3) / 3).toFixed(1);
                                                    return (<tr key={student.id} className="hover:bg-white/[0.02] transition-colors"><td className="p-8 sticky left-0 bg-[#18181b] z-10 border-r border-white/5"><span className="font-black text-white text-xs uppercase tracking-tight">{student.name}</span></td>{gradebookData?.av1Config?.map(av => <td key={av.id} className="p-6 text-center"><input type="number" step="0.1" max={av.maxScore} className="w-16 bg-[#121214] border-2 border-white/5 rounded-xl p-3 text-center text-white font-black outline-none focus:border-red-600 transition-all" value={grades.av1[av.id] ?? ''} onChange={e => handleGradeUpdate(student.id, av.id, Number(e.target.value), true)} /></td>)}<td className="p-8 text-center bg-red-950/5"><span className="text-red-500 font-black text-lg">{av1Sum.toFixed(1)}</span></td><td className="p-8 text-center"><span className="text-blue-400 font-black text-lg">{av2 > 0 ? av2.toFixed(1) : '-'}</span><p className="text-[8px] text-gray-700 font-bold mt-1">ADM</p></td><td className="p-8 text-center"><div className="flex flex-col items-center gap-1"><input type="number" step="0.1" max="10" className="w-20 bg-[#121214] border-2 border-white/5 rounded-xl p-3 text-center text-purple-400 font-black outline-none focus:border-purple-600 transition-all" value={grades.av3 ?? ''} placeholder="-" onChange={e => handleGradeUpdate(student.id, 'av3', Number(e.target.value))} /><p className="text-[8px] text-gray-700 font-bold">ADM</p></div></td><td className="p-8 text-center"><span className={`text-2xl font-black ${Number(final) >= 7 ? 'text-green-500' : 'text-brand-500'}`}>{final === '0.0' ? '0' : final}</span></td></tr>);
                                                })}
                                            </tbody></table></div></div></div>
                        ) : <div className="py-40 text-center opacity-30 text-gray-600 font-black uppercase tracking-[0.4em]">Selecione Turma e Disciplina para gerenciar o Diário</div>}
                    </div>
                )}
            </main>

            {/* OCCURRENCE FORM MODAL */}
            {showOccModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"><div className="bg-[#18181b] border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">{isEditingOcc ? <Edit3 size={24} className="text-yellow-500" /> : <PlusCircle size={24} className="text-red-600" />}{isEditingOcc ? 'Editar Registro' : 'Novo Registro'}</h3><button onClick={() => setShowOccModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button></div><form onSubmit={handleSaveOccurrence} className="space-y-6"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occSelectedClass} onChange={(e) => setOccSelectedClass(e.target.value)} disabled={isEditingOcc}><option value="">-- Selecione --</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Aluno</label><select required className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occForm.studentId} onChange={(e) => setOccForm({...occForm, studentId: e.target.value})} disabled={isEditingOcc}><option value="">-- Selecione --</option>{students.filter(s => s.className === occSelectedClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Categoria</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occForm.category} onChange={(e) => setOccForm({...occForm, category: e.target.value as any})}><option value="indisciplina">Indisciplina</option><option value="atraso">Atraso</option><option value="desempenho">Resumo</option><option value="uniforme">Uniforme</option><option value="elogio">Elogio</option><option value="outros">Outros</option></select></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Data</label><input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={occForm.date} onChange={(e) => setOccForm({...occForm, date: e.target.value})} /></div></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Descrição Detalhada</label><textarea required className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[150px]" placeholder="Descreva o ocorrido com o máximo de detalhes..." value={occForm.description} onChange={(e) => setOccForm({...occForm, description: e.target.value})} /></div><div className="flex gap-4 pt-4"><Button type="button" variant="outline" onClick={() => setShowOccModal(false)} className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest">Cancelar</Button><Button type="submit" isLoading={isLoading} className="flex-1 h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40">{isEditingOcc ? 'Salvar Alterações' : 'Registrar Ocorrência'}</Button></div></form></div></div>
            )}

            {/* PEI FORM MODAL */}
            {showPeiForm && currentPeiStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"><div className="bg-[#18181b] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col"><div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6"><div><h3 className="text-3xl font-black text-white uppercase tracking-tight">Novo Plano PEI</h3><p className="text-sm text-gray-500 font-bold">{String(currentPeiStudent.name || '')}</p></div><button onClick={() => setShowPeiForm(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button></div><div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar"><div className="grid grid-cols-2 gap-8"><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Período</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={peiData.period} onChange={e => setPeiData({...peiData, period: e.target.value})}><option>1º BIMESTRE</option><option>2º BIMESTRE</option><option>3º BIMESTRE</option><option>4º BIMESTRE</option></select></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label><div className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-gray-400 font-black uppercase text-xs tracking-widest">{user?.subject || 'Geral'}</div></div></div><div className="space-y-8"><div className="space-y-2"><label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Competências Essenciais</label><textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[120px]" value={peiData.essentialCompetencies} onChange={e => setPeiData({...peiData, essentialCompetencies: e.target.value})} placeholder="Descreva as competências a serem desenvolvidas..." /></div><div className="space-y-2"><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">Conteúdos Selecionados</label><textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-emerald-600 min-h-[120px]" value={peiData.selectedContents} onChange={e => setPeiData({...peiData, selectedContents: e.target.value})} placeholder="Liste os conteúdos prioritários..." /></div><div className="space-y-2"><label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-2">Recursos Didáticos</label><textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-amber-600 min-h-[120px]" value={peiData.didacticResources} onChange={e => setPeiData({...peiData, didacticResources: e.target.value})} placeholder="Recursos e adaptações necessárias..." /></div><div className="space-y-2"><label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">Avaliação</label><textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-blue-600 min-h-[120px]" value={peiData.evaluation} onChange={e => setPeiData({...peiData, evaluation: e.target.value})} placeholder="Critérios e formas de avaliação adaptada..." /></div></div></div><div className="pt-8 border-t border-white/5 flex gap-4 mt-6"><Button variant="outline" onClick={() => setShowPeiForm(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar</Button><Button onClick={handleSavePei} isLoading={isLoading} className="flex-1 h-16 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">Salvar Planejamento PEI</Button></div></div></div>
            )}

            {/* AV1 CONFIG MODAL */}
            {showAV1Modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"><div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 animate-in zoom-in-95 shadow-2xl"><h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3"><Plus size={24} className="text-red-600"/> CONFIGURAR COLUNA AV1</h3><div className="space-y-6"><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">Nome da Atividade</label><input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600" placeholder="Ex: SEMINÁRIO DE HISTÓRIA" value={newAV1.activityName} onChange={e => setNewAV1({...newAV1, activityName: e.target.value.toUpperCase()})}/></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">Data de Aplicação</label><div className="relative"><CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16}/><input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-bold outline-none focus:border-red-600 text-xs" placeholder="01/03" value={newAV1.applicationDate} onChange={e => setNewAV1({...newAV1, applicationDate: e.target.value})}/></div></div><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">Data de Entrega</label><div className="relative"><CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16}/><input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-bold outline-none focus:border-red-600 text-xs" placeholder="15/03" value={newAV1.deliveryDate} onChange={e => setNewAV1({...newAV1, deliveryDate: e.target.value})}/></div></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">Local de Realização</label><div className="flex bg-black/40 p-1 rounded-xl border border-white/10"><button type="button" onClick={() => setNewAV1({...newAV1, location: 'SALA'})} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAV1.location !== 'CASA' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Sala</button><button type="button" onClick={() => setNewAV1({...newAV1, location: 'CASA'})} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newAV1.location === 'CASA' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Casa</button></div></div><div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mb-2 block">Peso (Máx. 2)</label><input type="number" step="0.1" max="2" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black outline-none focus:border-red-600 text-center" value={newAV1.maxScore} onChange={e => { let val = Number(e.target.value); if (val > 2) val = 2; setNewAV1({...newAV1, maxScore: val}); }}/></div></div><div className="bg-red-600/5 p-5 rounded-2xl border border-red-600/20 text-[10px] font-medium text-gray-400"><span className="font-black text-red-500 uppercase block mb-1">Informação:</span>A soma total das colunas de AV1 deve ser exatamente 10.0 al final do bimestre.</div><div className="flex gap-4 pt-4"><Button variant="outline" onClick={() => setShowAV1Modal(false)} className="flex-1 rounded-xl h-14 font-black uppercase text-[10px] tracking-widest">Cancelar</Button><Button onClick={handleAddAV1} className="flex-1 bg-red-600 rounded-xl h-14 font-black uppercase text-[10px] tracking-widest">Adicionar Coluna</Button></div></div></div></div>
            )}
        </div>
    );
};
