import React, { useState, useEffect, useMemo } from 'react';
import { 
    saveStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    uploadStaffPhoto, 
    listenToStaffMembers, 
    listenToStaffLogs,
    listenToStudents,
    generateStudentCredentials,
    saveStudent,
    deleteStudent
} from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog, UserRole, DailySchoolLog, User, Student } from '../types';
import { Button } from '../components/Button';
import { 
    Users, 
    Search, 
    Edit3, 
    Trash2, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Calendar, 
    Briefcase, 
    Loader2, 
    Save, 
    X, 
    Plus,
    PlusCircle,
    AlertTriangle,
    UserCheck,
    Repeat,
    ArrowRight,
    Layers,
    ShieldCheck,
    Key,
    UserPlus,
    LogIn,
    UserPlus2,
    Check,
    BookOpen,
    Filter,
    CalendarDays,
    Camera,
    Shield,
    RefreshCw,
    GraduationCap,
    Lock
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS, CLASSES, INFANTIL_CLASSES, EFAI_CLASSES } from '../constants';

const EDUCATION_LEVELS = ["INFANTIL", "EFAI", "EFAF", "MÉDIO"];
const POLIVALENTE_CLASSES = [...INFANTIL_CLASSES, ...EFAI_CLASSES];

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'substitutions' | 'subjects' | 'students'>('staff');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Staff Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StaffMember>>({
        name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '', educationLevels: [], classes: [], subject: '', accessLogin: '', password: 'cemal2016'
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Subjects Tab State
    const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
        const saved = localStorage.getItem('hr_custom_subjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [newSubjectName, setNewSubjectName] = useState('');

    // Substitutions State
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [substitutions, setSubstitutions] = useState<Record<string, { present: boolean, substitute?: string }>>({});
    const [extraClasses, setExtraClasses] = useState<Array<{professor: string, subject: string, className: string}>>([]);

    // Attendance/Logs State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [search, setSearch] = useState('');

    // Student Access State
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentClass, setSelectedStudentClass] = useState('');
    const [isGeneratingAccess, setIsGeneratingAccess] = useState(false);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [enrollmentType, setEnrollmentType] = useState<'individual' | 'bulk'>('individual');
    const [enrollFormData, setEnrollFormData] = useState<Partial<Student>>({ id: '', name: '', className: '', isAEE: false });
    const [bulkList, setBulkList] = useState('');

    useEffect(() => {
        const unsub = listenToStaffMembers((data) => {
            setStaffList(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (activeTab === 'attendance') {
            const unsub = listenToStaffLogs(dateFilter, (data) => {
                setLogs(data.sort((a,b) => b.timestamp - a.timestamp));
            });
            return () => unsub();
        }
        if (activeTab === 'students') {
            const unsub = listenToStudents(setStudents);
            return () => unsub();
        }
    }, [activeTab, dateFilter]);

    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setFormData({ 
            ...staff, 
            educationLevels: staff.educationLevels || [], 
            classes: staff.classes || [],
            subject: staff.subject || '',
            accessLogin: staff.accessLogin || '',
            password: staff.password || 'cemal2016',
            email: staff.email || ''
        });
        setPhotoPreview(staff.photoUrl || null);
        setShowForm(true);
    };

    const handleSaveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let photoUrl = formData.photoUrl;
            if (photoFile) photoUrl = await uploadStaffPhoto(photoFile);

            const dataToSave = {
                ...formData,
                id: editingId || '',
                photoUrl: photoUrl || '',
                email: formData.email?.toLowerCase().trim() || '',
                accessLogin: formData.accessLogin?.toUpperCase().trim() || '',
                password: formData.password || 'cemal2016',
                createdAt: formData.createdAt || Date.now(),
            };

            if (editingId) await updateStaffMember(dataToSave as StaffMember);
            else await saveStaffMember(dataToSave as StaffMember);

            setShowForm(false);
            resetForm();
            alert("Colaborador salvo e acesso gerado/atualizado!");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar cadastro de equipe.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ 
            name: '', role: '', active: true, workPeriod: 'morning', 
            isTeacher: false, isAdmin: false, email: '', 
            educationLevels: [], classes: [], subject: '', accessLogin: '', password: 'cemal2016'
        });
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const handleDeleteStaff = async (id: string) => {
        if (!confirm("Deseja realmente excluir este colaborador?")) return;
        try {
            await deleteStaffMember(id);
        } catch (error) {
            alert("Erro ao excluir.");
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const toggleLevel = (level: string) => {
        const current = formData.educationLevels || [];
        const updated = current.includes(level) 
            ? current.filter(l => l !== level) 
            : [...current, level];
        setFormData({ ...formData, educationLevels: updated });
    };

    const toggleClass = (className: string) => {
        const current = formData.classes || [];
        const updated = current.includes(className) 
            ? current.filter(c => c !== className) 
            : [...current, className];
        setFormData({ ...formData, classes: updated });
    };

    const handleResetPassword = () => {
        if (confirm("Deseja redefinir a senha deste colaborador para a senha padrão 'cemal2016'?")) {
            setFormData(prev => ({ ...prev, password: 'cemal2016' }));
            alert("Senha alterada localmente. Clique em 'SALVAR REGISTRO' para confirmar no banco de dados.");
        }
    };

    // --- LOGS E SUBSTITUIÇÕES ---
    const teachers = useMemo(() => staffList.filter(s => s.isTeacher && s.active), [staffList]);

    const toggleTeacherPresence = (teacherId: string) => {
        setSubstitutions(prev => {
            const current = prev[teacherId] || { present: true };
            return { ...prev, [teacherId]: { ...current, present: !current.present, substitute: !current.present ? undefined : current.substitute } };
        });
    };

    const setTeacherSubstitute = (teacherId: string, subName: string) => {
        setSubstitutions(prev => ({
            ...prev,
            [teacherId]: { ...prev[teacherId], substitute: subName }
        }));
    };

    const handleAddExtraClass = () => {
        setExtraClasses([...extraClasses, { professor: '', subject: '', className: '' }]);
    };

    // --- DISCIPLINAS ---
    const handleAddSubject = () => {
        if (!newSubjectName.trim()) return;
        const updated = [...customSubjects, newSubjectName.toUpperCase().trim()];
        setCustomSubjects(updated);
        localStorage.setItem('hr_custom_subjects', JSON.stringify(updated));
        setNewSubjectName('');
    };

    const handleRemoveSubject = (idx: number) => {
        const updated = customSubjects.filter((_, i) => i !== idx);
        setCustomSubjects(updated);
        localStorage.setItem('hr_custom_subjects', JSON.stringify(updated));
    };

    // --- ALUNOS ---
    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (enrollmentType === 'individual') {
                if (!enrollFormData.id || !enrollFormData.name || !enrollFormData.className) return alert("Preencha todos os campos.");
                await saveStudent({
                    ...enrollFormData,
                    id: enrollFormData.id.toUpperCase(),
                    name: enrollFormData.name.toUpperCase(),
                    className: enrollFormData.className,
                    classId: enrollFormData.className,
                    isAEE: !!enrollFormData.isAEE
                } as Student);
                alert("Aluno matriculado!");
            } else {
                if (!enrollFormData.className || !bulkList.trim()) return alert("Selecione a turma e forneça os nomes.");
                const names = bulkList.split('\n').map(n => n.trim()).filter(n => n);
                for (const name of names) {
                    const id = Math.random().toString(36).substring(7).toUpperCase();
                    await saveStudent({
                        id,
                        name: name.toUpperCase(),
                        classId: enrollFormData.className,
                        className: enrollFormData.className,
                        isAEE: false
                    } as Student);
                }
                alert(`${names.length} alunos matriculados em lote!`);
            }
            setShowEnrollmentModal(false);
            setEnrollFormData({ id: '', name: '', className: '', isAEE: false });
            setBulkList('');
        } catch (err) { alert("Erro ao matricular."); } finally { setIsLoading(false); }
    };

    const handleGenerateAccess = async (studentId: string) => {
        setIsGeneratingAccess(true);
        try {
            await generateStudentCredentials(studentId);
            alert("Acesso gerado com sucesso!");
        } catch (e: any) { alert("Erro ao gerar acesso: " + e.message); } finally { setIsGeneratingAccess(false); }
    };

    const filteredStudents = students.filter(s => {
        const nameMatch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase());
        const classMatch = selectedStudentClass ? s.className === selectedStudentClass : true;
        return nameMatch && classMatch;
    }).sort((a,b) => (a.name || '').localeCompare(b.name || ''));

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0a0a0b]">
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-[#121214] border-r border-white/5 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-8">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2">Menu RH</p>
                    <SidebarItem id="staff" label="Equipe" icon={Users} />
                    <SidebarItem id="attendance" label="Ponto Facial" icon={Clock} />
                    <SidebarItem id="substitutions" label="Substituições" icon={Repeat} />
                    <SidebarItem id="subjects" label="Disciplinas" icon={Layers} />
                    <SidebarItem id="students" label="Acessos Alunos" icon={ShieldCheck} />
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Colaboradores</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Cadastro institucional</p>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 px-8 rounded-2xl h-14 font-black uppercase text-xs shadow-xl shadow-red-900/40">
                                <Plus size={18} className="mr-2"/> Novo Registro
                            </Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <div className="p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">{staffList.length} Cadastros</span>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Colaborador</th><th className="p-8">Cargo</th><th className="p-8">Status</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {staffList.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase())).map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                                                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2 text-gray-700"/>}
                                                    </div>
                                                    <span className="font-black text-white uppercase text-sm">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-8 text-gray-400 font-bold uppercase text-xs tracking-widest">{s.role}</td>
                                            <td className="p-8">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${s.active ? 'bg-green-600/10 text-green-500 border-green-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                    {s.active ? 'ATIVO' : 'DESLIGADO'}
                                                </span>
                                            </td>
                                            <td className="p-8 text-right">
                                                <button onClick={() => handleEdit(s)} className="p-2 text-gray-500 hover:text-white"><Edit3 size={18}/></button>
                                                <button onClick={() => handleDeleteStaff(s.id)} className="p-2 text-gray-500 hover:text-red-500 ml-2"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Histórico de Ponto</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Relatório unificado de entradas e saídas</p>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl">
                                <Calendar className="text-red-600" size={18} />
                                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                            </div>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Colaborador</th><th className="p-8">Horário</th><th className="p-8">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/[0.02]">
                                            <td className="p-8 font-black text-white text-sm">{log.staffName}</td>
                                            <td className="p-8 text-red-500 font-black">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                            <td className="p-8">
                                                <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-3 py-1 rounded-full text-[9px] font-black">{log.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                             {logs.length === 0 && <div className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-20">Sem registros para esta data</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'substitutions' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-6xl mx-auto pb-40">
                         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Substituições e Extras</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Log diário de faltas e aulas extraordinárias</p>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl">
                                <CalendarDays className="text-red-600" size={18} />
                                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* FALTAS / SUBSTITUIÇÕES */}
                            <section className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                                    <AlertTriangle className="text-yellow-500" size={24}/> Faltas do Dia
                                </h3>
                                <div className="space-y-4">
                                    {teachers.map(teacher => (
                                        <div key={teacher.id} className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => toggleTeacherPresence(teacher.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${substitutions[teacher.id]?.present === false ? 'bg-red-600 text-white shadow-lg' : 'bg-green-600/10 text-green-500'}`}>
                                                        {substitutions[teacher.id]?.present === false ? <XCircle size={20}/> : <UserCheck size={20}/>}
                                                    </button>
                                                    <span className="font-black text-white uppercase text-xs">{teacher.name}</span>
                                                </div>
                                                {substitutions[teacher.id]?.present === false && (
                                                    <div className="flex-1 ml-6 relative">
                                                        <select 
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-bold appearance-none outline-none focus:border-red-600"
                                                            onChange={(e) => setTeacherSubstitute(teacher.id, e.target.value)}
                                                            value={substitutions[teacher.id]?.substitute || ''}
                                                        >
                                                            <option value="">Sem substituto</option>
                                                            {staffList.filter(s => s.id !== teacher.id && s.active).map(s => (
                                                                <option key={s.id} value={s.name}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* AULAS EXTRAS */}
                            <section className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <PlusCircle className="text-blue-500" size={24}/> Aulas Extras
                                    </h3>
                                    <button onClick={handleAddExtraClass} className="p-3 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-600/20"><Plus size={18}/></button>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {extraClasses.map((ex, idx) => (
                                        <div key={idx} className="grid grid-cols-3 gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <select className="bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white font-black" value={ex.professor} onChange={e => { const list = [...extraClasses]; list[idx].professor = e.target.value; setExtraClasses(list); }}>
                                                <option>Professor</option>
                                                {staffList.filter(s => s.isTeacher).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            <input className="bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white font-black uppercase" placeholder="Turma" value={ex.className} onChange={e => { const list = [...extraClasses]; list[idx].className = e.target.value.toUpperCase(); setExtraClasses(list); }} />
                                            <div className="relative">
                                                <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white font-black uppercase" placeholder="Matéria" value={ex.subject} onChange={e => { const list = [...extraClasses]; list[idx].subject = e.target.value.toUpperCase(); setExtraClasses(list); }} />
                                                <button onClick={() => setExtraClasses(extraClasses.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg"><X size={10}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-xs mt-8 shadow-xl shadow-blue-900/40"><Save size={18} className="mr-3"/> Salvar Log do Dia</Button>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'subjects' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Disciplinas</h1>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gerencie as matérias disponíveis no sistema</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <section className="lg:col-span-1 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl h-fit">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">Adicionar Matéria</h3>
                                <div className="space-y-4">
                                    <input 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black uppercase text-xs focus:border-red-600 outline-none transition-all"
                                        placeholder="EX: ROBÓTICA"
                                        value={newSubjectName}
                                        onChange={e => setNewSubjectName(e.target.value)}
                                    />
                                    <Button onClick={handleAddSubject} className="w-full h-14 bg-red-600 rounded-xl font-black uppercase text-xs shadow-lg"><Plus size={18} className="mr-2"/> Adicionar</Button>
                                </div>
                            </section>

                            <section className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                                <div className="mb-8 flex justify-between items-center">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Disciplinas Cadastradas</h3>
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">Customizadas: {customSubjects.length}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {customSubjects.map((sub, idx) => (
                                        <div key={idx} className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-red-600/30 transition-all">
                                            <span className="text-[10px] font-black text-white uppercase tracking-tight">{sub}</span>
                                            <button onClick={() => handleRemoveSubject(idx)} className="text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {customSubjects.length === 0 && (
                                        <div className="col-span-full py-20 text-center text-gray-700 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                            <Layers size={40} className="mx-auto mb-4"/>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma disciplina customizada</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-12 pt-8 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6">Disciplinas Base do Sistema (Fixas)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[...new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS])].slice(0, 12).map((sub, i) => (
                                            <div key={i} className="bg-white/5 px-4 py-2 rounded-lg text-[9px] font-bold text-gray-500 uppercase tracking-tight border border-white/5 line-clamp-1">{sub}</div>
                                        ))}
                                        <div className="bg-white/5 px-4 py-2 rounded-lg text-[9px] font-bold text-gray-600 uppercase tracking-tight italic border border-white/5">E outras...</div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acessos Alunos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gestão de credenciais do portal</p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Button onClick={() => { setEnrollmentType('individual'); setShowEnrollmentModal(true); }} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest h-14 px-8 rounded-2xl shadow-xl shadow-orange-900/40">
                                    <UserPlus size={18} className="mr-2"/> Matrícula Individual
                                </Button>
                                <Button onClick={() => { setEnrollmentType('bulk'); setShowEnrollmentModal(true); }} className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest h-14 px-8 rounded-2xl transition-all">
                                    <UserPlus2 size={18} className="mr-2"/> Matrícula em Lote
                                </Button>
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5">
                                <div className="flex gap-4 w-full md:w-auto flex-1">
                                    <div className="relative flex-1 max-w-md group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" size={18} />
                                        <input className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar aluno..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                                    </div>
                                    <select 
                                        className="bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest outline-none focus:border-red-600 appearance-none min-w-[180px]"
                                        value={selectedStudentClass}
                                        onChange={e => setSelectedStudentClass(e.target.value)}
                                    >
                                        <option value="">Todas as Turmas</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">{filteredStudents.length} Alunos na Base</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-8">Aluno / Turma</th>
                                            <th className="p-8">Login (Código)</th>
                                            <th className="p-8">Acesso</th>
                                            <th className="p-8 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-8">
                                                    <p className="font-black text-white uppercase text-sm tracking-tight">{student.name}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{student.className}</p>
                                                </td>
                                                <td className="p-8 font-mono text-blue-400 font-black text-lg tracking-widest">{student.accessLogin || '---'}</td>
                                                <td className="p-8">
                                                    {student.hasAccess ? (
                                                        <span className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
                                                            <CheckCircle size={14}/> Ativado
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                                            <XCircle size={14}/> Pendente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleGenerateAccess(student.id)}
                                                            disabled={isGeneratingAccess}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[9px] tracking-widest rounded-xl transition-all shadow-lg"
                                                        >
                                                            {isGeneratingAccess ? <Loader2 size={12} className="animate-spin"/> : <Key size={12}/>}
                                                            {student.hasAccess ? 'Reset PIN' : 'Ativar'}
                                                        </button>
                                                        <button 
                                                            onClick={async () => { if(confirm(`Excluir ${student.name}?`)) await deleteStudent(student.id); }}
                                                            className="p-3 bg-white/5 hover:bg-red-600/10 text-gray-600 hover:text-red-500 rounded-xl transition-all border border-white/5"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* STAFF FORM MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-5xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                                    {editingId ? 'EDITAR REGISTRO' : 'NOVO COLABORADOR'}
                                </h2>
                                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">
                                    GESTÃO INSTITUCIONAL DE RH
                                </p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSaveStaff} className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Coluna 1: Informações Básicas e Acesso */}
                                <div className="space-y-8">
                                    <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3 mb-4 text-red-500">
                                            <Users size={20}/>
                                            <h4 className="text-xs font-black uppercase tracking-widest">Dados Pessoais</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                            <input required className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="Nome do Colaborador" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cargo / Função</label>
                                            <input required className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600 transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value.toUpperCase()})} placeholder="EX: PROFESSOR DE ARTE" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Período de Trabalho</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-red-600" value={formData.workPeriod} onChange={e => setFormData({...formData, workPeriod: e.target.value as any})}>
                                                <option value="morning">Matutino</option>
                                                <option value="afternoon">Vespertino</option>
                                                <option value="full">Integral / Full</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 p-8 rounded-[2rem] border-2 border-blue-600/30 shadow-[0_0_20px_rgba(37,99,235,0.1)] space-y-6">
                                        <div className="flex items-center gap-3 mb-4 text-blue-500">
                                            <Shield size={20}/>
                                            <h4 className="text-xs font-black uppercase tracking-widest">Acesso ao Sistema</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                            <input required type="email" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-medium outline-none focus:border-blue-600 transition-all text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase().trim()})} placeholder="nome@cemal.com" />
                                        </div>
                                        <div className="pt-4">
                                            <button 
                                                type="button"
                                                onClick={handleResetPassword}
                                                className="w-full flex items-center justify-center gap-3 bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-600/20 py-5 rounded-2xl text-blue-400 font-black uppercase text-[10px] tracking-widest transition-all shadow-lg"
                                            >
                                                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""}/> 
                                                Redefinir Senha (PADRÃO: CEMAL2016)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna 2: Foto e Perfil Acadêmico */}
                                <div className="space-y-8">
                                    <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 flex flex-col items-center">
                                        <div className="flex items-center gap-3 self-start mb-6 text-yellow-500">
                                            <Camera size={20}/>
                                            <h4 className="text-xs font-black uppercase tracking-widest">Biometria Facial (Ponto)</h4>
                                        </div>
                                        <div className="relative group">
                                            <div className="h-48 w-48 rounded-[2.5rem] bg-black/60 border-4 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">
                                                {photoPreview ? (
                                                    <img src={photoPreview} className="h-full w-full object-cover animate-in fade-in" alt="Preview"/>
                                                ) : (
                                                    <Users size={64} className="text-gray-800"/>
                                                )}
                                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                                                    <Camera size={32} className="text-white mb-2"/>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar Foto</span>
                                                    <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                                                </label>
                                            </div>
                                            {photoPreview && (
                                                <button onClick={(e) => { e.preventDefault(); setPhotoFile(null); setPhotoPreview(null); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                                                    <X size={14}/>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-6 text-center leading-relaxed">
                                            A foto será utilizada para o reconhecimento facial<br/>no terminal de ponto da equipe.
                                        </p>
                                    </div>

                                    <div className="bg-black/20 p-8 rounded-[2rem] border border-white/5 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-red-500">
                                                <BookOpen size={20}/>
                                                <h4 className="text-xs font-black uppercase tracking-widest">Perfil Acadêmico</h4>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.isTeacher ? 'bg-red-600 border-red-600 shadow-lg' : 'border-white/10 bg-black/40 group-hover:border-red-600'}`}>
                                                        {formData.isTeacher && <Check size={14} className="text-white"/>}
                                                        <input type="checkbox" className="hidden" checked={formData.isTeacher} onChange={e => setFormData({...formData, isTeacher: e.target.checked})} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">Docente</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.isAdmin ? 'bg-blue-600 border-blue-600 shadow-lg' : 'border-white/10 bg-black/40 group-hover:border-blue-600'}`}>
                                                        {formData.isAdmin && <Check size={14} className="text-white"/>}
                                                        <input type="checkbox" className="hidden" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">ADM</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.isTeacher && (
                                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplina Principal</label>
                                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-red-600" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                                                        <option value="">Selecione...</option>
                                                        {[...new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS, ...customSubjects])].sort().map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {formData.subject === "POLIVALENTE (INFANTIL/EFAI)" && (
                                                    <div className="space-y-3 animate-in zoom-in-95 duration-200">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                            <GraduationCap size={14} className="text-blue-500"/> Seleção de Turmas (Jardim ao 5º Ano)
                                                        </label>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                            {POLIVALENTE_CLASSES.map(cls => (
                                                                <button 
                                                                    key={cls}
                                                                    type="button"
                                                                    onClick={() => toggleClass(cls)}
                                                                    className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all ${formData.classes?.includes(cls) ? 'bg-blue-600/10 border-blue-600 text-blue-500 shadow-md' : 'bg-black/40 border-white/5 text-gray-700 hover:border-white/20'}`}
                                                                >
                                                                    {cls}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nível de Ensino</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {EDUCATION_LEVELS.map(level => (
                                                            <button 
                                                                key={level}
                                                                type="button"
                                                                onClick={() => toggleLevel(level)}
                                                                className={`px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${formData.educationLevels?.includes(level) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-black/40 border-white/5 text-gray-700 hover:border-white/20'}`}
                                                            >
                                                                {level}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             </div>

                             <div className="pt-8 border-t border-white/5 flex gap-4">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-20 rounded-[2rem] font-black uppercase tracking-widest text-sm border-2">Cancelar</Button>
                                <Button type="submit" isLoading={isLoading} className="flex-1 h-20 bg-red-600 hover:bg-red-700 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-900/40 text-sm">
                                    <Save size={24} className="mr-3"/> Salvar Registro
                                </Button>
                             </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* MODAL MATRÍCULA ALUNOS - MANTIDO DO CÓDIGO ORIGINAL */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Nova Matrícula Portal</h3>
                                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest mt-1">
                                    {enrollmentType === 'individual' ? 'Registro Único' : 'Importação em Lote'}
                                </p>
                            </div>
                            <button onClick={() => setShowEnrollmentModal(false)} className="text-gray-500 hover:text-white transition-colors p-2"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleEnroll} className="p-10 space-y-8">
                            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 mb-4">
                                <button type="button" onClick={() => setEnrollmentType('individual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'individual' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Individual</button>
                                <button type="button" onClick={() => setEnrollmentType('bulk')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${enrollmentType === 'bulk' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Em Lote</button>
                            </div>

                            {enrollmentType === 'individual' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">ID / Matrícula</label>
                                            <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all uppercase" value={enrollFormData.id} onChange={e => setEnrollFormData({...enrollFormData, id: e.target.value})} placeholder="EX: 2024001" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma</label>
                                            <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-orange-500" value={enrollFormData.className} onChange={e => setEnrollFormData({...enrollFormData, className: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                                        <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all uppercase" value={enrollFormData.name} onChange={e => setEnrollFormData({...enrollFormData, name: e.target.value})} placeholder="NOME DO ALUNO" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino</label>
                                        <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-orange-500" value={enrollFormData.className} onChange={e => setEnrollFormData({...enrollFormData, className: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Lista de Nomes (Um por linha)</label>
                                        <textarea required className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-white font-bold outline-none focus:border-orange-500 transition-all h-48 uppercase" value={bulkList} onChange={e => setBulkList(e.target.value)} placeholder="JOÃO SILVA&#10;MARIA OLIVEIRA..." />
                                    </div>
                                </div>
                            )}

                            <Button type="submit" isLoading={isLoading} className="w-full h-20 bg-orange-600 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-900/40 text-sm">
                                <Check size={24} className="mr-3"/> Confirmar Matrícula
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};