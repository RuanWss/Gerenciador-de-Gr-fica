import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    listenToStudents,
    saveOccurrence,
    listenToOccurrences,
    deleteOccurrence,
    saveInfantilReport,
    listenToInfantilReports,
    deleteInfantilReport,
    saveStudent,
    logAttendance
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, Student, StudentOccurrence, InfantilReport, AttendanceLog } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, X, 
  Trash2, FileUp, Download, Calendar, Baby, Smile, 
  FileEdit, Save, ArrowLeft, Info, CheckCircle2, Users, UserPlus, UserPlus2, Check, Clock, UserCheck, UserX
} from 'lucide-react';

const INFANTIL_CLASSES = ["JARDIM I", "JARDIM II"];
const BIMESTERS = ["1º BIMESTRE", "2º BIMESTRE", "3º BIMESTRE", "4º BIMESTRE"] as const;

const SKILLS_CONFIG = [
  {
    category: "Linguagem Oral",
    objectives: [
      { code: "EI03EF01", desc: "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão." },
      { code: "EI03EF02", desc: "Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos." },
      { code: "EI03EF03", desc: "Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas." },
      { code: "EI03EF08", desc: "Selecionar livros e textos de gêneros conhecidos para a leitura de um adulto e/ou para sua própria leitura (partindo de seu repertório sobre esses textos, como a recuperação pela memória, pela leitura das ilustrações etc.)." }
    ]
  },
  {
    category: "Linguagem Escrita",
    objectives: [
      { code: "EI03ET04", desc: "Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea), em diferentes suportes." },
      { code: "EI03TS02", desc: "Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura, criando produções bidimensionais e tridimensionais." },
      { code: "EI03CG05_E", desc: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas." },
      { code: "EI03EF06", desc: "Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa." }
    ]
  },
  {
    category: "Linguagem Matemática",
    objectives: [
      { code: "EI03TS03", desc: "Reconhecer as qualidades do som (intensidade, duração, altura e timbre), utilizando-as em suas produções sonoras e ao ouvir músicas e sons." },
      { code: "EI03ET07", desc: "Relacionar números às suas respectivas quantidades e identificar o antes, o depois e o entre em uma sequência." },
      { code: "EI03ET08", desc: "Expressar medidas (peso, altura etc.), construindo gráficos básicos." },
      { code: "EI03ET05", desc: "Classificar objetos e figuras de acordo com suas semelhanças e diferenças." }
    ]
  },
  {
    category: "Desenvolvimento Psicomotor",
    objectives: [
      { code: "EI03CG01", desc: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música." },
      { code: "EI03CG02", desc: "Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades." },
      { code: "EI03CG03", desc: "Criar movimentos, gestos, olhares e mímicas em brincadeiras, jogos e atividades artísticas como dança, teatro, música." },
      { code: "EI03CG05_P", desc: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas." }
    ]
  },
  {
    category: "Relações Sociais e Afetivas",
    objectives: [
      { code: "EI03EO01", desc: "Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir." },
      { code: "EI03EO02", desc: "Agir de maneira independente, com confiança em suas capacidades, reconhecendo suas conquistas e limitações." },
      { code: "EI03EO03", desc: "Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação." },
      { code: "EI03EO04", desc: "Comunicar suas ideias e sentimentos a pessoas e grupos diversos." }
    ]
  }
];

export const InfantilDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'reports' | 'occurrences' | 'students_list' | 'attendance'>('requests');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [reports, setReports] = useState<InfantilReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- ATTENDANCE STATES ---
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});

  // --- EXAM FORM STATES ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(25);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // --- OCCURRENCE FORM STATES ---
  const [showOccModal, setShowOccModal] = useState(false);
  const [newOcc, setNewOcc] = useState<Partial<StudentOccurrence>>({
      studentId: '', category: 'elogio', severity: 'low', description: '', date: new Date().toISOString().split('T')[0]
  });
  const [occClass, setOccClass] = useState('');

  // --- REPORT (PARECER) STATES ---
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportClass, setReportClass] = useState('');
  const [reportBimester, setReportBimester] = useState<typeof BIMESTERS[number]>('1º BIMESTRE');
  const [reportScores, setReportScores] = useState<Record<string, 'I' | 'ED' | 'CA' | ''>>({});
  const [reportDescriptive, setReportDescriptive] = useState<Record<string, string>>({});

  // --- LIST TAB STATES ---
  const [selectedListClass, setSelectedListClass] = useState<string>('JARDIM I');

  // --- ENROLLMENT STATES ---
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentType, setEnrollmentType] = useState<'individual' | 'bulk'>('individual');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollFormData, setEnrollFormData] = useState<Partial<Student>>({
      id: '', name: '', className: '', isAEE: false
  });
  const [bulkList, setBulkList] = useState('');

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
      const unsubS = listenToStudents(setStudents);
      const unsubO = listenToOccurrences((all) => {
          setTeacherOccurrences(all.filter(o => o.reportedBy === user?.name));
      });
      const unsubR = listenToInfantilReports(user?.id || '', setReports);
      return () => { unsubS(); unsubO(); unsubR(); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        if (activeTab === 'requests') {
            const allExams = await getExams(user.id);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClass) return;
    setIsSaving(true);
    try {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const classStudents = students.filter(s => s.className === attendanceClass);
        
        for (const student of classStudents) {
            if (attendanceRecords[student.id] !== undefined) {
                const log: AttendanceLog = {
                    id: '',
                    studentId: student.id,
                    studentName: student.name,
                    className: student.className,
                    timestamp: today.getTime(),
                    dateString,
                    type: attendanceRecords[student.id] ? 'entry' : 'exit'
                };
                await logAttendance(log);
            }
        }
        alert("Frequência registrada com sucesso!");
        setActiveTab('requests');
    } catch (e) {
        alert("Erro ao registrar frequência.");
    } finally {
        setIsSaving(false);
    }
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (uploadedFiles.length === 0) return alert("Anexe as atividades.");
      setIsSaving(true);
      try {
          const fileUrls: string[] = [];
          const fileNames: string[] = [];
          for (const file of uploadedFiles) {
              const url = await uploadExamFile(file, user?.name || 'Infantil');
              fileUrls.push(url);
              fileNames.push(file.name);
          }
          await saveExam({
              id: '', teacherId: user?.id || '', teacherName: user?.name || '',
              subject: 'Infantil', title: examTitle, quantity: Number(printQty),
              gradeLevel: examGrade, instructions: 'Educação Infantil',
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Atividades enviadas para a gráfica!");
          setActiveTab('requests');
          setExamTitle(''); setUploadedFiles([]);
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  const handleSaveOccurrence = async () => {
      if (!newOcc.studentId || !newOcc.description) return alert("Preencha os campos.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === newOcc.studentId);
          await saveOccurrence({
              id: '', studentId: student?.id || '', studentName: student?.name || '',
              studentClass: student?.className || '', category: newOcc.category || 'elogio',
              severity: 'low', description: newOcc.description || '',
              date: newOcc.date || new Date().toISOString().split('T')[0],
              timestamp: Date.now(), reportedBy: user?.name || 'Professor'
          });
          setShowOccModal(false);
          alert("Registro salvo no Diário de Bordo!");
      } catch (e) { alert("Erro ao salvar."); }
      finally { setIsSaving(false); }
  };

  const handleSaveInfantilReport = async () => {
    if (!reportStudentId) return alert("Selecione o aluno.");
    setIsSaving(true);
    try {
      const student = students.find(s => s.id === reportStudentId);
      await saveInfantilReport({
        id: editingReportId || '',
        studentId: reportStudentId,
        studentName: student?.name || '',
        className: reportClass,
        bimester: reportBimester,
        teacherId: user?.id || '',
        teacherName: user?.name || '',
        createdAt: editingReportId ? reports.find(r => r.id === editingReportId)?.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now(),
        scores: reportScores,
        descriptiveText: reportDescriptive
      });
      alert("Parecer pedagógico salvo com sucesso!");
      setIsCreatingReport(false);
      resetReportForm();
    } catch (e) { alert("Erro ao salvar relatório."); }
    finally { setIsSaving(false); }
  };

  const handleEnroll = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsEnrolling(true);
      try {
          if (enrollmentType === 'individual') {
              if (!enrollFormData.id || !enrollFormData.name || !enrollFormData.className) return alert("Preencha todos os campos.");
              await saveStudent({
                  ...enrollFormData,
                  classId: enrollFormData.className,
                  isAEE: !!enrollFormData.isAEE
              } as Student);
              alert("Aluno matriculado!");
          } else {
              if (!enrollFormData.className || !bulkList.trim()) return alert("Selecione a turma e forneça os nomes.");
              const names = bulkList.split('\n').map(n => n.trim()).filter(n => n);
              for (const name of names) {
                  const id = Math.random().toString(36).substring(7).toUpperCase();
                  await saveStudent({
                      id,
                      name: name.toUpperCase(),
                      classId: enrollFormData.className,
                      className: enrollFormData.className || '',
                      isAEE: false
                  } as Student);
              }
              alert(`${names.length} alunos matriculados em lote!`);
          }
          setShowEnrollmentModal(false);
          setEnrollFormData({ id: '', name: '', className: '', isAEE: false });
          setBulkList('');
      } catch (err) {
          alert("Erro ao matricular.");
      } finally {
          setIsEnrolling(false);
      }
  };

  const resetReportForm = () => {
    setEditingReportId(null);
    setReportStudentId('');
    setReportClass('');
    setReportBimester('1º BIMESTRE');
    setReportScores({});
    setReportDescriptive({});
  };

  const editReport = (report: InfantilReport) => {
    setEditingReportId(report.id);
    setReportStudentId(report.studentId);
    setReportClass(report.className);
    setReportBimester(report.bimester || '1º BIMESTRE');
    setReportScores(report.scores);
    setReportDescriptive(report.descriptiveText);
    setIsCreatingReport(true);
  };

  const listStudents = students.filter(s => s.className === selectedListClass).sort((a,b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
        {/* SIDEBAR INFANTIL */}
        <div className="w-64 bg-[#1c1917] border-r border-orange-500/20 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-10 text-center">
                <div className="h-16 w-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                    <Baby className="text-orange-500" size={32}/>
                </div>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em]">Portal Infantil</p>
            </div>
            
            <nav className="flex-1 space-y-1">
                <button onClick={() => { setActiveTab('requests'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <List size={18} /> Minha Fila
                </button>
                <button onClick={() => { setActiveTab('create'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <PlusCircle size={18} /> Enviar Folhas
                </button>
                <button onClick={() => { setActiveTab('students_list'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'students_list' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <Users size={18} /> Alunos
                </button>
                <button onClick={() => { setActiveTab('reports'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <FileEdit size={18} /> Parecer
                </button>
                <button onClick={() => { setActiveTab('occurrences'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'occurrences' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <Smile size={18} /> Diário de Bordo
                </button>
                <button onClick={() => { setActiveTab('attendance'); setIsCreatingReport(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'text-orange-200/40 hover:bg-white/5 hover:text-white'}`}>
                    <Clock size={18} /> Frequência
                </button>
            </nav>
        </div>
        
        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            
            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto pb-40">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Diário de Frequência</h1>
                        <p className="text-orange-200/40 font-bold uppercase text-[10px] tracking-widest">Chamada diária da Educação Infantil.</p>
                    </header>
                    
                    <div className="bg-[#1c1917] border-2 border-orange-500/10 p-10 rounded-[3rem] shadow-2xl space-y-10">
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Selecione a Turma</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                                    value={attendanceClass}
                                    onChange={(e) => {
                                        setAttendanceClass(e.target.value);
                                        setAttendanceRecords({});
                                    }}
                                >
                                    <option value="">-- Escolha uma turma --</option>
                                    {INFANTIL_CLASSES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-6">
                                <span className="bg-orange-600/10 text-orange-500 border border-orange-500/20 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {attendanceClass ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-2">
                                    {students.filter(s => s.className === attendanceClass).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 group hover:bg-black/40 transition-colors">
                                            <span className="font-black text-white uppercase tracking-tight text-sm">{String(student.name || '')}</span>
                                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                                <button 
                                                    onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: true})}
                                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${attendanceRecords[student.id] === true ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}
                                                >
                                                    <UserCheck size={14}/> Presente
                                                </button>
                                                <button 
                                                    onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: false})}
                                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${attendanceRecords[student.id] === false ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}
                                                >
                                                    <UserX size={14}/> Ausente
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={handleSaveAttendance} isLoading={isSaving} className="w-full h-20 bg-orange-600 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-orange-900/40 text-sm mt-8">
                                    <Save size={24} className="mr-3"/> Confirmar Chamada do Dia
                                </Button>
                            </div>
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-orange-500/10 rounded-[2.5rem] opacity-30">
                                <Clock size={48} className="mx-auto mb-4 text-gray-500" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500">Selecione uma turma para carregar a lista de chamada</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Fila de Impressões</h1>
                        <p className="text-orange-200/40 font-bold uppercase text-[10px] tracking-[0.3em]">Acompanhe suas solicitações na gráfica</p>
                    </header>
                    <div className="bg-[#1c1917] rounded-[2.5rem] border border-orange-500/10 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-orange-500/50 uppercase text-[9px] font-black tracking-widest border-b border-orange-500/10">
                                <tr><th className="p-8">Data</th><th className="p-8">Atividade</th><th className="p-8">Turma</th><th className="p-8">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-orange-500/5">
                                {exams.length > 0 ? exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-8 text-sm text-gray-500 font-bold">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-8 font-black text-white uppercase tracking-tight">{String(e.title || '')}</td>
                                        <td className="p-8"><span className="bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black text-orange-400 uppercase">{String(e.gradeLevel || '')}</span></td>
                                        <td className="p-8">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Aguardando' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto p/ Retirar'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-30">Nenhuma solicitação ativa</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'students_list' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Alunos Matriculados</h1>
                            <p className="text-orange-200/40 font-bold uppercase text-[10px] tracking-[0.3em]">Listagem por turma (Jardim I e II)</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex gap-2">
                                <Button onClick={() => { setEnrollmentType('individual'); setShowEnrollmentModal(true); }} className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-orange-900/40">
                                    <UserPlus size={16} className="mr-2"/> Matrícula
                                </Button>
                                <Button onClick={() => { setEnrollmentType('bulk'); setShowEnrollmentModal(true); }} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-2xl">
                                    <UserPlus2 size={16} className="mr-2"/> Lote
                                </Button>
                            </div>
                            <div className="h-12 w-px bg-white/10 hidden md:block mx-2"></div>
                            <div className="flex gap-4">
                                {INFANTIL_CLASSES.map(cls => (
                                    <button 
                                        key={cls}
                                        onClick={() => setSelectedListClass(cls)}
                                        className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${selectedListClass === cls ? 'bg-orange-600 border-orange-500 text-white shadow-xl shadow-orange-900/40 scale-105' : 'bg-black/20 border-white/5 text-gray-500 hover:text-white'}`}
                                    >
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    <div className="bg-[#1c1917] rounded-[2.5rem] border border-orange-500/10 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-orange-500/50 uppercase text-[9px] font-black tracking-widest border-b border-orange-500/10">
                                <tr>
                                    <th className="p-8">Nome do Aluno</th>
                                    <th className="p-8">ID Matrícula</th>
                                    <th className="p-8 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-500/5">
                                {listStudents.length > 0 ? listStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-8">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-black text-orange-500 text-xs">
                                                    {String(student.name || '').charAt(0)}
                                                </div>
                                                <span className="font-black text-white uppercase tracking-tight">{String(student.name || '')}</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-sm text-gray-500 font-mono uppercase tracking-widest">{String(student.id || '')}</td>
                                        <td className="p-8 text-center">
                                            <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Ativo</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-30">Nenhum aluno nesta turma</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                    <div className="bg-[#1c1917] border border-orange-500/20 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Baby size={120} /></div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4">
                            <UploadCloud className="text-orange-600" size={40} /> Solicitar Cópias
                        </h2>
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título da Atividade</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all text-lg" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Pintura a dedo - Jardim I" />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none text-lg" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Selecione --</option>
                                        {INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Qtd de Cópias</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all text-lg" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Anexar Arquivo</label>
                                <div className="border-3 border-dashed border-orange-500/20 rounded-[2.5rem] p-12 text-center hover:border-orange-500 transition-all relative bg-black/20 group cursor-pointer">
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                    <FileUp className="mx-auto text-gray-700 mb-4 group-hover:text-orange-500 group-hover:scale-110 transition-all" size={56} />
                                    <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Arraste os arquivos PDF aqui</p>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {uploadedFiles.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-orange-600/5 p-4 rounded-xl border border-orange-600/20 animate-in slide-in-from-left-2">
                                            <span className="text-xs text-orange-200 font-bold truncate pr-4 uppercase">{f.name}</span>
                                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-2"><X size={18}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-orange-600 shadow-2xl shadow-orange-900/40 hover:scale-[1.02] transition-transform">Enviar p/ Produção</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && !isCreatingReport && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Pareceres Pedagógicos</h1>
                            <p className="text-orange-200/40 font-bold uppercase text-[10px] tracking-[0.3em]">Relatórios descritivos e avaliações por habilidades</p>
                        </div>
                        <Button onClick={() => { resetReportForm(); setIsCreatingReport(true); }} className="bg-orange-600 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-900/40">
                            <Plus size={18} className="mr-3"/> Novo Parecer
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reports.map(report => (
                            <div key={report.id} className="bg-[#1c1917] border border-orange-500/10 p-8 rounded-[2.5rem] shadow-xl hover:border-orange-500/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl"><FileEdit size={24}/></div>
                                    <button onClick={async () => { if(confirm("Excluir parecer?")) await deleteInfantilReport(report.id); }} className="text-gray-800 hover:text-red-500 transition-colors p-2"><Trash2 size={20}/></button>
                                </div>
                                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight truncate">{String(report.studentName || '')}</h3>
                                <div className="flex flex-col gap-1 mb-6">
                                  <p className="text-xs text-orange-500 font-black uppercase tracking-widest">{String(report.className || '')}</p>
                                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2"><Clock size={10}/> {report.bimester || '1º BIMESTRE'}</p>
                                </div>
                                <div className="mt-auto pt-6 border-t border-white/5 flex gap-2">
                                    <button onClick={() => editReport(report)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">Editar</button>
                                    <button className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-orange-900/20">Visualizar</button>
                                </div>
                            </div>
                        ))}
                        {reports.length === 0 && (
                            <div className="col-span-full py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-600">Nenhum parecer cadastrado</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && isCreatingReport && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <button onClick={() => setIsCreatingReport(false)} className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-all mb-8 font-black uppercase text-[10px] tracking-widest">
                        <ArrowLeft size={16}/> Voltar para a lista
                    </button>
                    
                    <div className="bg-[#1c1917] border border-orange-500/20 rounded-[3.5rem] shadow-2xl overflow-hidden pb-20">
                        <div className="p-12 border-b border-white/5 bg-black/20">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                                <FileEdit className="text-orange-500" size={32}/> Relatório Pedagógico Infantil
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Selecione a Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={reportClass} onChange={e => { setReportClass(e.target.value); setReportStudentId(''); }}>
                                        <option value="">-- Turma --</option>
                                        {INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Selecione o Aluno</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={reportStudentId} onChange={e => setReportStudentId(e.target.value)} disabled={!reportClass}>
                                        <option value="">-- Aluno --</option>
                                        {students.filter(s => s.className === reportClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Bimestre de Referência</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={reportBimester} onChange={e => setReportBimester(e.target.value as any)}>
                                        {BIMESTERS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-12 space-y-16">
                            {/* ESCALA INSTITUCIONAL INFO */}
                            <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-3xl flex gap-6 items-start">
                                <div className="p-3 bg-orange-500/20 text-orange-500 rounded-xl"><Info size={24}/></div>
                                <div>
                                    <h4 className="text-orange-500 font-black uppercase text-xs tracking-widest mb-4">Escala Institucional de Avaliação</h4>
                                    <div className="flex flex-wrap gap-8">
                                        <div className="flex items-center gap-2"><span className="h-6 w-10 bg-orange-500/20 rounded flex items-center justify-center font-black text-orange-500 text-[10px]">I</span> <span className="text-[10px] text-gray-400 font-bold uppercase">Inicia (com apoio frequente)</span></div>
                                        <div className="flex items-center gap-2"><span className="h-6 w-10 bg-orange-500/20 rounded flex items-center justify-center font-black text-orange-500 text-[10px]">ED</span> <span className="text-[10px] text-gray-400 font-bold uppercase">Em desenvolvimento (apoio e autonomia)</span></div>
                                        <div className="flex items-center gap-2"><span className="h-6 w-10 bg-orange-500/20 rounded flex items-center justify-center font-black text-orange-500 text-[10px]">CA</span> <span className="text-[10px] text-gray-400 font-bold uppercase">Com autonomia (com segurança)</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* SKILLS TABLE (PAGE 1) */}
                            <div className="space-y-12">
                                {SKILLS_CONFIG.map((category, catIdx) => (
                                    <div key={catIdx} className="bg-black/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
                                        <div className="bg-white/5 p-6 border-b border-white/5">
                                            <h3 className="text-orange-500 font-black uppercase text-xs tracking-widest">{category.category}</h3>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead className="bg-black/20 text-[9px] font-black uppercase text-gray-500 tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="p-6">Objetivo de Aprendizagem</th>
                                                    <th className="p-6 text-center w-64">Nível de Desenvolvimento</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {category.objectives.map((obj, objIdx) => (
                                                    <tr key={objIdx} className="hover:bg-white/[0.01]">
                                                        <td className="p-6">
                                                            <p className="text-xs font-bold text-gray-400 leading-relaxed"><span className="text-orange-500/50 mr-2">({obj.code})</span> {obj.desc}</p>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {['I', 'ED', 'CA'].map(score => (
                                                                    <button 
                                                                        key={score}
                                                                        type="button"
                                                                        onClick={() => setReportScores({...reportScores, [obj.code]: score as any})}
                                                                        className={`h-10 w-14 rounded-xl border font-black text-[10px] transition-all ${reportScores[obj.code] === score ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-gray-700 hover:text-gray-400'}`}
                                                                    >
                                                                        {score}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {/* PARECER DESCRITIVO POR CAMPO (PAGE 2) */}
                                        <div className="p-8 bg-black/10 border-t border-white/5">
                                            <label className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-4 block">Parecer Descritivo - {category.category}</label>
                                            <textarea 
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium text-sm outline-none focus:border-orange-500 transition-all min-h-[120px]"
                                                placeholder={`Escreva as observações pedagógicas sobre ${category.category}...`}
                                                value={reportDescriptive[category.category] || ''}
                                                onChange={e => setReportDescriptive({...reportDescriptive, [category.category]: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-12 border-t border-white/5 bg-black/20 flex justify-between items-center">
                            <div className="flex items-center gap-4 text-gray-500 text-xs font-bold">
                                <CheckCircle2 size={20} className="text-green-500"/> Todos os campos preenchidos serão salvos.
                            </div>
                            <Button type="button" onClick={handleSaveInfantilReport} isLoading={isSaving} className="bg-orange-600 h-20 px-12 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/40">
                                <Save size={24} className="mr-3"/> Finalizar Parecer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                    <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Bordo</h1>
                            <p className="text-orange-200/40 font-bold uppercase text-[10px] tracking-[0.3em]">Observações do desenvolvimento infantil</p>
                        </div>
                        <Button onClick={() => setShowOccModal(true)} className="bg-orange-600 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-900/40"><Smile size={18} className="mr-3"/> Registrar Evento</Button>
                    </header>
                    <div className="space-y-6">
                        {teacherOccurrences.length > 0 ? teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#1c1917] border border-orange-500/10 p-10 rounded-[3rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative group hover:border-orange-500/30 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>{String(occ.category || '')}</span>
                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{new Date(occ.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{String(occ.studentName || '')}</h3>
                                    <p className="text-xs text-orange-500 font-black uppercase tracking-widest mb-6">{String(occ.studentClass || '')}</p>
                                    <div className="bg-black/30 p-8 rounded-[2rem] text-orange-100/70 text-lg italic border border-white/5 leading-relaxed">
                                        "{String(occ.description || '')}"
                                    </div>
                                </div>
                                <button onClick={async () => { if(confirm("Excluir este registro?")) await deleteOccurrence(occ.id); }} className="absolute top-10 right-10 text-gray-800 hover:text-red-500 transition-colors p-3 bg-white/5 rounded-xl"><Trash2 size={24}/></button>
                            </div>
                        )) : (
                            <div className="py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-600">Sem registros no Diário</div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* MODAL MATRÍCULA */}
        {showEnrollmentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                <div className="bg-[#1c1917] border border-orange-500/20 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Matrícula Infantil</h3>
                            <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest mt-1">
                                {enrollmentType === 'individual' ? 'Registro Único' : 'Importação em Lote'}
                            </p>
                        </div>
                        <button onClick={() => setShowEnrollmentModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                    </div>
                    <form onSubmit={handleEnroll} className="p-10 space-y-8">
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 mb-4">
                            <button type="button" onClick={() => setEnrollmentType('individual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'individual' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Individual</button>
                            <button type="button" onClick={() => setEnrollmentType('bulk')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'bulk' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Em Lote</button>
                        </div>

                        {enrollmentType === 'individual' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">ID / Matrícula</label>
                                        <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all" value={enrollFormData.id} onChange={e => setEnrollFormData({...enrollFormData, id: e.target.value.toUpperCase()})} placeholder="EX: 2024001" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino</label>
                                        <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-orange-500" value={enrollFormData.className} onChange={e => setEnrollFormData({...enrollFormData, className: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo da Criança</label>
                                    <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all" value={enrollFormData.name} onChange={e => setEnrollFormData({...enrollFormData, name: e.target.value.toUpperCase()})} placeholder="DIGITE O NOME COMPLETO" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino (Todos da Lista)</label>
                                    <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-orange-500" value={enrollFormData.className} onChange={e => setEnrollFormData({...enrollFormData, className: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Lista de Nomes (Um por linha)</label>
                                    <textarea required className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-orange-500 transition-all h-48" value={bulkList} onChange={e => setBulkList(e.target.value)} placeholder="JOÃO SILVA&#10;MARIA OLIVEIRA&#10;PEDRO SANTOS..." />
                                </div>
                            </div>
                        )}

                        <Button type="submit" isLoading={isEnrolling} className="w-full h-20 bg-orange-600 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-900/40 text-sm">
                            <Check size={24} className="mr-3"/> Confirmar Matrícula
                        </Button>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL OCORRÊNCIA */}
        {showOccModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                <div className="bg-[#1c1917] border border-orange-500/20 w-full max-w-xl rounded-[3.5rem] shadow-2xl p-12 animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><Smile className="text-orange-500" size={32}/> Relato Pedagógico</h3>
                        <button onClick={() => setShowOccModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Turma</label>
                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={occClass} onChange={e => setOccClass(e.target.value)}><option value="">Selecione...</option>{INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Aluno</label>
                                <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={newOcc.studentId} onChange={e => setNewOcc({...newOcc, studentId: e.target.value})} disabled={!occClass}><option value="">Aguardando Turma...</option>{students.filter(s => s.className === occClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Tipo de Registro</label>
                            <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 appearance-none" value={newOcc.category} onChange={e => setNewOcc({...newOcc, category: e.target.value as any})}><option value="elogio">Elogio / Superação</option><option value="atraso">Atraso na Entrada</option><option value="outros">Relato de Desenvolvimento</option></select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">O que aconteceu?</label>
                            <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-6 text-white font-bold outline-none focus:border-orange-500 transition-all min-h-[180px]" value={newOcc.description} onChange={e => setNewOcc({...newOcc, description: e.target.value})} placeholder="Descreva o momento aqui..." />
                        </div>
                        <Button onClick={handleSaveOccurrence} isLoading={isSaving} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-orange-600 shadow-2xl shadow-orange-900/40 mt-4">Salvar no Prontuário</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};