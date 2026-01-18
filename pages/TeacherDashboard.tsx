
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
import { ExamRequest, ExamStatus, Student, StudentOccurrence, LessonPlan, PEIDocument, LessonPlanType, ClassMaterial, AttendanceLog, UserRole } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, List, PlusCircle, X, Trash2, FileUp, AlertCircle, 
  BookOpen, Save, ArrowLeft, Heart, FileText, Eye, Clock, UploadCloud, ChevronRight,
  Layers, Wrench, Target, BookOpenCheck, BrainCircuit, Rocket, Calendar as CalendarIcon, ClipboardCheck, Sparkles,
  CheckCircle2, FileDown, FileType, MessageSquare, Folder, UserCheck, UserX, ShieldCheck
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS, EFAI_CLASSES, INFANTIL_CLASSES } from '../constants';

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
  
  // --- ATTENDANCE STATES ---
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});

  // --- EXAM FORM STATES ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [printInstructions, setPrintInstructions] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // --- PEI FORM STATES ---
  const [showPeiForm, setShowPeiForm] = useState(false);
  const [showPeiView, setShowPeiView] = useState(false);
  const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);
  const [newPei, setNewPei] = useState<Partial<PEIDocument>>({
      studentId: '', studentName: '', subject: user?.subject || '', period: '',
      essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: ''
  });

  // --- OCCURRENCE FORM STATES ---
  const [showOccForm, setShowOccForm] = useState(false);
  const [occClass, setOccClass] = useState('');
  const [newOcc, setNewOcc] = useState<Partial<StudentOccurrence>>({
      studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0]
  });

  // --- MATERIAL STATES ---
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialSubject, setMaterialSubject] = useState(user?.subject || '');
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
      const unsubS = listenToStudents(setStudents);
      const unsubO = listenToOccurrences((all) => {
          setTeacherOccurrences(all.filter(o => o.reportedBy === user?.name));
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
        } else if (activeTab === 'plans') {
            const allPlans = await getLessonPlans(user.id);
            setLessonPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'pei') {
            const allPeis = await getAllPEIs(user.id);
            setPeis(allPeis.sort((a,b) => b.updatedAt - a.updatedAt));
        } else if (activeTab === 'materials') {
            const mats = await getClassMaterials(user.id);
            setTeacherMaterials(mats.sort((a,b) => b.createdAt - a.createdAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  // REGRA: Identificação de Professor Polivalente / EFAI / Infantil
  const isEligibleForAttendance = () => {
      if (!user) return false;
      if (user.email === 'ruan.wss@gmail.com') return true;
      
      const role = (user.role || '').toString().toUpperCase();
      const subject = (user.subject || '').toString().toUpperCase();
      const name = (user.name || '').toString().toUpperCase();

      const polivalentes = ["LELIA", "ALICIA", "JULIANA", "LAIS", "EVELYN", "ALICE", "SELMA", "LUÃ"];
      
      const isNamed = polivalentes.some(p => name.includes(p));
      const isPolySubject = role.includes("POLIVALENTE") || subject.includes("POLIVALENTE") || role.includes("EFAI") || role.includes("INFANTIL");

      return isPolySubject || isNamed;
  };

  // REGRA: Determinação automática das turmas para o seletor
  const getAttendanceClasses = () => {
      if (!user) return [];
      if (user.email === 'ruan.wss@gmail.com') return CLASSES;
      
      if (user.classes && user.classes.length > 0) return user.classes;

      const role = (user.role || '').toString().toUpperCase();
      const subject = (user.subject || '').toString().toUpperCase();
      const name = (user.name || '').toString().toUpperCase();
      const polivalentesNames = ["LELIA", "ALICIA", "JULIANA", "LAIS", "EVELYN", "ALICE", "SELMA", "LUÃ"];
      
      if (role.includes("POLIVALENTE") || 
          subject.includes("POLIVALENTE") || 
          role.includes("EFAI") || 
          role.includes("INFANTIL") ||
          polivalentesNames.some(p => name.includes(p))) {
          return [...INFANTIL_CLASSES, ...EFAI_CLASSES];
      }

      return [];
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
      if (!examTitle || !examGrade || uploadedFiles.length === 0) return alert("Preencha título, turma e anexe o arquivo.");
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

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent text-white">
        {/* SIDEBAR */}
        <div className="w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 ml-2 opacity-50">Menu Professor</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><List size={18} /> Fila da Gráfica</button>
                <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><PlusCircle size={18} /> Enviar p/ Gráfica</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Folder size={18} /> Materiais de Aula</button>
                <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => setActiveTab('pei')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pei' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Heart size={18} /> PEI / AEE</button>
                <button onClick={() => setActiveTab('occurrences')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'occurrences' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><AlertCircle size={18} /> Ocorrências</button>
                {isEligibleForAttendance() && (
                    <button onClick={() => setActiveTab('attendance')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Clock size={18} /> Frequência</button>
                )}
            </div>
        </div>
        
        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto pb-40">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">Diário de Frequência</h1>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Chamada das turmas vinculadas ao seu cadastro.</p>
                    </header>
                    <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Suas Turmas Disponíveis</label>
                                <select className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600 appearance-none transition-all" value={attendanceClass} onChange={(e) => { setAttendanceClass(e.target.value); setAttendanceRecords({}); }}>
                                    <option value="">-- Selecione uma Turma --</option>
                                    {getAttendanceClasses().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="pt-6">
                                <span className="bg-red-600/10 text-red-500 border border-red-500/20 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                        {attendanceClass ? (
                            <div className="space-y-4">
                                {students.filter(s => s.className === attendanceClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 group hover:bg-black/40 transition-colors">
                                        <span className="font-black text-white uppercase tracking-tight text-sm">{student.name}</span>
                                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                            <button onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: true})} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${attendanceRecords[student.id] === true ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}><UserCheck size={14}/> Presente</button>
                                            <button onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: false})} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${attendanceRecords[student.id] === false ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}><UserX size={14}/> Ausente</button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={handleSaveAttendance} isLoading={isSaving} className="w-full h-20 bg-red-600 rounded-3xl font-black uppercase tracking-widest shadow-2xl mt-8"><Save size={24} className="mr-3"/> Confirmar Chamada</Button>
                            </div>
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                                <Clock size={48} className="mx-auto mb-4 text-gray-500" />
                                <p className="font-black uppercase tracking-widest text-sm text-gray-500">Abra o seletor acima para escolher sua turma e iniciar a chamada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PEI TAB */}
            {activeTab === 'pei' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                    <header className="mb-10 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">PEI / AEE</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Plano de Atendimento Educacional Especializado.</p>
                        </div>
                        <Button onClick={() => setShowPeiForm(true)} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/40"><Plus size={18} className="mr-2"/> Novo Documento PEI</Button>
                    </header>

                    {showPeiForm && (
                        <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3rem] shadow-2xl mb-12 animate-in slide-in-from-top-4">
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                                <h3 className="text-xl font-black uppercase tracking-tight">Preencher PEI</h3>
                                <button onClick={() => setShowPeiForm(false)} className="text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Aluno (Público AEE)</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={newPei.studentId} onChange={e => setNewPei({...newPei, studentId: e.target.value})}>
                                        <option value="">-- Selecione o Aluno --</option>
                                        {students.filter(s => s.isAEE).map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Bimestre</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={newPei.period} onChange={e => setNewPei({...newPei, period: e.target.value})}>
                                        <option value="">-- Selecione --</option>
                                        <option value="1º Bimestre">1º Bimestre</option>
                                        <option value="2º Bimestre">2º Bimestre</option>
                                        <option value="3º Bimestre">3º Bimestre</option>
                                        <option value="4º Bimestre">4º Bimestre</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Habilidades e Competências a serem desenvolvidas</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]" value={newPei.essentialCompetencies} onChange={e => setNewPei({...newPei, essentialCompetencies: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Conteúdos Selecionados</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]" value={newPei.selectedContents} onChange={e => setNewPei({...newPei, selectedContents: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Recursos Didáticos</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]" value={newPei.didacticResources} onChange={e => setNewPei({...newPei, didacticResources: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Avaliação</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]" value={newPei.evaluation} onChange={e => setNewPei({...newPei, evaluation: e.target.value})} />
                                </div>
                            </div>
                            <Button onClick={async () => {
                                setIsSaving(true);
                                const student = students.find(s => s.id === newPei.studentId);
                                await savePEIDocument({...newPei, id: '', teacherId: user?.id, teacherName: user?.name, studentName: student?.name, updatedAt: Date.now()} as PEIDocument);
                                setShowPeiForm(false); setIsSaving(false); fetchData();
                            }} isLoading={isSaving} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl mt-8">Salvar Planejamento PEI</Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {peis.map(pei => (
                            <div key={pei.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex justify-between items-center group hover:border-red-600/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-red-600/10 text-red-500 rounded-[1.5rem] flex items-center justify-center shrink-0"><Heart size={32}/></div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase">{pei.studentName}</h3>
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{pei.period} • {pei.subject}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedPei(pei); setShowPeiView(true); }} className="p-3 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all" title="Ver Detalhes"><Eye size={20}/></button>
                                    <button onClick={async () => { if(confirm("Excluir?")) await deletePEIDocument(pei.id).then(fetchData); }} className="p-3 text-gray-800 hover:text-red-500 bg-white/5 rounded-xl transition-all"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showPeiView && selectedPei && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="bg-[#18181b] border-2 border-white/5 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                                <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                            <Heart size={24} className="text-red-600"/> Planejamento PEI
                                        </h3>
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {selectedPei.studentName} • {selectedPei.period}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowPeiView(false)} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Target size={14}/> Habilidades e Competências
                                            </h4>
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedPei.essentialCompetencies || 'Não informado.'}</p>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <BookOpenCheck size={14}/> Adaptação de Conteúdo
                                            </h4>
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedPei.selectedContents || 'Não informado.'}</p>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                            <h4 className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Wrench size={14}/> Recursos Didáticos
                                            </h4>
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedPei.didacticResources || 'Não informado.'}</p>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ClipboardCheck size={14}/> Avaliação
                                            </h4>
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedPei.evaluation || 'Não informado.'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end">
                                    <Button onClick={() => setShowPeiView(false)} className="px-8 h-12 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl">
                                        Fechar Visualização
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* OCCURRENCES TAB */}
            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto">
                    <header className="mb-10 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Gestão de comportamentos e registros escolares.</p>
                        </div>
                        <Button onClick={() => setShowOccForm(true)} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs shadow-2xl shadow-red-900/40"><Plus size={18} className="mr-2"/> Novo Registro</Button>
                    </header>

                    {showOccForm && (
                        <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3rem] shadow-2xl mb-12 animate-in slide-in-from-top-4">
                            <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                                <h3 className="text-xl font-black uppercase tracking-tight">Nova Ocorrência</h3>
                                <button onClick={() => setShowOccForm(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occClass} onChange={e => setOccClass(e.target.value)}>
                                    <option value="">-- Turma --</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={newOcc.studentId} onChange={e => setNewOcc({...newOcc, studentId: e.target.value})} disabled={!occClass}>
                                    <option value="">-- Aluno --</option>{students.filter(s => s.className === occClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white mb-6 min-h-[150px]" placeholder="Descreva o ocorrido..." value={newOcc.description} onChange={e => setNewOcc({...newOcc, description: e.target.value})} />
                            <Button onClick={async () => {
                                setIsSaving(true);
                                const student = students.find(s => s.id === newOcc.studentId);
                                await saveOccurrence({...newOcc, id: '', studentId: student?.id, studentName: student?.name, studentClass: student?.className, timestamp: Date.now(), reportedBy: user?.name} as StudentOccurrence);
                                setShowOccForm(false); setIsSaving(false); fetchData();
                            }} isLoading={isSaving} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl">Confirmar Registro</Button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-xl relative group hover:border-red-600/30 transition-all">
                                <div className="flex items-center gap-4 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{occ.category}</span>
                                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{new Date(occ.timestamp).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase mb-1 tracking-tight">{occ.studentName}</h3>
                                <p className="text-gray-400 text-lg italic leading-relaxed">"{occ.description}"</p>
                                <button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id).then(fetchData); }} className="absolute top-10 right-10 text-gray-800 hover:text-red-500 p-3 bg-white/5 rounded-xl transition-all"><Trash2 size={24}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FILA DA GRÁFICA TAB */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-12">Fila na Gráfica</h1>
                    <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                         <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                <tr><th className="p-8">Data</th><th className="p-8">Título</th><th className="p-8">Turma</th><th className="p-8">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-8 text-sm text-gray-500 font-bold">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-8 font-black text-white uppercase tracking-tight text-base">{e.title}</td>
                                        <td className="p-8"><span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase border border-white/5">{e.gradeLevel}</span></td>
                                        <td className="p-8"><span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>{e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto p/ Retirar'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CREATE EXAM TAB */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto space-y-12">
                    <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3.5rem] shadow-2xl text-white">
                        <div className="flex items-center gap-6 mb-8"><FileType className="text-red-600" size={32} /><h3 className="text-2xl font-black uppercase tracking-tighter">Modelos Institucionais</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <a href="https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png" target="_blank" className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all shadow-xl">
                                        <FileDown size={24} />
                                    </div>
                                    <div>
                                        <span className="block font-black uppercase text-[10px] tracking-widest text-white leading-tight">Oficial</span>
                                        <span className="block font-bold text-[9px] text-gray-500 uppercase tracking-tighter">PROVA</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-800" />
                            </a>
                            <a href="https://i.ibb.co/2Y0zfZ0W/3.png" target="_blank" className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                                        <FileType size={24} />
                                    </div>
                                    <div>
                                        <span className="block font-black uppercase text-[10px] tracking-widest text-white leading-tight">Oficial</span>
                                        <span className="block font-bold text-[9px] text-gray-500 uppercase tracking-tighter">APOSTILA</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-800" />
                            </a>
                            <a href="https://i.ibb.co/zTGFssJs/4.png" target="_blank" className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-600 group-hover:text-white transition-all shadow-xl">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <span className="block font-black uppercase text-[10px] tracking-widest text-white leading-tight">Kronos</span>
                                        <span className="block font-bold text-[9px] text-gray-500 uppercase tracking-tighter">CONVÊNIO</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-800" />
                            </a>
                        </div>
                    </div>
                    <div className="bg-[#18181b] border border-white/5 p-16 rounded-[3.5rem] shadow-2xl text-white">
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 flex items-center gap-6"><UploadCloud className="text-red-600" size={56} /> Enviar p/ Gráfica</h2>
                        <div className="space-y-10">
                            <input className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg transition-all" placeholder="Título do Material" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                            <div className="grid grid-cols-2 gap-10">
                                <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none appearance-none focus:border-red-600 text-lg" value={examGrade} onChange={e => setExamGrade(e.target.value)}><option value="">-- Turma --</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                            </div>
                            <textarea className="w-full bg-black/40 border border-white/10 rounded-2rem p-8 text-white font-medium text-base outline-none focus:border-red-600 transition-all min-h-[140px]" value={printInstructions} onChange={e => setPrintInstructions(e.target.value)} placeholder="Instruções da Impressão (Ex: frente e verso...)" />
                            <div className="border-4 border-dashed border-white/5 rounded-[3rem] p-20 text-center hover:border-red-600 transition-all relative bg-black/20 group cursor-pointer"><input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} /><FileUp className="mx-auto text-gray-700 mb-6 group-hover:text-red-500 transition-all" size={80} /><p className="text-gray-600 font-black uppercase text-xs tracking-[0.3em]">Arraste seus arquivos PDF aqui</p></div>
                            <div className="mt-8 space-y-3">{uploadedFiles.map((f, i) => (<div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 animate-in slide-in-from-left-4"><span className="text-sm text-gray-300 font-bold truncate pr-6 uppercase">{f.name}</span><button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-2"><X size={24}/></button></div>))}</div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] bg-red-600 shadow-2xl text-xl hover:scale-[1.02] transition-transform">Enviar p/ Impressão</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MATERIALS TAB */}
            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto pb-40">
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Materiais de Aula</h1>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Enviar PDF para visualização em sala</p>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                            <div className="flex items-center gap-4 mb-4"><div className="h-12 w-12 bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center"><UploadCloud size={24}/></div><h3 className="text-xl font-black uppercase tracking-tight">Novo Material</h3></div>
                            <input className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="Título do Material" />
                            <div className="grid grid-cols-2 gap-6">
                                <select className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none appearance-none focus:border-red-600" value={materialClass} onChange={e => setMaterialClass(e.target.value)}><option value="">-- Turma --</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <select className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none appearance-none focus:border-red-600" value={materialSubject} onChange={e => setMaterialSubject(e.target.value)}><option value="COORDENAÇÃO">COORDENAÇÃO</option>{[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                            <div className="border-3 border-dashed border-white/10 rounded-[2rem] p-10 text-center hover:border-red-600 relative bg-black/20 group cursor-pointer"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setMaterialFile(e.target.files[0])} />{materialFile ? <span className="text-red-500 font-bold">{materialFile.name}</span> : <><FileUp className="mx-auto text-gray-700 mb-4" size={48} /><p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Anexar PDF</p></>}</div>
                            <Button onClick={async () => {
                                if(!materialTitle || !materialFile || !materialClass) return alert("Preencha tudo.");
                                setIsSaving(true);
                                const url = await uploadExamFile(materialFile, user?.name);
                                await saveClassMaterial({id:'', teacherId: user?.id, teacherName: user?.name, title: materialTitle, className: materialClass, subject: materialSubject, fileUrl: url, fileName: materialFile.name, fileType: materialFile.type, createdAt: Date.now()});
                                alert("Material Enviado!"); setIsSaving(false); fetchData();
                            }} isLoading={isSaving} className="w-full h-16 rounded-2xl font-black uppercase bg-red-600 shadow-2xl">Enviar Material</Button>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><List size={24} className="text-red-600"/> Meus Envios</h3>
                            {teacherMaterials.map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-6 rounded-3xl flex justify-between items-center group hover:border-red-600/30 transition-all">
                                    <div className="flex items-center gap-5"><div className="p-3 bg-red-600/10 text-red-500 rounded-xl"><FileText size={28}/></div><div><h4 className="font-black text-white uppercase text-sm leading-tight mb-1">{mat.title}</h4><p className="text-[10px] text-gray-500 font-bold uppercase">{mat.className} • {mat.subject}</p></div></div>
                                    <button onClick={async () => { if(confirm("Excluir material?")) await deleteClassMaterial(mat.id).then(fetchData); }} className="p-3 text-gray-800 hover:text-red-500 transition-colors bg-white/5 rounded-xl"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PLANS TAB */}
            {activeTab === 'plans' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10 flex justify-between items-center">
                        <div><h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">Meus Planejamentos</h1><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Controle pedagógico de aulas.</p></div>
                        <Button onClick={() => setActiveTab('plans')} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs shadow-2xl"><Plus size={18} className="mr-2"/> Novo Planejamento</Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lessonPlans.map(plan => (
                            <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl hover:border-red-600/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/20 bg-green-600/10 text-green-500">{plan.type}</span>
                                    <button onClick={async () => { if(confirm("Excluir?")) await deleteLessonPlan(plan.id).then(fetchData); }} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                                </div>
                                <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{plan.className}</h3>
                                <p className="text-[11px] text-red-500 font-black uppercase tracking-[0.2em] mb-6">{plan.subject}</p>
                                <p className="text-sm text-gray-400 italic line-clamp-3 mb-8">"{plan.topic || plan.content || 'Sem descrição'}"</p>
                                <div className="mt-auto pt-6 border-t border-white/5 text-[9px] font-black text-gray-500 uppercase flex justify-between items-center"><span>{new Date(plan.createdAt).toLocaleDateString()}</span><span className="text-white hover:text-red-500 cursor-pointer flex items-center gap-2">Ver Detalhes <ChevronRight size={14}/></span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
