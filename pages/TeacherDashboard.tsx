
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
    updateLessonPlan,
    deleteLessonPlan,
    getLessonPlans,
    ensureUserProfile,
    deleteExamRequest,
    getStudents,
    getPEIByStudentAndTeacher,
    savePEI
} from '../services/firebaseService';
import { digitizeMaterial, suggestExamInstructions } from '../services/geminiService';
import { ExamRequest, ExamStatus, MaterialType, ClassMaterial, LessonPlan, LessonPlanType, Student, PEIDocument } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, Trash2, Printer, Columns, ZoomIn, ZoomOut, Save, Edit3, Archive, Lock, FileText, 
  BookOpen, CheckCircle, AlertCircle, Wand2, Loader2, Sparkles, List, PlusCircle, Layout, FolderUp, 
  Folder, Download, FolderOpen, BookOpenCheck, Calendar, Layers, ArrowLeft, FileUp, PenTool, ExternalLink, 
  X, Search, ClipboardList, Users, Heart, ClipboardCheck, Info
} from 'lucide-react';

const CLASSES = ["6º ANO EFAF", "7º ANO EFAF", "8º ANO EFAF", "9º ANO EFAF", "1ª SÉRIE EM", "2ª SÉRIE EM", "3ª SÉRIE EM"];
const EFAF_SUBJECTS = ["LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", "MATEMÁTICA", "MATEMÁTICA II", "BIOLOGIA", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", "REDAÇÃO", "FILOSOFIA", "QUÍMICA", "PROJETO DE VIDA", "EDUCAÇÃO FINANCEIRA", "PENSAMENTO COMPUTACIONAL", "FÍSICA", "DINÂMICAS DE LEITURA"];
const EM_SUBJECTS = ["LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", "SOCIOLOGIA", "FILOSOFIA", "BIOLOGIA", "FÍSICA", "QUÍMICA", "MATEMÁTICA", "LITERATURA", "PRODUÇÃO TEXTUAL", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", "MATEMÁTICA II", "BIOLOGIA II", "QUÍMICA II", "ELETIVA 03: EMPREENDEDORISMO CRIATIVO", "ELETIVA 04: PROJETO DE VIDA", "ITINERÁRIO FORMATIVO"];

const Card: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
        {children}
    </div>
);

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'provas' | 'create' | 'materials' | 'plans' | 'pei'>('requests');
  const [creationMode, setCreationMode] = useState<'none' | 'upload' | 'create'>('none');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // States para Formulários Provas
  const [docTitle, setDocTitle] = useState('');
  const [docSubtitle, setDocSubtitle] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('exam');
  const [selectedClassForExam, setSelectedClassForExam] = useState<string>(''); 
  const [printQuantity, setPrintQuantity] = useState(30);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Materiais
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialClassSubject, setMaterialClassSubject] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  
  // Planejamentos - Estados Completos
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
  // Campos Bimestrais
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

  // PEI State
  const [aeeStudents, setAeeStudents] = useState<Student[]>([]);
  const [selectedAeeStudent, setSelectedAeeStudent] = useState<Student | null>(null);
  const [peiDoc, setPeiDoc] = useState<PEIDocument | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const [allExams, userMaterials, userPlans, allStudents] = await Promise.all([
            getExams(user.id),
            getClassMaterials(user.id),
            getLessonPlans(user.id),
            getStudents()
        ]);
        setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        setMaterials(userMaterials.sort((a,b) => b.createdAt - a.createdAt));
        setLessonPlans(userPlans.sort((a,b) => b.createdAt - a.createdAt));
        setAeeStudents(allStudents.filter(s => s.isAEE));
    } catch (e) {
        console.error(e);
    }
    setIsLoading(false);
  };

  const handleSaveExam = async () => {
    if (!user || !uploadedFile || !selectedClassForExam || !docTitle) return alert("Preencha todos os campos e anexe o arquivo.");
    setIsSaving(true);
    try {
        const fileUrl = await uploadExamFile(uploadedFile);
        const examData: ExamRequest = {
            id: '',
            teacherId: user.id,
            teacherName: user.name,
            subject: user.subject || 'Geral',
            title: docTitle,
            quantity: Number(printQuantity),
            gradeLevel: selectedClassForExam,
            instructions: docSubtitle,
            fileName: uploadedFile.name,
            fileUrl: fileUrl,
            status: ExamStatus.PENDING,
            createdAt: Date.now(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            materialType: materialType
        };
        await saveExam(examData);
        alert("Solicitação enviada com sucesso!");
        setActiveTab('requests');
    } catch (error) {
        alert("Erro ao salvar solicitação.");
    } finally {
        setIsSaving(false);
    }
  };

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
    } catch (e) {
        alert("Erro no upload.");
    } finally {
        setIsSaving(false);
    }
  };

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
            // Campos comuns e específicos baseados no tipo
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
        // Resetar campos básicos
        setPlanTopic(''); setPlanContent(''); setPlanJustification('');
    } catch (e) {
        alert("Erro ao salvar planejamento.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditPEI = async (student: Student) => {
    if (!user) return;
    setSelectedAeeStudent(student);
    const existingPei = await getPEIByStudentAndTeacher(student.id, user.id);
    if (existingPei) {
        setPeiDoc(existingPei);
    } else {
        setPeiDoc({
            id: '', studentId: student.id, studentName: student.name,
            teacherId: user.id, teacherName: user.name, subject: user.subject || 'Geral',
            essentialCompetencies: '', selectedContents: '', didacticResources: '', evaluation: '', updatedAt: Date.now()
        });
    }
  };

  const renderSidebar = () => (
    <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
        <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu do Professor</p>
            <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'requests' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><List size={18} /> Meus Pedidos</button>
            <button onClick={() => setActiveTab('provas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'provas' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><FileText size={18} /> Galeria de Arquivos</button>
            <button onClick={() => { setCreationMode('none'); setActiveTab('create'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><PlusCircle size={18} /> Novo Pedido</button>
            <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><FolderUp size={18} /> Materiais p/ Alunos</button>
            <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><BookOpenCheck size={18} /> Planejamentos</button>
            <button onClick={() => setActiveTab('pei')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-all ${activeTab === 'pei' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}><Heart size={18} /> Aba PEI</button>
        </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        {renderSidebar()}
        
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
                        <p className="text-gray-400">Acesse rapidamente os arquivos PDF das suas provas e apostilas.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(e => (
                            <Card key={e.id} className="group hover:border-red-500 transition-all cursor-pointer">
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

            {/* ABA: NOVO PEDIDO */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                    <header className="mb-8 text-center">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Solicitar Impressão</h1>
                        <p className="text-gray-400">Envie seus arquivos para a central de cópias da escola.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div onClick={() => setCreationMode('upload')} className={`p-8 rounded-[2rem] border-4 cursor-pointer transition-all flex flex-col items-center text-center ${creationMode === 'upload' ? 'bg-red-600 border-white shadow-2xl scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-6 ${creationMode === 'upload' ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                                <UploadCloud size={40}/>
                            </div>
                            <h3 className={`text-xl font-bold uppercase ${creationMode === 'upload' ? 'text-white' : 'text-gray-300'}`}>Upload de PDF</h3>
                            <p className={`text-sm mt-2 ${creationMode === 'upload' ? 'text-red-100' : 'text-gray-500'}`}>Já tenho o arquivo pronto no meu computador.</p>
                        </div>
                        <div onClick={() => setCreationMode('create')} className={`p-8 rounded-[2rem] border-4 cursor-pointer transition-all flex flex-col items-center text-center ${creationMode === 'create' ? 'bg-blue-600 border-white shadow-2xl scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mb-6 ${creationMode === 'create' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                                <Wand2 size={40}/>
                            </div>
                            <h3 className={`text-xl font-bold uppercase ${creationMode === 'create' ? 'text-white' : 'text-gray-300'}`}>Digitar/IA</h3>
                            <p className={`text-sm mt-2 ${creationMode === 'create' ? 'text-blue-100' : 'text-gray-500'}`}>Quero digitar agora ou usar IA para formatar.</p>
                        </div>
                    </div>

                    {creationMode !== 'none' && (
                        <Card className="animate-in slide-in-from-bottom-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Título da Atividade</label>
                                        <input className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-500 transition-colors" value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Ex: Simulado Bimestral de História" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Turma / Nível</label>
                                        <select className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-500" value={selectedClassForExam} onChange={e => setSelectedClassForExam(e.target.value)}>
                                            <option value="">Selecione a Turma...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Qtd. de Cópias</label>
                                        <input type="number" className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-500" value={printQuantity} onChange={e => setPrintQuantity(Number(e.target.value))} />
                                    </div>
                                </div>

                                {creationMode === 'upload' && (
                                    <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center relative hover:bg-gray-50 transition-colors">
                                        <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFile(e.target.files[0])} />
                                        {uploadedFile ? (
                                            <div className="text-red-600 flex flex-col items-center">
                                                <CheckCircle size={48} className="mb-2" />
                                                <span className="font-bold text-lg">{uploadedFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 flex flex-col items-center">
                                                <UploadCloud size={48} className="mb-2 opacity-20" />
                                                <p className="font-bold">Clique ou arraste o arquivo PDF aqui</p>
                                                <p className="text-xs mt-1">Apenas arquivos no formato PDF são aceitos.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                                    <Button variant="outline" onClick={() => setCreationMode('none')}>Cancelar</Button>
                                    <Button onClick={handleSaveExam} isLoading={isSaving} className="px-10 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20">Enviar para Gráfica</Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ABA: MATERIAIS PARA ALUNOS */}
            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Arquivos da Turma</h1>
                        <p className="text-gray-400">Disponibilize PDFs e apostilas para os alunos acessarem na sala de aula.</p>
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

            {/* ABA: PLANEJAMENTO (RESTAURADO COM TODOS OS CAMPOS) */}
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

                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                        <Card className="p-8">
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

                            {/* CAMPOS DINÂMICOS - PLANO DIÁRIO */}
                            {planType === 'daily' && (
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
                            )}

                            {/* CAMPOS DINÂMICOS - PLANO BIMESTRAL (COMPLETO) */}
                            {planType === 'semester' && (
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

                                    {/* QUADRO DE ATIVIDADES */}
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Layout size={16}/> Quadro de Atividades Sugeridas
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Atividades Prévias</label>
                                                <textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 focus:border-red-500 outline-none" value={planActPre} onChange={e => setPlanActPre(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Atividades Autodidáticas</label>
                                                <textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 focus:border-red-500 outline-none" value={planActAuto} onChange={e => setPlanActAuto(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Atividades Cooperativas</label>
                                                <textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 focus:border-red-500 outline-none" value={planActCoop} onChange={e => setPlanActCoop(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-red-600 uppercase mb-1">Atividades Complementares</label>
                                                <textarea className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 focus:border-red-500 outline-none" value={planActCompl} onChange={e => setPlanActCompl(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Práticas Educativas</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-red-500" value={planPractices} onChange={e => setPlanPractices(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Espaços Educativos</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-red-500" value={planSpaces} onChange={e => setPlanSpaces(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Recursos Didáticos</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-red-500" value={planDidacticResources} onChange={e => setPlanDidacticResources(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Estratégias de Avaliação</label>
                                            <textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-red-500" value={planEvaluationStrat} onChange={e => setPlanEvaluationStrat(e.target.value)} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Referências Bibliográficas</label>
                                        <textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-red-500" value={planReferences} onChange={e => setPlanReferences(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-10 border-t border-gray-100 mt-8">
                                <Button variant="outline" className="px-10 h-14" onClick={() => setActiveTab('requests')}>Cancelar</Button>
                                <Button onClick={handleSavePlan} isLoading={isSaving} className="px-14 h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-xl shadow-red-900/20">
                                    <Save size={20} className="mr-2"/> Publicar Planejamento
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div className="mt-12 space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <BookOpenCheck size={24}/> Meus Planejamentos Recentes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {lessonPlans.map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] group hover:bg-white/10 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.type === 'daily' ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'}`}>
                                            {p.type === 'daily' ? 'Diário' : 'Bimestral'}
                                        </span>
                                        <button onClick={() => deleteLessonPlan(p.id)} className="p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </div>
                                    <h4 className="font-bold text-white text-lg mb-1">{p.type === 'daily' ? p.topic : p.period}</h4>
                                    <p className="text-sm text-gray-500 font-bold mb-4">{p.className}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                                        <Calendar size={12}/> {p.type === 'daily' ? p.date : new Date(p.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {lessonPlans.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white/5 border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                                    <p className="font-bold text-gray-400 uppercase tracking-widest">Nenhum planejamento registrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ABA PEI */}
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
                                        <p className="text-sm text-gray-500 font-bold">{selectedAeeStudent.name} • {peiDoc.subject}</p>
                                    </div>
                                    <button onClick={() => setSelectedAeeStudent(null)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Competências Essenciais</label>
                                            <textarea 
                                                className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px] focus:border-red-500 outline-none"
                                                placeholder="O que o aluno deve desenvolver prioritariamente..."
                                                value={peiDoc.essentialCompetencies}
                                                onChange={e => setPeiDoc({...peiDoc, essentialCompetencies: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Conteúdos Selecionados</label>
                                            <textarea 
                                                className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px] focus:border-red-500 outline-none"
                                                placeholder="Conteúdos adaptados para este bimestre..."
                                                value={peiDoc.selectedContents}
                                                onChange={e => setPeiDoc({...peiDoc, selectedContents: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Recursos Didáticos</label>
                                            <textarea 
                                                className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px] focus:border-red-500 outline-none"
                                                placeholder="Materiais e ferramentas adaptadas (lupa, áudio, etc)..."
                                                value={peiDoc.didacticResources}
                                                onChange={e => setPeiDoc({...peiDoc, didacticResources: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-red-600 uppercase tracking-widest">Avaliação</label>
                                            <textarea 
                                                className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm bg-gray-50 min-h-[120px] focus:border-red-500 outline-none"
                                                placeholder="Como se dará a avaliação do progresso deste aluno..."
                                                value={peiDoc.evaluation}
                                                onChange={e => setPeiDoc({...peiDoc, evaluation: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
                                    <Button variant="outline" onClick={() => setSelectedAeeStudent(null)} className="px-8 border-2">Sair sem salvar</Button>
                                    <Button onClick={async () => {
                                        setIsSaving(true);
                                        await savePEI({...peiDoc, updatedAt: Date.now()});
                                        setIsSaving(false);
                                        setSelectedAeeStudent(null);
                                        alert("PEI Salvo!");
                                    }} isLoading={isSaving} className="px-10 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20"><Save size={20} className="mr-2"/> Salvar PEI</Button>
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
