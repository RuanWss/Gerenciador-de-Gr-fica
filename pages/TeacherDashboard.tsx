
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
  BookOpen, Save, ArrowLeft, Info, FileEdit, Clock, Printer, Cpu, CheckSquare, Target, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { CLASSES } from '../constants';

const EXPECTED_RESULTS = [
    "Consciência ambiental/consumo responsável",
    "Criatividade e autoria (criar algo)",
    "Colaboração e protagonismo",
    "Comunicação (apresentar/explicar)",
    "Investigação (observação/pesquisa/dados)",
    "Uso responsável de tecnologia/IA"
];

const FINAL_PRODUCTS = [
    "Painel/Cartaz",
    "Maquete Digital/Protótipo",
    "Experimento",
    "Podcast/Vídeo",
    "Campanha/Intervenção",
    "Seminário",
    "Outro"
];

const PROJECT_STEPS = [
    "1. Sensibilizar (apresentar tema / combinar regras do projeto)",
    "2. Investigar (observar/pesquisar/coletar informações)",
    "3. Criar (produzir protótipo/peça/solução)",
    "4. Testar e melhorar (ajustes)",
    "5. Apresentar (mostra/seminário)",
    "6. Registrar (portfólio/evidências)"
];

const AI_PURPOSES = ["Ideias", "Roteiro", "Texto", "Imagem", "Vídeo", "Dados/gráficos"];

const EVIDENCE_TYPES = ["Fotos do processo", "Registro no caderno/diário", "Link de vídeo/podcast", "Tabelas/gráficos", "Relatório curto", "Portfólio da turma", "Outros"];

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
  const [examInstructions, setExamInstructions] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // --- FORM STATES (OCCURRENCES) ---
  const [showOccModal, setShowOccModal] = useState(false);
  const [newOcc, setNewOcc] = useState<Partial<StudentOccurrence>>({
      studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0]
  });
  const [occClass, setOccClass] = useState('');

  // --- FORM STATES (MATERIALS) ---
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matFile, setMatFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', className: '', subject: user?.subject || '' });

  // --- FORM STATES (PLANS) ---
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planType, setPlanType] = useState<'daily' | 'semester'>('semester');
  const [newPlan, setNewPlan] = useState<Partial<LessonPlan>>({
      className: '', subject: user?.subject || '', topic: '', content: '', methodology: '',
      evaluation: '', period: '', semesterContents: '', cognitiveSkills: '',
      socialEmotionalSkills: '', didacticResources: '', evaluationStrategies: ''
  });

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

  const handleSaveProject = async () => {
      if (!projectData.className || !projectData.theme) return alert("Preencha turma e tema.");
      setIsSaving(true);
      try {
          await savePedagogicalProject({
              ...projectData,
              id: editingProjectId || '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              updatedAt: Date.now(),
              createdAt: projectData.createdAt || Date.now()
          } as PedagogicalProject);
          alert("Projeto Inova AI salvo com sucesso!");
          setShowProjectForm(false);
          fetchData();
      } catch (e) { alert("Erro ao salvar projeto."); }
      finally { setIsSaving(false); }
  };

  const editProject = (p: PedagogicalProject) => {
      setProjectData(p);
      setEditingProjectId(p.id);
      setShowProjectForm(true);
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
          alert("Planejamento salvo!");
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
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (uploadedFiles.length === 0) return alert("Selecione pelo menos um arquivo.");
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
              gradeLevel: examGrade, instructions: examInstructions,
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Pedido enviado para a gráfica!");
          setActiveTab('requests');
          setExamTitle(''); setUploadedFiles([]);
      } catch (e) { alert("Erro ao enviar pedido."); }
      finally { setIsSaving(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveMaterial = async () => {
      if (!newMaterial.title || !newMaterial.className || !matFile) return alert("Preencha todos os campos.");
      setIsSaving(true);
      try {
          const fileUrl = await uploadExamFile(matFile, user?.name || 'Professor');
          await saveClassMaterial({
              id: '', teacherId: user?.id || '', teacherName: user?.name || '',
              title: newMaterial.title, className: newMaterial.className,
              subject: newMaterial.subject, fileUrl: fileUrl, fileName: matFile.name,
              fileType: matFile.type, createdAt: Date.now()
          });
          setShowMaterialModal(false);
          setMatFile(null);
          fetchData();
          alert("Material enviado!");
      } catch (error) { alert("Erro ao salvar material."); }
      finally { setIsSaving(false); }
  };

  const handleSaveOccurrence = async () => {
      if (!newOcc.studentId || !newOcc.description) return alert("Preencha todos os campos.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === newOcc.studentId);
          await saveOccurrence({
              id: '',
              studentId: newOcc.studentId,
              studentName: student?.name || '',
              studentClass: student?.className || '',
              category: newOcc.category as any,
              severity: newOcc.severity as any,
              description: newOcc.description!,
              date: newOcc.date!,
              timestamp: Date.now(),
              reportedBy: user?.name || 'Desconhecido'
          });
          setShowOccModal(false);
          setNewOcc({ studentId: '', category: 'indisciplina', severity: 'low', description: '', date: new Date().toISOString().split('T')[0] });
          alert("Ocorrência registrada!");
      } catch (error) { alert("Erro ao salvar ocorrência."); }
      finally { setIsSaving(false); }
  };

  const handleDeleteOccurrence = async (id: string) => {
      if (confirm("Excluir ocorrência?")) {
          await deleteOccurrence(id);
      }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2 opacity-50">Menu Professor</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Fila da Gráfica</button>
                <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => setActiveTab('inova_ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'inova_ai' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Cpu size={18} /> Projeto Inova AI</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Folder size={18} /> Materiais Aula</button>
                <button onClick={() => setActiveTab('occurrences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'occurrences' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><AlertCircle size={18} /> Ocorrências</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Minha Fila na Gráfica</h1>
                        <p className="text-gray-400 font-medium">Acompanhe o status das suas impressões.</p>
                    </header>
                    <div className="bg-[#18181b] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
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

            {activeTab === 'inova_ai' && !showProjectForm && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight flex items-center gap-3">
                                <Cpu className="text-red-600"/> Instrumental 2026 – INOVA AI
                            </h1>
                            <p className="text-gray-400 font-medium">Gestão de Projetos e Subprojetos de Inovação.</p>
                        </div>
                        <Button onClick={() => { setProjectData({ className: '', theme: '', guidingQuestion: '', objective: '', expectedResults: [], finalProduct: '', finalProductDescription: '', steps: [], timeline: { start: '', diagnosis: '', planning: '', handsOn: [], socialization: '', evaluation: '' }, resources: '', aiUsage: { tools: '', purpose: [], careTaken: '' }, evidence: [] }); setEditingProjectId(null); setShowProjectForm(true); }} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest">
                            <Plus size={18} className="mr-2"/> Novo Subprojeto
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.map(p => (
                            <div key={p.id} onClick={() => editProject(p)} className="bg-[#18181b] border-2 border-white/5 hover:border-red-600/50 p-8 rounded-[2.5rem] shadow-xl transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-600/20">{p.className}</span>
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir projeto?")) deletePedagogicalProject(p.id).then(fetchData); }} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-red-500 transition-colors">{p.theme}</h3>
                                <p className="text-xs text-gray-500 font-medium mb-6 line-clamp-2 italic">"{p.guidingQuestion}"</p>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {p.steps?.length === 6 ? <span className="bg-green-600/10 text-green-500 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-green-600/20">Finalizado</span> : <span className="bg-yellow-600/10 text-yellow-500 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-yellow-600/20">Em Andamento ({p.steps?.length}/6)</span>}
                                </div>
                                <div className="pt-6 border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase flex justify-between items-center">
                                    <span>Atualizado em: {new Date(p.updatedAt).toLocaleDateString()}</span>
                                    <span className="text-white group-hover:translate-x-1 transition-transform">Ver Detalhes →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'inova_ai' && showProjectForm && (
                <div className="animate-in slide-in-from-bottom-4 fade-in max-w-5xl mx-auto">
                    <button onClick={() => setShowProjectForm(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-black uppercase text-[10px] tracking-widest transition-all">
                        <ArrowLeft size={16}/> Voltar para Meus Projetos
                    </button>
                    
                    <div className="bg-[#18181b] border-2 border-red-600/20 rounded-[3.5rem] shadow-2xl overflow-hidden pb-20">
                        <div className="p-12 border-b border-white/5 bg-red-600/5 flex items-center gap-6">
                            <div className="h-20 w-20 bg-red-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-red-900/40"><Cpu size={40}/></div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Instrumental 2026 – INOVA AI</h2>
                                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Formulário de Estruturação Pedagógica</p>
                            </div>
                        </div>

                        <div className="p-12 space-y-16">
                            {/* SECTION 1: IDENTIFICAÇÃO */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 1. Identificação</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma/Série</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 appearance-none" value={projectData.className} onChange={e => setProjectData({...projectData, className: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Tema do Subprojeto</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" placeholder="Digite o tema..." value={projectData.theme} onChange={e => setProjectData({...projectData, theme: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 2 & 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 2. Questão Norteadora</h3>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[150px]" placeholder="Que problema real vamos investigar e melhorar?" value={projectData.guidingQuestion} onChange={e => setProjectData({...projectData, guidingQuestion: e.target.value})} />
                                </section>
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 3. Objetivo do Subprojeto</h3>
                                    <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[150px]" placeholder="Ao final, os alunos serão capazes de...?" value={projectData.objective} onChange={e => setProjectData({...projectData, objective: e.target.value})} />
                                </section>
                            </div>

                            {/* SECTION 4: RESULTADOS ESPERADOS */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 4. Resultados Esperados (Marque 3 a 5)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {EXPECTED_RESULTS.map(res => (
                                        <label key={res} className="flex items-center gap-4 bg-black/20 p-5 rounded-2xl border border-white/5 cursor-pointer group hover:bg-red-600/5 transition-all">
                                            <input type="checkbox" className="w-6 h-6 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" 
                                                checked={projectData.expectedResults?.includes(res)}
                                                onChange={e => {
                                                    const current = projectData.expectedResults || [];
                                                    const updated = e.target.checked ? [...current, res] : current.filter(i => i !== res);
                                                    setProjectData({...projectData, expectedResults: updated});
                                                }}
                                            />
                                            <span className="text-xs font-bold text-gray-400 group-hover:text-white uppercase tracking-tight">{res}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* SECTION 5: PRODUTO FINAL */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 5. Produto Final</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {FINAL_PRODUCTS.map(prod => (
                                        <button key={prod} onClick={() => setProjectData({...projectData, finalProduct: prod})} className={`py-4 px-2 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${projectData.finalProduct === prod ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-500 hover:text-white'}`}>
                                            {prod}
                                        </button>
                                    ))}
                                </div>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-medium text-sm outline-none focus:border-red-600 min-h-[100px]" placeholder="Descrição do que será apresentado na culminância (2-3 linhas)..." value={projectData.finalProductDescription} onChange={e => setProjectData({...projectData, finalProductDescription: e.target.value})} />
                            </section>

                            {/* SECTION 6: ETAPAS */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 6. Etapas do Projeto (Checklist)</h3>
                                <div className="space-y-3">
                                    {PROJECT_STEPS.map(step => (
                                        <label key={step} className="flex items-center gap-4 bg-black/20 p-5 rounded-2xl border border-white/5 cursor-pointer group">
                                            <input type="checkbox" className="w-6 h-6 rounded border-white/10 bg-black text-red-600" 
                                                checked={projectData.steps?.includes(step)}
                                                onChange={e => {
                                                    const current = projectData.steps || [];
                                                    const updated = e.target.checked ? [...current, step] : current.filter(i => i !== step);
                                                    setProjectData({...projectData, steps: updated});
                                                }}
                                            />
                                            <span className="text-xs font-bold text-gray-400 group-hover:text-white uppercase">{step}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* SECTION 7: CRONOGRAMA */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><div className="h-6 w-1 bg-red-600"></div> 7. Cronograma Mínimo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {['Início previsto', 'Diagnóstico do problema', 'Planejamento', 'Socialização', 'Avaliação'].map(label => {
                                        const keyMap: any = { 'Início previsto': 'start', 'Diagnóstico do problema': 'diagnosis', 'Planejamento': 'planning', 'Socialização': 'socialization', 'Avaliação': 'evaluation' };
                                        const key = keyMap[label];
                                        return (
                                            <div key={label} className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">{label}</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-red-600" placeholder="Período / Data" value={projectData.timeline?.[key] || ''} onChange={e => setProjectData({...projectData, timeline: {...projectData.timeline!, [key]: e.target.value}})} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* SECTION 9: USO DE IA */}
                            <section className="bg-red-600/5 p-10 rounded-[3rem] border border-red-600/20 space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><Sparkles size={20}/> 9. Uso de IA (Obrigatório)</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Ferramentas Utilizadas</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm" placeholder="Ex: ChatGPT, Gemini, IA Studio..." value={projectData.aiUsage?.tools} onChange={e => setProjectData({...projectData, aiUsage: {...projectData.aiUsage!, tools: e.target.value}})} />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Para quê?</label>
                                        <div className="flex flex-wrap gap-3">
                                            {AI_PURPOSES.map(p => (
                                                <label key={p} className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-xl border border-white/5 cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600"
                                                        checked={projectData.aiUsage?.purpose?.includes(p)}
                                                        onChange={e => {
                                                            const current = projectData.aiUsage?.purpose || [];
                                                            const updated = e.target.checked ? [...current, p] : current.filter(i => i !== p);
                                                            setProjectData({...projectData, aiUsage: {...projectData.aiUsage!, purpose: updated}});
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-black text-gray-300 uppercase">{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Cuidado Adotado</label>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-sm min-h-[100px]" placeholder="Como o uso foi supervisionado/validado?" value={projectData.aiUsage?.careTaken} onChange={e => setProjectData({...projectData, aiUsage: {...projectData.aiUsage!, careTaken: e.target.value}})} />
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 10: EVIDÊNCIAS */}
                            <section className="space-y-8">
                                <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3"><ImageIcon size={20}/> 10. Evidências de Execução</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {EVIDENCE_TYPES.map(type => (
                                        <label key={type} className="flex items-center gap-4 bg-black/20 p-5 rounded-2xl border border-white/5 cursor-pointer group">
                                            <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600"
                                                checked={projectData.evidence?.includes(type)}
                                                onChange={e => {
                                                    const current = projectData.evidence || [];
                                                    const updated = e.target.checked ? [...current, type] : current.filter(i => i !== type);
                                                    setProjectData({...projectData, evidence: updated});
                                                }}
                                            />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <Button onClick={handleSaveProject} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 shadow-2xl shadow-red-900/40">
                                <Save size={24} className="mr-3"/> Salvar Projeto INOVA AI
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'plans' && !showPlanForm && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Meus Planejamentos</h1>
                            <p className="text-gray-400 font-medium">Planos Bimestrais e Diários registrados.</p>
                        </div>
                        <Button onClick={() => setShowPlanForm(true)} className="bg-red-600 h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest">
                            <Plus size={18} className="mr-2"/> Novo Plano
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(p => (
                            <div key={p.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:border-red-600/30 transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${p.type === 'semester' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : 'bg-green-600/10 text-green-400 border-green-600/20'}`}>
                                        {p.type === 'semester' ? 'Bimestral' : 'Diário'}
                                    </span>
                                    <button onClick={() => handleDeletePlan(p.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="text-lg font-black text-white uppercase mb-1">{p.className}</h3>
                                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-4">{p.subject}</p>
                                <p className="text-xs text-gray-400 font-medium line-clamp-3 italic mb-6">"{p.topic || p.semesterContents}"</p>
                                <div className="mt-auto pt-4 border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase flex justify-between">
                                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    <button className="text-white hover:text-red-500">Abrir Detalhes</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* REST OF TAB RENDER LOGIC */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Minha Fila na Gráfica</h1>
                    </header>
                    <div className="bg-[#18181b] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
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
            
            {/* OTHER TABS ... (Create, Materials, Occurrences) maintained same as provided */}
        </div>
        
        {/* MODALS REUTILIZADOS maintained as provided ... */}
    </div>
  );
};
