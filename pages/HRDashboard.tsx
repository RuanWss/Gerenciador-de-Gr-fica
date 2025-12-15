
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getStaffMembers, 
    saveStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    uploadStaffPhoto,
    listenToStaffLogs,
    createSystemUserAuth
} from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog, UserRole } from '../types';
import { Button } from '../components/Button';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Clock, 
  FileSpreadsheet, 
  Loader2,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Calendar,
  GraduationCap,
  Lock,
  Mail,
  Filter,
  MoreVertical,
  CheckSquare,
  Square,
  Search,
  X,
  ListPlus,
  Settings
} from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

export const HRDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'employees' | 'timesheet'>('employees');
    
    // Employee State
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // UI State for List View
    const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
    const [filterSearch, setFilterSearch] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');

    // Modal States
    const [showForm, setShowForm] = useState(false);
    const [showBatchForm, setShowBatchForm] = useState(false); // Novo estado para Lote
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form State
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('Professor'); // Default conforme imagem
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form Fields Extra
    const [workPeriod, setWorkPeriod] = useState<'morning' | 'afternoon' | 'full'>('morning');
    const [isTeacher, setIsTeacher] = useState(true); // Default true conforme imagem sugere contexto escolar
    const [teacherEmail, setTeacherEmail] = useState('');
    const [weeklyClasses, setWeeklyClasses] = useState({
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
    });

    // Batch State
    const [batchText, setBatchText] = useState('');

    // Photo Analysis
    const [photoStatus, setPhotoStatus] = useState<'idle' | 'analyzing' | 'valid' | 'invalid'>('idle');
    const [photoMessage, setPhotoMessage] = useState('');

    // Logs State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [logFilterDate, setLogFilterDate] = useState(new Date().toLocaleDateString('en-CA'));

    useEffect(() => {
        loadData();
        loadFaceModels();
    }, []);

    useEffect(() => {
        if (activeTab === 'timesheet') {
            const unsubscribe = listenToStaffLogs(logFilterDate, (data) => {
                setLogs(data);
            });
            return () => unsubscribe();
        }
    }, [activeTab, logFilterDate]);

    const loadData = async () => {
        setIsLoading(true);
        const list = await getStaffMembers();
        setStaffList(list.sort((a,b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
    };

    const loadFaceModels = async () => {
        const faceApi = (faceapi as any).default || faceapi;
        if (faceApi.nets && !faceApi.nets.ssdMobilenetv1.isLoaded) {
            try {
                await faceApi.nets.ssdMobilenetv1.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
            } catch (e) {
                console.warn("FaceAPI Models warning:", e);
            }
        }
    };

    const analyzePhoto = async (file: File) => {
        setPhotoStatus('analyzing');
        setPhotoMessage('Verificando rosto...');
        try {
            const faceApi = (faceapi as any).default || faceapi;
            const img = await faceApi.fetchImage(URL.createObjectURL(file));
            const detections = await faceApi.detectAllFaces(img, new faceApi.SsdMobilenetv1Options({ minConfidence: 0.5 }));
            
            if (detections.length === 1) {
                setPhotoStatus('valid');
                setPhotoMessage('Foto aprovada.');
            } else if (detections.length === 0) {
                setPhotoStatus('invalid');
                setPhotoMessage('Nenhum rosto.');
            } else {
                setPhotoStatus('invalid');
                setPhotoMessage('Múltiplos rostos.');
            }
        } catch (e) {
            console.error(e);
            setPhotoStatus('invalid');
            setPhotoMessage('Erro na análise.');
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewPhoto(e.target.files[0]);
            analyzePhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newName || !newRole) {
            alert("Preencha Nome e Função.");
            return;
        }

        setIsSaving(true);
        try {
            // AUTOMATIC LOGIN CREATION FOR ALL STAFF WITH EMAIL
            // Removed check for !editingId to allow creating login on update if it was missing
            if (teacherEmail) {
                try {
                    // Mapeamento de Role do Sistema baseado na função escolhida
                    let systemRole = UserRole.TEACHER; // Default para professores e outros
                    
                    if (newRole === 'Coordenador' || newRole === 'Diretor') {
                        systemRole = UserRole.HR; // Acesso administrativo
                    } else if (newRole === 'Secretaria') {
                        systemRole = UserRole.PRINTSHOP; // Acesso ao painel da escola/gráfica
                    }
                    // Professor mantém TEACHER
                    // Apoio/Outros mantêm TEACHER (limitado) ou acesso genérico para login funcionar

                    await createSystemUserAuth(teacherEmail, newName, systemRole);
                } catch (authError: any) {
                    if (authError.code !== 'auth/email-already-in-use') {
                        console.error("Auth error", authError);
                        alert("Atenção: O cadastro foi salvo, mas houve um erro ao criar o login de acesso: " + authError.message);
                    } else {
                        // Email já existe, não é um erro crítico, apenas significa que o usuário já tinha login
                        console.log("Email já cadastrado no Auth, prosseguindo com dados do banco.");
                    }
                }
            }

            let photoUrl = '';
            if (newPhoto) {
                photoUrl = await uploadStaffPhoto(newPhoto);
            } else if (editingId) {
                const existing = staffList.find(s => s.id === editingId);
                photoUrl = existing?.photoUrl || '';
            }

            const staffData: any = { // Using any to allow saving extra fields like email
                id: editingId || '',
                name: newName,
                role: newRole,
                email: teacherEmail, // Saving email to display in table
                photoUrl,
                active: true,
                createdAt: editingId ? (staffList.find(s=>s.id === editingId)?.createdAt || Date.now()) : Date.now(),
                workPeriod,
                isTeacher,
                weeklyClasses: isTeacher ? weeklyClasses : null
            };

            if (editingId) {
                await updateStaffMember(staffData);
            } else {
                await saveStaffMember({ ...staffData, id: '' });
            }
            
            alert(editingId ? "Atualizado com sucesso!" : "Cadastrado com sucesso! Login criado. Senha padrão: cemal2016");
            resetForm();
            loadData();
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Batch Registration Logic
    const handleBatchSubmit = async () => {
        if (!batchText.trim()) return;
        setIsSaving(true);
        try {
            const lines = batchText.split('\n');
            for (const line of lines) {
                // Formato esperado: Nome;Email;Função
                const parts = line.split(';');
                if (parts.length >= 1) {
                    const name = parts[0].trim();
                    const email = parts[1]?.trim() || '';
                    const role = parts[2]?.trim() || 'Professor';
                    
                    if (name) {
                         // Cria Login se tiver email
                         if (email) {
                             try {
                                 let systemRole = UserRole.TEACHER;
                                 if (role === 'Coordenador' || role === 'Diretor') systemRole = UserRole.HR;
                                 else if (role === 'Secretaria') systemRole = UserRole.PRINTSHOP;
                                 
                                 await createSystemUserAuth(email, name, systemRole);
                             } catch (e) { console.warn("Batch auth error", e); }
                         }

                         const staffData: any = {
                            id: '',
                            name: name,
                            role: role,
                            email: email,
                            photoUrl: '',
                            active: true,
                            createdAt: Date.now(),
                            workPeriod: 'morning',
                            isTeacher: role === 'Professor',
                            weeklyClasses: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 }
                        };
                        await saveStaffMember(staffData);
                    }
                }
            }
            alert("Processamento em lote concluído! Senha padrão para novos logins: cemal2016");
            setBatchText('');
            setShowBatchForm(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Erro no processamento em lote.");
        } finally {
            setIsSaving(false);
        }
    }

    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setNewName(staff.name);
        setNewRole(staff.role);
        setNewPhoto(null);
        setPhotoStatus('idle');
        setWorkPeriod(staff.workPeriod || 'morning');
        setIsTeacher(staff.isTeacher || false);
        // @ts-ignore
        setTeacherEmail(staff.email || '');
        if (staff.weeklyClasses) {
            setWeeklyClasses(staff.weeklyClasses);
        }
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Confirmar exclusão?")) {
            await deleteStaffMember(id);
            loadData();
        }
    };

    const handleBulkDelete = async () => {
        if (confirm(`Excluir ${selectedStaffIds.size} funcionários selecionados?`)) {
            setIsLoading(true);
            for (const id of selectedStaffIds) {
                await deleteStaffMember(id);
            }
            setSelectedStaffIds(new Set());
            loadData();
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setNewName('');
        setNewRole('Professor');
        setNewPhoto(null);
        setTeacherEmail('');
        setShowForm(false);
        setShowBatchForm(false);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedStaffIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStaffIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedStaffIds.size === filteredList.length) {
            setSelectedStaffIds(new Set());
        } else {
            setSelectedStaffIds(new Set(filteredList.map(s => s.id)));
        }
    };

    const filteredList = staffList.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                              (s as any).email?.toLowerCase().includes(filterSearch.toLowerCase());
        const matchesRole = filterRole === 'ALL' || s.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getAttentionPoint = (staff: StaffMember) => {
        if (!staff.photoUrl) return "SEM FOTO PARA BIOMETRIA";
        // @ts-ignore
        if (!staff.email) return "E-MAIL NÃO CADASTRADO";
        return "NENHUM PONTO DE ATENÇÃO";
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Briefcase className="text-brand-600" size={32} />
                        Gestão de RH
                    </h1>
                    <div className="flex gap-4 mt-4">
                        <button 
                            onClick={() => setActiveTab('employees')}
                            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'employees' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Professores / Equipe
                        </button>
                        <button 
                            onClick={() => setActiveTab('timesheet')}
                            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timesheet' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Controle de Ponto
                        </button>
                    </div>
                </div>
            </header>

            {/* --- LIST VIEW (Reference Image 2) --- */}
            {activeTab === 'employees' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {/* Filter Bar */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                            <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500">
                                <option>Ano letivo</option>
                                <option>2024</option>
                                <option>2025</option>
                            </select>
                            <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500">
                                <option>Segmento</option>
                                <option>Ensino Médio</option>
                                <option>Fundamental II</option>
                            </select>
                            <select 
                                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500"
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value)}
                            >
                                <option value="ALL">Todos os Cargos</option>
                                <option value="Professor">Professor</option>
                                <option value="Coordenador">Coordenador</option>
                                <option value="Secretaria">Secretaria</option>
                            </select>
                            
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white w-48 focus:ring-brand-500 focus:border-brand-500"
                                    placeholder="Buscar..."
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                />
                            </div>

                            <button className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700 transition-colors">
                                <Filter size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                             {selectedStaffIds.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors"
                                >
                                    Excluir ({selectedStaffIds.size})
                                </button>
                            )}

                             <div className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded">
                                Total = {filteredList.length}
                            </div>
                            
                            <button 
                                onClick={() => setShowBatchForm(true)}
                                className="bg-white border border-brand-200 text-brand-700 px-4 py-2.5 rounded-full text-sm font-bold hover:bg-brand-50 transition-colors flex items-center gap-2"
                            >
                                <ListPlus size={16} /> Em Lote
                            </button>

                            <button 
                                onClick={() => setShowForm(true)}
                                className="bg-brand-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                            >
                                Cadastrar professores
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="p-4 w-10 text-center">
                                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-brand-600">
                                            {selectedStaffIds.size > 0 && selectedStaffIds.size === filteredList.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </th>
                                    <th className="p-4 w-10 text-center">Nº</th>
                                    <th className="p-4 cursor-pointer hover:text-brand-600">NOME <Filter size={10} className="inline ml-1"/></th>
                                    <th className="p-4">FUNÇÃO</th>
                                    <th className="p-4 text-center">Nº DE TURMAS</th>
                                    <th className="p-4 cursor-pointer hover:text-brand-600">E-MAIL <Filter size={10} className="inline ml-1"/></th>
                                    <th className="p-4">PONTOS DE ATENÇÃO</th>
                                    <th className="p-4 text-center">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                                {filteredList.map((staff, index) => {
                                    const attention = getAttentionPoint(staff);
                                    const hasAttention = attention !== "NENHUM PONTO DE ATENÇÃO";
                                    return (
                                        <tr key={staff.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-4 text-center">
                                                <button onClick={() => toggleSelection(staff.id)} className={`${selectedStaffIds.has(staff.id) ? 'text-brand-600' : 'text-gray-300'}`}>
                                                    {selectedStaffIds.has(staff.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </button>
                                            </td>
                                            <td className="p-4 text-center text-gray-400 font-mono">{String(index + 1).padStart(2, '0')}</td>
                                            <td className="p-4">
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(staff); }} className="font-bold text-brand-700 underline hover:text-brand-900">
                                                    {staff.name.toUpperCase()}
                                                </a>
                                            </td>
                                            <td className="p-4">{staff.role}</td>
                                            <td className="p-4 text-center">{staff.isTeacher ? 'Variável' : '-'}</td>
                                            <td className="p-4 text-gray-500">{(staff as any).email || 'Não informado'}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${hasAttention ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                    {attention}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleEdit(staff)} className="text-gray-400 hover:text-brand-600 p-1">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- SINGLE REGISTRATION MODAL (Reference Image 1) --- */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header Minimalista */}
                        <div className="bg-blue-100/50 p-4 flex justify-between items-center border-b border-blue-100">
                             <div className="grid grid-cols-3 w-full gap-4 text-sm font-bold text-gray-700 uppercase">
                                 <div>Nome <span className="text-[10px] text-gray-400 normal-case block">Obrigatório</span></div>
                                 <div>E-mail <span className="text-[10px] text-gray-400 normal-case block">Obrigatório</span></div>
                                 <div>Função <span className="text-[10px] text-gray-400 normal-case block">Obrigatório</span></div>
                             </div>
                             <button onClick={resetForm} className="text-blue-400 hover:text-blue-600"><X size={20}/></button>
                        </div>

                        {/* Form Body - Minimalist Clean Look */}
                        <div className="p-8 flex-1 overflow-y-auto bg-white">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="border-b-2 border-blue-100 focus-within:border-blue-500 transition-colors">
                                        <input 
                                            className="w-full py-2 bg-transparent outline-none text-gray-800 placeholder-gray-300" 
                                            placeholder="Nome Completo"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="border-b-2 border-blue-100 focus-within:border-blue-500 transition-colors">
                                        <input 
                                            type="email"
                                            className="w-full py-2 bg-transparent outline-none text-gray-800 placeholder-gray-300" 
                                            placeholder="email@escola.com"
                                            value={teacherEmail}
                                            onChange={e => setTeacherEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="border-b-2 border-blue-100 focus-within:border-blue-500 transition-colors">
                                         <select 
                                            className="w-full py-2 bg-transparent outline-none text-gray-800"
                                            value={newRole}
                                            onChange={e => {
                                                setNewRole(e.target.value);
                                                setIsTeacher(e.target.value === 'Professor');
                                            }}
                                         >
                                             <option value="Professor">Professor</option>
                                             <option value="Coordenador">Coordenador</option>
                                             <option value="Diretor">Diretor</option>
                                             <option value="Secretaria">Secretaria</option>
                                             <option value="Apoio">Apoio / Limpeza</option>
                                         </select>
                                    </div>
                                </div>

                                {/* Extra Configs (Biometrics & Classes) - Subtle section */}
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Settings size={14}/> Configurações Adicionais</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Biometrics */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Foto para Biometria (FaceID)</label>
                                            <div className="flex items-center gap-4">
                                                <label className="cursor-pointer bg-white border border-gray-300 hover:border-brand-500 text-gray-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                                    <Users size={16} /> Escolher Foto
                                                    <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                                                </label>
                                                {photoStatus === 'valid' && <span className="text-green-600 text-xs font-bold flex items-center"><CheckCircle size={14} className="mr-1"/> OK</span>}
                                                {photoStatus === 'analyzing' && <span className="text-blue-600 text-xs flex items-center"><Loader2 size={14} className="animate-spin mr-1"/> ...</span>}
                                            </div>
                                        </div>

                                        {/* Work Period */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Jornada</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="wp" checked={workPeriod === 'morning'} onChange={() => setWorkPeriod('morning')} />
                                                    <span className="text-sm text-gray-600">Manhã</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="wp" checked={workPeriod === 'afternoon'} onChange={() => setWorkPeriod('afternoon')} />
                                                    <span className="text-sm text-gray-600">Tarde</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="wp" checked={workPeriod === 'full'} onChange={() => setWorkPeriod('full')} />
                                                    <span className="text-sm text-gray-600">Integral</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t border-gray-100 flex justify-center bg-white">
                            <button 
                                onClick={handleSubmit}
                                disabled={isSaving || photoStatus === 'analyzing'}
                                className="text-brand-600 font-bold hover:text-brand-800 transition-colors uppercase tracking-widest text-sm"
                            >
                                {isSaving ? 'Salvando...' : editingId ? 'Atualizar Dados' : 'Adicionar Professor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BATCH IMPORT MODAL --- */}
            {showBatchForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><ListPlus size={20}/> Importar em Lote</h3>
                             <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg mb-4 text-xs text-blue-800">
                            Cole a lista abaixo no formato: <strong>Nome; E-mail (opcional); Função (opcional)</strong>. Uma pessoa por linha.
                        </div>

                        <textarea 
                            className="w-full h-64 border border-gray-300 rounded-lg p-4 font-mono text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500"
                            placeholder="Exemplo:
Ana Silva; ana@escola.com; Professor
Carlos Souza; carlos@escola.com; Coordenador
Roberto Dias; ; Apoio"
                            value={batchText}
                            onChange={e => setBatchText(e.target.value)}
                        />

                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                            <Button onClick={handleBatchSubmit} isLoading={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">Processar Lista</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TIMESHEET TAB (Existing) --- */}
            {activeTab === 'timesheet' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-right-4">
                     <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-700">Controle de Ponto Diário</h2>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-500">Data:</label>
                                <input 
                                    type="date" 
                                    className="border border-gray-300 rounded-lg p-2 text-sm text-gray-900 bg-white shadow-sm" 
                                    value={logFilterDate}
                                    onChange={e => setLogFilterDate(e.target.value)}
                                />
                                <Button variant="outline" className="ml-2 border-gray-300 text-gray-600"><FileSpreadsheet size={16} className="mr-2"/> Exportar</Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">Hora</th>
                                        <th className="p-4">Funcionário</th>
                                        <th className="p-4">Cargo</th>
                                        <th className="p-4 text-center">Tipo de Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 animate-in slide-in-from-left-2 duration-300">
                                            <td className="p-4 font-mono font-bold text-brand-600">
                                                {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{log.staffName}</td>
                                            <td className="p-4 text-gray-500">{log.staffRole}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                                    PRESENÇA
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum registro encontrado para esta data.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                </div>
            )}
        </div>
    );
};
