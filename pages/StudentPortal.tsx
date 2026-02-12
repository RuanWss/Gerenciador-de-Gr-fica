import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToClassMaterials, listenToStudentLoans, listenToClassGradebooks, listenToStaffMembers } from '../services/firebaseService';
import { ClassMaterial, LibraryLoan, GradebookEntry, StaffMember } from '../types';
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
    BookOpen,
    Map as MapIcon,
    Filter,
    User,
    Calendar,
    Target,
    Layers,
    MapPin
} from 'lucide-react';

const KNOWLEDGE_AREAS: Record<string, string> = {
    "LÍNGUA PORTUGUESA": "Linguagens",
    "ARTE": "Linguagens",
    "EDUCAÇÃO FÍSICA": "Linguagens",
    "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS": "Linguagens",
    "REDAÇÃO": "Linguagens",
    "LITERATURA": "Linguagens",
    "PRODUÇÃO TEXTUAL": "Linguagens",
    "MATEMÁTICA": "Matemática",
    "MATEMÁTICA II": "Matemática",
    "EDUCAÇÃO FINANCEIRA": "Matemática",
    "BIOLOGIA": "Ciências da Natureza",
    "BIOLOGIA II": "Ciências da Natureza",
    "FÍSICA": "Ciências da Natureza",
    "QUÍMICA": "Ciências da Natureza",
    "QUÍMICA II": "Ciências da Natureza",
    "CIÊNCIAS": "Ciências da Natureza",
    "HISTÓRIA": "Ciências Humanas",
    "GEOGRAFIA": "Ciências Humanas",
    "SOCIOLOGIA": "Ciências Humanas",
    "FILOSOFIA": "Ciências Humanas",
    "PROJETO DE VIDA": "Outros/Projetos",
    "PENSAMENTO COMPUTACIONAL": "Outros/Projetos",
    "DINÂMICAS DE LEITURA": "Outros/Projetos",
    "ITINERÁRIO FORMATIVO": "Outros/Projetos",
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO": "Outros/Projetos",
    "ELETIVA 04: PROJETO DE VIDA": "Outros/Projetos"
};

const getArea = (subject?: string) => {
    if (!subject) return "Geral";
    return KNOWLEDGE_AREAS[subject.trim().toUpperCase()] || "Geral";
};

export const StudentPortal: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'materials' | 'library' | 'mapa'>('materials');
    
    // Materials State
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Library State
    const [loans, setLoans] = useState<LibraryLoan[]>([]);

    // Mapa State
    const [gradebooks, setGradebooks] = useState<GradebookEntry[]>([]);
    const [mapaFilters, setMapaFilters] = useState({
        search: '',
        area: '',
        professor: '',
        bimester: '1º BIMESTRE'
    });
    const [professors, setProfessors] = useState<StaffMember[]>([]);

    useEffect(() => {
        if (user?.studentData?.className) {
            const unsubMaterials = listenToClassMaterials(user.studentData.className, (data) => {
                setMaterials(data.sort((a,b) => b.createdAt - a.createdAt));
            }, (err) => console.error(err));

            const unsubGradebooks = listenToClassGradebooks(user.studentData.className, (data) => {
                setGradebooks(data);
            });

            const unsubStaff = listenToStaffMembers((data) => {
                setProfessors(data.filter(s => s.isTeacher));
            });

            return () => {
                unsubMaterials();
                unsubGradebooks();
                unsubStaff();
            };
        }
    }, [user]);

    useEffect(() => {
        if (user?.id) {
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
        const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSubject && matchesSearch;
    });

    // Mapa Filtering Logic
    const filteredMapa = useMemo(() => {
        let activities: Array<{ 
            gradebookId: string, 
            subject: string, 
            area: string, 
            activity: any,
            bimester: string
        }> = [];

        // Flatten activities from all gradebooks of the class
        gradebooks.forEach(gb => {
            if (gb.av1Config) {
                gb.av1Config.forEach(act => {
                    activities.push({
                        gradebookId: gb.id,
                        subject: gb.subject || '',
                        area: getArea(gb.subject),
                        activity: act,
                        bimester: gb.bimester
                    });
                });
            }
        });

        return activities.filter(item => {
            const activityName = item.activity.activityName || '';
            const subject = item.subject || '';
            const searchLower = mapaFilters.search.toLowerCase();

            const matchesSearch = activityName.toLowerCase().includes(searchLower) ||
                                subject.toLowerCase().includes(searchLower);
            
            const matchesArea = !mapaFilters.area || item.area === mapaFilters.area;
            const matchesBimester = item.bimester === mapaFilters.bimester;
            
            return matchesSearch && matchesArea && matchesBimester;
        });
    }, [gradebooks, mapaFilters]);

    const mapaGroupedByArea = useMemo(() => {
        const grouped: Record<string, typeof filteredMapa> = {};
        filteredMapa.forEach(item => {
            if (!grouped[item.area]) grouped[item.area] = [];
            grouped[item.area].push(item);
        });
        return grouped;
    }, [filteredMapa]);

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
        return <FileText size={24} className="text-blue-500" />;
    };

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
                <div className="flex gap-6 border-b border-white/5 pb-1">
                    <button 
                        onClick={() => setActiveTab('materials')}
                        className={`pb-3 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'materials' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <Folder size={16}/> Materiais
                    </button>
                    <button 
                        onClick={() => setActiveTab('mapa')}
                        className={`pb-3 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'mapa' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <MapIcon size={16}/> Mapa de Atividades
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`pb-3 px-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'library' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <BookOpen size={16}/> Biblioteca
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'materials' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        </div>
                    </div>
                )}

                {activeTab === 'mapa' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        {/* Mapa Filters - Updated to match screenshot */}
                        <div className="bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pesquisar Atividade</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                    <input 
                                        className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all placeholder-gray-600"
                                        placeholder="Ex: Seminário, Prova, Trabalho..."
                                        value={mapaFilters.search}
                                        onChange={e => setMapaFilters({...mapaFilters, search: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-56 space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bimestre</label>
                                <select 
                                    className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 px-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                                    value={mapaFilters.bimester}
                                    onChange={e => setMapaFilters({...mapaFilters, bimester: e.target.value})}
                                >
                                    <option value="1º BIMESTRE">1º BIMESTRE</option>
                                    <option value="2º BIMESTRE">2º BIMESTRE</option>
                                    <option value="3º BIMESTRE">3º BIMESTRE</option>
                                    <option value="4º BIMESTRE">4º BIMESTRE</option>
                                </select>
                            </div>
                            <div className="w-full md:w-56 space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Área</label>
                                <select 
                                    className="w-full bg-[#0a0a0b] border border-white/5 rounded-2xl py-4 px-4 text-white text-xs font-bold outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                                    value={mapaFilters.area}
                                    onChange={e => setMapaFilters({...mapaFilters, area: e.target.value})}
                                >
                                    <option value="">Todas as Áreas</option>
                                    <option value="Linguagens">Linguagens</option>
                                    <option value="Matemática">Matemática</option>
                                    <option value="Ciências da Natureza">Ciências da Natureza</option>
                                    <option value="Ciências Humanas">Ciências Humanas</option>
                                    <option value="Outros/Projetos">Outros/Projetos</option>
                                </select>
                            </div>
                            <button 
                                onClick={() => setMapaFilters({search: '', area: '', professor: '', bimester: '1º BIMESTRE'})}
                                className="h-[52px] w-[52px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5"
                                title="Limpar Filtros"
                            >
                                <Filter size={20}/>
                            </button>
                        </div>

                        {/* Mapa Content Grouped by Area */}
                        <div className="space-y-12 pb-20">
                            {Object.entries(mapaGroupedByArea).length > 0 ? Object.entries(mapaGroupedByArea).map(([area, items]) => (
                                <section key={area} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-white/5"></div>
                                        <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <Layers size={14}/> {area}
                                        </h2>
                                        <div className="h-px flex-1 bg-white/5"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* FIX: Cast items to any[] to fix 'map' does not exist on type 'unknown' error */}
                                        {(items as any[]).map((item, idx) => (
                                            <div key={`${item.gradebookId}-${idx}`} className="bg-[#18181b] border border-white/10 rounded-[2rem] p-8 shadow-2xl hover:border-blue-500/30 transition-all relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Target size={80} />
                                                </div>
                                                
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">{item.subject}</span>
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{item.activity.activityName}</h3>
                                                    </div>
                                                    <div className="bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-xl text-blue-500 font-black text-xs">
                                                        {item.activity.maxScore.toFixed(1)} <span className="text-[8px] opacity-60">PTS</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10}/> Aplicação</p>
                                                        <p className="text-xs font-bold text-white">{item.activity.applicationDate}</p>
                                                    </div>
                                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10}/> Entrega</p>
                                                        <p className="text-xs font-bold text-white">{item.activity.deliveryDate}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${item.activity.location === 'CASA' ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-orange-600/10 border-orange-500/20 text-orange-400'}`}>
                                                            {item.activity.location === 'CASA' ? <MapPin size={14}/> : <LayoutGrid size={14}/>}
                                                        </div>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                            {item.activity.location === 'CASA' ? 'Tarefa/Casa' : 'Sala de Aula'}
                                                        </span>
                                                    </div>
                                                    <div className="h-8 w-px bg-white/5"></div>
                                                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
                                                        <User size={14}/>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Avaliação AV1</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )) : (
                                <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                    <MapIcon size={64} className="mx-auto mb-6 text-gray-600" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-[0.4em]">Nenhuma atividade configurada</h3>
                                    <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Aguardando lançamento dos professores para este bimestre</p>
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