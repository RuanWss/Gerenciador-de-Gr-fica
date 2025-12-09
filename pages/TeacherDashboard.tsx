
import React, { useState, useEffect } from 'react';
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
  Download // Adicionado ícone de Download
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
              id: '',
              teacherId: user.id,
              teacherName: user.name,
              className: materialClass,
              title: materialTitle,
              fileUrl,
              fileName: materialFile.name,
              fileType: materialFile.type,
              createdAt: Date.now()
          };

          await saveClassMaterial(newMaterial);
          
          setMaterials([newMaterial, ...materials]);
          setMaterialFile(null);
          setMaterialTitle('');
          setMaterialClass('');
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
                                <h3