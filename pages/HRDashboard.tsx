
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getStaffMembers, 
    saveStaffMember, 
    updateStaffMember, 
    deleteStaffMember, 
    uploadStaffPhoto,
    getStaffLogs
} from '../services/firebaseService';
import { StaffMember, StaffAttendanceLog } from '../types';
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
  GraduationCap
} from 'lucide-react';
// @ts-ignore
import * as faceapi from 'face-api.js';

export const HRDashboard: React.FC = () => {
    // Agora integrado ao layout principal, não precisa de logout aqui
    const [activeTab, setActiveTab] = useState<'employees' | 'timesheet'>('employees');
    
    // Employee State
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form State
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Novos Estados do Form (Jornada)
    const [workPeriod, setWorkPeriod] = useState<'morning' | 'afternoon' | 'full'>('morning');
    const [isTeacher, setIsTeacher] = useState(false);
    const [weeklyClasses, setWeeklyClasses] = useState({
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
    });

    // Photo Analysis
    const [photoStatus, setPhotoStatus] = useState<'idle' | 'analyzing' | 'valid' | 'invalid'>('idle');
    const [photoMessage, setPhotoMessage] = useState('');

    // Logs State
    const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
    const [logFilterDate, setLogFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
        loadFaceModels();
    }, []);

    useEffect(() => {
        if (activeTab === 'timesheet') {
            loadLogs();
        }
    }, [activeTab, logFilterDate]);

    const loadData = async () => {
        setIsLoading(true);
        const list = await getStaffMembers();
        setStaffList(list.sort((a,b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
    };

    const loadLogs = async () => {
        const data = await getStaffLogs(logFilterDate);
        setLogs(data);
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
                setPhotoMessage('Foto aprovada para biometria.');
            } else if (detections.length === 0) {
                setPhotoStatus('invalid');
                setPhotoMessage('Nenhum rosto detectado.');
            } else {
                setPhotoStatus('invalid');
                setPhotoMessage('Múltiplos rostos detectados.');
            }
        } catch (e) {
            console.error(e);
            setPhotoStatus('invalid');
            setPhotoMessage('Erro na análise (IA não carregada ou imagem inválida).');
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
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        setIsSaving(true);
        try {
            let photoUrl = '';
            
            // Lógica de Upload da Foto
            if (newPhoto) {
                try {
                    photoUrl = await uploadStaffPhoto(newPhoto);
                } catch (uploadError: any) {
                    console.error("Erro upload:", uploadError);
                    const confirmContinue = window.confirm(
                        "Falha ao enviar a foto (Erro de Upload/Permissão). Deseja salvar o funcionário SEM foto?"
                    );
                    if (!confirmContinue) {
                        setIsSaving(false);
                        return;
                    }
                    // Se continuar, photoUrl fica vazia
                }
            } else if (editingId) {
                // Mantém a foto antiga se não enviou nova
                const existing = staffList.find(s => s.id === editingId);
                photoUrl = existing?.photoUrl || '';
            }

            const staffData: StaffMember = {
                id: editingId || '',
                name: newName,
                role: newRole,
                photoUrl,
                active: true,
                createdAt: editingId ? (staffList.find(s=>s.id === editingId)?.createdAt || Date.now()) : Date.now(),
                // Novos campos
                workPeriod,
                isTeacher,
                weeklyClasses: isTeacher ? weeklyClasses : undefined
            };

            if (editingId) {
                await updateStaffMember(staffData);
                alert("Funcionário atualizado com sucesso!");
            } else {
                await saveStaffMember({ ...staffData, id: '' });
                alert("Funcionário cadastrado com sucesso!");
            }
            
            resetForm();
            loadData();
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            let msg = "Erro desconhecido.";
            if (error.code === 'permission-denied') msg = "Permissão Negada: Você não tem permissão para alterar o banco de dados.";
            if (error.message) msg = error.message;
            
            alert(`Erro ao salvar: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (staff: StaffMember) => {
        setEditingId(staff.id);
        setNewName(staff.name);
        setNewRole(staff.role);
        setNewPhoto(null);
        setPhotoStatus('idle');
        
        // Populate new fields
        setWorkPeriod(staff.workPeriod || 'morning');
        setIsTeacher(staff.isTeacher || false);
        if (staff.weeklyClasses) {
            setWeeklyClasses(staff.weeklyClasses);
        } else {
            setWeeklyClasses({ monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 });
        }

        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Deseja realmente desligar este funcionário? Isso removerá o acesso ao ponto.")) {
            try {
                await deleteStaffMember(id);
                loadData();
            } catch (error: any) {
                alert("Erro ao excluir: " + (error.message || "Permissão negada"));
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setNewName('');
        setNewRole('');
        setNewPhoto(null);
        setPhotoStatus('idle');
        setPhotoMessage('');
        
        // Reset new fields
        setWorkPeriod('morning');
        setIsTeacher(false);
        setWeeklyClasses({ monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 });
        
        setShowForm(false);
    };

    const handleClassCountChange = (day: keyof typeof weeklyClasses, value: string) => {
        setWeeklyClasses(prev => ({
            ...prev,
            [day]: Number(value)
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Briefcase className="text-blue-600" size={32} />
                    Recursos Humanos
                </h1>
                <p className="text-gray-500 mt-1">Gerenciamento de Equipe e Ponto Eletrônico</p>
            </header>

            <div>
                {/* TABS */}
                <div className="flex gap-4 mb-6 border-b border-gray-200 pb-1">
                    <button 
                        onClick={() => setActiveTab('employees')}
                        className={`px-6 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'employees' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Users size={18} /> Gestão de Funcionários
                    </button>
                    <button 
                        onClick={() => setActiveTab('timesheet')}
                        className={`px-6 py-3 font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'timesheet' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Clock size={18} /> Relatórios de Ponto
                    </button>
                </div>

                {/* EMPLOYEES TAB */}
                {activeTab === 'employees' && (
                    <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-700">Quadro de Funcionários</h2>
                            <Button onClick={() => setShowForm(!showForm)}>
                                {showForm ? 'Fechar Formulário' : 'Novo Funcionário'} <UserPlus size={18} className="ml-2"/>
                            </Button>
                        </div>

                        {showForm && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 animate-in slide-in-from-top-4">
                                <h3 className="font-bold text-blue-800 mb-4">{editingId ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}</h3>
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* DADOS PESSOAIS */}
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                        <input className="w-full border p-2 rounded" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: Maria da Silva" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Cargo / Função</label>
                                        <input className="w-full border p-2 rounded" value={newRole} onChange={e => setNewRole(e.target.value)} required placeholder="Ex: Auxiliar de Limpeza" />
                                    </div>

                                    {/* JORNADA DE TRABALHO (NOVO) */}
                                    <div className="col-span-2 bg-white/50 p-4 rounded-lg border border-blue-100">
                                        <h4 className="text-sm font-black text-blue-800 uppercase mb-3 flex items-center gap-2">
                                            <Calendar size={16} /> Informações Contratuais
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Período de Trabalho</label>
                                                <select 
                                                    className="w-full border p-2 rounded text-sm bg-white"
                                                    value={workPeriod}
                                                    onChange={e => setWorkPeriod(e.target.value as any)}
                                                >
                                                    <option value="morning">Matutino (Manhã)</option>
                                                    <option value="afternoon">Vespertino (Tarde)</option>
                                                    <option value="full">Integral</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center">
                                                <label className="flex items-center gap-2 cursor-pointer bg-blue-100/50 hover:bg-blue-100 p-2 rounded-lg transition-colors w-full">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isTeacher} 
                                                        onChange={e => setIsTeacher(e.target.checked)}
                                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800">É Professor?</span>
                                                        <span className="text-[10px] text-gray-500">Habilita contagem de aulas</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* GRADE DE AULAS */}
                                        {isTeacher && (
                                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                                                    <GraduationCap size={14} /> Quantidade de Aulas por Dia
                                                </label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                                                        <div key={day} className="flex flex-col items-center">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                                {day === 'monday' ? 'Seg' : day === 'tuesday' ? 'Ter' : day === 'wednesday' ? 'Qua' : day === 'thursday' ? 'Qui' : 'Sex'}
                                                            </span>
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="10"
                                                                className="w-full text-center border p-1 rounded font-bold text-blue-800"
                                                                value={weeklyClasses[day as keyof typeof weeklyClasses]}
                                                                onChange={e => handleClassCountChange(day as any, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FOTO BIOMETRIA */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Foto para Biometria</label>
                                        <div className="flex items-center gap-4">
                                            <input type="file" onChange={handlePhotoChange} className="text-sm" accept="image/*" />
                                            {photoStatus === 'analyzing' && <span className="text-blue-600 text-xs flex items-center"><Loader2 size={12} className="animate-spin mr-1"/> Analisando...</span>}
                                            {photoStatus === 'valid' && <span className="text-green-600 text-xs font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> Foto Válida</span>}
                                            {photoStatus === 'invalid' && <span className="text-red-600 text-xs font-bold flex items-center"><AlertCircle size={12} className="mr-1"/> {photoMessage}</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">A foto deve conter apenas o rosto do funcionário, sem óculos escuros ou máscara.</p>
                                    </div>
                                    <div className="col-span-2 flex gap-3">
                                        <Button type="submit" isLoading={isSaving} disabled={photoStatus === 'analyzing'}>
                                            Salvar Dados
                                        </Button>
                                        <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">Funcionário</th>
                                        <th className="p-4">Cargo</th>
                                        <th className="p-4">Jornada</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {staffList.map(staff => (
                                        <tr key={staff.id} className="hover:bg-gray-50">
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                                    {staff.photoUrl ? <img src={staff.photoUrl} className="h-full w-full object-cover" alt={staff.name} /> : <Users className="p-2 text-gray-400"/>}
                                                </div>
                                                <span className="font-bold text-gray-800">{staff.name}</span>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {staff.role}
                                                {staff.isTeacher && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">PROF</span>}
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs">
                                                {staff.workPeriod === 'morning' ? 'Matutino' : staff.workPeriod === 'afternoon' ? 'Vespertino' : 'Integral'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${staff.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {staff.active ? 'Ativo' : 'Desligado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleEdit(staff)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit3 size={18} /></button>
                                                <button onClick={() => handleDelete(staff.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {staffList.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum funcionário cadastrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TIMESHEET TAB */}
                {activeTab === 'timesheet' && (
                    <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-700">Controle de Ponto Diário</h2>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-500">Data:</label>
                                <input 
                                    type="date" 
                                    className="border rounded p-2 text-sm" 
                                    value={logFilterDate}
                                    onChange={e => setLogFilterDate(e.target.value)}
                                />
                                <Button variant="outline" className="ml-2"><FileSpreadsheet size={16} className="mr-2"/> Exportar Relatório</Button>
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
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono font-bold text-blue-600">
                                                {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{log.staffName}</td>
                                            <td className="p-4 text-gray-500">{log.staffRole}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                                                    BATIDA DE PONTO
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
        </div>
    );
};
