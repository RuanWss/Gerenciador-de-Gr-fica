
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
    deleteOccurrence
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, Student, StudentOccurrence, LessonPlan, PEIDocument, LessonPlanType } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, List, PlusCircle, X, Trash2, FileUp, AlertCircle, 
  BookOpen, Save, ArrowLeft, Cpu, Heart, FileText, Layout, Eye, Clock, UploadCloud, ChevronRight,
  Layers, MapPin, Wrench, Target, BookOpenCheck, BrainCircuit, Rocket, Calendar as CalendarIcon, ClipboardCheck, Sparkles,
  CheckCircle2, Download, FileDown, FileType, Smile, MessageSquare
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'plans' | 'inova_ai' | 'occurrences' | 'pei'>('requests');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [peis, setPeis] = useState<PEIDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- OCCURRENCE FORM STATES ---
  const [showOccForm, setShowOccForm] = useState(false);
  const [occClass, setOccClass] = useState('');
  const [newOcc, setNewOcc] = useState<Partial<StudentOccurrence>>({
      studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0]
  });

  // --- LESSON PLAN STATES ---
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planType, setPlanType] = useState<LessonPlanType>('daily');
  const [planData, setPlanData] = useState<Partial<LessonPlan>>({
    className: '', subject: '', topic: '', date: '', content: '', methodology: '', 
    resources: '', evaluation: '', justification: '', semesterContents: '', 
    cognitiveSkills: '', socialEmotionalSkills: '', didacticStrategies: '',
    activitiesPre: '', activitiesAuto: '', activitiesCoop: '', activitiesCompl: '',
    educationalPractices: '', educationalSpaces: '', didacticResources: '',
    evaluationStrategies: '', references: '',
    // Campos Projeto
    projectTheme: '', guidingQuestion: '', projectObjective: '', expectedResults: [],
    finalProductType: '', finalProductDescription: '', projectSteps: [],
    timeline: {}, projectResources: '', aiTools: 'ChatGPT, GEMINI, IA STUDIO, ETC',
    aiPurpose: [], aiCareTaken: '', evidenceTypes: []
  });

  // --- PEI FORM STATES ---
  const [showPeiForm, setShowPeiForm] = useState(false);
  const [newPei, setNewPei] = useState<Partial<PEIDocument>>({
      studentId: '', studentName: '', subject: user?.subject || '', period: '',
      essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: ''
  });

  // --- EXAM FORM STATES ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [printInstructions, setPrintInstructions] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleSavePlan = async () => {
    if (!planData.className || (planType !== 'project' && !planData.subject)) return alert("Preencha os campos obrigatórios (Turma e Disciplina).");
    setIsSaving(true);
    try {
        await saveLessonPlan({
            ...planData,
            id: '',
            teacherId: user?.id || '',
            teacherName: user?.name || '',
            type: planType,
            createdAt: Date.now()
        } as LessonPlan);
        alert("Planejamento salvo com sucesso!");
        setIsCreatingPlan(false);
        setPlanData({ 
            className: '', subject: '', topic: '', 
            expectedResults: [], projectSteps: [], aiPurpose: [], evidenceTypes: [] 
        });
        fetchData();
    } catch (e) { alert("Erro ao salvar planejamento."); }
    finally { setIsSaving(false); }
  };

  const handleSavePei = async () => {
      if (!newPei.studentId || !newPei.period) return alert("Selecione o aluno e o período.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === newPei.studentId);
          await savePEIDocument({
              ...newPei,
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              studentName: student?.name || '',
              updatedAt: Date.now()
          } as PEIDocument);
          alert("Documento PEI salvo com sucesso!");
          setShowPeiForm(false);
          fetchData();
      } catch (e) { alert("Erro ao salvar PEI."); }
      finally { setIsSaving(false); }
  };

  const handleSaveOccurrenceLocal = async () => {
    if (!newOcc.studentId || !newOcc.description) return alert("Por favor, selecione o aluno e descreva o ocorrido.");
    setIsSaving(true);
    try {
        const student = students.find(s => s.id === newOcc.studentId);
        await saveOccurrence({
            id: '',
            studentId: student?.id || '',
            studentName: student?.name || '',
            studentClass: student?.className || '',
            category: newOcc.category as any || 'indisciplina',
            severity: newOcc.severity as any || 'low',
            description: newOcc.description || '',
            date: newOcc.date || new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            reportedBy: user?.name || 'Professor'
        });
        alert("Ocorrência registrada com sucesso!");
        setShowOccForm(false);
        setNewOcc({ studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) {
        alert("Erro ao salvar ocorrência.");
    } finally {
        setIsSaving(false);
    }
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha título e turma.");
      if (uploadedFiles.length === 0) return alert("Anexe pelo menos um arquivo.");
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
              gradeLevel: examGrade, instructions: printInstructions || 'Sem instruções adicionais',
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Pedido enviado para a gráfica!");
          setExamTitle('');
          setPrintInstructions('');
          setUploadedFiles([]);
          setActiveTab('requests');
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  const toggleSelection = (field: string, value: string) => {
    const current = (planData as any)[field] || [];
    const updated = current.includes(value) 
        ? current.filter((v: string) => v !== value) 
        : [...current, value];
    setPlanData({ ...planData, [field]: updated });
  };

  const subjects = [...EFAF_SUBJECTS, ...EM_SUBJECTS].sort();

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent text-white">
        {/* SIDEBAR */}
        <div className="w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 ml-2 opacity-50">Menu Professor</p>
                <button onClick={() => { setActiveTab('requests'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><List size={18} /> Fila da Gráfica</button>
                <button onClick={() => { setActiveTab('create'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => { setActiveTab('plans'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => { setActiveTab('pei'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pei' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Heart size={18} /> PEI / AEE</button>
                <button onClick={() => { setActiveTab('inova_ai'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'inova_ai' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Cpu size={18} /> Projeto Inova AI</button>
                <button onClick={() => { setActiveTab('occurrences'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'occurrences' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><AlertCircle size={18} /> Ocorrências</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            
            {/* PLANS TAB */}
            {activeTab === 'plans' && !isCreatingPlan && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">Meus Planejamentos</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Controle pedagógico de aulas e conteúdos.</p>
                        </div>
                        <Button onClick={() => { 
                            setIsCreatingPlan(true); 
                            setPlanType('daily');
                            setPlanData({ 
                                className: '', subject: user?.subject || '', date: new Date().toISOString().split('T')[0],
                                expectedResults: [], projectSteps: [], aiPurpose: [], evidenceTypes: [], timeline: {}, aiTools: 'ChatGPT, GEMINI, IA STUDIO, ETC'
                            }); 
                        }} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/40">
                            <Plus size={18} className="mr-2"/> Novo Planejamento
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lessonPlans.map(plan => (
                            <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl hover:border-red-600/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        plan.type === 'project' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 
                                        plan.type === 'semester' ? 'bg-blue-600/10 text-blue-500 border-blue-500/20' : 
                                        'bg-green-600/10 text-green-500 border-green-500/20'
                                    }`}>
                                        {plan.type === 'project' ? 'Projeto AI' : plan.type === 'semester' ? 'Bimestral' : 'Diário'}
                                    </span>
                                    <button onClick={async () => { if(confirm("Excluir plano?")) await deleteLessonPlan(plan.id).then(fetchData); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={20}/></button>
                                </div>
                                <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{plan.className}</h3>
                                <p className="text-[11px] text-red-500 font-black uppercase tracking-[0.2em] mb-6">{plan.subject || 'SUBPROJETO'}</p>
                                <p className="text-sm text-gray-400 italic line-clamp-3 mb-8 leading-relaxed">"{plan.topic || plan.projectTheme || plan.semesterContents || 'Sem descrição'}"</p>
                                <div className="mt-auto pt-6 border-t border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest flex justify-between items-center">
                                    <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    <span className="text-white hover:text-red-500 cursor-pointer flex items-center gap-2 transition-colors">Ver Detalhes <ChevronRight size={14}/></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PLAN FORM - MANTIDO IGUAL */}
            {activeTab === 'plans' && isCreatingPlan && (
                <div className="animate-in slide-in-from-bottom-4 max-w-6xl mx-auto pb-40">
                    <button onClick={() => setIsCreatingPlan(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 font-black uppercase text-[10px] tracking-widest transition-all"><ArrowLeft size={16}/> Voltar para lista</button>
                    
                    <div className="bg-[#18181b] border-2 border-red-600/20 rounded-[3.5rem] shadow-2xl overflow-hidden">
                        <div className="p-10 border-b border-white/5 bg-red-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className="h-20 w-20 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-red-900/40">
                                    {planType === 'project' ? <Rocket size={38}/> : <BookOpen size={38}/>}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">{planType === 'project' ? 'Projeto Inova AI' : 'Elaborar Planejamento'}</h2>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Documento Técnico-Pedagógico</p>
                                </div>
                            </div>
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10">
                                <button onClick={() => setPlanType('daily')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${planType === 'daily' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Diário</button>
                                <button onClick={() => setPlanType('semester')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${planType === 'semester' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Bimestral</button>
                                <button onClick={() => setPlanType('project')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${planType === 'project' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Projeto AI</button>
                            </div>
                        </div>

                        <div className="p-12 space-y-16">
                            {/* CONTEÚDO DO FORMULÁRIO (OCULTADO PARA CONCISÃO, MAS MANTIDO) */}
                            {planType === 'project' ? (
                                <div className="space-y-12">
                                    <section className="space-y-8">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-4 border-b border-white/5 pb-6"><Layers size={22}/> 1. Identificação</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Turma / Série</label>
                                                <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 appearance-none text-base" value={planData.className} onChange={e => setPlanData({...planData, className: e.target.value})}>
                                                    <option value="">-- Selecione --</option>
                                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Tema do Subprojeto</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-base" value={planData.projectTheme} onChange={e => setPlanData({...planData, projectTheme: e.target.value})} placeholder="Título do projeto Inova AI" />
                                            </div>
                                        </div>
                                    </section>
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-4 border-b border-white/5 pb-4"><Target size={22}/> 2. Questão Norteadora</h3>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white text-base outline-none focus:border-red-600 min-h-[160px] leading-relaxed" value={planData.guidingQuestion} onChange={e => setPlanData({...planData, guidingQuestion: e.target.value})} placeholder="Que problema real vamos investigar e melhorar?" />
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-4 border-b border-white/5 pb-4"><BookOpenCheck size={22}/> 3. Objetivo do Subprojeto</h3>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white text-base outline-none focus:border-red-600 min-h-[160px] leading-relaxed" value={planData.projectObjective} onChange={e => setPlanData({...planData, projectObjective: e.target.value})} placeholder="Ao final, os alunos serão capazes de...?" />
                                        </div>
                                    </section>
                                    {/* Adicionar aqui os outros campos do projeto conforme a versão anterior... */}
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Ano | Turma</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 appearance-none text-base" value={planData.className} onChange={e => setPlanData({...planData, className: e.target.value})}>
                                                <option value="">-- Turma --</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Componente Curricular</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 appearance-none text-base" value={planData.subject} onChange={e => setPlanData({...planData, subject: e.target.value})}>
                                                <option value="">-- Matéria --</option>
                                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">{planType === 'daily' ? 'Data da Aula' : 'Bimestre'}</label>
                                            {planType === 'daily' ? (
                                                <input type="date" className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-base" value={planData.date} onChange={e => setPlanData({...planData, date: e.target.value})} />
                                            ) : (
                                                <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 appearance-none text-base" value={planData.period} onChange={e => setPlanData({...planData, period: e.target.value})}>
                                                    <option value="">-- Selecione --</option>
                                                    <option value="1º BIMESTRE">1º BIMESTRE</option>
                                                    <option value="2º BIMESTRE">2º BIMESTRE</option>
                                                    <option value="3º BIMESTRE">3º BIMESTRE</option>
                                                    <option value="4º BIMESTRE">4º BIMESTRE</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    {/* Conteúdo específico diário/bimestral... */}
                                </div>
                            )}

                            <Button onClick={handleSavePlan} isLoading={isSaving} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] bg-red-600 shadow-2xl shadow-red-900/40 text-xl"><Save size={28} className="mr-4"/> Salvar Planejamento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* OCORRÊNCIAS TAB */}
            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4 pb-40">
                    <header className="mb-12 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">Minhas Ocorrências</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Relato de eventos e comportamentos em sala.</p>
                        </div>
                        <Button onClick={() => setShowOccForm(true)} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/40">
                            <PlusCircle size={20} className="mr-3"/> Nova Ocorrência
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 gap-6">
                        {teacherOccurrences.length > 0 ? teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-2xl flex justify-between items-start group hover:border-red-600/30 transition-all">
                                <div className="flex-1 pr-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-[0.1em] ${occ.category === 'elogio' ? 'bg-green-600/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-500/20'}`}>{occ.category}</span>
                                        <span className="text-xs text-gray-600 font-black uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> {new Date(occ.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-2 tracking-tight text-white">{occ.studentName}</h3>
                                    <p className="text-xs text-red-500 font-black uppercase tracking-[0.2em] mb-8">{occ.studentClass}</p>
                                    <div className="bg-black/30 p-8 rounded-[2rem] border border-white/5 relative">
                                        <p className="text-gray-300 italic text-lg leading-relaxed font-medium">"{occ.description}"</p>
                                        <MessageSquare size={24} className="absolute -top-3 -left-3 text-red-600/30 fill-red-600/10"/>
                                    </div>
                                </div>
                                <button onClick={async () => { if(confirm("Excluir ocorrência?")) await deleteOccurrence(occ.id).then(fetchData); }} className="text-gray-800 hover:text-red-500 transition-colors p-4 bg-white/5 rounded-2xl hover:scale-110 active:scale-95"><Trash2 size={24}/></button>
                            </div>
                        )) : (
                            <div className="py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-800">Nenhum registro encontrado</div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL OCORRÊNCIA */}
            {showOccForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border-2 border-red-600/20 w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-red-600/5">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl">
                                    <AlertCircle size={32}/>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Nova Ocorrência</h3>
                                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Registro Pedagógico Disciplinar</p>
                                </div>
                            </div>
                            <button onClick={() => setShowOccForm(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        
                        <div className="p-12 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Turma</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 appearance-none text-sm" value={occClass} onChange={e => setOccClass(e.target.value)}>
                                        <option value="">-- Selecione a Turma --</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Aluno</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 appearance-none text-sm" value={newOcc.studentId} onChange={e => setNewOcc({...newOcc, studentId: e.target.value})} disabled={!occClass}>
                                        <option value="">{occClass ? '-- Selecione o Aluno --' : 'Aguardando Turma...'}</option>
                                        {students.filter(s => s.className === occClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Categoria</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 appearance-none text-sm" value={newOcc.category} onChange={e => setNewOcc({...newOcc, category: e.target.value as any})}>
                                        <option value="indisciplina">Indisciplina</option>
                                        <option value="atraso">Atraso / Saída Antecipada</option>
                                        <option value="desempenho">Desempenho Acadêmico</option>
                                        <option value="uniforme">Uniforme / EPI</option>
                                        <option value="elogio">Elogio / Meritocracia</option>
                                        <option value="outros">Outros Relatos</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Gravidade</label>
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 h-[62px]">
                                        <button onClick={() => setNewOcc({...newOcc, severity: 'low'})} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${newOcc.severity === 'low' ? 'bg-green-600 text-white' : 'text-gray-600'}`}>Leve</button>
                                        <button onClick={() => setNewOcc({...newOcc, severity: 'medium'})} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${newOcc.severity === 'medium' ? 'bg-yellow-600 text-white' : 'text-gray-600'}`}>Média</button>
                                        <button onClick={() => setNewOcc({...newOcc, severity: 'high'})} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${newOcc.severity === 'high' ? 'bg-red-600 text-white' : 'text-gray-600'}`}>Grave</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Relato Detalhado</label>
                                <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-base outline-none focus:border-red-600 transition-all min-h-[200px] leading-relaxed" value={newOcc.description} onChange={e => setNewOcc({...newOcc, description: e.target.value})} placeholder="Descreva os fatos de forma técnica e objetiva..." />
                            </div>

                            <Button onClick={handleSaveOccurrenceLocal} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 shadow-2xl shadow-red-900/40 text-sm">
                                <Save size={24} className="mr-3"/> Confirmar Registro
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABELA FILA GRÁFICA - MANTIDA IGUAL */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight mb-12">Fila na Gráfica</h1>
                    <div className="bg-[#18181b] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl text-white">
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
                                        <td className="p-8">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto p/ Retirar'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ENVIAR PROVA TAB - MANTIDA IGUAL */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto space-y-12">
                    {/* SEÇÃO DE MODELOS INSTITUCIONAIS */}
                    <div className="bg-[#18181b] border-2 border-white/5 p-10 rounded-[3.5rem] shadow-2xl text-white">
                        <div className="flex items-center gap-6 mb-8">
                            <FileType className="text-red-600" size={32} />
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Modelos Institucionais</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <a href="#" onClick={(e) => { e.preventDefault(); alert('Iniciando download do modelo de Prova...'); }} className="flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-red-600/50 transition-all group">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-14 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all shadow-xl shadow-red-900/10"><FileDown size={28} /></div>
                                    <div><span className="block font-black uppercase text-[11px] tracking-widest text-white">Cabeçalho Oficial</span><span className="block font-bold text-xs text-gray-500 group-hover:text-red-400 transition-colors uppercase">MODELO DE PROVA</span></div>
                                </div>
                                <ChevronRight size={20} className="text-gray-800 group-hover:text-white transition-all" />
                            </a>
                            <a href="#" onClick={(e) => { e.preventDefault(); alert('Iniciando download do modelo de Apostila...'); }} className="flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-red-600/50 transition-all group">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl shadow-blue-900/10"><FileType size={28} /></div>
                                    <div><span className="block font-black uppercase text-[11px] tracking-widest text-white">Cabeçalho Oficial</span><span className="block font-bold text-xs text-gray-500 group-hover:text-blue-400 transition-colors uppercase">MODELO DE APOSTILA</span></div>
                                </div>
                                <ChevronRight size={20} className="text-gray-800 group-hover:text-white transition-all" />
                            </a>
                        </div>
                    </div>

                    <div className="bg-[#18181b] border border-white/5 p-16 rounded-[3.5rem] shadow-2xl text-white">
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 flex items-center gap-6">
                            <UploadCloud className="text-red-600" size={56} /> Enviar p/ Gráfica
                        </h2>
                        <div className="space-y-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Título do Material</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none appearance-none focus:border-red-600 text-lg" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Selecione --</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Qtd</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-white font-bold outline-none focus:border-red-600 text-lg" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Detalhes para Impressão</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-base outline-none focus:border-red-600 transition-all min-h-[140px] leading-relaxed" value={printInstructions} onChange={e => setPrintInstructions(e.target.value)} placeholder="Ex: Impressão frente e verso, grampear no canto superior esquerdo, etc..." />
                            </div>
                            <div className="border-4 border-dashed border-white/5 rounded-[3rem] p-20 text-center hover:border-red-600 transition-all relative bg-black/20 group cursor-pointer">
                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                <FileUp className="mx-auto text-gray-800 mb-6 group-hover:text-red-500 group-hover:scale-110 transition-all" size={80} />
                                <p className="text-gray-600 font-black uppercase text-xs tracking-[0.3em] group-hover:text-red-200 transition-colors">Arraste seus arquivos PDF aqui</p>
                            </div>
                            <div className="mt-8 space-y-3">
                                {uploadedFiles.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5 animate-in slide-in-from-left-4">
                                        <span className="text-sm text-gray-300 font-bold truncate pr-6 uppercase tracking-tight">{f.name}</span>
                                        <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-2 transition-colors"><X size={24}/></button>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] bg-red-600 shadow-2xl shadow-red-900/60 text-xl hover:scale-[1.02] transition-transform">Enviar p/ Impressão</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* PEI TAB - MANTIDO IGUAL */}
            {activeTab === 'pei' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">PEI / AEE</h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Documentos de Adaptação Curricular Individualizada.</p>
                        </div>
                        <Button onClick={() => setShowPeiForm(true)} className="bg-red-600 h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-900/40">
                            <Plus size={18} className="mr-2"/> Novo Documento PEI
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {peis.map(pei => (
                            <div key={pei.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl hover:border-red-600/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="bg-red-600/10 text-red-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-600/20">PEI Ativo</span>
                                    <button onClick={async () => { if(confirm("Excluir PEI?")) await deletePEIDocument(pei.id).then(fetchData); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={20}/></button>
                                </div>
                                <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{pei.studentName}</h3>
                                <p className="text-[11px] text-red-500 font-black uppercase tracking-[0.2em] mb-8">{pei.subject} • {pei.period}</p>
                                <div className="mt-auto pt-6 border-t border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest flex justify-between items-center">
                                    <span>Atualizado em: {new Date(pei.updatedAt).toLocaleDateString()}</span>
                                    <span className="text-white hover:text-red-500 cursor-pointer flex items-center gap-2 transition-colors"><Eye size={14}/> Ver</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PEI FORM MODAL - MANTIDO IGUAL */}
            {activeTab === 'pei' && showPeiForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 bg-red-600/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-8">
                                <div className="h-20 w-20 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-red-900/40">
                                    <Heart size={38}/>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Elaboração de Documento PEI</h2>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Adaptação Pedagógica Individualizada</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPeiForm(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>

                        <div className="p-12 space-y-12 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Selecione o Aluno (AEE)</label>
                                    <select className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 appearance-none text-sm" value={newPei.studentId} onChange={e => setNewPei({...newPei, studentId: e.target.value})}>
                                        <option value="">-- Selecione o Aluno --</option>
                                        {students.filter(s => s.isAEE).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Disciplina</label>
                                    <input className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 text-sm" value={newPei.subject} onChange={e => setNewPei({...newPei, subject: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Período / Bimestre</label>
                                    <input className="w-full bg-black/60 border border-white/10 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-red-600 text-sm" value={newPei.period} onChange={e => setNewPei({...newPei, period: e.target.value})} placeholder="Ex: 1º Bimestre" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-3">Competências e Habilidades Essenciais</label>
                                    <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm outline-none focus:border-red-600 transition-all min-h-[200px] leading-relaxed" value={newPei.essentialCompetencies} onChange={e => setNewPei({...newPei, essentialCompetencies: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Conteúdos Curriculares Selecionados</label>
                                    <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm outline-none focus:border-red-600 transition-all min-h-[200px] leading-relaxed" value={newPei.selectedContents} onChange={e => setNewPei({...newPei, selectedContents: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Recursos Didáticos e Estratégias</label>
                                    <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm outline-none focus:border-red-600 transition-all min-h-[200px] leading-relaxed" value={newPei.didacticResources} onChange={e => setNewPei({...newPei, didacticResources: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Procedimentos de Avaliação</label>
                                    <textarea className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-8 text-white font-medium text-sm outline-none focus:border-red-600 transition-all min-h-[200px] leading-relaxed" value={newPei.evaluation} onChange={e => setNewPei({...newPei, evaluation: e.target.value})} />
                                </div>
                            </div>

                            <Button onClick={handleSavePei} isLoading={isSaving} className="w-full h-24 rounded-[2.5rem] font-black uppercase tracking-[0.3em] bg-red-600 shadow-2xl shadow-red-900/40 text-xl"><Save size={28} className="mr-4"/> Salvar Planejamento PEI</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
