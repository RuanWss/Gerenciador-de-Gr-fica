
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToClassMaterials } from '../services/firebaseService';
import { ClassMaterial } from '../types';
import { useAuth } from '../context/AuthContext';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { 
    Folder, Download, FileText, Image as ImageIcon, 
    Bell, AlertTriangle, ArrowLeft, LogOut, Search, 
    Grid, List as ListIcon, Clock, ChevronRight, Lock, LogIn, LayoutGrid, FolderOpen, Delete
} from 'lucide-react';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const ACCESS_PIN = '020116';
const CLASSROOM_USER_EMAIL = 'cemal.salas@ceprofmal.com';
const CLASSROOM_USER_PASS = 'cemal#2016';

export const ClassroomFiles: React.FC = () => {
    const { user, login, logout } = useAuth();
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const availableClasses = useMemo(() => CLASSES, []);

    const currentSubjectsList = useMemo(() => {
        if (!selectedClassName) return [];
        if (selectedClassName.includes('SÉRIE') || selectedClassName.includes('EM')) return EM_SUBJECTS;
        if (selectedClassName.includes('EFAF')) return EFAF_SUBJECTS;
        return [
            "GERAL", "LÍNGUA PORTUGUESA", "MATEMÁTICA", "HISTÓRIA", "GEOGRAFIA", 
            "CIÊNCIAS", "ARTE", "INGLÊS", "EDUCAÇÃO FÍSICA", "ENSINO RELIGIOSO", 
            "PROJETOS", "AVALIAÇÕES"
        ];
    }, [selectedClassName]);

    // Função auxiliar para normalizar nomes de disciplinas (remove espaços extras e força maiúsculas)
    const normalizeSubject = (s: string | undefined | null) => (s || 'GERAL').trim().toUpperCase();

    const displaySubjects = useMemo(() => {
        // Normaliza disciplinas dos materiais e da lista padrão para garantir agrupamento correto
        const materialSubjects = new Set(materials.map(m => normalizeSubject(m.subject)));
        const defaultSubjects = new Set(currentSubjectsList.map(s => s.trim().toUpperCase()));
        return Array.from(new Set([...defaultSubjects, ...materialSubjects])).sort();
    }, [materials, currentSubjectsList]);

    useEffect(() => {
        const savedClass = localStorage.getItem('classroom_selected_class');
        if (savedClass && availableClasses.includes(savedClass)) {
            setSelectedClassName(savedClass);
        }
    }, [availableClasses]);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
        }
    };

    const verifyPin = async (finalPin: string) => {
        if (finalPin === ACCESS_PIN) {
            setIsAuthenticating(true);
            const success = await login(CLASSROOM_USER_EMAIL, CLASSROOM_USER_PASS);
            if (!success) {
                setPinError(true);
                setPin('');
                setIsAuthenticating(false);
            }
        } else {
            setPinError(true);
            setTimeout(() => {
                setPin('');
                setPinError(false);
            }, 500);
        }
    };

    const handlePinClick = (num: string) => {
        setPin(prev => {
            if (prev.length >= 6) return prev;
            const next = prev + num;
            if (next.length === 6) {
                verifyPin(next);
            }
            return next;
        });
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setPinError(false);
    };

    useEffect(() => {
        if (user) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handlePinClick(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [user]);

    useEffect(() => {
        if (!selectedClassName || !user) return;
        setIsLoading(true);
        setError(null);
        setPermissionDenied(false);
        setSelectedSubject(null); 
        localStorage.setItem('classroom_selected_class', selectedClassName);
        const unsubscribe = listenToClassMaterials(
            selectedClassName, 
            (newMaterials) => {
                setIsLoading(false);
                setError(null);
                setPermissionDenied(false);
                newMaterials.sort((a, b) => b.createdAt - a.createdAt);
                if (!isFirstLoad.current && newMaterials.length > 0) {
                     const latestFile = newMaterials[0];
                     const currentLatestId = materials.length > 0 ? materials[0].id : null;
                     if (latestFile.id !== currentLatestId && latestFile.id) {
                         playNotification();
                         if (autoOpen) window.open(latestFile.fileUrl, '_blank');
                     }
                }
                setMaterials(newMaterials);
                isFirstLoad.current = false;
            },
            (err) => {
                setIsLoading(false);
                if (err.code === 'permission-denied') setPermissionDenied(true);
                else setError("Erro de conexão ao buscar arquivos.");
            }
        );
        return () => unsubscribe();
    }, [selectedClassName, user]);

    const filteredMaterials = useMemo(() => {
        let filtered = materials;
        // Filtragem insensível a maiúsculas/minúsculas e espaços
        if (selectedSubject) {
            filtered = filtered.filter(m => normalizeSubject(m.subject) === selectedSubject);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(m => m.title.toLowerCase().includes(q) || m.teacherName.toLowerCase().includes(q));
        }
        return filtered;
    }, [materials, selectedSubject, searchQuery]);

    const getFileCount = (subject: string) => materials.filter(m => normalizeSubject(m.subject) === subject).length;

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={28} className="text-red-500" />;
        if (type.includes('image')) return <ImageIcon size={28} className="text-blue-500" />;
        return <FileText size={28} className="text-gray-400" />;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none" />
                <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-10">
                        <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 mx-auto mb-8 drop-shadow-2xl" alt="Logo"/>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Arquivos da Turma</h2>
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.3em]">Acesso Restrito via PIN</p>
                    </div>
                    <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        {isAuthenticating && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></div>
                                <p className="text-white font-bold uppercase tracking-widest text-xs">Autenticando...</p>
                            </div>
                        )}
                        <div className="flex justify-center gap-4 mb-8">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pinError ? 'bg-red-500 animate-bounce' : pin.length > i ? 'bg-white scale-110 shadow-[0_0_10px_white]' : 'bg-white/10'}`} />
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button key={num} onClick={() => handlePinClick(String(num))} className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all border border-white/5 text-xl font-bold text-white flex items-center justify-center shadow-lg">{num}</button>
                            ))}
                            <div className="col-start-2">
                                <button onClick={() => handlePinClick('0')} className="w-full h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all border border-white/5 text-xl font-bold text-white flex items-center justify-center shadow-lg">0</button>
                            </div>
                            <div className="col-start-3">
                                <button onClick={handleBackspace} className="w-full h-16 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 transition-all border border-red-500/20 text-red-500 flex items-center justify-center shadow-lg"><ArrowLeft size={24} /></button>
                            </div>
                        </div>
                        {pinError && <p className="text-red-500 font-bold uppercase text-[10px] tracking-widest text-center mt-4 animate-pulse">PIN Incorreto</p>}
                    </div>
                    <button onClick={() => window.location.href = '/'} className="mt-10 text-gray-600 hover:text-white text-xs font-bold uppercase tracking-widest w-full text-center transition-colors">Voltar ao Início</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-gray-100 font-sans selection:bg-red-500/30 flex flex-col">
            <audio ref={audioRef} src={NOTIFICATION_SOUND} />
            <header className="bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-10 w-auto" alt="Logo" />
                        <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                        <div className="hidden md:block">
                            <h1 className="text-sm font-black text-white uppercase tracking-widest">Arquivos da Turma</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Acesso ao Material Didático</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <select value={selectedClassName} onChange={(e) => { setSelectedClassName(e.target.value); setSearchQuery(''); }} className="appearance-none bg-[#18181b] border border-white/10 text-white font-bold text-xs uppercase tracking-widest py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-red-600 transition-all cursor-pointer min-w-[180px]">
                                <option value="">Selecione a Turma</option>
                                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><ChevronRight size={14} className="rotate-90"/></div>
                        </div>
                        <button onClick={() => setAutoOpen(!autoOpen)} className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${autoOpen ? 'bg-green-600/10 border-green-600/30 text-green-500' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`} title="Auto">
                            <div className={`w-2 h-2 rounded-full ${autoOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Auto</span>
                        </button>
                        <button onClick={logout} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all" title="Encerrar Acesso"><LogOut size={18} /></button>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                {error && <div className="bg-red-950/30 border border-red-500/20 rounded-2xl p-8 text-center max-w-xl mx-auto mt-10"><AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/><h3 className="text-xl font-bold text-white mb-2">Erro de Conexão</h3><p className="text-red-300 text-sm">{error}</p></div>}
                {permissionDenied && <div className="bg-[#18181b] border border-white/5 rounded-[2rem] p-12 text-center max-w-xl mx-auto mt-10 shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-purple-600 to-red-600"></div><div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} className="text-red-500"/></div><h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Sessão Expirada</h3><p className="text-gray-400 text-sm mb-8 font-medium">Por favor, reinicie o acesso com o PIN.</p><button onClick={logout} className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-red-900/20"><LogIn size={16} /> Reiniciar Acesso</button></div>}
                {!selectedClassName ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in duration-500"><div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5"><FolderOpen size={64} className="text-gray-600 opacity-50" /></div><h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Nenhuma Turma Selecionada</h2><p className="text-gray-500 font-medium max-w-md">Utilize o seletor no topo da página para acessar o material didático da sua turma.</p></div>
                ) : !isLoading && !permissionDenied && !error && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#18181b] p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap"><button onClick={() => setSelectedSubject(null)} className={`flex items-center gap-2 font-black uppercase tracking-widest transition-colors ${!selectedSubject ? 'text-white' : 'text-gray-500 hover:text-white'}`}><LayoutGrid size={16}/> {selectedClassName}</button>{selectedSubject && (<><ChevronRight size={14} className="text-gray-600"/><span className="text-red-500 font-black uppercase tracking-widest">{selectedSubject}</span></>)}</div>
                            {selectedSubject && (<div className="relative w-full md:w-64 group"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors"/><input type="text" placeholder="Filtrar arquivos..." className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-red-600 transition-all uppercase placeholder:normal-case" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div>)}
                        </div>
                        {!selectedSubject ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {displaySubjects.map(subject => {
                                    const count = getFileCount(subject);
                                    return (
                                        <button key={subject} onClick={() => setSelectedSubject(subject)} className="group bg-[#18181b] hover:bg-[#202024] border border-white/5 hover:border-red-600/30 p-6 rounded-[1.5rem] text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-lg hover:shadow-xl hover:shadow-red-900/10 hover:-translate-y-1"><div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={16} className="text-red-500"/></div><div className="mb-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-colors ${count > 0 ? 'bg-red-600/10 text-red-500' : 'bg-white/5 text-gray-600'}`}><Folder size={24} fill="currentColor" fillOpacity={0.2} /></div></div><div><h3 className="text-xs font-black text-gray-200 uppercase tracking-wider leading-tight group-hover:text-white mb-1">{subject}</h3><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest group-hover:text-gray-500">{count} {count === 1 ? 'Arquivo' : 'Arquivos'}</p></div></button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-right-4">
                                {filteredMaterials.length === 0 ? (<div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem]"><FolderOpen size={48} className="mx-auto text-gray-600 mb-4 opacity-50"/><p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Pasta Vazia</p></div>) : filteredMaterials.map(file => {
                                    const isNew = (Date.now() - file.createdAt) < 86400000;
                                    return (
                                        <div key={file.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group relative flex flex-col">{isNew && (<span className="absolute top-4 right-4 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>)}<div className="flex items-start gap-4 mb-4"><div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-red-500/30 transition-colors">{getFileIcon(file.fileType)}</div><div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1" title={file.title}>{file.title}</h4><p className="text-[10px] text-gray-500 font-mono">{new Date(file.createdAt).toLocaleDateString()}</p></div></div><div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-400">{file.teacherName.charAt(0)}</div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[100px]">{file.teacherName.split(' ')[0]}</span></div><a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-red-600 hover:text-white text-gray-400 rounded-lg transition-all" title="Baixar"><Download size={16}/></a></div></div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {isLoading && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40"><div className="flex flex-col items-center"><div className="w-10 h-10 border-4 border-t-red-600 border-white/10 rounded-full animate-spin mb-4"></div><p className="text-xs font-black text-white uppercase tracking-widest">Carregando...</p></div></div>}
            </main>
        </div>
    );
};
