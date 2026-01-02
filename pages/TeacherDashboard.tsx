
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
  Search, Eye, CheckCircle, Loader2, FileText, ImageIcon, BookOpen, Trash2, FileUp, Folder, File as FileIcon
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

  // --- FORM STATES (MATERIAIS AULA) ---
  const [matTitle, setMatTitle] = useState('');
  const [matGrade, setMatGrade] = useState('');
  const [matSubject, setMatSubject] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);

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
          const file = e.target.files[0];
          // Restrição removida para aceitar qualquer formato (PDF, Word, Imagens, etc)
          setUploadedFile(file);
      }
  };

  const handleMaterialFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setMatFile(e.target.files[0]);
      }
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (creationMode === 'upload' && !uploadedFile) return alert("Selecione um arquivo para impressão.");
      
      setIsSaving(true);
      try {
          let fileUrl = '';
          let fileName = 'manual_header_request.pdf';

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

          alert("Pedido enviado para a gráfica com sucesso!");
          setCreationMode('none');
          setActiveTab('requests');
          fetchData();
          resetForm();
      } catch (e) { 
          console.error(e);
          alert("Erro ao salvar pedido."); 
      }
      finally { setIsSaving(false); }
  };

  const saveMaterial = async () => {
      if (!matTitle || !matGrade || !matSubject || !matFile) return alert("Preencha todos os campos e selecione o arquivo.");
      
      setIsSaving(true);
      try {
          const fileUrl = await uploadClassMaterialFile(matFile, matGrade);
          const material: ClassMaterial = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              className: matGrade,
              subject: matSubject,
              title: matTitle,
              fileUrl: fileUrl,
              fileName: matFile.name,
              fileType: matFile.type,
              createdAt: Date.now()
          };
          await saveClassMaterial(material);
          alert("Material enviado para a sala de aula!");
          resetMaterialForm();
          fetchData();
      } catch (e) {
          console.error(e);
          alert("Erro ao enviar material.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteMaterial = async (id: string) => {
      if(confirm("Remover este material da sala de aula?")) {
          await deleteClassMaterial(id);
          fetchData();
      }
  };

  const resetForm = () => {
      setExamTitle('');
      setExamGrade('');
      setExamInstructions('');
      setUploadedFile(null);
  };

  const resetMaterialForm = () => {
      setMatTitle('');
      setMatGrade('');
      setMatSubject('');
      setMatFile(null);
  };

  const subjectsForGrade = (grade: string) => {
      if (!grade) return [];
      return grade.includes('SÉRIE') ? EM_SUBJECTS : EFAF_SUBJECTS;
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        {/* SIDEBAR INTERNA */}
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Menu Professor</p>
                <button 
                  onClick={() => setActiveTab('requests')} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                >
                  <List size={18} /> Pedidos Gráfica
                </button>
                <button 
                  onClick={() => { setCreationMode('none'); setActiveTab('create'); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                >
                  <PlusCircle size={18} /> Novo Pedido
                </button>
                <button 
                  onClick={() => setActiveTab('materials')} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                >
                  <Folder size={18} /> Materiais Aula
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* ABA: MEUS PEDIDOS (GRÁFICA) */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pedidos de Impressão</h1>
                        <p className="text-gray-400">Status dos seus materiais na gráfica escolar.</p>
                    </header>
                    <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Título</th>
                                    <th className="p-6">Turma</th>
                                    <th className="p-6">Cópias</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 font-bold text-white uppercase truncate max-w-[300px]">{e.title}</td>
                                        <td className="p-6"><span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-gray-300">{e.gradeLevel}</span></td>
                                        <td className="p-6 font-mono font-bold text-red-500">{e.quantity}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : 
                                                 e.status === ExamStatus.IN_PROGRESS ? 'Na Fila' : 'Concluído'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {exams.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-gray-500 uppercase font-black tracking-widest opacity-20">Nenhuma solicitação encontrada</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA: NOVO PEDIDO (GRÁFICA) */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {creationMode === 'none' ? (
                        <div className="max-w-4xl mx-auto py-12">
                             <div className="text-center mb-12">
                                <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Enviar Material</h1>
                                <p className="text-gray-400 text-lg">Como você deseja encaminhar o material para impressão?</p>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button onClick={() => setCreationMode('create')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-red-600 transition-all group">
                                    <div className="h-24 w-24 bg-red-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><Wand2 size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Manual</h3>
                                    <p className="text-gray-500">Gere um cabeçalho oficial para uma prova que será elaborada fisicamente.</p>
                                </button>
                                <button onClick={() => setCreationMode('upload')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><UploadCloud size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Upload</h3>
                                    <p className="text-gray-500">Envie PDF, Word, Imagens ou qualquer arquivo pronto para imprimir.</p>
                                </button>
                             </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-[#18181b] rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center justify-between mb-10 relative z-10">
                                    <h3 className="text-2xl font-black text-white uppercase flex items-center gap-4">
                                        {creationMode === 'upload' ? <UploadCloud className="text-blue-500" /> : <Layout className="text-red-500" />}
                                        {creationMode === 'upload' ? 'Upload para Impressão' : 'Solicitação de Cabeçalho'}
                                    </h3>
                                    <button onClick={() => { setCreationMode('none'); setUploadedFile(null); }} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Título do Trabalho / Avaliação</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Avaliação de Matemática - 1º Bimestre" />
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
                                        <div className="bg-black/30 border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-blue-600 transition-all relative group">
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                            {uploadedFile ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="bg-blue-600/20 p-4 rounded-2xl mb-2">
                                                        <FileIcon size={56} className="text-blue-500 animate-bounce" />
                                                    </div>
                                                    <p className="text-white font-black uppercase text-sm tracking-tight">{uploadedFile.name}</p>
                                                    <p className="text-xs text-blue-400 font-bold">Arquivo pronto para a gráfica</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <UploadCloud size={56} className="text-gray-600 mb-4 group-hover:text-blue-500 transition-colors" />
                                                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Clique ou solte qualquer arquivo aqui</p>
                                                    <p className="text-[10px] text-gray-600 font-medium">Suporta PDF, Word, Imagens e outros formatos.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Instruções para a Gráfica</label>
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" rows={3} value={examInstructions} onChange={e => setExamInstructions(e.target.value)} placeholder="Ex: Impressão frente e verso, grampeado, colorido..."></textarea>
                                    </div>

                                    <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl text-lg font-black uppercase shadow-2xl bg-red-600 hover:bg-red-700 tracking-widest">
                                        Confirmar e Enviar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: MATERIAIS DE AULA (SALA DE AULA) */}
            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Materiais de Aula</h1>
                            <p className="text-gray-400">Arquivos compartilhados diretamente com as salas de aula digitais.</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* FORMULÁRIO DE ENVIO */}
                        <div className="lg:col-span-1">
                            <div className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 shadow-xl sticky top-0">
                                <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-2"><FileUp size={20} className="text-red-500"/> Enviar para Sala</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Título</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-600" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Ex: Slide Aula 05 - Biomas" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Turma Alvo</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-600" value={matGrade} onChange={e => setMatGrade(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Disciplina</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-red-600" value={matSubject} onChange={e => setMatSubject(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {subjectsForGrade(matGrade).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-red-600 transition-all relative group">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMaterialFile} />
                                        {matFile ? (
                                            <div className="text-red-500">
                                                <CheckCircle size={32} className="mx-auto mb-2" />
                                                <p className="text-[10px] font-black uppercase truncate">{matFile.name}</p>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500">
                                                <Plus size={32} className="mx-auto mb-2 group-hover:text-red-500 transition-colors" />
                                                <p className="text-[10px] font-black uppercase">Selecionar Arquivo</p>
                                            </div>
                                        )}
                                    </div>

                                    <Button onClick={saveMaterial} isLoading={isSaving} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/20">
                                        Publicar na Sala
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* LISTA DE ENVIADOS */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {materials.map(m => (
                                    <div key={m.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-red-600/30 transition-all group shadow-lg">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-10 w-10 bg-red-600/10 rounded-lg flex items-center justify-center text-red-500">
                                                <BookOpen size={20} />
                                            </div>
                                            <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 size={18}/></button>
                                        </div>
                                        <h3 className="text-white font-bold mb-1 uppercase truncate text-sm">{m.title}</h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-black text-gray-400 uppercase tracking-tighter">{m.className}</span>
                                            <span className="text-[10px] bg-red-900/20 px-2 py-0.5 rounded font-black text-red-400 uppercase tracking-tighter border border-red-900/30">{m.subject}</span>
                                        </div>
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 transition-all">
                                            <Eye size={14}/> Visualizar
                                        </a>
                                    </div>
                                ))}
                                {materials.length === 0 && !isLoading && (
                                    <div className="col-span-full py-20 text-center text-gray-600 opacity-30">
                                        <Folder size={64} className="mx-auto mb-4"/>
                                        <p className="font-black uppercase tracking-widest">Nenhum material publicado nesta seção</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
