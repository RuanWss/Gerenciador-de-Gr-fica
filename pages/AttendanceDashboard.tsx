import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, listenToAttendanceLogs } from '../services/firebaseService';
import { Student, AttendanceLog } from '../types';
import { CLASSES } from '../constants';
import { 
    Users, 
    UserCheck, 
    UserX, 
    TrendingUp, 
    Download, 
    Search, 
    LayoutGrid, 
    LogOut,
    User,
    Calendar,
    Filter,
    BarChart3,
    ArrowLeft
} from 'lucide-react';

export const AttendanceDashboard: React.FC = () => {
    const { logout, user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('Todos os Períodos');
    const [activeTab, setActiveTab] = useState<'presentes' | 'ausentes' | 'mensal'>('presentes');

    useEffect(() => {
        setIsLoading(true);
        const unsubStudents = listenToStudents((data) => {
            setStudents(data);
            setIsLoading(false);
        });
        return () => unsubStudents();
    }, []);

    useEffect(() => {
        const unsubLogs = listenToAttendanceLogs(selectedDate, (data) => {
            // Filter logs strictly for entry type if needed, or handle both
            setLogs(data.filter(l => l.type === 'entry' || !l.type));
        });
        return () => unsubLogs();
    }, [selectedDate]);

    // Derived Data
    const filteredStudents = useMemo(() => {
        if (!selectedClass || selectedClass === 'Todas as Turmas') {
            return students;
        }
        return students.filter(s => s.className === selectedClass);
    }, [students, selectedClass]);

    const presentStudentIds = useMemo(() => {
        return new Set(logs.map(l => l.studentId));
    }, [logs]);

    const stats = useMemo(() => {
        const total = filteredStudents.length;
        // Count how many of the filtered students are present
        const presentCount = filteredStudents.filter(s => presentStudentIds.has(s.id)).length;
        const absentCount = total - presentCount;
        const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

        return { total, present: presentCount, absent: absentCount, rate };
    }, [filteredStudents, presentStudentIds]);

    const displayedList = useMemo(() => {
        if (activeTab === 'presentes') {
            return filteredStudents.filter(s => presentStudentIds.has(s.id));
        } else if (activeTab === 'ausentes') {
            return filteredStudents.filter(s => !presentStudentIds.has(s.id));
        }
        return [];
    }, [filteredStudents, presentStudentIds, activeTab]);

    const handleExportCSV = () => {
        const headers = ["Nome", "Turma", "Status", "Data"];
        const rows = filteredStudents.map(s => [
            s.name,
            s.className,
            presentStudentIds.has(s.id) ? "Presente" : "Ausente",
            selectedDate
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `frequencia_${selectedDate}_${selectedClass || 'geral'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Format Date for Display
    const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
        day: 'numeric', month: 'long' 
    });

    return (
        <div className="min-h-screen text-white font-sans selection:bg-red-500/30">
            {/* Custom Navbar for this dashboard */}
            <nav className="h-20 bg-[#18181b]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-10 w-auto" alt="Logo"/>
                    <div className="h-6 w-px bg-white/10"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        GESTÃO DE FREQUÊNCIA
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {user?.roles && user.roles.length > 1 && (
                        <button onClick={() => window.location.reload()} className="p-3 text-gray-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5 hover:bg-white/10" title="Voltar ao Menu">
                            <LayoutGrid size={20}/>
                        </button>
                    )}
                    <button onClick={logout} className="p-3 text-red-500/50 hover:text-red-500 transition-all bg-white/5 rounded-xl border border-white/5 hover:bg-red-500/10" title="Sair">
                        <LogOut size={20}/>
                    </button>
                </div>
            </nav>

            <main className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Relatórios de Frequência</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Acompanhe a presença dos alunos</p>
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
                    >
                        <Download size={16}/> Exportar CSV
                    </button>
                </header>

                {/* Filters */}
                <div className="bg-[#18181b] p-8 rounded-[2.5rem] shadow-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Data</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none uppercase text-sm"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Período</label>
                        <select 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none cursor-pointer text-sm"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option>Todos os Períodos</option>
                            <option>Manhã</option>
                            <option>Tarde</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Turma</label>
                        <select 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-red-600 transition-all appearance-none cursor-pointer text-sm"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">Todas as Turmas</option>
                            {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#18181b] p-6 rounded-[2rem] shadow-xl border border-white/5 flex items-center gap-5 relative overflow-hidden group">
                        <div className="h-16 w-16 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-600/20 transition-all">
                            <Users size={28} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-white">{stats.total}</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                        </div>
                    </div>
                    <div className="bg-[#18181b] p-6 rounded-[2rem] shadow-xl border border-white/5 flex items-center gap-5 relative overflow-hidden group">
                        <div className="h-16 w-16 bg-green-600/10 text-green-500 rounded-2xl flex items-center justify-center border border-green-500/10 group-hover:bg-green-600/20 transition-all">
                            <UserCheck size={28} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-white">{stats.present}</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Presentes</p>
                        </div>
                    </div>
                    <div className="bg-[#18181b] p-6 rounded-[2rem] shadow-xl border border-white/5 flex items-center gap-5 relative overflow-hidden group">
                        <div className="h-16 w-16 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/10 group-hover:bg-red-600/20 transition-all">
                            <UserX size={28} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-white">{stats.absent}</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ausentes</p>
                        </div>
                    </div>
                    <div className="bg-[#18181b] p-6 rounded-[2rem] shadow-xl border border-white/5 flex items-center gap-5 relative overflow-hidden group">
                        <div className="h-16 w-16 bg-purple-600/10 text-purple-500 rounded-2xl flex items-center justify-center border border-purple-500/10 group-hover:bg-purple-600/20 transition-all">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-white">{stats.rate}%</h3>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Taxa</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setActiveTab('presentes')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'presentes' ? 'bg-[#10b981] text-white shadow-lg shadow-green-900/20' : 'bg-[#18181b] text-gray-500 hover:text-white border border-white/5'}`}
                    >
                        <UserCheck size={16}/> Presentes ({stats.present})
                    </button>
                    <button 
                        onClick={() => setActiveTab('ausentes')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ausentes' ? 'bg-white text-black shadow-lg' : 'bg-[#18181b] text-gray-500 hover:text-white border border-white/5'}`}
                    >
                        <UserX size={16}/> Ausentes ({stats.absent})
                    </button>
                    <button 
                        onClick={() => setActiveTab('mensal')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mensal' ? 'bg-white text-black shadow-lg' : 'bg-[#18181b] text-gray-500 hover:text-white border border-white/5'}`}
                    >
                        <Calendar size={16}/> Mensal
                    </button>
                </div>

                {/* List Content */}
                <div className="bg-[#18181b] rounded-[3rem] shadow-2xl border border-white/5 min-h-[500px] p-10 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`p-3 rounded-xl ${activeTab === 'presentes' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {activeTab === 'presentes' ? <UserCheck size={24}/> : <UserX size={24}/>}
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                            Alunos {activeTab === 'presentes' ? 'Presentes' : 'Ausentes'} - {formattedDate}
                        </h3>
                    </div>

                    {displayedList.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayedList.map(student => (
                                <div key={student.id} className="flex items-center gap-4 p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-black/40 transition-all group">
                                    <div className="h-12 w-12 rounded-full bg-black/40 border border-white/5 flex items-center justify-center text-gray-500 overflow-hidden group-hover:border-white/20">
                                        {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover"/> : <User size={20}/>}
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-xs uppercase tracking-tight">{student.name}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{student.className}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-50">
                            <div className="bg-black/40 p-8 rounded-full mb-6 border border-white/5">
                                <User size={64} />
                            </div>
                            <p className="font-black uppercase tracking-[0.2em] text-sm">Nenhum aluno {activeTab === 'presentes' ? 'presente' : 'ausente'} registrado</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
