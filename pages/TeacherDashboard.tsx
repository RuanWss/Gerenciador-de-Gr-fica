
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
    getCorrections,
    listenToSystemConfig
} from '../services/firebaseService';
import { evolutionService } from '../services/evolutionService';
import { analyzeAnswerSheet, generateStructuredQuestions, suggestExamInstructions } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType, ClassMaterial, LessonPlan, LessonPlanType, Student, PEIDocument, AnswerKey, StudentCorrection, SystemConfig } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, Trash2, Printer, Columns, Save, Edit3, FileText, 
  BookOpen, CheckCircle, Wand2, Loader2, Sparkles, List, PlusCircle, Layout, FolderUp, 
  Calendar, Layers, X, Search, ClipboardList, Users, Heart, PenTool, ArrowLeft, Info,
  Eye, Type, GripVertical, ChevronRight, Settings2, BookOpenCheck, BookOpenCheck as BookOpenCheckIcon,
  Image as ImageIcon, XCircle, ExternalLink, ScanLine, Target, GraduationCap, MessageCircle
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
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
  
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

  useEffect(() => {
    fetchData();
    const unsub = listenToSystemConfig(setSysConfig);
    return () => unsub();
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
        // ... (restante do fetch data)
    } catch (e) { console.error(e); }
    setIsLoading(false);
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

          // Gatilho: Notificar Gráfica via WhatsApp com config dinâmica
          if (sysConfig?.enableAutomations && sysConfig.whatsappInstance && sysConfig.printShopNumber && sysConfig.whatsappApiKey) {
              const msg = `📢 *NOVO PEDIDO DE IMPRESSÃO*\n\n*Prof:* ${user?.name}\n*Título:* ${examTitle}\n*Turma:* ${examGrade}\n*Quantidade:* ${printQty} cópias\n\n_Por favor, verifique o painel administrativo para baixar o arquivo._`;
              await evolutionService.sendMessage(
                  sysConfig.whatsappBaseUrl || 'https://api.evolution-api.com',
                  sysConfig.whatsappApiKey,
                  sysConfig.whatsappInstance, 
                  sysConfig.printShopNumber, 
                  msg
              );
          }

          alert("Prova enviada para a gráfica e notificação enviada!");
          setCreationMode('none');
          setActiveTab('requests');
      } catch (e) { alert("Erro ao salvar"); }
      finally { setIsSaving(false); }
  };

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
        <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu do Professor</p>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Meus Pedidos</button>
                <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Novo Pedido</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Status de Impressão</h1>
                        <p className="text-gray-400">Acompanhe suas solicitações.</p>
                    </header>
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Título</th>
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
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Pendente' : 'Concluído'}
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
                                <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Novo Pedido</h1>
                                <p className="text-gray-400 text-lg">Selecione o modo de envio:</p>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button onClick={() => setCreationMode('create')} className="bg-[#18181b] border-4 border-white/5 p-12 rounded-[3rem] text-center hover:scale-105 hover:border-blue-600 transition-all group">
                                    <div className="h-24 w-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:animate-bounce"><Wand2 size={48}/></div>
                                    <h3 className="text-2xl font-black text-white uppercase mb-4">Gerar via I.A.</h3>
                                    <p className="text-gray-500">Criar agora com ajuda da inteligência artificial.</p>
                                </button>
                             </div>
                        </div>
                    ) : (
                        <div className="h-[calc(100vh-180px)] flex gap-8">
                            <div className="w-[450px] flex flex-col gap-4">
                                <div className="flex-1 bg-[#18181b] rounded-[2.5rem] border border-white/5 p-8 overflow-y-auto custom-scrollbar shadow-2xl">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-black text-white uppercase flex items-center gap-2"><Layout size={20} className="text-brand-500"/> Geral</h3>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Título do Exame</label>
                                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Turma</label>
                                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                                    <option value="">Selecione...</option>
                                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Quantidade</label>
                                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                            </div>
                                        </div>
                                        <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl text-lg font-black uppercase shadow-2xl">
                                            Confirmar e Notificar Gráfica
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/10 p-12 overflow-y-auto flex justify-center">
                                {renderA4Preview()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
