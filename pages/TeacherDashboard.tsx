
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    listenToStudents,
    listenToOccurrences,
    getLessonPlans,
    saveLessonPlan,
    deleteLessonPlan,
    getAllPEIs,
    savePEIDocument,
    deletePEIDocument,
    saveOccurrence,
    deleteOccurrence,
    saveClassMaterial,
    getClassMaterials,
    deleteClassMaterial,
    logAttendance,
    uploadClassMaterial,
    saveGradebook,
    listenToGradebook
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, Student, StudentOccurrence, LessonPlan, PEIDocument, ClassMaterial, AttendanceLog, UserRole, GradebookEntry, AV1Activity } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, List, PlusCircle, X, Trash2, FileUp, AlertCircle, 
  BookOpen, Save, ArrowLeft, Heart, FileText, Eye, Clock, UploadCloud, ChevronRight,
  LayoutTemplate, Download, Users, Edit3, MessageSquare, Sparkles, BookMarked,
  Layers, MapPin, Search, Bot, Smile, AlertTriangle, Edit, Folder, BookOpenCheck,
  FileCheck, ShieldAlert, GraduationCap, Calculator, Calendar
} from 'lucide-react';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS, EFAI_CLASSES, INFANTIL_CLASSES } from '../constants';

const TEMPLATES = [
    { title: 'Cabeçalho de Atividades', url: 'https://i.ibb.co/2Y0zfZ0W/3.png' },
    { title: 'Cabeçalho Kronos', url: 'https://i.ibb.co/zTGFssJs/4.png' },
    { title: 'Cabeçalho de Avaliação', url: 'https://i.ibb.co/9kJLPqxs/CABE-ALHO-AVALIA-O.png' },
];

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'plans' | 'occurrences' | 'pei' | 'materials' | 'attendance' | 'grades'>('requests');
  const [activePlanTab, setActivePlanTab] = useState<'daily' | 'bimester' | 'inova'>('daily');
  
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherMaterials, setTeacherMaterials] = useState<ClassMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Create Exam State
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(30);
  const [printInstructions, setPrintInstructions] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Material State
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialClass, setMaterialClass] = useState('');
  const [materialSubject, setMaterialSubject] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  // Attendance State
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({});

  // Occurrence State
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [occurrenceClass, setOccurrenceClass] = useState('');
  const [occurrenceForm, setOccurrenceForm] = useState({ studentId: '', category: 'indisciplina', description: '' });

  // PEI State
  const [peiDocuments, setPeiDocuments] = useState<PEIDocument[]>([]);
  const [showPeiModal, setShowPeiModal] = useState(false);
  const [editingPei, setEditingPei] = useState<Partial<PEIDocument> | null>(null);

  // Gradebook State
  const [gradeClass, setGradeClass] = useState('');
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeBimester, setGradeBimester] = useState('1º BIMESTRE');
  const [gradebookData, setGradebookData] = useState<GradebookEntry | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState<AV1Activity>({ id: '', name: '', date: '', deliveryDate: '', maxScore: 1.0 });

  // Lesson Plan State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<LessonPlan>>({
      className: '', subject: '', topic: '', content: '', type: 'daily',
      bimester: '1º BIMESTRE', justification: '', contents: '', cognitiveSkills: '',
      socioEmotionalSkills: '', didacticSituations: '', activitiesPrevious: '',
      activitiesAutodidactic: '', activitiesCooperative: '', activitiesComplementary: '',
      educationalPractices: '', educationalSpaces: '', didacticResources: '',
      evaluationStrategies: '', referenceSources: '',
      inovaTheme: '', guidingQuestion: '', subprojectGoal: '', expectedResults: [],
      finalProductType: '', finalProductDescription: '', 
      projectSteps: { sensitize: false, investigate: false, create: false, test: false, present: false, register: false },
      schedule: '', resourcesNeeded: '', aiTools: '', aiPurpose: [], aiCare: ''
  });

  useEffect(() => { fetchData(); }, [user, activeTab]);

  useEffect(() => {
      // PREVENÇÃO DE ERRO: Só ativa listeners se houver usuário autenticado
      if (!user) return;

      const unsubS = listenToStudents(
          setStudents, 
          (err) => console.warn('Students listener restricted:', err.code)
      );
      
      const unsubO = listenToOccurrences((all) => {
          if (user?.name) setTeacherOccurrences(all.filter(o => o.reportedBy === user.name));
      }, (err) => console.warn('Occurrences listener restricted:', err.code));
      
      return () => { unsubS(); unsubO(); };
  }, [user]);

  useEffect(() => {
      if (activeTab === 'create' && examGrade) {
          const count = students.filter(s => s.className === examGrade).length;
          if (count > 0) setPrintQty(count);
      }
  }, [examGrade, students, activeTab]);

  // Gradebook Listener
  useEffect(() => {
      if (activeTab === 'grades' && gradeClass && gradeSubject && gradeBimester) {
          const unsub = listenToGradebook(gradeClass, gradeSubject, gradeBimester, (data) => {
              if (data) {
                  setGradebookData(data);
              } else {
                  // Init empty if not exists
                  setGradebookData({
                      id: '',
                      className: gradeClass,
                      subject: gradeSubject,
                      bimester: gradeBimester,
                      av1Config: [],
                      grades: {},
                      updatedAt: Date.now()
                  });
              }
          });
          return () => unsub();
      }
  }, [activeTab, gradeClass, gradeSubject, gradeBimester]);

  const getTeacherClasses = () => {
      if (!user) return CLASSES;
      if (user.classes && user.classes.length > 0) return user.classes;
      
      const name = user.name ? user.name.toUpperCase() : '';
      if (name.includes('ALICIA')) return ['2º ANO EFAI'];
      if (name.includes('LEILA')) return ['1º ANO EFAI'];
      if (name.includes('JULIANA')) return ['3º ANO EFAI'];

      return CLASSES;
  };

  // Efeito para selecionar automaticamente a turma se houver apenas uma
  useEffect(() => {
      if (activeTab === 'attendance' || activeTab === 'grades') {
          const classes = getTeacherClasses();
          if (classes.length === 1) {
              if (activeTab === 'attendance') setAttendanceClass(classes[0]);
              if (activeTab === 'grades') {
                  setGradeClass(classes[0]);
                  // Tenta auto-selecionar disciplina se disponível
                  if (user?.subject && user.subject !== 'POLIVALENTE') {
                      setGradeSubject(user.subject);
                  }
              }
          }
      }
  }, [activeTab, user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        if (activeTab === 'requests') {
            const allExams = await getExams(user.id);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'materials') {
            let allMats: ClassMaterial[] = [];
            try {
                // Tenta buscar TODOS os materiais para fazer o filtro local (fix para IDs antigos)
                allMats = await getClassMaterials(); 
            } catch (err: any) {
                // FALLBACK: Se der erro de permissão (ex: regras impedem ler tudo), busca apenas os do professor
                if (err.code === 'permission-denied' || err.code === 'mismatched-header') {
                    console.warn("Acesso restrito a todos os materiais. Buscando apenas do usuário.");
                    try {
                        allMats = await getClassMaterials(user.id);
                    } catch (e) { console.error("Erro no fallback de materiais:", e); }
                } else {
                    console.error("Erro ao buscar materiais:", err);
                }
            }
            
            const myMats = allMats.filter(m => {
                const isIdMatch = m.teacherId === user.id;
                
                // Normalização para comparação flexível de nomes
                const dbName = (m.teacherName || '').trim().toUpperCase()
                    .replace(/^PROF[\.]?\s+|^PROFA[\.]?\s+|^PROFESSOR\s+|^PROFESSORA\s+/g, '');
                const sessionName = (user.name || '').trim().toUpperCase()
                    .replace(/^PROF[\.]?\s+|^PROFA[\.]?\s+|^PROFESSOR\s+|^PROFESSORA\s+/g, '');
                
                const isNameMatch = dbName && sessionName && (
                    dbName === sessionName || 
                    (sessionName.length > 3 && dbName.includes(sessionName)) ||
                    (dbName.length > 3 && sessionName.includes(dbName))
                );

                return isIdMatch || isNameMatch;
            });
            setTeacherMaterials(myMats.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'plans') {
            const plans = await getLessonPlans(user.id);
            setLessonPlans(plans.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'pei') {
            const peis = await getAllPEIs();
            setPeiDocuments(peis);
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const isEligibleForAttendance = () => {
      if (!user) return false;
      const hasEFAI = user.educationLevels?.some(level => ['EFAI', 'Ed. Infantil'].includes(level));
      
      const specificNames = ['ALICIA', 'LEILA', 'JULIANA'];
      const nameMatch = user.name ? specificNames.some(n => user.name.toUpperCase().includes(n)) : false;

      // Permite acesso se o subject contiver "POLIVALENTE", se houver turmas atribuídas ou se for o admin ou se for uma das professoras especificas
      return (user.subject && user.subject.includes('POLIVALENTE')) || 
             (user.classes && user.classes.length > 0) || 
             hasEFAI ||
             nameMatch ||
             user.email === 'ruan.wss@gmail.com';
  };

  const getSubjectsForClass = (cls: string) => {
      if (!cls) return [];
      if (cls.includes('SÉRIE') || cls.includes('EM')) return EM_SUBJECTS;
      if (cls.includes('EFAF')) return EFAF_SUBJECTS;
      return ["GERAL", "LÍNGUA PORTUGUESA", "MATEMÁTICA", "HISTÓRIA", "GEOGRAFIA", "CIÊNCIAS", "ARTE", "INGLÊS", "EDUCAÇÃO FÍSICA", "ENSINO RELIGIOSO", "PROJETOS", "AVALIAÇÕES"];
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade || uploadedFiles.length === 0) return alert("Preencha título, turma e anexe arquivos.");
      setIsSaving(true);
      try {
          const fileUrls: string[] = [];
          const fileNames: string[] = [];
          for (const file of uploadedFiles) {
              const url = await uploadExamFile(file, user?.name || 'Professor');
              fileUrls.push(url);
              fileNames.push(file.name);
          }
          const request: ExamRequest = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: user?.subject || 'Geral',
              title: examTitle,
              quantity: printQty,
              gradeLevel: examGrade,
              instructions: printInstructions || 'Sem instruções',
              fileNames,
              fileUrls,
              status: ExamStatus.PENDING,
              createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          };
          await saveExam(request);
          alert("Solicitação enviada!");
          setExamTitle('');
          setPrintInstructions('');
          setUploadedFiles([]);
          setActiveTab('requests');
      } catch (e) {
          alert("Erro ao enviar.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveMaterial = async () => {
      if (!materialTitle || !materialClass || !materialFile) return alert("Preencha todos os campos.");
      setIsSaving(true);
      try {
          const url = await uploadClassMaterial(materialFile, materialClass);
          const finalSubject = (materialSubject || user?.subject || 'GERAL').trim().toUpperCase();
          const material: ClassMaterial = {
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              className: materialClass,
              title: materialTitle,
              subject: finalSubject,
              fileUrl: url,
              fileName: materialFile.name,
              fileType: materialFile.type,
              createdAt: Date.now()
          };
          await saveClassMaterial(material);
          alert("Material compartilhado com sucesso!");
          setMaterialTitle('');
          setMaterialFile(null);
          fetchData();
      } catch (e: any) {
          console.error(e);
          alert(`Erro ao salvar material: ${e.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSavePEI = async () => {
      if (!editingPei?.studentId || !editingPei?.essentialCompetencies) return alert("Preencha os campos obrigatórios");
      setIsSaving(true);
      try {
          const pei: PEIDocument = {
              id: editingPei.id || '',
              studentId: editingPei.studentId,
              studentName: editingPei.studentName || '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: editingPei.subject || user?.subject || 'Geral',
              period: editingPei.period || '1º Bimestre',
              essentialCompetencies: editingPei.essentialCompetencies,
              selectedContents: editingPei.selectedContents || '',
              didacticResources: editingPei.didacticResources || '',
              evaluation: editingPei.evaluation || '',
              updatedAt: Date.now()
          };
          await savePEIDocument(pei);
          alert("PEI Salvo!");
          setShowPeiModal(false);
          setEditingPei(null);
          fetchData();
      } catch(e) {
          alert("Erro ao salvar PEI");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeletePEI = async (id: string) => {
      if(confirm("Excluir este documento PEI?")) {
          await deletePEIDocument(id);
          fetchData();
      }
  };

  const openPEIModal = (student?: Student, existingPei?: PEIDocument) => {
      if (existingPei) {
          setEditingPei(existingPei);
      } else if (student) {
          setEditingPei({
              studentId: student.id,
              studentName: student.name,
              subject: user?.subject || '',
              period: '1º Bimestre'
          });
      }
      setShowPeiModal(true);
  };

  const filterAEEStudents = (student: Student) => {
      if (!student.isAEE) return false;
      if (!user) return false;
      if (user.roles?.includes(UserRole.AEE) || user.email === 'ruan.wss@gmail.com') return true;
      if (user.classes && user.classes.length > 0) return user.classes.includes(student.className);
      if (user.educationLevels && user.educationLevels.length > 0) {
          const levels = user.educationLevels;
          const sClass = student.className;
          if (levels.includes('Ed. Infantil') && INFANTIL_CLASSES.includes(sClass)) return true;
          if (levels.includes('EFAI') && EFAI_CLASSES.includes(sClass)) return true;
          if (levels.includes('EFAF') && ['6º', '7º', '8º', '9º'].some(prefix => sClass.includes(prefix))) return true;
          if (levels.includes('Médio') && (sClass.includes('SÉRIE') || sClass.includes('EM'))) return true;
          return false;
      }
      return true; 
  };

  const handleSaveOccurrence = async () => {
      if (!occurrenceForm.studentId || !occurrenceForm.description) return alert("Selecione o aluno e descreva a ocorrência.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === occurrenceForm.studentId);
          const occurrence: StudentOccurrence = {
              id: '',
              studentId: occurrenceForm.studentId,
              studentName: student?.name || 'Aluno',
              studentClass: student?.className || occurrenceClass,
              category: occurrenceForm.category as any,
              severity: 'low',
              description: occurrenceForm.description,
              date: new Date().toISOString().split('T')[0],
              timestamp: Date.now(),
              reportedBy: user?.name || 'Professor'
          };
          await saveOccurrence(occurrence);
          alert("Ocorrência registrada!");
          setShowOccurrenceModal(false);
          setOccurrenceForm({ studentId: '', category: 'indisciplina', description: '' });
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveAttendance = async () => {
      if (!attendanceClass) return;
      setIsSaving(true);
      try {
          const today = new Date();
          const dateString = today.toISOString().split('T')[0];
          const classStudents = students.filter(s => s.className === attendanceClass);
          for (const student of classStudents) {
              if (attendanceRecords[student.id] !== undefined) {
                  const log: AttendanceLog = {
                      id: '',
                      studentId: student.id,
                      studentName: student.name,
                      className: student.className,
                      timestamp: today.getTime(),
                      dateString,
                      type: attendanceRecords[student.id] ? 'entry' : 'exit'
                  };
                  await logAttendance(log);
              }
          }
          alert("Frequência registrada!");
          setAttendanceClass('');
          setAttendanceRecords({});
      } catch (e) {
          alert("Erro ao registrar frequência.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSavePlan = async () => {
      if (!newPlan.className) return alert("Selecione a turma.");
      if (newPlan.type === 'daily' && !newPlan.topic) return alert("Preencha o tema.");
      if (newPlan.type === 'inova' && !newPlan.inovaTheme) return alert("Preencha o tema do subprojeto.");
      setIsSaving(true);
      try {
          const planData = {
              ...newPlan,
              id: '',
              teacherId: user?.id || '',
              teacherName: user?.name || '',
              subject: newPlan.subject || user?.subject || 'Geral',
              createdAt: Date.now(),
              type: newPlan.type || activePlanTab,
              topic: newPlan.type === 'inova' ? newPlan.inovaTheme : newPlan.topic
          };
          await saveLessonPlan(planData as LessonPlan);
          alert("Planejamento salvo!");
          setShowPlanModal(false);
          setNewPlan({ 
              className: '', subject: '', topic: '', content: '', type: activePlanTab,
              bimester: '1º BIMESTRE', justification: '', contents: '', cognitiveSkills: '',
              socioEmotionalSkills: '', didacticSituations: '', activitiesPrevious: '',
              activitiesAutodidactic: '', activitiesCooperative: '', activitiesComplementary: '',
              educationalPractices: '', educationalSpaces: '', didacticResources: '',
              evaluationStrategies: '', referenceSources: '',
              inovaTheme: '', guidingQuestion: '', subprojectGoal: '', expectedResults: [],
              finalProductType: '', finalProductDescription: '', 
              projectSteps: { sensitize: false, investigate: false, create: false, test: false, present: false, register: false },
              schedule: '', resourcesNeeded: '', aiTools: '', aiPurpose: [], aiCare: ''
          });
          fetchData();
      } catch(e) { alert("Erro ao salvar."); }
      finally { setIsSaving(false); }
  };

  const handleDeletePlan = async (id: string) => {
      if(confirm("Excluir planejamento?")) {
          await deleteLessonPlan(id);
          fetchData();
      }
  };

  // --- GRADEBOOK LOGIC ---

  const handleAddAV1Activity = async () => {
      if (!gradebookData) return;
      if (!newActivity.name || !newActivity.date || newActivity.maxScore <= 0) return alert("Preencha todos os campos da atividade.");
      
      const currentAV1Sum = gradebookData.av1Config.reduce((acc, curr) => acc + curr.maxScore, 0);
      if (currentAV1Sum + newActivity.maxScore > 10.0) {
          return alert(`A soma das atividades da AV1 não pode ultrapassar 10.0 pontos. Soma atual: ${currentAV1Sum}.`);
      }
      if (gradebookData.av1Config.length >= 7) {
          return alert("Máximo de 7 atividades para AV1 atingido.");
      }

      const activity: AV1Activity = { ...newActivity, id: Date.now().toString() };
      const updatedConfig = [...gradebookData.av1Config, activity];
      
      const updatedData = { ...gradebookData, av1Config: updatedConfig };
      setGradebookData(updatedData);
      await saveGradebook(updatedData);
      
      setShowActivityModal(false);
      setNewActivity({ id: '', name: '', date: '', deliveryDate: '', maxScore: 1.0 });
  };

  const handleRemoveAV1Activity = async (activityId: string) => {
      if (!gradebookData || !confirm("Remover esta atividade e todas as notas associadas?")) return;
      const updatedConfig = gradebookData.av1Config.filter(a => a.id !== activityId);
      
      // Clean up grades for this activity
      const updatedGrades = { ...gradebookData.grades };
      Object.keys(updatedGrades).forEach(studentId => {
          if (updatedGrades[studentId]?.av1) {
              delete updatedGrades[studentId].av1[activityId];
          }
      });

      const updatedData = { ...gradebookData, av1Config: updatedConfig, grades: updatedGrades };
      setGradebookData(updatedData);
      await saveGradebook(updatedData);
  };

  const handleUpdateGrade = async (studentId: string, type: 'av1', activityId: string, value: number) => {
      if (!gradebookData) return;
      
      const updatedGrades = { ...gradebookData.grades };
      if (!updatedGrades[studentId]) updatedGrades[studentId] = { av1: {} };
      if (!updatedGrades[studentId].av1) updatedGrades[studentId].av1 = {};

      updatedGrades[studentId].av1[activityId] = value;

      const updatedData = { ...gradebookData, grades: updatedGrades };
      setGradebookData(updatedData); // Optimistic update
      // Debounce could be added here for performance
      await saveGradebook(updatedData);
  };

  // Added function to allow teachers to update AV3
  const handleUpdateExamGrade = async (studentId: string, type: 'av2' | 'av3', value: number) => {
      if (!gradebookData) return;
      
      const updatedGrades = { ...gradebookData.grades };
      if (!updatedGrades[studentId]) updatedGrades[studentId] = { av1: {} };
      
      updatedGrades[studentId][type] = value;

      const updatedData = { ...gradebookData, grades: updatedGrades };
      setGradebookData(updatedData);
      await saveGradebook(updatedData);
  };

  const calculateFinalGrade = (studentId: string) => {
      if (!gradebookData) return 0;
      const studentGrades = gradebookData.grades[studentId];
      if (!studentGrades) return 0;

      const av1Total = Object.values(studentGrades.av1 || {}).reduce((a: number, b: number) => a + b, 0);
      const av2 = studentGrades.av2 || 0;
      const av3 = studentGrades.av3 || 0;

      return ((av1Total + av2 + av3) / 3).toFixed(1);
  };

  const SidebarButton = ({ tab, label, icon: IconComponent }: { tab: any, label: string, icon: React.ElementType }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === tab ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
    >
        <IconComponent size={18} /> 
        <span>{label}</span>
    </button>
  );

  const InovaCheckbox: React.FC<{ label: string, checked: boolean, onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
      <label className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
          <input type="checkbox" className="accent-red-600 w-4 h-4" checked={checked} onChange={e => onChange(e.target.checked)} />
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">{label}</span>
      </label>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent text-white">
        <div className="w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6 flex-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 ml-2 opacity-50">Menu Professor</p>
                <SidebarButton tab="requests" label="Fila da Gráfica" icon={List} />
                <SidebarButton tab="create" label="Enviar p/ Gráfica" icon={PlusCircle} />
                <SidebarButton tab="materials" label="Materiais de Aula" icon={Folder} />
                <SidebarButton tab="plans" label="Planejamentos" icon={BookOpen} />
                <SidebarButton tab="grades" label="Diário de Classe" icon={Calculator} />
                <SidebarButton tab="pei" label="PEI / AEE" icon={Heart} />
                <SidebarButton tab="occurrences" label="Ocorrências" icon={AlertCircle} />
                {isEligibleForAttendance() && (
                    <SidebarButton tab="attendance" label="Frequência" icon={Clock} />
                )}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {/* ... (Existing Tabs: requests, create, materials, plans, pei, occurrences, attendance) ... */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Fila de Impressões</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Acompanhamento de solicitações enviadas à gráfica</p>
                    </header>
                    <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-[0.2em]">
                                <tr>
                                    <th className="p-8">Data</th>
                                    <th className="p-8">Atividade</th>
                                    <th className="p-8">Turma / Qtd</th>
                                    <th className="p-8">Status</th>
                                    <th className="p-8 text-right">Arquivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {exams.length > 0 ? exams.map(exam => (
                                    <tr key={exam.id} className="hover:bg-white/[0.02]">
                                        <td className="p-8 text-sm text-gray-500 font-bold">{new Date(exam.createdAt).toLocaleDateString()}</td>
                                        <td className="p-8 font-black text-white uppercase tracking-tight text-sm">{exam.title}</td>
                                        <td className="p-8"><span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/5">{exam.gradeLevel} • {exam.quantity}x</span></td>
                                        <td className="p-8">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                                {exam.status === ExamStatus.PENDING ? 'Aguardando' : exam.status === ExamStatus.IN_PROGRESS ? 'Imprimindo' : 'Pronto'}
                                            </span>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                {exam.fileUrls && exam.fileUrls.length > 0 ? exam.fileUrls.map((url, idx) => (
                                                    <a 
                                                        key={idx} 
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-white/5" 
                                                        title="Visualizar Material"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                )) : (
                                                    <span className="text-[10px] text-gray-600 font-bold uppercase">Sem arquivo</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-40">Nenhuma solicitação encontrada</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- GRADEBOOK TAB --- */}
            {activeTab === 'grades' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Diário de Classe</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Lançamento de notas e avaliações</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <select className="bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-red-600" value={gradeClass} onChange={e => setGradeClass(e.target.value)}>
                                <option value="">Selecione a Turma</option>
                                {getTeacherClasses().map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-red-600" value={gradeSubject} onChange={e => setGradeSubject(e.target.value)}>
                                <option value="">Selecione a Disciplina</option>
                                {getSubjectsForClass(gradeClass).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-red-600" value={gradeBimester} onChange={e => setGradeBimester(e.target.value)}>
                                <option value="1º BIMESTRE">1º BIMESTRE</option>
                                <option value="2º BIMESTRE">2º BIMESTRE</option>
                                <option value="3º BIMESTRE">3º BIMESTRE</option>
                                <option value="4º BIMESTRE">4º BIMESTRE</option>
                            </select>
                        </div>
                    </header>

                    {gradeClass && gradeSubject ? (
                        <div className="space-y-8">
                            {/* AV1 CONFIGURATION */}
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><Calculator className="text-red-500"/> Composição da AV1</h3>
                                        <p className="text-xs text-gray-500 font-bold mt-1">
                                            Soma Atual: <span className={(gradebookData?.av1Config.reduce((a,b) => a+b.maxScore, 0) || 0) > 10 ? 'text-red-500' : 'text-green-500'}>{(Number(gradebookData?.av1Config.reduce((a,b) => a+b.maxScore, 0) || 0)).toFixed(1)}</span> / 10.0
                                        </p>
                                    </div>
                                    <Button onClick={() => setShowActivityModal(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-white">
                                        <Plus size={14} className="mr-2"/> Add Atividade
                                    </Button>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {gradebookData?.av1Config.map((activity, idx) => (
                                        <div key={activity.id} className="min-w-[180px] bg-black/40 border border-white/10 p-4 rounded-2xl relative group">
                                            <button onClick={() => handleRemoveAV1Activity(activity.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Atividade {idx + 1}</p>
                                            <p className="text-sm font-bold text-white truncate" title={activity.name}>{activity.name}</p>
                                            <div className="flex justify-between items-end mt-2">
                                                <span className="text-[10px] text-gray-500">{new Date(activity.date).toLocaleDateString()}</span>
                                                <span className="text-xs font-black text-white bg-white/10 px-2 py-0.5 rounded">Val: {activity.maxScore}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {gradebookData?.av1Config.length === 0 && <p className="text-gray-600 text-xs italic py-4">Nenhuma atividade configurada para AV1.</p>}
                                </div>
                            </div>

                            {/* GRADES TABLE */}
                            <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-black/40 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                            <tr>
                                                <th className="p-6 border-b border-white/5 sticky left-0 bg-[#121214] z-10 w-64">Aluno</th>
                                                {gradebookData?.av1Config.map((act, i) => (
                                                    <th key={act.id} className="p-6 border-b border-white/5 text-center min-w-[100px]">
                                                        <div className="truncate w-24 mx-auto" title={act.name}>{i+1}. {act.name}</div>
                                                        <div className="text-[8px] opacity-50">({act.maxScore} pts)</div>
                                                    </th>
                                                ))}
                                                <th className="p-6 border-b border-white/5 text-center bg-red-900/10 text-red-400">Total AV1</th>
                                                <th className="p-6 border-b border-white/5 text-center bg-blue-900/10 text-blue-400">AV2 (Simulado)</th>
                                                <th className="p-6 border-b border-white/5 text-center bg-purple-900/10 text-purple-400">AV3 (Prova)</th>
                                                <th className="p-6 border-b border-white/5 text-center bg-green-900/10 text-green-400 font-bold text-xs">Média Final</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {students.filter(s => s.className === gradeClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => {
                                                const sGrades = (gradebookData?.grades[student.id] || { av1: {} }) as { av1: Record<string, number>, av2?: number, av3?: number };
                                                const av1Total = Object.values(sGrades.av1 || {}).reduce((a: number, b: number) => a + b, 0);
                                                
                                                return (
                                                    <tr key={student.id} className="hover:bg-white/[0.02]">
                                                        <td className="p-6 sticky left-0 bg-[#18181b] z-10 border-r border-white/5">
                                                            <p className="font-bold text-xs text-white uppercase truncate w-60">{student.name}</p>
                                                        </td>
                                                        {gradebookData?.av1Config.map(act => (
                                                            <td key={act.id} className="p-4 text-center">
                                                                <input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    max={act.maxScore} 
                                                                    step="0.1"
                                                                    className="w-16 bg-black/40 border border-white/10 rounded-lg p-2 text-center text-white font-bold outline-none focus:border-red-500 text-xs"
                                                                    value={sGrades.av1?.[act.id] ?? ''}
                                                                    onChange={e => handleUpdateGrade(student.id, 'av1', act.id, Math.min(Number(e.target.value), act.maxScore))}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="p-6 text-center font-black text-red-400 bg-red-900/5">{av1Total.toFixed(1)}</td>
                                                        <td className="p-6 text-center font-bold text-gray-400 bg-blue-900/5 cursor-not-allowed" title="Preenchido pelo Administrativo">
                                                            {sGrades.av2 !== undefined ? sGrades.av2.toFixed(1) : '-'}
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="10" 
                                                                step="0.1"
                                                                className="w-20 bg-purple-900/10 border border-purple-500/20 rounded-lg p-2 text-center text-purple-400 font-bold outline-none focus:border-purple-500 text-sm"
                                                                value={sGrades.av3 ?? ''}
                                                                onChange={e => handleUpdateExamGrade(student.id, 'av3', Math.min(Number(e.target.value), 10))}
                                                            />
                                                        </td>
                                                        <td className="p-6 text-center font-black text-green-400 bg-green-900/5 text-sm">
                                                            {calculateFinalGrade(student.id)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                            <Calculator size={64} className="mx-auto mb-4 text-gray-500" />
                            <p className="font-black uppercase tracking-widest text-sm text-gray-500">Selecione Turma e Disciplina para abrir o diário</p>
                        </div>
                    )}

                    {/* ACTIVITY MODAL */}
                    {showActivityModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Nova Atividade AV1</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Nome da Atividade</label>
                                        <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600 text-sm" placeholder="Ex: Trabalho em Grupo" value={newActivity.name} onChange={e => setNewActivity({...newActivity, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Data de Realização</label>
                                        <input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600 text-sm" value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Data de Entrega</label>
                                        <input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600 text-sm" value={newActivity.deliveryDate || ''} onChange={e => setNewActivity({...newActivity, deliveryDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Valor (Max Pontos)</label>
                                        <input type="number" step="0.1" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600 text-sm" value={newActivity.maxScore} onChange={e => setNewActivity({...newActivity, maxScore: Number(e.target.value)})} />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button variant="outline" onClick={() => setShowActivityModal(false)} className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase">Cancelar</Button>
                                        <Button onClick={handleAddAV1Activity} className="flex-1 h-12 bg-red-600 rounded-xl font-black text-[10px] uppercase">Adicionar</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ... (Other existing tabs and modals preserved) ... */}
            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto space-y-8">
                    <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <LayoutTemplate size={120} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Modelos Padronizados</h2>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-8">Faça o download dos cabeçalhos oficiais antes de imprimir</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {TEMPLATES.map((t, idx) => (
                                    <a key={idx} href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-red-600/30 p-4 rounded-2xl transition-all group/btn">
                                        <div className="h-10 w-10 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center group-hover/btn:bg-red-600 group-hover/btn:text-white transition-colors">
                                            <Download size={18} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-wide leading-tight group-hover/btn:text-white">{t.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#18181b] border border-white/5 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4"><UploadCloud className="text-red-600" size={40} /> Enviar p/ Gráfica</h2>
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título do Material</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all text-sm placeholder-gray-600" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Prova Bimestral de Matemática" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none text-sm" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Turma --</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Quantidade</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Instruções da Impressão</label>
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-medium outline-none focus:border-red-600 transition-all min-h-[120px] text-sm placeholder-gray-600" value={printInstructions} onChange={e => setPrintInstructions(e.target.value)} placeholder="Ex: Frente e verso, grampeado, papel A4..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Anexar Arquivo(s)</label>
                                <div className="border-3 border-dashed border-white/10 rounded-[2.5rem] p-12 text-center hover:border-red-600 transition-all relative bg-black/20 group cursor-pointer">
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                    <FileUp className="mx-auto text-gray-600 mb-4 group-hover:text-red-500 group-hover:scale-110 transition-all" size={56} />
                                    <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Arraste seus arquivos PDF ou Imagens</p>
                                </div>
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {uploadedFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 animate-in slide-in-from-left-2">
                                                <span className="text-xs text-gray-300 font-bold truncate pr-4 uppercase">{f.name}</span>
                                                <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 p-2"><X size={18}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="pt-4">
                                <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] bg-red-600 shadow-2xl shadow-red-900/40 hover:scale-[1.02] transition-transform">Confirmar Envio</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-10">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Materiais de Aula</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Compartilhe arquivos diretamente com os alunos</p>
                    </header>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl sticky top-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3"><UploadCloud className="text-red-500" size={24} /> Novo Material</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Título do Arquivo</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all" placeholder="Ex: Slide Aula 1" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Turma</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={materialClass} onChange={e => setMaterialClass(e.target.value)}>
                                            <option value="">-- Selecione --</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Pasta</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={materialSubject} onChange={e => setMaterialSubject(e.target.value)}>
                                            <option value="">-- Geral --</option>
                                            {getSubjectsForClass(materialClass).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-8 text-center hover:border-red-500 transition-all relative bg-black/20 group cursor-pointer">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setMaterialFile(e.target.files[0])} />
                                        {materialFile ? (
                                            <div className="text-green-500 flex flex-col items-center">
                                                <FileText size={32} className="mb-2" />
                                                <p className="font-bold text-xs uppercase tracking-widest">{materialFile.name}</p>
                                            </div>
                                        ) : (
                                            <div className="text-gray-500 flex flex-col items-center group-hover:text-white transition-colors">
                                                <FileUp size={32} className="mb-2" />
                                                <p className="font-black uppercase text-[10px] tracking-widest">Clique para Anexar</p>
                                            </div>
                                        )}
                                    </div>
                                    <Button onClick={handleSaveMaterial} isLoading={isSaving} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40">Publicar Material</Button>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            {teacherMaterials.length > 0 ? teacherMaterials.map(mat => (
                                <div key={mat.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all group flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/10"><FileText size={24}/></div>
                                        <div>
                                            <h3 className="font-black text-white text-lg uppercase tracking-tight">{mat.title}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{mat.className} • {mat.subject} • {new Date(mat.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5" title="Visualizar"><Eye size={20} /></a>
                                        <button onClick={async () => { if(confirm("Excluir?")) await deleteClassMaterial(mat.id); fetchData(); }} className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 transition-all border border-white/5" title="Excluir"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <Folder size={64} className="mb-4 text-gray-600" />
                                    <p className="text-gray-500 font-black uppercase tracking-widest">Nenhum material publicado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'plans' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto">
                    <header className="mb-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Planejamentos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gestão de conteúdos e projetos acadêmicos</p>
                            </div>
                            <Button onClick={() => { setNewPlan(prev => ({ ...prev, type: activePlanTab })); setShowPlanModal(true); }} className="bg-red-600 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"><Plus size={18} className="mr-3"/> Novo Planejamento</Button>
                        </div>
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 max-w-2xl overflow-hidden">
                            <button onClick={() => setActivePlanTab('daily')} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanTab === 'daily' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Clock size={16}/> Diário</button>
                            <button onClick={() => setActivePlanTab('bimester')} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanTab === 'bimester' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><BookMarked size={16}/> Bimestral</button>
                            <button onClick={() => setActivePlanTab('inova')} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activePlanTab === 'inova' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Sparkles size={16}/> Projeto Inova</button>
                        </div>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {lessonPlans.filter(p => (p.type || 'daily') === activePlanTab).map(plan => (
                            <div key={plan.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-white/10 transition-all group relative flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-2xl ${activePlanTab === 'daily' ? 'bg-red-600/10 text-red-500' : activePlanTab === 'bimester' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-400'}`}>{activePlanTab === 'daily' ? <Clock size={24}/> : activePlanTab === 'bimester' ? <BookMarked size={24}/> : <Sparkles size={24}/>}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/5 ${activePlanTab === 'daily' ? 'bg-red-950/20 text-red-400' : activePlanTab === 'bimester' ? 'bg-blue-950/20 text-blue-400' : 'bg-purple-950/20 text-purple-400'}`}>{activePlanTab === 'daily' ? 'Diário' : activePlanTab === 'bimester' ? 'Bimestral' : 'Inova'}</span>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="text-gray-600 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 leading-tight">{plan.topic || plan.inovaTheme}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">{plan.className} • {plan.subject}</p>
                                {plan.type === 'bimester' ? (
                                    <div className="space-y-4">
                                        <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Justificativa:</p><p className="text-xs text-gray-300 line-clamp-2">{plan.justification}</p></div>
                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4"><div><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Bimestre:</p><p className="text-[10px] font-bold text-white">{plan.bimester}</p></div><div className="text-right"><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Ações:</p><button className="text-[9px] text-blue-400 font-black uppercase hover:underline">Ver Completo</button></div></div>
                                    </div>
                                ) : plan.type === 'inova' ? (
                                    <div className="space-y-4">
                                        <div className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/20"><p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Questão Norteadora:</p><p className="text-xs text-gray-300 line-clamp-2">{plan.guidingQuestion}</p></div>
                                        <div className="bg-black/20 p-4 rounded-xl border border-white/5"><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Ferramenta IA Utilizada:</p><p className="text-[10px] font-bold text-white flex items-center gap-2"><Bot size={12}/> {plan.aiTools}</p></div>
                                    </div>
                                ) : (<div className="bg-black/30 p-6 rounded-2xl border border-white/5 text-gray-400 text-sm leading-relaxed whitespace-pre-wrap flex-1 max-h-48 overflow-y-auto custom-scrollbar">{plan.content}</div>)}
                                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-widest"><span>Criado em: {new Date(plan.createdAt).toLocaleDateString()}</span><span>Prof. {plan.teacherName.split(' ')[0]}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'pei' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    {/* ... PEI Tab Content ... */}
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">PEI / AEE</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Planos de Ensino Individualizado</p>
                    </header>
                    <div className="mb-12">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3"><Heart size={24} className="text-red-500"/> Meus Alunos em Acompanhamento</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {students.filter(student => filterAEEStudents(student)).map(student => (
                                <div key={student.id} className="bg-[#18181b] border-2 border-white/5 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group hover:border-red-600/30 transition-all flex flex-col">
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg">AEE</div>
                                    
                                    {/* PHOTO & HEADER */}
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="h-28 w-28 rounded-[1.5rem] bg-gray-900 border-2 border-white/10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl relative">
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} className="w-full h-full object-cover"/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                                                    <Users className="text-gray-600" size={32}/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-white text-2xl uppercase tracking-tight leading-none mb-2 line-clamp-2">{String(student.name || '')}</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest bg-white/5 inline-block px-3 py-1 rounded-lg">{String(student.className || '')}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8 flex-1">
                                        {/* DIAGNOSIS */}
                                        <div className="bg-red-950/20 p-5 rounded-2xl border border-red-900/30 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                                            <span className="block text-[9px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">Diagnóstico(s)</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(student.disorders && student.disorders.length > 0) ? (
                                                    student.disorders.map((d, i) => (
                                                        <span key={i} className="text-sm font-black text-white uppercase tracking-tight leading-tight block w-full">• {d}</span>
                                                    ))
                                                ) : (
                                                    <p className="text-lg font-black text-white uppercase tracking-tight leading-tight">{student.disorder || 'Não informado'}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* SKILLS & WEAKNESSES */}
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-900/30 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                <span className="block text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Habilidades</span>
                                                <p className="text-xs font-medium text-gray-300 leading-relaxed">
                                                    {student.skills || 'Não registrado.'}
                                                </p>
                                            </div>
                                            <div className="bg-amber-950/20 p-5 rounded-2xl border border-amber-900/30 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                                <span className="block text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Fragilidades</span>
                                                <p className="text-xs font-medium text-gray-300 leading-relaxed">
                                                    {student.weaknesses || 'Não registrado.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* LAUDO STATUS */}
                                        {student.reportUrl ? (
                                            <a href={student.reportUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-900/10 p-4 rounded-xl border border-green-900/20 hover:bg-green-900/20 transition-all">
                                                <FileCheck size={16}/> Laudo Digital Disponível
                                            </a>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-900/10 p-4 rounded-xl border border-orange-900/20">
                                                <ShieldAlert size={16}/> Laudo Pendente
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => openPEIModal(student)}
                                        className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/30 uppercase text-xs tracking-[0.15em] hover:scale-[1.02]"
                                    >
                                        <Plus size={18}/> Criar PEI
                                    </button>
                                </div>
                            ))}
                            {students.filter(student => filterAEEStudents(student)).length === 0 && (<div className="col-span-full py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-600">Nenhum aluno AEE vinculado às suas turmas</div>)}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3"><BookOpenCheck size={24} className="text-blue-500"/> Documentos PEI</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {peiDocuments.map(pei => (
                                <div key={pei.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative group">
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">PEI Ativo</div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{pei.studentName}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-6">{pei.subject} • {pei.period}</p>
                                    <div className="space-y-3 mb-6"><div className="bg-black/30 p-4 rounded-xl border border-white/5"><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Competências Essenciais</p><p className="text-xs text-gray-300 line-clamp-2">{pei.essentialCompetencies}</p></div></div>
                                    <div className="flex gap-2 pt-4 border-t border-white/5"><button onClick={() => openPEIModal(undefined, pei)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Edit size={14}/> Editar</button><button onClick={() => handleDeletePEI(pei.id)} className="flex-1 py-3 bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Trash2 size={14}/> Excluir</button></div>
                                </div>
                            ))}
                            {peiDocuments.length === 0 && (<div className="col-span-full py-40 text-center opacity-30 font-black uppercase tracking-[0.4em] text-xl text-gray-600">Nenhum PEI encontrado</div>)}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-12 flex justify-between items-center">
                        <div>
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ocorrências</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Registro disciplinar e pedagógico</p>
                        </div>
                        <Button onClick={() => setShowOccurrenceModal(true)} className="bg-red-600 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest"><Plus size={18} className="mr-3"/> Nova Ocorrência</Button>
                    </header>
                    <div className="space-y-6">
                        {teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#18181b] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-3 mb-2"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${occ.category === 'indisciplina' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>{occ.category}</span><span className="text-[10px] text-gray-600 font-black uppercase">{new Date(occ.timestamp).toLocaleDateString()}</span></div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{occ.studentName}</h3><p className="text-xs text-gray-500 mt-2 italic">"{occ.description}"</p>
                                </div>
                                <button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id); }} className="text-gray-600 hover:text-red-500 p-3 bg-white/5 rounded-xl transition-all"><Trash2 size={20}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                    <header className="mb-12"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Frequência</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Chamada diária simplificada</p></header>
                    <div className="bg-[#18181b] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Selecione a Turma</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none" value={attendanceClass} onChange={(e) => { setAttendanceClass(e.target.value); setAttendanceRecords({}); }}>
                                <option value="">-- Escolha uma turma --</option>
                                {getTeacherClasses().map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {attendanceClass && (
                            <div className="space-y-2">
                                {students.filter(s => s.className === attendanceClass).sort((a,b) => a.name.localeCompare(b.name)).map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <span className="font-black text-white uppercase tracking-tight text-sm">{student.name}</span>
                                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                            <button onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: true})} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${attendanceRecords[student.id] === true ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>P</button>
                                            <button onClick={() => setAttendanceRecords({...attendanceRecords, [student.id]: false})} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${attendanceRecords[student.id] === false ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>F</button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={handleSaveAttendance} isLoading={isSaving} className="w-full h-20 bg-red-600 rounded-3xl font-black uppercase tracking-widest shadow-2xl mt-8">Confirmar Chamada</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* --- MODAIS --- */}

        {showOccurrenceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8">Nova Ocorrência</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Turma</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occurrenceClass} onChange={e => setOccurrenceClass(e.target.value)}>
                                <option value="">Selecione...</option>
                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Aluno</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={occurrenceForm.studentId} onChange={e => setOccurrenceForm({...occurrenceForm, studentId: e.target.value})} disabled={!occurrenceClass}>
                                <option value="">Selecione...</option>
                                {students.filter(s => s.className === occurrenceClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Descrição</label>
                            <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]" value={occurrenceForm.description} onChange={e => setOccurrenceForm({...occurrenceForm, description: e.target.value})} />
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setShowOccurrenceModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleSaveOccurrence} className="flex-1 h-14 bg-red-600 rounded-2xl font-black uppercase text-[10px]">Salvar</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showPeiModal && editingPei && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col">
                    <div className="flex justify-between items-center mb-8 shrink-0"><div><h3 className="text-2xl font-black text-white uppercase tracking-tight">Documento PEI</h3><p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{editingPei.studentName}</p></div><button onClick={() => setShowPeiModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button></div>
                    <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-2 gap-6"><div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Disciplina</label><input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600" value={editingPei.subject} onChange={e => setEditingPei({...editingPei, subject: e.target.value})} /></div><div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Período</label><select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600 appearance-none" value={editingPei.period} onChange={e => setEditingPei({...editingPei, period: e.target.value})}><option>1º Bimestre</option><option>2º Bimestre</option><option>3º Bimestre</option><option>4º Bimestre</option></select></div></div>
                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Competências Essenciais</label><textarea rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={editingPei.essentialCompetencies} onChange={e => setEditingPei({...editingPei, essentialCompetencies: e.target.value})} placeholder="O que é essencial que o aluno aprenda neste período?" /></div>
                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Conteúdos Selecionados</label><textarea rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={editingPei.selectedContents} onChange={e => setEditingPei({...editingPei, selectedContents: e.target.value})} placeholder="Quais conteúdos serão trabalhados?" /></div>
                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Recursos Didáticos</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={editingPei.didacticResources} onChange={e => setEditingPei({...editingPei, didacticResources: e.target.value})} placeholder="Materiais adaptados, jogos, tecnologia..." /></div>
                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Avaliação</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={editingPei.evaluation} onChange={e => setEditingPei({...editingPei, evaluation: e.target.value})} placeholder="Como será avaliado o progresso?" /></div>
                    </div>
                    <div className="pt-6 mt-4 border-t border-white/5 shrink-0"><Button onClick={handleSavePEI} isLoading={isSaving} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/20">Salvar Planejamento PEI</Button></div>
                </div>
            </div>
        )}

        {showPlanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className={`bg-[#18181b] border border-white/10 w-full rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 flex flex-col max-h-[95vh] ${newPlan.type !== 'daily' ? 'max-w-6xl' : 'max-w-2xl'}`}>
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${newPlan.type === 'bimester' ? 'bg-blue-600/10 text-blue-500' : newPlan.type === 'inova' ? 'bg-purple-600/10 text-purple-500' : 'bg-red-600/10 text-red-500'}`}>
                                {newPlan.type === 'bimester' ? <BookMarked size={24}/> : newPlan.type === 'inova' ? <Sparkles size={24}/> : <Clock size={24}/>}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Novo Planejamento</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{newPlan.type === 'bimester' ? 'Modelo Institucional Oficial' : newPlan.type === 'inova' ? 'Instrumental 2026 - Inova AI' : 'Registro de Aula'}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowPlanModal(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                    </div>
                    <div className="space-y-8 overflow-y-auto flex-1 custom-scrollbar pr-4 pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Tipo</label>
                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={newPlan.type} onChange={e => setNewPlan({...newPlan, type: e.target.value})}>
                                    <option value="daily">Diário</option>
                                    <option value="bimester">Bimestral (Oficial)</option>
                                    <option value="inova">Inova AI (Instrumental)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Turma</label>
                                <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none" value={newPlan.className} onChange={e => setNewPlan({...newPlan, className: e.target.value})}>
                                    <option value="">Selecionar...</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {newPlan.type === 'daily' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Assunto / Tema</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" value={newPlan.topic} onChange={e => setNewPlan({...newPlan, topic: e.target.value})} placeholder="Tema da aula..." />
                                </div>
                            )}
                            {newPlan.type === 'bimester' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Bimestre</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-600 appearance-none" value={newPlan.bimester} onChange={e => setNewPlan({...newPlan, bimester: e.target.value})}>
                                        <option value="1º BIMESTRE">1º BIMESTRE</option>
                                        <option value="2º BIMESTRE">2º BIMESTRE</option>
                                        <option value="3º BIMESTRE">3º BIMESTRE</option>
                                        <option value="4º BIMESTRE">4º BIMESTRE</option>
                                    </select>
                                </div>
                            )}
                            {newPlan.type === 'inova' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Tema do Subprojeto</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-600" value={newPlan.inovaTheme} onChange={e => setNewPlan({...newPlan, inovaTheme: e.target.value})} placeholder="Tema principal..." />
                                </div>
                            )}
                        </div>
                        {newPlan.type === 'bimester' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Componente Curricular</label><input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600" value={newPlan.topic} onChange={e => setNewPlan({...newPlan, topic: e.target.value})} placeholder="Ex: Matemática" /></div>
                                    <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Breve Justificativa</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.justification} onChange={e => setNewPlan({...newPlan, justification: e.target.value})} placeholder="Descrição da importância dos conceitos..." /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Conteúdos</label><textarea rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.contents} onChange={e => setNewPlan({...newPlan, contents: e.target.value})} placeholder="Descrição dos conteúdos..." /></div>
                                    <div className="space-y-4">
                                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Habilidades Cognitivas</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.cognitiveSkills} onChange={e => setNewPlan({...newPlan, cognitiveSkills: e.target.value})} /></div>
                                        <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Habilidades Socioemocionais</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.socioEmotionalSkills} onChange={e => setNewPlan({...newPlan, socioEmotionalSkills: e.target.value})} /></div>
                                    </div>
                                    <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Situações Didáticas</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.didacticSituations} onChange={e => setNewPlan({...newPlan, didacticSituations: e.target.value})} placeholder="Estratégias para assegurar a aprendizagem..." /></div>
                                </div>
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14}/> Grid de Atividades</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {['Prévias', 'Autodidáticas', 'Didático-Cooperativas', 'Complementares'].map((label, i) => {
                                            const key = i === 0 ? 'activitiesPrevious' : i === 1 ? 'activitiesAutodidactic' : i === 2 ? 'activitiesCooperative' : 'activitiesComplementary';
                                            return (<div key={key}><label className="block text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">{label}</label><textarea rows={6} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-white outline-none focus:border-blue-600" value={newPlan[key as keyof LessonPlan] as string} onChange={e => setNewPlan({...newPlan, [key]: e.target.value})} /></div>);
                                        })}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Práticas Educativas</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.educationalPractices} onChange={e => setNewPlan({...newPlan, educationalPractices: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Espaços Educativos</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.educationalSpaces} onChange={e => setNewPlan({...newPlan, educationalSpaces: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Recursos Didáticos</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.didacticResources} onChange={e => setNewPlan({...newPlan, didacticResources: e.target.value})} /></div>
                                    <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Estratégias de Avaliação</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.evaluationStrategies} onChange={e => setNewPlan({...newPlan, evaluationStrategies: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Fontes de Referência</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" value={newPlan.referenceSources} onChange={e => setNewPlan({...newPlan, referenceSources: e.target.value})} /></div>
                                </div>
                            </div>
                        )}
                        {newPlan.type === 'inova' && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4">
                                <div className="p-6 rounded-3xl bg-red-900/10 border border-red-500/20"><label className="block text-[10px] font-black text-red-500 uppercase mb-2 tracking-widest">2. Questão Norteadora</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-lg font-bold outline-none focus:border-red-600" value={newPlan.guidingQuestion} onChange={e => setNewPlan({...newPlan, guidingQuestion: e.target.value})} placeholder="Que problema real vamos investigar e melhorar?" /></div>
                                <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">3. Objetivo do Subprojeto</label><textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-purple-600" value={newPlan.subprojectGoal} onChange={e => setNewPlan({...newPlan, subprojectGoal: e.target.value})} placeholder="Ao final, os alunos serão capazes de...?" /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">4. Resultados Esperados</h4>
                                        <div className="space-y-3">{['Consciência ambiental/consumo responsável', 'Criatividade e autoria (criar algo)', 'Colaboração e protagonismo', 'Comunicação (apresentar/explicar)', 'Investigação (observação/pesquisa/dados)', 'Uso responsável de tecnologia/IA'].map(opt => (<InovaCheckbox key={opt} label={opt} checked={newPlan.expectedResults?.includes(opt) || false} onChange={(checked) => { const current = newPlan.expectedResults || []; setNewPlan({...newPlan, expectedResults: checked ? [...current, opt] : current.filter(x => x !== opt)}); }} />))}</div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">5. Produto Final</h4>
                                        <div className="grid grid-cols-2 gap-2 mb-4">{['Painel/Cartaz', 'Maquete Digital/Protótipo', 'Experimento', 'Podcast/Vídeo', 'Campanha/Intervenção', 'Seminário'].map(opt => (<label key={opt} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="finalProduct" className="accent-purple-600" checked={newPlan.finalProductType === opt} onChange={() => setNewPlan({...newPlan, finalProductType: opt})} /><span className="text-[9px] font-bold text-gray-400 uppercase">{opt}</span></label>))}</div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">Descrição</label><textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-600" value={newPlan.finalProductDescription} onChange={e => setNewPlan({...newPlan, finalProductDescription: e.target.value})} />
                                    </div>
                                </div>
                                <div className="bg-purple-900/10 border border-purple-500/30 p-8 rounded-[2rem] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={100} className="text-purple-500"/></div>
                                    <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16}/> 9. Uso de IA (Obrigatório)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="block text-[10px] font-black text-purple-300 uppercase mb-2 tracking-widest">Ferramenta(s)</label><input className="w-full bg-black/40 border border-purple-500/20 rounded-xl p-4 text-white font-bold outline-none focus:border-purple-500" value={newPlan.aiTools} onChange={e => setNewPlan({...newPlan, aiTools: e.target.value})} placeholder="ChatGPT, Gemini..." /></div>
                                        <div><label className="block text-[10px] font-black text-purple-300 uppercase mb-2 tracking-widest">Cuidado Adotado</label><input className="w-full bg-black/40 border border-purple-500/20 rounded-xl p-4 text-white text-sm outline-none focus:border-purple-500" value={newPlan.aiCare} onChange={e => setNewPlan({...newPlan, aiCare: e.target.value})} /></div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-purple-300 uppercase mb-2 tracking-widest">Para quê?</label>
                                            <div className="flex flex-wrap gap-3">{['Ideias', 'Roteiro', 'Texto', 'Imagem', 'Vídeo', 'Dados/Gráficos'].map(p => (<label key={p} className={`px-4 py-2 rounded-lg border text-[10px] font-black uppercase cursor-pointer transition-all ${newPlan.aiPurpose?.includes(p) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black/20 border-purple-500/20 text-purple-300'}`}><input type="checkbox" className="hidden" checked={newPlan.aiPurpose?.includes(p) || false} onChange={e => { const current = newPlan.aiPurpose || []; setNewPlan({...newPlan, aiPurpose: e.target.checked ? [...current, p] : current.filter(x => x !== p)}); }} />{p}</label>))}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">7. Cronograma Mínimo</label><textarea rows={6} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs font-mono outline-none focus:border-purple-600" value={newPlan.schedule} onChange={e => setNewPlan({...newPlan, schedule: e.target.value})} /></div>
                                    <div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">8. Recursos Necessários</label><textarea rows={6} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-purple-600" value={newPlan.resourcesNeeded} onChange={e => setNewPlan({...newPlan, resourcesNeeded: e.target.value})} /></div>
                                </div>
                            </div>
                        )}
                        {newPlan.type === 'daily' && (
                            <div className="space-y-6"><div><label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Conteúdo e Metodologia</label><textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-medium outline-none focus:border-red-600 min-h-[300px] text-sm leading-relaxed" value={newPlan.content} onChange={e => setNewPlan({...newPlan, content: e.target.value})} placeholder="Descreva os objetivos e etapas da aula..." /></div></div>
                        )}
                    </div>
                    <div className="pt-8 border-t border-white/5 mt-auto flex justify-end">
                        <Button onClick={handleSavePlan} isLoading={isSaving} className={`w-full md:w-auto px-12 h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl ${newPlan.type === 'bimester' ? 'bg-blue-600 shadow-blue-900/40' : newPlan.type === 'inova' ? 'bg-purple-600 shadow-purple-900/40' : 'bg-red-600 shadow-red-900/40'}`}><Save size={18} className="mr-3"/> Salvar Planejamento</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
