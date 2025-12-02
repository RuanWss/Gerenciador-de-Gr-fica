import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    createTeacherUser, 
    saveClass, 
    getClasses, 
    saveStudent, 
    getStudents,
    saveAnswerKey,
    getAnswerKeys,
    deleteAnswerKey,
    saveStudentCorrection,
    getStudentCorrections,
    updateSystemConfig,
    listenToSystemConfig,
    getFullSchedule,
    saveScheduleEntry
} from '../services/firebaseService';
import { correctExamWithAI } from '../services/geminiService';
import { ExamRequest, ExamStatus, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry, TimeSlot } from '../types';
import { Button } from '../components/Button';
import { 
  Printer, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  UserPlus, 
  Briefcase, 
  Users, 
  GraduationCap, 
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  BarChart2,
  Upload,
  PieChart,
  Home,
  ScanLine,
  Info,
  Save,
  ArrowLeft,
  ChevronRight,
  Calendar,
  Hash,
  Type,
  Trash2,
  Megaphone,
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  UploadCloud
} from 'lucide-react';

type Tab = 'overview' | 'printing' | 'teachers' | 'classes' | 'students' | 'subjects' | 'answer_keys' | 'statistics' | 'schedule';

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

const MORNING_CLASSES_LIST = [
    { id: '6efaf', name: '6º EFAF' },
    { id: '7efaf', name: '7º EFAF' },
    { id: '8efaf', name: '8º EFAF' },
    { id: '9efaf', name: '9º EFAF' },
];

const AFTERNOON_CLASSES_LIST = [
    { id: '1em', name: '1ª Série EM' },
    { id: '2em', name: '2ª Série EM' },
    { id: '3em', name: '3ª Série EM' },
];

export const PrintShopDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Data State
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPendingExams, setHasPendingExams] = useState(false);

  // Filter State (Printing View)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // --- FORMS STATES ---
  
  // Teacher
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherShift, setNewTeacherShift] = useState<'morning' | 'afternoon'>('morning');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const morningClasses = ['6º Ano EFAI', '7º Ano EFAI', '8º Ano EFAI', '9º Ano EFAI'];
  const afternoonClasses = ['1ª Série EM', '2ª Série EM', '3ª Série EM'];

  // Classes
  const [classList, setClassList] = useState<SchoolClass[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassShift, setNewClassShift] = useState<'morning' | 'afternoon'>('morning');
  const [isSavingClass, setIsSavingClass] = useState(false);

  // Students
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Answer Keys & Exam Creation Flow
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [viewState, setViewState] = useState<'list' | 'create_step1' | 'create_step2_grid' | 'correction'>('list');
  
  // Create Step 1 Data
  const [newKeyTitle, setNewKeyTitle] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyClassId, setNewKeyClassId] = useState('');
  const [newKeyDate, setNewKeyDate] = useState('');
  const [newKeyQty, setNewKeyQty] = useState<number>(10);
  
  // Create Step 2 / Edit Data
  const [editingKey, setEditingKey] = useState<AnswerKey | null>(null);

  // Correction Mode
  const [correctionMode, setCorrectionMode] = useState<AnswerKey | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);
  
  // Correction Upload
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [correctionProgress, setCorrectionProgress] = useState('');

  // Statistics
  const [statsKeyId, setStatsKeyId] = useState('');
  const [corrections, setCorrections] = useState<StudentCorrection[]>([]);
  const [selectedStatsKey, setSelectedStatsKey] = useState<AnswerKey | null>(null);

  // System Config (Banner)
  const [sysConfig, setSysConfig] = useState<SystemConfig>({ bannerMessage: '', bannerType: 'info', isBannerActive: false });

  // Schedule Management State
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Monday
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    refreshData();
    // Listen to real-time config changes
    const unsubscribe = listenToSystemConfig((config) => {
        if (config) setSysConfig(config);
    });
    return () => unsubscribe();
  }, [user]);

  // Load schedule when tab changes
  useEffect(() => {
      if (activeTab === 'schedule') {
          loadScheduleData();
      }
  }, [activeTab]);

  const refreshData = async () => {
    setIsLoading(true);
    // Exams
    const allExams = await getExams();
    const sorted = allExams.sort((a,b) => a.createdAt - b.createdAt);
    setExams(sorted);
    setHasPendingExams(sorted.some(e => e.status === ExamStatus.PENDING));
    
    // Aux Data
    const classes = await getClasses();
    setClassList(classes);
    const students = await getStudents();
    setStudentList(students);
    const keys = await getAnswerKeys();
    setAnswerKeys(keys);

    setIsLoading(false);
  };

  const loadScheduleData = async () => {
      setScheduleLoading(true);
      const data = await getFullSchedule();
      setScheduleData(data);
      setScheduleLoading(false);
  };

  // --- HANDLERS ---

  const handleUpdateConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateSystemConfig(sysConfig);
      alert("Aviso do sistema atualizado! Todos os usuários verão essa mensagem.");
  };

  const handleStatusChange = async (id: string, newStatus: ExamStatus) => {
    await updateExamStatus(id, newStatus);
    refreshData();
  };

  const handleViewFile = (exam: ExamRequest) => {
    if (exam.fileUrl) {
        window.open(exam.fileUrl, '_blank');
        return;
    }
    if (exam.fileName.toLowerCase().endsWith('.pdf')) {
        window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
    } else {
        alert(`Simulação: Download do arquivo "${exam.fileName}" iniciado.`);
    }
  };

  const handleStartPrint = async (exam: ExamRequest) => {
    handleViewFile(exam);
    await handleStatusChange(exam.id, ExamStatus.IN_PROGRESS);
  };

  // Teacher Handlers
  const toggleClass = (className: string) => {
    if (selectedClasses.includes(className)) {
        setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
        setSelectedClasses([...selectedClasses, className]);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTeacher(true);
    const newUser = {
        id: '', 
        name: newTeacherName,
        email: newTeacherEmail,
        role: UserRole.TEACHER,
        subject: newTeacherSubject,
        classes: selectedClasses
    };
    try {
        await createTeacherUser(newUser, newTeacherPassword);
        alert('Professor cadastrado com sucesso!');
        setNewTeacherName('');
        setNewTeacherEmail('');
        setNewTeacherPassword('');
        setNewTeacherSubject('');
        setSelectedClasses([]);
    } catch (error: any) {
        alert('Erro ao criar professor: ' + error.message);
    } finally {
        setIsSavingTeacher(false);
    }
  };

  // Class Handler
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClass(true);
    try {
        await saveClass({ id: '', name: newClassName, shift: newClassShift });
        alert('Turma salva!');
        setNewClassName('');
        refreshData();
    } catch (e) { alert('Erro ao salvar turma'); }
    setIsSavingClass(false);
  };

  // Student Handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return alert('Selecione uma turma');
    setIsSavingStudent(true);
    try {
        const cls = classList.find(c => c.id === selectedClassId);
        await saveStudent({ id: '', name: newStudentName, classId: selectedClassId, className: cls?.name || '' });
        alert('Aluno salvo!');
        setNewStudentName('');
        refreshData();
    } catch (e) { alert('Erro ao salvar aluno'); }
    setIsSavingStudent(false);
  };

  // Schedule Handler
  const handleUpdateSchedule = async (classId: string, className: string, slotId: string, field: 'subject' | 'professor', value: string) => {
      const existingEntry = scheduleData.find(s => s.classId === classId && s.dayOfWeek === selectedDay && s.slotId === slotId);
      
      const newEntry: ScheduleEntry = existingEntry ? { ...existingEntry, [field]: value } : {
          id: `${classId}_${selectedDay}_${slotId}`,
          classId,
          className,
          dayOfWeek: selectedDay,
          slotId,
          subject: field === 'subject' ? value : '',
          professor: field === 'professor' ? value : ''
      };

      // Optimistic update
      const updatedData = scheduleData.filter(s => s.id !== newEntry.id);
      updatedData.push(newEntry);
      setScheduleData(updatedData);

      // Save to DB (debounced could be better, but direct for now)
      try {
          await saveScheduleEntry(newEntry);
      } catch (error) {
          console.error("Error saving schedule", error);
      }
  };

  const handleSyncSchedule = async () => {
      setScheduleLoading(true);
      await loadScheduleData();
      // Simular delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 800));
      setScheduleLoading(false);
      alert("Horários sincronizados e enviados para a TV com sucesso!");
  };

  const getScheduleValue = (classId: string, slotId: string, field: 'subject' | 'professor') => {
      const entry = scheduleData.find(s => s.classId === classId && s.dayOfWeek === selectedDay && s.slotId === slotId);
      return entry ? entry[field] : '';
  };


  // Answer Key / Exam Flow Handlers
  const startCreateExam = () => {
    setNewKeyTitle('');
    setNewKeyDescription('');
    setNewKeyClassId('');
    setNewKeyDate(new Date().toISOString().split('T')[0]);
    setNewKeyQty(20);
    setViewState('create_step1');
  };

  const goToStep2 = () => {
    if (!newKeyTitle) return alert("Preencha o título da prova");
    
    // Initialize temporary object for editing
    const tempKey: AnswerKey = {
        id: '',
        title: newKeyTitle,
        numQuestions: newKeyQty,
        correctAnswers: {},
        createdAt: Date.now()
    };
    setEditingKey(tempKey);
    setViewState('create_step2_grid');
  };

  const toggleAnswer = (question: number, option: string) => {
    if (!editingKey) return;
    setEditingKey({
        ...editingKey,
        correctAnswers: {
            ...editingKey.correctAnswers,
            [question]: option
        }
    });
  };

  const handleSaveKey = async () => {
    if (!editingKey) return;
    try {
        await saveAnswerKey(editingKey);
        setEditingKey(null);
        setViewState('list');
        refreshData();
        alert('Gabarito salvo com sucesso!');
    } catch (e) {
        alert('Erro ao salvar gabarito');
    }
  };

  const handleDeleteKey = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.")) {
          try {
              await deleteAnswerKey(id);
              refreshData();
          } catch (error) {
              alert("Erro ao excluir prova.");
          }
      }
  };

  const handleCorrectStudent = async () => {
    if (!correctionMode) return;
    let correctCount = 0;
    const hits: number[] = [];
    
    Object.entries(correctionMode.correctAnswers).forEach(([q, correctOpt]) => {
        const qNum = parseInt(q);
        if (studentAnswers[qNum] === correctOpt) {
            correctCount++;
            hits.push(qNum);
        }
    });
    
    const score = (correctCount / correctionMode.numQuestions) * 10;
    setCalculatedScore(score);

    // Save Correction
    try {
         await saveStudentCorrection({
             id: '',
             answerKeyId: correctionMode.id,
             studentName: 'Aluno Manual',
             score: score,
             answers: studentAnswers,
             hits: hits,
             date: Date.now()
         });
    } catch(e) { console.error("Error saving stats", e); }
  };

  // Real AI Correction Handler
  const handleFileUploadCorrection = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     if (!correctionMode) return alert("Erro: Modo de correção não iniciado.");
     
     setIsProcessingUpload(true);
     setCorrectionProgress('Iniciando envio para IA...');

     const files: File[] = Array.from(e.target.files);
     let processedCount = 0;

     try {
         for (const file of files) {
             setCorrectionProgress(`Corrigindo ${processedCount + 1}/${files.length}: ${file.name}...`);
             
             // Chamada ao Gemini Vision
             const result = await correctExamWithAI(file, correctionMode.correctAnswers, correctionMode.numQuestions);
             
             // Salvar resultado no Firestore
             await saveStudentCorrection({
                 id: '',
                 answerKeyId: correctionMode.id,
                 studentName: result.studentName,
                 score: result.score,
                 answers: result.answers,
                 hits: result.hits,
                 date: Date.now()
             });

             processedCount++;
         }
         
         alert(`Processo finalizado! ${processedCount} provas corrigidas com sucesso.`);
     } catch (error) {
         console.error(error);
         alert("Ocorreu um erro durante a correção com IA. Verifique o console.");
     } finally {
         setIsProcessingUpload(false);
         setCorrectionProgress('');
         // Limpar input
         e.target.value = '';
     }
  };

  // Stats Handler
  const loadStats = async (keyId: string) => {
      setStatsKeyId(keyId);
      const key = answerKeys.find(k => k.id === keyId);
      setSelectedStatsKey(key || null);
      if (keyId) {
          const results = await getStudentCorrections(keyId);
          setCorrections(results);
      } else {
          setCorrections([]);
      }
  };

  const getQuestionHitRate = (qNum: number) => {
      if (corrections.length === 0) return 0;
      const hitCount = corrections.filter(c => c.hits.includes(qNum)).length;
      return (hitCount / corrections.length) * 100;
  };

  const handlePrintCard = () => {
    const printContent = document.getElementById('print-card');
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
        printWindow.document.write('<html><head><title>Cartão Resposta</title>');
        printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('<style>body { font-family: "Poppins", sans-serif; -webkit-print-color-adjust: exact; } @page { margin: 0; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
  };

  // --- COMPONENT RENDER ---

  const SidebarItem = ({ id, label, icon: Icon, alert }: { id: Tab, label: string, icon: any, alert?: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-1 font-medium text-sm
      ${activeTab === id 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      {alert && (
        <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
      )}
    </button>
  );

  const filteredExams = exams.filter(exam => {
    if (filter === 'pending') return exam.status !== ExamStatus.COMPLETED;
    if (filter === 'completed') return exam.status === ExamStatus.COMPLETED;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* --- SIDEBAR --- */}
        <div className="w-64 bg-black/40 backdrop-blur-md border-r border-white/10 p-4 flex flex-col h-full overflow-y-auto">
            <div className="mb-6 px-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Painel Principal</p>
                <SidebarItem id="overview" label="Visão Geral" icon={Home} />
                <SidebarItem id="printing" label="Fila de Impressão" icon={Printer} alert={hasPendingExams} />
            </div>

            <div className="px-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gestão Escolar</p>
                <SidebarItem id="schedule" label="Quadro de Horários" icon={CalendarClock} />
                <SidebarItem id="teachers" label="Professores" icon={UserPlus} />
                <SidebarItem id="classes" label="Turmas" icon={GraduationCap} />
                <SidebarItem id="students" label="Alunos" icon={Users} />
            </div>

            <div className="mt-6 px-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Avaliações</p>
                <SidebarItem id="answer_keys" label="Gabaritos / Correção" icon={ClipboardCheck} />
                <SidebarItem id="statistics" label="Relatórios" icon={BarChart2} />
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-8 bg-transparent">
            
            {/* 1. OVERVIEW (DASHBOARD HOME) */}
            {activeTab === 'overview' && (
                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-6">Visão Geral</h2>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-brand-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Impressões Pendentes</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{exams.filter(e => e.status === ExamStatus.PENDING).length}</h3>
                                </div>
                                <div className={`p-3 rounded-lg ${hasPendingExams ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Printer size={24} />
                                </div>
                            </div>
                            {hasPendingExams && <p className="text-xs text-yellow-600 font-bold mt-2 animate-pulse">Atenção Necessária!</p>}
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-blue-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Alunos Cadastrados</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{studentList.length}</h3>
                                </div>
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                    <Users size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-purple-600">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Provas Corrigidas</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-1">
                                        {answerKeys.length > 0 ? 'Ver Relatórios' : '0'}
                                    </h3>
                                </div>
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                    <PieChart size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Announcement Config */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Megaphone className="text-brand-600" />
                            <h3 className="text-lg font-bold text-gray-800">Avisos do Sistema (Broadcast)</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Configure uma mensagem que aparecerá no topo da tela de todos os professores e alunos.</p>
                        
                        <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                <input 
                                    type="text" 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-900"
                                    placeholder="Ex: Sistema em manutenção até as 14h."
                                    value={sysConfig.bannerMessage}
                                    onChange={e => setSysConfig({...sysConfig, bannerMessage: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Alerta</label>
                                <select 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-900"
                                    value={sysConfig.bannerType}
                                    onChange={e => setSysConfig({...sysConfig, bannerType: e.target.value as any})}
                                >
                                    <option value="info">Informação (Azul)</option>
                                    <option value="warning">Aviso (Amarelo)</option>
                                    <option value="error">Crítico (Vermelho)</option>
                                    <option value="success">Sucesso (Verde)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-4 pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                        checked={sysConfig.isBannerActive}
                                        onChange={e => setSysConfig({...sysConfig, isBannerActive: e.target.checked})}
                                    />
                                    <span className="text-sm font-bold text-gray-700">Ativar Aviso</span>
                                </label>
                                <Button type="submit" className="flex-1">Salvar Configuração</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SCHEDULE MANAGEMENT TAB */}
            {activeTab === 'schedule' && (
                <div className="max-w-7xl mx-auto h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><CalendarClock className="text-brand-500"/> Quadro de Horários</h2>
                    
                    <div className="flex gap-2 mb-6 bg-white/10 p-2 rounded-xl w-fit">
                        {[
                            { d: 1, label: 'Segunda' },
                            { d: 2, label: 'Terça' },
                            { d: 3, label: 'Quarta' },
                            { d: 4, label: 'Quinta' },
                            { d: 5, label: 'Sexta' }
                        ].map(day => (
                            <button
                                key={day.d}
                                onClick={() => setSelectedDay(day.d)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDay === day.d ? 'bg-brand-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            >
                                {day.label}
                            </button>
                        ))}
                        
                        <div className="h-8 w-px bg-white/20 mx-2"></div>
                        
                        <a 
                            href="/#horarios" 
                            target="_blank" 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white text-gray-900 hover:bg-gray-200 transition-all border border-gray-200"
                        >
                            <Eye size={16}/> Abrir TV
                        </a>
                        <Button 
                            onClick={handleSyncSchedule} 
                            isLoading={scheduleLoading}
                            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
                        >
                             <RefreshCw size={16} className={`mr-2 ${scheduleLoading ? 'animate-spin' : ''}`}/>
                             Atualizar TV
                        </Button>
                    </div>

                    <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-brand-700 uppercase tracking-wide mb-4">Turno Matutino</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500">
                                            <th className="py-2 px-2 w-24">Horário</th>
                                            {MORNING_CLASSES_LIST.map(c => <th key={c.id} className="py-2 px-2 text-center border-l border-gray-200">{c.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {MORNING_SLOTS.map(slot => (
                                            <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                                <td className="py-3 px-2 font-mono text-xs font-bold text-gray-600">
                                                    {slot.start} - {slot.end}
                                                    {slot.type === 'break' && <span className="block text-[10px] text-yellow-600 uppercase">Intervalo</span>}
                                                </td>
                                                {slot.type === 'class' ? MORNING_CLASSES_LIST.map(cls => (
                                                    <td key={`${slot.id}_${cls.id}`} className="p-2 border-l border-gray-200">
                                                        <div className="space-y-1">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Matéria" 
                                                                className="w-full text-xs font-bold p-1 border border-red-900 bg-white text-gray-900 rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-900"
                                                                value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                            />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Professor" 
                                                                className="w-full text-[10px] p-1 border border-red-900 bg-white text-gray-900 rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-900"
                                                                value={getScheduleValue(cls.id, slot.id, 'professor')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'professor', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                )) : (
                                                    <td colSpan={MORNING_CLASSES_LIST.length} className="text-center text-xs font-bold text-yellow-700 tracking-widest bg-yellow-100/50">
                                                        RECREIO / LANCHE
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6">
                            <h3 className="font-bold text-blue-700 uppercase tracking-wide mb-4">Turno Vespertino</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500">
                                            <th className="py-2 px-2 w-24">Horário</th>
                                            {AFTERNOON_CLASSES_LIST.map(c => <th key={c.id} className="py-2 px-2 text-center border-l border-gray-200">{c.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {AFTERNOON_SLOTS.map(slot => (
                                            <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                                <td className="py-3 px-2 font-mono text-xs font-bold text-gray-600">
                                                    {slot.start} - {slot.end}
                                                    {slot.type === 'break' && <span className="block text-[10px] text-yellow-600 uppercase">Intervalo</span>}
                                                </td>
                                                {slot.type === 'class' ? AFTERNOON_CLASSES_LIST.map(cls => (
                                                    <td key={`${slot.id}_${cls.id}`} className="p-2 border-l border-gray-200">
                                                        <div className="space-y-1">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Matéria" 
                                                                className="w-full text-xs font-bold p-1 border border-red-900 bg-white text-gray-900 rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-900"
                                                                value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                            />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Professor" 
                                                                className="w-full text-[10px] p-1 border border-red-900 bg-white text-gray-900 rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-900"
                                                                value={getScheduleValue(cls.id, slot.id, 'professor')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'professor', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                )) : (
                                                    <td colSpan={AFTERNOON_CLASSES_LIST.length} className="text-center text-xs font-bold text-yellow-700 tracking-widest bg-yellow-100/50">
                                                        RECREIO / LANCHE
                                                    </td>
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
            
            {/* 2. PRINTING QUEUE */}
            {activeTab === 'printing' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Printer className="text-brand-500" /> Central de Impressão
                        </h2>
                        <div className="flex bg-gray-900/50 p-1 rounded-lg backdrop-blur-sm border border-white/10">
                            <button 
                                onClick={() => setFilter('all')} 
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            >
                                Todas
                            </button>
                            <button 
                                onClick={() => setFilter('pending')} 
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'pending' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            >
                                Fila
                            </button>
                            <button 
                                onClick={() => setFilter('completed')} 
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                            >
                                Concluídas
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="bg-white/5 border border-white/10 p-12 text-center rounded-xl text-gray-400">
                                <p>Carregando dados da fila...</p>
                            </div>
                        ) : filteredExams.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 p-12 text-center rounded-xl text-gray-400">
                                <p>Nenhuma prova encontrada com este filtro.</p>
                            </div>
                        ) : (
                            filteredExams.map((exam) => (
                                <div key={exam.id} className={`bg-white rounded-xl shadow-lg border-l-4 p-6 transition-all hover:scale-[1.01] ${exam.status === ExamStatus.COMPLETED ? 'border-l-green-500 opacity-90' : 'border-l-brand-500'}`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${exam.status === ExamStatus.PENDING ? 'bg-red-50 border-red-200 text-red-700' : exam.status === ExamStatus.IN_PROGRESS ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                                    {exam.status === ExamStatus.PENDING ? 'Aguardando' : exam.status === ExamStatus.IN_PROGRESS ? 'Em andamento' : 'Finalizado'}
                                                </span>
                                                <span className="text-gray-400 text-sm flex items-center">
                                                    <Clock size={14} className="mr-1"/> Enviado em {new Date(exam.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.title}</h3>
                                            <p className="text-gray-600 font-medium mb-4">{exam.teacherName} — {exam.subject}</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Turma</span>{exam.gradeLevel}</div>
                                                <div>
                                                    <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Qtd.</span>
                                                    {exam.quantity > 0 ? (
                                                        <><span className="font-bold text-gray-900">{exam.quantity}</span> cópias</>
                                                    ) : (
                                                        <span className="text-gray-800 font-medium text-xs bg-gray-200 px-2 py-1 rounded">Ver Arquivo</span>
                                                    )}
                                                </div>
                                                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Prazo</span><span className="text-brand-600 font-bold">{new Date(exam.dueDate).toLocaleDateString()}</span></div>
                                                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Arquivo</span><span className="truncate block max-w-[120px]" title={exam.fileName}>{exam.fileName}</span></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-3 justify-center border-l border-gray-100 pl-0 md:pl-6 min-w-[200px]">
                                            <Button variant="outline" className="w-full justify-start h-10 border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => handleViewFile(exam)}>
                                                {exam.fileName.toLowerCase().endsWith('.pdf') ? <><Eye size={18} className="mr-2 text-gray-500"/> Visualizar PDF</> : <><Download size={18} className="mr-2 text-gray-500"/> Baixar Arquivo</>}
                                            </Button>
                                            
                                            {exam.status === ExamStatus.PENDING && (
                                                <Button onClick={() => handleStartPrint(exam)} className="w-full justify-start h-10 bg-yellow-500 hover:bg-yellow-600 text-white border-none shadow-sm">
                                                    <Printer size={18} className="mr-2"/> Iniciar Impressão
                                                </Button>
                                            )}
                                            
                                            {exam.status === ExamStatus.IN_PROGRESS && (
                                                <Button onClick={() => handleStatusChange(exam.id, ExamStatus.COMPLETED)} className="w-full justify-start h-10 bg-green-600 hover:bg-green-700 border-none shadow-sm">
                                                    <CheckCircle size={18} className="mr-2"/> Marcar Pronto
                                                </Button>
                                            )}
                                            
                                            {exam.status === ExamStatus.COMPLETED && (
                                                <Button onClick={() => handleStatusChange(exam.id, ExamStatus.IN_PROGRESS)} variant="outline" className="w-full justify-center text-xs opacity-75 hover:opacity-100">
                                                    Reabrir Pedido
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'teachers' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus className="text-brand-500"/> Gestão de Professores</h2>
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <form onSubmit={handleAddTeacher} className="space-y-5">
                            <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input required type="text" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 p-3 border" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Login (Email)</label><input required type="email" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 p-3 border" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700">Senha</label><input required type="password" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 p-3 border" value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} /></div></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Briefcase size={14} /> Disciplina Principal</label><input required type="text" className="block w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 p-3 border" value={newTeacherSubject} onChange={e => setNewTeacherSubject(e.target.value)} /></div>
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200"><label className="block text-sm font-bold text-gray-700 mb-3">Vincular Turmas</label><div className="flex gap-6 mb-4 pb-4 border-b border-gray-200"><label className="flex items-center space-x-2"><input type="radio" checked={newTeacherShift === 'morning'} onChange={() => {setNewTeacherShift('morning'); setSelectedClasses([]);}} className="text-brand-600 focus:ring-brand-500" /><span className="text-sm font-medium text-gray-700">Manhã (EFAI)</span></label><label className="flex items-center space-x-2"><input type="radio" checked={newTeacherShift === 'afternoon'} onChange={() => {setNewTeacherShift('afternoon'); setSelectedClasses([]);}} className="text-brand-600 focus:ring-brand-500" /><span className="text-sm font-medium text-gray-700">Tarde (Ensino Médio)</span></label></div><div className="grid grid-cols-2 gap-3">{(newTeacherShift === 'morning' ? morningClasses : afternoonClasses).map(cls => (<label key={cls} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"><input type="checkbox" checked={selectedClasses.includes(cls)} onChange={() => toggleClass(cls)} className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4" /><span className="text-sm text-gray-600">{cls}</span></label>))}</div></div>
                            <Button type="submit" isLoading={isSavingTeacher} className="w-full py-3 text-lg">Confirmar Cadastro</Button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'classes' && (
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><GraduationCap className="text-brand-500"/> Gestão de Turmas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Nova Turma</h3>
                            <form onSubmit={handleAddClass} className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Nome da Turma</label><input required type="text" placeholder="Ex: 9º Ano B" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newClassName} onChange={e => setNewClassName(e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700">Turno</label><select className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newClassShift} onChange={e => setNewClassShift(e.target.value as 'morning' | 'afternoon')}><option value="morning">Manhã</option><option value="afternoon">Tarde</option></select></div><Button type="submit" isLoading={isSavingClass} className="w-full py-3">Salvar Turma</Button></form>
                        </div>
                        <div className="bg-white rounded-2xl p-8 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Turmas Cadastradas</h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">{classList.map(cls => (<div key={cls.id} className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center hover:bg-gray-100 transition-colors"><span className="font-bold text-gray-800">{cls.name}</span><span className={`text-xs px-3 py-1 rounded-full font-bold ${cls.shift === 'morning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{cls.shift === 'morning' ? 'Manhã' : 'Tarde'}</span></div>))}{classList.length === 0 && <p className="text-gray-500 text-sm">Nenhuma turma cadastrada.</p>}</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-brand-500"/> Gestão de Alunos</h2>
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleAddStudent} className="space-y-5 mb-10 border-b border-gray-100 pb-10"><h3 className="text-lg font-bold text-gray-800">Cadastrar Novo Aluno</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Nome do Aluno</label><input required type="text" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} /></div><div><label className="block text-sm font-medium text-gray-700">Selecione a Turma</label><select required className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}><option value="">Selecione...</option>{classList.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.shift === 'morning' ? 'M' : 'T'})</option>))}</select></div></div><Button type="submit" isLoading={isSavingStudent} className="w-full py-3">Cadastrar Aluno</Button></form>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Lista de Alunos</h3><div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto border border-gray-200">{studentList.length > 0 ? (<table className="min-w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase border-b bg-gray-100"><tr><th className="px-4 py-3 rounded-tl-lg">Nome</th><th className="px-4 py-3 rounded-tr-lg">Turma</th></tr></thead><tbody>{studentList.map(st => (<tr key={st.id} className="border-b last:border-0 hover:bg-white transition-colors"><td className="px-4 py-3 font-medium text-gray-900">{st.name}</td><td className="px-4 py-3 text-gray-500">{st.className}</td></tr>))}</tbody></table>) : <p className="text-gray-500 text-sm text-center py-4">Nenhum aluno cadastrado.</p>}</div>
                    </div>
                </div>
            )}
            
            {activeTab === 'answer_keys' && (
                <div className="h-full flex flex-col">
                    {viewState === 'list' && (
                        <div className="max-w-6xl mx-auto w-full">
                             <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <ClipboardCheck className="text-brand-500" size={32} /> Gabaritos & Correção
                                </h2>
                                <Button onClick={startCreateExam} className="bg-brand-600 hover:bg-brand-700 h-12 px-6 shadow-lg text-lg">
                                    + Criar Nova Prova
                                </Button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {answerKeys.length === 0 ? (
                                    <div className="col-span-full text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                                        <FileSpreadsheet className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                                        <h3 className="text-xl font-bold text-gray-300">Nenhum gabarito criado</h3>
                                        <p className="text-gray-500 mt-2">Crie o gabarito oficial de uma prova para habilitar a correção automática.</p>
                                    </div>
                                ) : (
                                    answerKeys.map(key => (
                                        <div key={key.id} className="bg-[#18181b] rounded-2xl border border-gray-800 hover:border-brand-500/50 transition-all p-6 group relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-brand-900/20 rounded-lg text-brand-500">
                                                    <ScanLine size={24} />
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="text-gray-600 hover:text-red-500 transition-colors p-2"
                                                    title="Excluir Prova"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-1">{key.title}</h3>
                                            <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                                                <Hash size={14}/> {key.numQuestions} Questões
                                            </p>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button 
                                                    variant="secondary" 
                                                    className="w-full bg-gray-800 text-white hover:bg-gray-700 border-none"
                                                    onClick={() => {
                                                        setEditingKey(key);
                                                        setCorrectionMode(key);
                                                        setViewState('correction');
                                                        // Load fake/mock print html
                                                        setTimeout(() => {
                                                             const tempKey = key; 
                                                             setEditingKey(tempKey); // Hack to render card for print
                                                        }, 100);
                                                    }}
                                                >
                                                    Corrigir / Imprimir
                                                </Button>
                                                <Button 
                                                    variant="outline"
                                                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                                                    onClick={() => {
                                                        setActiveTab('statistics');
                                                        loadStats(key.id);
                                                    }}
                                                >
                                                    Relatório
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                    )}

                    {viewState === 'create_step1' && (
                        <div className="max-w-2xl mx-auto w-full bg-[#18181b] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                             <div className="mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Criar Nova Prova</h2>
                                <p className="text-brand-500 font-medium">Passo 1 de 2</p>
                             </div>

                             <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Título da Prova</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                                        placeholder="53454"
                                        value={newKeyTitle}
                                        onChange={e => setNewKeyTitle(e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Descrição (Opcional)</label>
                                    <textarea 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none h-32"
                                        value={newKeyDescription}
                                        onChange={e => setNewKeyDescription(e.target.value)}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                        <Users size={16}/> Vincular Turma (Opcional)
                                    </label>
                                    <select 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                                        value={newKeyClassId}
                                        onChange={e => setNewKeyClassId(e.target.value)}
                                    >
                                        <option value="">-- Nenhuma (Cartão em branco) --</option>
                                        {classList.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-600 mt-2">Se selecionar uma turma, os cartões resposta serão gerados já com os nomes dos alunos.</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Data</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white [color-scheme:dark]"
                                            value={newKeyDate}
                                            onChange={e => setNewKeyDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Qtd. Questões</label>
                                        <input 
                                            type="number" 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white"
                                            value={newKeyQty}
                                            onChange={e => setNewKeyQty(parseInt(e.target.value))}
                                            min={1} max={100}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Alternativas</label>
                                        <select className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white">
                                            <option>A - E</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button onClick={goToStep2} className="bg-brand-600 hover:bg-brand-700 h-14 px-8 text-lg w-full md:w-auto">
                                        Próximo: Definir Gabarito <ChevronRight size={20} className="ml-2"/>
                                    </Button>
                                </div>
                             </div>
                        </div>
                    )}

                    {viewState === 'create_step2_grid' && editingKey && (
                        <div className="flex flex-col h-full max-w-7xl mx-auto w-full">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Gabarito Oficial</h2>
                                    <p className="text-gray-400">Defina as respostas corretas. Elas ficarão salvas para a correção automática.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={startCreateExam} className="text-gray-400 hover:text-white px-4">Voltar</button>
                                    <Button onClick={handleSaveKey} className="bg-green-600 hover:bg-green-700 h-12 px-8 font-bold flex items-center gap-2">
                                        Salvar Prova <Save size={18}/>
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-[#18181b] rounded-3xl border border-gray-800 p-8 shadow-2xl overflow-y-auto custom-scrollbar">
                                <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl mb-8 flex items-center gap-3 text-blue-300">
                                    <Info size={20} />
                                    <p>Clique na alternativa correta para selecionar. A seleção ficará vermelha.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                    {Array.from({ length: editingKey.numQuestions }).map((_, i) => {
                                        const qNum = i + 1;
                                        // Agrupar em blocos de 5 visualmente
                                        const isNewBlock = (i % 5 === 0);
                                        
                                        return (
                                            <React.Fragment key={qNum}>
                                                {isNewBlock && i > 0 && <div className="hidden"></div>} 
                                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex items-center gap-4 justify-between">
                                                    <span className="text-gray-500 font-bold font-mono min-w-[30px]">#{qNum}</span>
                                                    <div className="flex gap-2">
                                                        {['A','B','C','D','E'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => toggleAnswer(qNum, opt)}
                                                                className={`
                                                                    w-10 h-10 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center
                                                                    ${editingKey.correctAnswers[qNum] === opt 
                                                                        ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-110' 
                                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
                                                                `}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {viewState === 'correction' && editingKey && (
                        <div className="flex flex-col lg:flex-row gap-8 h-full">
                            {/* Hidden Print Card Area (For Logic) */}
                            <div className="hidden">
                                <div id="print-card" className="bg-white text-black p-8 max-w-[210mm] mx-auto">
                                    {/* CABEÇALHO ENEM */}
                                    <div className="border-2 border-black mb-4">
                                        <div className="grid grid-cols-4 divide-x-2 divide-black border-b-2 border-black">
                                            <div className="col-span-3 p-2">
                                                <p className="text-[10px] font-bold uppercase mb-1">Nome do Participante</p>
                                                <div className="h-6 bg-gray-100/50"></div>
                                            </div>
                                            <div className="p-2">
                                                <p className="text-[10px] font-bold uppercase mb-1">Turma</p>
                                                <div className="h-6"></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x-2 divide-black">
                                             <div className="p-2">
                                                <p className="text-[10px] font-bold uppercase mb-1">Assinatura do Participante</p>
                                                <div className="h-8"></div>
                                            </div>
                                            <div className="p-2 flex flex-col justify-center items-center bg-gray-100">
                                                <p className="text-xs font-bold uppercase">{editingKey.title}</p>
                                                <p className="text-[10px]">PROVA / AVALIAÇÃO</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* INSTRUÇÕES E EXEMPLO */}
                                    <div className="flex justify-between items-end mb-4 gap-4">
                                        <div className="text-[10px] flex-1 text-justify leading-tight">
                                            <strong>INSTRUÇÕES:</strong> 1. Verifique se seus dados estão corretos. 2. Preencha completamente a bolinha correspondente à sua resposta. 3. Utilize caneta esferográfica de tinta preta ou azul. 4. Não rasure.
                                        </div>
                                        <div className="border border-black p-2 flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase">Exemplo:</span>
                                            <div className="w-4 h-4 rounded-full border border-black bg-black"></div>
                                            <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] relative">
                                                <div className="absolute inset-0 m-auto w-[2px] h-full bg-black rotate-45"></div>
                                                <div className="absolute inset-0 m-auto w-[2px] h-full bg-black -rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRID DE RESPOSTAS (VERTICAL - 3 COLUNAS) */}
                                    <div className="relative border border-black p-4">
                                        {/* Marcadores de Canto (Scanner) */}
                                        <div className="absolute top-0 left-0 w-4 h-4 bg-black"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 bg-black"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 bg-black"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-black"></div>

                                        <div className="grid grid-cols-3 gap-8">
                                            {Array.from({ length: 3 }).map((_, colIndex) => {
                                                const itemsPerCol = Math.ceil(editingKey.numQuestions / 3);
                                                const start = colIndex * itemsPerCol;
                                                const end = Math.min(start + itemsPerCol, editingKey.numQuestions);
                                                const colItems = Array.from({ length: editingKey.numQuestions }).slice(start, end).map((__, idx) => start + idx + 1);

                                                return (
                                                    <div key={colIndex} className="space-y-1">
                                                        {colItems.map(qNum => (
                                                            <div key={qNum} className={`flex items-center justify-between text-[10px] h-6 px-1 ${qNum % 2 === 0 ? 'bg-gray-100' : ''}`}>
                                                                <span className="font-bold w-6 text-right mr-2">{qNum}</span>
                                                                <div className="flex gap-2">
                                                                    {['A','B','C','D','E'].map(opt => (
                                                                        <div key={opt} className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold">
                                                                            {opt}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Panel Esquerdo - Ações */}
                            <div className="lg:w-1/3 space-y-6">
                                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">Ações da Prova</h3>
                                    <Button onClick={handlePrintCard} className="w-full mb-3 h-12 text-lg">
                                        <Printer className="mr-2"/> Imprimir Cartões
                                    </Button>
                                    <p className="text-sm text-gray-500 text-center">
                                        Gera um PDF limpo para impressão no formato A4.
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 border-l-4 border-l-purple-600">
                                    <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                                        <ScanLine /> Correção com IA
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Tire fotos dos cartões resposta preenchidos e envie aqui. O sistema identificará as respostas e dará a nota.
                                    </p>

                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative bg-white">
                                        <div className="space-y-1 text-center">
                                            {isProcessingUpload ? (
                                                <div className="flex flex-col items-center">
                                                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                                                     <p className="text-sm font-bold text-purple-700">{correctionProgress}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600">
                                                        <label htmlFor="upload-correction" className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500">
                                                            <span>Upload de Cartões Digitalizados</span>
                                                            <input id="upload-correction" name="upload-correction" type="file" multiple accept="image/*" className="sr-only" onChange={handleFileUploadCorrection} />
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-gray-500">JPG, PNG (Fotos nítidas)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button variant="secondary" onClick={() => setViewState('list')} className="w-full">
                                    Voltar para Lista
                                </Button>
                            </div>

                            {/* Painel Direito - Correção Manual */}
                            <div className="lg:w-2/3 bg-[#18181b] rounded-2xl border border-gray-800 p-8 shadow-2xl">
                                 <h3 className="text-xl font-bold text-white mb-6">Correção Manual (Calculadora)</h3>
                                 <div className="grid grid-cols-5 gap-2 mb-8 max-h-[400px] overflow-y-auto">
                                    {Array.from({ length: editingKey.numQuestions }).map((_, i) => {
                                        const qNum = i + 1;
                                        return (
                                            <div key={qNum} className="flex flex-col items-center bg-gray-900 p-2 rounded border border-gray-800">
                                                <span className="text-xs text-gray-500 mb-1">#{qNum}</span>
                                                <select 
                                                    className={`w-full bg-black text-white text-center font-bold rounded border ${studentAnswers[qNum] === editingKey.correctAnswers[qNum] ? 'border-green-500 text-green-500' : 'border-gray-700'}`}
                                                    value={studentAnswers[qNum] || ''}
                                                    onChange={e => setStudentAnswers({...studentAnswers, [qNum]: e.target.value})}
                                                >
                                                    <option value="">-</option>
                                                    {['A','B','C','D','E'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                        );
                                    })}
                                 </div>
                                 
                                 <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
                                     <div>
                                         <p className="text-gray-400 text-sm">Nota Calculada</p>
                                         <p className="text-4xl font-bold text-white">{calculatedScore !== null ? calculatedScore.toFixed(1) : '--'}</p>
                                     </div>
                                     <Button onClick={handleCorrectStudent} className="h-12 px-8">Calcular & Salvar</Button>
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'statistics' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart2 className="text-brand-500"/> Relatórios e Estatísticas
                        </h2>
                        <select 
                            className="bg-white border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 w-64"
                            onChange={e => loadStats(e.target.value)}
                            value={statsKeyId}
                        >
                            <option value="">Selecione uma Prova...</option>
                            {answerKeys.map(k => (
                                <option key={k.id} value={k.id}>{k.title}</option>
                            ))}
                        </select>
                    </div>

                    {statsKeyId && selectedStatsKey ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-blue-500">
                                    <p className="text-sm text-gray-500">Total Corrigidas</p>
                                    <p className="text-2xl font-bold text-gray-900">{corrections.length}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-green-500">
                                    <p className="text-sm text-gray-500">Média da Turma</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {corrections.length > 0 
                                            ? (corrections.reduce((acc, c) => acc + c.score, 0) / corrections.length).toFixed(1) 
                                            : '0.0'}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-yellow-500">
                                    <p className="text-sm text-gray-500">Maior Nota</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {corrections.length > 0 ? Math.max(...corrections.map(c => c.score)).toFixed(1) : '0.0'}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-l-red-500">
                                    <p className="text-sm text-gray-500">Menor Nota</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {corrections.length > 0 ? Math.min(...corrections.map(c => c.score)).toFixed(1) : '0.0'}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-6 rounded-2xl shadow-xl">
                                    <h3 className="font-bold text-gray-800 mb-4">Desempenho por Questão (% Acerto)</h3>
                                    <div className="h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {Array.from({ length: selectedStatsKey.numQuestions }).map((_, i) => {
                                            const qNum = i + 1;
                                            const rate = getQuestionHitRate(qNum);
                                            return (
                                                <div key={qNum} className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold w-6 text-gray-500">Q{qNum}</span>
                                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                            style={{ width: `${rate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-bold w-8 text-right">{rate.toFixed(0)}%</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-xl">
                                    <h3 className="font-bold text-gray-800 mb-4">Lista de Alunos</h3>
                                    <div className="overflow-auto max-h-64">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2">Nome</th>
                                                    <th className="px-4 py-2 text-right">Acertos</th>
                                                    <th className="px-4 py-2 text-right">Nota</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {corrections.map(c => (
                                                    <tr key={c.id}>
                                                        <td className="px-4 py-2 font-medium text-gray-900">{c.studentName}</td>
                                                        <td className="px-4 py-2 text-right text-gray-500">{c.hits.length}/{selectedStatsKey.numQuestions}</td>
                                                        <td className={`px-4 py-2 text-right font-bold ${c.score >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {c.score.toFixed(1)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            <BarChart2 className="mx-auto h-16 w-16 mb-4 opacity-20" />
                            <p>Selecione uma prova acima para ver os dados.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};