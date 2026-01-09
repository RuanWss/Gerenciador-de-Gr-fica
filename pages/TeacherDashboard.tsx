
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    getClassMaterials,
    saveClassMaterial,
    deleteClassMaterial,
    listenToStudents,
    saveOccurrence,
    listenToOccurrences,
    deleteOccurrence,
    getLessonPlans,
    saveLessonPlan,
    deleteLessonPlan,
    getPedagogicalProjects,
    savePedagogicalProject,
    deletePedagogicalProject
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, ClassMaterial, Student, StudentOccurrence, LessonPlan, PedagogicalProject } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, X, 
  Folder, FileText, Trash2, FileUp, FileDown, Search,
  Download, AlertCircle, Calendar, User, MessageSquare, CheckCircle,
  BookOpen, Save, ArrowLeft, Info, FileEdit, Clock, Printer, Cpu, CheckSquare, Target, Sparkles, Image as ImageIcon, MapPin, Book
} from 'lucide-react';
import { CLASSES } from '../constants';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials' | 'occurrences' | 'plans' | 'inova_ai'>('requests');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [projects, setProjects] = useState<PedagogicalProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- FORM STATES (PLAN) ---
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planType, setPlanType] = useState<'daily' | 'semester'>('semester');
  const [newPlan, setNewPlan] = useState<Partial<LessonPlan>>({
      className: '', subject: user?.subject || '', topic: '', content: '', methodology: '',
      evaluation: '', period: '', semesterContents: '', cognitiveSkills: '',
      socialEmotionalSkills: '', didacticResources: '', evaluationStrategies: '',
      justification: '', didacticStrategies: '', activitiesPre: '', activitiesAuto: '',
      activitiesCoop: '', activitiesCompl: '', educationalPractices: '',
      educationalSpaces: '', references: ''
  });

  // --- FORM STATES (PROJECT INOVA AI) ---
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<Partial<PedagogicalProject>>({
      className: '', theme: '', guidingQuestion: '', objective: '', 
      expectedResults: [], finalProduct: '', finalProductDescription: '',
      steps: [], timeline: { start: '', diagnosis: '', planning: '', handsOn: [], socialization: '', evaluation: '' },
      resources: '', aiUsage: { tools: '', purpose: [], careTaken: '' }, evidence: []
  });

  // --- FORM STATES (EXAM) ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(30);
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
        } else if (activeTab === 'materials') {
            const allMats = await getClassMaterials(user.id);
            setMaterials(allMats.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'plans') {
            const allPlans = await getLessonPlans(user.id);
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'inova_ai') {
            const allProjects = await getPedagogicalProjects(user.id);
            setProjects(allProjects.sort((a,b) => b.createdAt - a.createdAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleSavePlan = async () => {
      if (!newPlan.className) return alert("Selecione a turma.");
      setIsSaving(true);
      try {
          await saveLessonPlan({
              ...newPlan,
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              type: planType,
              createdAt: Date.now()
          } as LessonPlan);
          alert("Planejamento salvo com sucesso!");
          setShowPlanForm(false);
          fetchData();
      } catch (e) { alert("Erro ao salvar."); }
      finally { setIsSaving(false); }
  };

  const handleDeletePlan = async (id: string) => {
      if (confirm("Excluir planejamento?")) {
          await deleteLessonPlan(id);
          fetchData();
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
              gradeLevel: examGrade, instructions: 'Prova / Material',
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Pedido enviado para a gráfica!");
          setActiveTab('requests');
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        {/* SIDEBAR */}
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar text-white">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2 opacity-50">Menu Professor</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Fila da Gráfica</button>
                <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => setActiveTab('inova_ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'inova_ai' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><Cpu size={18} /> Projeto Inova AI</button>
                <button onClick={() => setActiveTab('occurrences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'occurrences' ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}><AlertCircle size={18} /> Ocorrências</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* PLANEJAMENTO TAB */}
            {activeTab === 'plans' && !showPlanForm && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Gestão de Planejamentos</h1>
                            <p className="text-gray-400 font-medium">Planos Bimestrais e Diários.</p>
                        </div>
                        <Button onClick={() => { 
                            setNewPlan({
                                className: '', subject: user?.subject || '', period: '', topic: '',
                                justification: '', semesterContents: '', cognitiveSkills: '', socialEmotionalSkills: '',
                                didacticStrategies: '', activitiesPre: '', activitiesAuto: '', activitiesCoop: '',
                                activitiesCompl: '', educationalPractices: '', educationalSpaces: '', didacticResources: '',
                                evaluationStrategies: '', references: ''
                            });
                            setShowPlanForm(true); 
                        }} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest">
                            <Plus size={18} className="mr-2"/> Novo Plano
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-white">
                        {plans.map(p => (
                            <div key={p.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${p.type === 'semester' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : 'bg-green-600/10 text-green-400 border-green-600/20'}`}>
                                        {p.type === 'semester' ? 'Bimestral' : 'Diário'}
                                    </span>
                                    <button onClick={() => handleDeletePlan(p.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="text-lg font-black uppercase mb-1">{p.className}</h3>
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-4">{p.subject}</p>
                                <div className="mt-auto pt-4 border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase flex justify-between">
                                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    <span className="text-white hover:text-red-500 cursor-pointer">Ver Detalhes →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PLANEJAMENTO BIMESTRAL FORM (CONFORME IMAGEM PADRÃO) */}
            {activeTab === 'plans' && showPlanForm && (
                <div className="animate-in slide-in-from-bottom-4 fade-in max-w-5xl mx-auto pb-20">
                    <button onClick={() => setShowPlanForm(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-black uppercase text-[10px] tracking-widest transition-all">
                        <ArrowLeft size={16}/> Voltar
                    </button>

                    <div className="bg-[#18181b] border-2 border-red-600/20 rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center text-white">
                            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <BookOpen className="text-red-600" size={32} /> Criar Planejamento
                            </h2>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                <button onClick={() => setPlanType('semester')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planType === 'semester' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Bimestral</button>
                                <button onClick={() => setPlanType('daily')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${planType === 'daily' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Diário</button>
                            </div>
                        </div>

                        {/* MODO BIMESTRAL - ESTRUTURA DE GRADE DA IMAGEM */}
                        {planType === 'semester' ? (
                            <div className="p-8 space-y-px bg-white/5">
                                {/* Linha 1: Cabeçalho */}
                                <div className="grid grid-cols-4 gap-px bg-white/10">
                                    <div className="bg-[#18181b] p-4 text-center border-b border-r border-white/10">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Professor</p>
                                        <p className="text-sm font-bold text-white uppercase">{user?.name}</p>
                                    </div>
                                    <div className="bg-[#18181b] p-4 text-center border-b border-r border-white/10">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Ano | Turma</p>
                                        <select className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold text-xs uppercase outline-none focus:border-red-600" value={newPlan.className} onChange={e => setNewPlan({...newPlan, className: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-[#18181b] p-4 text-center border-b border-r border-white/10">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Componente Curricular</p>
                                        <input className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold text-xs uppercase outline-none focus:border-red-600" value={newPlan.subject} onChange={e => setNewPlan({...newPlan, subject: e.target.value})} />
                                    </div>
                                    <div className="bg-[#18181b] p-4 text-center border-b border-white/10">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Bimestre</p>
                                        <input className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold text-xs uppercase outline-none focus:border-red-600" value={newPlan.period} onChange={e => setNewPlan({...newPlan, period: e.target.value})} placeholder="Fazer referência ao período" />
                                    </div>
                                </div>

                                {/* Seção 2: Breve Justificativa */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Breve Justificativa</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Descrição da importância dos conceitos e temas..." value={newPlan.justification} onChange={e => setNewPlan({...newPlan, justification: e.target.value})} />
                                </div>

                                {/* Seção 3: Conteúdos */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Conteúdos</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Descrição dos conteúdos coerentes com planos de ensino..." value={newPlan.semesterContents} onChange={e => setNewPlan({...newPlan, semesterContents: e.target.value})} />
                                </div>

                                {/* Seção 4: Habilidades Cognitivas */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Habilidades Cognitivas</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Descrição das habilidades cognitivas..." value={newPlan.cognitiveSkills} onChange={e => setNewPlan({...newPlan, cognitiveSkills: e.target.value})} />
                                </div>

                                {/* Seção 5: Habilidades Socioemocionais */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Habilidades Socioemocionais</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Descrição das habilidades socioemocionais..." value={newPlan.socialEmotionalSkills} onChange={e => setNewPlan({...newPlan, socialEmotionalSkills: e.target.value})} />
                                </div>

                                {/* Seção 6: Situações Didáticas */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Situações Didáticas</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Descrição das atividades, meios e estratégias..." value={newPlan.didacticStrategies} onChange={e => setNewPlan({...newPlan, didacticStrategies: e.target.value})} />
                                </div>

                                {/* Seção 7: Bloco de Atividades */}
                                <div className="bg-[#18181b] border-b border-white/10">
                                    <div className="bg-white/5 py-3 text-center border-b border-white/10">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Atividade</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-px bg-white/10">
                                        <div className="bg-[#18181b] p-4 flex flex-col">
                                            <p className="text-[9px] font-black text-gray-500 uppercase text-center mb-3">Prévias</p>
                                            <textarea className="flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-white text-[10px] min-h-[120px]" placeholder="Atividades orais e escritas..." value={newPlan.activitiesPre} onChange={e => setNewPlan({...newPlan, activitiesPre: e.target.value})} />
                                        </div>
                                        <div className="bg-[#18181b] p-4 flex flex-col">
                                            <p className="text-[9px] font-black text-gray-500 uppercase text-center mb-3">Autodidáticas</p>
                                            <textarea className="flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-white text-[10px] min-h-[120px]" placeholder="Mobilização autônoma..." value={newPlan.activitiesAuto} onChange={e => setNewPlan({...newPlan, activitiesAuto: e.target.value})} />
                                        </div>
                                        <div className="bg-[#18181b] p-4 flex flex-col">
                                            <p className="text-[9px] font-black text-gray-500 uppercase text-center mb-3">Didático-Cooperativas</p>
                                            <textarea className="flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-white text-[10px] min-h-[120px]" placeholder="Duplas, trios ou equipes..." value={newPlan.activitiesCoop} onChange={e => setNewPlan({...newPlan, activitiesCoop: e.target.value})} />
                                        </div>
                                        <div className="bg-[#18181b] p-4 flex flex-col">
                                            <p className="text-[9px] font-black text-gray-500 uppercase text-center mb-3">Complementares</p>
                                            <textarea className="flex-1 bg-black/40 border border-white/5 rounded-lg p-3 text-white text-[10px] min-h-[120px]" placeholder="Forma clara e explícita..." value={newPlan.activitiesCompl} onChange={e => setNewPlan({...newPlan, activitiesCompl: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção 8: Práticas Educativas */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Práticas Educativas</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Práticas que apoiarão os estudantes..." value={newPlan.educationalPractices} onChange={e => setNewPlan({...newPlan, educationalPractices: e.target.value})} />
                                </div>

                                {/* Seção 9: Espaços Educativos */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Espaços Educativos</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Além das salas de aula..." value={newPlan.educationalSpaces} onChange={e => setNewPlan({...newPlan, educationalSpaces: e.target.value})} />
                                </div>

                                {/* Seção 10: Recursos Didáticos */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Recursos Didáticos</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Apoio para realização das atividades..." value={newPlan.didacticResources} onChange={e => setNewPlan({...newPlan, didacticResources: e.target.value})} />
                                </div>

                                {/* Seção 11: Estratégias de Avaliação */}
                                <div className="bg-[#18181b] p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Estratégias de Avaliação</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Estratégias e recursos a serem utilizados..." value={newPlan.evaluationStrategies} onChange={e => setNewPlan({...newPlan, evaluationStrategies: e.target.value})} />
                                </div>

                                {/* Seção 12: Fontes de Referência */}
                                <div className="bg-[#18181b] p-6">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 text-center">Fontes de Referência</p>
                                    <textarea className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-xs min-h-[80px] outline-none focus:border-red-600" placeholder="Utilizadas pelo professor e recomendadas aos estudantes..." value={newPlan.references} onChange={e => setNewPlan({...newPlan, references: e.target.value})} />
                                </div>

                                <div className="p-8 bg-black/40 border-t border-white/5">
                                    <Button onClick={handleSavePlan} isLoading={isSaving} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest bg-red-600 shadow-2xl">Salvar Planejamento Bimestral</Button>
                                </div>
                            </div>
                        ) : (
                            /* MODO DIÁRIO (MANTIDO SIMPLIFICADO) */
                            <div className="p-10 space-y-8 text-white">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Turma</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newPlan.className} onChange={e => setNewPlan({...newPlan, className: e.target.value})}>
                                            <option value="">-- Selecione --</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tópico da Aula</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newPlan.topic} onChange={e => setNewPlan({...newPlan, topic: e.target.value})} />
                                    </div>
                                </div>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm min-h-[200px]" placeholder="Metodologia e Procedimentos..." value={newPlan.methodology} onChange={e => setNewPlan({...newPlan, methodology: e.target.value})} />
                                <Button onClick={handleSavePlan} isLoading={isSaving} className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest bg-red-600 shadow-2xl">Salvar Plano Diário</Button>
                            </div>
                        )}
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
                <div className="animate-in fade-in max-w-2xl mx-auto">
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
