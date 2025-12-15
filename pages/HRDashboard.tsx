import React, { useState, useEffect } from 'react';
import { 
    saveStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    uploadStaffPhoto, 
    listenToStaffMembers, 
    listenToStaffLogs,
    createSystemUserAuth
} from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog, UserRole } from '../types';
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
    Lock
} from 'lucide-react';

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance'>('staff');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Staff Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StaffMember>>({
        name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, email: ''
    });
    const [createLogin, setCreateLogin] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Attendance State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');

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
    }, [activeTab, dateFilter]);

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
                weeklyClasses: formData.weeklyClasses,
                email: formData.email || ''
            };

            if (editingId) {
                await updateStaffMember(dataToSave);
            } else {
                await saveStaffMember(dataToSave);
            }

            // LOGIN CREATION LOGIC
            if (createLogin && formData.email) {
                try {
                    const role = formData.isTeacher ? UserRole.TEACHER : UserRole.HR;
                    await createSystemUserAuth(formData.email, formData.name || 'Funcionário', role);
                } catch (err: any) {
                    if (err.code !== 'auth/email-already-in-use') {
                         console.error("Erro ao criar login:", err);
                         alert("Aviso: O cadastro foi salvo, mas houve erro ao criar o login de acesso: " + err.message);
                    }
                }
            }

            setShowForm(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', role: '', active: true, workPeriod: 'morning', isTeacher: false, email: '' });
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

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
             {/* SIDEBAR (Simple vertical tab) */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Gestão de RH</p>
                    <button 
                        onClick={() => setActiveTab('staff')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === 'staff' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                        <Users size={18} /> Equipe
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === 'attendance' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                        <Clock size={18} /> Ponto Eletrônico
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Briefcase className="text-red-500"/> Quadro de Colaboradores</h1>
                                <p className="text-gray-400">Gerenciamento de cadastros e fotos para biometria</p>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(true); }}>
                                <Plus size={18} className="mr-2"/> Novo Colaborador
                            </Button>
                        </header>

                         {/* FORM MODAL */}
                         {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
                                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                                    </div>
                                    <form onSubmit={handleSave} className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                                <input required className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Cargo / Função</label>
                                                <input required className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Ex: Professor de História" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Jornada de Trabalho</label>
                                                <select className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900" value={formData.workPeriod} onChange={e => setFormData({...formData, workPeriod: e.target.value as any})}>
                                                    <option value="morning">Matutino</option>
                                                    <option value="afternoon">Vespertino</option>
                                                    <option value="full">Integral</option>
                                                </select>
                                            </div>

                                            {/* ÁREA DE LOGIN E PERMISSÕES */}
                                            <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-2">
                                                <div className="flex items-center gap-6 mb-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                                                        <span className="text-sm font-bold text-gray-700">Cadastro Ativo</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500" checked={formData.isTeacher} onChange={e => setFormData({...formData, isTeacher: e.target.checked})} />
                                                        <span className="text-sm font-bold text-gray-700">É Professor?</span>
                                                    </label>
                                                </div>

                                                <div className="border-t border-blue-200 pt-4">
                                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={createLogin} onChange={e => setCreateLogin(e.target.checked)} />
                                                        <span className="text-sm font-bold text-blue-800">Criar Login de Acesso ao Sistema</span>
                                                    </label>
                                                    
                                                    {createLogin && (
                                                        <div className="animate-in slide-in-from-top-2 pl-7">
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail para Login</label>
                                                            <input 
                                                                type="email" 
                                                                className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white" 
                                                                placeholder="email@exemplo.com"
                                                                value={formData.email || ''} 
                                                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                                            />
                                                            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 font-medium bg-blue-100/50 p-2 rounded border border-blue-200">
                                                                <Lock size={12} /> 
                                                                Senha padrão do sistema: <span className="font-mono font-bold text-blue-800">cemal2016</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-4">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Foto para Biometria Facial</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-300 overflow-hidden flex items-center justify-center shrink-0">
                                                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Users className="text-gray-400"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 mb-1"/>
                                                    <p className="text-xs text-gray-400">Recomendado: Rosto centralizado, fundo claro, boa iluminação.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                                            <Button type="submit" isLoading={isLoading}><Save size={16} className="mr-2"/> Salvar Cadastro</Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* LIST */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-brand-500 outline-none text-gray-900" placeholder="Buscar por nome ou cargo..." value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase">{filteredStaff.length} Registros</span>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                                    <tr>
                                        <th className="p-4">Colaborador</th>
                                        <th className="p-4">Função</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Situação Cadastral</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStaff.map(staff => {
                                         const hasAttention = !staff.active || !staff.photoUrl;
                                         const attention = !staff.active ? 'Inativo' : (!staff.photoUrl ? 'Sem Foto' : 'Regular');

                                         return (
                                            <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                                                        {staff.photoUrl ? <img src={staff.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2 text-gray-400"/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{staff.name}</p>
                                                        <p className="text-xs text-gray-500">{staff.workPeriod === 'morning' ? 'Matutino' : staff.workPeriod === 'afternoon' ? 'Vespertino' : 'Integral'}</p>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600 font-medium">
                                                    {staff.role} {staff.isTeacher && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">PROF</span>}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit ${staff.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {staff.active ? <CheckCircle size={10}/> : <XCircle size={10}/>} {staff.active ? 'Ativo' : 'Desligado'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${hasAttention ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                        {attention}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            onClick={() => handleEdit(staff)} 
                                                            className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar Cadastro"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(staff.id)} 
                                                            className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir Funcionário"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStaff.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum funcionário encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                         <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Clock className="text-red-500"/> Registro de Ponto</h1>
                                <p className="text-gray-400">Histórico de entradas e saídas da equipe</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 p-1 rounded-lg">
                                <Calendar className="text-gray-300 ml-2" size={18} />
                                <input 
                                    type="date" 
                                    value={dateFilter} 
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="bg-transparent border-none text-white font-bold text-sm focus:ring-0 p-2 outline-none"
                                />
                                <Button size="sm" onClick={exportReport} className="ml-2 bg-green-600 hover:bg-green-700 text-white font-bold">
                                    <FileSpreadsheet size={16} className="mr-2"/> Exportar CSV
                                </Button>
                            </div>
                        </header>

                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList size={16}/> Registros do Dia</h3>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{logs.length} Pontos</span>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                                    <tr>
                                        <th className="p-4">Horário</th>
                                        <th className="p-4">Colaborador</th>
                                        <th className="p-4">Cargo</th>
                                        <th className="p-4 text-center">Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono font-bold text-blue-600">
                                                {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-4 flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                                    {log.staffPhotoUrl ? <img src={log.staffPhotoUrl} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-1.5 text-gray-400"/>}
                                                </div>
                                                <span className="font-bold text-gray-800">{log.staffName}</span>
                                            </td>
                                            <td className="p-4 text-gray-500">{log.staffRole}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                                    <UserCheck size={12} className="inline mr-1"/> Ponto
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={4} className="p-12 text-center text-gray-400">Nenhum registro encontrado para esta data.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};