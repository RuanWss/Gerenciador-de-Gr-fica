
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, updateStudent, uploadReportFile, getAllPEIs, listenToAEEAppointments, saveAEEAppointment, deleteAEEAppointment } from '../services/firebaseService';
import { Student, PEIDocument, AEEAppointment } from '../types';
import { Button } from '../components/Button';
import { 
    Users, Search, Edit3, X, Save, FileText, UploadCloud, 
    CheckCircle, ShieldAlert, Heart, FileCheck, ExternalLink, School, Eye, List,
    Phone, UserCircle, MessageSquare, AlertTriangle, Star, Plus, Calendar, ChevronLeft, ChevronRight, Trash2, Clock
} from 'lucide-react';

import { INFANTIL_CLASSES, EFAI_CLASSES } from '../constants';

const DISORDERS = [
    "TEA (Autismo)",
    "TDAH",
    "Deficiência Intelectual",
    "Deficiência Auditiva",
    "Deficiência Visual",
    "Deficiência Física",
    "Altas Habilidades/Superdotação",
    "Transtorno de Aprendizagem",
    "TOD (Transtorno Opositor Desafiador)",
    "Síndrome de Down",
    "Paralisia Cerebral",
    "Outros"
];

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AEEDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'students' | 'pei_reports' | 'agenda'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState<'ALL' | 'EI' | 'EFAI' | 'EFAF' | 'EM'>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    
    // Agenda State
    const [appointments, setAppointments] = useState<AEEAppointment[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [newAppointment, setNewAppointment] = useState<Partial<AEEAppointment>>({
        time: '08:00',
        period: 'Manhã'
    });

    // Edit Modal (Students)
    const [showEdit, setShowEdit] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [reportFile, setReportFile] = useState<File | null>(null);

    // PEI View Modal
    const [showPeiView, setShowPeiView] = useState(false);
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);

    useEffect(() => {
        const unsub = listenToStudents((data) => {
            // EXIBIR APENAS ALUNOS MARCADOS COMO AEE
            setStudents(data.filter(s => s.isAEE));
        });
        const unsubAppointments = listenToAEEAppointments((data) => {
            setAppointments(data);
        });
        fetchPeis();
        return () => { unsub(); unsubAppointments(); };
    }, []);

    const fetchPeis = async () => {
        const data = await getAllPEIs();
        setAllPeis(data.sort((a,b) => b.updatedAt - a.updatedAt));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        setIsLoading(true);
        try {
            let reportUrl = selectedStudent.reportUrl;
            if (reportFile) {
                reportUrl = await uploadReportFile(reportFile, selectedStudent.name);
            }
            
            // Garantir que campos opcionais não sejam undefined para o Firestore
            const studentToUpdate: Student = {
                ...selectedStudent,
                reportUrl: reportUrl || '',
                pedagogicalResponsible: selectedStudent.pedagogicalResponsible || '',
                fatherName: selectedStudent.fatherName || '',
                motherName: selectedStudent.motherName || '',
                contacts: selectedStudent.contacts || '',
                skills: selectedStudent.skills || '',
                weaknesses: selectedStudent.weaknesses || '',
                disorder: selectedStudent.disorder || '',
                disorders: selectedStudent.disorders || [],
                otherDisorder: selectedStudent.otherDisorder || ''
            };

            await updateStudent(studentToUpdate);
            setShowEdit(false);
            setReportFile(null);
            alert("Ficha do Aluno AEE atualizada!");
        } catch (err: any) {
            console.error("Erro ao salvar prontuário:", err);
            alert("Erro ao salvar prontuário: " + (err.message || 'Erro desconhecido'));
        } finally {
            setIsLoading(false);
        }
    };

    // Calendar Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleSaveAppointment = async () => {
        if (!newAppointment.studentId || !newAppointment.date || !newAppointment.time) return alert("Preencha todos os campos");
        
        const student = students.find(s => s.id === newAppointment.studentId);
        
        const appointment: AEEAppointment = {
            id: '',
            studentId: newAppointment.studentId,
            studentName: student?.name || '',
            date: newAppointment.date,
            time: newAppointment.time,
            period: newAppointment.period || 'Manhã',
            description: newAppointment.description || '',
            createdAt: Date.now()
        };

        await saveAEEAppointment(appointment);
        setShowAppointmentModal(false);
        setNewAppointment({ time: '08:00', period: 'Manhã' });
    };

    const handleDeleteAppointment = async (id: string) => {
        if (confirm("Cancelar este agendamento?")) {
            await deleteAEEAppointment(id);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = String(s.name || '').toLowerCase().includes(search.toLowerCase()) || 
                              String(s.className || '').toLowerCase().includes(search.toLowerCase());
        
        if (!matchesSearch) return false;

        if (levelFilter === 'ALL') return true;
        const cls = (s.className || '').toUpperCase();
        if (levelFilter === 'EI') return INFANTIL_CLASSES.includes(cls);
        if (levelFilter === 'EFAI') return EFAI_CLASSES.includes(cls);
        if (levelFilter === 'EFAF') return ['6A','6B','7A','7B','8A','8B','9A','9B'].includes(cls);
        if (levelFilter === 'EM') return ['1A','1B','2A','2B','3A','3B'].includes(cls);
        
        return true;
    });

    const filteredPeis = allPeis.filter(p => 
        String(p.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.teacherName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.subject || '').toLowerCase().includes(search.toLowerCase())
    );

    // Render Calendar
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysCount; i++) calendarDays.push(i);

    const dayAppointments = appointments.filter(a => a.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3">
                        <Heart size={40} className="text-red-500 fill-red-500/20" /> Painel AEE
                    </h1>
                    <p className="text-gray-400 font-medium">Gestão de Atendimento Educacional Especializado</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mr-4">
                        <button onClick={() => setActiveTab('students')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'students' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Fila de Atendimento</button>
                        <button onClick={() => { setActiveTab('pei_reports'); fetchPeis(); }} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'pei_reports' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Relatórios PEI</button>
                        <button onClick={() => setActiveTab('agenda')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'agenda' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Agenda</button>
                    </div>
                    {activeTab !== 'agenda' && (
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto">
                                {['ALL', 'EI', 'EFAI', 'EFAF', 'EM'].map(level => (
                                    <button 
                                        key={level}
                                        onClick={() => setLevelFilter(level as any)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${levelFilter === level ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {level === 'ALL' ? 'Todos' : level}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all text-sm font-medium"
                                    placeholder="Buscar aluno inclusive..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {activeTab === 'agenda' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4">
                    {/* CALENDAR COLUMN */}
                    <div className="lg:col-span-2 bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Calendar className="text-red-500" size={28}/> Agenda de Atendimentos
                            </h2>
                            <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20}/></button>
                                <span className="text-sm font-black text-white uppercase tracking-widest min-w-[140px] text-center">{monthName}</span>
                                <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-4 mb-4">
                            {DAYS_OF_WEEK.map(d => (
                                <div key={d} className="text-center text-xs font-black text-gray-500 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-4">
                            {calendarDays.map((day, idx) => {
                                if (!day) return <div key={idx} className="h-24 md:h-32"></div>;
                                
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                                const dayApps = appointments.filter(a => a.date === dateStr);
                                const hasApps = dayApps.length > 0;

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`h-24 md:h-32 rounded-2xl border flex flex-col items-center justify-start p-3 cursor-pointer transition-all relative group ${
                                            isSelected 
                                            ? 'bg-red-600 border-red-500 text-white shadow-lg scale-105 z-10' 
                                            : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <span className={`text-sm font-black ${isSelected ? 'text-white' : (isToday ? 'text-red-500' : 'text-gray-500')}`}>{day}</span>
                                        {hasApps && (
                                            <div className="mt-2 flex flex-col gap-1 w-full">
                                                {dayApps.slice(0, 3).map((app, i) => (
                                                    <div key={i} className={`h-1.5 rounded-full w-full ${isSelected ? 'bg-white/40' : 'bg-red-500/40'}`}></div>
                                                ))}
                                                {dayApps.length > 3 && <div className={`h-1.5 w-1.5 rounded-full mx-auto ${isSelected ? 'bg-white' : 'bg-gray-500'}`}></div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DETAILS COLUMN */}
                    <div className="bg-[#18181b] border border-white/5 rounded-[2.5rem] p-8 shadow-xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                </h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                            </div>
                            <Button onClick={() => { setNewAppointment({ ...newAppointment, date: selectedDate }); setShowAppointmentModal(true); }} className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center p-0 shadow-lg shadow-red-900/40">
                                <Plus size={24} />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                            {dayAppointments.length > 0 ? dayAppointments.map(app => (
                                <div key={app.id} className="bg-black/20 border border-white/5 p-4 rounded-2xl group hover:border-red-500/30 transition-all relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xl font-black text-red-500 flex items-center gap-2">
                                            {app.time} <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-widest">{app.period}</span>
                                        </span>
                                        <button onClick={() => handleDeleteAppointment(app.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </div>
                                    <h4 className="font-bold text-white text-sm uppercase tracking-tight mb-1">{app.studentName}</h4>
                                    {app.description && <p className="text-xs text-gray-400 italic">"{app.description}"</p>}
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                    <Clock size={48} className="mb-4"/>
                                    <p className="text-xs font-black uppercase tracking-widest text-center">Sem atendimentos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4">
                    {filteredStudents.map(student => (
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
                                onClick={() => { setSelectedStudent(student); setShowEdit(true); }}
                                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-900/30 uppercase text-xs tracking-[0.15em] hover:scale-[1.02]"
                            >
                                <Edit3 size={18}/> Abrir Prontuário
                            </button>
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/5 opacity-40">
                             <Heart size={64} className="mx-auto text-gray-500 mb-4"/>
                             <p className="font-bold text-gray-400 uppercase tracking-widest">Nenhum aluno encaminhado para o AEE</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'pei_reports' && (
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                            <tr>
                                <th className="p-6">Aluno</th>
                                <th className="p-6">Professor / Disciplina</th>
                                <th className="p-6">Atualização</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPeis.map(pei => (
                                <tr key={pei.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-6">
                                        <p className="font-bold text-gray-800">{String(pei.studentName || '')}</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-bold text-gray-700 text-sm">{String(pei.teacherName || '')}</p>
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">{String(pei.subject || '')}</p>
                                    </td>
                                    <td className="p-6 text-xs text-gray-500 font-medium">
                                        {new Date(pei.updatedAt).toLocaleDateString()} {new Date(pei.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="p-6 text-center">
                                        <button 
                                            onClick={() => { setSelectedPei(pei); setShowPeiView(true); }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                                        >
                                            <Eye size={14}/> Abrir PEI
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* APPOINTMENT MODAL */}
            {showAppointmentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#18181b] border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Novo Agendamento</h3>
                            <button onClick={() => setShowAppointmentModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Aluno AEE</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                    value={newAppointment.studentId}
                                    onChange={e => setNewAppointment({...newAppointment, studentId: e.target.value})}
                                >
                                    <option value="">Selecione o Aluno...</option>
                                    {students.filter(s => s.isAEE).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Data</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600"
                                        value={newAppointment.date}
                                        onChange={e => setNewAppointment({...newAppointment, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Horário</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600"
                                        value={newAppointment.time}
                                        onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Período</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 appearance-none"
                                    value={newAppointment.period}
                                    onChange={e => setNewAppointment({...newAppointment, period: e.target.value as any})}
                                >
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Contraturno">Contraturno</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Descrição / Observações</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-red-600 min-h-[100px]"
                                    placeholder="Detalhes do atendimento..."
                                    value={newAppointment.description}
                                    onChange={e => setNewAppointment({...newAppointment, description: e.target.value})}
                                />
                            </div>
                            <Button onClick={handleSaveAppointment} className="w-full h-16 bg-red-600 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                                Confirmar Agendamento
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL (PRONTUÁRIO COMPLETO AEE) */}
            {showEdit && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Prontuário de Atendimento</h3>
                                <p className="text-sm text-gray-500 font-bold">{String(selectedStudent.name || '')}</p>
                            </div>
                            <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {/* SEÇÃO 1: DADOS FAMILIARES */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users size={14}/> Núcleo Familiar e Contatos
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsável Pedagógica</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.pedagogicalResponsible || ''} onChange={e => setSelectedStudent({...selectedStudent, pedagogicalResponsible: e.target.value})} placeholder="Nome da profissional responsável"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome do Pai</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.fatherName || ''} onChange={e => setSelectedStudent({...selectedStudent, fatherName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome da Mãe</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.motherName || ''} onChange={e => setSelectedStudent({...selectedStudent, motherName: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contatos (Telefones/E-mails)</label>
                                        <textarea rows={2} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.contacts || ''} onChange={e => setSelectedStudent({...selectedStudent, contacts: e.target.value})} placeholder="(XX) XXXXX-XXXX / exemplo@email.com"/>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 2: HABILIDADES E FRAGILIDADES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Star size={14}/> Habilidades (Pontos Fortes)
                                    </h4>
                                    <textarea 
                                        rows={4} 
                                        className="w-full border-2 border-emerald-200 rounded-xl p-4 text-sm focus:border-emerald-500 outline-none bg-white font-medium text-gray-900" 
                                        value={selectedStudent.skills || ''} 
                                        onChange={e => setSelectedStudent({...selectedStudent, skills: e.target.value})} 
                                        placeholder="Descreva as habilidades e facilidades do aluno..."
                                    />
                                </div>
                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <AlertTriangle size={14}/> Fragilidades (Dificuldades)
                                    </h4>
                                    <textarea 
                                        rows={4} 
                                        className="w-full border-2 border-amber-200 rounded-xl p-4 text-sm focus:border-amber-500 outline-none bg-white font-medium text-gray-900" 
                                        value={selectedStudent.weaknesses || ''} 
                                        onChange={e => setSelectedStudent({...selectedStudent, weaknesses: e.target.value})} 
                                        placeholder="Descreva as dificuldades e pontos de atenção..."
                                    />
                                </div>
                            </div>

                            {/* SEÇÃO 3: DADOS TÉCNICOS E COMORBIDADES */}
                            <div className="space-y-6 bg-red-50 p-6 rounded-3xl border border-red-100">
                                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">Transtornos e Comorbidades</h4>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Diagnósticos Adicionados</label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {(selectedStudent.disorders || (selectedStudent.disorder ? [selectedStudent.disorder] : [])).map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white border-2 border-red-100 px-4 py-2 rounded-xl">
                                                <span className="text-xs font-bold text-gray-700 uppercase">{d}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const current = selectedStudent.disorders || (selectedStudent.disorder ? [selectedStudent.disorder] : []);
                                                        const updated = current.filter(item => item !== d);
                                                        setSelectedStudent({ ...selectedStudent, disorders: updated, disorder: updated[0] || '' });
                                                    }} 
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <select 
                                        className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors bg-white cursor-pointer" 
                                        value="" 
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            const current = selectedStudent.disorders || (selectedStudent.disorder ? [selectedStudent.disorder] : []);
                                            if (!current.includes(val)) {
                                                const updated = [...current, val];
                                                setSelectedStudent({ ...selectedStudent, disorders: updated, disorder: updated[0] });
                                            }
                                        }}
                                    >
                                        <option value="">+ Adicionar Diagnóstico...</option>
                                        {DISORDERS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>

                                    {(selectedStudent.disorders?.includes('Outros') || selectedStudent.disorder === 'Outros') && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Especificar "Outros"</label>
                                            <input 
                                                className="w-full border-2 border-red-100 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" 
                                                value={selectedStudent.otherDisorder || ''} 
                                                onChange={e => setSelectedStudent({...selectedStudent, otherDisorder: e.target.value})} 
                                                placeholder="Descreva o diagnóstico..."
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Laudo Médico Atualizado (PDF)</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative bg-white">
                                        <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setReportFile(e.target.files[0])}/>
                                        {reportFile ? (<div className="text-green-600 flex flex-col items-center"><FileCheck size={40} className="mb-2"/><span className="font-bold">{reportFile.name}</span></div>) : (<div className="text-gray-400 flex flex-col items-center"><UploadCloud size={40} className="mb-2"/><span className="font-bold">Anexar Laudo Digital</span><span className="text-[10px]">Apenas arquivos PDF</span></div>)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <Button variant="outline" type="button" onClick={() => setShowEdit(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest border-2">Cancelar</Button>
                                <Button type="submit" isLoading={isLoading} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20"><Save size={20} className="mr-2"/> Salvar Cadastro</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PEI VIEW MODAL */}
            {showPeiView && selectedPei && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-3"><Heart size={24} className="text-red-600"/> Planejamento PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{String(selectedPei.studentName || '')} • Disciplina: {String(selectedPei.subject || '')} • {selectedPei.period || '1º Bimestre'}</p>
                            </div>
                            <button onClick={() => setShowPeiView(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Competências Essenciais</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.essentialCompetencies || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Conteúdos Selecionados</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.selectedContents || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Recursos Didáticos</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.didacticResources || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Avaliação</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.evaluation || 'Não preenchido'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiView(false)} className="px-10 h-14 bg-gray-800 hover:bg-black font-black uppercase tracking-widest">Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
