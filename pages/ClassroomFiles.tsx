
import React, { useState, useEffect, useRef } from 'react';
import { listenToClassMaterials } from '../services/firebaseService';
import { ClassMaterial } from '../types';
import { useAuth } from '../context/AuthContext';
import { FolderOpen, Download, FileText, File as FileIcon, Clock, Bell, Settings, ExternalLink, AlertTriangle, ArrowLeft, Folder, Lock, LogIn, LogOut } from 'lucide-react';

const CLASSES_LIST = [
    { id: '6efaf', name: '6º ANO EFAF' },
    { id: '7efaf', name: '7º ANO EFAF' },
    { id: '8efaf', name: '8º ANO EFAF' },
    { id: '9efaf', name: '9º ANO EFAF' },
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
];

const EFAF_SUBJECTS = [
    "COORDENAÇÃO", "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "MATEMÁTICA", "MATEMÁTICA II", "BIOLOGIA", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "REDAÇÃO", "FILOSOFIA", "QUÍMICA", "PROJETO DE VIDA", "EDUCAÇÃO FINANCEIRA", 
    "PENSAMENTO COMPUTACIONAL", "FÍSICA", "DINÂMICAS DE LEITURA"
];

const EM_SUBJECTS = [
    "COORDENAÇÃO", "LÍNGUA PORTUGUESA", "ARTE", "EDUCAÇÃO FÍSICA", "HISTÓRIA", "GEOGRAFIA", 
    "SOCIOLOGIA", "FILOSOFIA", "BIOLOGIA", "FÍSICA", "QUÍMICA", "MATEMÁTICA", 
    "LITERATURA", "PRODUÇÃO TEXTUAL", "LÍNGUA ESTRANGEIRA MODERNA - INGLÊS", 
    "MATEMÁTICA II", "BIOLOGIA II", "QUÍMICA II", 
    "ELETIVA 03: EMPREENDEDORISMO CRIATIVO", "ELETIVA 04: PROJETO DE VIDA", 
    "ITINERÁRIO FORMATIVO"
];

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const ClassroomFiles: React.FC = () => {
    const { user, logout } = useAuth();
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    
    // Novo Estado para navegação por pastas
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    
    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Determina a lista de disciplinas com base na turma selecionada
    const currentSubjectsList = React.useMemo(() => {
        if (!selectedClassName) return [];
        if (selectedClassName.includes('SÉRIE')) return EM_SUBJECTS;
        return EFAF_SUBJECTS;
    }, [selectedClassName]);

    useEffect(() => {
        // Carregar seleção salva
        const savedClass = localStorage.getItem('classroom_selected_class');
        if (savedClass) setSelectedClassName(savedClass);
    }, []);

    useEffect(() => {
        if (!selectedClassName) return;

        setIsLoading(true);
        setError(null);
        setPermissionDenied(false);
        setSelectedSubject(null); // Reseta a pasta ao mudar de turma
        
        localStorage.setItem('classroom_selected_class', selectedClassName);

        const unsubscribe = listenToClassMaterials(
            selectedClassName, 
            (newMaterials) => {
                setIsLoading(false);
                setError(null);
                setPermissionDenied(false);
                
                // Ordena os materiais localmente (mais recentes primeiro)
                newMaterials.sort((a, b) => b.createdAt - a.createdAt);
                
                // Lógica de notificação (apenas para arquivos novos gerais)
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
                console.error("Erro no listener:", err);
                setIsLoading(false);
                if (err.code === 'permission-denied') {
                    setPermissionDenied(true);
                    setError(null); // Use specific permission state
                } else {
                    setError("Erro de conexão ao buscar arquivos.");
                }
            }
        );

        return () => unsubscribe();
    }, [selectedClassName]);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(e => console.log("Audio blocked", e));
        }
    };

    const handleSelectClass = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClassName(e.target.value);
        setMaterials([]);
        setError(null);
        setPermissionDenied(false);
        isFirstLoad.current = true;
    };

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={40} className="text-red-500" />;
        if (type.includes('image')) return <FileIcon size={40} className="text-blue-500" />;
        return <FolderOpen size={40} className="text-yellow-500" />;
    };

    // Filtra os materiais para a pasta selecionada
    const filteredMaterials = React.useMemo(() => {
        if (!selectedSubject) return [];
        // Filtra arquivos que batem com a disciplina exata OU arquivos sem disciplina que vão para uma pasta "Geral" (se implementado)
        // Por hora, strict match
        return materials.filter(m => m.subject === selectedSubject);
    }, [materials, selectedSubject]);

    // Conta quantos arquivos existem em cada disciplina para exibir na pasta
    const getFileCountForSubject = (subject: string) => {
        return materials.filter(m => m.subject === subject).length;
    };

    return (
        <div className="min-h-screen bg-[#0f0f10] text-gray-100 font-sans p-6 md:p-12">
            <audio ref={audioRef} src={NOTIFICATION_SOUND} />

            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-16 w-auto" alt="Logo" />
                    <div className="h-10 w-px bg-gray-800 hidden md:block"></div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-white">Arquivos da Turma</h1>
                        <p className="text-xs text-gray-500 font-mono mt-1">Sincronização em Tempo Real</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-xl border border-gray-800">
                    <div className="px-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Selecione a Sala</label>
                        <select 
                            value={selectedClassName} 
                            onChange={handleSelectClass}
                            className="bg-transparent text-white font-bold text-lg outline-none cursor-pointer min-w-[200px]"
                        >
                            <option value="" className="text-gray-500">-- Selecione --</option>
                            {CLASSES_LIST.map(c => (
                                <option key={c.id} value={c.name} className="bg-gray-900">{c.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="h-10 w-px bg-gray-800"></div>

                    <label className="flex items-center gap-2 px-4 cursor-pointer group" title="Tenta abrir o arquivo assim que ele chega">
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${autoOpen ? 'bg-green-600' : 'bg-gray-700'}`} onClick={() => setAutoOpen(!autoOpen)}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${autoOpen ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Abrir Automático</span>
                    </label>

                    {user && (
                        <>
                            <div className="h-10 w-px bg-gray-800"></div>
                            <button 
                                onClick={logout} 
                                className="px-4 text-gray-400 hover:text-red-500 transition-colors"
                                title="Sair do Sistema"
                            >
                                <LogOut size={20} />
                            </button>
                        </>
                    )}
                </div>
            </header>

            {!selectedClassName ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-gray-600 animate-in fade-in zoom-in duration-500">
                    <FolderOpen size={80} className="mb-6 opacity-20" />
                    <h2 className="text-2xl font-bold text-gray-500">Selecione uma turma para iniciar</h2>
                    <p className="mt-2 text-sm">Os arquivos enviados pelos professores aparecerão aqui automaticamente.</p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto">
                     {error && (
                         <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 text-center mb-8 flex flex-col items-center">
                             <AlertTriangle size={48} className="text-red-500 mb-2"/>
                             <h3 className="text-xl font-bold text-white">Falha de Conexão</h3>
                             <p className="text-red-300 mt-2">{error}</p>
                         </div>
                     )}

                     {permissionDenied && (
                         <div className="bg-black/40 border border-red-900/50 rounded-3xl p-12 text-center mb-8 flex flex-col items-center animate-in zoom-in-95">
                             <div className="bg-red-900/20 p-6 rounded-full mb-6">
                                <Lock size={64} className="text-red-500"/>
                             </div>
                             <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Acesso Restrito</h3>
                             <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">
                                 Os arquivos desta turma estão protegidos. É necessário realizar login para visualizar o conteúdo.
                             </p>
                             <button 
                                onClick={() => window.location.href = '/'}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-red-900/40 flex items-center gap-3 transition-all transform hover:-translate-y-1"
                             >
                                 <LogIn size={24} />
                                 Fazer Login no Sistema
                             </button>
                         </div>
                     )}

                     {isLoading && (
                         <div className="text-center py-10 text-brand-500 flex items-center justify-center gap-2">
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-100"></div>
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-200"></div>
                             <span className="text-xs font-bold uppercase tracking-widest ml-2">Carregando Pastas...</span>
                         </div>
                     )}

                     {!isLoading && !error && !permissionDenied && (
                         <>
                            {/* NAVEGAÇÃO: VOLTAR PARA PASTAS */}
                            {selectedSubject && (
                                <button 
                                    onClick={() => setSelectedSubject(null)}
                                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors font-bold uppercase tracking-wider text-sm"
                                >
                                    <ArrowLeft size={18} /> Voltar para Disciplinas
                                </button>
                            )}

                            {/* VIEW 1: PASTAS DAS DISCIPLINAS */}
                            {!selectedSubject && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    {currentSubjectsList.map(subject => {
                                        const count = getFileCountForSubject(subject);
                                        return (
                                            <button 
                                                key={subject}
                                                onClick={() => setSelectedSubject(subject)}
                                                className="bg-[#18181b] p-6 rounded-2xl border border-gray-800 hover:border-brand-600 hover:bg-[#202024] transition-all group text-left flex flex-col justify-between min-h-[160px]"
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    <Folder size={40} className={`text-yellow-500 group-hover:scale-110 transition-transform ${subject === 'COORDENAÇÃO' ? 'text-blue-500' : ''}`} />
                                                    {count > 0 && (
                                                        <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">{count}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className={`text-sm font-bold text-white mt-4 line-clamp-2 uppercase leading-tight group-hover:text-brand-500 transition-colors ${subject === 'COORDENAÇÃO' ? 'text-blue-400' : ''}`}>
                                                        {subject}
                                                    </h3>
                                                    <p className="text-[10px] text-gray-500 mt-1 font-mono">{count} arquivos</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* VIEW 2: ARQUIVOS DENTRO DA PASTA */}
                            {selectedSubject && (
                                <div className="animate-in fade-in slide-in-from-right-4">
                                    <h2 className="text-xl font-bold text-brand-500 mb-6 flex items-center gap-2 uppercase">
                                        <Folder className={selectedSubject === 'COORDENAÇÃO' ? 'text-blue-500' : 'text-yellow-500'} /> {selectedSubject}
                                    </h2>

                                    {filteredMaterials.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
                                            <p className="text-gray-500 font-medium">Pasta vazia.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {filteredMaterials.map((file, index) => (
                                                <div 
                                                    key={file.id} 
                                                    className={`bg-[#18181b] rounded-2xl p-6 border border-gray-800 hover:border-brand-500/50 transition-all group relative overflow-hidden`}
                                                >
                                                    {/* Badge de Novo (se for recente - menos de 24h) */}
                                                    {(Date.now() - file.createdAt) < 86400000 && (
                                                        <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                                            <Bell size={10} className="animate-pulse" /> Novo
                                                        </div>
                                                    )}

                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="p-3 bg-black/40 rounded-xl border border-gray-800 group-hover:bg-brand-900/20 group-hover:border-brand-500/30 transition-colors">
                                                            {getFileIcon(file.fileType)}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                                            {new Date(file.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight" title={file.title}>
                                                        {file.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 mb-6 flex items-center gap-1">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${file.teacherName === 'Coordenação' ? 'bg-blue-500' : 'bg-brand-500'}`}></span>
                                                        {file.teacherName === 'Coordenação' ? 'Setor Coordenação' : `Prof. ${file.teacherName}`}
                                                    </p>

                                                    <a 
                                                        href={file.fileUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                                    >
                                                        <Download size={18} /> Baixar Arquivo
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                         </>
                     )}
                </div>
            )}
        </div>
    );
};
