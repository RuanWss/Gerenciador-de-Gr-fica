
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
    deletePEIDocument
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, Student, StudentOccurrence, LessonPlan, PEIDocument, LessonPlanType } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, List, PlusCircle, X, Trash2, FileUp, AlertCircle, 
  BookOpen, Save, ArrowLeft, Cpu, Heart, FileText, Layout, Eye, Clock, UploadCloud, ChevronRight,
  Layers, MapPin, Wrench, Target, BookOpenCheck, BrainCircuit, Rocket, Calendar as CalendarIcon, ClipboardCheck, Sparkles,
  CheckCircle2, Download, FileDown, FileType
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
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2 opacity-50">Menu Professor</p>
                <button onClick={() => { setActiveTab('requests'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Fila da Gráfica</button>
                <button onClick={() => { setActiveTab('create'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => { setActiveTab('plans'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => { setActiveTab('pei'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'pei' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><Heart size={18} /> PEI / AEE</button>
                <button onClick={() => { setActiveTab('inova_ai'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'inova_ai' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><Cpu size={18} /> Projeto Inova AI</button>
                <button onClick={() => { setActiveTab('occurrences'); setIsCreatingPlan(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'occurrences' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><AlertCircle size={18} /> Ocorrências</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* PLANS TAB */}
            {activeTab === 'plans' && !isCreatingPlan && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-tight">Meus Planejamentos</h1>
                            <p className="text-gray-400 font-medium">Controle pedagógico de aulas e conteúdos.</p>
                        </div>
                        <Button onClick={() => { 
                            setIsCreatingPlan(true); 
                            setPlanType('daily');
                            setPlanData({ 
                                className: '', subject: user?.subject || '', date: new Date().toISOString().split('T')[0],
                                expectedResults: [], projectSteps: [], aiPurpose: [], evidenceTypes: [], timeline: {}, aiTools: 'ChatGPT, GEMINI, IA STUDIO, ETC'
                            }); 
                        }} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                            <Plus size={18} className="mr-2"/> Novo Planejamento
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lessonPlans.map(plan => (
                            <div key={plan.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        plan.type === 'project' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 
                                        plan.type === 'semester' ? 'bg-blue-600/10 text-blue-500 border-blue-500/20' : 
                                        'bg-green-600/10 text-green-500 border-green-500/20'
                                    }`}>
                                        {plan.type === 'project' ? 'Projeto AI' : plan.type === 'semester' ? 'Bimestral' : 'Diário'}
                                    </span>
                                    <button onClick={async () => { if(confirm("Excluir plano?")) await deleteLessonPlan(plan.id).then(fetchData); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="text-lg font-black uppercase mb-1">{plan.className}</h3>
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-4">{plan.subject || 'SUBPROJETO'}</p>
                                <p className="text-xs text-gray-400 italic line-clamp-3 mb-6">"{plan.topic || plan.projectTheme || plan.semesterContents || 'Sem descrição'}"</p>
                                <div className="mt-auto pt-4 border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase flex justify-between">
                                    <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                                    <span className="text-white hover:text-red-500 cursor-pointer flex items-center gap-1">Ver Detalhes <ChevronRight size={12}/></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PLAN FORM */}
            {activeTab === 'plans' && isCreatingPlan && (
                <div className="animate-in slide-in-from-bottom-4 max-w-6xl mx-auto pb-40">
                    <button onClick={() => setIsCreatingPlan(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-black uppercase text-[10px] tracking-widest transition-all"><ArrowLeft size={16}/> Voltar para lista</button>
                    
                    <div className="bg-[#18181b] border-2 border-red-600/20 rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-red-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/40">
                                    {planType === 'project' ? <Rocket size={32}/> : <BookOpen size={32}/>}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{planType === 'project' ? 'Projeto Inova AI' : 'Elaborar Planejamento'}</h2>
                                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Documento Técnico-Pedagógico</p>
                                </div>
                            </div>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                <button onClick={() => setPlanType('daily')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planType === 'daily' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Diário</button>
                                <button onClick={() => setPlanType('semester')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planType === 'semester' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Bimestral</button>
                                <button onClick={() => setPlanType('project')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planType === 'project' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Projeto AI</button>
                            </div>
                        </div>

                        <div className="p-10 space-y-12">
                            
                            {/* --- FORMULÁRIO DE PROJETO (INOVA AI) --- */}
                            {planType === 'project' && (
                                <div className="space-y-12 animate-in fade-in duration-500">
                                    
                                    {/* 1. IDENTIFICAÇÃO */}
                                    <section className="space-y-6">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><Layers size={20}/> 1. Identificação</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma / Série</label>
                                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={planData.className} onChange={e => setPlanData({...planData, className: e.target.value})}>
                                                    <option value="">-- Selecione --</option>
                                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Tema do Subprojeto</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={planData.projectTheme} onChange={e => setPlanData({...planData, projectTheme: e.target.value})} placeholder="Título do projeto Inova AI" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* 2 & 3. QUESTÃO E OBJETIVO */}
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><Target size={20}/> 2. Questão Norteadora</h3>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[120px]" value={planData.guidingQuestion} onChange={e => setPlanData({...planData, guidingQuestion: e.target.value})} placeholder="Que problema real vamos investigar e melhorar?" />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><BookOpenCheck size={20}/> 3. Objetivo do Subprojeto</h3>
                                            <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[120px]" value={planData.projectObjective} onChange={e => setPlanData({...planData, projectObjective: e.target.value})} placeholder="Ao final, os alunos serão capazes de...?" />
                                        </div>
                                    </section>

                                    {/* 4. RESULTADOS ESPERADOS (CHECKBOXES) */}
                                    <section className="space-y-6">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><CheckCircle2 size={20}/> 4. Resultados Esperados (Marque 3–5)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {[
                                                "Consciência ambiental/consumo responsável",
                                                "Criatividade e autoria (criar algo)",
                                                "Colaboração e protagonismo",
                                                "Comunicação (apresentar/explicar)",
                                                "Investigação (observação/pesquisa/dados)",
                                                "Uso responsável de tecnologia/IA"
                                            ].map(opt => (
                                                <label key={opt} className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${planData.expectedResults?.includes(opt) ? 'bg-red-600 border-red-500 shadow-lg' : 'bg-black/40 border-white/5 hover:border-white/20'}`} onClick={() => toggleSelection('expectedResults', opt)}>
                                                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${planData.expectedResults?.includes(opt) ? 'bg-white border-white' : 'border-gray-600'}`}>
                                                        {planData.expectedResults?.includes(opt) && <X size={14} className="text-red-600"/>}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${planData.expectedResults?.includes(opt) ? 'text-white' : 'text-gray-400'}`}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </section>

                                    {/* 5. PRODUTO FINAL */}
                                    <section className="space-y-6">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><Sparkles size={20}/> 5. Produto Final</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                            {["Painel/Cartaz", "Maquete Digital/Protótipo", "Experimento", "Podcast/Vídeo", "Campanha/Intervenção", "Seminário", "Outro"].map(type => (
                                                <button key={type} onClick={() => setPlanData({...planData, finalProductType: type})} className={`px-4 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${planData.finalProductType === type ? 'bg-red-600 border-red-500 text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}>{type}</button>
                                            ))}
                                        </div>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.finalProductDescription} onChange={e => setPlanData({...planData, finalProductDescription: e.target.value})} placeholder="Descrição do produto final (2-3 linhas)..." />
                                    </section>

                                    {/* 6. ETAPAS E 7. CRONOGRAMA */}
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><ClipboardCheck size={20}/> 6. Etapas do Projeto</h3>
                                            <div className="space-y-3">
                                                {[
                                                    "1. Sensibilizar (apresentar tema / combinar regras)",
                                                    "2. Investigar (observar/pesquisar/coletar informações)",
                                                    "3. Criar (produzir protótipo/peça/solução)",
                                                    "4. Testar e melhorar (ajustes)",
                                                    "5. Apresentar (mostra/seminário)",
                                                    "6. Registrar (portfólio/evidências)"
                                                ].map(step => (
                                                    <label key={step} className="flex items-center gap-3 p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer group hover:bg-black/40" onClick={() => toggleSelection('projectSteps', step)}>
                                                        <div className={`h-6 w-6 rounded-lg border flex items-center justify-center ${planData.projectSteps?.includes(step) ? 'bg-red-600 border-red-500' : 'border-gray-700'}`}>
                                                            {planData.projectSteps?.includes(step) && <CheckCircle2 size={16} className="text-white"/>}
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase group-hover:text-white">{step}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><CalendarIcon size={20}/> 7. Cronograma Mínimo</h3>
                                            <div className="grid grid-cols-1 gap-4 bg-black/20 p-6 rounded-[2rem] border border-white/5">
                                                {["Início previsto", "Diagnóstico do problema", "Planejamento", "Socialização", "Avaliação"].map(label => (
                                                    <div key={label} className="flex flex-col gap-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">{label}</label>
                                                        <input type="date" className="bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-red-600" value={(planData.timeline as any)?.[label] || ''} onChange={e => setPlanData({...planData, timeline: { ...(planData.timeline || {}), [label]: e.target.value }})} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* 8. RECURSOS */}
                                    <section className="space-y-6">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><Wrench size={20}/> 8. Recursos Necessários</h3>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[120px]" value={planData.projectResources} onChange={e => setPlanData({...planData, projectResources: e.target.value})} placeholder="Recursos materiais e tecnológicos..." />
                                    </section>

                                    {/* 9. USO DE IA */}
                                    <section className="bg-red-900/5 p-8 rounded-[3rem] border border-red-500/10 space-y-8">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-red-500/20 pb-4"><BrainCircuit size={20}/> 9. Uso de IA (Campo Obrigatório)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Ferramenta(s)</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={planData.aiTools} onChange={e => setPlanData({...planData, aiTools: e.target.value})} />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Para quê? (Objetivo)</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Ideias", "Roteiro", "Texto", "Imagem", "Vídeo", "Dados/gráficos"].map(opt => (
                                                        <button key={opt} onClick={() => toggleSelection('aiPurpose', opt)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${planData.aiPurpose?.includes(opt) ? 'bg-red-600 text-white' : 'bg-black/40 text-gray-600'}`}>{opt}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Cuidado Adotado (Ética/Verificação)</label>
                                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={planData.aiCareTaken} onChange={e => setPlanData({...planData, aiCareTaken: e.target.value})} placeholder="Ex: Verificação de fontes e discussão sobre plágio..." />
                                        </div>
                                    </section>

                                    {/* 10. EVIDÊNCIAS */}
                                    <section className="space-y-6">
                                        <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/5 pb-4"><Eye size={20}/> 10. Evidências de Execução</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {["Fotos do processo", "Registro no caderno/diário", "Link de vídeo/podcast", "Tabelas/gráficos", "Relatório curto", "Portfólio da turma"].map(opt => (
                                                <button key={opt} onClick={() => toggleSelection('evidenceTypes', opt)} className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center flex items-center justify-center transition-all ${planData.evidenceTypes?.includes(opt) ? 'bg-white text-black border-white' : 'bg-black/40 text-gray-600 border-white/5'}`}>{opt}</button>
                                            ))}
                                        </div>
                                    </section>

                                </div>
                            )}
                            
                            {/* --- FORMULÁRIOS DIÁRIO E BIMESTRAL (MANTIDOS) --- */}
                            {planType !== 'project' && (
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Ano | Turma</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={planData.className} onChange={e => setPlanData({...planData, className: e.target.value})}>
                                                <option value="">-- Turma --</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Componente Curricular</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={planData.subject} onChange={e => setPlanData({...planData, subject: e.target.value})}>
                                                <option value="">-- Matéria --</option>
                                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{planType === 'daily' ? 'Data da Aula' : 'Bimestre'}</label>
                                            {planType === 'daily' ? (
                                                <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={planData.date} onChange={e => setPlanData({...planData, date: e.target.value})} />
                                            ) : (
                                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={planData.period} onChange={e => setPlanData({...planData, period: e.target.value})}>
                                                    <option value="">-- Selecione --</option>
                                                    <option value="1º BIMESTRE">1º BIMESTRE</option>
                                                    <option value="2º BIMESTRE">2º BIMESTRE</option>
                                                    <option value="3º BIMESTRE">3º BIMESTRE</option>
                                                    <option value="4º BIMESTRE">4º BIMESTRE</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {planType === 'semester' ? (
                                        <div className="space-y-10 animate-in fade-in">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Breve Justificativa</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.justification} onChange={e => setPlanData({...planData, justification: e.target.value})} placeholder="Importância dos temas do período..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Conteúdos</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.semesterContents} onChange={e => setPlanData({...planData, semesterContents: e.target.value})} placeholder="Conteúdos curriculares..." />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Habilidades Cognitivas</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.cognitiveSkills} onChange={e => setPlanData({...planData, cognitiveSkills: e.target.value})} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Habilidades Socioemocionais</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.socialEmotionalSkills} onChange={e => setPlanData({...planData, socialEmotionalSkills: e.target.value})} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
                                                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><Layers size={18} className="text-red-500"/> Matriz de Atividades</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center block">Prévias</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-[11px] outline-none focus:border-red-600 min-h-[150px]" value={planData.activitiesPre} onChange={e => setPlanData({...planData, activitiesPre: e.target.value})} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center block">Autodidáticas</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-[11px] outline-none focus:border-red-600 min-h-[150px]" value={planData.activitiesAuto} onChange={e => setPlanData({...planData, activitiesAuto: e.target.value})} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center block">Didático-Cooperativas</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-[11px] outline-none focus:border-red-600 min-h-[150px]" value={planData.activitiesCoop} onChange={e => setPlanData({...planData, activitiesCoop: e.target.value})} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center block">Complementares</label>
                                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-[11px] outline-none focus:border-red-600 min-h-[150px]" value={planData.activitiesCompl} onChange={e => setPlanData({...planData, activitiesCompl: e.target.value})} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Práticas Educativas</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.educationalPractices} onChange={e => setPlanData({...planData, educationalPractices: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Espaços Educativos</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.educationalSpaces} onChange={e => setPlanData({...planData, educationalSpaces: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Recursos Didáticos</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.didacticResources} onChange={e => setPlanData({...planData, didacticResources: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Estratégias de Avaliação</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[100px]" value={planData.evaluationStrategies} onChange={e => setPlanData({...planData, evaluationStrategies: e.target.value})} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] ml-2">Fontes de Referência</label>
                                                <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[80px]" value={planData.references} onChange={e => setPlanData({...planData, references: e.target.value})} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in fade-in">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Objeto de Conhecimento / Tema</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={planData.topic} onChange={e => setPlanData({...planData, topic: e.target.value})} placeholder="Ex: Frações complexas" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Procedimentos Metodológicos</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={planData.methodology} onChange={e => setPlanData({...planData, methodology: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Recursos e Avaliação</label>
                                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={planData.resources} onChange={e => setPlanData({...planData, resources: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button onClick={handleSavePlan} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-widest bg-red-600 shadow-2xl text-lg"><Save size={24} className="mr-3"/> Salvar Planejamento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* PEI TAB */}
            {activeTab === 'pei' && !showPeiForm && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-tight">PEI / AEE</h1>
                            <p className="text-gray-400 font-medium">Documentos de Adaptação Curricular.</p>
                        </div>
                        <Button onClick={() => { 
                            setNewPei({
                                studentId: '', studentName: '', subject: user?.subject || '', period: '',
                                essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: ''
                            });
                            setShowPeiForm(true); 
                        }} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                            <Plus size={18} className="mr-2"/> Novo Documento PEI
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {peis.map(pei => (
                            <div key={pei.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-600/20">PEI Ativo</span>
                                    <button onClick={async () => { if(confirm("Excluir PEI?")) await deletePEIDocument(pei.id).then(fetchData); }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="text-lg font-black uppercase mb-1">{pei.studentName}</h3>
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-4">{pei.subject} • {pei.period}</p>
                                <div className="mt-auto pt-4 border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase flex justify-between">
                                    <span>Atualizado em: {new Date(pei.updatedAt).toLocaleDateString()}</span>
                                    <span className="text-white hover:text-red-500 cursor-pointer flex items-center gap-1"><Eye size={12}/> Ver</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PEI FORM */}
            {activeTab === 'pei' && showPeiForm && (
                <div className="animate-in slide-in-from-bottom-4 max-w-5xl mx-auto pb-40">
                    <button onClick={() => setShowPeiForm(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-black uppercase text-[10px] tracking-widest transition-all"><ArrowLeft size={16}/> Voltar</button>
                    
                    <div className="bg-[#18181b] border-2 border-red-600/20 rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-red-600/5 flex items-center gap-6">
                            <div className="h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/40">
                                <Heart size={32}/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Elaboração de Documento PEI</h2>
                                <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Adaptação Pedagógica Individualizada</p>
                            </div>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Selecione o Aluno (AEE)</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={newPei.studentId} onChange={e => setNewPei({...newPei, studentId: e.target.value})}>
                                        <option value="">-- Aluno --</option>
                                        {students.filter(s => s.isAEE).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Disciplina</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={newPei.subject} onChange={e => setNewPei({...newPei, subject: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Período / Bimestre</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={newPei.period} onChange={e => setNewPei({...newPei, period: e.target.value})} placeholder="Ex: 1º Bimestre" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Competências e Habilidades Essenciais</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={newPei.essentialCompetencies} onChange={e => setNewPei({...newPei, essentialCompetencies: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Conteúdos Curriculares Selecionados</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={newPei.selectedContents} onChange={e => setNewPei({...newPei, selectedContents: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Recursos Didáticos e Estratégias</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={newPei.didacticResources} onChange={e => setNewPei({...newPei, didacticResources: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Procedimentos de Avaliação</label>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-red-600 min-h-[150px]" value={newPei.evaluation} onChange={e => setNewPei({...newPei, evaluation: e.target.value})} />
                                </div>
                            </div>

                            <Button onClick={handleSavePei} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-widest bg-red-600 shadow-2xl text-lg"><Save size={24} className="mr-3"/> Salvar Planejamento PEI</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* FILA DA GRÁFICA TAB */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-8">Fila na Gráfica</h1>
                    <div className="bg-[#18181b] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl text-white">
                         <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                <tr><th className="p-6">Data</th><th className="p-6">Título</th><th className="p-6">Turma</th><th className="p-6">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-bold">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 font-black text-white uppercase tracking-tight">{e.title}</td>
                                        <td className="p-6"><span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black text-gray-300 uppercase">{e.gradeLevel}</span></td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ENVIAR PROVA TAB */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in max-w-4xl mx-auto space-y-8">
                    {/* SEÇÃO DE MODELOS INSTITUCIONAIS */}
                    <div className="bg-[#18181b] border-2 border-white/5 p-8 rounded-[3rem] shadow-2xl text-white">
                        <div className="flex items-center gap-4 mb-6">
                            <FileType className="text-red-600" size={24} />
                            <h3 className="text-xl font-black uppercase tracking-tighter">Modelos Institucionais</h3>
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6 ml-1">Utilize os cabeçalhos oficiais da escola para seus materiais:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); alert('Iniciando download do modelo de Prova...'); }}
                                className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-red-600/50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-red-600/20 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all">
                                        <FileDown size={24} />
                                    </div>
                                    <div>
                                        <span className="block font-black uppercase text-[10px] tracking-widest text-white">Cabeçalho Oficial</span>
                                        <span className="block font-bold text-xs text-gray-500 group-hover:text-red-400 transition-colors">MODELO DE PROVA (.DOCX)</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-700 group-hover:text-white" />
                            </a>

                            <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); alert('Iniciando download do modelo de Apostila...'); }}
                                className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-red-600/50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <FileType size={24} />
                                    </div>
                                    <div>
                                        <span className="block font-black uppercase text-[10px] tracking-widest text-white">Cabeçalho Oficial</span>
                                        <span className="block font-bold text-xs text-gray-500 group-hover:text-blue-400 transition-colors">MODELO DE APOSTILA (.DOCX)</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-700 group-hover:text-white" />
                            </a>
                        </div>
                    </div>

                    {/* FORMULÁRIO DE ENVIO */}
                    <div className="bg-[#18181b] border border-white/5 p-12 rounded-[3rem] shadow-2xl text-white">
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-10 flex items-center gap-4">
                            <UploadCloud className="text-red-600" size={40} /> Enviar p/ Gráfica
                        </h2>
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Selecione --</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Qtd</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            
                            {/* CAIXA DE TEXTO PARA DESCRIÇÃO DOS DETALHES PARA IMPRESSÃO */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Detalhes para Impressão</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-medium text-sm outline-none focus:border-red-600 transition-all min-h-[120px]"
                                    value={printInstructions}
                                    onChange={e => setPrintInstructions(e.target.value)}
                                    placeholder="Ex: Impressão frente e verso, grampear no canto superior esquerdo, etc..."
                                />
                            </div>

                            <div className="border-3 border-dashed border-white/10 rounded-[2.5rem] p-12 text-center hover:border-red-600 transition-all relative bg-black/20 group">
                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                <FileUp className="mx-auto text-gray-700 mb-4 group-hover:text-red-500" size={56} />
                                <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Arraste seus arquivos PDF aqui</p>
                            </div>
                            <div className="mt-4 space-y-2">
                                {uploadedFiles.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-xs text-gray-400 font-bold truncate pr-4">{f.name}</span>
                                        <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><X size={18}/></button>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 shadow-2xl">Enviar p/ Impressão</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* OCORRÊNCIAS TAB */}
            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in">
                    <header className="mb-8 flex justify-between items-center">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Minhas Ocorrências</h1>
                        <Button onClick={() => alert("Função em desenvolvimento")} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest"><Plus size={18} className="mr-2"/> Nova Ocorrência</Button>
                    </header>
                    <div className="grid grid-cols-1 gap-4 text-white">
                        {teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex justify-between items-start group hover:border-red-600/30 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{occ.category}</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{new Date(occ.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-2xl font-black uppercase mb-2">{occ.studentName}</h3>
                                    <p className="text-xs text-red-500 font-black uppercase tracking-widest mb-6">{occ.studentClass}</p>
                                    <p className="text-gray-300 italic">"{occ.description}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
