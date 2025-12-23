
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    getClassMaterials, 
    saveClassMaterial,
    deleteClassMaterial,
    saveLessonPlan,
    getLessonPlans,
    deleteLessonPlan,
    getStudents,
    getPEIByStudentAndTeacher,
    savePEI,
    uploadClassMaterialFile,
    getAnswerKeys,
    saveAnswerKey,
    deleteAnswerKey,
    saveCorrection,
    getCorrections
} from '../services/firebaseService';
import { analyzeAnswerSheet, generateStructuredQuestions, suggestExamInstructions } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType, ClassMaterial, LessonPlan, LessonPlanType, Student, PEIDocument, AnswerKey, StudentCorrection } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, Trash2, Printer, Columns, Save, Edit3, FileText, 
  BookOpen, CheckCircle, Wand2, Loader2, Sparkles, List, PlusCircle, Layout, FolderUp, 
  Calendar, Layers, X, Search, ClipboardList, Users, Heart, PenTool, ArrowLeft, Info,
  Eye, Type, GripVertical, ChevronRight, Settings2, BookOpenCheck, BookOpenCheck as BookOpenCheckIcon,
  Image as ImageIcon, XCircle, ExternalLink, ScanLine, Target, GraduationCap
} from 'lucide-react';
// Import shared constants
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';

interface Question {
    id: string;
    type: 'objective' | 'discursive';
    statement: string;
    image?: string; // Base64 string
    options: string[];
    answer?: number;
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl p-8 ${className}`}>
    {children}
  </div>
);

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'provas' | 'create' | 'materials' | 'plans' | 'pei' | 'omr'>('requests');
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create'>('none');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- EDITOR DE PROVAS ---
  const [editorStep, setEditorStep] = useState<'config' | 'questions' | 'preview'>('config');
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [examSubject, setExamSubject] = useState(user?.subject || '');
  const [examInstructions, setExamInstructions] = useState('');
  const [numColumns, setNumColumns] = useState<1 | 2>(1);
  const [showScoreField, setShowScoreField] = useState(true);
  const [printQty, setPrintQty] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- MATERIAIS ---
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialClassSubject, setMaterialClassSubject] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  // --- PLANEJAMENTOS ---
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [planType, setPlanType] = useState<LessonPlanType>('daily');
  const [planClass, setPlanClass] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planTopic, setPlanTopic] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [planMethodology, setPlanMethodology] = useState('');
  const [planResources, setPlanResources] = useState('');
  const [planEvaluation, setPlanEvaluation] = useState('');
  const [planHomework, setPlanHomework] = useState('');
  const [planPeriod, setPlanPeriod] = useState('1º Bimestre');
  const [planJustification, setPlanJustification] = useState('');
  const [planSemesterContents, setPlanSemesterContents] = useState('');
  const [planCognitiveSkills, setPlanCognitiveSkills] = useState('');
  const [planSocialSkills, setPlanSocialSkills] = useState('');
  const [planStrategies, setPlanStrategies] = useState('');
  const [planActPre, setPlanActPre] = useState('');
  const [planActAuto, setPlanActAuto] = useState('');
  const [planActCoop, setPlanActCoop] = useState('');
  const [planActCompl, setPlanActCompl] = useState('');
  const [planPractices, setPlanPractices] = useState('');
  const [planSpaces, setPlanSpaces] = useState('');
  const [planDidacticResources, setPlanDidacticResources] = useState('');
  const [planEvaluationStrat, setPlanEvaluationStrat] = useState('');
  const [planReferences, setPlanReferences] = useState('');

  // --- PEI ---
  const [aeeStudents, setAeeStudents] = useState<Student[]>([]);
  const [selectedAeeStudent, setSelectedAeeStudent] = useState<Student | null>(null);
  const [peiDoc, setPeiDoc] = useState<PEIDocument | null>(null);

  // --- CORREÇÃO OMR ---
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<AnswerKey | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState<Partial<AnswerKey>>({ subject: user?.subject || '', answers: {} });
  const [numQuestions, setNumQuestions] = useState(10);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentForCorrection, setSelectedStudentForCorrection] = useState('');
  const [currentCorrections, setCurrentCorrections] = useState<StudentCorrection[]>([]);
  const [isCorrecting, setIsCorrecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [allExams, userMaterials, userPlans, studentsData, keysData] = await Promise.all([
            getExams(user.id),
            getClassMaterials(user.id),
            getLessonPlans(user.id),
            getStudents(),
            getAnswerKeys()
        ]);
        setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        setMaterials(userMaterials.sort((a,b) => b.createdAt - a.createdAt));
        setLessonPlans(userPlans.sort((a,b) => b.createdAt - a.createdAt));
        setAllStudents(studentsData);
        setAeeStudents(studentsData.filter(s => s.isAEE));
        setAnswerKeys(keysData.filter(k => k.subject === user.subject));
        
        if (selectedKey) {
            const corrs = await getCorrections(selectedKey.id);
            setCurrentCorrections(corrs);
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  // --- HANDLERS OMR ---
  const handleSaveNewKey = async () => {
      if (!newKeyData.subject || !newKeyData.answers) return;
      setIsSaving(true);
      try {
          await saveAnswerKey({
              id: '',
              examId: 'manual_' + Date.now(),
              subject: newKeyData.subject,
              answers: newKeyData.answers as Record<number, string>
          });
          setShowKeyForm(false);
          fetchData();
      } catch (e) { alert("Erro ao salvar gabarito"); }
      finally { setIsSaving(false); }
  };

  const handleCorrectSheet = async () => {
      if (!selectedKey || !correctionFile || !selectedStudentForCorrection) return;
      setIsCorrecting(true);
      try {
          const student = allStudents.find(s => s.id === selectedStudentForCorrection);
          const detectedAnswers = await analyzeAnswerSheet(correctionFile, Object.keys(selectedKey.answers).length);
          
          let score = 0;
          Object.entries(selectedKey.answers).forEach(([q, ans]) => {
              if (detectedAnswers[Number(q)] === ans) score++;
          });

          await saveCorrection({
              id: '',
              studentId: student!.id,
              studentName: student!.name,
              answerKeyId: selectedKey.id,
              score: (score / Object.keys(selectedKey.answers).length) * 10,
              answers: detectedAnswers
          });
          
          setCorrectionFile(null);
          setSelectedStudentForCorrection('');
          alert("Correção finalizada com sucesso!");
          fetchData();
      } catch (e) { alert("Erro na correção via I.A."); }
      finally { setIsCorrecting(false); }
  };

  // --- HANDLERS EDITOR ---
  const handleAddQuestion = (type: 'objective' | 'discursive') => {
      const newQ: Question = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          statement: '',
          options: type === 'objective' ? ['', '', '', ''] : [],
          answer: 0
      };
      setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (id: string, data: Partial<Question>) => {
      setQuestions(questions.map(q => q.id === id ? { ...q, ...data } : q));
  };

  const handleDeleteQuestion = (id: string) => {
      setQuestions(questions.filter(q => q.id !== id));
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateQuestion(id, { image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const generateWithIA = async () => {
      if (!aiPrompt) return;
      setIsGenerating(true);
      try {
          const generated = await generateStructuredQuestions(aiPrompt, examGrade, 2);
          const newQs = generated.map((g: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              type: 'objective',
              statement: g.statement,
              options: g.options,
              answer: g.answer
          }));
          setQuestions([...questions, ...newQs]);
          setAiPrompt('');
      } catch (e) { alert("Erro na IA"); }
      finally { setIsGenerating(false); }
  };

  const finalizeExam = async () => {
      setIsSaving(true);
      try {
          const examData: ExamRequest = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: examSubject,
              title: examTitle,
              quantity: Number(printQty),
              gradeLevel: examGrade,
              instructions: examInstructions,
              fileName: 'prova_gerada.pdf',
              status: ExamStatus.PENDING,
              createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              materialType: 'exam',
              columns: numColumns,
              headerData: {
                  schoolName: "CENTRO DE ESTUDOS PROF. MANOEL LEITE",
                  showStudentName: true,
                  showScore: showScoreField
              }
          };
          await saveExam(examData);
          alert("Prova enviada para a gráfica!");
          setCreationMode('none');
          setActiveTab('requests');
      } catch (e) { alert("Erro ao salvar"); }
      finally { setIsSaving(false); }
  };

  // --- HANDLERS MATERIAIS ---
  const handleUploadMaterial = async () => {
    if (!user || !materialFile || !materialClass || !materialTitle || !materialClassSubject) return alert("Preencha todos os campos.");
    setIsSaving(true);
    try {
        const fileUrl = await uploadClassMaterialFile(materialFile, materialClass);
        await saveClassMaterial({
            id: '',
            teacherId: user.id,
            teacherName: user.name,
            className: materialClass,
            title: materialTitle,
            subject: materialClassSubject,
            fileUrl,
            fileName: materialFile.name,
            fileType: materialFile.type,
            createdAt: Date.now()
        });
        alert("Material enviado para a turma!");
        setMaterialTitle(''); setMaterialFile(null);
        fetchData();
    } catch (e) { alert("Erro no upload."); }
    finally { setIsSaving(false); }
  };

  // --- HANDLERS PLANEJAMENTO ---
  const handleSavePlan = async () => {
    if (!user || !planClass) return alert("Selecione a turma.");
    setIsSaving(true);
    try {
        const planData: LessonPlan = {
            id: '',
            teacherId: user.id,
            teacherName: user.name,
            type: planType,
            className: planClass,
            subject: user.subject || 'Geral',
            createdAt: Date.now(),
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
        await saveLessonPlan(planData);
        alert("Planejamento enviado com sucesso!");
        setActiveTab('plans');
        setPlanTopic(''); setPlanContent(''); setPlanJustification('');
        fetchData();
    } catch (e) { alert("Erro ao salvar planejamento."); }
    finally { setIsSaving(false); }
  };

  const handleDeletePlan = async (id: string) => {
      if (confirm("Deseja excluir este planejamento?")) {
          await deleteLessonPlan(id);
          fetchData();
      }
  };

  // --- HANDLERS PEI ---
  const handleEditPEI = async (student: Student) => {
    if (!user) return;
    setSelectedAeeStudent(student);
    const existingPei = await getPEIByStudentAndTeacher(student.id, user.id);
    if (existingPei) {
        setPeiDoc({ ...existingPei, period: existingPei.period || '1º Bimestre' });
    } else {
        setPeiDoc({
            id: '', studentId: student.id, studentName: student.name,
            teacherId: user.id, teacherName: user.name, subject: user.subject || 'Geral',
            period: '1º Bimestre',
            essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: '', updatedAt: Date.now()
        });
    }
  };

  // --- RENDER HELPERS ---
  const renderA4Preview = () => (
      <div className="bg-white shadow-2xl p-12 w-full max-w-[210mm] min-h-[297mm] mx-auto text-black font-serif border border-gray-200 print:shadow-none animate-in fade-in duration-500 origin-top">
          <div className="border-2 border-black p-4 mb-6 relative">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 items-center">
                      <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-14 grayscale brightness-0" />
                      <div className="border-l-2 border-black pl-4">
                          <h2 className="text-lg font-black leading-tight uppercase tracking-tight">C.E. Prof. Manoel Leite</h2>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Ensino de Qualidade • 10 Anos</p>
                      </div>
                  </div>
                  {showScoreField && (
                      <div className="border-2 border-black px-4 py-2 text-center">
                          <p className="text-[8px] font-black uppercase">Nota</p>
                          <div className="h-6 w-12 border-b border-black"></div>
                      </div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase mb-2">
                  <div className="border-b border-black pb-1">Disciplina: {examSubject}</div>
                  <div className="border-b border-black pb-1">Professor: {user?.name}</div>
                  <div className="border-b border-black pb-1">Turma: {examGrade}</div>
                  <div className="border-b border-black pb-1">Data: ____/____/____</div>
              </div>
              <div className="border-b border-black pb-1 text-xs font-bold uppercase">Aluno: __________________________________________________________________________</div>
          </div>

          <h1 className="text-center text-xl font-black uppercase mb-4 underline decoration-double">{examTitle}</h1>
          {examInstructions && <p className="text-[11px] italic mb-6 border-l-4 border-gray-300 pl-4">{examInstructions}</p>}

          <div className={numColumns === 2 ? "columns-2 gap-8 divide-x divide-gray-200" : ""}>
              {questions.map((q, idx) => (
                  <div key={q.id} className="mb-8 break-inside-avoid">
                      <h4 className="font-bold text-sm mb-2">{idx + 1}. {q.statement || "Questão sem enunciado"}</h4>
                      {q.image && (
                        <div className="my-3 flex justify-center">
                          <img src={q.image} className="max-w-full h-auto max-h-[150px] border border-gray-100 rounded" alt={`Imagem da questão ${idx + 1}`} />
                        </div>
                      )}
                      {q.type === 'objective' ? (
                          <ul className="space-y-1 pl-4">
                              {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} className="text-xs flex gap-2">
                                      <span className="font-bold">{String.fromCharCode(65 + oIdx)})</span>
                                      <span>{opt || "..."}</span>
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          <div className="space-y-2 mt-4 opacity-30">
                               {[1, 2, 3, 4].map(l => <div key={l} className="border-b border-gray-400 h-6"></div>)}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        {/* SIDEBAR */}
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu do Professor</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Meus Pedidos</button>
                <button onClick={() => setActiveTab('provas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'provas' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><FileText size={18} /> Galeria de Arquivos</button>
                <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Novo Pedido</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><FolderUp size={18} /> Materiais p/ Alunos</button>
                <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><BookOpenCheckIcon size={18} /> Planejamentos</button>
                <button onClick={() => setActiveTab('omr')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'omr' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><ScanLine size={18} /> Corretor I.A.</button>
                <button onClick={() => setActiveTab('pei')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'pei' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><Heart size={18} /> Aba PEI</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* ABA: MEUS PEDIDOS */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Status de Impressão</h1>
                        <p className="text-gray-400">Acompanhe o andamento das suas solicitações na gráfica.</p>
                    </header>
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Título da Atividade</th>
                                    <th className="p-6">Turma</th>
                                    <th className="p-6">Quantidade</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-6 text-sm text-gray-500 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 font-bold text-gray-800">{e.title}</td>
                                        <td className="p-6"><span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">{e.gradeLevel}</span></td>
                                        <td className="p-6 font-mono font-bold text-red-600">{e.quantity}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : e.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Concluído'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA: GALERIA DE ARQUIVOS */}
            {activeTab === 'provas' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Galeria de Atividades</h1>
                        <p className="text-gray-400">Acesse rapidamente os arquivos PDF das suas atividades.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(e => (
                            <Card key={e.id} className="group hover:border-brand-500 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                                        <FileText size={24}/>
                                    </div>
                                    <a href={e.fileUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                                        <ExternalLink size={20}/>
                                    </a>
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-1 truncate" title={e.title}>{e.title}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase mb-4">{e.gradeLevel} • {new Date(e.createdAt).toLocaleDateString()}</p>
                                <Button variant="outline" className="w-full text-xs font-bold" onClick={() => window.open(e.fileUrl, '_blank')}>Visualizar PDF</Button>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ABA: CORRETOR OMR */}
            {activeTab === 'omr' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <ScanLine className="text-brand-500" /> Corretor Automático I.A.
                            </h1>
                            <p className="text-gray-400">Criação de gabaritos e correção via visão computacional.</p>
                        </div>
                        <Button onClick={() => { 
                            setNewKeyData({ subject: user?.subject || '', answers: {} });
                            setNumQuestions(10);
                            setShowKeyForm(true); 
                        }}>
                            <Plus size={18} className="mr-2"/> Novo Gabarito
                        </Button>
                    </header>

                    {showKeyForm ? (
                        <Card className="animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                                <h3 className="text-xl font-black text-gray-800 uppercase">Configurar Gabarito Oficial</h3>
                                <button onClick={() => setShowKeyForm(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Disciplina</label>
                                    <select className="w-full border-2 border-gray-100 rounded-xl p-4 font-bold outline-none" value={newKeyData.subject} onChange={e => setNewKeyData({...newKeyData, subject: e.target.value})}>
                                        {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nº de Questões</label>
                                    <input type="number" className="w-full border-2 border-gray-100 rounded-xl p-4 font-bold outline-none" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} min="1" max="100" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                {Array.from({ length: numQuestions }).map((_, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <span className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Q. {i+1}</span>
                                        <div className="flex gap-1 justify-between">
                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => {
                                                        const current = {...newKeyData.answers};
                                                        current[i+1] = opt;
                                                        setNewKeyData({...newKeyData, answers: current});
                                                    }}
                                                    className={`w-7 h-7 rounded-full text-[10px] font-black transition-all ${newKeyData.answers?.[i+1] === opt ? 'bg-brand-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowKeyForm(false)}>Cancelar</Button>
                                <Button onClick={handleSaveNewKey} isLoading={isSaving}><Save size={18} className="mr-2"/> Salvar Gabarito</Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2"><Target size={20} className="text-brand-500"/> Gabaritos Ativos</h3>
                                <div className="space-y-3">
                                    {answerKeys.map(key => (
                                        <button 
                                            key={key.id}
                                            onClick={() => setSelectedKey(key)}
                                            className={`w-full p-6 rounded-3xl border-2 text-left transition-all ${selectedKey?.id === key.id ? 'bg-white border-brand-500 text-gray-800' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'}`}
                                        >
                                            <h4 className="font-black text-sm uppercase leading-tight">{key.subject}</h4>
                                            <p className="text-[10px] font-bold opacity-60 mt-1">{Object.keys(key.answers).length} Questões Objetivas</p>
                                        </button>
                                    ))}
                                    {answerKeys.length === 0 && <p className="text-gray-600 italic text-sm">Nenhum gabarito cadastrado.</p>}
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                {selectedKey ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <Card>
                                            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                                                <h3 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
                                                    <ScanLine size={24} className="text-brand-600"/> Corrigir Prova
                                                </h3>
                                                <button onClick={async () => { if(confirm("Remover gabarito?")) { await deleteAnswerKey(selectedKey.id); setSelectedKey(null); fetchData(); } }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Aluno Destino</label>
                                                    <select className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold" value={selectedStudentForCorrection} onChange={e => setSelectedStudentForCorrection(e.target.value)}>
                                                        <option value="">Selecione o Aluno...</option>
                                                        {allStudents.sort((a,b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Foto do Cartão-Resposta</label>
                                                    <div className="relative">
                                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => e.target.files && setCorrectionFile(e.target.files[0])} />
                                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-xs font-bold text-gray-400 bg-gray-50">
                                                            {correctionFile ? correctionFile.name : 'Clique para selecionar foto'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button className="w-full h-14 rounded-2xl text-lg font-black uppercase" isLoading={isCorrecting} onClick={handleCorrectSheet} disabled={!correctionFile || !selectedStudentForCorrection}>
                                                Iniciar Leitura I.A.
                                            </Button>
                                        </Card>

                                        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
                                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                                <h3 className="font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2"><GraduationCap size={20} className="text-brand-600"/> Resultados da Turma</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                                        <tr>
                                                            <th className="p-6">Nome do Aluno</th>
                                                            <th className="p-6 text-center">Nota (0-10)</th>
                                                            <th className="p-6 text-right">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {currentCorrections.map(c => (
                                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="p-6 font-bold text-gray-800">{c.studentName}</td>
                                                                <td className="p-6 text-center">
                                                                    <span className={`text-lg font-black ${c.score >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {c.score.toFixed(1)}
                                                                    </span>
                                                                </td>
                                                                <td className="p-6 text-right">
                                                                    <button className="text-gray-400 hover:text-brand-600"><Eye size={18}/></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {currentCorrections.length === 0 && (
                                                            <tr><td colSpan={3} className="p-12 text-center text-gray-400 italic">Nenhuma correção realizada para este gabarito.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center bg-white/5 border-4 border-dashed border-white/5 rounded-[3rem] p-20 text-center opacity-40">
                                        <ScanLine size={100} className="text-gray-500 mb-6" />
                                        <h3 className="text-2xl font-black text-gray-500 uppercase">Selecione ou Crie um Gabarito</h3>
                                        <p className="text-gray-600 mt-2 max-w-xs">Você precisa de um gabarito de referência para iniciar a correção automática das provas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: NOVO PEDIDO */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {creationMode === 'none' ? (
                        <div className="max-w-4xl mx-auto py-12">
                             <div className="text-center mb-12">
                                <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Novo Pedido de Impressão</h1>
                                <p className="text-gray-400 text-lg">Como você deseja enviar o material para a gráfica?</p>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button onClick={() => setCreationMode('upload')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-brand-600 transition-all group">
                                    <div className="h-24 w-24 bg-brand-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><UploadCloud size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Upload de PDF</h3>
                                    <p className="text-gray-500">Enviar arquivo pronto do computador.</p>
                                </button>
                                <button onClick={() => setCreationMode('create')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><Wand2 size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Digitar / IA</h3>
                                    <p className="text-gray-500">Criar e formatar agora com ajuda da IA.</p>
                                </button>
                             </div>
                        </div>
                    ) : creationMode === 'upload' ? (
                        <div className="max-w-xl mx-auto animate-in zoom-in-95">
                             <div className="bg-white p-10 rounded-[3rem] shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-gray-800">Enviar Arquivo</h3>
                                    <button onClick={() => setCreationMode('none')} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                                </div>
                                <div className="space-y-6">
                                    <input className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-brand-600" placeholder="Título da Atividade" />
                                    <select className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none focus:border-brand-600">
                                        <option>Selecione a Turma...</option>
                                        {CLASSES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <div className="border-4 border-dashed border-gray-100 rounded-[2.5rem] p-12 text-center text-gray-400 font-bold uppercase text-xs tracking-widest hover:bg-gray-50 cursor-pointer">Arraste seu PDF aqui</div>
                                    <Button className="w-full h-16 rounded-[1.5rem] text-lg font-black uppercase tracking-widest">Solicitar Impressão</Button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="h-[calc(100vh-180px)] flex gap-8">
                            <div className="w-[450px] flex flex-col gap-4">
                                <div className="bg-[#18181b] rounded-[2rem] border border-white/5 p-6 flex items-center justify-between shadow-xl">
                                    <div className="flex bg-white/5 p-1 rounded-xl w-full">
                                        <button onClick={() => setEditorStep('config')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editorStep === 'config' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-white'}`}><Settings2 size={14}/> Config</button>
                                        <button onClick={() => setEditorStep('questions')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editorStep === 'questions' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-white'}`}><Type size={14}/> Questões</button>
                                        <button onClick={() => setEditorStep('preview')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editorStep === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-white'}`}><Eye size={14}/> Preview</button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-[#18181b] rounded-[2.5rem] border border-white/5 p-8 overflow-y-auto custom-scrollbar shadow-2xl">
                                    {editorStep === 'config' && (
                                        <div className="space-y-6 animate-in slide-in-from-left-4">
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><Layout size={20} className="text-brand-500"/> Geral</h3>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Título do Exame</label>
                                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Prova de Matemática - 1º Tri" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Turma</label>
                                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                                        <option value="">Selecione...</option>
                                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Disciplina</label>
                                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand-600" value={examSubject} onChange={e => setExamSubject(e.target.value)}>
                                                        {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Instruções Cabeçalho</label>
                                                <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-brand-600" value={examInstructions} onChange={e => setExamInstructions(e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={() => setNumColumns(1)} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase flex flex-col items-center gap-2 transition-all ${numColumns === 1 ? 'border-brand-600 bg-brand-600/10 text-white' : 'border-white/5 text-gray-500'}`}><Layout size={24}/> 1 Coluna</button>
                                                <button onClick={() => setNumColumns(2)} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase flex flex-col items-center gap-2 transition-all ${numColumns === 2 ? 'border-brand-600 bg-brand-600/10 text-white' : 'border-white/5 text-gray-500'}`}><Columns size={24}/> 2 Colunas</button>
                                            </div>
                                        </div>
                                    )}

                                    {editorStep === 'questions' && (
                                        <div className="space-y-6 animate-in slide-in-from-left-4">
                                            <div className="bg-blue-600/10 border-2 border-blue-600/20 p-6 rounded-[2rem] mb-8">
                                                <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={16}/> Gerar com IA</h4>
                                                <textarea 
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 mb-4" 
                                                    placeholder="Tópico para gerar questões (Ex: Independência do Brasil)"
                                                    value={aiPrompt}
                                                    onChange={e => setAiPrompt(e.target.value)}
                                                />
                                                <Button onClick={generateWithIA} isLoading={isGenerating} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-xs font-black uppercase tracking-widest">Adicionar 2 Questões</Button>
                                            </div>

                                            <div className="space-y-4">
                                                {questions.map((q, idx) => (
                                                    <div key={q.id} className="bg-black/20 border border-white/5 p-5 rounded-3xl group">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="flex items-center gap-3">
                                                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Questão {idx + 1} • {q.type === 'objective' ? 'Múltipla' : 'Aberta'}</span>
                                                              <label className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1" title="Adicionar Imagem">
                                                                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files && handleImageUpload(q.id, e.target.files[0])}/>
                                                                <ImageIcon size={14}/>
                                                                <span className="text-[8px] font-black uppercase">Imagem</span>
                                                              </label>
                                                            </div>
                                                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-gray-600 hover:text-brand-500 transition-colors"><Trash2 size={16}/></button>
                                                        </div>
                                                        {q.image && (
                                                          <div className="mb-4 relative group/img w-fit mx-auto">
                                                            <img src={q.image} className="max-h-32 rounded-xl border border-white/10" alt="Questão" />
                                                            <button 
                                                              onClick={() => handleUpdateQuestion(q.id, { image: undefined })}
                                                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                                            >
                                                              <XCircle size={16}/>
                                                            </button>
                                                          </div>
                                                        )}
                                                        <textarea 
                                                            className="w-full bg-transparent border-none p-0 text-white font-bold text-sm outline-none focus:ring-0 placeholder:text-gray-700 mb-4"
                                                            placeholder="Digite o enunciado aqui..."
                                                            value={q.statement}
                                                            onChange={e => handleUpdateQuestion(q.id, { statement: e.target.value })}
                                                        />
                                                        {q.type === 'objective' && (
                                                            <div className="space-y-2">
                                                                {q.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-gray-600">{String.fromCharCode(65 + oIdx)})</span>
                                                                        <input 
                                                                            className="flex-1 bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-white/20"
                                                                            value={opt}
                                                                            onChange={e => {
                                                                                const newOpts = [...q.options];
                                                                                newOpts[oIdx] = e.target.value;
                                                                                handleUpdateQuestion(q.id, { options: newOpts });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 sticky bottom-0 bg-[#18181b] pt-4">
                                                <button onClick={() => handleAddQuestion('objective')} className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase hover:bg-white/10 transition-all">+ Múltipla Escolha</button>
                                                <button onClick={() => handleAddQuestion('discursive')} className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase hover:bg-white/10 transition-all">+ Discursiva</button>
                                            </div>
                                        </div>
                                    )}

                                    {editorStep === 'preview' && (
                                        <div className="space-y-6 animate-in slide-in-from-left-4">
                                            <div className="bg-brand-600/10 border border-brand-600/20 p-6 rounded-[2.5rem]">
                                                <h3 className="text-white font-black text-lg mb-4">Quase pronto!</h3>
                                                <div className="space-y-4 mb-8">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Quantidade de Cópias</label>
                                                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" checked={showScoreField} onChange={e => setShowScoreField(e.target.checked)} className="w-5 h-5 rounded border-white/10 bg-black/40 text-brand-600" />
                                                        <span className="text-sm font-bold text-gray-300">Mostrar campo de nota</span>
                                                    </div>
                                                </div>
                                                <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl">Confirmar e Enviar</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/10 p-12 overflow-y-auto custom-scrollbar flex justify-center shadow-inner">
                                {renderA4Preview()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ABA: MATERIAIS PARA ALUNOS */}
            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Arquivos da Turma</h1>
                        <p className="text-gray-400">Disponibilize PDFs para os alunos acessarem na sala de aula.</p>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <Card className="lg:col-span-1 h-fit">
                             <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs mb-6 border-b pb-4">Enviar Novo Arquivo</h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Título do Material</label>
                                    <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="Ex: Lista de Exercícios 01" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Disciplina</label>
                                    <select className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none" value={materialClassSubject} onChange={e => setMaterialClassSubject(e.target.value)}>
                                        <option value="">Selecione a Disciplina...</option>
                                        {[...EFAF_SUBJECTS, ...EM_SUBJECTS].sort().map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Turma Destino</label>
                                    <select className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none" value={materialClass} onChange={e => setMaterialClass(e.target.value)}>
                                        <option value="">Selecione a Turma...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 text-center relative hover:bg-gray-50 transition-colors">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setMaterialFile(e.target.files[0])} />
                                    <p className="text-xs font-bold text-gray-400">{materialFile ? materialFile.name : 'Selecionar Arquivo'}</p>
                                </div>
                                <Button onClick={handleUploadMaterial} isLoading={isSaving} className="w-full py-4 rounded-xl">Publicar Material</Button>
                             </div>
                         </Card>
                         <div className="lg:col-span-2 space-y-4">
                            <h3 className="font-black text-white uppercase tracking-widest text-xs mb-2">Arquivos Publicados Recentemente</h3>
                            {materials.map(m => (
                                <div key={m.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center"><Layers size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-100 text-sm">{m.title}</h4>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">{m.className} • {m.subject}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteClassMaterial(m.id)} className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            )}

            {/* ABA: PLANEJAMENTO */}
            {activeTab === 'plans' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Planejamento Pedagógico</h1>
                            <p className="text-gray-400">Crie planos detalhados para acompanhamento da coordenação.</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                            <button onClick={() => setPlanType('daily')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${planType === 'daily' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Plano Diário</button>
                            <button onClick={() => setPlanType('semester')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${planType === 'semester' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Plano Bimestral</button>
                        </div>
                    </header>

                    <Card className="p-8 mb-12">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="h-10 w-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                                <ClipboardList size={20}/>
                            </div>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo Plano {planType === 'daily' ? 'Diário' : 'Bimestral'}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Turma Alvo</label>
                                <select className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 focus:border-red-500 outline-none" value={planClass} onChange={e => setPlanClass(e.target.value)}>
                                    <option value="">Selecione a Turma...</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {planType === 'daily' ? (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Data da Aula</label>
                                    <input type="date" className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 focus:border-red-500 outline-none" value={planDate} onChange={e => setPlanDate(e.target.value)} />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Bimestre</label>
                                    <select className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 focus:border-red-500 outline-none" value={planPeriod} onChange={e => setPlanPeriod(e.target.value)}>
                                        <option value="1º Bimestre">1º Bimestre</option>
                                        <option value="2º Bimestre">2º Bimestre</option>
                                        <option value="3º Bimestre">3º Bimestre</option>
                                        <option value="4º Bimestre">4º Bimestre</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Disciplina</label>
                                <input disabled className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-400" value={user?.subject || 'Não definida'} />
                            </div>
                        </div>

                        {planType === 'daily' ? (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Tema / Tópico da Aula</label>
                                    <input className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm font-bold text-gray-700 focus:border-red-500 outline-none" value={planTopic} onChange={e => setPlanTopic(e.target.value)} placeholder="Ex: Revolução Industrial e seus Impactos" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Conteúdo Detalhado</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planContent} onChange={e => setPlanContent(e.target.value)} placeholder="O que será abordado teoricamente..." />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Metodologia / Procedimentos</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planMethodology} onChange={e => setPlanMethodology(e.target.value)} placeholder="Como a aula será conduzida..." />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Recursos e Materiais</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planResources} onChange={e => setPlanResources(e.target.value)} placeholder="Data show, apostila, mapa..." />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Avaliação da Aula</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planEvaluation} onChange={e => setPlanEvaluation(e.target.value)} placeholder="Como verificará a aprendizagem..." />
                                    </div>
                                </div>
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <label className="block text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest">Tarefa de Casa / Próximos Passos</label>
                                    <textarea rows={2} className="w-full bg-white border-2 border-red-100 rounded-xl p-4 text-sm font-bold text-gray-700 focus:border-red-500 outline-none" value={planHomework} onChange={e => setPlanHomework(e.target.value)} placeholder="Atividades que os alunos levarão para casa..." />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Justificativa do Bimestre</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planJustification} onChange={e => setPlanJustification(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Conteúdos Programáticos</label>
                                        <textarea rows={4} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planSemesterContents} onChange={e => setPlanSemesterContents(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Habilidades Cognitivas</label>
                                        <textarea rows={3} className="w-full bg-white border-2 border-blue-100 rounded-xl p-4 text-sm text-gray-700 focus:border-blue-500 outline-none" value={planCognitiveSkills} onChange={e => setPlanCognitiveSkills(e.target.value)} />
                                    </div>
                                    <div className="bg-pink-50/50 p-6 rounded-2xl border border-pink-100">
                                        <label className="block text-[10px] font-black text-pink-600 uppercase mb-2 tracking-widest">Habilidades Socioemocionais</label>
                                        <textarea rows={3} className="w-full bg-white border-2 border-pink-100 rounded-xl p-4 text-sm text-gray-700 focus:border-pink-500 outline-none" value={planSocialSkills} onChange={e => setPlanSocialSkills(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Estratégias Didáticas</label>
                                    <textarea rows={3} className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm text-gray-700 focus:border-red-500 outline-none" value={planStrategies} onChange={e => setPlanStrategies(e.target.value)} />
                                </div>
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Layout size={16}/> Quadro de Atividades Sugeridas
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Prévias</label><textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700" value={planActPre} onChange={e => setPlanActPre(e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Autodidáticas</label><textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700" value={planActAuto} onChange={e => setPlanActAuto(e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Cooperativas</label><textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700" value={planActCoop} onChange={e => setPlanActCoop(e.target.value)} /></div>
                                        <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Complementares</label><textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700" value={planActCompl} onChange={e => setPlanActCompl(e.target.value)} /></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Práticas Educativas</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3" value={planPractices} onChange={e => setPlanPractices(e.target.value)} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Espaços</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3" value={planSpaces} onChange={e => setPlanSpaces(e.target.value)} /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Recursos Didáticos</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3" value={planDidacticResources} onChange={e => setPlanDidacticResources(e.target.value)} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Estratégias Avaliação</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3" value={planEvaluationStrat} onChange={e => setPlanEvaluationStrat(e.target.value)} /></div>
                                </div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Referências</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3" value={planReferences} onChange={e => setPlanReferences(e.target.value)} /></div>
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-10 border-t border-gray-100 mt-8">
                            <Button variant="outline" onClick={() => setActiveTab('requests')}>Cancelar</Button>
                            <Button onClick={handleSavePlan} isLoading={isSaving} className="px-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-xl shadow-red-900/20">
                                <Save size={20} className="mr-2"/> Publicar Planejamento
                            </Button>
                        </div>
                    </Card>

                    <div className="mt-12 space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <BookOpenCheckIcon size={24}/> Planejamentos Recentes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lessonPlans.map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] group hover:bg-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.type === 'daily' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'}`}>
                                            {p.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                        <button onClick={() => handleDeletePlan(p.id)} className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </div>
                                    <h4 className="font-bold text-white text-lg mb-1">{p.type === 'daily' ? p.topic : p.period}</h4>
                                    <p className="text-sm text-gray-500 font-bold mb-4">{p.className} • {p.subject}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                                        <Calendar size={12}/> {p.type === 'daily' ? p.date : new Date(p.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ABA: ABA PEI */}
            {activeTab === 'pei' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white flex items-center gap-3"><Heart className="text-red-500"/> Planejamento PEI</h1>
                        <p className="text-gray-400">Plano Educacional Individualizado para alunos do AEE</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {aeeStudents.map(student => (
                            <button 
                                key={student.id}
                                onClick={() => handleEditPEI(student)}
                                className="bg-white p-5 rounded-3xl shadow-lg border border-gray-100 text-left hover:scale-[1.02] transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                        <Users size={24}/>
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-800 truncate">{student.name}</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.className}</p>
                                    </div>
                                </div>
                                <div className="bg-red-50 p-2 rounded-lg mb-4">
                                    <span className="text-[9px] font-black text-red-600 uppercase block tracking-tighter">Diagnóstico</span>
                                    <p className="text-xs font-bold text-red-900 truncate">{student.disorder}</p>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-blue-600">
                                    <span>Preencher PEI</span>
                                    <ArrowLeft className="rotate-180" size={14}/>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedAeeStudent && peiDoc && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-3">
                                            <PenTool size={24} className="text-red-600"/> Elaboração de PEI
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-sm text-gray-500 font-bold">{selectedAeeStudent.name} • {peiDoc.subject}</p>
                                            <div className="h-4 w-px bg-gray-300"></div>
                                            <select 
                                                className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs font-bold text-red-600 outline-none"
                                                value={peiDoc.period}
                                                onChange={e => setPeiDoc({...peiDoc, period: e.target.value})}
                                            >
                                                <option value="1º Bimestre">1º Bimestre</option>
                                                <option value="2º Bimestre">2º Bimestre</option>
                                                <option value="3º Bimestre">3º Bimestre</option>
                                                <option value="4º Bimestre">4º Bimestre</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedAeeStudent(null)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Competências Essenciais</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px]" value={peiDoc.essentialCompetencies} onChange={e => setPeiDoc({...peiDoc, essentialCompetencies: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Conteúdos Selecionados</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px]" value={peiDoc.selectedContents} onChange={e => setPeiDoc({...peiDoc, selectedContents: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Recursos Didáticos</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px]" value={peiDoc.didacticResources} onChange={e => setPeiDoc({...peiDoc, didacticResources: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Avaliação</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px]" value={peiDoc.evaluation} onChange={e => setPeiDoc({...peiDoc, evaluation: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
                                    <Button variant="outline" onClick={() => setSelectedAeeStudent(null)}>Cancelar</Button>
                                    <Button onClick={async () => {
                                        setIsSaving(true);
                                        await savePEI({...peiDoc, updatedAt: Date.now()});
                                        setIsSaving(false);
                                        setSelectedAeeStudent(null);
                                        alert("PEI Salvo!");
                                    }} isLoading={isSaving} className="px-10 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20">Salvar PEI</Button>
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
