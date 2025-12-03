import React, { useState, useEffect, useRef } from 'react';
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
    saveScheduleEntry,
    clearSystemAnnouncement,
    logAttendance,
    getAttendanceLogs,
    getAllAttendanceLogs,
    uploadStudentPhoto
} from '../services/firebaseService';
import { correctExamWithAI } from '../services/geminiService';
import { ExamRequest, ExamStatus, UserRole, SchoolClass, Student, AnswerKey, StudentCorrection, SystemConfig, ScheduleEntry, TimeSlot, AttendanceLog } from '../types';
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
  UploadCloud,
  MonitorPlay,
  FileDown,
  ScanBarcode,
  IdCard,
  History,
  Camera
} from 'lucide-react';

type Tab = 'overview' | 'printing' | 'teachers' | 'classes' | 'students' | 'subjects' | 'answer_keys' | 'statistics' | 'schedule' | 'attendance';

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
  const [newStudentPhoto, setNewStudentPhoto] = useState<File | null>(null);
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
  const [attendanceTab, setAttendanceTab] = useState<'scanner' | 'cards' | 'history' | 'reports'>('scanner');
  const [scannerInput, setScannerInput] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<AttendanceLog | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [cardClassId, setCardClassId] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
  // Attendance Reports
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);

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
      if (activeTab === 'attendance') {
          loadAttendanceData();
          setTimeout(() => scannerInputRef.current?.focus(), 500);
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

  const loadAttendanceData = async () => {
      const logs = await getAttendanceLogs();
      setAttendanceLogs(logs);
      
      const all = await getAllAttendanceLogs();
      setAllLogs(all);
  };

  // --- HANDLERS ---

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
        let photoUrl = '';
        if (newStudentPhoto) {
            photoUrl = await uploadStudentPhoto(newStudentPhoto);
        }

        await saveStudent({ 
            id: '', 
            name: newStudentName, 
            classId: selectedClassId, 
            className: cls?.name || '',
            photoUrl: photoUrl 
        });
        alert('Aluno salvo!');
        setNewStudentName('');
        setNewStudentPhoto(null);
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
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const dayLabel = dayNames[selectedDay];

      const printWindow = window.open('', '', 'width=900,height=800');
      if (!printWindow) return;

      const html = `
        <html>
        <head>
          <title>Quadro de Horários - ${dayLabel}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 5px; color: #333; }
            h2 { text-align: center; margin-bottom: 20px; color: #666; font-size: 14px; text-transform: uppercase; }
            .turn-title { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th, td { border: 1px solid #333; padding: 8px; text-align: center; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .break { background-color: #fef3c7; font-weight: bold; color: #92400e; }
            .subject { font-weight: bold; font-size: 12px; display: block; }
            .prof { font-size: 10px; color: #555; display: block; margin-top: 2px; }
            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .break { background-color: #fef3c7 !important; }
                th { background-color: #f3f4f6 !important; }
            }
          </style>
        </head>
        <body>
            <h1>Quadro de Horários</h1>
            <h2>${dayLabel}</h2>

            <div class="turn-title">TURNO MATUTINO</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 100px;">Horário</th>
                        ${MORNING_CLASSES_LIST.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${MORNING_SLOTS.map(slot => `
                        <tr class="${slot.type === 'break' ? 'break' : ''}">
                            <td>${slot.start} - ${slot.end}</td>
                            ${slot.type === 'break' 
                                ? `<td colspan="${MORNING_CLASSES_LIST.length}">INTERVALO</td>`
                                : MORNING_CLASSES_LIST.map(cls => {
                                    const entry = scheduleData.find(s => s.classId === cls.id && s.dayOfWeek === selectedDay && s.slotId === slot.id);
                                    return `
                                        <td>
                                            <span class="subject">${entry?.subject || '-'}</span>
                                            <span class="prof">${entry?.professor || ''}</span>
                                        </td>
                                    `;
                                }).join('')
                            }
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="turn-title">TURNO VESPERTINO</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 100px;">Horário</th>
                        ${AFTERNOON_CLASSES_LIST.map(c => `<th>${c.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${AFTERNOON_SLOTS.map(slot => `
                        <tr class="${slot.type === 'break' ? 'break' : ''}">
                            <td>${slot.start} - ${slot.end}</td>
                             ${slot.type === 'break' 
                                ? `<td colspan="${AFTERNOON_CLASSES_LIST.length}">INTERVALO</td>`
                                : AFTERNOON_CLASSES_LIST.map(cls => {
                                    const entry = scheduleData.find(s => s.classId === cls.id && s.dayOfWeek === selectedDay && s.slotId === slot.id);
                                    return `
                                        <td>
                                            <span class="subject">${entry?.subject || '-'}</span>
                                            <span class="prof">${entry?.professor || ''}</span>
                                        </td>
                                    `;
                                }).join('')
                            }
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">Gerado pelo sistema SchoolPrint Manager em ${new Date().toLocaleString()}</div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
  };

  // ATTENDANCE HANDLERS
  const handleScannerInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          const code = scannerInput.trim();
          if (!code) return;

          // Buscar aluno pelo ID (que é o código do QR)
          const student = studentList.find(s => s.id === code);
          
          if (student) {
              const now = new Date();
              const dateString = now.toISOString().split('T')[0];
              const log: AttendanceLog = {
                  id: '',
                  studentId: student.id,
                  studentName: student.name,
                  className: student.className,
                  timestamp: now.getTime(),
                  type: 'entry',
                  dateString: dateString
              };

              await logAttendance(log);
              setLastScannedStudent(log);
              setAttendanceLogs([log, ...attendanceLogs]);
              
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(err => console.error(err));
          } else {
              alert("Aluno não encontrado ou código inválido.");
          }

          setScannerInput('');
      }
  };

  const handlePrintIDCards = () => {
      if (!cardClassId) return alert("Selecione uma turma para gerar as carteirinhas.");
      
      const studentsInClass = studentList.filter(s => s.classId === cardClassId);
      if (studentsInClass.length === 0) return alert("Nenhum aluno nesta turma.");

      const printWindow = window.open('', '', 'width=800,height=800');
      if (!printWindow) return;

      const html = `
        <html>
        <head>
            <title>Carteirinhas - ${studentsInClass[0].className}</title>
            <style>
                body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; }
                .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .id-card { 
                    border: 1px solid #ccc; border-radius: 10px; height: 250px; 
                    display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid;
                }
                .header { background: #b91c1c; color: white; padding: 10px; text-align: center; }
                .header img { height: 30px; margin-bottom: 5px; }
                .content { padding: 15px; flex: 1; display: flex; gap: 15px; align-items: center; }
                .photo-placeholder { width: 80px; height: 100px; background: #eee; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; overflow: hidden; }
                .info { flex: 1; }
                .name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
                .class { font-size: 14px; color: #555; margin-bottom: 5px; }
                .id { font-family: monospace; font-size: 12px; color: #888; }
                .qr-area { text-align: center; padding: 10px; background: #f9f9f9; border-top: 1px solid #eee; }
                @media print {
                     .id-card { border: 1px solid #000; }
                     .header { -webkit-print-color-adjust: exact; background: #b91c1c !important; }
                }
            </style>
        </head>
        <body>
            <div class="card-grid">
                ${studentsInClass.map(s => `
                    <div class="id-card">
                        <div class="header">
                            <div>CEMAL EQUIPE</div>
                            <div style="font-size: 10px;">Carteira de Identificação Estudantil</div>
                        </div>
                        <div class="content">
                            <div class="photo-placeholder">
                                ${s.photoUrl ? `<img src="${s.photoUrl}" style="width:100%; height:100%; object-fit:cover;" />` : 'SEM FOTO'}
                            </div>
                            <div class="info">
                                <div class="name">${s.name}</div>
                                <div class="class">${s.className}</div>
                                <div class="id">Matrícula: ${s.id}</div>
                            </div>
                        </div>
                        <div class="qr-area">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${s.id}" width="80" height="80" />
                        </div>
                    </div>
                `).join('')}
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
  };

  // Helper para relatorios de frequencia
  const getGroupedAttendance = () => {
      const today = new Date();
      const grouped: Record<string, number> = {};
      
      allLogs.forEach(log => {
          const logDate = new Date(log.timestamp);
          let key = '';

          if (reportPeriod === 'daily') {
              key = logDate.toLocaleDateString();
          } else if (reportPeriod === 'weekly') {
              const week = Math.ceil(logDate.getDate() / 7);
              key = `Semana ${week} - ${logDate.getMonth() + 1}/${logDate.getFullYear()}`;
          } else {
              key = `${logDate.getMonth() + 1}/${logDate.getFullYear()}`;
          }
          
          grouped[key] = (grouped[key] || 0) + 1;
      });
      return grouped;
  };

  const chartData = getGroupedAttendance();

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
             const result = await correctExamWithAI(file, correctionMode.correctAnswers, correctionMode.numQuestions);
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
         e.target.value = '';
     }
  };

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
        setTimeout(() => { printWindow.print(); }, 500);
    }
  };

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
            {activeTab === 'overview' && (
                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-6">Visão Geral</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-l-brand-600">
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm font-medium text-gray-500">Impressões Pendentes</p><h3 className="text-3xl font-bold text-gray-900 mt-1">{exams.filter(e => e.status === ExamStatus.PENDING).length}</h3></div>
                                <div className={`p-3 rounded-lg ${hasPendingExams ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}><Printer size={24} /></div>
                            </div>
                            {hasPendingExams && <p className="text-xs text-yellow-600 font-bold mt-2 animate-pulse">Atenção Necessária!</p>}
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
                </div>
            )}

            {/* Other tabs... printing, teachers, classes... same as before */}
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
                    {/* ... exams map ... */}
                </div>
            )}
            
            {activeTab === 'students' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-brand-500"/> Gestão de Alunos</h2>
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleAddStudent} className="space-y-5 mb-10 border-b border-gray-100 pb-10">
                            <h3 className="text-lg font-bold text-gray-800">Cadastrar Novo Aluno</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700">Nome do Aluno</label><input required type="text" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Selecione a Turma</label><select required className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}><option value="">Selecione...</option>{classList.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.shift === 'morning' ? 'M' : 'T'})</option>))}</select></div>
                            </div>
                            
                            {/* Upload de Foto */}
                            <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
                                <label htmlFor="photo-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="text-gray-400" size={32} />
                                        <span className="text-sm font-medium text-brand-600">Upload da Foto (Para Biometria)</span>
                                        <span className="text-xs text-gray-500">JPG, PNG (Rosto visível)</span>
                                    </div>
                                    <input 
                                        id="photo-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={e => e.target.files && setNewStudentPhoto(e.target.files[0])} 
                                    />
                                </label>
                                {newStudentPhoto && (
                                    <div className="mt-2 text-sm text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> {newStudentPhoto.name}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" isLoading={isSavingStudent} className="w-full py-3">Cadastrar Aluno</Button>
                        </form>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Lista de Alunos</h3><div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto border border-gray-200">{studentList.length > 0 ? (<table className="min-w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase border-b bg-gray-100"><tr><th className="px-4 py-3 rounded-tl-lg">Nome</th><th className="px-4 py-3 rounded-tr-lg">Turma</th></tr></thead><tbody>{studentList.map(st => (<tr key={st.id} className="border-b last:border-0 hover:bg-white transition-colors"><td className="px-4 py-3 font-medium text-gray-900">{st.name}</td><td className="px-4 py-3 text-gray-500">{st.className}</td></tr>))}</tbody></table>) : <p className="text-gray-500 text-sm text-center py-4">Nenhum aluno cadastrado.</p>}</div>
                    </div>
                </div>
            )}
            
            {activeTab === 'attendance' && (
                <div className="max-w-6xl mx-auto h-full flex flex-col">
                    <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                        <ScanBarcode className="text-brand-500" size={32}/> Frequência Automática (CEMAL)
                    </h2>

                    <div className="flex gap-4 mb-6">
                        <button onClick={() => setAttendanceTab('scanner')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'scanner' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}><ScanBarcode size={20}/> Leitor (Tempo Real)</button>
                        <button onClick={() => setAttendanceTab('cards')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'cards' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}><IdCard size={20}/> Gerar Carteirinhas</button>
                        <button onClick={() => setAttendanceTab('history')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'history' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}><History size={20}/> Histórico</button>
                        <button onClick={() => setAttendanceTab('reports')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${attendanceTab === 'reports' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}><BarChart2 size={20}/> Relatórios</button>
                    </div>

                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm overflow-hidden flex flex-col">
                        {attendanceTab === 'scanner' && (
                            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
                                <div className="mb-8 relative w-full">
                                    <input ref={scannerInputRef} type="text" autoFocus value={scannerInput} onChange={e => setScannerInput(e.target.value)} onKeyDown={handleScannerInput} className="w-full bg-black/50 border-2 border-brand-500 text-white text-3xl font-mono text-center py-6 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/30 placeholder-gray-600" placeholder="Aguardando Leitura..." />
                                    <p className="text-center text-gray-400 mt-2 text-sm">Passe o crachá no leitor ou digite a matrícula</p>
                                </div>
                                {lastScannedStudent && (
                                    <div className="bg-green-500/10 border border-green-500 rounded-2xl p-8 w-full animate-in zoom-in-95 duration-200">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="h-24 w-24 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.4)]"><CheckCircle size={48} className="text-white"/></div>
                                            <h3 className="text-3xl font-bold text-white mb-1">{lastScannedStudent.studentName}</h3>
                                            <p className="text-xl text-green-400 font-medium">{lastScannedStudent.className}</p>
                                            <p className="text-gray-400 mt-4 font-mono text-sm">Registrado em: {new Date(lastScannedStudent.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {attendanceTab === 'reports' && (
                            <div className="h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Gráfico de Frequência</h3>
                                    <div className="flex bg-black/40 rounded-lg p-1">
                                        <button onClick={() => setReportPeriod('daily')} className={`px-4 py-2 rounded-md text-sm ${reportPeriod === 'daily' ? 'bg-white text-black' : 'text-gray-400'}`}>Diário</button>
                                        <button onClick={() => setReportPeriod('weekly')} className={`px-4 py-2 rounded-md text-sm ${reportPeriod === 'weekly' ? 'bg-white text-black' : 'text-gray-400'}`}>Semanal</button>
                                        <button onClick={() => setReportPeriod('monthly')} className={`px-4 py-2 rounded-md text-sm ${reportPeriod === 'monthly' ? 'bg-white text-black' : 'text-gray-400'}`}>Mensal</button>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex items-end justify-start gap-4 p-4 overflow-x-auto">
                                    {Object.entries(chartData).map(([key, value]) => (
                                        <div key={key} className="flex flex-col items-center gap-2 group">
                                            <div className="text-white font-bold text-sm bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{value} Presenças</div>
                                            <div className="w-16 bg-brand-600 rounded-t-lg hover:bg-brand-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]" style={{ height: `${Math.min(value * 5, 300)}px`, minHeight: '10px' }}></div>
                                            <div className="text-xs text-gray-400 font-bold rotate-45 mt-2 origin-left whitespace-nowrap">{key}</div>
                                        </div>
                                    ))}
                                    {Object.keys(chartData).length === 0 && <p className="text-gray-500 w-full text-center">Sem dados suficientes para exibir gráfico.</p>}
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
                        
                        {attendanceTab === 'cards' && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <IdCard size={64} className="text-gray-500 mb-6"/>
                                <h3 className="text-2xl font-bold text-white mb-2">Gerador de Crachás Estudantis</h3>
                                <div className="flex gap-4 w-full max-w-md mt-6">
                                    <select className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg p-3" value={cardClassId} onChange={e => setCardClassId(e.target.value)}><option value="">Selecione a Turma...</option>{classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    <Button onClick={handlePrintIDCards} className="bg-brand-600 hover:bg-brand-700 px-6">Gerar PDF</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};