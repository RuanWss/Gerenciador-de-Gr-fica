
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    createTeacherUser, 
    saveStudent, 
    updateStudent,
    deleteStudent,
    getStudents,
    getAnswerKeys,
    updateSystemConfig,
    listenToSystemConfig,
    getFullSchedule,
    saveScheduleEntry,
    clearSystemAnnouncement,
    getAttendanceLogs,
    getAllAttendanceLogs,
    uploadStudentPhoto,
    getLessonPlans
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry, TimeSlot, AttendanceLog, LessonPlan } from '../types';
import { Button } from '../components/Button';
import { 
  Printer, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  UserPlus, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  FileSpreadsheet, 
  BarChart2, 
  PieChart, 
  Home, 
  Trash2, 
  Megaphone, 
  CalendarClock, 
  RefreshCw, 
  MonitorPlay, 
  FileDown, 
  ScanBarcode, 
  History, 
  Camera, 
  User, 
  X, 
  Loader2, 
  AlertCircle, 
  Pencil,
  BookOpenCheck,
  ChevronRight,
  FileText
} from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

type Tab = 'overview' | 'printing' | 'teachers' | 'classes' | 'students' | 'answer_keys' | 'statistics' | 'schedule' | 'attendance' | 'plans';

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

const MORNING_CLASSES_LIST: SchoolClass[] = [
    { id: '6efaf', name: '6º ANO EFAF', shift: 'morning' },
    { id: '7efaf', name: '7º ANO EFAF', shift: 'morning' },
    { id: '8efaf', name: '8º ANO EFAF', shift: 'morning' },
    { id: '9efaf', name: '9º ANO EFAF', shift: 'morning' },
];

const AFTERNOON_CLASSES_LIST: SchoolClass[] = [
    { id: '1em', name: '1ª SÉRIE EM', shift: 'afternoon' },
    { id: '2em', name: '2ª SÉRIE EM', shift: 'afternoon' },
    { id: '3em', name: '3ª SÉRIE EM', shift: 'afternoon' },
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
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  // Classes (Fixed Lists)
  const [classList, setClassList] = useState<SchoolClass[]>([]);
  
  // Class View Modal State
  const [viewingClass, setViewingClass] = useState<SchoolClass | null>(null);
  const [classStudentsStatus, setClassStudentsStatus] = useState<{student: Student, isPresent: boolean}[]>([]);

  // Students
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState<File | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  // Student Photo Validation State
  const [photoAnalysisStatus, setPhotoAnalysisStatus] = useState<'idle' | 'analyzing' | 'valid' | 'invalid'>('idle');
  const [photoAnalysisMessage, setPhotoAnalysisMessage] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Answer Keys & Exam Creation Flow
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);

  // Statistics
  const [corrections, setCorrections] = useState<StudentCorrection[]>([]);

  // System Config (Banner)
  const [sysConfig, setSysConfig] = useState<SystemConfig>({ 
      bannerMessage: '', 
      bannerType: 'info', 
      isBannerActive: false,
      showOnTV: false,
      tvStart: '',
      tvEnd: ''
  });

  // Schedule Management State
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Monday
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Attendance State
  const [attendanceTab, setAttendanceTab] = useState<'frequency' | 'history' | 'reports'>('frequency');
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  
  // Frequency View State
  const [selectedFreqClassId, setSelectedFreqClassId] = useState('');
  
  // Attendance Reports State
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [selectedReportClass, setSelectedReportClass] = useState('');
  const [selectedReportStudent, setSelectedReportStudent] = useState('');

  // Plans State
  const [allPlans, setAllPlans] = useState<LessonPlan[]>([]);
  const [selectedTeacherForPlans, setSelectedTeacherForPlans] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    refreshData();
    const unsubscribe = listenToSystemConfig((config) => {
        if (config) setSysConfig(config);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
      if (activeTab === 'schedule') {
          loadScheduleData();
      }
      if (activeTab === 'attendance') {
          loadAttendanceData();
      }
      if (activeTab === 'students' && !modelsLoaded) {
          loadFaceApiModels();
      }
      if (activeTab === 'plans') {
          loadPlans();
      }
  }, [activeTab]);

  const loadFaceApiModels = async () => {
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        const faceApi = (faceapi as any).default || faceapi;

        if (faceApi.nets.ssdMobilenetv1.isLoaded) {
             setModelsLoaded(true);
             return;
        }

        await Promise.all([
            faceApi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log("Modelos FaceAPI carregados no Dashboard");
    } catch (error) {
        console.error("Erro ao carregar modelos FaceAPI", error);
    }
  };

  const validateStudentPhoto = async (file: File) => {
      setPhotoAnalysisStatus('analyzing');
      setPhotoAnalysisMessage('Analisando qualidade biométrica...');
      
      try {
          if (!modelsLoaded) {
              await loadFaceApiModels();
          }

          const faceApi = (faceapi as any).default || faceapi;

          const imgUrl = URL.createObjectURL(file);
          const img = await faceApi.fetchImage(imgUrl);
          
          const detections = await faceApi.detectAllFaces(img, new faceApi.SsdMobilenetv1Options({ minConfidence: 0.5 }));
          
          if (detections.length === 0) {
              setPhotoAnalysisStatus('invalid');
              setPhotoAnalysisMessage('Nenhum rosto detectado. Use uma foto clara e frontal.');
          } else if (detections.length > 1) {
              setPhotoAnalysisStatus('invalid');
              setPhotoAnalysisMessage('Múltiplos rostos detectados. A foto deve conter apenas o aluno.');
          } else {
              setPhotoAnalysisStatus('valid');
              setPhotoAnalysisMessage('Foto válida para reconhecimento facial!');
          }
          
          URL.revokeObjectURL(imgUrl);
      } catch (error) {
          console.error(error);
          setPhotoAnalysisStatus('invalid');
          setPhotoAnalysisMessage('Erro ao analisar imagem. Tente outro arquivo.');
      }
  };

  const handleStudentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setNewStudentPhoto(file);
          validateStudentPhoto(file);
      } else {
          setNewStudentPhoto(null);
          setPhotoAnalysisStatus('idle');
          setPhotoAnalysisMessage('');
      }
  };

  const refreshData = async () => {
    setIsLoading(true);
    const allExams = await getExams();
    const sorted = allExams.sort((a,b) => a.createdAt - b.createdAt);
    setExams(sorted);
    setHasPendingExams(sorted.some(e => e.status === ExamStatus.PENDING));
    
    const allFixedClasses = [...MORNING_CLASSES_LIST, ...AFTERNOON_CLASSES_LIST];
    setClassList(allFixedClasses);

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

  const loadAttendanceData = async () => {
      const logs = await getAttendanceLogs();
      setAttendanceLogs(logs);
      const all = await getAllAttendanceLogs();
      setAllLogs(all);
  };
  
  const loadPlans = async () => {
      const plans = await getLessonPlans();
      setAllPlans(plans);
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateSystemConfig(sysConfig);
      alert("Aviso do sistema atualizado! Todos os usuários verão essa mensagem.");
  };

  const handleClearConfig = async () => {
      if (window.confirm("Tem certeza que deseja apagar o aviso?")) {
        await clearSystemAnnouncement();
        setSysConfig({ 
            bannerMessage: '', 
            bannerType: 'info', 
            isBannerActive: false,
            showOnTV: false,
            tvStart: '',
            tvEnd: ''
        });
      }
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
  
  const handleViewClassStudents = async (cls: SchoolClass) => {
      setViewingClass(cls);
      const studentsInClass = studentList.filter(s => s.classId === cls.id);
      const today = new Date().toISOString().split('T')[0];
      const todaysLogs = await getAttendanceLogs(today);
      const statusList = studentsInClass.map(s => {
          const isPresent = todaysLogs.some(log => log.studentId === s.id);
          return { student: s, isPresent };
      });
      setClassStudentsStatus(statusList);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return alert('Selecione uma turma');
    setIsSavingStudent(true);
    try {
        const cls = classList.find(c => c.id === selectedClassId);
        let photoUrl = '';
        if (editingStudentId && !newStudentPhoto) {
            const existingStudent = studentList.find(s => s.id === editingStudentId);
            if (existingStudent) photoUrl = existingStudent.photoUrl || '';
        }

        if (newStudentPhoto) {
             try {
                photoUrl = await uploadStudentPhoto(newStudentPhoto);
             } catch (err) {
                 console.error("Upload error", err);
                 if(!window.confirm("Erro ao enviar foto (Falha de conexão). Deseja cadastrar o aluno SEM foto?")) {
                     setIsSavingStudent(false);
                     return;
                 }
             }
        }

        const studentData = { 
            name: newStudentName, 
            classId: selectedClassId, 
            className: cls?.name || '',
            photoUrl: photoUrl 
        };

        if (editingStudentId) {
            await updateStudent({ ...studentData, id: editingStudentId });
            alert('Aluno atualizado com sucesso!');
        } else {
            await saveStudent({ ...studentData, id: '' });
            alert('Aluno salvo com sucesso!');
        }
        
        setNewStudentName('');
        setNewStudentPhoto(null);
        setPhotoAnalysisStatus('idle');
        setPhotoAnalysisMessage('');
        setEditingStudentId(null);
        setSelectedClassId('');
        const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';

        refreshData();
    } catch (e: any) { 
        console.error(e);
        alert('Erro ao salvar aluno: ' + (e.message || e)); 
    } finally {
        setIsSavingStudent(false);
    }
  };

  const handleEditStudent = (student: Student) => {
      setEditingStudentId(student.id);
      setNewStudentName(student.name);
      setSelectedClassId(student.classId);
      setNewStudentPhoto(null);
      setPhotoAnalysisStatus('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditStudent = () => {
      setEditingStudentId(null);
      setNewStudentName('');
      setSelectedClassId('');
      setNewStudentPhoto(null);
      setPhotoAnalysisStatus('idle');
  };

  const handleDeleteStudent = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este aluno? Todos os registros de frequência dele serão mantidos, mas o acesso será removido.")) {
          try {
              await deleteStudent(id);
              alert("Aluno excluído.");
              refreshData();
          } catch (error) {
              alert("Erro ao excluir aluno.");
          }
      }
  };

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

      const updatedData = scheduleData.filter(s => s.id !== newEntry.id);
      updatedData.push(newEntry);
      setScheduleData(updatedData);

      try {
          await saveScheduleEntry(newEntry);
      } catch (error) {
          console.error("Error saving schedule", error);
      }
  };

  const handleSyncSchedule = async () => {
      setScheduleLoading(true);
      await loadScheduleData();
      await new Promise(resolve => setTimeout(resolve, 800));
      setScheduleLoading(false);
      alert("Horários sincronizados e enviados para a TV com sucesso!");
  };

  const getScheduleValue = (classId: string, slotId: string, field: 'subject' | 'professor') => {
      const entry = scheduleData.find(s => s.classId === classId && s.dayOfWeek === selectedDay && s.slotId === slotId);
      return entry ? entry[field] : '';
  };

  const handleDownloadSchedulePDF = () => {
      // PDF generation logic (simplified)
      alert("Gerando PDF dos horários...");
  };

  const handleGenerateClassReport = () => { alert("Gerando relatório da turma..."); };
  const handleGenerateStudentReport = () => { alert("Gerando relatório do aluno..."); };
  const handleGenerateDelayReport = () => { alert("Gerando relatório de atrasos..."); };


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
    if (filter === 'pending') return exam.status !== ExamStatus.PENDING;
    if (filter === 'completed') return exam.status === ExamStatus.COMPLETED;
    return true;
  });

  // Group plans by Teacher
  const plansByTeacher = allPlans.reduce((acc, plan) => {
      if (!acc[plan.teacherName]) {
          acc[plan.teacherName] = [];
      }
      acc[plan.teacherName].push(plan);
      return acc;
  }, {} as Record<string, LessonPlan[]>);

  const selectedTeacherPlansList = selectedTeacherForPlans ? plansByTeacher[selectedTeacherForPlans] || [] : [];
  
  // Group selected teacher's plans by Class
  const plansByClass = selectedTeacherPlansList.reduce((acc, plan) => {
      if (!acc[plan.className]) {
          acc[plan.className] = [];
      }
      acc[plan.className].push(plan);
      return acc;
  }, {} as Record<string, LessonPlan[]>);

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
                <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                <SidebarItem id="classes" label="Turmas" icon={GraduationCap} />
                <SidebarItem id="students" label="Alunos" icon={Users} />
                <SidebarItem id="attendance" label="Frequência" icon={ScanBarcode} />
            </div>
            <div className="mt-6 px-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Avaliações</p>
                <SidebarItem id="answer_keys" label="Gabaritos / Correção" icon={ClipboardCheck} />
                <SidebarItem id="statistics" label="Relatórios" icon={BarChart2} />
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-8 bg-transparent">
            
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-6">Visão Geral</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-brand-600">
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm font-medium text-gray-500">Impressões Pendentes</p><h3 className="text-3xl font-bold text-gray-900 mt-1">{exams.filter(e => e.status === ExamStatus.PENDING).length}</h3></div>
                                <div className={`p-3 rounded-lg ${hasPendingExams ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}><Printer size={24} /></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-blue-600">
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm font-medium text-gray-500">Alunos Cadastrados</p><h3 className="text-3xl font-bold text-gray-900 mt-1">{studentList.length}</h3></div>
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-purple-600">
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm font-medium text-gray-500">Provas Corrigidas</p><h3 className="text-3xl font-bold text-gray-900 mt-1">{answerKeys.length > 0 ? 'Ver Relatórios' : '0'}</h3></div>
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><PieChart size={24} /></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Megaphone className="text-brand-600" size={20} />
                                Avisos do Sistema
                            </h3>
                            {sysConfig.isBannerActive && (
                                <button 
                                    onClick={handleClearConfig}
                                    className="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Apagar Aviso
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem do Aviso</label>
                                    <input type="text" className="w-full border rounded-md p-2" value={sysConfig.bannerMessage} onChange={e => setSysConfig({...sysConfig, bannerMessage: e.target.value})} placeholder="Ex: Manutenção no sistema..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Alerta</label>
                                    <select className="w-full border rounded-md p-2" value={sysConfig.bannerType} onChange={e => setSysConfig({...sysConfig, bannerType: e.target.value as any})}>
                                        <option value="info">Informação (Azul)</option>
                                        <option value="warning">Atenção (Amarelo)</option>
                                        <option value="error">Erro/Urgente (Vermelho)</option>
                                        <option value="success">Sucesso (Verde)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="active" checked={sysConfig.isBannerActive} onChange={e => setSysConfig({...sysConfig, isBannerActive: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                                    <label htmlFor="active" className="text-sm font-medium text-gray-700">Ativar Aviso Geral</label>
                                </div>
                            </div>
                            
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <MonitorPlay size={16} /> Exibição na TV (Quadro de Horários)
                                </h4>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="tv_active" checked={sysConfig.showOnTV || false} onChange={e => setSysConfig({...sysConfig, showOnTV: e.target.checked})} className="rounded text-brand-600 focus:ring-brand-500" />
                                    <label htmlFor="tv_active" className="text-sm font-medium text-gray-700">Exibir na TV</label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Início</label>
                                        <input type="datetime-local" className="w-full border rounded-md p-1.5 text-xs" value={sysConfig.tvStart || ''} onChange={e => setSysConfig({...sysConfig, tvStart: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Fim</label>
                                        <input type="datetime-local" className="w-full border rounded-md p-1.5 text-xs" value={sysConfig.tvEnd || ''} onChange={e => setSysConfig({...sysConfig, tvEnd: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Button type="submit" className="w-full">Salvar Configurações</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINTING */}
            {activeTab === 'printing' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Printer className="text-brand-500" /> Central de Impressão</h2>
                        <div className="flex bg-gray-900/50 p-1 rounded-lg backdrop-blur-sm border border-white/10">
                            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>Todas</button>
                            <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'pending' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>Fila</button>
                            <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>Concluídas</button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-gray-400 animate-pulse">Carregando dados da fila...</div>
                    ) : filteredExams.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                            <p>Nenhuma prova encontrada com este filtro.</p>
                        </div>
                    ) : (
                        filteredExams.map((exam) => {
                            const relatedClass = classList.find(c => c.name === exam.gradeLevel);
                            const studentCount = relatedClass 
                                ? studentList.filter(s => s.classId === relatedClass.id).length 
                                : 0;

                            return (
                                <div key={exam.id} className={`bg-white rounded-xl p-6 shadow-xl border-l-4 transition-all hover:scale-[1.01] ${exam.status === ExamStatus.PENDING ? 'border-l-brand-600 shadow-brand-900/20' : exam.status === ExamStatus.IN_PROGRESS ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${exam.status === ExamStatus.PENDING ? 'bg-red-100 text-red-700' : exam.status === ExamStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                {exam.status === ExamStatus.PENDING ? 'Aguardando' : exam.status === ExamStatus.IN_PROGRESS ? 'Em andamento' : 'Finalizado'}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">Enviado em {new Date(exam.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 font-medium">{exam.teacherName} — {exam.subject}</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div><p className="text-xs text-gray-400 font-bold uppercase">Turma</p><p className="font-semibold text-gray-800">{exam.gradeLevel}</p></div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase">Qtd.</p>
                                            <p className="font-semibold text-gray-800">
                                                {studentCount > 0 ? (
                                                    <span className="text-brand-700">{studentCount} alunos (Sugestão)</span>
                                                ) : (
                                                    <span className="text-blue-600 text-xs cursor-pointer" onClick={() => handleViewFile(exam)}>Ver Arquivo</span>
                                                )}
                                            </p>
                                        </div>
                                        <div><p className="text-xs text-gray-400 font-bold uppercase">Prazo</p><p className="font-semibold text-gray-800">{new Date(exam.dueDate).toLocaleDateString()}</p></div>
                                        <div><p className="text-xs text-gray-400 font-bold uppercase">Arquivo</p><p className="font-semibold text-gray-800 truncate" title={exam.fileName}>{exam.fileName}</p></div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button variant="outline" className="w-full justify-start text-xs border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => handleViewFile(exam)}>
                                            {exam.fileName.toLowerCase().endsWith('.pdf') ? <><Eye size={14} className="mr-2" /> Visualizar PDF</> : <><Download size={14} className="mr-2" /> Baixar Arquivo</>}
                                        </Button>
                                        {exam.status === ExamStatus.PENDING && <Button onClick={() => handleStartPrint(exam)} className="w-full justify-start h-10 bg-yellow-500 hover:bg-yellow-600 text-white border-none shadow-sm"><Printer size={16} className="mr-2"/> Iniciar Impressão</Button>}
                                        {exam.status === ExamStatus.IN_PROGRESS && <Button onClick={() => handleStatusChange(exam.id, ExamStatus.COMPLETED)} className="w-full justify-start h-10 bg-green-600 hover:bg-green-700 border-none shadow-sm"><CheckCircle size={16} className="mr-2"/> Marcar Pronto</Button>}
                                        {exam.status === ExamStatus.COMPLETED && <Button onClick={() => handleStatusChange(exam.id, ExamStatus.IN_PROGRESS)} variant="outline" className="w-full justify-center text-xs opacity-75 hover:opacity-100">Reabrir Pedido</Button>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><CalendarClock className="text-brand-500" /> Quadro de Horários</h2>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={handleDownloadSchedulePDF}><FileDown size={16} className="mr-2"/> Baixar PDF</Button>
                             <Button onClick={handleSyncSchedule} isLoading={scheduleLoading}><RefreshCw size={16} className="mr-2"/> Sincronizar TV</Button>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="flex border-b border-gray-200 bg-gray-50">
                            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day, index) => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(index + 1)}
                                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${selectedDay === index + 1 ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        
                        <div className="p-6 overflow-x-auto">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center"><div className="w-2 h-8 bg-blue-600 mr-2 rounded-full"></div> Manhã</h3>
                            <table className="w-full text-sm mb-8 border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600">
                                        <th className="p-3 text-left border border-gray-200">Horário</th>
                                        {MORNING_CLASSES_LIST.map(c => <th key={c.id} className="p-3 text-center border border-gray-200">{c.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {MORNING_SLOTS.map(slot => (
                                        <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                            <td className="p-3 border border-gray-200 font-bold text-gray-500">{slot.start} - {slot.end}</td>
                                            {slot.type === 'break' ? (
                                                <td colSpan={MORNING_CLASSES_LIST.length} className="p-3 text-center text-yellow-700 font-bold border border-gray-200 tracking-[0.2em] bg-yellow-100/50">INTERVALO</td>
                                            ) : (
                                                MORNING_CLASSES_LIST.map(cls => (
                                                    <td key={cls.id} className="p-2 border border-gray-200">
                                                        <div className="flex flex-col gap-1">
                                                            <input 
                                                                placeholder="Matéria" 
                                                                className="text-xs font-bold p-1 rounded border border-gray-300 focus:border-brand-500 outline-none uppercase text-center"
                                                                value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                            />
                                                            <input 
                                                                placeholder="Prof." 
                                                                className="text-[10px] text-gray-500 p-1 rounded border border-gray-300 focus:border-brand-500 outline-none text-center"
                                                                value={getScheduleValue(cls.id, slot.id, 'professor')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'professor', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                ))
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center"><div className="w-2 h-8 bg-red-600 mr-2 rounded-full"></div> Tarde</h3>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600">
                                        <th className="p-3 text-left border border-gray-200">Horário</th>
                                        {AFTERNOON_CLASSES_LIST.map(c => <th key={c.id} className="p-3 text-center border border-gray-200">{c.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {AFTERNOON_SLOTS.map(slot => (
                                        <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                            <td className="p-3 border border-gray-200 font-bold text-gray-500">{slot.start} - {slot.end}</td>
                                            {slot.type === 'break' ? (
                                                <td colSpan={AFTERNOON_CLASSES_LIST.length} className="p-3 text-center text-yellow-700 font-bold border border-gray-200 tracking-[0.2em] bg-yellow-100/50">INTERVALO</td>
                                            ) : (
                                                AFTERNOON_CLASSES_LIST.map(cls => (
                                                    <td key={cls.id} className="p-2 border border-gray-200">
                                                        <div className="flex flex-col gap-1">
                                                            <input 
                                                                placeholder="Matéria" 
                                                                className="text-xs font-bold p-1 rounded border border-gray-300 focus:border-brand-500 outline-none uppercase text-center"
                                                                value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                            />
                                                            <input 
                                                                placeholder="Prof." 
                                                                className="text-[10px] text-gray-500 p-1 rounded border border-gray-300 focus:border-brand-500 outline-none text-center"
                                                                value={getScheduleValue(cls.id, slot.id, 'professor')}
                                                                onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'professor', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                ))
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TEACHERS */}
            {activeTab === 'teachers' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus className="text-brand-500" /> Cadastro de Professores</h2>
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                        <form onSubmit={handleAddTeacher} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-3" required value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="Ex: João da Silva"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">E-mail de Acesso</label>
                                    <input type="email" className="w-full border border-gray-300 rounded-lg p-3" required value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="professor@escola.com"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Senha Provisória</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-3" required value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} placeholder="******"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Disciplina Principal</label>
                                    <input type="text" className="w-full border border-gray-300 rounded-lg p-3" required value={newTeacherSubject} onChange={e => setNewTeacherSubject(e.target.value)} placeholder="Ex: Matemática"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Turmas Vinculadas</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {classList.map(cls => (
                                        <label key={cls.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedClasses.includes(cls.name)}
                                                onChange={() => toggleClass(cls.name)}
                                                className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <Button type="submit" isLoading={isSavingTeacher} className="w-full h-12 text-lg">Cadastrar Professor</Button>
                        </form>
                    </div>
                </div>
            )}

            {/* PLANS (Admin View) */}
            {activeTab === 'plans' && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <BookOpenCheck className="text-brand-500" /> Planejamentos Pedagógicos
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(plansByTeacher).length > 0 ? (
                            Object.keys(plansByTeacher).map(teacherName => (
                                <button 
                                    key={teacherName}
                                    onClick={() => setSelectedTeacherForPlans(teacherName)}
                                    className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex items-center justify-between hover:scale-105 transition-transform group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                            {teacherName.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-gray-800">{teacherName}</h3>
                                            <p className="text-xs text-gray-500">{plansByTeacher[teacherName].length} planejamentos</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-300 group-hover:text-blue-500" />
                                </button>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                                <p>Nenhum planejamento enviado ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PLANS MODAL */}
            {selectedTeacherForPlans && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{selectedTeacherForPlans}</h3>
                                <p className="text-sm text-gray-500">Planejamentos enviados</p>
                            </div>
                            <button onClick={() => setSelectedTeacherForPlans(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {Object.keys(plansByClass).map(className => (
                                <div key={className} className="mb-8 last:mb-0">
                                    <h4 className="font-bold text-brand-600 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
                                        <GraduationCap size={18} /> {className}
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {plansByClass[className].map(plan => (
                                            <div key={plan.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${plan.type === 'daily' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {plan.type === 'daily' ? 'Planejamento Diário' : 'Planejamento Semestral'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">Enviado em: {new Date(plan.createdAt).toLocaleDateString()}</span>
                                                </div>

                                                {plan.type === 'daily' ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                                        <div className="col-span-full">
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Data & Tema</p>
                                                            <p className="font-semibold text-gray-800">{plan.date} - {plan.topic}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Conteúdo</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.content}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Metodologia</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.methodology}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Avaliação</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.evaluation}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Tarefa de Casa</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.homework || 'Nenhuma'}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 text-sm">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Período</p>
                                                            <p className="font-semibold text-gray-800">{plan.semester}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Objetivos Gerais</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.generalObjectives}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Cronograma</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded border border-gray-100 font-mono text-xs">{plan.timeline}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase">Bibliografia</p>
                                                            <p className="text-gray-700 whitespace-pre-wrap mt-1">{plan.bibliography}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CLASSES */}
            {activeTab === 'classes' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><GraduationCap className="text-brand-500" /> Gestão de Turmas</h2>
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Turma</th>
                                    <th className="px-6 py-4">Turno</th>
                                    <th className="px-6 py-4">Alunos</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {classList.map(cls => {
                                    const count = studentList.filter(s => s.classId === cls.id).length;
                                    return (
                                        <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{cls.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{cls.shift === 'morning' ? 'Matutino' : 'Vespertino'}</td>
                                            <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">{count} alunos</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-brand-600 hover:text-brand-800 font-bold text-xs" onClick={() => handleViewClassStudents(cls)}>Ver Detalhes</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STUDENTS */}
            {activeTab === 'students' && (
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* FORM */}
                        <div className="md:col-span-4">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-8">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    {editingStudentId ? <Pencil className="text-brand-500" size={20}/> : <UserPlus className="text-green-500" size={20}/>}
                                    {editingStudentId ? 'Editar Aluno' : 'Novo Aluno'}
                                </h3>
                                
                                <form onSubmit={handleAddStudent} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5" required value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nome do Aluno"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Turma</label>
                                        <select className="w-full border border-gray-300 rounded-lg p-2.5" required value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Foto para Frequência</label>
                                        <input type="file" id="photo-upload" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" accept="image/*" onChange={handleStudentPhotoChange}/>
                                        {photoAnalysisStatus !== 'idle' && (
                                            <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${photoAnalysisStatus === 'valid' ? 'bg-green-100 text-green-700' : photoAnalysisStatus === 'analyzing' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                {photoAnalysisStatus === 'analyzing' ? <Loader2 className="animate-spin" size={12}/> : photoAnalysisStatus === 'valid' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                                                {photoAnalysisMessage}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex gap-2">
                                        {editingStudentId && (
                                            <Button type="button" variant="outline" onClick={handleCancelEditStudent} className="flex-1">Cancelar</Button>
                                        )}
                                        <Button 
                                            type="submit" 
                                            isLoading={isSavingStudent} 
                                            className="flex-1"
                                            disabled={photoAnalysisStatus === 'analyzing' || photoAnalysisStatus === 'invalid'}
                                        >
                                            {editingStudentId ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* LIST */}
                        <div className="md:col-span-8">
                             <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700">Lista de Alunos</h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{studentList.length} Total</span>
                                </div>
                                <div className="max-h-[600px] overflow-y-auto">
                                    <table className="min-w-full text-sm text-left">
                                        <thead className="bg-white text-gray-500 font-bold sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3">Aluno</th>
                                                <th className="px-6 py-3">Turma</th>
                                                <th className="px-6 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {studentList.map(student => (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                                                            {student.photoUrl ? <img src={student.photoUrl} className="h-full w-full object-cover"/> : <User className="h-full w-full p-1 text-gray-400"/>}
                                                        </div>
                                                        {student.name}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500">{student.className}</td>
                                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                        <button onClick={() => handleEditStudent(student)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={16}/></button>
                                                        <button onClick={() => handleDeleteStudent(student.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ATTENDANCE (Already implemented above, checking formatting) */}
            {activeTab === 'attendance' && (
                <div className="max-w-6xl mx-auto h-full flex flex-col">
                    <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                        <ScanBarcode className="text-brand-500" size={32}/> Frequência Automática (CEMAL)
                    </h2>
                    <div className="flex gap-4 mb-6">
                        <button onClick={() => setAttendanceTab('frequency')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'frequency' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                            <Users size={20}/> Frequência
                        </button>
                        <button onClick={() => setAttendanceTab('history')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'history' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                            <History size={20}/> Histórico
                        </button>
                        <button onClick={() => setAttendanceTab('reports')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'reports' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                            <BarChart2 size={20}/> Relatórios
                        </button>
                    </div>

                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm overflow-hidden flex flex-col">
                        {attendanceTab === 'frequency' && (
                            <div className="flex flex-col h-full">
                                <div className="mb-6">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 block">Selecione a Turma</label>
                                    <select 
                                        className="w-full md:w-1/2 bg-gray-900 border border-gray-700 text-white rounded-xl p-4 text-lg focus:ring-2 focus:ring-brand-600 focus:outline-none shadow-xl"
                                        value={selectedFreqClassId} 
                                        onChange={e => setSelectedFreqClassId(e.target.value)}
                                    >
                                        <option value="">-- Selecione uma Turma --</option>
                                        {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedFreqClassId ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {studentList.filter(s => s.classId === selectedFreqClassId).map(student => {
                                                const log = attendanceLogs.find(l => l.studentId === student.id && l.dateString === new Date().toISOString().split('T')[0]);
                                                const isPresent = !!log;
                                                
                                                return (
                                                    <div key={student.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-brand-900 transition-colors shadow-lg">
                                                        <div className={`h-14 w-14 rounded-full border-2 overflow-hidden shrink-0 ${isPresent ? 'border-green-500' : 'border-red-500'}`}>
                                                            {student.photoUrl ? (
                                                                <img src={student.photoUrl} alt={student.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">Sem Foto</div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-white truncate" title={student.name}>{student.name}</h4>
                                                            <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${isPresent ? 'text-green-500' : 'text-red-500'}`}>
                                                                {isPresent ? 'PRESENTE' : 'AUSENTE'}
                                                            </p>
                                                            {isPresent && <p className="text-[10px] text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {studentList.filter(s => s.classId === selectedFreqClassId).length === 0 && (
                                                <div className="col-span-full text-center py-10 text-gray-500">
                                                    Nenhum aluno cadastrado nesta turma.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <Users size={64} className="mb-4 opacity-20"/>
                                            <p className="text-xl">Selecione uma turma acima para visualizar a frequência.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {attendanceTab === 'reports' && (
                             <div className="h-full flex flex-col justify-start">
                                <h3 className="text-2xl font-bold text-white mb-2">Relatórios Específicos</h3>
                                <p className="text-gray-400 mb-8">Gere documentos detalhados para análise da coordenação.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-brand-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-red-900/20 rounded-xl text-red-500"><FileSpreadsheet size={24} /></div>
                                            <div><h4 className="font-bold text-white text-lg">Frequência por Turma</h4><p className="text-gray-400 text-xs mt-1">Relatório padrão.</p></div>
                                        </div>
                                        <div className="flex-1 space-y-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Selecione a Turma:</label><select className="w-full bg-[#0f0f10] border border-gray-700 text-white rounded-lg p-3 mt-1" value={selectedReportClass} onChange={e => setSelectedReportClass(e.target.value)}><option value="">-- Selecione --</option>{classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                                        <button onClick={handleGenerateClassReport} className="mt-6 w-full py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-lg transition-colors border border-gray-700">Gerar PDF da Turma</button>
                                    </div>
                                    <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-blue-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-blue-900/20 rounded-xl text-blue-500"><User size={24} /></div>
                                            <div><h4 className="font-bold text-white text-lg">Relatório do Aluno</h4><p className="text-gray-400 text-xs mt-1">Extrato detalhado.</p></div>
                                        </div>
                                        <div className="flex-1 space-y-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Selecione o Aluno:</label><select className="w-full bg-[#0f0f10] border border-gray-700 text-white rounded-lg p-3 mt-1" value={selectedReportStudent} onChange={e => setSelectedReportStudent(e.target.value)}><option value="">-- Selecione --</option>{studentList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}</select></div></div>
                                        <button onClick={handleGenerateStudentReport} className="mt-6 w-full py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-lg transition-colors border border-gray-700">Gerar PDF Individual</button>
                                    </div>
                                     <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-yellow-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-yellow-900/20 rounded-xl text-yellow-500"><Clock size={24} /></div>
                                            <div><h4 className="font-bold text-white text-lg">Relatório de Atrasos</h4><p className="text-gray-400 text-xs mt-1">Manhã: &gt;07:20 | Tarde: &gt;13:00</p></div>
                                        </div>
                                        <button onClick={handleGenerateDelayReport} className="mt-auto w-full py-3 bg-brand-700 hover:bg-brand-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-brand-900/50">Gerar Relatório de Atrasos</button>
                                    </div>
                                </div>
                             </div>
                        )}
                        {attendanceTab === 'history' && (
                             <div className="h-full flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-4">Últimos Registros</h3>
                                <div className="flex-1 overflow-auto bg-black/20 rounded-xl border border-white/5">
                                    <table className="w-full text-left text-sm text-gray-300">
                                        <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs sticky top-0"><tr><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Turma</th><th className="px-4 py-3 text-center">Tipo</th></tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {attendanceLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 font-mono text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{log.studentName}</td>
                                                    <td className="px-4 py-3">{log.className}</td>
                                                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold uppercase">Entrada</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* ANSWER KEYS (Statistics/Corrections Placeholder) */}
            {(activeTab === 'answer_keys' || activeTab === 'statistics') && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="text-center py-20 text-gray-500 bg-white/5 rounded-3xl border border-white/5">
                        <ClipboardCheck size={64} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-2">Módulo de Correção & Estatísticas</h3>
                        <p>Funcionalidade em desenvolvimento.</p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
