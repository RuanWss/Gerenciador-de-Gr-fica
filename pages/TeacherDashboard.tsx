
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    updateExamRequest, 
    uploadExamFile, 
    uploadClassMaterialFile, 
    saveClassMaterial,
    getClassMaterials
} from '../services/firebaseService';
import { digitizeMaterial } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType, ClassMaterial } from '../types';
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
  Layout,
  FolderUp,
  Folder,
  Download,
  FolderOpen
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
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials'>('requests');
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

  // Materials State
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State auxiliar para download
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
        if (user) {
            setIsLoadingExams(true);
            const allExams = await getExams();
            setExams(allExams.filter(e => e.teacherId === user.id).sort((a,b) => b.createdAt - a.createdAt));
            
            // Fetch materials
            const userMaterials = await getClassMaterials(user.id);
            setMaterials(userMaterials.sort((a,b) => b.createdAt - a.createdAt));

            setIsLoadingExams(false);
        }
    };
    fetchData();
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

  const handleMaterialFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setMaterialFile(e.target.files[0]);
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

  const handleUploadMaterial = async () => {
      if (!user) return;
      if (!materialFile || !materialClass || !materialTitle) {
          alert("Preencha todos os campos e selecione um arquivo.");
          return;
      }

      setIsUploadingMaterial(true);
      try {
          // Upload to storage organized by class name
          const fileUrl = await uploadClassMaterialFile(materialFile, materialClass);
          
          const newMaterial: ClassMaterial = {
              id: '', // Temporário
              teacherId: user.id,
              teacherName: user.name,
              className: materialClass,
              title: materialTitle,
              fileUrl,
              fileName: materialFile.name,
              fileType: materialFile.type,
              createdAt: Date.now()
          };

          // Salva no banco e recebe o ID gerado
          const docId = await saveClassMaterial(newMaterial);
          newMaterial.id = docId;
          
          setMaterials([newMaterial, ...materials]);
          setMaterialFile(null);
          setMaterialTitle('');
          // NÃO LIMPA A TURMA para facilitar upload sequencial
          // setMaterialClass('');
          
          // Limpa o input file visualmente para permitir novos uploads do mesmo arquivo se necessário
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }

          alert("Material enviado com sucesso! O arquivo foi organizado na pasta da turma.");
      } catch (error) {
          console.error("Erro no upload", error);
          alert("Falha ao enviar material.");
      } finally {
          setIsUploadingMaterial(false);
      }
  };

  // Função para forçar o download do arquivo
  const handleForceDownload = async (url: string, filename: string, id: string) => {
      try {
          setDownloadingId(id);
          const response = await fetch(url);
          const blob = await response.blob();
          
          // Cria um link temporário
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename; // Atributo que força o download e sugere o nome
          
          document.body.appendChild(link);
          link.click();
          
          // Limpeza
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
          console.error("Erro no download automático:", error);
          // Fallback se o fetch falhar (ex: CORS), abre em nova aba
          window.open(url, '_blank');
      } finally {
          setDownloadingId(null);
      }
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: 'requests' | 'create' | 'materials', label: string, icon: any }) => (
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
                <SidebarItem id="materials" label="Materiais de Aula" icon={FolderUp} />
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

            {/* VIEW: CLASS MATERIALS */}
            {activeTab === 'materials' && (
                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">Materiais de Aula</h1>
                        <p className="text-gray-500">Envie PDFs, slides e documentos organizados por turma.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Upload Form */}
                        <div className="md:col-span-1">
                            <Card className="sticky top-8">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <UploadCloud className="text-brand-600" /> Upload de Arquivo
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Título do Material</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-gray-300 rounded-lg p-2.5" 
                                            placeholder="Ex: Slides - Revolução Francesa"
                                            value={materialTitle}
                                            onChange={e => setMaterialTitle(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Turma Destino</label>
                                        <select 
                                            className="w-full border border-gray-300 rounded-lg p-2.5"
                                            value={materialClass}
                                            onChange={e => setMaterialClass(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {/* Usando uma lista fixa por enquanto, idealmente viria do user.classes */}
                                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo</label>
                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                            onChange={handleMaterialFileChange}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">PDF, Word, PowerPoint, Imagens</p>
                                    </div>

                                    <Button 
                                        onClick={handleUploadMaterial} 
                                        isLoading={isUploadingMaterial}
                                        className="w-full shadow-lg shadow-brand-900/20"
                                    >
                                        Enviar Material
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* List of Materials */}
                        <div className="md:col-span-2">
                             <div className="space-y-4">
                                 {materials.length === 0 ? (
                                     <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                                         <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                         <p className="text-gray-500 font-medium">Nenhum material enviado ainda.</p>
                                     </div>
                                 ) : (
                                     materials.map(material => (
                                         <div key={material.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group">
                                             <div className="flex items-center gap-4">
                                                 <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                                     <FileText size={24} />
                                                 </div>
                                                 <div>
                                                     <h4 className="font-bold text-gray-800">{material.title}</h4>
                                                     <p className="text-xs text-gray-500 flex items-center gap-2">
                                                         <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{material.className}</span>
                                                         <span>• {new Date(material.createdAt).toLocaleDateString()}</span>
                                                     </p>
                                                 </div>
                                             </div>
                                             
                                             <div className="flex items-center gap-2">
                                                  <button 
                                                    onClick={() => handleForceDownload(material.fileUrl, material.fileName, material.id)}
                                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-2"
                                                    disabled={downloadingId === material.id}
                                                  >
                                                      {downloadingId === material.id ? (
                                                          <Loader2 size={18} className="animate-spin" />
                                                      ) : (
                                                          <Download size={18} />
                                                      )}
                                                      <span className="text-xs font-bold hidden sm:inline">Baixar</span>
                                                  </button>
                                             </div>
                                         </div>
                                     ))
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: CREATE/EDIT REQUEST */}
            {activeTab === 'create' && (
                <div className="flex-1 flex flex-col h-full bg-gray-50">
                    
                    {/* Header Toolbar */}
                    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveTab('requests')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                <List size={20} />
                            </button>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <input 
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="font-bold text-gray-800 text-lg bg-transparent border-none focus:ring-0 placeholder-gray-400 w-96"
                                placeholder="Título da Avaliação..."
                            />
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setActiveTab('requests')}>Cancelar</Button>
                            <Button 
                                onClick={handleSaveExam} 
                                isLoading={isSaving}
                                className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-900/30"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {editingExamId ? 'Atualizar Pedido' : 'Enviar para Gráfica'}
                            </Button>
                        </div>
                    </div>

                    {/* Main Workspace */}
                    <div className="flex-1 flex overflow-hidden">
                        
                        {/* LEFT PANEL: CONFIG & UPLOAD */}
                        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                             <div className="p-6 space-y-8">
                                 
                                 {/* 1. TIPO DE MATERIAL */}
                                 <div>
                                     <SectionHeader title="Tipo de Material" subtitle="O que será impresso?" />
                                     <div className="grid grid-cols-2 gap-3">
                                         <button 
                                            onClick={() => setMaterialType('exam')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${materialType === 'exam' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                         >
                                             <FileText size={24} />
                                             <span className="text-xs font-bold">Prova</span>
                                         </button>
                                         <button 
                                            onClick={() => setMaterialType('handout')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${materialType === 'handout' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                         >
                                             <BookOpen size={24} />
                                             <span className="text-xs font-bold">Apostila</span>
                                         </button>
                                     </div>
                                 </div>

                                 {/* 2. LAYOUT */}
                                 <div>
                                     <SectionHeader title="Diagramação" subtitle="Colunas na página" />
                                     <div className="flex bg-gray-100 p-1 rounded-lg">
                                         <button onClick={() => setDocColumns(1)} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 ${docColumns === 1 ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                                             <Layout size={14} /> 1 Coluna
                                         </button>
                                         <button onClick={() => setDocColumns(2)} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 ${docColumns === 2 ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                                             <Columns size={14} /> 2 Colunas
                                         </button>
                                     </div>
                                 </div>

                                 {/* 3. DETALHES */}
                                 <div>
                                     <SectionHeader title="Detalhes" subtitle="Informações da turma" />
                                     <div className="space-y-4">
                                         <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Turma</label>
                                            <select 
                                                className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm"
                                                value={selectedClassForExam}
                                                onChange={e => setSelectedClassForExam(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {/* Mock classes - should come from context or props */}
                                                {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                         </div>
                                         
                                         <div>
                                             <label className="text-xs font-bold text-gray-500 uppercase">Instruções / Subtítulo</label>
                                             <textarea 
                                                className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm h-20"
                                                value={docSubtitle}
                                                onChange={e => setDocSubtitle(e.target.value)}
                                                placeholder="Ex: Leia com atenção..."
                                             />
                                         </div>

                                         {materialType === 'exam' && (
                                             <div className="flex items-center justify-between">
                                                 <label className="text-sm text-gray-700">Valor da Prova</label>
                                                 <input 
                                                    type="number" 
                                                    className="w-16 border border-gray-300 rounded p-1 text-center"
                                                    value={maxScore}
                                                    onChange={e => setMaxScore(Number(e.target.value))}
                                                 />
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* 4. UPLOAD */}
                                 <div>
                                     <SectionHeader title="Arquivo Fonte" subtitle="PDF ou Imagens" />
                                     <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors bg-white">
                                         <input 
                                            type="file" 
                                            id="file-upload" 
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                            accept=".pdf,image/*"
                                         />
                                         <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                             <UploadCloud className="text-brand-500 mb-2" size={32} />
                                             <span className="text-sm font-bold text-gray-700">Clique para enviar</span>
                                             <span className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</span>
                                         </label>
                                         {(uploadedFile || existingFileUrl) && (
                                             <div className="mt-4 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                 <CheckCircle size={12} />
                                                 {uploadedFile ? "Arquivo Selecionado" : "Arquivo Carregado"}
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* 5. AI MAGIC */}
                                 {uploadedFile && (uploadedFile.type.startsWith('image/') || uploadedFile.type === 'application/pdf') && (
                                     <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                                         <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm mb-2">
                                             <Sparkles size={14} className="text-indigo-500" />
                                             IA Diagramadora
                                         </h4>
                                         <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                                             Transforme a imagem em texto editável e formatado automaticamente.
                                         </p>
                                         <Button 
                                            onClick={handleAIDiagramming} 
                                            isLoading={isDiagramming}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-900/20 text-xs"
                                         >
                                             <Wand2 size={14} className="mr-2" />
                                             Diagramar com IA
                                         </Button>
                                     </div>
                                 )}

                             </div>
                        </div>

                        {/* RIGHT PANEL: PREVIEW */}
                        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex justify-center relative">
                            
                            {/* Toolbar Floating */}
                            <div className="absolute top-4 right-4 flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                                <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomOut size={16}/></button>
                                <span className="px-2 py-2 text-xs font-mono text-gray-400 border-l border-r border-gray-100 min-w-[3rem] text-center">{Math.round(zoomLevel * 100)}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomIn size={16}/></button>
                            </div>

                            {/* A4 PAPER */}
                            <div 
                                className="bg-white shadow-2xl transition-all duration-300 origin-top"
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    height: 'auto', // Permite crescer
                                    padding: '20mm',
                                    transform: `scale(${zoomLevel})`,
                                    marginBottom: '100px'
                                }}
                            >
                                {/* HEADER IMAGE */}
                                <div className="mb-6">
                                    <img 
                                        src={materialType === 'exam' ? HEADER_EXAM_URL : HEADER_HANDOUT_URL} 
                                        alt="Cabeçalho" 
                                        className="w-full h-auto object-contain"
                                    />
                                    
                                    {/* DADOS DINÂMICOS ABAIXO DO CABEÇALHO */}
                                    <div className="mt-4 flex flex-col gap-2 border-b border-gray-300 pb-4 mb-4 font-sans text-sm">
                                        <div className="flex justify-between">
                                            <p><span className="font-bold">Professor:</span> {user?.name}</p>
                                            <p><span className="font-bold">Disciplina:</span> {user?.subject}</p>
                                        </div>
                                        <div className="flex justify-between">
                                            <p><span className="font-bold">Turma:</span> {selectedClassForExam}</p>
                                            <p><span className="font-bold">Data:</span> ____/____/____</p>
                                        </div>
                                        {materialType === 'exam' && (
                                             <div className="flex justify-between items-center mt-1">
                                                 <p><span className="font-bold">Aluno(a):</span> __________________________________________________________________</p>
                                                 <div className="border border-gray-800 rounded px-3 py-1 font-bold text-sm">
                                                     Nota: _____ / {maxScore}
                                                 </div>
                                             </div>
                                        )}
                                    </div>
                                    
                                    {/* INSTRUÇÕES */}
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-center uppercase tracking-wide text-gray-900">{docTitle}</h2>
                                        {docSubtitle && <p className="text-center text-gray-500 text-sm italic mt-1">{docSubtitle}</p>}
                                    </div>
                                </div>

                                {/* CONTENT AREA */}
                                <div className={docColumns === 2 ? "columns-2 gap-8" : ""}>
                                    {aiGeneratedContent ? (
                                        // RENDER HTML GENERATED BY AI
                                        <div 
                                            className="prose prose-sm max-w-none text-justify font-serif"
                                            dangerouslySetInnerHTML={{ __html: aiGeneratedContent }}
                                        />
                                    ) : filePreviewUrl || existingFileUrl ? (
                                        // RENDER IMAGE/PDF PREVIEW
                                        <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-8 bg-gray-50 min-h-[400px]">
                                             {(filePreviewUrl || existingFileUrl)?.toLowerCase().includes('.pdf') ? (
                                                 <div className="text-center">
                                                     <FileText size={64} className="text-gray-300 mx-auto mb-4" />
                                                     <p className="text-gray-500 font-medium">Visualização de PDF não suportada no editor.</p>
                                                     <p className="text-xs text-gray-400 mt-2">O arquivo será impresso corretamente.</p>
                                                 </div>
                                             ) : (
                                                 <img 
                                                    src={filePreviewUrl || existingFileUrl || ''} 
                                                    alt="Preview" 
                                                    className="max-w-full h-auto shadow-md" 
                                                 />
                                             )}
                                             
                                             {!isDiagramming && (
                                                <div className="mt-6 text-center">
                                                    <p className="text-xs text-gray-400 mb-2">Este é apenas o arquivo bruto.</p>
                                                    <p className="text-xs font-bold text-indigo-600">Use "Diagramar com IA" para formatar o texto.</p>
                                                </div>
                                             )}
                                        </div>
                                    ) : (
                                        // EMPTY STATE
                                        <div className="text-center py-20 text-gray-300">
                                            <p className="text-lg font-bold mb-2">Área de Conteúdo</p>
                                            <p className="text-sm">Faça upload de um arquivo para visualizar aqui.</p>
                                        </div>
                                    )}
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
