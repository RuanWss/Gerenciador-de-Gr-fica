
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToClassMaterials, listenToStudentLoans } from '../services/firebaseService';
import { ClassMaterial, LibraryLoan } from '../types';
import { 
    Book, 
    Download, 
    FileText, 
    Folder, 
    LogOut, 
    Search, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    GraduationCap,
    LayoutGrid,
    BookOpen
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'materials' | 'library'>('materials');
    
    // Materials State
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Library State
    const [loans, setLoans] = useState<LibraryLoan[]>([]);

    useEffect(() => {
        if (user?.studentData?.className) {
            const unsubMaterials = listenToClassMaterials(user.studentData.className, (data) => {
                setMaterials(data.sort((a,b) => b.createdAt - a.createdAt));
            }, (err) => console.error(err));
            return () => unsubMaterials();
        }
    }, [user]);

    useEffect(() => {
        if (user?.id) {
            // NOTE: The user ID in auth corresponds to the student ID in the students collection because we set it that way in generateStudentCredentials
            const unsubLoans = listenToStudentLoans(user.id, (data) => {
                setLoans(data.sort((a,b) => b.loanDate.localeCompare(a.loanDate)));
            }, (err) => console.error(err));
            return () => unsubLoans();
        }
    }, [user]);

    // Material Filtering Logic
    const getFileCategory = (file: ClassMaterial) => {
        let subject = file.subject ? file.subject.trim().toUpperCase() : 'GERAL';
        if (!subject || subject === 'GERAL') {
            if (file.teacherName && file.teacherName.includes(' - ')) {
                const parts = file.teacherName.split(' - ');
                if (parts.length > 1) subject = parts[parts.length - 1].trim().toUpperCase();
            }
        }
        return subject;
    };

    const uniqueSubjects = Array.from(new Set(materials.map(m => getFileCategory(m)))).sort();

    const filteredMaterials = materials.filter(m => {
        const matchesSubject = selectedSubject ? getFileCategory(m) === selectedSubject : true;
        const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesSearch;
    });

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
        return <FileText size={24} className="text-blue-500" />;
    };

    // Library Logic
    const isLate = (dueDate: string) => {
        return new Date() > new Date(dueDate + 'T23:59:59');
    };

    return (
        <div className="min-h-screen bg-[#0f0f10] text-gray-100 font-sans selection:bg-blue-500/30 flex flex-col">
            {/* Header */}
            <header className="bg-[#18181b] border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-600/20 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white uppercase tracking-widest">Portal do Aluno</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                {user?.name} • {user?.studentData?.className}
                            </p>
                        </div>
                    </div>
                    <button onClick={logout} className="p-2 text-gray-500 hover:text-white transition-colors" title="Sair">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-6 pt-8 w-full">
                <div className="flex gap-4 border-b border-white/5 pb-1">
                    <button 
                        onClick={() => setActiveTab('materials')}
                        className={`pb-3 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'materials' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Materiais de Aula
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`pb-3 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'library' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Biblioteca
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                            <div className="flex-1 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                <button 
                                    onClick={() => setSelectedSubject(null)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${!selectedSubject ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                >
                                    Todos
                                </button>
                                {uniqueSubjects.map(sub => (
                                    <button 
                                        key={sub}
                                        onClick={() => setSelectedSubject(sub)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedSubject === sub ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all placeholder-gray-600"
                                    placeholder="Buscar arquivo..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMaterials.map(file => (
                                <div key={file.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group flex flex-col">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 shrink-0">
                                            {getFileIcon(file.fileType)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1" title={file.title}>{file.title}</h4>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">{getFileCategory(file)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="text-[10px] text-gray-600 font-bold uppercase">
                                            {new Date(file.createdAt).toLocaleDateString()}
                                        </div>
                                        <a 
                                            href={file.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                            title="Baixar"
                                        >
                                            <Download size={16}/>
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {filteredMaterials.length === 0 && (
                                <div className="col-span-full py-20 text-center opacity-30">
                                    <Folder size={48} className="mx-auto text-gray-500 mb-4"/>
                                    <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Nenhum material encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                        <div className="bg-[#18181b] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 bg-black/20 flex items-center gap-4">
                                <BookOpen className="text-blue-500" size={24} />
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Histórico de Empréstimos</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 text-gray-500 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="p-6">Obra Literária</th>
                                            <th className="p-6">Data Retirada</th>
                                            <th className="p-6">Devolução Prevista</th>
                                            <th className="p-6 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loans.map(loan => {
                                            const overdue = loan.status === 'active' && isLate(loan.dueDate);
                                            return (
                                                <tr key={loan.id} className="hover:bg-white/[0.02]">
                                                    <td className="p-6 font-bold text-white text-sm">{loan.bookTitle}</td>
                                                    <td className="p-6 text-xs text-gray-400 font-mono">{new Date(loan.loanDate + 'T12:00:00').toLocaleDateString()}</td>
                                                    <td className="p-6 text-xs text-gray-400 font-mono">{new Date(loan.dueDate + 'T12:00:00').toLocaleDateString()}</td>
                                                    <td className="p-6 text-center">
                                                        {loan.status === 'returned' ? (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 text-green-500 border border-green-500/20 text-[9px] font-black uppercase tracking-widest">
                                                                <CheckCircle2 size={12}/> Devolvido
                                                            </span>
                                                        ) : overdue ? (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                                <AlertCircle size={12}/> Atrasado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest">
                                                                <Clock size={12}/> Em Aberto
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {loans.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-gray-600 font-black uppercase tracking-widest text-xs opacity-50">
                                                    Nenhum registro de empréstimo
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
