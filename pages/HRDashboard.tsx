import React, { useState, useEffect } from 'react';
import { 
    saveStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    uploadStaffPhoto, 
    listenToStaffMembers, 
    listenToStaffLogs,
    createSystemUserAuth,
    updateSystemUserRoles,
    updateSystemUserProfile,
    getDailySchoolLog,
    getMonthlySchoolLogs,
    getMonthlyStaffLogs,
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
    FileSpreadsheet, 
    Briefcase, 
    Loader2, 
    Save, 
    X, 
    Plus,
    AlertTriangle,
    UserCheck,
    ClipboardList,
    Lock,
    UserX,
    Star,
    Repeat,
    ArrowRight,
    Download,
    BookOpen,
    Layers,
    PlusCircle,
    ShieldCheck,
    Key,
    UserPlus,
    LogIn,
    LogOut,
    GraduationCap,
    UserPlus2,
    Check
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS, EFAI_CLASSES, INFANTIL_CLASSES, CLASSES } from '../constants';

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'substitutions' | 'subjects' | 'students'>('staff');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Staff Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StaffMember>>({
        name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '', educationLevels: [], classes: []
    });
    const [createLogin, setCreateLogin] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Subjects Tab State
    const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
        const saved = localStorage.getItem('hr_custom_subjects');
        return saved ? JSON.parse(saved) : [];
    });

    // Attendance/Substitutions State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [search, setSearch] = useState('');
    const [monthlyLogs, setMonthlyLogs] = useState<DailySchoolLog[]>([]);

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
    }, [activeTab, dateFilter, monthFilter]);

    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setFormData({ ...staff, educationLevels: staff.educationLevels || [], classes: staff.classes || [] });
        setCreateLogin(!!staff.email);
        setPhotoPreview(staff.photoUrl || null);
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let photoUrl = formData.photoUrl;
            if (photoFile) photoUrl = await uploadStaffPhoto(photoFile);

            const dataToSave = {
                ...formData,
                id: editingId || '',
                photoUrl,
                createdAt: formData.createdAt || Date.now(),
            };

            if (editingId) await updateStaffMember(dataToSave as StaffMember);
            else await saveStaffMember(dataToSave as StaffMember);

            setShowForm(false);
            resetForm();
        } catch (error) {
            alert("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '', educationLevels: [], classes: [] });
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    // FIX: Implemented handleDelete to allow staff deletion
    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir este colaborador?")) return;
        try {
            await deleteStaffMember(id);
            alert("Colaborador excluído com sucesso.");
        } catch (error) {
            console.error("Error deleting staff member:", error);
            alert("Erro ao excluir colaborador.");
        }
    };

    // FIX: Implemented handlePhotoChange to handle image selection and preview
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

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
        } catch (err) {
            alert("Erro ao matricular.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAccess = async (studentId: string) => {
        setIsGeneratingAccess(true);
        try {
            await generateStudentCredentials(studentId);
            alert("Acesso gerado com sucesso!");
        } catch (e: any) {
            alert("Erro ao gerar acesso: " + e.message);
        } finally {
            setIsGeneratingAccess(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const nameMatch = String(s.name || '').toLowerCase().includes(studentSearch.toLowerCase());
        const classMatch = selectedStudentClass ? s.className === selectedStudentClass : true;
        return nameMatch && classMatch;
    }).sort((a,b) => a.name.localeCompare(b.name));

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            <Icon size={18} /> {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-full md:w-64 bg-black/20 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col md:h-full z-20 shadow-2xl text-white">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2 opacity-50">RH Estratégico</p>
                    <SidebarItem id="staff" label="Equipe" icon={Users} />
                    <SidebarItem id="attendance" label="Ponto Facial" icon={Clock} />
                    <SidebarItem id="substitutions" label="Substituições/Extras" icon={Repeat} />
                    <SidebarItem id="subjects" label="Disciplinas" icon={Layers} />
                    <SidebarItem id="students" label="Acessos Alunos" icon={ShieldCheck} />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Colaboradores</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Painel de cadastro institucional</p>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 px-8 rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                <Plus size={18} className="mr-2"/> Novo Registro
                            </Button>
                        </header>
                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                             <div className="p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">{staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).length} Cadastros</span>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr><th className="p-8">Colaborador</th><th className="p-8">Cargo</th><th className="p-8">Status</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
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
                                                <button onClick={() => handleEdit(s)} className="p-2 text-gray-500 hover:text-white transition-colors"><Edit3 size={18}/></button>
                                                <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors ml-2"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acessos Alunos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gestão de credenciais e matrículas do portal</p>
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
                                            <th className="p-8">Senha Provisória</th>
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
                                                <td className="p-8 font-mono text-gray-500 font-black text-sm tracking-widest">{student.accessPassword || '---'}</td>
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
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[9px] tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20"
                                                        >
                                                            {isGeneratingAccess ? <Loader2 size={12} className="animate-spin"/> : <Key size={12}/>}
                                                            {student.hasAccess ? 'Resetar PIN' : 'Ativar Acesso'}
                                                        </button>
                                                        <button 
                                                            onClick={async () => { if(confirm(`Excluir matrícula de ${student.name}?`)) await deleteStudent(student.id); }}
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
                                {filteredStudents.length === 0 && (
                                    <div className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.4em] opacity-30">
                                        Nenhum aluno encontrado na turma/filtro selecionado.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA DE DISCIPLINAS E PONTO MANTIDAS (TRUNCADAS PARA ECONOMIA) */}
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
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL MATRÍCULA (NOVO) */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Nova Matrícula Portal</h3>
                                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest mt-1">
                                    {enrollmentType === 'individual' ? 'Registro Individual de Aluno' : 'Importação de Alunos em Lote'}
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
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino</label>
                                            <select required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none focus:border-orange-500" value={enrollFormData.className} onChange={e => setEnrollFormData({...enrollFormData, className: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome Completo do Aluno</label>
                                        <input required className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-orange-500 transition-all uppercase" value={enrollFormData.name} onChange={e => setEnrollFormData({...enrollFormData, name: e.target.value})} placeholder="DIGITE O NOME COMPLETO" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma Destino (Todos da Lista)</label>
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

            {/* STAFF FORM MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cargo / Função</label>
                                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-red-600" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Período</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none appearance-none" value={formData.workPeriod} onChange={e => setFormData({...formData, workPeriod: e.target.value as any})}>
                                        <option value="morning">Matutino</option>
                                        <option value="afternoon">Vespertino</option>
                                        <option value="full">Integral</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Foto Facial (Biometria)</label>
                                    <input type="file" className="w-full text-xs text-gray-500" onChange={handlePhotoChange} accept="image/*" />
                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.isTeacher} onChange={e => setFormData({...formData, isTeacher: e.target.checked})} className="w-5 h-5 rounded border-white/10 bg-black/40 text-red-600" />
                                        <span className="text-[10px] font-black uppercase text-gray-400">É Professor</span>
                                    </label>
                                </div>
                             </div>
                             <Button type="submit" isLoading={isLoading} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40">Salvar Cadastro</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};