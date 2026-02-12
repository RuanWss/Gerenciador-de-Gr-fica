
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToClassMaterials } from '../services/firebaseService';
import { ClassMaterial } from '../types';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { 
    Folder, Download, FileText, Search, 
    LogOut, FolderOpen, Lock, ArrowLeft
} from 'lucide-react';

const ACCESS_PIN = '020116';
const CLASSROOM_USER_EMAIL = 'cemal.salas@ceprofmal.com';
const CLASSROOM_USER_PASS = 'cemal#2016';

export const ClassroomFiles: React.FC = () => {
    const { user, login, logout } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Browse State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (selectedClass) {
            const unsub = listenToClassMaterials(selectedClass, (data) => {
                setMaterials(data.sort((a,b) => b.createdAt - a.createdAt));
            }, (err) => console.error(err));
            return () => unsub();
        }
    }, [selectedClass]);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        if (pin === ACCESS_PIN) {
            try {
                const success = await login(CLASSROOM_USER_EMAIL, CLASSROOM_USER_PASS);
                if (!success) setError('Erro de login no sistema.');
            } catch(e) {
                setError('Erro de conexão.');
            }
        } else {
            setError('PIN de acesso incorreto.');
            setPin('');
        }
        setLoading(false);
    };

    const handleLogout = () => {
        logout();
        setPin('');
        setSelectedClass('');
    };

    const filteredMaterials = materials.filter(m => {
        const matchesSubject = !selectedSubject || (m.subject && m.subject.includes(selectedSubject));
        const matchesSearch = !search || m.title.toLowerCase().includes(search.toLowerCase());
        return matchesSubject && matchesSearch;
    });

    const subjects = useMemo(() => {
        if (!selectedClass) return [];
        if (selectedClass.includes('EM')) return EM_SUBJECTS;
        if (selectedClass.includes('EFAF')) return EFAF_SUBJECTS;
        return ["GERAL", "LÍNGUA PORTUGUESA", "MATEMÁTICA", "HISTÓRIA", "GEOGRAFIA", "CIÊNCIAS", "ARTE", "INGLÊS"];
    }, [selectedClass]);

    if (!user || user.email !== CLASSROOM_USER_EMAIL) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center">
                    <div className="h-20 w-20 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Arquivos da Turma</h1>
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-8">Digite o PIN de acesso do terminal</p>
                    
                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <input 
                            type="password" 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-center text-white text-3xl font-black tracking-[0.5em] outline-none focus:border-blue-600 transition-all"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            maxLength={6}
                            placeholder="••••••"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest animate-pulse">{error}</p>}
                        <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40">
                            {loading ? 'Verificando...' : 'Acessar Arquivos'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans">
            <nav className="h-20 border-b border-white/5 bg-[#18181b] px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <FolderOpen className="text-blue-500" size={28} />
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tighter">Central de Arquivos</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Material Didático Digital</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-3 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 rounded-xl transition-all">
                    <LogOut size={20} />
                </button>
            </nav>

            <main className="p-8 max-w-7xl mx-auto">
                {!selectedClass ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-8">Selecione a Turma</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {CLASSES.map(cls => (
                                <button 
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className="h-32 bg-[#18181b] border border-white/5 hover:border-blue-600 hover:bg-blue-600/10 rounded-[2rem] flex flex-col items-center justify-center gap-2 group transition-all"
                                >
                                    <span className="text-gray-500 group-hover:text-blue-500 font-black text-xl">{cls.split(' ')[0]}</span>
                                    <span className="text-[10px] text-gray-600 group-hover:text-blue-400 font-bold uppercase tracking-widest">{cls.substring(cls.indexOf(' ') + 1)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={() => { setSelectedClass(''); setSelectedSubject(''); }} className="h-12 w-12 bg-[#18181b] border border-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{selectedClass}</h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Navegando em arquivos</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Sidebar Filters */}
                            <div className="w-full lg:w-64 space-y-2">
                                <button 
                                    onClick={() => setSelectedSubject('')}
                                    className={`w-full text-left px-5 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${!selectedSubject ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#18181b] text-gray-500 hover:text-white'}`}
                                >
                                    Todos os Arquivos
                                </button>
                                {subjects.map(sub => (
                                    <button 
                                        key={sub}
                                        onClick={() => setSelectedSubject(sub)}
                                        className={`w-full text-left px-5 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${selectedSubject === sub ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#18181b] text-gray-500 hover:text-white'}`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="bg-[#18181b] p-4 rounded-[2rem] border border-white/5 mb-6 flex items-center gap-4">
                                    <Search className="text-gray-500 ml-2" size={20} />
                                    <input 
                                        className="bg-transparent w-full text-white font-bold outline-none placeholder-gray-600"
                                        placeholder="Pesquisar material..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredMaterials.map(mat => (
                                        <div key={mat.id} className="bg-[#18181b] border border-white/5 p-6 rounded-[2rem] hover:border-blue-600/30 transition-all group relative overflow-hidden">
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-white text-sm uppercase tracking-tight mb-1 truncate">{mat.title}</h3>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{mat.subject || 'Geral'}</p>
                                                    <p className="text-[10px] text-gray-600">{new Date(mat.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <a 
                                                href={mat.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute bottom-6 right-6 h-10 w-10 bg-white/5 hover:bg-blue-600 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-all"
                                                title="Baixar"
                                            >
                                                <Download size={18} />
                                            </a>
                                        </div>
                                    ))}
                                    {filteredMaterials.length === 0 && (
                                        <div className="col-span-full py-20 text-center opacity-30">
                                            <FolderOpen size={64} className="mx-auto mb-4 text-gray-600" />
                                            <p className="font-black text-gray-500 uppercase tracking-widest">Nenhum arquivo encontrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
