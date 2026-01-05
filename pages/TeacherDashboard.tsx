
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    getClassMaterials,
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, ClassMaterial } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, Layout, X, 
  Wand2, Folder, File as FileIcon, Trash2, CheckCircle, FileUp
} from 'lucide-react';
import { CLASSES } from '../constants';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials'>('requests');
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create'>('none');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- FORM STATES ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [examSubject, setExamSubject] = useState(user?.subject || '');
  const [examInstructions, setExamInstructions] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

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

  const resetForm = () => {
      setExamTitle('');
      setExamGrade('');
      setExamInstructions('');
      setUploadedFiles([]);
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
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila da Gráfica</h1>
                        <p className="text-gray-400">Acompanhe o status das impressões solicitadas.</p>
                    </header>
                    <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Prova / Título</th>
                                    <th className="p-6">Turma</th>
                                    <th className="p-6">Cópias</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white uppercase">{e.title}</span>
                                                <span className="text-[10px] text-gray-500 uppercase font-black">{e.fileNames?.length || 1} anexo(s)</span>
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
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                <button onClick={() => setCreationMode('create')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group shadow-2xl">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><Wand2 size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Pedido Manual</h3>
                                    <p className="text-gray-500">Solicite apenas a impressão de cabeçalho.</p>
                                </button>
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
