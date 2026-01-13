
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
    getDailySchoolLog,
    getMonthlySchoolLogs,
    getMonthlyStaffLogs
} from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog, UserRole, DailySchoolLog } from '../types';
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
    PlusCircle
} from 'lucide-react';
import { EFAF_SUBJECTS, EM_SUBJECTS, EFAI_CLASSES, INFANTIL_CLASSES } from '../constants';

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'substitutions' | 'subjects'>('staff');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Staff Form State
    const [showForm, setShowForm] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StaffMember>>({
        name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '', educationLevels: []
    });
    const [tempSubject, setTempSubject] = useState('');
    const [createLogin, setCreateLogin] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Subjects Tab State
    const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
        const saved = localStorage.getItem('hr_custom_subjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    // Attendance/Substitutions State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [search, setSearch] = useState('');
    const [monthlyLogs, setMonthlyLogs] = useState<DailySchoolLog[]>([]);
    const [monthlyStaffLogs, setMonthlyStaffLogs] = useState<StaffAttendanceLog[]>([]);
    const [isLoadingSub, setIsLoadingSub] = useState(false);

    useEffect(() => {
        const unsub = listenToStaffMembers((data) => {
            setStaffList(data.sort((a, b) => a.name.localeCompare(b.name)));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (activeTab === 'attendance') {
            const unsub = listenToStaffLogs(dateFilter, (data) => {
                setLogs(data);
            });
            return () => unsub();
        }
        if (activeTab === 'substitutions') {
            loadMonthlySubstitutions();
        }
    }, [activeTab, dateFilter, monthFilter]);

    const handleAddNewSubject = () => {
        if (!newSubjectName.trim()) return;
        const updated = [...customSubjects, newSubjectName.trim().toUpperCase()].sort();
        setCustomSubjects(updated);
        localStorage.setItem('hr_custom_subjects', JSON.stringify(updated));
        setNewSubjectName('');
        setShowNewSubjectModal(false);
    };

    const loadMonthlySubstitutions = async () => {
        setIsLoadingSub(true);
        try {
            const [logs, staffLogs] = await Promise.all([
                getMonthlySchoolLogs(monthFilter),
                getMonthlyStaffLogs(monthFilter)
            ]);
            setMonthlyLogs(logs);
            setMonthlyStaffLogs(staffLogs);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingSub(false);
        }
    };

    // Handlers
    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setFormData({ 
            ...staff, 
            educationLevels: staff.educationLevels || [], 
            classes: staff.classes || [] 
        });
        setCreateLogin(!!staff.email);
        setPhotoFile(null);
        setPhotoPreview(staff.photoUrl || null);
        setTempSubject(staff.role.includes('PROFESSOR DE ') ? staff.role.replace('PROFESSOR DE ', '').replace('PROFESSORA DE ', '') : '');
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este funcionário?')) {
            await deleteStaffMember(id);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let photoUrl = formData.photoUrl;
            if (photoFile) {
                photoUrl = await uploadStaffPhoto(photoFile);
            }

            const dataToSave: StaffMember = {
                id: editingId || '',
                name: formData.name || '',
                role: formData.role || '',
                active: formData.active ?? true,
                createdAt: formData.createdAt || Date.now(),
                photoUrl: photoUrl,
                workPeriod: formData.workPeriod || 'morning',
                isTeacher: formData.isTeacher || false,
                isAdmin: formData.isAdmin || false,
                weeklyClasses: formData.weeklyClasses,
                email: formData.email || '',
                educationLevels: formData.educationLevels || [],
                classes: formData.classes || []
            };

            const cleanData = JSON.parse(JSON.stringify(dataToSave));

            if (editingId) {
                await updateStaffMember(cleanData);
            } else {
                await saveStaffMember(cleanData);
            }

            if (formData.email) {
                const roles: UserRole[] = [];
                if (formData.isAdmin) roles.push(UserRole.PRINTSHOP);
                if (formData.isTeacher) {
                    roles.push(UserRole.TEACHER);
                    if (formData.educationLevels?.includes('Ed. Infantil')) {
                        roles.push(UserRole.KINDERGARTEN);
                    }
                }
                if (roles.length === 0) roles.push(UserRole.HR); 

                if (createLogin) {
                    try {
                        await createSystemUserAuth(formData.email, formData.name || 'Funcionário', roles);
                        alert("Login criado com sucesso!");
                    } catch (err: any) {
                        if (err.code === 'auth/email-already-in-use') {
                             await updateSystemUserRoles(formData.email, roles);
                             alert("Cadastro salvo. As permissões de acesso foram atualizadas.");
                        } else {
                             alert("Aviso: Cadastro salvo, mas houve erro ao criar login: " + err.message);
                        }
                    }
                } 
                else if (editingId) {
                    await updateSystemUserRoles(formData.email, roles);
                }
            }

            setShowForm(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar: " + (error as any).message);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '', educationLevels: [], classes: [] });
        setCreateLogin(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setTempSubject('');
    };

    const exportReport = () => {
        const headers = ["Data", "Horário", "Nome", "Cargo", "Status"];
        const csvContent = [
            headers.join(","),
            ...logs.map(log => {
                const date = new Date(log.timestamp);
                const time = date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                return [`"${log.dateString}"`, `"${time}"`, `"${log.staffName}"`, `"${log.staffRole}"`, `"PONTO"`].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ponto_equipe_${dateFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const monthName = new Date(monthFilter + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        
        const totalAbsences = monthlyLogs.reduce((acc, log) => acc + (Object.values(log.teacherAttendance) as { present: boolean; substitute?: string }[]).filter(att => !att.present).length, 0);
        const totalExtras = monthlyLogs.reduce((acc, log) => acc + (log.extraClasses?.length || 0), 0);

        const absenceRows = monthlyLogs.flatMap(log => 
            (Object.entries(log.teacherAttendance) as [string, { present: boolean; substitute?: string }][])
                .filter(([_, att]) => !att.present)
                .map(([name, att]) => `<tr><td>${log.date}</td><td>${name}</td><td>${att.substitute || '-'}</td></tr>`)
        ).join('');

        const extraRows = monthlyLogs.flatMap(log => 
            (log.extraClasses || []).map(ex => `<tr><td>${log.date}</td><td>${ex.professor}</td><td>${ex.subject}</td><td>${ex.className}</td></tr>`)
        ).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Relatório Mensal - ${monthFilter}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #1f2937; }
                    .header { border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
                    h1 { color: #dc2626; text-transform: uppercase; margin: 0; font-size: 24px; }
                    .summary { display: flex; gap: 40px; margin-bottom: 40px; background: #f3f4f6; padding: 20px; border-radius: 8px; }
                    .stat { flex: 1; }
                    .stat p { margin: 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase; }
                    .stat h3 { margin: 5px 0 0; font-size: 32px; color: #111827; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: #f9fafb; text-align: left; padding: 12px; font-size: 10px; border: 1px solid #e5e7eb; text-transform: uppercase; }
                    td { padding: 12px; font-size: 11px; border: 1px solid #e5e7eb; }
                    h2 { font-size: 16px; border-left: 4px solid #dc2626; padding-left: 10px; margin: 30px 0 15px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório Mensal de RH - ${monthName}</h1>
                </div>
                <div class="summary">
                    <div class="stat"><p>Total de Faltas</p><h3>${totalAbsences}</h3></div>
                    <div class="stat"><p>Aulas Extras</p><h3>${totalExtras}</h3></div>
                </div>
                <h2>Relação de Ausências</h2>
                <table>
                    <thead><tr><th>Data</th><th>Professor</th><th>Substituto</th></tr></thead>
                    <tbody>${absenceRows || '<tr><td colspan="3">Nenhum registro.</td></tr>'}</tbody>
                </table>
                <h2>Relação de Aulas Extras</h2>
                <table>
                    <thead><tr><th>Data</th><th>Professor</th><th>Disciplina</th><th>Turma</th></tr></thead>
                    <tbody>${extraRows || '<tr><td colspan="4">Nenhum registro.</td></tr>'}</tbody>
                </table>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));

    const totalMonthlyAbsences = monthlyLogs.reduce((acc, log) => {
        return acc + (Object.values(log.teacherAttendance) as { present: boolean; substitute?: string }[]).filter(att => !att.present).length;
    }, 0);

    const totalMonthlyExtras = monthlyLogs.reduce((acc, log) => {
        return acc + (log.extraClasses?.length || 0);
    }, 0);

    const allSubjects = Array.from(new Set([...EFAF_SUBJECTS, ...EM_SUBJECTS, ...customSubjects])).sort();

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            {/* SIDEBAR */}
            <div className="w-full md:w-64 bg-black/20 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col md:h-full z-20 shadow-2xl text-white">
                <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 ml-2 opacity-50">RH Estratégico</p>
                    <button 
                        onClick={() => setActiveTab('staff')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === 'staff' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Users size={18} /> Equipe
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === 'attendance' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Clock size={18} /> Ponto Facial
                    </button>
                    <button 
                        onClick={() => setActiveTab('substitutions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === 'substitutions' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Repeat size={18} /> Substituições/Extras
                    </button>
                    <button 
                        onClick={() => setActiveTab('subjects')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest mb-1 ${activeTab === 'subjects' ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Layers size={18} /> Disciplinas
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Colaboradores</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Painel de cadastro institucional</p>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto bg-red-600 px-8 rounded-2xl h-14 font-black uppercase text-xs tracking-widest">
                                <Plus size={18} className="mr-2"/> Novo Registro
                            </Button>
                        </header>

                        {/* STAFF FORM MODAL */}
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl max-h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                                    <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                        <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                                    </div>
                                    <form onSubmit={handleSave} className="p-6 md:p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Nome Completo</label>
                                                <input required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-red-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Cargo</label>
                                                <input required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-red-600" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Jornada</label>
                                                <select className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-red-600" value={formData.workPeriod} onChange={e => setFormData({...formData, workPeriod: e.target.value as any})}>
                                                    <option value="morning">Matutino</option>
                                                    <option value="afternoon">Vespertino</option>
                                                    <option value="full">Integral</option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-2 bg-white/5 p-6 rounded-3xl border border-white/5 space-y-6">
                                                <div className="flex flex-wrap gap-4 md:gap-8">
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                                                            <div className={`w-10 h-6 rounded-full transition-colors ${formData.active ? 'bg-green-600' : 'bg-gray-700'}`}></div>
                                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.active ? 'translate-x-4' : ''}`}></div>
                                                        </div>
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Ativo</span>
                                                    </label>
                                                    
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" checked={formData.isTeacher} onChange={e => {
                                                                const checked = e.target.checked;
                                                                setFormData({...formData, isTeacher: checked});
                                                                if (checked) setShowSubjectModal(true);
                                                            }} />
                                                            <div className={`w-10 h-6 rounded-full transition-colors ${formData.isTeacher ? 'bg-blue-600' : 'bg-gray-700'}`}></div>
                                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isTeacher ? 'translate-x-4' : ''}`}></div>
                                                        </div>
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Professor</span>
                                                    </label>

                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} />
                                                            <div className={`w-10 h-6 rounded-full transition-colors ${formData.isAdmin ? 'bg-red-600' : 'bg-gray-700'}`}></div>
                                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isAdmin ? 'translate-x-4' : ''}`}></div>
                                                        </div>
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Admin</span>
                                                    </label>
                                                </div>

                                                {formData.isTeacher && tempSubject && (
                                                    <div className="text-[10px] font-black text-blue-400 uppercase bg-blue-400/10 p-3 rounded-xl border border-blue-400/20 flex items-center gap-2">
                                                        <BookOpen size={14}/> Disciplina: {tempSubject}
                                                        <button type="button" onClick={() => setShowSubjectModal(true)} className="ml-auto underline text-[9px]">Alterar</button>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-white/5 space-y-4">
                                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nível de Ensino</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {['Ed. Infantil', 'EFAI', 'EFAF', 'Médio'].map(level => (
                                                            <label key={level} className="flex items-center gap-3 cursor-pointer group">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-5 h-5 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" 
                                                                    checked={(formData.educationLevels || []).includes(level)}
                                                                    onChange={(e) => {
                                                                        const current = formData.educationLevels || [];
                                                                        const updated = e.target.checked 
                                                                            ? [...current, level]
                                                                            : current.filter(l => l !== level);
                                                                        setFormData({...formData, educationLevels: updated});
                                                                    }}
                                                                />
                                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-white transition-colors">{level}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* CONDITIONAL TURMAS SELECTION (NEW) */}
                                                {(formData.educationLevels?.includes('EFAI') || formData.educationLevels?.includes('Ed. Infantil')) && (
                                                    <div className="pt-4 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                                        <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest">Vincular Turmas EFAI / INFANTIL</label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {[...INFANTIL_CLASSES, ...EFAI_CLASSES].map(clsName => (
                                                                <label key={clsName} className={`flex items-center justify-center p-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all cursor-pointer ${
                                                                    formData.classes?.includes(clsName) 
                                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                                                                    : 'bg-black/20 border-white/5 text-gray-600 hover:text-gray-400'
                                                                }`}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="sr-only"
                                                                        checked={formData.classes?.includes(clsName) || false}
                                                                        onChange={(e) => {
                                                                            const current = formData.classes || [];
                                                                            const updated = e.target.checked 
                                                                                ? [...current, clsName]
                                                                                : current.filter(c => c !== clsName);
                                                                            setFormData({...formData, classes: updated});
                                                                        }}
                                                                    />
                                                                    {clsName}
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest italic">* Selecione as turmas específicas que este docente atende.</p>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-white/5">
                                                    <label className="flex items-center gap-3 cursor-pointer mb-6">
                                                        <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={createLogin} onChange={e => setCreateLogin(e.target.checked)} />
                                                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">Habilitar Acesso ao Sistema</span>
                                                    </label>
                                                    {createLogin && (
                                                        <div className="animate-in slide-in-from-top-2">
                                                            <label className="block text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">E-mail para Login</label>
                                                            <input type="email" className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-red-600" placeholder="usuario@escola.com" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Biometria Facial</label>
                                            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
                                                <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Users size={32} className="text-gray-700"/>}
                                                </div>
                                                <div className="flex-1 w-full">
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-xs text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-red-600/10 file:text-red-500 hover:file:bg-red-600/20 mb-2 cursor-pointer"/>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Iluminação clara e rosto centralizado</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 pt-6 shrink-0">
                                            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest order-2 sm:order-1">Cancelar</Button>
                                            <Button type="submit" isLoading={isLoading} className="flex-1 h-14 bg-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest order-1 sm:order-2"><Save size={16} className="mr-2"/> Salvar Cadastro</Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* SUBJECT SELECTION MODAL */}
                        {showSubjectModal && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                                <div className="bg-[#1c1917] border border-blue-500/30 w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                                        <BookOpen className="text-blue-500"/> Seleção de Disciplina
                                    </h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Componente Curricular</label>
                                            <select 
                                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 appearance-none"
                                                value={tempSubject}
                                                onChange={e => setTempSubject(e.target.value)}
                                            >
                                                <option value="">Selecione a disciplina...</option>
                                                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <Button 
                                            onClick={() => {
                                                if (tempSubject) {
                                                    const genderPrefix = formData.role?.includes('PROFESSORA') ? 'PROFESSORA DE ' : 'PROFESSOR DE ';
                                                    setFormData({...formData, role: `${genderPrefix}${tempSubject}`, isTeacher: true});
                                                    setShowSubjectModal(false);
                                                } else {
                                                    alert("Por favor, selecione uma disciplina.");
                                                }
                                            }}
                                            className="w-full h-14 bg-blue-600 rounded-xl font-black uppercase text-xs tracking-widest"
                                        >
                                            Confirmar Disciplina
                                        </Button>
                                        <button 
                                            onClick={() => {
                                                setFormData({...formData, isTeacher: false});
                                                setShowSubjectModal(false);
                                            }}
                                            className="w-full text-center text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            Cancelar Atribuição
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-6 md:p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
                                <div className="relative group w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">{filteredStaff.length} Cadastros</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-6 md:p-8">Colaborador</th>
                                            <th className="p-6 md:p-8">Cargo / Função</th>
                                            <th className="p-6 md:p-8">Status</th>
                                            <th className="p-6 md:p-8 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStaff.map(staff => (
                                            <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-6 md:p-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                                                            {staff.photoUrl ? <img src={staff.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-3 text-gray-700"/>}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-black text-white uppercase tracking-tight text-sm truncate">{staff.name}</p>
                                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{staff.workPeriod === 'morning' ? 'Matutino' : staff.workPeriod === 'afternoon' ? 'Vespertino' : 'Integral'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">{staff.role}</span>
                                                    {staff.isTeacher && <span className="ml-3 text-[9px] bg-blue-600/10 text-blue-500 px-2 py-0.5 rounded-full font-black border border-blue-600/20">TEACHER</span>}
                                                </td>
                                                <td className="p-6 md:p-8">
                                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${staff.active ? 'bg-green-600/10 text-green-500 border-green-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                        {staff.active ? 'ATIVO' : 'DESLIGADO'}
                                                    </span>
                                                </td>
                                                <td className="p-6 md:p-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleEdit(staff)} className="p-3 bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white rounded-xl transition-all"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDelete(staff.id)} className="p-3 bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
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

                {activeTab === 'subjects' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Disciplinas e Vínculos</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Gestão de áreas instrumentais e docentes</p>
                            </div>
                            <Button onClick={() => setShowNewSubjectModal(true)} className="bg-red-600 px-8 rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40">
                                <PlusCircle size={20} className="mr-2"/> Inserir Disciplina
                            </Button>
                        </header>

                        {/* NEW SUBJECT MODAL */}
                        {showNewSubjectModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Nova Disciplina Instrumental</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Nome da Disciplina</label>
                                            <input 
                                                autoFocus
                                                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600" 
                                                placeholder="EX: ROBÓTICA" 
                                                value={newSubjectName} 
                                                onChange={e => setNewSubjectName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddNewSubject()}
                                            />
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <Button variant="outline" onClick={() => setShowNewSubjectModal(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</Button>
                                            <Button onClick={handleAddNewSubject} className="flex-1 h-14 bg-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cadastrar</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allSubjects.map(subject => {
                                // Filter logic update for Polivalente
                                const subjectTeachers = staffList.filter(s => {
                                    if (!s.isTeacher) return false;
                                    const roleMatches = s.role.toUpperCase().includes(subject.toUpperCase());
                                    // Se for Polivalente, também pode filtrar por vínculo de turma se necessário futuramente
                                    return roleMatches;
                                });

                                return (
                                    <div key={subject} className="bg-[#18181b] border border-white/5 rounded-[2rem] p-6 shadow-xl hover:border-red-600/30 transition-all flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{subject}</h3>
                                            <span className="bg-red-600/10 text-red-500 px-2 py-0.5 rounded-full text-[9px] font-black border border-red-600/20">{subjectTeachers.length}</span>
                                        </div>
                                        
                                        {/* (NEW) CONDITIONAL CLASSIFICATION FOR POLIVALENTE */}
                                        {subject === "POLIVALENTE (INFANTIL/EFAI)" && (
                                            <div className="mb-4 bg-blue-900/10 p-4 rounded-2xl border border-blue-500/10">
                                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Vínculo por Segmento</p>
                                                <div className="space-y-4">
                                                    {["Ed. Infantil", "EFAI"].map(segment => {
                                                        const segmentTeachers = subjectTeachers.filter(t => t.educationLevels?.includes(segment));
                                                        return (
                                                            <div key={segment} className="space-y-2">
                                                                <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">{segment}</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {segmentTeachers.map(t => (
                                                                        <div key={t.id} className="h-7 w-7 rounded-lg bg-black/40 border border-white/5 overflow-hidden" title={t.name}>
                                                                            {t.photoUrl ? <img src={t.photoUrl} className="w-full h-full object-cover" /> : <Users size={12} className="m-1.5 text-gray-800"/>}
                                                                        </div>
                                                                    ))}
                                                                    {segmentTeachers.length === 0 && <span className="text-[7px] text-gray-800 uppercase italic">Nenhum docente</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar flex-1">
                                            {subjectTeachers.map(teacher => (
                                                <div key={teacher.id} className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                        {teacher.photoUrl ? <img src={teacher.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-1 text-gray-700"/>}
                                                    </div>
                                                    <div className="overflow-hidden flex-1">
                                                        <span className="text-[10px] font-bold text-gray-300 uppercase truncate block">{teacher.name}</span>
                                                        {/* (NEW) SHOW LINKED CLASSES */}
                                                        {teacher.classes && teacher.classes.length > 0 && (
                                                            <p className="text-[7px] text-red-500 font-black truncate">{teacher.classes.join(" • ")}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {subjectTeachers.length === 0 && (
                                                <div className="text-center py-4 opacity-20 italic text-[10px] font-black uppercase text-gray-500">Sem professores vinculados</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Histórico de Ponto</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Relatório consolidado de biometria facial</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl w-full sm:w-auto">
                                    <Calendar className="text-red-600" size={18} />
                                    <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                                </div>
                                <Button onClick={exportReport} className="w-full sm:w-auto h-14 px-8 bg-green-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-900/20">
                                    <FileSpreadsheet size={18} className="mr-2"/> Exportar CSV
                                </Button>
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Clock size={20} className="text-red-500"/> Registros Capturados</h3>
                                <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black">{logs.length} Pontos</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                        <tr>
                                            <th className="p-8">Horário</th>
                                            <th className="p-8">Colaborador</th>
                                            <th className="p-8">Cargo</th>
                                            <th className="p-8 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {logs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/[0.02]">
                                                <td className="p-8 text-red-500 font-black text-sm tracking-widest">
                                                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center gap-4">
                                                         <div className="w-10 h-10 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                                                            {log.staffPhotoUrl ? <img src={log.staffPhotoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2 text-gray-700"/>}
                                                        </div>
                                                        <span className="font-black text-white uppercase tracking-tight text-sm">{log.staffName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-gray-500 font-bold uppercase text-xs tracking-widest">{log.staffRole}</td>
                                                <td className="p-8 text-center">
                                                    <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        <UserCheck size={12} className="inline mr-2 -mt-0.5"/> Confirmado
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr><td colSpan={4} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Sem registros para esta data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'substitutions' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Substituições e Extras</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Controle financeiro de ausências e aulas excedentes</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <Button onClick={handlePrintPDF} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6 py-3 shadow-lg shadow-red-900/20">
                                    <Download size={16} className="mr-2"/> Baixar em PDF
                                </Button>
                                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl w-full sm:w-auto">
                                    <Calendar className="text-red-600" size={18} />
                                    <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
                            <div className="bg-[#18181b] p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-xl relative overflow-hidden group">
                                <UserX className="absolute -right-4 -bottom-4 text-red-600/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Total Mensal de Faltas</p>
                                <h3 className="text-4xl md:text-5xl font-black text-red-600">{totalMonthlyAbsences}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[9px] font-black uppercase tracking-widest">Compilado do mês selecionado</div>
                            </div>
                            <div className="bg-[#18181b] p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-xl relative overflow-hidden group">
                                <Star className="absolute -right-4 -bottom-4 text-green-600/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Total Mensal de Aulas Extras</p>
                                <h3 className="text-4xl md:text-5xl font-black text-green-500">{totalMonthlyExtras}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[9px] font-black uppercase tracking-widest">Para pagamento em folha</div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <section>
                                <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-red-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Relação Detalhada de Ausências</h2></div>
                                <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[500px]">
                                            <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                                <tr>
                                                    <th className="p-8">Data</th>
                                                    <th className="p-8">Professor Ausente</th>
                                                    <th className="p-8">Substituto / Monitor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {monthlyLogs.flatMap(log => 
                                                    (Object.entries(log.teacherAttendance) as [string, { present: boolean; substitute?: string }][])
                                                        .filter(([_, att]) => !att.present)
                                                        .map(([name, att]) => (
                                                            <tr key={log.date + name} className="hover:bg-white/[0.02]">
                                                                <td className="p-8 text-xs font-bold text-gray-500">{new Date(log.date + 'T12:00:00').toLocaleDateString()}</td>
                                                                <td className="p-8 font-black text-white uppercase text-sm">{name}</td>
                                                                <td className="p-8">
                                                                    {att.substitute ? (
                                                                        <div className="flex items-center gap-3 text-green-500">
                                                                            <ArrowRight size={14}/>
                                                                            <span className="font-black text-xs uppercase tracking-widest">{att.substitute}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-700 text-xs font-bold uppercase italic">Sem substituição</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                                {monthlyLogs.length === 0 && (
                                                    <tr><td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Sem ausências para este mês</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-green-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Relação Detalhada de Extras</h2></div>
                                <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[500px]">
                                            <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                                <tr>
                                                    <th className="p-8">Data</th>
                                                    <th className="p-8">Professor</th>
                                                    <th className="p-8">Disciplina</th>
                                                    <th className="p-8">Turma</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {monthlyLogs.flatMap(log => 
                                                    (log.extraClasses || []).map((ex, i) => (
                                                        <tr key={log.date + ex.professor + i} className="hover:bg-white/[0.02]">
                                                            <td className="p-8 text-xs font-bold text-gray-500">{new Date(log.date + 'T12:00:00').toLocaleDateString()}</td>
                                                            <td className="p-8 font-black text-white uppercase text-sm">{ex.professor}</td>
                                                            <td className="p-8 text-gray-400 font-bold uppercase text-xs tracking-widest">{ex.subject}</td>
                                                            <td className="p-8">
                                                                <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{ex.className}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                                {monthlyLogs.length === 0 && (
                                                    <tr><td colSpan={4} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Sem horas extras para este mês</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
