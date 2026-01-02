
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    getClassMaterials,
    saveClassMaterial,
    uploadClassMaterialFile,
    deleteClassMaterial
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, ClassMaterial } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, Printer, Save, Wand2, List, PlusCircle, Layout, X, 
  Search, Eye, CheckCircle, Loader2, FileText, ImageIcon, BookOpen, Trash2, FileUp, Folder, File as FileIcon,
  Clock, AlertCircle
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials'>('requests');
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create'>('none');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- FORM STATES (GRÁFICA) ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [examSubject, setExamSubject] = useState(user?.subject || '');
  const [examInstructions, setExamInstructions] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
      if (e.target.files && e.target.files[0]) {
          setUploadedFile(e.target.files[0]);
      }
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (creationMode === 'upload' && !uploadedFile) return alert("Selecione um arquivo para impressão.");
      
      setIsSaving(true);
      try {
          let fileUrl = '';
          let fileName = 'pedido_manual.pdf';

          if (creationMode === 'upload' && uploadedFile) {
              fileUrl = await uploadExamFile(uploadedFile, user?.name || 'Professor');
              fileName = uploadedFile.name;
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
              fileName: fileName,
              fileUrl: fileUrl,
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
      setUploadedFile(null);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        {/* SIDEBAR INTERNA */}
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gráfica & Provas</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Minha Fila</button>
                <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Prova</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10'}`}><Folder size={18} /> Materiais Aula</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* ABA: FILA DA GRÁFICA */}
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
                                                <span className="text-[10px] text-gray-500 uppercase font-black">{e.fileName}</span>
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
                                {exams.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-gray-600 uppercase font-black tracking-widest opacity-20">Nenhum pedido recente</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA: NOVO PEDIDO */}
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
                                    <p className="text-gray-500">Envie PDF, Word ou imagens prontas para imprimir.</p>
                                </button>
                                <button onClick={() => setCreationMode('create')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group shadow-2xl">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><Wand2 size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Pedido Manual</h3>
                                    <p className="text-gray-500">Solicite apenas a impressão de um cabeçalho oficial CEMAL.</p>
                                </button>
                             </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center justify-between mb-10 relative z-10">
                                    <h3 className="text-2xl font-black text-white uppercase flex items-center gap-4">
                                        {creationMode === 'upload' ? <UploadCloud className="text-red-500" /> : <Layout className="text-blue-500" />}
                                        {creationMode === 'upload' ? 'Upload para Gráfica' : 'Solicitação de Cabeçalho'}
                                    </h3>
                                    <button onClick={() => { setCreationMode('none'); setUploadedFile(null); }} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título da Prova / Avaliação</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Avaliação Bimestral de Geografia" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                                <option value="">Selecione...</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Quantidade de Cópias</label>
                                            <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                        </div>
                                    </div>

                                    {creationMode === 'upload' && (
                                        <div className="bg-black/30 border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-red-600 transition-all relative group">
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                            {uploadedFile ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileIcon size={56} className="text-red-500 animate-bounce" />
                                                    <p className="text-white font-black uppercase text-sm tracking-tight">{uploadedFile.name}</p>
                                                    <p className="text-xs text-red-400 font-bold">Arquivo pronto para a gráfica</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <UploadCloud size={56} className="text-gray-600 mb-4 group-hover:text-red-500 transition-colors" />
                                                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Clique ou solte qualquer arquivo aqui</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Observações / Instruções p/ Gráfica</label>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" rows={3} value={examInstructions} onChange={e => setExamInstructions(e.target.value)} placeholder="Ex: Impressão frente e verso, grampeado..."></textarea>
                                    </div>

                                    <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl text-lg font-black uppercase shadow-2xl bg-red-600 hover:bg-red-700 tracking-widest">
                                        Enviar para Gráfica
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: MATERIAIS DE AULA (Apenas para fins de visualização) */}
            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                     <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Materiais de Aula</h1>
                        <p className="text-gray-400">Arquivos compartilhados com a sala virtual dos alunos.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {materials.map(m => (
                            <div key={m.id} className="bg-[#18181b] border border-white/5 rounded-3xl p-6 hover:border-red-600 transition-all shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500">
                                        <BookOpen size={24} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-white uppercase truncate mb-1">{m.title}</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">{m.className} • {m.subject}</p>
                                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase text-gray-300 hover:bg-white/10 transition-all">
                                    <Eye size={14}/> Abrir Material
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
