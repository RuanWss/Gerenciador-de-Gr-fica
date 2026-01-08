
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
    getDailySchoolLog
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
    ArrowRight
} from 'lucide-react';

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'substitutions'>('staff');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Staff Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StaffMember>>({
        name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: ''
    });
    const [createLogin, setCreateLogin] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Attendance/Substitutions State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [dailyLogData, setDailyLogData] = useState<DailySchoolLog | null>(null);
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
            loadSubstitutions();
        }
    }, [activeTab, dateFilter]);

    const loadSubstitutions = async () => {
        setIsLoadingSub(true);
        try {
            const log = await getDailySchoolLog(dateFilter);
            setDailyLogData(log);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingSub(false);
        }
    };

    // Handlers
    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setFormData(staff);
        setCreateLogin(!!staff.email);
        setPhotoFile(null);
        setPhotoPreview(staff.photoUrl || null);
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
                email: formData.email || ''
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
                if (formData.isTeacher) roles.push(UserRole.TEACHER);
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
        setFormData({ name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, isAdmin: false, email: '' });
        setCreateLogin(false);
        setPhotoFile(null);
        setPhotoPreview(null);
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

    const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));

    const absentTeachers = dailyLogData 
        ? Object.entries(dailyLogData.teacherAttendance).filter(([_, data]) => !data.present)
        : [];

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl text-white">
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
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Colaboradores</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Painel de cadastro institucional</p>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 px-8 rounded-2xl h-14 font-black uppercase text-xs tracking-widest">
                                <Plus size={18} className="mr-2"/> Novo Registro
                            </Button>
                        </header>

                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                                <div className="bg-[#18181b] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                        <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                                    </div>
                                    <form onSubmit={handleSave} className="p-10 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                                <div className="flex flex-wrap gap-8">
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Ativo</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={formData.isTeacher} onChange={e => setFormData({...formData, isTeacher: e.target.checked})} />
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Professor</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black text-red-600 focus:ring-red-500" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} />
                                                        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Admin</span>
                                                    </label>
                                                </div>
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
                                            <div className="flex items-center gap-8">
                                                <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Users size={32} className="text-gray-700"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-xs text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-red-600/10 file:text-red-500 hover:file:bg-red-600/20 mb-2"/>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Iluminação clara e rosto centralizado</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-6">
                                            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</Button>
                                            <Button type="submit" isLoading={isLoading} className="flex-1 h-14 bg-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest"><Save size={16} className="mr-2"/> Salvar Cadastro</Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <div className="relative group w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-red-600 transition-all text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full">{filteredStaff.length} Cadastros</span>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                    <tr>
                                        <th className="p-8">Colaborador</th>
                                        <th className="p-8">Cargo / Função</th>
                                        <th className="p-8">Status</th>
                                        <th className="p-8 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStaff.map(staff => (
                                        <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                                                        {staff.photoUrl ? <img src={staff.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-3 text-gray-700"/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white uppercase tracking-tight text-sm">{staff.name}</p>
                                                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{staff.workPeriod === 'morning' ? 'Matutino' : staff.workPeriod === 'afternoon' ? 'Vespertino' : 'Integral'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">{staff.role}</span>
                                                {staff.isTeacher && <span className="ml-3 text-[9px] bg-blue-600/10 text-blue-500 px-2 py-0.5 rounded-full font-black border border-blue-600/20">TEACHER</span>}
                                            </td>
                                            <td className="p-8">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${staff.active ? 'bg-green-600/10 text-green-500 border-green-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                    {staff.active ? 'ATIVO' : 'DESLIGADO'}
                                                </span>
                                            </td>
                                            <td className="p-8 text-right">
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
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Histórico de Ponto</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Relatório consolidado de biometria facial</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl">
                                    <Calendar className="text-red-600" size={18} />
                                    <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                                </div>
                                <Button onClick={exportReport} className="h-14 px-8 bg-green-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-900/20">
                                    <FileSpreadsheet size={18} className="mr-2"/> Exportar CSV
                                </Button>
                            </div>
                        </header>

                        <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="p-8 bg-black/20 flex justify-between items-center border-b border-white/5">
                                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Clock size={20} className="text-red-500"/> Registros Capturados</h3>
                                <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black">{logs.length} Pontos</span>
                            </div>
                            <table className="w-full text-left">
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
                )}

                {activeTab === 'substitutions' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
                            <div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Substituições e Extras</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Controle financeiro de ausências e aulas excedentes</p>
                            </div>
                            <div className="bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-4 px-6 shadow-xl">
                                <Calendar className="text-red-600" size={18} />
                                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-none text-white font-black text-sm outline-none cursor-pointer" />
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="bg-[#18181b] p-10 rounded-[3rem] border border-white/5 shadow-xl relative overflow-hidden group">
                                <UserX className="absolute -right-4 -bottom-4 text-red-600/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Total de Faltas/Atestados</p>
                                <h3 className="text-5xl font-black text-red-600">{absentTeachers.length}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[9px] font-black uppercase tracking-widest">Baseado no Livro Diário</div>
                            </div>
                            <div className="bg-[#18181b] p-10 rounded-[3rem] border border-white/5 shadow-xl relative overflow-hidden group">
                                <Star className="absolute -right-4 -bottom-4 text-green-600/10 group-hover:scale-110 transition-transform duration-700" size={120} />
                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Total de Aulas Extras</p>
                                <h3 className="text-5xl font-black text-green-500">{dailyLogData?.extraClasses?.length || 0}</h3>
                                <div className="mt-4 flex items-center gap-2 text-gray-600 text-[9px] font-black uppercase tracking-widest">Pagas em folha complementar</div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <section>
                                <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-red-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Ausências e Substitutos</h2></div>
                                <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                            <tr>
                                                <th className="p-8">Professor Ausente</th>
                                                <th className="p-8">Situação</th>
                                                <th className="p-8">Substituto / Monitor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {absentTeachers.map(([name, data]) => (
                                                <tr key={name} className="hover:bg-white/[0.02]">
                                                    <td className="p-8 font-black text-white uppercase text-sm">{name}</td>
                                                    <td className="p-8">
                                                        <span className="bg-red-600/10 text-red-500 border border-red-600/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">FALTA REGISTRADA</span>
                                                    </td>
                                                    <td className="p-8">
                                                        {data.substitute ? (
                                                            <div className="flex items-center gap-3 text-green-500">
                                                                <ArrowRight size={14}/>
                                                                <span className="font-black text-xs uppercase tracking-widest">{data.substitute}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-700 text-xs font-bold uppercase italic">Sem substituição informada</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {absentTeachers.length === 0 && (
                                                <tr><td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Sem ausências registradas hoje</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-4 mb-8"><div className="h-10 w-2 bg-green-600 rounded-full"></div><h2 className="text-2xl font-black text-white uppercase tracking-tight">Aulas Extras (Horas Excedentes)</h2></div>
                                <div className="bg-[#18181b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-black/30 text-gray-600 uppercase text-[9px] font-black tracking-[0.2em]">
                                            <tr>
                                                <th className="p-8">Professor</th>
                                                <th className="p-8">Disciplina</th>
                                                <th className="p-8">Turma Atendida</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(dailyLogData?.extraClasses || []).map((ex, i) => (
                                                <tr key={i} className="hover:bg-white/[0.02]">
                                                    <td className="p-8 font-black text-white uppercase text-sm">{ex.professor}</td>
                                                    <td className="p-8 text-gray-400 font-bold uppercase text-xs tracking-widest">{ex.subject}</td>
                                                    <td className="p-8">
                                                        <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{ex.className}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(dailyLogData?.extraClasses || []).length === 0 && (
                                                <tr><td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Sem horas extras registradas hoje</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
