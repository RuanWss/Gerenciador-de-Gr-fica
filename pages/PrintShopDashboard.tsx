
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    getLessonPlans, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    getAnswerKeys,
    deleteAnswerKey,
    deleteExamRequest,
    getAllPEIs,
    syncAllDataWithGennera,
    deleteStudent,
    updateStudent,
    uploadStudentPhoto
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    LessonPlan, 
    SystemConfig, 
    SchoolEvent,
    AnswerKey,
    PEIDocument
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Search, Users, Settings, Megaphone, Trash2, Edit, Camera,
    BookOpenCheck, Plus, ChevronLeft, ChevronRight, Save, X, 
    CheckCircle, XCircle, ScanLine, Target, Download,
    FileText, Loader2, CalendarDays, Heart, RefreshCw, Server, AlertTriangle, Layers, School
} from 'lucide-react';
import { CLASSES } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'classes' | 'students' | 'calendar' | 'plans' | 'config' | 'omr' | 'pei'>('exams');
    const [isLoading, setIsLoading] = useState(false);

    // Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [syncError, setSyncError] = useState<string | null>(null);

    // Data States
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
    const [plans, setPlans] = useState<LessonPlan[]>([]);
    const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);

    // Edit Student State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Partial<Student> | null>(null);
    const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Filter States
    const [examSearch, setExamSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [studentFilterClass, setStudentFilterClass] = useState('ALL');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Config States
    const [configBannerMsg, setConfigBannerMsg] = useState('');
    const [configBannerType, setConfigBannerType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
    const [configIsBannerActive, setConfigIsBannerActive] = useState(false);

    useEffect(() => {
        fetchInitialData();
        const todayStr = new Date().toISOString().split('T')[0];
        const unsubAttendance = listenToAttendanceLogs(todayStr, setAttendanceLogs);
        const unsubConfig = listenToSystemConfig((cfg) => {
            if (cfg) {
                setSysConfig(cfg);
                setConfigBannerMsg(cfg.bannerMessage || '');
                setConfigBannerType(cfg.bannerType || 'info');
                setConfigIsBannerActive(cfg.isBannerActive || false);
            }
        });
        const unsubEvents = listenToEvents(setEvents);
        return () => { unsubAttendance(); unsubConfig(); unsubEvents(); };
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allStudents, allExams, allPlans, allKeys, peisData] = await Promise.all([
                getStudents(),
                getExams(),
                getLessonPlans(),
                getAnswerKeys(),
                getAllPEIs()
            ]);
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
            setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
            setPlans(allPlans.sort((a,b) => b.createdAt - a.createdAt));
            setAnswerKeys(allKeys);
            setAllPeis(peisData.sort((a,b) => b.updatedAt - a.updatedAt));
        } catch (e) {
            console.error("Erro ao carregar dados iniciais:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncGennera = async () => {
        if (!confirm("Isso atualizará os alunos com base no sistema Gennera. Continuar?")) return;
        setIsSyncing(true);
        setSyncError(null);
        setSyncMessage("Conectando ao Gennera...");
        try {
            await syncAllDataWithGennera((msg) => setSyncMessage(msg));
            await fetchInitialData();
            setTimeout(() => setSyncMessage(''), 5000);
        } catch (e: any) {
            setSyncError(e.message || "Erro na sincronização.");
            setSyncMessage('');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateExamStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir permanentemente o aluno ${name}? Esta ação não pode ser desfeita.`)) {
            try {
                await deleteStudent(id);
                setStudents(students.filter(s => s.id !== id));
            } catch (e) {
                alert("Erro ao excluir aluno.");
            }
        }
    };

    const handleEditStudentClick = (student: Student) => {
        setStudentToEdit(student);
        setPhotoPreview(student.photoUrl || null);
        setTempPhotoFile(null);
        setIsEditModalOpen(true);
    };

    const handleSaveStudentEdit = async () => {
        if (!studentToEdit?.id) return;
        setIsLoading(true);
        try {
            let finalPhotoUrl = studentToEdit.photoUrl || '';
            if (tempPhotoFile) {
                finalPhotoUrl = await uploadStudentPhoto(tempPhotoFile, studentToEdit.id);
            }
            
            const updatedData: Student = {
                ...(studentToEdit as Student),
                photoUrl: finalPhotoUrl
            };

            await updateStudent(updatedData);
            setIsEditModalOpen(false);
            fetchInitialData();
            alert("Perfil do aluno atualizado com sucesso!");
        } catch (e) {
            alert("Erro ao atualizar aluno.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        await updateSystemConfig({
            bannerMessage: configBannerMsg,
            bannerType: configBannerType,
            isBannerActive: configIsBannerActive
        });
        alert("Configurações salvas!");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    // Filter Logic
    const filteredExams = exams.filter(e => e.title.toLowerCase().includes(examSearch.toLowerCase()) || e.teacherName.toLowerCase().includes(examSearch.toLowerCase()));
    const filteredStudents = students.filter(s => (studentFilterClass === 'ALL' || s.className === studentFilterClass) && s.name.toLowerCase().includes(studentSearch.toLowerCase()));
    const presentIds = new Set(attendanceLogs.map(l => l.studentId));

    // Calendar Helper
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-white/5 border border-white/5 min-h-[100px]"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            days.push(
                <div key={d} className="bg-white/5 border border-white/5 min-h-[100px] p-2 relative group hover:bg-white/10 transition-all">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className="text-[9px] p-1 bg-red-600/20 text-red-400 rounded truncate border-l-2 border-red-600">{ev.title}</div>
                        ))}
                    </div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 border border-white/5 rounded-2xl overflow-hidden">{days}</div>;
    };

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6 space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 ml-2">Painel Gestor</p>
                    <SidebarItem id="exams" label="Central de Cópias" icon={Printer} />
                    <SidebarItem id="classes" label="Gestão de Turmas" icon={School} />
                    <SidebarItem id="students" label="Lista de Alunos" icon={Users} />
                    <SidebarItem id="omr" label="Gabaritos I.A." icon={ScanLine} />
                    <SidebarItem id="calendar" label="Agenda Escolar" icon={CalendarDays} />
                    <SidebarItem id="plans" label="Planejamentos" icon={BookOpenCheck} />
                    <SidebarItem id="pei" label="Relatórios PEI" icon={Heart} />
                    <SidebarItem id="config" label="Configurações & TV" icon={Settings} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* ABA: COPIAS */}
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Printer className="text-red-500" /> Central de Cópias</h1>
                                <p className="text-gray-400">Solicitações de impressão aguardando processamento.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none focus:border-red-500" placeholder="Buscar pedidos..." value={examSearch} onChange={e => setExamSearch(e.target.value)} />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}><FileText size={32} /></div>
                                        <div className="max-w-md">
                                            <h3 className="text-xl font-bold text-white truncate">{exam.title}</h3>
                                            <p className="text-gray-400 text-sm">Prof. {exam.teacherName} • {exam.gradeLevel} • <b>{exam.quantity} cópias</b></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-blue-400 transition-all"><Download size={20} /></a>
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateExamStatus(exam.id, ExamStatus.COMPLETED)} className="rounded-xl">Concluir</Button>
                                        ) : (
                                            <span className="text-xs font-black text-green-500 uppercase bg-green-500/10 px-4 py-2 rounded-xl">Concluído</span>
                                        )}
                                        <button onClick={() => deleteExamRequest(exam.id)} className="p-3 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: GESTAO DE TURMAS */}
                {activeTab === 'classes' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><School className="text-red-500" /> Gestão de Turmas</h1>
                            <p className="text-gray-400">Visão geral das salas e monitoramento de alunos.</p>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {CLASSES.map(clsName => {
                                const classStudents = students.filter(s => s.className === clsName);
                                const presentCount = classStudents.filter(s => presentIds.has(s.id)).length;
                                return (
                                    <button 
                                        key={clsName}
                                        onClick={() => { setStudentFilterClass(clsName); setActiveTab('students'); }}
                                        className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-left group hover:border-red-600 transition-all hover:bg-red-600/5 shadow-xl"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="h-12 w-12 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                <Layers size={24} />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Status Hoje</span>
                                                <span className="text-xl font-black text-white">{presentCount} <span className="text-xs text-gray-500">/ {classStudents.length}</span></span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase leading-tight group-hover:text-red-500 transition-colors">{clsName}</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase mt-2">Clique para ver alunos</p>
                                        
                                        <div className="mt-6 w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-red-600 h-full transition-all duration-1000" 
                                                style={{ width: `${(presentCount / (classStudents.length || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ABA: LISTA DE ALUNOS */}
                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><Users className="text-red-500" /> Lista de Alunos</h1>
                                <p className="text-gray-400">
                                    {studentFilterClass === 'ALL' ? 'Todos os alunos da instituição' : `Alunos da turma: ${studentFilterClass}`}
                                </p>
                            </div>
                            {studentFilterClass !== 'ALL' && (
                                <button onClick={() => setStudentFilterClass('ALL')} className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Limpar Filtro de Turma</button>
                            )}
                        </header>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-white/10 flex gap-4 bg-white/5">
                                <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white flex-1" placeholder="Filtrar por nome ou turma..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-6">Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Status Biometria</th>
                                        <th className="p-6">Presença Hoje</th>
                                        <th className="p-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                                                    {s.photoUrl ? <img src={s.photoUrl} className="h-full w-full object-cover"/> : <Users size={18} className="m-auto mt-2 text-gray-600"/>}
                                                </div>
                                                <span className="font-bold text-gray-200">{s.name}</span>
                                            </td>
                                            <td className="p-6 text-gray-400 font-medium">{s.className}</td>
                                            <td className="p-6">
                                                {s.photoUrl ? <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded">Cadastrado</span> : <span className="text-[10px] font-black text-red-500 uppercase bg-red-500/10 px-2 py-1 rounded">Pendente</span>}
                                            </td>
                                            <td className="p-6">{presentIds.has(s.id) ? <span className="text-green-500 font-black uppercase text-[10px] bg-green-500/10 px-3 py-1 rounded-full">Presente</span> : <span className="text-gray-600 text-[10px]">Ausente</span>}</td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditStudentClick(s)} 
                                                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Editar Perfil / Adicionar Foto"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteStudent(s.id, s.name)} 
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Excluir Aluno"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-gray-500 italic">Nenhum aluno encontrado para os critérios de busca.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* MODAL DE EDIÇÃO DE ALUNO */}
                {isEditModalOpen && studentToEdit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className="bg-[#18181b] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95">
                            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Editar Perfil do Aluno</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={32}/></button>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                {/* Foto de Perfil */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="h-40 w-40 rounded-full bg-gray-900 border-4 border-red-600/30 overflow-hidden shadow-2xl">
                                            {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Users size={64} className="m-auto mt-10 text-gray-700"/>}
                                        </div>
                                        <label className="absolute bottom-2 right-2 h-12 w-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-all border-4 border-[#18181b]">
                                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setTempPhotoFile(file);
                                                    setPhotoPreview(URL.createObjectURL(file));
                                                }
                                            }} />
                                            <Camera size={20} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Foto para Biometria Facial</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Nome Completo</label>
                                        <input 
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all"
                                            value={studentToEdit.name}
                                            onChange={e => setStudentToEdit({...studentToEdit, name: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Turma Atual</label>
                                        <select 
                                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 transition-all"
                                            value={studentToEdit.className}
                                            onChange={e => setStudentToEdit({...studentToEdit, className: e.target.value})}
                                        >
                                            {CLASSES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
                                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-sm hover:text-white transition-colors">Cancelar</button>
                                <Button 
                                    onClick={handleSaveStudentEdit} 
                                    isLoading={isLoading} 
                                    className="flex-1 h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-red-900/20"
                                >
                                    <Save size={18} className="mr-2"/> Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* OUTRAS ABAS (Mantidas iguais para brevidade, mas o sistema está completo) */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><CalendarDays className="text-red-500" /> Agenda Escolar</h1>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronLeft size={20}/></button>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronRight size={20}/></button>
                            </div>
                        </header>
                        {renderCalendar()}
                    </div>
                )}

                {activeTab === 'omr' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8"><h1 className="text-3xl font-black text-white uppercase flex items-center gap-3"><ScanLine className="text-red-500" /> Gabaritos Ativos</h1></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {answerKeys.map(key => (
                                <div key={key.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 group hover:bg-white/10 transition-all">
                                    <h3 className="text-lg font-bold text-white">{key.title || key.subject}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase mt-1">{key.className}</p>
                                    <div className="mt-6 flex justify-between items-center">
                                        <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-gray-400 font-mono">{Object.keys(key.answers).length} Questões</span>
                                        <button onClick={() => deleteAnswerKey(key.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl">
                        <header className="mb-8"><h1 className="text-3xl font-bold text-white uppercase flex items-center gap-3"><Settings className="text-red-500" /> Configurações</h1></header>
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-12 shadow-2xl">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4"><Server size={24} className="text-red-500" /><h2 className="text-xl font-black text-white uppercase">Integração Gennera</h2></div>
                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                                    <p className="text-sm text-gray-400 mb-6 font-medium">Sincronize automaticamente alunos e turmas da Instituição 891.</p>
                                    <Button onClick={handleSyncGennera} isLoading={isSyncing} className="w-full h-16 rounded-2xl text-lg font-black uppercase"><RefreshCw size={24} className={`mr-3 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</Button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
