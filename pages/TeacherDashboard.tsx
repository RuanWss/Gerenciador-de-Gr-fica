import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExams, saveExam, uploadExamFile, listenToSystemConfig } from '../services/firebaseService';
import { generateExamQuestions, suggestExamInstructions } from '../services/geminiService';
import { ExamRequest, ExamStatus, SystemConfig } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, 
  FileText, 
  BrainCircuit, 
  RefreshCw, 
  UploadCloud, 
  AlertTriangle, 
  Megaphone, 
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Printer,
  Columns,
  BookOpen,
  GripVertical
} from 'lucide-react';

// Interfaces locais para o Criador de Provas
interface DocBlock {
    id: string;
    type: 'question' | 'text' | 'image';
    content: string; // Texto da questão ou URL da imagem
    options?: string[]; // Para questões de múltipla escolha
    lines?: number; // Para questões discursivas
    imageFile?: File; // Para upload
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'ai' | 'creator'>('list');
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // UI State
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

  // AI State
  const [aiTopic, setAiTopic] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [instructionLoading, setInstructionLoading] = useState(false);

  // --- STATES DO CRIADOR DE PROVAS ---
  const [docTitle, setDocTitle] = useState('');
  const [docColumns, setDocColumns] = useState<1 | 2>(1);
  const [docHeaderType, setDocHeaderType] = useState<'work' | 'exam'>('work');
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [isLoadingEnem, setIsLoadingEnem] = useState(false);
  
  // Mock Data for ENEM Questions to replace broken API
  const MOCK_ENEM_QUESTIONS = [
      {
          context: "A democratização do acesso ao cinema no Brasil é um tema recorrente em debates sociais.",
          question: "Considerando o contexto histórico e social brasileiro, a principal barreira para a universalização do cinema é:",
          alternatives: ["A) A falta de produção nacional de qualidade.", "B) A concentração das salas em grandes centros urbanos.", "C) O desinteresse do público jovem pela cultura.", "D) A censura imposta pelos órgãos governamentais.", "E) A barreira linguística dos filmes estrangeiros."]
      },
      {
          context: "O ciclo da água é fundamental para a manutenção da vida no planeta Terra. Ele envolve processos de evaporação, condensação e precipitação.",
          question: "Qual etapa do ciclo hidrológico é responsável pelo retorno da água à superfície terrestre na forma líquida ou sólida?",
          alternatives: ["A) Transpiração", "B) Condensação", "C) Precipitação", "D) Infiltração", "E) Evaporação"]
      },
      {
          context: "Texto base: 'Ser ou não ser, eis a questão'. A famosa frase de Shakespeare reflete um dilema existencial profundo.",
          question: "A obra 'Hamlet', de William Shakespeare, pertence a qual gênero literário?",
          alternatives: ["A) Épico", "B) Lírico", "C) Dramático", "D) Satírico", "E) Narrativo"]
      },
      {
          context: "A Primeira Revolução Industrial marcou uma transformação profunda nos modos de produção.",
          question: "Qual foi a principal fonte de energia utilizada nas máquinas térmicas durante a Primeira Revolução Industrial?",
          alternatives: ["A) Petróleo", "B) Eletricidade", "C) Carvão Mineral", "D) Energia Nuclear", "E) Energia Solar"]
      },
      {
          context: "Em uma progressão aritmética (PA), a razão é constante.",
          question: "Se o primeiro termo de uma PA é 2 e a razão é 3, qual é o quinto termo?",
          alternatives: ["A) 11", "B) 12", "C) 14", "D) 15", "E) 17"]
      }
  ];

  // Fetch Exams from Firebase
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
    
    // Listen to System Config
    const unsubscribe = listenToSystemConfig((config) => {
        setSysConfig(config);
    });
    return () => unsubscribe();
  }, [user, activeTab]);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
        if (user.subject) setSubject(user.subject);
        if (user.classes && user.classes.length > 0) {
            setGradeLevel(user.classes[0]);
        }
    }
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateStr = e.target.value;
    setDueDate(selectedDateStr);

    if (selectedDateStr) {
      const selectedDate = new Date(selectedDateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const diffTime = selectedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 2) {
        setShowDateWarning(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
        let uploadedUrl = '';
        if (file) {
            uploadedUrl = await uploadExamFile(file);
        }

        const newExam: ExamRequest = {
            id: '', // Firestore will generate
            teacherId: user.id,
            teacherName: user.name,
            subject,
            title,
            quantity: 0,
            gradeLevel,
            instructions,
            fileName: fileName || 'Sem anexo (apenas instruções)',
            fileUrl: uploadedUrl,
            status: ExamStatus.PENDING,
            createdAt: Date.now(),
            dueDate
        };

        await saveExam(newExam);
        
        // Reset form
        setActiveTab('list');
        setTitle('');
        setFileName('');
        setFile(null);
        setDueDate('');
        setShowDateWarning(false);
    } catch (error) {
        console.error(error);
        alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const result = await generateExamQuestions(aiTopic, gradeLevel);
      setAiResult(result);
    } catch (error) {
        setAiResult("Erro ao gerar. Verifique se a chave de API foi configurada corretamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestInstructions = async () => {
    setInstructionLoading(true);
    const suggestion = await suggestExamInstructions('Prova Bimestral');
    setInstructions(suggestion);
    setInstructionLoading(false);
  };

  // --- FUNÇÕES DO CRIADOR DE PROVAS ---
  
  const addBlock = (type: 'question' | 'text' | 'image') => {
      const newBlock: DocBlock = {
          id: Date.now().toString(),
          type,
          content: '',
          lines: type === 'question' ? 3 : undefined,
          options: type === 'question' ? [] : undefined
      };
      setBlocks([...blocks, newBlock]);
  };

  const handleAddEnemQuestion = async () => {
      setIsLoadingEnem(true);
      try {
          // Simulação de delay de rede
          await new Promise(resolve => setTimeout(resolve, 600));

          // Sorteio de uma questão do banco local (Mock)
          const randomQuestion = MOCK_ENEM_QUESTIONS[Math.floor(Math.random() * MOCK_ENEM_QUESTIONS.length)];
          
          let formattedContent = "";
          if (randomQuestion.context) formattedContent += `${randomQuestion.context}\n\n`;
          formattedContent += `${randomQuestion.question}\n\n`;
          
          randomQuestion.alternatives.forEach((alt) => {
              formattedContent += `${alt}\n`;
          });

          const newBlock: DocBlock = {
              id: Date.now().toString(),
              type: 'question',
              content: formattedContent,
              lines: 0,
              options: []
          };
          
          setBlocks([...blocks, newBlock]);

      } catch (error) {
          console.error("Erro ao buscar questão ENEM:", error);
          alert("Erro interno ao gerar questão.");
      } finally {
          setIsLoadingEnem(false);
      }
  };

  const updateBlock = (id: string, field: keyof DocBlock, value: any) => {
      setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBlock = (id: string) => {
      setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === blocks.length - 1) return;
      
      const newBlocks = [...blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      setBlocks(newBlocks);
  };

  const handleImageBlockUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          setBlocks(blocks.map(b => b.id === id ? { ...b, content: url, imageFile: file } : b));
      }
  };

  const handlePrintDoc = () => {
      const printWindow = window.open('', '', 'width=900,height=1000');
      if (!printWindow) return;

      const htmlContent = document.getElementById('a4-preview')?.innerHTML;
      if (!htmlContent) return;

      const styles = `
        <style>
            /* ENEM Style Formatting - Refined */
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

            body { 
                font-family: 'Poppins', sans-serif; 
                padding: 0; 
                margin: 0;
                font-size: 10pt; 
                line-height: 1.35;
                color: black;
                -webkit-print-color-adjust: exact;
            }
            .columns-2 { 
                column-count: 2; 
                column-gap: 8mm; 
                column-rule: 1px solid #eee;
            }
            .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            img { max-width: 100%; height: auto; }
            
            /* Typography */
            .font-serif { font-family: 'Times New Roman', serif !important; }
            .font-sans { font-family: 'Poppins', sans-serif !important; }
            
            .text-justify { text-align: justify; }
            
            /* Question Header */
            .question-number { 
                font-family: 'Poppins', sans-serif; 
                font-weight: 700; 
                font-size: 10pt;
                margin-bottom: 4px;
                display: block;
                color: #000;
            }
            
            /* Spacing */
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            
            /* Lines for written answer */
            .lines { border-bottom: 1px solid #999; width: 100%; height: 20px; margin-top: 2px; }
            
            /* Header Images */
            .header-img-container { position: relative; width: 100%; margin-bottom: 20px; }
            .header-img { width: 100%; display: block; }
            
            /* Overlay Text Positioning (Adjusted for Print) */
            .overlay-text { 
                position: absolute; 
                font-size: 12px; 
                font-weight: 600; 
                color: #222; 
                font-family: 'Poppins', sans-serif; 
                white-space: nowrap;
                overflow: hidden;
            }
            
            /* Coordinates for Apostila */
            .work-student { top: 38px; left: 345px; width: 420px; }
            .work-prof { top: 72px; left: 345px; width: 420px; }
            .work-disc { top: 108px; left: 345px; width: 200px; }
            .work-class { top: 108px; left: 600px; width: 150px; } /* Moved next to discipline */
            .work-assunto { top: 143px; left: 345px; width: 420px; }
            .work-date { top: 155px; left: 160px; }

            /* Coordinates for Avaliação */
            .exam-student { top: 38px; left: 345px; width: 420px; }
            .exam-prof { top: 72px; left: 345px; width: 420px; }
            .exam-disc { top: 108px; left: 345px; width: 200px; }
            .exam-value { top: 108px; left: 600px; width: 150px; } /* Moved next to discipline */
            .exam-assunto { top: 143px; left: 345px; width: 420px; }
            .exam-date { top: 155px; left: 160px; }

            h1 { font-size: 14pt; text-transform: uppercase; text-align: center; margin-bottom: 15px; font-weight: 700; }

            @media print {
                @page { size: A4; margin: 10mm; }
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
            }
        </style>
      `;

      printWindow.document.write(`
        <html>
            <head><title>${docTitle || 'Documento'}</title>${styles}</head>
            <body>
                ${htmlContent}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
        </html>
      `);
      printWindow.document.close();
  };


  const getBannerStyles = (type: string) => {
      switch(type) {
          case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'error': return 'bg-red-100 text-red-800 border-red-200';
          case 'success': return 'bg-green-100 text-green-800 border-green-200';
          default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
  };

  return (
    <div className="space-y-6 relative h-full">
      
      {/* System Announcement Banner */}
      {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 shadow-sm ${getBannerStyles(sysConfig.bannerType)}`}>
             <Megaphone className="shrink-0 mt-0.5" size={20} />
             <div>
                 <p className="font-bold text-sm uppercase mb-1">Aviso da Escola</p>
                 <p className="text-sm">{sysConfig.bannerMessage}</p>
             </div>
          </div>
      )}

      {/* Date Warning Modal */}
      {showDateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-5">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Atenção ao Prazo!</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              A data selecionada é muito próxima. <br/>
              O prazo mínimo recomendado para o envio e impressão é de <strong>48 horas</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => setShowDateWarning(false)} 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl shadow-lg shadow-red-200"
              >
                Estou ciente, prosseguir
              </Button>
              <button 
                onClick={() => {
                   setDueDate('');
                   setShowDateWarning(false);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium py-2"
              >
                Alterar data
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel do Professor</h1>
          <p className="text-gray-500">Bem-vindo, {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'list' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('list')}
          >
            <FileText className="w-4 h-4 mr-2" /> Minhas Solicitações
          </Button>
          <Button 
            variant={activeTab === 'new' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('new')}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Solicitação
          </Button>
          <Button 
            variant={activeTab === 'creator' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('creator')}
          >
            <LayoutTemplate className="w-4 h-4 mr-2" /> Criar Prova/Apostila
          </Button>
          <Button 
            variant={activeTab === 'ai' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('ai')}
            className="bg-purple-600 hover:bg-purple-700 text-white border-transparent focus:ring-purple-500"
          >
            <BrainCircuit className="w-4 h-4 mr-2" /> Assistente AI
          </Button>
        </div>
      </header>

      <main>
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
             {isLoadingExams ? (
                 <div className="p-12 text-center text-gray-500">
                    <p>Carregando solicitações...</p>
                 </div>
             ) : exams.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3"/>
                    <p>Nenhuma solicitação de prova encontrada.</p>
                </div>
             ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Envio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título / Matéria</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {exams.map((exam) => (
                        <tr key={exam.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(exam.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{exam.title}</div>
                                <div className="text-sm text-gray-500">{exam.subject} - {exam.gradeLevel}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(exam.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border 
                                    ${exam.status === ExamStatus.COMPLETED ? 'bg-white border-green-600 text-green-700' : 
                                      exam.status === ExamStatus.IN_PROGRESS ? 'bg-white border-yellow-500 text-yellow-600' : 
                                      'bg-white border-gray-400 text-gray-600'}`}>
                                    {exam.status === ExamStatus.COMPLETED ? 'Pronto' : 
                                     exam.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pendente'}
                                </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
             )}
          </div>
        )}

        {/* --- ABA CRIADOR DE PROVAS (REFORMULADA) --- */}
        {activeTab === 'creator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
                
                {/* 1. EDITOR (ESQUERDA) - OTIMIZADO */}
                <div className="lg:col-span-4 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden">
                    
                    {/* TOPO: Configurações Compactas */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="mb-2">
                            <input 
                                type="text" 
                                className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm font-medium focus:ring-brand-500 focus:border-brand-500"
                                placeholder="Título do Documento (Ex: Prova 1)"
                                value={docTitle}
                                onChange={e => setDocTitle(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Toggle Cabeçalho */}
                            <div className="flex bg-white rounded-md border border-gray-300 p-1 flex-1">
                                <button 
                                    onClick={() => setDocHeaderType('work')}
                                    className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded transition-all ${docHeaderType === 'work' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Apostila
                                </button>
                                <button 
                                    onClick={() => setDocHeaderType('exam')}
                                    className={`flex-1 text-[10px] uppercase font-bold py-1.5 rounded transition-all ${docHeaderType === 'exam' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Avaliação
                                </button>
                            </div>
                            
                            {/* Toggle Colunas */}
                            <div className="flex bg-white rounded-md border border-gray-300 p-1">
                                <button 
                                    onClick={() => setDocColumns(1)}
                                    className={`px-3 py-1.5 rounded transition-all ${docColumns === 1 ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title="1 Coluna"
                                >
                                    <Columns size={14} className="rotate-90" />
                                </button>
                                <button 
                                    onClick={() => setDocColumns(2)}
                                    className={`px-3 py-1.5 rounded transition-all ${docColumns === 2 ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title="2 Colunas"
                                >
                                    <Columns size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CENTRO: Lista de Blocos */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-100 custom-scrollbar">
                        {blocks.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Plus size={32} className="mb-2 opacity-50"/>
                                <p className="text-xs font-medium text-center px-4">Adicione questões ou texto usando os botões abaixo.</p>
                            </div>
                        )}
                        
                        {blocks.map((block, index) => (
                            <div key={block.id} className={`bg-white rounded-lg shadow-sm border-l-4 p-3 relative group transition-all ${
                                block.type === 'question' ? 'border-l-blue-500' : 
                                block.type === 'text' ? 'border-l-gray-400' : 'border-l-purple-500'
                            }`}>
                                {/* Header do Bloco */}
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                                        <GripVertical size={12}/> 
                                        {block.type === 'question' ? `Questão ${index + 1}` : block.type}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => moveBlock(index, 'up')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"><ArrowUp size={14}/></button>
                                        <button onClick={() => moveBlock(index, 'down')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"><ArrowDown size={14}/></button>
                                        <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-red-50 rounded text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                {/* Inputs do Bloco */}
                                {block.type === 'text' && (
                                    <textarea 
                                        className="w-full text-sm border-gray-200 bg-gray-50 rounded p-2 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-colors resize-y min-h-[60px]"
                                        placeholder="Digite o texto..."
                                        value={block.content}
                                        onChange={e => updateBlock(block.id, 'content', e.target.value)}
                                    />
                                )}

                                {block.type === 'question' && (
                                    <div className="space-y-2">
                                        <textarea 
                                            className="w-full text-sm border-gray-200 bg-blue-50/30 rounded p-2 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-colors font-medium min-h-[80px]"
                                            placeholder="Enunciado da questão..."
                                            value={block.content}
                                            onChange={e => updateBlock(block.id, 'content', e.target.value)}
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Linhas:</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="20"
                                                className="w-12 text-xs border border-gray-200 rounded p-1 text-center" 
                                                value={block.lines || 0}
                                                onChange={e => updateBlock(block.id, 'lines', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {block.type === 'image' && (
                                    <div>
                                        {block.content ? (
                                            <div className="relative group/img">
                                                <img src={block.content} alt="Preview" className="h-24 w-full object-contain bg-gray-50 rounded border border-dashed border-gray-300" />
                                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity rounded">
                                                    <span className="text-xs font-bold">Alterar</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageBlockUpload(block.id, e)} />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-purple-200 bg-purple-50 rounded cursor-pointer hover:bg-purple-100 transition-colors">
                                                <ImageIcon size={20} className="text-purple-400 mb-1"/>
                                                <span className="text-xs text-purple-600 font-medium">Upload Imagem</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageBlockUpload(block.id, e)} />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* RODAPÉ: Barra de Ferramentas Fixa */}
                    <div className="p-3 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => addBlock('question')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm active:scale-95">
                                <Plus size={18} /> <span className="text-[10px] font-bold mt-1">Questão</span>
                            </button>
                            <button onClick={() => addBlock('text')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm active:scale-95">
                                <Type size={18} /> <span className="text-[10px] font-bold mt-1">Texto</span>
                            </button>
                            <button onClick={() => addBlock('image')} className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm active:scale-95">
                                <ImageIcon size={18} /> <span className="text-[10px] font-bold mt-1">Imagem</span>
                            </button>
                            <button onClick={handleAddEnemQuestion} disabled={isLoadingEnem} className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors border border-yellow-200 shadow-sm active:scale-95">
                                {isLoadingEnem ? <RefreshCw className="animate-spin" size={18} /> : <BookOpen size={18} />} 
                                <span className="text-[10px] font-bold mt-1 text-center leading-tight">ENEM</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. PREVIEW (DIREITA) */}
                <div className="lg:col-span-8 bg-gray-600 rounded-xl p-8 flex flex-col items-center overflow-y-auto shadow-inner relative">
                    <div className="absolute top-4 right-4 z-10">
                        <Button onClick={handlePrintDoc} className="shadow-xl bg-brand-600 hover:bg-brand-700">
                            <Printer className="mr-2" size={18} /> Imprimir / Salvar PDF
                        </Button>
                    </div>

                    {/* FOLHA A4 SIMULADA */}
                    <div 
                        id="a4-preview"
                        className={`bg-white shadow-2xl min-h-[1123px] w-[794px] text-gray-900 origin-top transform scale-[0.6] lg:scale-[0.7] xl:scale-[0.8] transition-transform`}
                        style={{ fontFamily: 'Poppins, sans-serif', padding: '0px' }}
                    >
                        {/* Header da Prova (Imagem + Dados Sobrepostos) */}
                        <div className="header-img-container relative w-full">
                            {docHeaderType === 'work' ? (
                                <>
                                    <img src="https://i.ibb.co/4ZyLcnq7/CABE-ALHO-APOSTILA.png" alt="Cabeçalho Apostila" className="header-img" />
                                    {/* Overlay Data for Work Header */}
                                    <div className="overlay-text work-student" style={{ top: '38px', left: '345px', width: '420px' }}></div> {/* Nome Aluno */}
                                    <div className="overlay-text work-prof" style={{ top: '72px', left: '345px', width: '420px' }}>{user?.name}</div>
                                    <div className="overlay-text work-disc" style={{ top: '108px', left: '345px', width: '200px' }}>{subject || user?.subject}</div>
                                    <div className="overlay-text work-class" style={{ top: '108px', left: '600px', width: '150px' }}>{gradeLevel}</div>
                                    <div className="overlay-text work-assunto" style={{ top: '143px', left: '345px', width: '420px' }}>{docTitle}</div>
                                    <div className="overlay-text work-date" style={{ top: '155px', left: '160px' }}></div> {/* Data */}
                                </>
                            ) : (
                                <>
                                    <img src="https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png" alt="Cabeçalho Avaliação" className="header-img" />
                                    {/* Overlay Data for Exam Header */}
                                    <div className="overlay-text exam-student" style={{ top: '38px', left: '345px', width: '420px' }}></div>
                                    <div className="overlay-text exam-prof" style={{ top: '72px', left: '345px', width: '420px' }}>{user?.name}</div>
                                    <div className="overlay-text exam-disc" style={{ top: '108px', left: '345px', width: '200px' }}>{subject || user?.subject}</div>
                                    <div className="overlay-text exam-value" style={{ top: '108px', left: '600px', width: '150px' }}></div>
                                    <div className="overlay-text exam-assunto" style={{ top: '143px', left: '345px', width: '420px' }}>{docTitle}</div>
                                    <div className="overlay-text exam-date" style={{ top: '155px', left: '160px' }}></div>
                                </>
                            )}
                        </div>

                        {/* Conteúdo da Prova com Padding */}
                        <div className={`p-[40px] ${docColumns === 2 ? 'columns-2 gap-10' : ''}`}>
                            <h1 className="text-xl font-bold uppercase text-center mb-6 font-sans">{docTitle}</h1>
                            
                            {(() => {
                                let questionCount = 0;
                                return blocks.map((block, idx) => {
                                    if (block.type === 'question') questionCount++;
                                    
                                    return (
                                        <div key={block.id} className="mb-6 break-inside-avoid text-gray-900">
                                            {block.type === 'text' && (
                                                <div className="text-justify font-serif text-sm leading-relaxed whitespace-pre-line">
                                                    {block.content}
                                                </div>
                                            )}
                                            
                                            {block.type === 'image' && block.content && (
                                                <div className="my-2 flex justify-center">
                                                    <img src={block.content} alt="Doc img" className="max-w-full h-auto border border-gray-100" />
                                                </div>
                                            )}

                                            {block.type === 'question' && (
                                                <div className="text-sm font-serif text-justify">
                                                    <div className="mb-2">
                                                        <span className="font-bold font-sans text-sm block mb-1">QUESTÃO {String(questionCount).padStart(2, '0')}</span>
                                                        <span className="leading-relaxed block whitespace-pre-line">{block.content}</span>
                                                    </div>
                                                    {/* Linhas de resposta */}
                                                    {block.lines && block.lines > 0 && (
                                                        <div className="mt-2 space-y-2">
                                                            {Array.from({ length: block.lines }).map((_, i) => (
                                                                <div key={i} className="border-b border-gray-400 h-6 w-full"></div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... Rest of the tabs (new, ai) ... */}
        {activeTab === 'new' && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Nova Solicitação de Impressão</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título da Avaliação</label>
                        <input required type="text" className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                            value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Prova Bimestral 1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Disciplina</label>
                        {user?.subject ? (
                            <input 
                                type="text" 
                                readOnly 
                                value={subject} 
                                className="mt-1 block w-full bg-gray-50 text-gray-500 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm cursor-not-allowed"
                            />
                        ) : (
                            <select className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                value={subject} onChange={e => setSubject(e.target.value)}>
                                <option value="">Selecione...</option>
                                <option value="Matemática">Matemática</option>
                                <option value="Português">Português</option>
                                <option value="História">História</option>
                                <option value="Geografia">Geografia</option>
                                <option value="Ciências">Ciências</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Nível / Turma</label>
                        {user?.classes && user.classes.length > 0 ? (
                            <select 
                                required
                                className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                value={gradeLevel}
                                onChange={e => setGradeLevel(e.target.value)}
                            >
                                {user.classes.map((cls) => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        ) : (
                            <input required type="text" className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data de Aplicação</label>
                        <div className="relative">
                            <input 
                                required 
                                type="date" 
                                className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm [color-scheme:light]"
                                value={dueDate} 
                                onChange={handleDateChange} 
                            />
                        </div>
                        {showDateWarning && <p className="text-xs text-red-500 mt-1 font-bold">Prazo inferior a 48 horas!</p>}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Instruções de Impressão / Cabeçalho</label>
                        <button type="button" onClick={handleSuggestInstructions} className="text-xs text-brand-600 hover:text-brand-800 flex items-center">
                            {instructionLoading && <RefreshCw className="animate-spin w-3 h-3 mr-1" />}
                            Sugerir com IA
                        </button>
                    </div>
                    <textarea rows={3} className="block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Ex: Frente e verso, papel A4, grampear no canto..." />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Arquivo da Prova (PDF/DOCX)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative bg-white">
                        <div className="space-y-1 text-center">
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                                    <span>Upload do arquivo</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileUpload} />
                                </label>
                                <p className="pl-1">ou arraste e solte</p>
                            </div>
                            <p className="text-xs text-gray-500">
                                {fileName ? <span className="text-brand-600 font-bold">{fileName}</span> : "PDF, DOC até 10MB"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="secondary" className="mr-3" onClick={() => setActiveTab('list')}>Cancelar</Button>
                    <Button type="submit" isLoading={isSubmitting}>Enviar para Gráfica</Button>
                </div>
            </form>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <BrainCircuit size={24} />
                    <h2 className="text-xl font-bold">Gerador de Questões AI</h2>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                    Utilize o Google Gemini para criar rascunhos de questões para suas provas. Digite o tópico e deixe a IA trabalhar.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tópico da Matéria</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Ex: Revolução Industrial, Equações de 2º Grau..."
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Nível Escolar</label>
                         {user?.classes && user.classes.length > 0 ? (
                            <select 
                                className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-purple-500 focus:border-purple-500"
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value)}
                            >
                                {user.classes.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                         ) : (
                             <input 
                                type="text" 
                                className="mt-1 block w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-purple-500 focus:border-purple-500"
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value)}
                            />
                         )}
                    </div>
                    <Button 
                        onClick={handleGenerateQuestions} 
                        disabled={!aiTopic || aiLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                        isLoading={aiLoading}
                    >
                        Gerar Questões
                    </Button>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 min-h-[400px]">
                <h3 className="text-lg font-medium text-slate-800 mb-2">Resultado da IA</h3>
                {aiResult ? (
                    <div className="bg-white p-4 rounded border border-slate-200 text-sm whitespace-pre-wrap font-mono h-96 overflow-y-auto shadow-inner">
                        {aiResult}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <BrainCircuit size={48} className="mb-2 opacity-20" />
                        <p>O resultado aparecerá aqui.</p>
                    </div>
                )}
                {aiResult && (
                    <Button 
                        variant="secondary" 
                        className="mt-4 w-full"
                        onClick={() => {navigator.clipboard.writeText(aiResult)}}
                    >
                        Copiar para Área de Transferência
                    </Button>
                )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};