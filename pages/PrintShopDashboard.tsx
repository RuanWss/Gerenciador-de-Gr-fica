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
  Camera,
  FileText,
  User,
  Plus,
  X
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
  
  // Class View Modal State
  const [viewingClass, setViewingClass] = useState<SchoolClass | null>(null);
  const [classStudentsStatus, setClassStudentsStatus] = useState<{student: Student, isPresent: boolean}[]>([]);

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
  
  // Attendance Reports State
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [selectedReportClass, setSelectedReportClass] = useState('');
  const [selectedReportStudent, setSelectedReportStudent] = useState('');

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
  
  const handleViewClassStudents = async (cls: SchoolClass) => {
      setViewingClass(cls);
      
      // Buscar alunos da turma
      const studentsInClass = studentList.filter(s => s.classId === cls.id);
      
      // Buscar logs de hoje para verificar presença
      const today = new Date().toISOString().split('T')[0];
      const todaysLogs = await getAttendanceLogs(today);
      
      const statusList = studentsInClass.map(s => {
          const isPresent = todaysLogs.some(log => log.studentId === s.id);
          return { student: s, isPresent };
      });
      
      setClassStudentsStatus(statusList);
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
                  studentPhotoUrl: student.photoUrl,
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

  // --- REPORT GENERATORS (MOCK/SIMULATED) ---
  const handleGenerateClassReport = () => {
    if(!selectedReportClass) return alert("Selecione uma turma");
    const cls = classList.find(c => c.id === selectedReportClass);
    if(!cls) return;

    // Filter logs for this class
    const classLogs = allLogs.filter(l => l.className === cls.name);
    // Simple logic: Group by student and count present days
    const uniqueDates = [...new Set(classLogs.map(l => l.dateString))];
    const totalDays = uniqueDates.length || 1; 

    // Open print window
    const printWindow = window.open('', '', 'width=900,height=800');
    if(printWindow) {
        printWindow.document.write(`
            <html>
                <head><title>Frequência - ${cls.name}</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #333;">Relatório de Frequência</h1>
                    <h2 style="color: #666;">Turma: ${cls.name}</h2>
                    <p>Total de Dias Letivos (com registro): ${totalDays}</p>
                    <table style="width:100%; border-collapse: collapse; margin-top:20px;">
                        <thead>
                            <tr style="background:#eee;">
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Aluno</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:center;">Presenças</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:center;">% Frequência</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentList.filter(s => s.classId === cls.id).map(student => {
                                const presences = classLogs.filter(l => l.studentId === student.id).length;
                                const percent = ((presences / totalDays) * 100).toFixed(1);
                                return `
                                    <tr>
                                        <td style="border:1px solid #ccc; padding:8px;">${student.name}</td>
                                        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${presences}</td>
                                        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${percent}%</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const handleGenerateStudentReport = () => {
      if(!selectedReportStudent) return alert("Selecione um aluno");
      const student = studentList.find(s => s.id === selectedReportStudent);
      if(!student) return;

      const studentLogs = allLogs.filter(l => l.studentId === student.id).sort((a,b) => b.timestamp - a.timestamp);

      const printWindow = window.open('', '', 'width=900,height=800');
      if(printWindow) {
        printWindow.document.write(`
            <html>
                <head><title>Extrato - ${student.name}</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #333;">Extrato de Presença</h1>
                    <h2 style="color: #666;">Aluno: ${student.name} (${student.className})</h2>
                    <table style="width:100%; border-collapse: collapse; margin-top:20px;">
                        <thead>
                            <tr style="background:#eee;">
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Data</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Horário</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentLogs.map(log => `
                                <tr>
                                    <td style="border:1px solid #ccc; padding:8px;">${new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td style="border:1px solid #ccc; padding:8px;">${new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td style="border:1px solid #ccc; padding:8px; color:green; font-weight:bold;">PRESENTE</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const handleGenerateDelayReport = () => {
      // Define delay thresholds
      const morningLimit = 7 * 60 + 20; // 07:20 in minutes
      const afternoonLimit = 13 * 60 + 0; // 13:00 in minutes

      const delayedLogs = allLogs.filter(log => {
          const date = new Date(log.timestamp);
          const minutes = date.getHours() * 60 + date.getMinutes();
          
          // Simple heuristic: if before 12:00, it's morning shift logic
          if (date.getHours() < 12) {
              return minutes > morningLimit;
          } else {
              return minutes > afternoonLimit;
          }
      }).sort((a,b) => b.timestamp - a.timestamp);

      const printWindow = window.open('', '', 'width=900,height=800');
      if(printWindow) {
        printWindow.document.write(`
            <html>
                <head><title>Relatório de Atrasos</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #b91c1c;">Relatório de Atrasos</h1>
                    <p>Registros de entrada após 07:20 (Manhã) ou 13:00 (Tarde).</p>
                    <table style="width:100%; border-collapse: collapse; margin-top:20px;">
                        <thead>
                            <tr style="background:#eee;">
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Data</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Horário</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Aluno</th>
                                <th style="border:1px solid #ccc; padding:8px; text-align:left;">Turma</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${delayedLogs.map(log => `
                                <tr>
                                    <td style="border:1px solid #ccc; padding:8px;">${new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td style="border:1px solid #ccc; padding:8px; color:red; font-weight:bold;">${new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td style="border:1px solid #ccc; padding:8px;">${log.studentName}</td>
                                    <td style="border:1px solid #ccc; padding:8px;">${log.className}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
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
    if (filter === 'pending') return exam.status !== ExamStatus.PENDING;
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

                    {/* System Announcement Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Megaphone className="text-brand-600" size={20}/> Avisos do Sistema
                            </h3>
                            {sysConfig.bannerMessage && (
                                <button onClick={handleClearConfig} className="text-xs text-red-500 hover:text-red-700 font-bold uppercase border border-red-200 px-3 py-1 rounded hover:bg-red-50 flex items-center gap-1">
                                    <Trash2 size={12}/> Apagar Aviso
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleUpdateConfig} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mensagem do Aviso</label>
                                <textarea rows={2} className="mt-1 w-full bg-gray-50 border-gray-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500" placeholder="Ex: Sistema em manutenção das 14h às 16h" value={sysConfig.bannerMessage} onChange={e => setSysConfig({...sysConfig, bannerMessage: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tipo de Alerta</label>
                                    <select className="mt-1 w-full bg-gray-50 border-gray-300 rounded-lg p-3 text-sm" value={sysConfig.bannerType} onChange={e => setSysConfig({...sysConfig, bannerType: e.target.value as any})}>
                                        <option value="info">Azul (Informativo)</option>
                                        <option value="warning">Amarelo (Atenção)</option>
                                        <option value="error">Vermelho (Urgente)</option>
                                        <option value="success">Verde (Sucesso)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    <div className="flex items-center">
                                        <input type="checkbox" id="activeBanner" className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded" checked={sysConfig.isBannerActive} onChange={e => setSysConfig({...sysConfig, isBannerActive: e.target.checked})} />
                                        <label htmlFor="activeBanner" className="ml-2 block text-sm text-gray-900 font-bold">Ativar Aviso Geral</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" id="tvBanner" className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded" checked={sysConfig.showOnTV} onChange={e => setSysConfig({...sysConfig, showOnTV: e.target.checked})} />
                                        <label htmlFor="tvBanner" className="ml-2 block text-sm text-gray-900 font-bold">Exibir na TV</label>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Agendamento para TV */}
                            {sysConfig.showOnTV && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início (Opcional)</label>
                                        <input type="datetime-local" className="w-full text-sm p-2 border rounded" value={sysConfig.tvStart || ''} onChange={e => setSysConfig({...sysConfig, tvStart: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim (Opcional)</label>
                                        <input type="datetime-local" className="w-full text-sm p-2 border rounded" value={sysConfig.tvEnd || ''} onChange={e => setSysConfig({...sysConfig, tvEnd: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button type="submit">Salvar Configuração</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {activeTab === 'classes' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><GraduationCap className="text-brand-500"/> Gestão de Turmas</h2>
                    
                    {/* MODAL DE ALUNOS DA TURMA */}
                    {viewingClass && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                                <div className="p-6 bg-brand-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{viewingClass.name}</h3>
                                        <p className="text-red-200 text-sm">Lista de Alunos e Frequência de Hoje</p>
                                    </div>
                                    <button onClick={() => setViewingClass(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X size={20} /></button>
                                </div>
                                <div className="p-0 max-h-[60vh] overflow-y-auto">
                                    {classStudentsStatus.length > 0 ? (
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-3 font-bold border-b">Aluno</th>
                                                    <th className="px-6 py-3 font-bold border-b text-center">Status Hoje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {classStudentsStatus.map(({student, isPresent}) => (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {isPresent ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    <CheckCircle size={12} className="mr-1"/> PRESENTE
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    <AlertTriangle size={12} className="mr-1"/> AUSENTE
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-10 text-center text-gray-500">
                                            <Users size={48} className="mx-auto mb-2 opacity-20"/>
                                            <p>Nenhum aluno cadastrado nesta turma.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 border-t flex justify-end">
                                    <Button variant="secondary" onClick={() => setViewingClass(null)}>Fechar</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleAddClass} className="mb-10 border-b border-gray-100 pb-10">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Nova Turma</h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1"><label className="block text-sm font-medium text-gray-700">Nome da Turma</label><input required className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" placeholder="Ex: 6º Ano A" value={newClassName} onChange={e => setNewClassName(e.target.value)} /></div>
                                <div className="w-48"><label className="block text-sm font-medium text-gray-700">Turno</label><select className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newClassShift} onChange={e => setNewClassShift(e.target.value as any)}><option value="morning">Manhã</option><option value="afternoon">Tarde</option></select></div>
                                <Button type="submit" isLoading={isSavingClass} className="py-3 px-6">Adicionar</Button>
                            </div>
                        </form>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Turmas Cadastradas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {classList.map(c => (
                                <div key={c.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex justify-between items-center group hover:border-brand-200 transition-colors">
                                    <div><p className="font-bold text-gray-900">{c.name}</p><p className="text-xs text-gray-500 uppercase">{c.shift === 'morning' ? 'Matutino' : 'Vespertino'}</p></div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xs" title="Total de Alunos">{studentList.filter(s => s.classId === c.id).length}</div>
                                        <button 
                                            onClick={() => handleViewClassStudents(c)}
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-gray-500 hover:text-brand-600 hover:border-brand-500 transition-all shadow-sm"
                                            title="Ver Alunos e Presença"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ... other tabs remain unchanged ... */}
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
                        filteredExams.map((exam) => (
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
                                <div><p className="text-xs text-gray-400 font-bold uppercase">Qtd.</p><p className="font-semibold text-gray-800">{exam.quantity > 0 ? <>{exam.quantity} cópias</> : <span className="text-blue-600 text-xs cursor-pointer" onClick={() => handleViewFile(exam)}>Ver Arquivo</span>}</p></div>
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
                        ))
                    )}
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
                            <div className="h-full flex flex-col justify-start">
                                <h3 className="text-2xl font-bold text-white mb-2">Relatórios Específicos</h3>
                                <p className="text-gray-400 mb-8">Gere documentos detalhados para análise da coordenação.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* CARD 1: Frequência por Turma */}
                                    <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-brand-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-red-900/20 rounded-xl text-red-500">
                                                <FileSpreadsheet size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Frequência por Turma</h4>
                                                <p className="text-gray-400 text-xs mt-1">Relatório padrão com a frequência % de todos os alunos de uma turma.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Selecione a Turma:</label>
                                                <select className="w-full bg-[#0f0f10] border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-brand-900 focus:outline-none"
                                                    value={selectedReportClass} onChange={e => setSelectedReportClass(e.target.value)}>
                                                    <option value="">-- Selecione --</option>
                                                    {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleGenerateClassReport} className="mt-6 w-full py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-lg transition-colors border border-gray-700">
                                            Gerar PDF da Turma
                                        </button>
                                    </div>

                                    {/* CARD 2: Relatório do Aluno */}
                                    <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-blue-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-blue-900/20 rounded-xl text-blue-500">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Relatório do Aluno</h4>
                                                <p className="text-gray-400 text-xs mt-1">Extrato detalhado de presenças e faltas de um único aluno.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Selecione o Aluno:</label>
                                                <select className="w-full bg-[#0f0f10] border border-gray-700 text-white rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                                                    value={selectedReportStudent} onChange={e => setSelectedReportStudent(e.target.value)}>
                                                    <option value="">-- Selecione --</option>
                                                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleGenerateStudentReport} className="mt-6 w-full py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-lg transition-colors border border-gray-700">
                                            Gerar PDF Individual
                                        </button>
                                    </div>

                                    {/* CARD 3: Relatório de Atrasos */}
                                    <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col hover:border-yellow-900 transition-colors">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-yellow-900/20 rounded-xl text-yellow-500">
                                                <Clock size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Relatório de Atrasos</h4>
                                                <p className="text-gray-400 text-xs mt-1">Lista alunos que registraram presença após o horário limite.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 space-y-4">
                                            <div className="bg-[#0f0f10] p-4 rounded-lg border border-gray-700">
                                                <ul className="text-sm text-gray-400 space-y-2">
                                                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> Manhã: Após <span className="text-red-400 font-bold">07:20</span></li>
                                                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> Tarde: Após <span className="text-red-400 font-bold">13:00</span></li>
                                                </ul>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleGenerateDelayReport} className="mt-6 w-full py-3 bg-brand-700 hover:bg-brand-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-brand-900/50">
                                            Gerar Relatório de Atrasos
                                        </button>
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
            
             {/* ... remaining unchanged tabs ... */}
             {activeTab === 'schedule' && (
                 <div className="max-w-6xl mx-auto h-full flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <CalendarClock className="text-brand-500" size={32}/> Quadro de Horários
                        </h2>
                        <div className="flex items-center gap-2">
                             <Button onClick={handleSyncSchedule} isLoading={scheduleLoading} className="bg-brand-600 hover:bg-brand-700">
                                 <RefreshCw size={18} className="mr-2"/> Atualizar TV
                             </Button>
                             <Button onClick={handleDownloadSchedulePDF} variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100">
                                 <FileDown size={18} className="mr-2"/> Baixar PDF
                             </Button>
                             <button 
                                onClick={() => window.open('/#horarios', '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors border border-gray-700"
                             >
                                <MonitorPlay size={18} />
                                Abrir Modo TV
                             </button>
                        </div>
                     </div>

                     <div className="flex bg-gray-900/50 p-1 rounded-lg backdrop-blur-sm border border-white/10 w-fit mb-6">
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map((day, idx) => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(idx + 1)}
                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${selectedDay === idx + 1 ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            >
                                {day}
                            </button>
                        ))}
                     </div>

                     <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                         <div className="flex-1 overflow-y-auto p-6">
                             
                             <h3 className="text-lg font-bold text-brand-700 uppercase mb-4 border-b pb-2">Turno Matutino</h3>
                             <div className="overflow-x-auto mb-8">
                                 <table className="min-w-full border-collapse">
                                     <thead>
                                         <tr>
                                             <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase bg-gray-50 border border-gray-200 sticky left-0 z-10 w-32">Horário</th>
                                             {MORNING_CLASSES_LIST.map(cls => (
                                                 <th key={cls.id} className="p-3 text-center text-xs font-bold text-gray-600 uppercase bg-gray-50 border border-gray-200 min-w-[200px]">{cls.name}</th>
                                             ))}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {MORNING_SLOTS.map(slot => (
                                             <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : ''}>
                                                 <td className="p-3 text-xs font-bold text-gray-600 border border-gray-200 bg-gray-50 sticky left-0 z-10">
                                                     {slot.start} - {slot.end}
                                                     <div className="text-[10px] text-gray-400 font-normal">{slot.label}</div>
                                                 </td>
                                                 {slot.type === 'break' ? (
                                                     <td colSpan={MORNING_CLASSES_LIST.length} className="p-3 text-center text-sm font-bold text-yellow-700 tracking-widest border border-yellow-200 bg-yellow-50">
                                                         RECREIO / LANCHE
                                                     </td>
                                                 ) : (
                                                     MORNING_CLASSES_LIST.map(cls => (
                                                         <td key={`${cls.id}-${slot.id}`} className="p-2 border border-gray-200 relative group">
                                                             <div className="flex flex-col gap-2">
                                                                 <input 
                                                                    type="text" 
                                                                    className="w-full text-xs font-bold text-gray-900 border border-red-900 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 placeholder-gray-300"
                                                                    placeholder="Matéria"
                                                                    value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                    onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                                 />
                                                                 <input 
                                                                    type="text" 
                                                                    className="w-full text-[10px] text-gray-900 border border-red-900 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 placeholder-gray-300"
                                                                    placeholder="Professor"
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

                             <h3 className="text-lg font-bold text-blue-700 uppercase mb-4 border-b pb-2">Turno Vespertino</h3>
                             <div className="overflow-x-auto pb-6">
                                 <table className="min-w-full border-collapse">
                                     <thead>
                                         <tr>
                                             <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase bg-gray-50 border border-gray-200 sticky left-0 z-10 w-32">Horário</th>
                                             {AFTERNOON_CLASSES_LIST.map(cls => (
                                                 <th key={cls.id} className="p-3 text-center text-xs font-bold text-gray-600 uppercase bg-gray-50 border border-gray-200 min-w-[200px]">{cls.name}</th>
                                             ))}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {AFTERNOON_SLOTS.map(slot => (
                                             <tr key={slot.id} className={slot.type === 'break' ? 'bg-yellow-50' : ''}>
                                                 <td className="p-3 text-xs font-bold text-gray-600 border border-gray-200 bg-gray-50 sticky left-0 z-10">
                                                     {slot.start} - {slot.end}
                                                     <div className="text-[10px] text-gray-400 font-normal">{slot.label}</div>
                                                 </td>
                                                 {slot.type === 'break' ? (
                                                     <td colSpan={AFTERNOON_CLASSES_LIST.length} className="p-3 text-center text-sm font-bold text-yellow-700 tracking-widest border border-yellow-200 bg-yellow-50">
                                                         RECREIO / LANCHE
                                                     </td>
                                                 ) : (
                                                     AFTERNOON_CLASSES_LIST.map(cls => (
                                                         <td key={`${cls.id}-${slot.id}`} className="p-2 border border-gray-200 relative group">
                                                             <div className="flex flex-col gap-2">
                                                                 <input 
                                                                    type="text" 
                                                                    className="w-full text-xs font-bold text-gray-900 border border-red-900 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 placeholder-gray-300"
                                                                    placeholder="Matéria"
                                                                    value={getScheduleValue(cls.id, slot.id, 'subject')}
                                                                    onChange={(e) => handleUpdateSchedule(cls.id, cls.name, slot.id, 'subject', e.target.value)}
                                                                 />
                                                                 <input 
                                                                    type="text" 
                                                                    className="w-full text-[10px] text-gray-900 border border-red-900 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500 placeholder-gray-300"
                                                                    placeholder="Professor"
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
                 </div>
             )}
             
             {/* Teacher, Answer Keys and Stats tabs... (unchanged) */}
             {activeTab === 'teachers' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus className="text-brand-500"/> Gestão de Professores</h2>
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleAddTeacher} className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Cadastrar Novo Professor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input required className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Disciplina Principal</label><input required className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newTeacherSubject} onChange={e => setNewTeacherSubject(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Email de Acesso</label><input required type="email" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Senha Provisória</label><input required type="text" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-lg p-3 border" value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} /></div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Turno & Turmas</label>
                                <div className="flex gap-4 mb-4">
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio text-brand-600" name="shift" checked={newTeacherShift === 'morning'} onChange={() => setNewTeacherShift('morning')} /><span className="ml-2 text-gray-700">Manhã (EFAI)</span></label>
                                    <label className="inline-flex items-center"><input type="radio" className="form-radio text-brand-600" name="shift" checked={newTeacherShift === 'afternoon'} onChange={() => setNewTeacherShift('afternoon')} /><span className="ml-2 text-gray-700">Tarde (Ensino Médio)</span></label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(newTeacherShift === 'morning' ? morningClasses : afternoonClasses).map(cls => (
                                        <label key={cls} className="inline-flex items-center bg-white p-2 rounded border border-gray-200 shadow-sm cursor-pointer hover:border-brand-500">
                                            <input type="checkbox" className="form-checkbox text-brand-600 rounded" checked={selectedClasses.includes(cls)} onChange={() => toggleClass(cls)} />
                                            <span className="ml-2 text-sm text-gray-700">{cls}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" isLoading={isSavingTeacher} className="w-full py-3">Salvar Professor</Button>
                        </form>
                    </div>
                </div>
             )}

             {activeTab === 'answer_keys' && (
                <div className="h-full flex flex-col">
                    {viewState === 'list' && (
                        <div className="max-w-6xl mx-auto w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-white flex items-center gap-3"><ClipboardCheck className="text-brand-500" size={32}/> Gabaritos & Correção</h2>
                                <Button onClick={startCreateExam} className="bg-brand-600 hover:bg-brand-700 px-6 py-3 rounded-xl shadow-lg shadow-brand-900/40 font-bold">
                                    <Plus className="mr-2" size={20} /> Criar Novo Gabarito
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {answerKeys.map(key => (
                                    <div key={key.id} className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 shadow-xl hover:border-brand-600/50 transition-all group relative">
                                        <button 
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors p-2"
                                            title="Excluir Prova"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-12 w-12 rounded-xl bg-brand-900/20 text-brand-500 flex items-center justify-center font-bold text-xl border border-brand-500/20">
                                                {key.numQuestions}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-brand-500 transition-colors">{key.title}</h3>
                                                <p className="text-gray-500 text-sm">Criado em {new Date(key.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mt-6">
                                            <button 
                                                onClick={() => {
                                                    setCorrectionMode(key);
                                                    setViewState('correction');
                                                }}
                                                className="flex items-center justify-center gap-2 bg-white text-gray-900 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors"
                                            >
                                                <CheckCircle size={16} /> Corrigir
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingKey(key);
                                                    setTimeout(handlePrintCard, 100);
                                                }}
                                                className="flex items-center justify-center gap-2 bg-transparent border border-gray-600 text-gray-300 py-2.5 rounded-lg font-bold text-sm hover:border-white hover:text-white transition-colors"
                                            >
                                                <Printer size={16} /> Imprimir
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Create and Edit steps (omitted for brevity, same as previous) ... */}
                    {viewState === 'create_step1' && (
                        <div className="max-w-2xl mx-auto w-full bg-[#18181b] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                             <div className="mb-8">
                                <p className="text-brand-500 font-bold uppercase tracking-widest text-xs mb-2">Passo 1 de 2</p>
                                <h2 className="text-3xl font-bold text-white">Criar Nova Prova</h2>
                             </div>
                             
                             <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Título da Prova</label>
                                    <input autoFocus type="text" className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all outline-none" value={newKeyTitle} onChange={e => setNewKeyTitle(e.target.value)} placeholder="Ex: Simulado ENEM 2024" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Descrição (Opcional)</label>
                                    <textarea rows={3} className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all outline-none" value={newKeyDescription} onChange={e => setNewKeyDescription(e.target.value)} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Users size={16}/> Vincular Turma (Opcional)</label>
                                    <select className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-600 outline-none" value={newKeyClassId} onChange={e => setNewKeyClassId(e.target.value)}>
                                        <option value="">-- Nenhuma (Cartão em branco) --</option>
                                        {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-600 mt-2">Se selecionar uma turma, os cartões resposta serão gerados já com os nomes dos alunos.</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                         <label className="block text-sm font-medium text-gray-400 mb-2">Data</label>
                                         <input type="date" className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-white [color-scheme:dark]" value={newKeyDate} onChange={e => setNewKeyDate(e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                         <label className="block text-sm font-medium text-gray-400 mb-2">Qtd. Questões</label>
                                         <input type="number" min={1} max={90} className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-white text-center font-bold" value={newKeyQty} onChange={e => setNewKeyQty(parseInt(e.target.value))} />
                                    </div>
                                    <div className="col-span-1">
                                         <label className="block text-sm font-medium text-gray-400 mb-2">Alternativas</label>
                                         <select disabled className="w-full bg-[#0f0f10] border border-gray-700 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed">
                                             <option>A - E</option>
                                         </select>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end gap-4">
                                    <button onClick={() => setViewState('list')} className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors">Cancelar</button>
                                    <button onClick={goToStep2} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-900/40 flex items-center gap-2 transition-transform hover:scale-105">
                                        Próximo: Definir Gabarito <ChevronRight size={18} />
                                    </button>
                                </div>
                             </div>
                        </div>
                    )}

                    {viewState === 'create_step2_grid' && editingKey && (
                        <div className="flex flex-col h-full">
                            <div className="bg-[#18181b] border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setViewState('create_step1')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft size={24}/></button>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Gabarito Oficial</h2>
                                        <p className="text-sm text-gray-500">Clique nas alternativas corretas para cada questão</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-900/30 border border-blue-500/30 px-4 py-2 rounded-lg flex items-center gap-3">
                                        <Info size={18} className="text-blue-400" />
                                        <span className="text-xs text-blue-200">Defina as respostas corretas para cada questão. Isso será usado para corrigir as provas automaticamente.</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-7xl mx-auto">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {Array.from({ length: editingKey.numQuestions }).map((_, i) => {
                                            const qNum = i + 1;
                                            // Adicionar cabeçalho a cada 5 questões (ou 10) para facilitar leitura
                                            const isNewBlock = (i % 5 === 0);
                                            
                                            return (
                                                <React.Fragment key={qNum}>
                                                    {isNewBlock && i > 0 && <div className="hidden"></div> /* Spacer if needed logic */}
                                                    
                                                    <div className="bg-[#0f0f10] border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center relative group hover:border-gray-700 transition-colors">
                                                        {/* Header do bloco (visual) */}
                                                        <span className="absolute top-2 left-3 text-xs font-bold text-gray-600">#{qNum}</span>
                                                        
                                                        <div className="flex gap-2 mt-4">
                                                            {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                                                const isSelected = editingKey.correctAnswers[qNum] === opt;
                                                                return (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={() => toggleAnswer(qNum, opt)}
                                                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all transform hover:scale-110 flex items-center justify-center
                                                                        ${isSelected 
                                                                            ? 'bg-brand-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)] ring-2 ring-brand-400' 
                                                                            : 'bg-[#1f1f23] text-gray-400 hover:bg-gray-700'}`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#18181b] border-t border-gray-800 p-4 shrink-0 flex justify-between items-center">
                                <button onClick={() => setViewState('list')} className="text-gray-400 hover:text-white font-medium px-4">Voltar</button>
                                <button 
                                    onClick={handleSaveKey}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-900/40 flex items-center gap-2"
                                >
                                    Salvar Prova <Save size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {viewState === 'correction' && correctionMode && (
                        <div className="h-full flex flex-col">
                            <div className="bg-[#18181b] border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setViewState('list')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft size={24}/></button>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Correção: {correctionMode.title}</h2>
                                        <p className="text-sm text-gray-500">Envie as fotos dos cartões resposta para correção automática</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-8 flex flex-col items-center justify-center">
                                <div className="bg-[#18181b] border-2 border-dashed border-gray-700 rounded-3xl p-12 text-center max-w-2xl w-full hover:border-brand-500 hover:bg-[#18181b]/50 transition-all group">
                                    <div className="w-20 h-20 bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={40} className="text-brand-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Upload de Cartões Digitalizados</h3>
                                    <p className="text-gray-400 mb-8">Arraste e solte as imagens ou PDFs dos cartões resposta aqui.<br/>O sistema irá identificar o aluno e corrigir automaticamente.</p>
                                    
                                    <label className="inline-flex cursor-pointer">
                                        <span className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-900/40 transition-colors">
                                            Selecionar Arquivos
                                        </span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            multiple 
                                            accept="image/*"
                                            onChange={handleFileUploadCorrection}
                                            disabled={isProcessingUpload}
                                        />
                                    </label>

                                    {isProcessingUpload && (
                                        <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                            <div className="flex items-center justify-center gap-3 text-brand-400 font-medium animate-pulse">
                                                <RefreshCw className="animate-spin" size={20} />
                                                {correctionProgress || "Processando..."}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 text-center">
                                    <button onClick={() => loadStats(correctionMode.id)} className="text-brand-500 hover:text-brand-400 font-medium flex items-center gap-2">
                                        Ver Resultados Parciais <ChevronRight size={16}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* HIDDEN PRINT CARD TEMPLATE (ENEM STYLE) */}
                    <div id="print-card" className="hidden">
                        {editingKey && (
                            <div className="w-[210mm] mx-auto bg-white p-8 text-black" style={{ minHeight: '297mm' }}>
                                {/* Header */}
                                <div className="border-2 border-black mb-4">
                                    <div className="flex border-b-2 border-black">
                                        <div className="w-1/5 p-2 border-r-2 border-black flex items-center justify-center">
                                             <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="w-16 grayscale" />
                                        </div>
                                        <div className="w-3/5 p-2 text-center border-r-2 border-black">
                                            <h1 className="font-bold text-xl uppercase">Cartão Resposta</h1>
                                            <h2 className="text-sm uppercase">{editingKey.title}</h2>
                                        </div>
                                        <div className="w-1/5 p-2 flex flex-col justify-center items-center bg-gray-100">
                                            <span className="text-xs font-bold">DATA</span>
                                            <div className="w-full border-b border-black my-2"></div>
                                            <span className="text-xs font-bold">TURMA</span>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="w-3/4 p-2 border-r-2 border-black">
                                            <span className="text-xs font-bold block mb-6">NOME DO PARTICIPANTE</span>
                                        </div>
                                        <div className="w-1/4 p-2">
                                            <span className="text-xs font-bold block mb-6">ASSINATURA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Instruções e Exemplo */}
                                <div className="flex gap-4 mb-6">
                                    <div className="flex-1 border border-black p-2 text-[10px]">
                                        <p className="font-bold mb-1">INSTRUÇÕES:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Use caneta esferográfica de tinta preta.</li>
                                            <li>Preencha totalmente a bolinha correspondente à sua resposta.</li>
                                            <li>Não rasure, não amasse e não dobre este cartão.</li>
                                        </ul>
                                    </div>
                                    <div className="w-1/3 border border-black p-2 flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-bold mb-1">PREENCHIMENTO CORRETO</span>
                                        <div className="w-4 h-4 rounded-full bg-black"></div>
                                    </div>
                                </div>

                                {/* Questões (Grid 3 Colunas Vertical) */}
                                <div className="relative">
                                    {/* Marcadores de canto para scanner */}
                                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-black"></div>
                                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-black"></div>
                                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-black"></div>
                                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-black"></div>

                                    <div className="grid grid-cols-3 gap-8">
                                        {/* Coluna 1 */}
                                        <div>
                                            {Array.from({ length: Math.ceil(editingKey.numQuestions / 3) }).map((_, i) => {
                                                const qNum = i + 1;
                                                return (
                                                    <div key={qNum} className={`flex items-center justify-between mb-1 px-1 ${qNum % 2 === 0 ? 'bg-gray-100' : ''}`}>
                                                        <span className="font-bold text-sm w-6">{qNum.toString().padStart(2, '0')}</span>
                                                        <div className="flex gap-1">
                                                            {['A','B','C','D','E'].map(opt => (
                                                                <div key={opt} className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold">{opt}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Coluna 2 */}
                                        <div>
                                            {Array.from({ length: Math.ceil(editingKey.numQuestions / 3) }).map((_, i) => {
                                                const qNum = i + 1 + Math.ceil(editingKey.numQuestions / 3);
                                                if (qNum > editingKey.numQuestions) return null;
                                                return (
                                                    <div key={qNum} className={`flex items-center justify-between mb-1 px-1 ${qNum % 2 === 0 ? 'bg-gray-100' : ''}`}>
                                                        <span className="font-bold text-sm w-6">{qNum.toString().padStart(2, '0')}</span>
                                                        <div className="flex gap-1">
                                                            {['A','B','C','D','E'].map(opt => (
                                                                <div key={opt} className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold">{opt}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Coluna 3 */}
                                        <div>
                                            {Array.from({ length: Math.ceil(editingKey.numQuestions / 3) }).map((_, i) => {
                                                const qNum = i + 1 + (Math.ceil(editingKey.numQuestions / 3) * 2);
                                                if (qNum > editingKey.numQuestions) return null;
                                                return (
                                                    <div key={qNum} className={`flex items-center justify-between mb-1 px-1 ${qNum % 2 === 0 ? 'bg-gray-100' : ''}`}>
                                                        <span className="font-bold text-sm w-6">{qNum.toString().padStart(2, '0')}</span>
                                                        <div className="flex gap-1">
                                                            {['A','B','C','D','E'].map(opt => (
                                                                <div key={opt} className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold">{opt}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             )}
             
            {activeTab === 'statistics' && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6">Relatórios e Estatísticas</h2>
                    <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px]">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700">Selecione a Prova para Analisar</label>
                            <select className="mt-1 block w-full bg-white border border-gray-300 rounded-lg p-3" value={statsKeyId} onChange={e => loadStats(e.target.value)}>
                                <option value="">-- Selecione --</option>
                                {answerKeys.map(k => <option key={k.id} value={k.id}>{k.title} ({new Date(k.createdAt).toLocaleDateString()})</option>)}
                            </select>
                        </div>

                        {statsKeyId && selectedStatsKey ? (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-sm text-blue-600 font-bold uppercase">Média da Turma</p>
                                        <h3 className="text-3xl font-bold text-blue-900">
                                            {corrections.length > 0 ? (corrections.reduce((acc, curr) => acc + curr.score, 0) / corrections.length).toFixed(1) : '-'}
                                        </h3>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <p className="text-sm text-green-600 font-bold uppercase">Maior Nota</p>
                                        <h3 className="text-3xl font-bold text-green-900">
                                            {corrections.length > 0 ? Math.max(...corrections.map(c => c.score)).toFixed(1) : '-'}
                                        </h3>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <p className="text-sm text-purple-600 font-bold uppercase">Total Corrigidas</p>
                                        <h3 className="text-3xl font-bold text-purple-900">{corrections.length}</h3>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 mb-4">Taxa de Acerto por Questão</h3>
                                <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4">
                                    {Array.from({ length: selectedStatsKey.numQuestions }).map((_, i) => {
                                        const qNum = i + 1;
                                        const rate = getQuestionHitRate(qNum);
                                        return (
                                            <div key={qNum} className="flex flex-col items-center group relative w-8 shrink-0">
                                                <div className="absolute bottom-full mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {rate.toFixed(0)}%
                                                </div>
                                                <div 
                                                    className={`w-full rounded-t-md transition-all ${rate > 70 ? 'bg-green-500' : rate > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                    style={{ height: `${rate}%`, minHeight: '4px' }}
                                                ></div>
                                                <span className="text-[10px] text-gray-500 mt-1 font-bold">{qNum}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Classificação Geral</h3>
                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aluno</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acertos</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota (0-10)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {corrections.sort((a,b) => b.score - a.score).map(c => (
                                                    <tr key={c.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.studentName}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.hits.length} / {selectedStatsKey.numQuestions}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{c.score.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <BarChart2 size={48} className="mb-4 opacity-20"/>
                                <p>Selecione um gabarito acima para ver as estatísticas.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};