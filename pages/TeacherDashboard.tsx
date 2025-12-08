
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExams, saveExam, updateExamRequest, uploadExamFile } from '../services/firebaseService';
import { digitizeMaterial } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, 
  UploadCloud, 
  Trash2,
  Printer,
  Columns,
  ZoomIn,
  ZoomOut,
  Save,
  Edit3,
  Archive,
  Lock,
  FileText,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Wand2,
  Loader2,
  Sparkles,
  List,
  PlusCircle,
  Layout
} from 'lucide-react';

// --- CONSTANTES DE IMAGEM ---
const HEADER_EXAM_URL = "https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png";
const HEADER_HANDOUT_URL = "https://i.ibb.co/4ZyLcnq7/CABE-ALHO-APOSTILA.png";

// --- COMPONENTES UI AUXILIARES ---

const SectionHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
);

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        {children}
    </div>
);

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'requests' | 'create'>('requests');
  const [editorSubTab, setEditorSubTab] = useState<'document' | 'details'>('document');

  // Exam Data List
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor / Form State
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('Avaliação multidisciplinar II');
  const [docSubtitle, setDocSubtitle] = useState('Avaliação semestral multidisciplinar');
  const [materialType, setMaterialType] = useState<MaterialType>('exam');
  const [docColumns, setDocColumns] = useState<1 | 2>(2);
  const [selectedClassForExam, setSelectedClassForExam] = useState<string>(''); 
  
  // Header Config
  const [maxScore, setMaxScore] = useState(10);
  const [showStudentName, setShowStudentName] = useState(true);
  
  // File State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null); // For local preview (blob)
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null); // For editing existing exams

  // AI Diagramming State
  const [isDiagramming, setIsDiagramming] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string>('');

  // Preview State
  const [zoomLevel, setZoomLevel] = useState(0.8);

  // Fetch Exams
  useEffect(() => {
    const fetchExams = async () => {
        if (user) {
            setIsLoadingExams(true);
            const allExams = await getExams();
            setExams(allExams.filter(e => e.teacherId === user.id).sort((a,b) => b.createdAt - a.createdAt));
            setIsLoadingExams(false);
        }
    };
    fetchExams();
  }, [user, activeTab]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // --- HANDLERS ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadedFile(file);
          setAiGeneratedContent(''); // Reset AI content on new file
          
          // Generate preview
          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
              const url = URL.createObjectURL(file);
              setFilePreviewUrl(url);
          } else {
              setFilePreviewUrl(null);
          }
      }
  };

  const handleAIDiagramming = async () => {
      if (!uploadedFile) {
          alert("Por favor, faça o upload de uma imagem ou PDF primeiro.");
          return;
      }
      
      setIsDiagramming(true);
      try {
          const htmlContent = await digitizeMaterial(uploadedFile, materialType);
          setAiGeneratedContent(htmlContent);
      } catch (error) {
          alert("Erro ao diagramar com IA. Tente novamente com uma imagem mais clara.");
      } finally {
          setIsDiagramming(false);
      }
  };

  const handleNewExam = () => {
      setEditingExamId(null);
      setDocTitle('Nova Avaliação');
      setDocSubtitle('Instruções gerais');
      setMaterialType('exam');
      setDocColumns(2);
      setSelectedClassForExam('');
      setUploadedFile(null);
      setFilePreviewUrl(null);
      setExistingFileUrl(null);
      setAiGeneratedContent('');
      setEditorSubTab('document');
      setActiveTab('create');
  };

  const handleEditExam = (exam: ExamRequest) => {
      if (exam.status !== ExamStatus.PENDING) {
          alert("Não é possível editar uma prova que já está em processamento ou concluída.");
          return;
      }

      setEditingExamId(exam.id);
      setDocTitle(exam.title);
      setDocSubtitle(exam.instructions || '');
      setSelectedClassForExam(exam.gradeLevel);
      setMaterialType(exam.materialType || 'exam');
      setDocColumns(exam.columns || 1);
      setExistingFileUrl(exam.fileUrl || null);
      setAiGeneratedContent(''); 
      
      // Header props
      if (exam.headerData) {
          setMaxScore(exam.headerData.maxScore || 10);
          setShowStudentName(exam.headerData.showStudentName);
      }

      setUploadedFile(null);
      setFilePreviewUrl(null);
      setActiveTab('create');
  };

  const handleSaveExam = async () => {
    if (!user) return;
    if (!uploadedFile && !existingFileUrl) {
        alert("Por favor, faça o upload do arquivo (PDF ou Imagem) da prova/apostila.");
        return;
    }

    setIsSaving(true);
    try {
        let finalFileUrl = existingFileUrl;
        let finalFileName = existingFileUrl ? "Arquivo Existente" : "";

        // Upload new file if exists
        if (uploadedFile) {
            finalFileUrl = await uploadExamFile(uploadedFile);
            finalFileName = uploadedFile.name;
        }

        const examData: any = {
            teacherId: user.id,
            teacherName: user.name,
            subject: user.subject || 'Geral',
            title: docTitle,
            quantity: 30, // Padrão
            gradeLevel: selectedClassForExam || (user.classes?.[0] || 'Geral'),
            instructions: docSubtitle,
            fileName: finalFileName,
            fileUrl: finalFileUrl,
            status: ExamStatus.PENDING,
            createdAt: Date.now(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            // Novos campos
            materialType,
            columns: docColumns,
            headerData: {
                schoolName: 'CEMAL EQUIPE',
                showStudentName,
                showScore: materialType === 'exam',
                maxScore
            }
        };

        if (editingExamId) {
            await updateExamRequest({ ...examData, id: editingExamId });
            alert("Solicitação atualizada com sucesso!");
        } else {
            await saveExam({ ...examData, id: '' });
            alert("Solicitação enviada para a gráfica com sucesso!");
        }
        
        setActiveTab('requests');
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar solicitação.");
    } finally {
        setIsSaving(false);
    }
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: 'requests' | 'create', label: string, icon: any }) => (
    <button
      onClick={id === 'create' ? handleNewExam : () => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-1 font-medium text-sm
      ${activeTab === id 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50' 
        : 'text-gray-500 hover:bg-gray-100'}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span>{label}</span>
      </div>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
        
        {/* --- SIDEBAR --- */}
        <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col h-full z-20">
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu do Professor</p>
                <SidebarItem id="requests" label="Meus Pedidos" icon={List} />
                <SidebarItem id="create" label="Nova Solicitação" icon={PlusCircle} />
            </div>
            
            <div className="mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 mb-2">Dica do Sistema</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                    Você pode enviar fotos da apostila ou PDFs. A IA ajuda a formatar automaticamente para o padrão da escola.
                </p>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
            
            {/* VIEW: MY REQUESTS */}
            {activeTab === 'requests' && (
                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Meus Pedidos</h1>
                        <p className="text-gray-500">Acompanhe o status das suas impressões na gráfica.</p>
                    </header>

                    <Card>
                        {exams.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Archive className="text-gray-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700">Nenhum pedido encontrado</h3>
                                <p className="text-gray-500 mb-6">Você ainda não enviou nenhuma solicitação de impressão.</p>
                                <Button onClick={handleNewExam} className="shadow-lg shadow-brand-900/20">
                                    <Plus className="w-4 h-4 mr-2" /> Criar Primeira Solicitação
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 rounded-tl-lg">Data</th>
                                            <th className="px-6 py-4">Título</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 rounded-tr-lg text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {exams.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                    {new Date(e.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900">{e.title}</p>
                                                    <p className="text-xs text-gray-400">{e.gradeLevel}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {e.materialType === 'handout' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                            <BookOpen size={12} className="mr-1"/> Apostila
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                            <FileText size={12} className="mr-1"/> Prova
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                        {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {e.status === ExamStatus.PENDING ? (
                                                        <button onClick={() => handleEditExam(e)} className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center justify-end w-full transition-colors">
                                                            <Edit3 size={14} className="mr-1"/> Editar
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-end text-gray-400 text-xs" title="Não é possível editar após o início da impressão">
                                                            <Lock size={14} className="mr-1"/> Bloqueado
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* VIEW: NEW REQUEST (EDITOR) */}
            {activeTab === 'create' && (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* TOOLBAR */}
                    <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm z-30 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {editingExamId ? <Edit3 size={20} className="text-blue-500"/> : <PlusCircle size={20} className="text-green-500"/>}
                                {editingExamId ? 'Editar Solicitação' : 'Nova Solicitação'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">Configure a impressão e visualize o resultado final.</p>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setEditorSubTab('document')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${editorSubTab === 'document' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Documento
                            </button>
                            <button
                                onClick={() => setEditorSubTab('details')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${editorSubTab === 'details' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Detalhes
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActiveTab('requests')}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveExam} isLoading={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                                <Save size={16} className="mr-2"/> {editingExamId ? 'Salvar Alterações' : 'Enviar Pedido'}
                            </Button>
                        </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                            
                            {/* --- LEFT COLUMN: CONTROLS --- */}
                            <div className="lg:col-span-4 space-y-6 flex flex-col h-fit">
                                {editorSubTab === 'document' ? (
                                    <>
                                        {/* CARD 1: TIPO DE MATERIAL */}
                                        <Card>
                                            <SectionHeader title="Tipo de Material" />
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <button 
                                                    onClick={() => setMaterialType('exam')}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${materialType === 'exam' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
                                                >
                                                    <FileText size={24} className="mb-2"/>
                                                    <span className="font-bold text-sm">Prova</span>
                                                </button>
                                                <button 
                                                    onClick={() => setMaterialType('handout')}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${materialType === 'handout' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
                                                >
                                                    <BookOpen size={24} className="mb-2"/>
                                                    <span className="font-bold text-sm">Apostila</span>
                                                </button>
                                            </div>
                                            
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
                                            <input 
                                                value={docTitle} 
                                                onChange={(e) => setDocTitle(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                                                placeholder="Ex: Avaliação de História"
                                            />
                                        </Card>

                                        {/* CARD 2: DIAGRAMAÇÃO & UPLOAD */}
                                        <Card>
                                            <SectionHeader title="Diagramação & Arquivo" subtitle="O sistema adicionará o cabeçalho padrão." />
                                            
                                            <div className="mb-6">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Colunas</label>
                                                <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
                                                    <button 
                                                        onClick={() => setDocColumns(1)}
                                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${docColumns === 1 ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`}
                                                    >
                                                        <Layout size={16}/> 1 Coluna
                                                    </button>
                                                    <button 
                                                        onClick={() => setDocColumns(2)}
                                                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${docColumns === 2 ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`}
                                                    >
                                                        <Columns size={16}/> 2 Colunas
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-bold text-gray-700">Upload do Conteúdo</label>
                                                    {uploadedFile && (
                                                        <button 
                                                            onClick={handleAIDiagramming}
                                                            disabled={isDiagramming}
                                                            className="text-xs flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-bold hover:bg-purple-200 transition-colors disabled:opacity-50"
                                                        >
                                                            {isDiagramming ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                                            {isDiagramming ? 'Processando...' : 'Diagramar com IA'}
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <label className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all relative overflow-hidden group ${uploadedFile ? 'border-green-500 bg-green-50/50' : 'border-gray-300 hover:border-brand-400 hover:bg-brand-50/30'}`}>
                                                    {isDiagramming && (
                                                        <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center">
                                                            <Sparkles className="text-purple-600 animate-bounce mb-2" size={32}/>
                                                            <p className="text-sm font-bold text-purple-800 animate-pulse">A IA está diagramando...</p>
                                                        </div>
                                                    )}
                                                    
                                                    {uploadedFile ? (
                                                        <>
                                                            <CheckCircle className="text-green-500 mb-3" size={32}/>
                                                            <span className="text-sm font-bold text-green-700 text-center break-all">{uploadedFile.name}</span>
                                                            <span className="text-xs text-green-600 mt-1 bg-green-100 px-2 py-1 rounded">Clique para trocar</span>
                                                        </>
                                                    ) : existingFileUrl ? (
                                                        <>
                                                            <FileText className="text-blue-500 mb-3" size={32}/>
                                                            <span className="text-sm font-bold text-blue-700">Arquivo Existente</span>
                                                            <span className="text-xs text-blue-600 mt-1 bg-blue-100 px-2 py-1 rounded">Clique para substituir</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="text-gray-400 mb-3 group-hover:text-brand-500 transition-colors" size={32}/>
                                                            <span className="text-sm font-bold text-gray-600">Clique para enviar</span>
                                                            <span className="text-xs text-gray-400 mt-1">PDF ou Imagem (Foto)</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                        </Card>
                                    </>
                                ) : (
                                    /* SUBTAB: DETAILS */
                                    <Card>
                                        <SectionHeader title="Detalhes Adicionais" />
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo / Instruções</label>
                                                <textarea 
                                                    value={docSubtitle} 
                                                    onChange={(e) => setDocSubtitle(e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none h-32"
                                                    placeholder="Instruções para os alunos..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Turma (Sugestão no Cabeçalho)</label>
                                                <select
                                                    value={selectedClassForExam}
                                                    onChange={(e) => setSelectedClassForExam(e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                >
                                                    <option value="">Deixar em branco (____)</option>
                                                    {user?.classes?.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                                    <option value="6º ANO">6º ANO</option>
                                                    <option value="7º ANO">7º ANO</option>
                                                    <option value="8º ANO">8º ANO</option>
                                                    <option value="9º ANO">9º ANO</option>
                                                    <option value="1ª SÉRIE EM">1ª SÉRIE EM</option>
                                                    <option value="2ª SÉRIE EM">2ª SÉRIE EM</option>
                                                    <option value="3ª SÉRIE EM">3ª SÉRIE EM</option>
                                                </select>
                                            </div>

                                            {materialType === 'exam' && (
                                                <div className="pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="text-sm font-medium text-gray-700">Mostrar campo "Nome do Aluno"</label>
                                                        <input type="checkbox" checked={showStudentName} onChange={e => setShowStudentName(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500"/>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-medium text-gray-700">Valor da Prova</label>
                                                        <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className="w-16 border rounded p-1 text-center text-sm"/>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* --- RIGHT COLUMN: PREVIEW --- */}
                            <div className="lg:col-span-8 flex flex-col bg-gray-200/50 rounded-xl border-2 border-dashed border-gray-300 relative overflow-hidden h-[800px] lg:h-auto">
                                
                                {/* ZOOM CONTROLS */}
                                <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-sm p-1 flex items-center gap-1 border border-gray-200">
                                    <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ZoomOut size={16}/></button>
                                    <span className="text-xs font-mono w-10 text-center font-bold text-gray-700">{Math.round(zoomLevel * 100)}%</span>
                                    <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ZoomIn size={16}/></button>
                                </div>

                                <div className="flex-1 overflow-auto flex justify-center p-8 custom-scrollbar bg-slate-100">
                                    
                                    {/* A4 PAPER SIMULATION */}
                                    <div 
                                        className="bg-white shadow-2xl transition-transform duration-200 origin-top flex flex-col relative"
                                        style={{ 
                                            width: '794px', 
                                            minHeight: '1123px', // Aproximadamente A4 a 96dpi
                                            height: 'auto', // Permite crescimento infinito para paginação automática na impressão
                                            transform: `scale(${zoomLevel})`,
                                            padding: '40px',
                                            marginBottom: '100px'
                                        }}
                                    >
                                        {/* CABEÇALHO PERSONALIZADO (IMAGEM) */}
                                        <div className="mb-6">
                                            <img 
                                                src={materialType === 'exam' ? HEADER_EXAM_URL : HEADER_HANDOUT_URL} 
                                                alt="Cabeçalho da Instituição" 
                                                className="w-full h-auto object-contain mb-4 border-b border-gray-100 pb-2"
                                            />
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm font-serif pt-2 px-2 text-gray-800">
                                                <p><span className="font-bold">Professor:</span> {user?.name}</p>
                                                <p><span className="font-bold">Disciplina:</span> {user?.subject || 'Geral'}</p>
                                                <p><span className="font-bold">Turma:</span> {selectedClassForExam || '_______'}</p>
                                                <p><span className="font-bold">Data:</span> ___/___/____</p>
                                                {materialType === 'exam' && showStudentName && (
                                                    <p className="col-span-2 mt-2 border-t border-gray-200 pt-2">
                                                        <span className="font-bold">Aluno(a):</span> ____________________________________________________________________
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* TÍTULO E SUBTÍTULO */}
                                        <div className="text-center mb-8">
                                            <h2 className="text-lg font-bold uppercase font-serif text-gray-900 border-b-2 border-gray-800 inline-block pb-1 px-4 mb-2">{docTitle}</h2>
                                            {docSubtitle && <p className="text-sm italic font-serif text-gray-600 whitespace-pre-line">{docSubtitle}</p>}
                                        </div>

                                        {/* CONTEÚDO (DIAGRAMAÇÃO AUTOMÁTICA) */}
                                        <div className={`flex-1 ${docColumns === 2 ? 'columns-2 gap-8 [column-rule:1px_solid_#eee]' : ''}`}>
                                            
                                            {aiGeneratedContent ? (
                                                // Renderização do HTML gerado pela IA
                                                <div 
                                                    className="prose prose-sm max-w-none prose-p:text-justify prose-p:text-sm prose-headings:font-bold prose-headings:uppercase prose-li:text-sm text-gray-900 font-serif"
                                                    dangerouslySetInnerHTML={{ __html: aiGeneratedContent }}
                                                />
                                            ) : filePreviewUrl ? (
                                                filePreviewUrl.startsWith('blob:') && uploadedFile?.type === 'application/pdf' ? (
                                                    // PDF Placeholder
                                                    <div className="w-full h-[600px] bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center text-gray-400 break-inside-avoid">
                                                        <FileText size={48} className="mb-4 text-red-400"/>
                                                        <p className="font-bold text-gray-600">Visualização de PDF</p>
                                                        <p className="text-xs max-w-xs text-center mt-2">O arquivo PDF será mesclado abaixo deste cabeçalho na impressão final.</p>
                                                    </div>
                                                ) : (
                                                    // Image Preview (Raw)
                                                    <img src={filePreviewUrl} alt="Preview" className="w-full h-auto object-contain rounded mb-4 break-inside-avoid" />
                                                )
                                            ) : existingFileUrl ? (
                                                <div className="w-full h-[600px] bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center text-gray-400 break-inside-avoid">
                                                    <FileText size={48} className="mb-4 text-blue-400"/>
                                                    <p className="font-bold text-gray-600">Arquivo Existente Anexado</p>
                                                    <p className="text-xs max-w-xs text-center mt-2">O conteúdo original será mantido e formatado com o novo cabeçalho.</p>
                                                </div>
                                            ) : (
                                                // Empty State
                                                <div className="w-full h-96 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300 select-none break-inside-avoid bg-gray-50/50">
                                                    <p className="text-sm font-bold text-gray-400">Área de Conteúdo</p>
                                                    <p className="text-xs mt-1">Faça o upload e use a IA para diagramar aqui.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
