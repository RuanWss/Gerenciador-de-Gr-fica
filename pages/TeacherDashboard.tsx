
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    updateExamRequest, 
    uploadExamFile, 
    uploadClassMaterialFile, 
    saveClassMaterial,
    getClassMaterials, 
    deleteClassMaterial,
    saveLessonPlan,
    getLessonPlans,
    ensureUserProfile,
    deleteExamRequest
} from '../services/firebaseService';
import { digitizeMaterial } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType, ClassMaterial, LessonPlan, LessonPlanType } from '../types';
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
  FolderOpen,
  BookOpenCheck,
  Calendar,
  Layers,
  ArrowLeft,
  FileUp,
  PenTool,
  ExternalLink
} from 'lucide-react';

// --- CONSTANTES DE IMAGEM ---
const HEADER_EXAM_URL = "https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png";
const HEADER_HANDOUT_URL = "https://i.ibb.co/4ZyLcnq7/CABE-ALHO-APOSTILA.png";

// --- LISTAS DE DISCIPLINAS ---
const EFAF_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "MATEMÁTICA", "MATEMÁTICA II", "BIOLOGIA", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "REDAÇÃO", "FILOSOFIA", "QUÍMICA", "PROJETO DE VIDA", "EDUCAÇÃO FINANCEIRA", 
    "PENSAMENTO COMPUTACIONAL", "FÍSICA", "DINÂMICAS DE LEITURA"
];

const EM_SUBJECTS = [
    "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "SOCIOLOGIA", "FILOSOFIA", "BIOLOGIA", "FÍSICA", "QUÍMICA", "MATEMÁTICA", 
    "LITERATURA", "PRODUÇÃO TEXTUAL", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "MATEMÁTICA II", "BIOLOGIA II", "QUÍMICA II", 
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO", "ELETIVA 04: PROJETO DE VIDA", 
    "ITINERÁRIO FORMATIVO"
];

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
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials' | 'plans'>('requests');
  
  // Create Mode State: 'none' (selection screen), 'upload' (direct print), 'create' (AI editor)
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create'>('none');

  // Exam Data List
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor / Form State
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('exam');
  const [docColumns, setDocColumns] = useState<1 | 2>(2);
  const [selectedClassForExam, setSelectedClassForExam] = useState<string>(''); 
  const [printQuantity, setPrintQuantity] = useState(30);
  
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
  const [materialSubject, setMaterialSubject] = useState(''); // Novo: Disciplina
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  
  // Refs para inputs de arquivo (para limpar após envio)
  const materialFileInputRef = useRef<HTMLInputElement>(null);
  const examFileInputRef = useRef<HTMLInputElement>(null);
  
  // State auxiliar para download
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // PLANNING STATE
  const [planType, setPlanType] = useState<LessonPlanType>('daily');
  const [planClass, setPlanClass] = useState('');
  // Daily
  const [planDate, setPlanDate] = useState('');
  const [planTopic, setPlanTopic] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [planMethodology, setPlanMethodology] = useState('');
  const [planResources, setPlanResources] = useState('');
  const [planEvaluation, setPlanEvaluation] = useState('');
  const [planHomework, setPlanHomework] = useState('');
  
  // Semester (Updated States to match image)
  const [planPeriod, setPlanPeriod] = useState('1º Bimestre');
  const [planJustification, setPlanJustification] = useState('');
  const [planSemesterContents, setPlanSemesterContents] = useState('');
  const [planCognitiveSkills, setPlanCognitiveSkills] = useState('');
  const [planSocialSkills, setPlanSocialSkills] = useState('');
  const [planStrategies, setPlanStrategies] = useState(''); // Situações Didáticas
  // Atividades
  const [planActPre, setPlanActPre] = useState('');
  const [planActAuto, setPlanActAuto] = useState('');
  const [planActCoop, setPlanActCoop] = useState('');
  const [planActCompl, setPlanActCompl] = useState('');
  // Footer
  const [planPractices, setPlanPractices] = useState('');
  const [planSpaces, setPlanSpaces] = useState('');
  const [planDidacticResources, setPlanDidacticResources] = useState(''); // Recursos Didáticos Semestral
  const [planEvaluationStrat, setPlanEvaluationStrat] = useState('');
  const [planReferences, setPlanReferences] = useState('');
  
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);

  // Derived state for subjects list based on selected class (Material)
  const availableSubjects = React.useMemo(() => {
      if (!materialClass) return [];
      // Se for "SÉRIE" é Ensino Médio, senão (ANO) é Fundamental
      if (materialClass.includes('SÉRIE')) return EM_SUBJECTS;
      return EFAF_SUBJECTS;
  }, [materialClass]);

  // Auto-select subject if user.subject matches one in the list
  useEffect(() => {
      if (user?.subject && availableSubjects.includes(user.subject.toUpperCase())) {
          setMaterialSubject(user.subject.toUpperCase());
      } else if (availableSubjects.length > 0) {
          setMaterialSubject(availableSubjects[0]);
      }
  }, [availableSubjects, user?.subject]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
        if (user) {
            setIsLoadingExams(true);
            const allExams = await getExams(user.id); // Pass user.id to filter
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            
            // Fetch materials
            const userMaterials = await getClassMaterials(user.id);
            setMaterials(userMaterials.sort((a,b) => b.createdAt - a.createdAt));

            // Fetch Plans
            const userPlans = await getLessonPlans(user.id);
            setLessonPlans(userPlans.sort((a,b) => b.createdAt - a.createdAt));

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

  const resetForm = () => {
      setEditingExamId(null);
      setDocTitle('');
      setDocSubtitle('');
      setMaterialType('exam');
      setDocColumns(2);
      setSelectedClassForExam('');
      setPrintQuantity(30);
      setUploadedFile(null);
      setFilePreviewUrl(null);
      setExistingFileUrl(null);
      setAiGeneratedContent('');
      if (examFileInputRef.current) {
          examFileInputRef.current.value = '';
      }
  };

  const handleNewExam = () => {
      resetForm();
      setCreationMode('none'); // Vai para a tela de seleção
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
      setPrintQuantity(exam.quantity || 30);
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
      
      // Se tiver header data, assume que foi criado no estúdio, senão, upload direto
      setCreationMode(exam.headerData ? 'create' : 'upload');
      setActiveTab('create');
  };

  const handleDeleteExam = async (id: string) => {
      if (!window.confirm("Tem certeza que deseja cancelar esta solicitação? Esta ação não pode ser desfeita.")) return;
      
      try {
          await deleteExamRequest(id);
          setExams(exams.filter(e => e.id !== id));
          alert("Solicitação removida com sucesso.");
      } catch (error: any) {
          console.error("Erro ao deletar", error);
          if (error.code === 'permission-denied') {
              alert("Erro de Permissão: Você não pode excluir esta solicitação.");
          } else {
              alert("Erro ao excluir solicitação.");
          }
      }
  };

  const handleSaveExam = async () => {
    if (!user) return;
    if (!uploadedFile && !existingFileUrl) {
        alert("Por favor, faça o upload do arquivo (PDF ou Imagem) da prova/apostila.");
        return;
    }
    if (!docTitle || !selectedClassForExam) {
        alert("Preencha o título e selecione a turma.");
        return;
    }

    setIsSaving(true);
    try {
        // Tenta garantir que o usuário tenha um perfil no banco para passar nas Regras de Segurança
        await ensureUserProfile(user);

        let finalFileUrl = existingFileUrl;
        let finalFileName = existingFileUrl ? "Arquivo Existente" : "";

        // Upload new file if exists
        if (uploadedFile) {
            try {
                finalFileUrl = await uploadExamFile(uploadedFile);
                finalFileName = uploadedFile.name;
            } catch (storageError: any) {
                console.error("Erro Storage:", storageError);
                if (storageError.code === 'storage/unauthorized') {
                    throw new Error("Permissão negada no Storage. Verifique as regras do Firebase Storage.");
                }
                throw new Error("Falha ao fazer upload do arquivo. Tente novamente.");
            }
        }

        const examData: any = {
            teacherId: user.id,
            teacherName: user.name,
            subject: user.subject || 'Geral',
            title: docTitle,
            quantity: Number(printQuantity), // Garante que é número
            gradeLevel: selectedClassForExam || (user.classes?.[0] || 'Geral'),
            instructions: docSubtitle,
            fileName: finalFileName,
            fileUrl: finalFileUrl,
            status: ExamStatus.PENDING,
            createdAt: Date.now(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            // Campos de diagramação
            materialType: materialType || 'exam',
            columns: docColumns || 2,
            headerData: creationMode === 'create' ? {
                schoolName: 'CEMAL EQUIPE',
                showStudentName,
                showScore: materialType === 'exam',
                maxScore
            } : undefined
        };

        console.log("Tentando salvar:", examData); // Debug Log

        if (editingExamId) {
            await updateExamRequest({ ...examData, id: editingExamId });
            alert("Solicitação atualizada com sucesso!");
        } else {
            await saveExam({ ...examData, id: '' });
            alert("Solicitação enviada para a gráfica com sucesso!");
        }
        
        // Limpeza e redirecionamento
        resetForm();
        setActiveTab('requests');
        
    } catch (error: any) {
        console.error("Erro Geral SaveExam:", error);
        if (error.code === 'permission-denied') {
            alert("Erro de Permissão (Firestore): As regras de segurança bloquearam o envio. É possível que seu usuário não esteja cadastrado corretamente como 'Professor' no banco de dados. Contate a administração.");
        } else {
            alert("Erro ao processar: " + (error.message || "Erro desconhecido"));
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleUploadMaterial = async () => {
      if (!user) return;
      if (!materialFile || !materialClass || !materialTitle || !materialSubject) {
          alert("Preencha todos os campos, incluindo a disciplina.");
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
              subject: materialSubject, // Salva a disciplina selecionada
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
          // Não limpamos a turma e disciplina para facilitar múltiplos envios
          
          if (materialFileInputRef.current) {
              materialFileInputRef.current.value = '';
          }

          alert("Material enviado com sucesso! Salvo na pasta: " + materialSubject);
      } catch (error: any) {
          console.error("Erro no upload", error);
          if (error.code === 'storage/unauthorized') {
             alert("Erro de Permissão: Você não tem permissão para enviar arquivos. Verifique as regras do Storage no Firebase Console.");
          } else if (error.code === 'permission-denied') {
             alert("Erro de Permissão: Falha ao salvar registro no banco de dados. Verifique as regras do Firestore.");
          } else {
             alert("Falha ao enviar material: " + (error.message || "Erro desconhecido"));
          }
      } finally {
          setIsUploadingMaterial(false);
      }
  };

  const handleDeleteMaterial = async (id: string) => {
      if (!window.confirm("Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita.")) return;
      
      try {
          await deleteClassMaterial(id);
          setMaterials(materials.filter(m => m.id !== id));
      } catch (error: any) {
          console.error("Erro ao excluir", error);
          if (error.code === 'permission-denied') {
              alert("Erro de Permissão: Você não pode excluir este material.");
          } else {
              alert("Erro ao excluir material.");
          }
      }
  };

  const handleSavePlan = async () => {
      if (!user) return;
      if (!planClass) return alert("Selecione a turma.");

      setIsSavingPlan(true);
      try {
          await ensureUserProfile(user);

          const newPlan: LessonPlan = {
              id: '',
              teacherId: user.id,
              teacherName: user.name,
              type: planType,
              className: planClass,
              subject: user.subject || 'Geral',
              createdAt: Date.now(),
              // Conditional Fields
              ...(planType === 'daily' ? {
                  date: planDate,
                  topic: planTopic,
                  content: planContent,
                  methodology: planMethodology,
                  resources: planResources,
                  evaluation: planEvaluation,
                  homework: planHomework
              } : {
                  period: planPeriod,
                  justification: planJustification,
                  semesterContents: planSemesterContents,
                  cognitiveSkills: planCognitiveSkills,
                  socialEmotionalSkills: planSocialSkills,
                  didacticStrategies: planStrategies,
                  activitiesPre: planActPre,
                  activitiesAuto: planActAuto,
                  activitiesCoop: planActCoop,
                  activitiesCompl: planActCompl,
                  educationalPractices: planPractices,
                  educationalSpaces: planSpaces,
                  didacticResources: planDidacticResources,
                  evaluationStrategies: planEvaluationStrat,
                  references: planReferences
              })
          };

          const docId = await saveLessonPlan(newPlan);
          newPlan.id = docId;

          // Reset fields
          setPlanTopic(''); setPlanContent(''); setPlanMethodology(''); setPlanResources(''); setPlanEvaluation(''); setPlanHomework('');
          setPlanJustification(''); setPlanSemesterContents(''); setPlanCognitiveSkills(''); setPlanSocialSkills(''); setPlanStrategies('');
          setPlanActPre(''); setPlanActAuto(''); setPlanActCoop(''); setPlanActCompl('');
          setPlanPractices(''); setPlanSpaces(''); setPlanDidacticResources(''); setPlanEvaluationStrat(''); setPlanReferences('');
          
          alert("Planejamento salvo com sucesso!");
          
          // Update local list
          setLessonPlans([newPlan, ...lessonPlans]);

      } catch (error: any) {
          console.error("Erro ao salvar planejamento", error);
          if (error.code === 'permission-denied') {
              alert("Erro de Permissão: Você não tem permissão para salvar planejamentos. Peça ao administrador para verificar as Regras do Firestore.");
          } else {
              alert("Erro ao salvar planejamento: " + error.message);
          }
      } finally {
          setIsSavingPlan(false);
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
          link.download = filename; 
          
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
          console.error("Erro no download automático:", error);
          window.open(url, '_blank');
      } finally {
          setDownloadingId(null);
      }
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: 'requests' | 'create' | 'materials' | 'plans', label: string, icon: any }) => (
    <button
      onClick={id === 'create' ? handleNewExam : () => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-1 font-medium text-sm
      ${activeTab === id 
        ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' 
        : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
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
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu do Professor</p>
                <SidebarItem id="requests" label="Meus Pedidos" icon={List} />
                <SidebarItem id="create" label="Nova Solicitação" icon={PlusCircle} />
                <SidebarItem id="materials" label="Materiais de Aula" icon={FolderUp} />
                <SidebarItem id="plans" label="Planejamento" icon={BookOpenCheck} />
            </div>
            
            <div className="mb-6 border-t border-white/10 pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Acesso Externo</p>
                
                <a 
                    href="https://login.plurall.net/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 font-medium text-sm text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <ExternalLink size={18} />
                    <span>Plurall</span>
                </a>

                <a 
                    href="https://apps.gennera.com.br/public/#/login" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <ExternalLink size={18} />
                    <span>Gennera</span>
                </a>
            </div>

            <div className="mt-auto bg-blue-900/40 p-4 rounded-xl border border-blue-500/30">
                <p className="text-xs font-bold text-blue-300 mb-2">Dica do Sistema</p>
                <p className="text-xs text-blue-200 leading-relaxed">
                    Utilize o "Estúdio de Criação" para diagramar provas automaticamente usando IA.
                </p>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden flex flex-col bg-transparent">
            
            {/* VIEW: MY REQUESTS */}
            {activeTab === 'requests' && (
                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Meus Pedidos</h1>
                        <p className="text-gray-400">Acompanhe o status das suas impressões na gráfica.</p>
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
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button 
                                                                onClick={() => handleEditExam(e)} 
                                                                className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center transition-colors"
                                                                title="Editar Solicitação"
                                                            >
                                                                <Edit3 size={14} className="mr-1"/> Editar
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteExam(e.id)} 
                                                                className="text-red-500 hover:text-red-700 font-bold text-xs flex items-center transition-colors"
                                                                title="Cancelar Solicitação"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
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
                        <h1 className="text-3xl font-bold text-white">Materiais de Aula</h1>
                        <p className="text-gray-400">Envie PDFs, slides e documentos organizados por turma.</p>
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
                                            className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all" 
                                            placeholder="Ex: Slides - Revolução Francesa"
                                            value={materialTitle}
                                            onChange={e => setMaterialTitle(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Turma Destino</label>
                                        <select 
                                            className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            value={materialClass}
                                            onChange={e => setMaterialClass(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* SELETOR DE DISCIPLINA (DINÂMICO) */}
                                    {materialClass && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina (Pasta)</label>
                                            <select 
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                                value={materialSubject}
                                                onChange={e => setMaterialSubject(e.target.value)}
                                            >
                                                {availableSubjects.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo</label>
                                        <input 
                                            type="file"
                                            ref={materialFileInputRef}
                                            className="w-full text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
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
                                     <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                                         <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                         <p className="text-gray-500 font-medium">Nenhum material enviado ainda.</p>
                                         <p className="text-xs text-gray-400 mt-2">Selecione uma turma e faça upload para começar.</p>
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
                                                         {material.subject && (
                                                             <span className="bg-purple-100 px-2 py-0.5 rounded text-purple-700 font-bold">{material.subject}</span>
                                                         )}
                                                         <span>• {new Date(material.createdAt).toLocaleDateString()}</span>
                                                     </p>
                                                 </div>
                                             </div>
                                             
                                             <div className="flex items-center gap-2">
                                                  <button 
                                                    onClick={() => handleDeleteMaterial(material.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                                    title="Excluir Material"
                                                  >
                                                      <Trash2 size={18} />
                                                  </button>
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
            
            {/* VIEW: LESSON PLANS */}
            {activeTab === 'plans' && (
                <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Planejamento de Aula</h1>
                        <p className="text-gray-400">Organize suas aulas e envie o planejamento para a coordenação.</p>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* FORMULARIO */}
                        <div className="lg:col-span-2">
                            <Card className="overflow-hidden">
                                <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
                                    <button 
                                        onClick={() => setPlanType('daily')}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${planType === 'daily' ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        <Calendar size={18}/> Planejamento Diário
                                    </button>
                                    <button 
                                        onClick={() => setPlanType('semester')}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${planType === 'semester' ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        <Layers size={18}/> Planejamento Semestral
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Campos Comuns: Turma e Data/Bimestre */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Turma</label>
                                            <select 
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-700"
                                                value={planClass}
                                                onChange={e => setPlanClass(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {planType === 'daily' ? (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data da Aula</label>
                                                <input 
                                                    type="date"
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-700"
                                                    value={planDate}
                                                    onChange={e => setPlanDate(e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bimestre</label>
                                                <select 
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-700"
                                                    value={planPeriod}
                                                    onChange={e => setPlanPeriod(e.target.value)}
                                                >
                                                    <option value="1º Bimestre">1º Bimestre</option>
                                                    <option value="2º Bimestre">2º Bimestre</option>
                                                    <option value="3º Bimestre">3º Bimestre</option>
                                                    <option value="4º Bimestre">4º Bimestre</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {planType === 'daily' ? (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tema da Aula</label>
                                                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planTopic} onChange={e => setPlanTopic(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo Programático</label>
                                                <textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planContent} onChange={e => setPlanContent(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Metodologia / Estratégias</label>
                                                <textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planMethodology} onChange={e => setPlanMethodology(e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recursos Didáticos</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planResources} onChange={e => setPlanResources(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Avaliação</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planEvaluation} onChange={e => setPlanEvaluation(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tarefa de Casa</label>
                                                <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700" value={planHomework} onChange={e => setPlanHomework(e.target.value)} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* SEÇÃO 1: JUSTIFICATIVA E CONTEÚDOS */}
                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <h4 className="font-bold text-green-800 mb-3 text-sm flex items-center gap-2 uppercase">Base do Planejamento</h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 uppercase mb-1">Breve Justificativa</label>
                                                        <textarea rows={3} className="w-full border border-green-200 rounded-lg p-2.5 bg-white text-gray-700 text-sm focus:ring-green-500 focus:border-green-500" placeholder="Descrição da importância dos conceitos..." value={planJustification} onChange={e => setPlanJustification(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 uppercase mb-1">Conteúdos</label>
                                                        <textarea rows={3} className="w-full border border-green-200 rounded-lg p-2.5 bg-white text-gray-700 text-sm focus:ring-green-500 focus:border-green-500" placeholder="Descrição dos conteúdos a serem desenvolvidos..." value={planSemesterContents} onChange={e => setPlanSemesterContents(e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEÇÃO 2: HABILIDADES */}
                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <h4 className="font-bold text-green-800 mb-3 text-sm flex items-center gap-2 uppercase">Habilidades</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 uppercase mb-1">Habilidades Cognitivas</label>
                                                        <textarea rows={4} className="w-full border border-green-200 rounded-lg p-2.5 bg-white text-gray-700 text-sm focus:ring-green-500 focus:border-green-500" placeholder="Descrição das habilidades cognitivas..." value={planCognitiveSkills} onChange={e => setPlanCognitiveSkills(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-green-700 uppercase mb-1">Habilidades Socioemocionais</label>
                                                        <textarea rows={4} className="w-full border border-green-200 rounded-lg p-2.5 bg-white text-gray-700 text-sm focus:ring-green-500 focus:border-green-500" placeholder="Descrição das habilidades socioemocionais..." value={planSocialSkills} onChange={e => setPlanSocialSkills(e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEÇÃO 3: ESTRATÉGIAS */}
                                            <div>
                                                <label className="block text-xs font-bold text-green-700 uppercase mb-1 bg-green-100 p-2 rounded-t-lg border border-green-200 border-b-0">Situações Didáticas</label>
                                                <textarea rows={3} className="w-full border border-green-200 rounded-b-lg p-2.5 bg-gray-50 text-gray-700 text-sm focus:ring-green-500 focus:border-green-500" placeholder="Atividades, meios e estratégias..." value={planStrategies} onChange={e => setPlanStrategies(e.target.value)} />
                                            </div>

                                            {/* SEÇÃO 4: ATIVIDADES (GRID) */}
                                            <div className="border border-green-200 rounded-lg overflow-hidden">
                                                <div className="bg-green-600 text-white text-center font-bold py-1 text-sm uppercase">Atividades</div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-green-200">
                                                    <div className="p-2 bg-green-50">
                                                        <label className="block text-[10px] font-bold text-green-800 uppercase mb-1 text-center">Prévias</label>
                                                        <textarea rows={5} className="w-full border border-green-200 rounded p-2 text-xs bg-white text-gray-700 resize-none" placeholder="Atividades orais e escritas..." value={planActPre} onChange={e => setPlanActPre(e.target.value)} />
                                                    </div>
                                                    <div className="p-2 bg-green-50">
                                                        <label className="block text-[10px] font-bold text-green-800 uppercase mb-1 text-center">Autodidáticas</label>
                                                        <textarea rows={5} className="w-full border border-green-200 rounded p-2 text-xs bg-white text-gray-700 resize-none" placeholder="Atividades autônomas..." value={planActAuto} onChange={e => setPlanActAuto(e.target.value)} />
                                                    </div>
                                                    <div className="p-2 bg-green-50">
                                                        <label className="block text-[10px] font-bold text-green-800 uppercase mb-1 text-center">Didático-Cooperativas</label>
                                                        <textarea rows={5} className="w-full border border-green-200 rounded p-2 text-xs bg-white text-gray-700 resize-none" placeholder="Em dupla, equipe..." value={planActCoop} onChange={e => setPlanActCoop(e.target.value)} />
                                                    </div>
                                                    <div className="p-2 bg-green-50">
                                                        <label className="block text-[10px] font-bold text-green-800 uppercase mb-1 text-center">Complementares</label>
                                                        <textarea rows={5} className="w-full border border-green-200 rounded p-2 text-xs bg-white text-gray-700 resize-none" placeholder="Complementam o conteúdo..." value={planActCompl} onChange={e => setPlanActCompl(e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEÇÃO 5: RODAPÉ */}
                                            <div className="space-y-4 pt-2">
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Práticas Educativas</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 text-sm" value={planPractices} onChange={e => setPlanPractices(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Espaços Educativos</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 text-sm" value={planSpaces} onChange={e => setPlanSpaces(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Recursos Didáticos</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 text-sm" value={planDidacticResources} onChange={e => setPlanDidacticResources(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Estratégias de Avaliação</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 text-sm" value={planEvaluationStrat} onChange={e => setPlanEvaluationStrat(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Fontes de Referência</label>
                                                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-700 text-sm" value={planReferences} onChange={e => setPlanReferences(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6">
                                        <Button 
                                            onClick={handleSavePlan}
                                            isLoading={isSavingPlan}
                                            className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg py-3 text-sm uppercase tracking-wide"
                                        >
                                            <Save size={18} className="mr-2"/> Salvar Planejamento
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                        
                        {/* HISTORICO */}
                        <div className="lg:col-span-1">
                            <h3 className="font-bold text-white mb-4">Meus Planejamentos</h3>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {lessonPlans.map(plan => (
                                    <div key={plan.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${plan.type === 'daily' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {plan.type === 'daily' ? 'Diário' : 'Semestral'}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(plan.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">{plan.className}</h4>
                                        <p className="text-xs text-gray-600 mb-2">{plan.subject}</p>
                                        {plan.type === 'semester' && plan.period && (
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">{plan.period}</span>
                                        )}
                                    </div>
                                ))}
                                {lessonPlans.length === 0 && (
                                    <p className="text-gray-300 text-center text-sm py-4 bg-white/5 rounded-lg border border-white/10">Nenhum planejamento salvo.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: CREATE/EDIT REQUEST */}
            {activeTab === 'create' && (
                <div className="flex-1 flex flex-col h-full bg-transparent">
                    
                    {/* SELECTION SCREEN */}
                    {creationMode === 'none' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
                             <div className="max-w-4xl w-full">
                                 <h2 className="text-3xl font-bold text-white mb-8 text-center">Como deseja solicitar sua impressão?</h2>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                     {/* Option A: Direct Upload */}
                                     <button 
                                        onClick={() => setCreationMode('upload')}
                                        className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20 transition-all flex flex-col items-center text-center"
                                     >
                                         <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                             <FileUp size={48} />
                                         </div>
                                         <h3 className="text-xl font-bold text-gray-900 mb-3">Envio Rápido (Upload)</h3>
                                         <p className="text-gray-500 text-sm leading-relaxed">
                                             Já tenho o arquivo pronto (PDF, Word ou Imagem). Quero apenas anexar e enviar para a gráfica.
                                         </p>
                                     </button>

                                     {/* Option B: Create Studio */}
                                     <button 
                                        onClick={() => setCreationMode('create')}
                                        className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:border-purple-500 hover:ring-2 hover:ring-purple-500/20 transition-all flex flex-col items-center text-center"
                                     >
                                         <div className="h-24 w-24 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                             <PenTool size={48} />
                                         </div>
                                         <h3 className="text-xl font-bold text-gray-900 mb-3">Estúdio de Criação</h3>
                                         <p className="text-gray-500 text-sm leading-relaxed">
                                             Quero criar ou diagramar uma prova/apostila agora, usando as ferramentas de IA e layout da plataforma.
                                         </p>
                                     </button>
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    {/* MODE: DIRECT UPLOAD */}
                    {creationMode === 'upload' && (
                         <div className="max-w-3xl mx-auto w-full p-8 animate-in fade-in slide-in-from-bottom-4">
                             <div className="flex items-center gap-4 mb-8">
                                 <button onClick={() => setCreationMode('none')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                                     <ArrowLeft size={24} />
                                 </button>
                                 <h2 className="text-2xl font-bold text-white">Solicitação de Impressão (Envio Rápido)</h2>
                             </div>

                             <Card className="space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="col-span-2">
                                         <label className="block text-sm font-bold text-gray-700 mb-1">Título da Atividade</label>
                                         <input 
                                             type="text" 
                                             className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" 
                                             placeholder="Ex: Prova Bimestral de História"
                                             value={docTitle}
                                             onChange={e => setDocTitle(e.target.value)}
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-bold text-gray-700 mb-1">Turma</label>
                                         <select 
                                            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                                            value={selectedClassForExam}
                                            onChange={e => setSelectedClassForExam(e.target.value)}
                                         >
                                            <option value="">Selecione...</option>
                                            {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                         </select>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade de Cópias</label>
                                         <input 
                                             type="number" 
                                             className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700" 
                                             value={printQuantity}
                                             onChange={e => setPrintQuantity(Number(e.target.value))}
                                         />
                                     </div>
                                     <div className="col-span-2">
                                         <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Material</label>
                                         <div className="grid grid-cols-2 gap-4">
                                             <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${materialType === 'exam' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                 <input 
                                                     type="radio" 
                                                     name="materialType" 
                                                     className="hidden" 
                                                     checked={materialType === 'exam'} 
                                                     onChange={() => setMaterialType('exam')} 
                                                 />
                                                 <FileText size={18} className="mr-2"/>
                                                 <span className="font-bold">Prova / Avaliação</span>
                                             </label>
                                             <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${materialType === 'handout' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                 <input 
                                                     type="radio" 
                                                     name="materialType" 
                                                     className="hidden" 
                                                     checked={materialType === 'handout'} 
                                                     onChange={() => setMaterialType('handout')} 
                                                 />
                                                 <BookOpen size={18} className="mr-2"/>
                                                 <span className="font-bold">Apostila / Atividade</span>
                                             </label>
                                         </div>
                                     </div>
                                     <div className="col-span-2">
                                         <label className="block text-sm font-bold text-gray-700 mb-1">Observações / Instruções para Gráfica</label>
                                         <textarea 
                                             className="w-full border border-gray-300 rounded-lg p-3 h-24 bg-gray-50 text-gray-700" 
                                             placeholder="Ex: Imprimir frente e verso, grampear no canto..."
                                             value={docSubtitle}
                                             onChange={e => setDocSubtitle(e.target.value)}
                                         />
                                     </div>
                                 </div>

                                 <div className="border-t border-gray-100 pt-6">
                                     <label className="block text-sm font-bold text-gray-700 mb-3">Arquivo para Impressão</label>
                                     <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors bg-white">
                                         <input 
                                            type="file" 
                                            id="quick-upload" 
                                            ref={examFileInputRef}
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                            accept=".pdf,.doc,.docx,image/*"
                                         />
                                         <label htmlFor="quick-upload" className="cursor-pointer flex flex-col items-center w-full">
                                             {uploadedFile ? (
                                                 <div className="flex flex-col items-center text-green-600">
                                                     <FileText size={48} className="mb-2" />
                                                     <span className="font-bold text-lg">{uploadedFile.name}</span>
                                                     <span className="text-xs text-gray-400 mt-1">Clique para trocar</span>
                                                 </div>
                                             ) : (
                                                 <>
                                                    <UploadCloud className="text-brand-500 mb-2" size={48} />
                                                    <span className="text-lg font-bold text-gray-700">Clique para selecionar o arquivo</span>
                                                    <span className="text-xs text-gray-400 mt-1">PDF, Word ou Imagem</span>
                                                 </>
                                             )}
                                         </label>
                                     </div>
                                 </div>

                                 <div className="pt-4">
                                     <Button 
                                        onClick={handleSaveExam} 
                                        isLoading={isSaving}
                                        className="w-full py-4 text-lg shadow-lg shadow-brand-900/20"
                                     >
                                         <Printer size={20} className="mr-2" /> Enviar Pedido para Gráfica
                                     </Button>
                                 </div>
                             </Card>
                         </div>
                    )}

                    {/* MODE: CREATE STUDIO (Existing Editor) */}
                    {creationMode === 'create' && (
                        <div className="flex-1 flex flex-col h-full bg-gray-50">
                            {/* Header Toolbar */}
                            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setCreationMode('none')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="Voltar">
                                        <ArrowLeft size={20} />
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
                            
                            {/* Workspace (mantido) */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Left Panel (Config) */}
                                <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                                    <div className="p-6 space-y-8">
                                        <div>
                                            <SectionHeader title="Tipo de Material" subtitle="O que será impresso?" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => setMaterialType('exam')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${materialType === 'exam' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><FileText size={24} /><span className="text-xs font-bold">Prova</span></button>
                                                <button onClick={() => setMaterialType('handout')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${materialType === 'handout' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><BookOpen size={24} /><span className="text-xs font-bold">Apostila</span></button>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionHeader title="Diagramação" subtitle="Colunas na página" />
                                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                                <button onClick={() => setDocColumns(1)} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 ${docColumns === 1 ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><Layout size={14} /> 1 Coluna</button>
                                                <button onClick={() => setDocColumns(2)} className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 ${docColumns === 2 ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><Columns size={14} /> 2 Colunas</button>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionHeader title="Detalhes" subtitle="Informações da turma" />
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Turma</label>
                                                    <select className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 text-gray-700" value={selectedClassForExam} onChange={e => setSelectedClassForExam(e.target.value)}>
                                                        <option value="">Selecione...</option>
                                                        {["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Instruções</label>
                                                    <textarea className="w-full mt-1 border border-gray-300 rounded-lg p-2 text-sm h-20 bg-gray-50 text-gray-700" value={docSubtitle} onChange={e => setDocSubtitle(e.target.value)} placeholder="Ex: Leia com atenção..." />
                                                </div>
                                                {materialType === 'exam' && (
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm text-gray-700">Valor da Prova</label>
                                                        <input type="number" className="w-16 border border-gray-300 rounded p-1 text-center" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <SectionHeader title="Arquivo Fonte" subtitle="PDF ou Imagens" />
                                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors bg-white">
                                                <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
                                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                                    <UploadCloud className="text-brand-500 mb-2" size={32} />
                                                    <span className="text-sm font-bold text-gray-700">Clique para enviar</span>
                                                </label>
                                                {(uploadedFile || existingFileUrl) && (
                                                    <div className="mt-4 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                        <CheckCircle size={12} />
                                                        {uploadedFile ? "Arquivo Selecionado" : "Arquivo Carregado"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {uploadedFile && (uploadedFile.type.startsWith('image/') || uploadedFile.type === 'application/pdf') && (
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                                                <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm mb-2"><Sparkles size={14} className="text-indigo-500" />IA Diagramadora</h4>
                                                <Button onClick={handleAIDiagramming} isLoading={isDiagramming} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-900/20 text-xs"><Wand2 size={14} className="mr-2" />Diagramar com IA</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Right Panel (Preview) - Mantido simplificado aqui */}
                                <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex justify-center relative">
                                    <div className="absolute top-4 right-4 flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                                        <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomOut size={16}/></button>
                                        <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomIn size={16}/></button>
                                    </div>
                                    <div className="bg-white shadow-2xl transition-all duration-300 origin-top" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', transform: `scale(${zoomLevel})`, marginBottom: '100px' }}>
                                        <div className="mb-6">
                                            <img src={materialType === 'exam' ? HEADER_EXAM_URL : HEADER_HANDOUT_URL} alt="Cabeçalho" className="w-full h-auto object-contain" />
                                            <div className="mt-4 flex flex-col gap-2 border-b border-gray-300 pb-4 mb-4 font-sans text-sm">
                                                <div className="flex justify-between"><p><span className="font-bold">Professor:</span> {user?.name}</p><p><span className="font-bold">Disciplina:</span> {user?.subject}</p></div>
                                                <div className="flex justify-between"><p><span className="font-bold">Turma:</span> {selectedClassForExam}</p><p><span className="font-bold">Data:</span> ____/____/____</p></div>
                                            </div>
                                            <div className="mb-6"><h2 className="text-xl font-bold text-center uppercase tracking-wide text-gray-900">{docTitle}</h2>{docSubtitle && <p className="text-center text-gray-500 text-sm italic mt-1">{docSubtitle}</p>}</div>
                                        </div>
                                        <div className={docColumns === 2 ? "columns-2 gap-8" : ""}>
                                            {aiGeneratedContent ? <div className="prose prose-sm max-w-none text-justify font-serif" dangerouslySetInnerHTML={{ __html: aiGeneratedContent }} /> : (filePreviewUrl || existingFileUrl ? <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-8 bg-gray-50 min-h-[400px]"><img src={filePreviewUrl || existingFileUrl || ''} alt="Preview" className="max-w-full h-auto shadow-md" /></div> : <div className="text-center py-20 text-gray-300"><p>Área de Conteúdo</p></div>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
