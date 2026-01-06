
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    getClassMaterials,
    saveClassMaterial,
    deleteClassMaterial,
    getLessonPlans,
    saveLessonPlan,
    deleteLessonPlan,
    getAllPEIs,
    savePEIDocument,
    deletePEIDocument,
    listenToStudents,
    uploadReportFile
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, ClassMaterial, LessonPlan, PEIDocument, Student } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, Layout, X, 
  Wand2, Folder, File as FileIcon, Trash2, Edit3, CheckCircle, FileUp, FileDown, ExternalLink, Search,
  BookOpen, Heart, FileText, Calendar, Save, Eye, ChevronRight, Download, Info, Target, LayoutPanelLeft, Compass,
  LayoutPanelTop, Image as ImageIcon, ArrowLeft
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

// Fixed FormSection by moving it outside the main component and making children optional to resolve property missing errors in JSX
const FormSection = ({ title, icon: Icon, children }: { title: string, icon: any, children?: React.ReactNode }) => (
    <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Icon size={16} className="text-red-500" />
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">{children}</div>
    </div>
);

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials' | 'planning' | 'pei'>('requests');
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create' | 'header'>('none');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [peis, setPeis] = useState<PEIDocument[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- FORM STATES (EXAM) ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [examSubject, setExamSubject] = useState(user?.subject || '');
  const [examInstructions, setExamInstructions] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // --- FORM STATES (MATERIALS) ---
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matFile, setMatFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', className: '', subject: user?.subject || '' });

  // --- FORM STATES (PLANNING) ---
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<LessonPlan>>({
      type: 'daily',
      subject: user?.subject || '',
      className: '',
      period: '1º BIMESTRE',
      date: new Date().toISOString().split('T')[0],
      topic: '',
      content: '',
      methodology: ''
  });

  // --- FORM STATES (PEI) ---
  const [showPeiModal, setShowPeiModal] = useState(false);
  const [newPei, setNewPei] = useState<Partial<PEIDocument>>({
      studentId: '',
      studentName: '',
      subject: user?.subject || '',
      period: '1º BIMESTRE',
      essentialCompetencies: '',
      selectedContents: '',
      didacticResources: '',
      evaluation: ''
  });

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
      const unsub = listenToStudents(setStudents);
      return () => unsub();
  }, []);

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
        } else if (activeTab === 'planning') {
            const allPlans = await getLessonPlans(user.id);
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'pei') {
            const allPeis = await getAllPEIs(user.id);
            setPeis(allPeis.sort((a,b) => b.updatedAt - a.updatedAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const filesArray = Array.from(e.target.files);
          setUploadedFiles(prev => [...prev, ...filesArray]);
      }
  };

  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (creationMode === 'upload' && uploadedFiles.length === 0) return alert("Selecione pelo menos um arquivo.");
      
      setIsSaving(true);
      try {
          const fileUrls: string[] = [];
          const fileNames: string[] = [];

          if (creationMode === 'upload' && uploadedFiles.length > 0) {
              for (const file of uploadedFiles) {
                  const url = await uploadExamFile(file, user?.name || 'Professor');
                  fileUrls.push(url);
                  fileNames.push(file.name);
              }
          }

          const examData: ExamRequest = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: examSubject || 'Geral',
              title: examTitle,
              quantity: Number(printQty),
              gradeLevel: examGrade,
              instructions: examInstructions,
              fileNames: fileNames.length > 0 ? fileNames : ['pedido_manual.pdf'],
              fileUrls: fileUrls,
              status: ExamStatus.PENDING,
              createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              materialType: 'exam',
              columns: 1,
              headerData: {
                  schoolName: "CENTRO DE ESTUDOS PROF. MANOEL LEITE",
                  showStudentName: true,
                  showScore: true
              }
          };
          await saveExam(examData);

          alert("Pedido enviado para a gráfica!");
          setCreationMode('none');
          setActiveTab('requests');
          fetchData();
          resetForm();
      } catch (e) { 
          console.error(e);
          alert("Erro ao enviar pedido."); 
      }
      finally { setIsSaving(false); }
  };

  // --- MATERIAL ACTIONS ---
  const handleSaveMaterial = async () => {
      if (!newMaterial.title || !newMaterial.className || !matFile) return alert("Preencha todos os campos e selecione um arquivo.");
      setIsSaving(true);
      try {
          const fileUrl = await uploadExamFile(matFile, user?.name || 'Professor');
          const matData: ClassMaterial = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              title: newMaterial.title,
              className: newMaterial.className,
              subject: newMaterial.subject,
              fileUrl: fileUrl,
              fileName: matFile.name,
              fileType: matFile.type,
              createdAt: Date.now()
          };
          await saveClassMaterial(matData);
          setShowMaterialModal(false);
          setMatFile(null);
          setNewMaterial({ title: '', className: '', subject: user?.subject || '' });
          fetchData();
          alert("Material enviado para a sala!");
      } catch (e) { alert("Erro ao salvar material."); }
      finally { setIsSaving(false); }
  };

  const handleDeleteMaterial = async (id: string) => {
      if (confirm("Excluir este material? Os alunos não terão mais acesso.")) {
          await deleteClassMaterial(id);
          fetchData();
      }
  };

  // --- PLANNING ACTIONS ---
  const handleSavePlan = async () => {
      if (!newPlan.className) return alert("Preencha a turma.");
      if (newPlan.type === 'daily' && !newPlan.topic) return alert("Preencha o tema.");
      
      setIsSaving(true);
      try {
          await saveLessonPlan({
              ...newPlan as LessonPlan,
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              createdAt: newPlan.createdAt || Date.now()
          });
          setShowPlanModal(false);
          fetchData();
          alert(newPlan.id ? "Planejamento atualizado!" : "Planejamento salvo!");
      } catch (e) { alert("Erro ao salvar planejamento."); }
      finally { setIsSaving(false); }
  };

  const handleEditPlan = (plan: LessonPlan) => {
      setNewPlan(plan);
      setShowPlanModal(true);
  };

  const handleDeletePlan = async (id: string) => {
      if (confirm("Deseja realmente excluir este planejamento?")) {
          setIsLoading(true);
          try {
              await deleteLessonPlan(id);
              fetchData();
          } catch (e) { alert("Erro ao excluir."); }
          finally { setIsLoading(false); }
      }
  };

  // --- PEI ACTIONS ---
  const handleSavePei = async () => {
      if (!newPei.studentId) return alert("Selecione um aluno.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === newPei.studentId);
          await savePEIDocument({
              ...newPei as PEIDocument,
              studentName: student?.name || '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              updatedAt: Date.now()
          });
          setShowPeiModal(false);
          fetchData();
          alert(newPei.id ? "Documento PEI atualizado!" : "Documento PEI salvo!");
      } catch (e) { alert("Erro ao salvar PEI."); }
      finally { setIsSaving(false); }
  };

  const handleEditPei = (pei: PEIDocument) => {
      setNewPei(pei);
      setShowPeiModal(true);
  };

  const handleDeletePei = async (id: string) => {
      if (confirm("Deseja realmente excluir este documento PEI?")) {
          setIsLoading(true);
          try {
              await deletePEIDocument(id);
              fetchData();
          } catch (e) { alert("Erro ao excluir."); }
          finally { setIsLoading(false); }
      }
  };

  const resetForm = () => {
      setExamTitle('');
      setExamGrade('');
      setExamInstructions('');
      setUploadedFiles([]);
  };

  const resetPlanForm = () => {
      setNewPlan({
          type: 'daily',
          subject: user?.subject || '',
          className: '',
          period: '1º BIMESTRE',
          date: new Date().toISOString().split('T')[0],
          topic: '',
          content: '',
          methodology: ''
      });
  };

  const resetPeiForm = () => {
      setNewPei({
          studentId: '',
          studentName: '',
          subject: user?.subject || '',
          period: '1º BIMESTRE',
          essentialCompetencies: '',
          selectedContents: '',
          didacticResources: '',
          evaluation: ''
      });
  };

  const handleDownloadHeader = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const aeeStudents = students.filter(s => s.isAEE);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gráfica & Provas</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Minha Fila</button>
                <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Folder size={18} /> Materiais Aula</button>
            </div>
            
            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Pedagógico</p>
                <button onClick={() => setActiveTab('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'planning' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-300 hover:bg-white/10'}`}><BookOpen size={18} /> Planejamentos</button>
                <button onClick={() => setActiveTab('pei')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'pei' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Heart size={18} /> Plano PEI (AEE)</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila da Gráfica</h1>
                            <p className="text-gray-400">Acompanhe o status e confira os arquivos enviados.</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input 
                                className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm"
                                placeholder="Buscar por Título ou Turma..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </header>
                    <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Título / Anexos</th>
                                    <th className="p-6">Turma</th>
                                    <th className="p-6">Cópias</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredExams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="font-bold text-white uppercase">{e.title}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {e.fileUrls && e.fileUrls.map((url, idx) => (
                                                        <a 
                                                            key={idx} 
                                                            href={url} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 px-2 py-1 rounded-lg border border-red-600/20 text-[10px] font-bold text-red-500 transition-all"
                                                            title={e.fileNames?.[idx]}
                                                        >
                                                            <FileDown size={12}/> {e.fileNames?.[idx]?.substring(0, 15)}...
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6"><span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-gray-300">{e.gradeLevel}</span></td>
                                        <td className="p-6 font-mono font-bold text-red-500">{e.quantity}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : 
                                                 e.status === ExamStatus.IN_PROGRESS ? 'Na Impressora' : 'Pronto p/ Retirar'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExams.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-500 font-bold uppercase text-xs">Nenhum pedido encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Materiais para Sala de Aula</h1>
                            <p className="text-gray-400">Envie PDFs e arquivos para os tablets/TVs das salas.</p>
                        </div>
                        <Button onClick={() => setShowMaterialModal(true)} className="bg-red-600 hover:bg-red-700">
                            <Plus size={18} className="mr-2"/> Novo Material
                        </Button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {materials.map(mat => (
                            <div key={mat.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] hover:border-red-500/40 transition-all shadow-xl flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-red-600/10 text-red-500 rounded-xl">
                                        <FileText size={24}/>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold">{new Date(mat.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{mat.title}</h3>
                                <p className="text-xs text-red-500 font-black uppercase mb-6 tracking-widest">{mat.className}</p>
                                
                                <div className="mt-auto flex gap-2">
                                    <a 
                                        href={mat.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 transition-all"
                                    >
                                        <Download size={14}/> Baixar
                                    </a>
                                    <button 
                                        onClick={() => handleDeleteMaterial(mat.id)}
                                        className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MODAL MATERIAL */}
                    {showMaterialModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Enviar Material</h2>
                                    <button onClick={() => setShowMaterialModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Título do Material</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-600" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} placeholder="Ex: Slide Aula 04" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Turma Destino</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-600" value={newMaterial.className} onChange={e => setNewMaterial({...newMaterial, className: e.target.value})}>
                                            <option value="">Selecione a turma...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-black/30 border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-red-600 transition-all relative">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setMatFile(e.target.files?.[0] || null)} />
                                        {matFile ? (
                                            <div className="flex items-center justify-center gap-2 text-green-500 font-bold text-sm">
                                                <CheckCircle size={20}/> {matFile.name}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <FileUp size={32}/>
                                                <span className="text-[10px] font-black uppercase">Clique para selecionar arquivo</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button onClick={handleSaveMaterial} isLoading={isSaving} className="w-full h-14 bg-red-600 font-black uppercase tracking-widest">Enviar Agora</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'planning' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Planejamento Pedagógico</h1>
                            <p className="text-gray-400">Gerencie seus planos de aula diários e o Guia de Aprendizagem Semestral.</p>
                        </div>
                        <Button onClick={() => { resetPlanForm(); setShowPlanModal(true); }} className="bg-blue-600 hover:bg-blue-700">
                            <Plus size={18} className="mr-2"/> Novo Planejamento
                        </Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] hover:border-blue-500/40 transition-all shadow-xl flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${plan.type === 'daily' ? 'bg-blue-900/20 text-blue-500' : 'bg-green-900/20 text-green-500'}`}>{plan.type === 'daily' ? 'Diário' : 'Semestral'}</span>
                                    <span className="text-[10px] text-gray-500 font-bold">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{plan.topic || 'Guia de Aprendizagem'}</h3>
                                <p className="text-xs text-gray-400 mb-6">{plan.className} • {plan.subject}</p>
                                
                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => handleEditPlan(plan)}
                                        className="py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-500/20 transition-all"
                                    >
                                        <Edit3 size={14}/> Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePlan(plan.id)}
                                        className="py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-600/20 transition-all"
                                    >
                                        <Trash2 size={14}/> Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'pei' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Plano PEI (AEE)</h1>
                            <p className="text-gray-400">Documentação pedagógica para alunos com necessidades especiais.</p>
                        </div>
                        <Button onClick={() => { resetPeiForm(); setShowPeiModal(true); }} className="bg-pink-600 hover:bg-pink-700">
                            <Plus size={18} className="mr-2"/> Novo Documento PEI
                        </Button>
                    </header>
                    <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-6">Aluno</th>
                                    <th className="p-6">Disciplina / Período</th>
                                    <th className="p-6">Última Atualização</th>
                                    <th className="p-6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {peis.map(pei => (
                                    <tr key={pei.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-pink-900/20 text-pink-500 flex items-center justify-center"><Heart size={14}/></div>
                                                <span className="font-bold text-white uppercase">{pei.studentName}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <p className="text-xs text-white font-bold">{pei.subject}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{pei.period}</p>
                                        </td>
                                        <td className="p-6 text-xs text-gray-400 font-medium">{new Date(pei.updatedAt).toLocaleDateString()}</td>
                                        <td className="p-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditPei(pei)} className="p-2 hover:bg-blue-600/20 rounded-xl text-blue-500 transition-all"><Edit3 size={18}/></button>
                                                <button onClick={() => handleDeletePei(pei.id)} className="p-2 hover:bg-red-600/20 rounded-xl text-red-500 transition-all"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL PLANEJAMENTO */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className={`bg-[#18181b] border border-white/10 w-full ${newPlan.type === 'semester' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto custom-scrollbar`}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{newPlan.id ? 'Editar Planejamento' : 'Novo Planejamento'}</h2>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Prof. {user?.name}</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-500 hover:text-gray-900 transition-colors"><X size={32}/></button>
                        </div>
                        
                        <div className="space-y-8">
                            {/* SELEÇÃO DE TIPO E DADOS BÁSICOS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Tipo</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-600" value={newPlan.type} onChange={e => setNewPlan({...newPlan, type: e.target.value as any})}>
                                        <option value="daily">Plano Diário</option>
                                        <option value="semester">Guia de Aprendizagem (Bimestral)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-600" value={newPlan.className} onChange={e => setNewPlan({...newPlan, className: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Bimestre</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-600" value={newPlan.period} onChange={e => setNewPlan({...newPlan, period: e.target.value})}>
                                        <option value="1º BIMESTRE">1º Bimestre</option>
                                        <option value="2º BIMESTRE">2º Bimestre</option>
                                        <option value="3º BIMESTRE">3º Bimestre</option>
                                        <option value="4º BIMESTRE">4º Bimestre</option>
                                    </select>
                                </div>
                            </div>

                            {/* FORMULÁRIO DIÁRIO */}
                            {newPlan.type === 'daily' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Tema da Aula</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-600 font-bold" value={newPlan.topic} onChange={e => setNewPlan({...newPlan, topic: e.target.value})} placeholder="Título da aula ou unidade" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Metodologia e Procedimentos</label>
                                        <textarea rows={5} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-600 leading-relaxed" value={newPlan.methodology} onChange={e => setNewPlan({...newPlan, methodology: e.target.value})} placeholder="Como a aula será conduzida..."></textarea>
                                    </div>
                                </div>
                            )}

                            {/* FORMULÁRIO SEMESTRAL (GUIA DE APRENDIZAGEM - CONFORME IMAGEM) */}
                            {newPlan.type === 'semester' && (
                                <div className="space-y-6 animate-in fade-in duration-300 border-t border-white/5 pt-6">
                                    
                                    <FormSection title="Fundamentação" icon={LayoutPanelLeft}>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Breve Justificativa</label>
                                            <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.justification} onChange={e => setNewPlan({...newPlan, justification: e.target.value})} placeholder="Importância dos conceitos a serem desenvolvidos..."/>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Conteúdos</label>
                                            <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.semesterContents} onChange={e => setNewPlan({...newPlan, semesterContents: e.target.value})} placeholder="Descrição dos conteúdos coerentes com planos de ensino..."/>
                                        </div>
                                    </FormSection>

                                    <FormSection title="Habilidades" icon={Target}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Cognitivas</label>
                                                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.cognitiveSkills} onChange={e => setNewPlan({...newPlan, cognitiveSkills: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Socioemocionais</label>
                                                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.socialEmotionalSkills} onChange={e => setNewPlan({...newPlan, socialEmotionalSkills: e.target.value})} />
                                            </div>
                                        </div>
                                    </FormSection>

                                    <FormSection title="Desenvolvimento Didático" icon={Compass}>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Situações Didáticas</label>
                                            <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.didacticStrategies} onChange={e => setNewPlan({...newPlan, didacticStrategies: e.target.value})} placeholder="Estratégias para assegurar a aprendizagem significativa..."/>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                            <div className="md:col-span-2">
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center mb-4">Atividades</p>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Prévias</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.activitiesPre} onChange={e => setNewPlan({...newPlan, activitiesPre: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Autodidáticas</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.activitiesAuto} onChange={e => setNewPlan({...newPlan, activitiesAuto: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Didático-Cooperativas</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.activitiesCoop} onChange={e => setNewPlan({...newPlan, activitiesCoop: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Complementares</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.activitiesCompl} onChange={e => setNewPlan({...newPlan, activitiesCompl: e.target.value})} />
                                            </div>
                                        </div>
                                    </FormSection>

                                    <FormSection title="Meios e Estratégias" icon={Info}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Práticas Educativas</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.educationalPractices} onChange={e => setNewPlan({...newPlan, educationalPractices: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Espaços Educativos</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.educationalSpaces} onChange={e => setNewPlan({...newPlan, educationalSpaces: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Recursos Didáticos</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.didacticResources} onChange={e => setNewPlan({...newPlan, didacticResources: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Estratégias de Avaliação</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.evaluationStrategies} onChange={e => setNewPlan({...newPlan, evaluationStrategies: e.target.value})} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Fontes de Referência</label>
                                                <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-red-600" value={newPlan.references} onChange={e => setNewPlan({...newPlan, references: e.target.value})} />
                                            </div>
                                        </div>
                                    </FormSection>
                                </div>
                            )}

                            <div className="pt-8 border-t border-white/10">
                                <Button onClick={handleSavePlan} isLoading={isSaving} className="w-full h-16 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-[0.2em] shadow-2xl">
                                    <Save size={20} className="mr-3" /> {newPlan.id ? 'Atualizar Planejamento' : 'Finalizar e Salvar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PEI */}
            {showPeiModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{newPei.id ? 'Editar Documento PEI' : 'Relatório PEI (Adaptação)'}</h2>
                            <button onClick={() => setShowPeiModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Selecionar Aluno AEE</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-600" value={newPei.studentId} onChange={e => setNewPei({...newPei, studentId: e.target.value})} disabled={!!newPei.id}>
                                        <option value="">Selecione o Aluno...</option>
                                        {aeeStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Período</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-600" value={newPei.period} onChange={e => setNewPei({...newPei, period: e.target.value})}>
                                        <option value="1º BIMESTRE">1º Bimestre</option>
                                        <option value="2º BIMESTRE">2º Bimestre</option>
                                        <option value="3º BIMESTRE">3º Bimestre</option>
                                        <option value="4º BIMESTRE">4º Bimestre</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Competências Essenciais</label>
                                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-600" value={newPei.essentialCompetencies} onChange={e => setNewPei({...newPei, essentialCompetencies: e.target.value})} placeholder="Quais habilidades serão trabalhadas?"></textarea>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Conteúdos Adaptados</label>
                                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-600" value={newPei.selectedContents} onChange={e => setNewPei({...newPei, selectedContents: e.target.value})} placeholder="Quais conteúdos serão priorizados?"></textarea>
                            </div>
                            <Button onClick={handleSavePei} isLoading={isSaving} className="w-full h-14 bg-pink-600 font-black uppercase tracking-widest">{newPei.id ? 'Atualizar Documento PEI' : 'Salvar Documento PEI'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ABAS ORIGINAIS (CREATE) */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {creationMode === 'none' ? (
                        <div className="max-w-4xl mx-auto py-12">
                             <div className="text-center mb-12">
                                <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Enviar para Impressão</h1>
                                <p className="text-gray-400 text-lg">Como deseja encaminhar o material para a gráfica?</p>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button onClick={() => setCreationMode('upload')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-red-600 transition-all group shadow-2xl">
                                    <div className="h-24 w-24 bg-red-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><UploadCloud size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Fazer Upload</h3>
                                    <p className="text-gray-500">Envie PDF, Word ou imagens prontas.</p>
                                </button>
                                <button onClick={() => setCreationMode('header')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group shadow-2xl">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><LayoutPanelTop size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Cabeçalho</h3>
                                    <p className="text-gray-500">Baixe o cabeçalho oficial da escola.</p>
                                </button>
                             </div>
                        </div>
                    ) : creationMode === 'header' ? (
                        <div className="max-w-4xl mx-auto py-12">
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={() => setCreationMode('none')} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all">
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Cabeçalhos Oficiais</h1>
                                    <p className="text-gray-400">Selecione o modelo para baixar o cabeçalho oficial.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#18181b] border-2 border-white/5 p-8 rounded-[2.5rem] flex flex-col group hover:border-red-600/30 transition-all">
                                    <div className="h-48 bg-black/40 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-red-600/20 transition-all">
                                        <ImageIcon size={64} className="text-gray-700 group-hover:text-red-600/40 transition-all" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase mb-2">Cabeçalho de Prova</h3>
                                    <p className="text-gray-500 text-sm mb-8">Modelo padrão para avaliações e testes bimestrais.</p>
                                    <button 
                                        onClick={() => handleDownloadHeader('https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png', 'CABECALHO_PROVA_CEMAL.png')}
                                        className="mt-auto w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-xl shadow-red-900/20"
                                    >
                                        <Download size={18}/> Baixar Agora
                                    </button>
                                </div>
                                <div className="bg-[#18181b] border-2 border-white/5 p-8 rounded-[2.5rem] flex flex-col group hover:border-blue-600/30 transition-all">
                                    <div className="h-48 bg-black/40 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-blue-600/20 transition-all">
                                        <ImageIcon size={64} className="text-gray-700 group-hover:text-blue-600/40 transition-all" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase mb-2">Cabeçalho de Apostila</h3>
                                    <p className="text-gray-500 text-sm mb-8">Modelo otimizado para materiais e apostilas de aula.</p>
                                    <button 
                                        onClick={() => handleDownloadHeader('https://i.ibb.co/4ZyLcnq7/CABE-ALHO-APOSTILA.png', 'CABECALHO_APOSTILA_CEMAL.png')}
                                        className="mt-auto w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/20"
                                    >
                                        <Download size={18}/> Baixar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-2xl font-black text-white uppercase flex items-center gap-4">
                                        {creationMode === 'upload' ? <UploadCloud className="text-red-500" /> : <Layout className="text-blue-500" />}
                                        Novo Pedido
                                    </h3>
                                    <button onClick={() => { setCreationMode('none'); setUploadedFiles([]); }} className="text-gray-500 hover:text-white"><X size={32}/></button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título da Prova</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Avaliação Bimestral" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                                <option value="">Selecione...</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                                            <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                        </div>
                                    </div>

                                    {creationMode === 'upload' && (
                                        <div className="space-y-4">
                                            <div className="bg-black/30 border-2 border-dashed border-white/10 rounded-3xl p-8 text-center hover:border-red-600 transition-all relative group">
                                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileUp size={48} className="text-gray-600 group-hover:text-red-500 mb-2" />
                                                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Clique ou arraste múltiplos arquivos</p>
                                                </div>
                                            </div>
                                            
                                            {uploadedFiles.length > 0 && (
                                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Arquivos selecionados:</p>
                                                    {uploadedFiles.map((f, i) => (
                                                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <FileIcon size={16} className="text-red-500" />
                                                                <span className="text-xs text-white font-bold truncate max-w-[200px]">{f.name}</span>
                                                            </div>
                                                            <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-500 p-1">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Instruções Extras</label>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" rows={2} value={examInstructions} onChange={e => setExamInstructions(e.target.value)} placeholder="Frente e verso, grampeado..."></textarea>
                                    </div>

                                    <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest bg-red-600 shadow-2xl">
                                        Enviar para Gráfica
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
