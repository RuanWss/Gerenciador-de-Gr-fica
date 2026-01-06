
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
import { ExamRequest, ExamStatus, ClassMaterial, LessonPlan, PEIDocument, Student, PrintingOptions } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, Layout, X, 
  Wand2, Folder, File as FileIcon, Trash2, Edit3, CheckCircle, FileUp, FileDown, ExternalLink, Search,
  BookOpen, Heart, FileText, Calendar, Save, Eye, ChevronRight, Download, Info, Target, LayoutPanelLeft, Compass,
  LayoutPanelTop, Image as ImageIcon, ArrowLeft, FileType, Printer, Layers
} from 'lucide-react';
import { CLASSES } from '../constants';

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
  const [printingOpts, setPrintingOpts] = useState<PrintingOptions>({
    duplex: true,
    stapled: true,
    colored: false,
    paperSize: 'A4'
  });

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

          const examData: ExamRequest = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: examSubject || 'Geral',
              title: examTitle,
              quantity: Number(printQty),
              gradeLevel: examGrade,
              instructions: examInstructions,
              fileNames: fileNames,
              fileUrls: fileUrls,
              status: ExamStatus.PENDING,
              createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              printingOptions: printingOpts
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
      if (confirm("Excluir este material?")) {
          await deleteClassMaterial(id);
          fetchData();
      }
  };

  const resetForm = () => {
      setExamTitle('');
      setExamGrade('');
      setExamInstructions('');
      setUploadedFiles([]);
      setPrintQty(30);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gráfica & Provas</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Minha Fila</button>
                <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Folder size={18} /> Materiais Aula</button>
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
                                {exams.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="font-bold text-white uppercase">{e.title}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {e.fileUrls && e.fileUrls.map((url, idx) => (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 px-2 py-1 rounded-lg border border-red-600/20 text-[10px] font-bold text-red-500 transition-all">
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
                                                e.status === ExamStatus.READY ? 'bg-green-500/10 text-green-500' :
                                                'bg-gray-500/10 text-gray-500'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : e.status === ExamStatus.READY ? 'Pronto' : 'Concluído'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                    <div className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                            <UploadCloud className="text-red-600" size={32} /> Enviar Arquivo para Gráfica
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título da Prova / Material</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Avaliação Mensal de Matemática" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Selecione --</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Quantidade de Cópias</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Instruções para a Gráfica</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" rows={3} value={examInstructions} onChange={e => setExamInstructions(e.target.value)} placeholder="Ex: Grampear, frente e verso..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Anexar Arquivos (PDF/Word)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center hover:border-red-600 transition-all relative">
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                    <FileUp className="mx-auto text-gray-600 mb-4" size={48} />
                                    <p className="text-gray-400 font-bold uppercase text-xs">Clique ou arraste os arquivos aqui</p>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {uploadedFiles.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-xs text-gray-300 font-bold truncate pr-4">{f.name}</span>
                                            <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-400"><X size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-red-600 shadow-xl shadow-red-900/40 mt-4">Enviar para Impressão</Button>
                        </div>
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
                                    <div className="flex gap-2">
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(mat.createdAt).toLocaleDateString()}</span>
                                        <button onClick={() => handleDeleteMaterial(mat.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{mat.title}</h3>
                                <p className="text-xs text-red-500 font-black uppercase mb-6 tracking-widest">{mat.className}</p>
                                
                                <div className="mt-auto flex gap-2">
                                    <a 
                                        href={mat.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/5 transition-all"
                                    >
                                        <Download size={18}/> Baixar
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* MODAL MATERIAL */}
        {showMaterialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Material de Aula</h3>
                        <button onClick={() => setShowMaterialModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título do Material</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma de Destino</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={newMaterial.className} onChange={e => setNewMaterial({...newMaterial, className: e.target.value})}>
                                <option value="">-- Selecione --</option>
                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Arquivo (PDF/Img)</label>
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-red-600 transition-all relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setMatFile(e.target.files?.[0] || null)} />
                                {matFile ? <span className="text-green-500 font-bold text-xs truncate block">{matFile.name}</span> : <span className="text-gray-500 font-bold text-xs">Selecionar Arquivo</span>}
                            </div>
                        </div>
                        <Button onClick={handleSaveMaterial} isLoading={isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-red-600">Enviar para a Sala</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
