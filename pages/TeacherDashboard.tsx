
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    listenToStudents,
    listenToOccurrences,
    getLessonPlans,
    saveLessonPlan,
    deleteLessonPlan,
    getAllPEIs,
    savePEIDocument,
    deletePEIDocument,
    saveOccurrence,
    deleteOccurrence,
    saveClassMaterial,
    getClassMaterials,
    deleteClassMaterial,
    logAttendance
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, Student, StudentOccurrence, LessonPlan, PEIDocument, ClassMaterial, AttendanceLog } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, List, PlusCircle, X, Trash2, FileUp, AlertCircle, 
  BookOpen, Save, ArrowLeft, Heart, FileText, Eye, Clock, UploadCloud, ChevronRight,
  Target, BookOpenCheck, Calendar as CalendarIcon, ClipboardCheck,
  CheckCircle2, FileDown, FileType, Folder, UserCheck, UserX, ShieldCheck,
  LayoutTemplate, Download
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS, EFAI_CLASSES, INFANTIL_CLASSES } from '../constants';

const TEMPLATES = [
    { title: 'Cabeçalho de Atividades', url: 'https://i.ibb.co/2Y0zfZ0W/3.png' },
    { title: 'Cabeçalho Kronos', url: 'https://i.ibb.co/zTGFssJs/4.png' },
    { title: 'Cabeçalho de Avaliação', url: 'https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png' },
];

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'plans' | 'occurrences' | 'pei' | 'materials' | 'attendance'>('requests');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [peis, setPeis] = useState<PEIDocument[]>([]);
  const [teacherMaterials, setTeacherMaterials] = useState<ClassMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Attendance State
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});
  
  // Exam Request State
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [printInstructions, setPrintInstructions] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Class Material State
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  // Occurrence State
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [occurrenceClass, setOccurrenceClass] = useState('');
  const [occurrenceForm, setOccurrenceForm] = useState({
      studentId: '',
      category: 'indisciplina',
      description: ''
  });

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
      const unsubS = listenToStudents(setStudents);
      const unsubO = listenToOccurrences((all) => {
          if (user?.name) {
            setTeacherOccurrences(all.filter(o => o.reportedBy === user.name));
          }
      });
      return () => { unsubS(); unsubO(); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        if (activeTab === 'requests') {
            const allExams = await getExams(user.id);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'materials') {
            const mats = await getClassMaterials(user.id);
            setTeacherMaterials(mats.sort((a,b) => b.createdAt - a.createdAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const isEligibleForAttendance = () => {
      if (!user) return false;
      const role = String(user.role || '').toUpperCase();
      return role.includes("POLIVALENTE") || role.includes("EFAI") || role.includes("INFANTIL") || user.email === 'ruan.wss@gmail.com';
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha título e turma.");
      if (uploadedFiles.length === 0) return alert("Anexe o arquivo.");

      setIsSaving(true);
      try {
          const fileUrls: string[] = [];
          const fileNames: string[] = [];
          for (const file of uploadedFiles) {
              const url = await uploadExamFile(file, user?.name || 'Professor');
              fileUrls.push(url);
              fileNames.push(file.name);
          }
          await saveExam({
              id: '', teacherId: user?.id || '', teacherName: user?.name || '',
              subject: user?.subject || 'Geral', title: examTitle, quantity: Number(printQty),
              gradeLevel: examGrade, instructions: printInstructions || 'Sem instruções',
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Pedido enviado!");
          setExamTitle(''); setUploadedFiles([]); setActiveTab('requests');
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  const handleSaveMaterial = async () => {
      if (!materialTitle || !materialClass || !materialFile) return alert("Preencha todos os campos e anexe um arquivo.");
      setIsSaving(true);
      try {
          const url = await uploadExamFile(materialFile, user?.name || 'Material');
          await saveClassMaterial({
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              className: materialClass,
              title: materialTitle,
              subject: user?.subject || 'Geral',
              fileUrl: url,
              fileName: materialFile.name,
              fileType: materialFile.type,
              createdAt: Date.now()
          });
          alert("Material publicado para a turma!");
          setMaterialTitle('');
          setMaterialFile(null);
          fetchData();
      } catch (e) {
          console.error(e);
          alert("Erro ao publicar material.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteMaterial = async (id: string) => {
      if (confirm("Deseja excluir este material?")) {
          await deleteClassMaterial(id);
          fetchData();
      }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClass) return alert("Selecione uma turma.");
    setIsSaving(true);
    try {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const classStudents = students.filter(s => s.className === attendanceClass);
        
        let savedCount = 0;
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
                savedCount++;
            }
        }
        
        if (savedCount > 0) {
            alert("Frequência registrada com sucesso!");
            setAttendanceRecords({});
            setActiveTab('requests');
        } else {
            alert("Marque a presença ou ausência dos alunos antes de salvar.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao registrar frequência.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveOccurrence = async () => {
    if (!occurrenceForm.studentId || !occurrenceForm.description) return alert("Preencha todos os campos.");
    
    setIsSaving(true);
    try {
        const student = students.find(s => s.id === occurrenceForm.studentId);
        await saveOccurrence({
            id: '',
            studentId: occurrenceForm.studentId,
            studentName: student?.name || '',
            studentClass: student?.className || '',
            category: occurrenceForm.category as any,
            severity: 'low',
            description: occurrenceForm.description,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            reportedBy: user?.name || ''
        });
        alert("Ocorrência registrada.");
        setShowOccurrenceModal(false);
        setOccurrenceForm({ studentId: '', category: 'indisciplina', description: '' });
        setOccurrenceClass('');
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteOccurrence = async (id: string) => {
    if(confirm("Excluir ocorrência?")) {
        await deleteOccurrence(id);
    }
  };

  const getExamStatusInfo = (status: ExamStatus): { text: string; className: string } => {
    switch (status) {
      case ExamStatus.PENDING:
        return { text: 'Pendente', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
      case ExamStatus.IN_PROGRESS:
        return { text: 'Imprimindo', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case ExamStatus.READY:
        return { text: 'Pronto p/ Retirada', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case ExamStatus.COMPLETED:
        return { text: 'Entregue', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
      default:
        return { text: status, className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const SidebarButton = ({ tab, label, icon: IconComponent }: { tab: any, label: string, icon: React.ElementType }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === tab ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
    >
        <IconComponent size={18} /> 
        <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent text-white">
        <div className="w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 ml-2 opacity-50">Menu Professor</p>
                <SidebarButton tab="requests" label="Fila da Gráfica" icon={List} />
                <SidebarButton tab="create" label="Enviar p/ Gráfica" icon={PlusCircle} />
                <SidebarButton tab="materials" label="Materiais de Aula" icon={Folder} />
                <SidebarButton tab="plans" label="Planejamentos" icon={BookOpen} />
                <SidebarButton tab="pei" label="PEI / AEE" icon={Heart} />
                <SidebarButton tab="occurrences" label="Ocorrências" icon={AlertCircle} />
                {isEligibleForAttendance() && (
                    <SidebarButton tab="attendance" label="Frequência" icon={Clock} />
                )}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-12">Fila na Gráfica</h1>
                    <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                         <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                <tr><th className="p-8">Data</th><th className="p-8">Título</th><th className="p-8">Turma</th><th className="p-8">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.map(e => {
                                    const statusInfo = getExamStatusInfo(e.status);
                                    return (
                                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-8 text-sm text-gray-500 font-bold">{new Date(e.createdAt).toLocaleDateString()}</td>
                                            <td className="p-8 font-black text-white uppercase tracking-tight text-base">{String(e.title || '')}</td>
                                            <td className="p-8"><span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{String(e.gradeLevel || '')}</span></td>
                                            <td className="p-8">
                                                <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusInfo.className}`}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto space-y-8">
                    
                    {/* ÁREA DE DOWNLOAD DE CABEÇALHOS */}
                    <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <LayoutTemplate size={100} />
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Modelos Padronizados</h3>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Faça o download dos cabeçalhos oficiais antes de imprimir</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 relative z-10">
                            {TEMPLATES.map((t, i) => (
                                <a 
                                    key={i} 
                                    href={t.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-white/5 hover:border-red-600/50 transition-all group"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                        <Download size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-white leading-tight">
                                        {t.title}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#18181b] border border-white/5 p-16 rounded-[3.5rem] shadow-2xl text-white">
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 flex items-center gap-6"><UploadCloud className="text-red-600" size={56} /> Enviar p/ Gráfica</h2>
                        <div className="space-y-10">
                            <input className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg transition-all" placeholder="Título do Material" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                            <div className="grid grid-cols-2 gap-10">
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none appearance-none focus:border-red-600 text-lg" 
                                    value={examGrade} 
                                    onChange={e => {
                                        const selectedClass = e.target.value;
                                        setExamGrade(selectedClass);
                                        const count = students.filter(s => s.className === selectedClass).length;
                                        if (count > 0) setPrintQty(count);
                                    }}
                                >
                                    <option value="">-- Turma --</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                            </div>
                            <textarea className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-8 text-white font-medium text-base outline-none focus:border-red-600 transition-all min-h-[140px]" value={printInstructions} onChange={e => setPrintInstructions(e.target.value)} placeholder="Instruções da Impressão..." />
                            <div className="border-4 border-dashed border-white/5 rounded-[3rem] p-20 text-center hover:border-red-600 transition-all relative bg-black/20 group cursor-pointer">
                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                <FileUp className="mx-auto text-gray-700 mb-6 group-hover:text-red-500 transition-all" size={80} />
                                <p className="text-gray-600 font-black uppercase text-xs tracking-[0.3em]">Arraste seus arquivos PDF aqui</p>
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] bg-red-600 shadow-2xl text-xl hover:scale-[1.02] transition-transform">Enviar p/ Impressão</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Materiais de Aula</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Compartilhe arquivos diretamente com os alunos</p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* FORMULÁRIO DE UPLOAD */}
                        <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl h-fit">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                                <UploadCloud className="text-red-600"/> Novo Material
                            </h3>
                            <div className="space-y-6">
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all"
                                    placeholder="Título do Arquivo"
                                    value={materialTitle}
                                    onChange={e => setMaterialTitle(e.target.value)}
                                />
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none appearance-none focus:border-red-600"
                                    value={materialClass}
                                    onChange={e => setMaterialClass(e.target.value)}
                                >
                                    <option value="">Selecione a Turma...</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>

                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-red-600 transition-colors relative cursor-pointer group bg-black/20">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={e => e.target.files && setMaterialFile(e.target.files[0])}
                                    />
                                    {materialFile ? (
                                        <div className="text-green-500 font-bold text-xs uppercase flex flex-col items-center gap-2">
                                            <FileText size={32}/> {materialFile.name}
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 font-bold text-[10px] uppercase flex flex-col items-center gap-2 group-hover:text-red-500">
                                            <FileUp size={32}/> Clique para anexar
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleSaveMaterial}
                                    isLoading={isSaving}
                                    className="w-full h-16 rounded-2xl bg-red-600 font-black uppercase tracking-widest shadow-lg shadow-red-900/20"
                                >
                                    Publicar Material
                                </Button>
                            </div>
                        </div>

                        {/* LISTA DE MATERIAIS */}
                        <div className="lg:col-span-2 space-y-4">
                            {teacherMaterials.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 opacity-50">
                                    <Folder size={64} className="mx-auto text-gray-500 mb-4"/>
                                    <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhum material publicado</p>
                                </div>
                            ) : (
                                teacherMaterials.map(mat => (
                                    <div key={mat.id} className="bg-[#18181b] border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-red-600/30 transition-all shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center border border-red-900/30">
                                                <FileText size={28}/>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-tight text-lg leading-tight">{mat.title}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                    {mat.className} • {new Date(mat.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={mat.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                                title="Visualizar"
                                            >
                                                <Eye size={20}/>
                                            </a>
                                            <button
                                                onClick={() => handleDeleteMaterial(mat.id)}
                                                className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-900/20 transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto pb-40">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Diário de Frequência</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Controle de presença diária</p>
                    </header>
                    
                    <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Selecione a Turma</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none"
                                    value={attendanceClass}
                                    onChange={(e) => {
                                        setAttendanceClass(e.target.value);
                                        setAttendanceRecords({});
                                    }}
                                >
                                    <option value="">-- Escolha uma turma --</option>
                                    {CLASSES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-6">
                                <span className="bg-red-600/10 text-red-500 border border-red-500/20 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
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
                                <Button onClick={handleSaveAttendance} isLoading={isSaving} className="w-full h-20 bg-red-600 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-red-900/40 text-sm mt-8">
                                    <Save size={24} className="mr-3"/> Confirmar Chamada do Dia
                                </Button>
                            </div>
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                                <Clock size={48} className="mx-auto mb-4 text-gray-500" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500">Selecione uma turma para carregar a lista de chamada</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto">
                    {/* Header */}
                    <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Ocorrências</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Registro de comportamento e observações</p>
                        </div>
                        <Button onClick={() => setShowOccurrenceModal(true)} className="bg-red-600 h-16 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                            <PlusCircle size={20} className="mr-2"/> Nova Ocorrência
                        </Button>
                    </header>

                    {/* List */}
                    <div className="space-y-6">
                        {teacherOccurrences.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                <AlertCircle size={48} className="mx-auto mb-4 text-gray-500" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500">Nenhuma ocorrência registrada</p>
                            </div>
                        ) : (
                            teacherOccurrences.map(occ => (
                                <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative group hover:border-red-600/30 transition-all">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                                    occ.category === 'indisciplina' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }`}>
                                                    {occ.category}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{new Date(occ.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{occ.studentName}</h3>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{occ.studentClass}</p>
                                        </div>
                                        <button onClick={() => handleDeleteOccurrence(occ.id)} className="p-3 bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white rounded-xl transition-all absolute top-8 right-8">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                    <div className="bg-black/30 p-6 rounded-3xl border border-white/5 text-gray-300 italic text-sm leading-relaxed">
                                        "{occ.description}"
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Modal */}
                    {showOccurrenceModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Nova Ocorrência</h3>
                                    <button onClick={() => setShowOccurrenceModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-2">Turma</label>
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                            value={occurrenceClass}
                                            onChange={e => {
                                                setOccurrenceClass(e.target.value);
                                                setOccurrenceForm(prev => ({ ...prev, studentId: '' }));
                                            }}
                                        >
                                            <option value="">Selecione a Turma...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-2">Aluno</label>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none disabled:opacity-50"
                                            value={occurrenceForm.studentId}
                                            onChange={e => setOccurrenceForm({...occurrenceForm, studentId: e.target.value})}
                                            disabled={!occurrenceClass}
                                        >
                                            <option value="">{occurrenceClass ? 'Selecione o Aluno...' : 'Selecione a Turma primeiro'}</option>
                                            {students
                                                .filter(s => s.className === occurrenceClass)
                                                .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                                .map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-2">Categoria</label>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                            value={occurrenceForm.category}
                                            onChange={e => setOccurrenceForm({...occurrenceForm, category: e.target.value})}
                                        >
                                            <option value="indisciplina">Indisciplina</option>
                                            <option value="atraso">Atraso</option>
                                            <option value="desempenho">Desempenho</option>
                                            <option value="uniforme">Uniforme</option>
                                            <option value="elogio">Elogio</option>
                                            <option value="outros">Outros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-2">Descrição</label>
                                        <textarea 
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[120px]"
                                            placeholder="Descreva o ocorrido..."
                                            value={occurrenceForm.description}
                                            onChange={e => setOccurrenceForm({...occurrenceForm, description: e.target.value})}
                                        />
                                    </div>
                                    <Button onClick={handleSaveOccurrence} isLoading={isSaving} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                                        Registrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
