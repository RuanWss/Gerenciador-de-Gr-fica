import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExams, saveExam } from '../services/firebaseService'; // Changed import
import { generateExamQuestions, suggestExamInstructions } from '../services/geminiService';
import { ExamRequest, ExamStatus } from '../types';
import { Button } from '../components/Button';
import { Plus, FileText, BrainCircuit, RefreshCw, UploadCloud, AlertTriangle } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'ai'>('list');
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [fileName, setFileName] = useState('');

  // UI State
  const [showDateWarning, setShowDateWarning] = useState(false);

  // AI State
  const [aiTopic, setAiTopic] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [instructionLoading, setInstructionLoading] = useState(false);

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
      status: ExamStatus.PENDING,
      createdAt: Date.now(),
      dueDate
    };

    try {
        await saveExam(newExam);
        setActiveTab('list');
        setTitle('');
        setFileName('');
        setDueDate('');
        setShowDateWarning(false);
    } catch (error) {
        alert('Erro ao enviar solicitação.');
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

  return (
    <div className="space-y-6 relative">
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