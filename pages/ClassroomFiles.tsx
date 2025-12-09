
import React, { useState, useEffect, useRef } from 'react';
import { listenToClassMaterials } from '../services/firebaseService';
import { ClassMaterial } from '../types';
import { FolderOpen, Download, FileText, File as FileIcon, Clock, Bell, Settings, ExternalLink } from 'lucide-react';

const CLASSES_LIST = [
    { id: '6efaf', name: '6º ANO EFAF' },
    { id: '7efaf', name: '7º ANO EFAF' },
    { id: '8efaf', name: '8º ANO EFAF' },
    { id: '9efaf', name: '9º ANO EFAF' },
    { id: '1em', name: '1ª SÉRIE EM' },
    { id: '2em', name: '2ª SÉRIE EM' },
    { id: '3em', name: '3ª SÉRIE EM' },
];

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const ClassroomFiles: React.FC = () => {
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    
    // Controlar primeira carga para não tocar som em arquivos antigos
    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Carregar seleção salva
        const savedClass = localStorage.getItem('classroom_selected_class');
        if (savedClass) setSelectedClassName(savedClass);
    }, []);

    useEffect(() => {
        if (!selectedClassName) return;

        setIsLoading(true);
        // Salvar seleção
        localStorage.setItem('classroom_selected_class', selectedClassName);

        const unsubscribe = listenToClassMaterials(selectedClassName, (newMaterials) => {
            setIsLoading(false);
            
            // Detectar novo arquivo (se a lista aumentou ou o ID do topo mudou)
            if (!isFirstLoad.current && newMaterials.length > 0) {
                 const latestFile = newMaterials[0];
                 const currentLatestId = materials.length > 0 ? materials[0].id : null;

                 if (latestFile.id !== currentLatestId) {
                     // Novo arquivo detectado!
                     playNotification();
                     
                     if (autoOpen) {
                         // Tenta abrir em nova aba (pode ser bloqueado pelo browser)
                         window.open(latestFile.fileUrl, '_blank');
                     }
                 }
            }

            setMaterials(newMaterials);
            isFirstLoad.current = false;
        });

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
        isFirstLoad.current = true;
    };

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={40} className="text-red-500" />;
        if (type.includes('image')) return <FileIcon size={40} className="text-blue-500" />;
        return <FolderOpen size={40} className="text-yellow-500" />;
    };

    return (
        <div className="min-h-screen bg-[#0f0f10] text-gray-100 font-sans p-6 md:p-12">
            <audio ref={audioRef} src={NOTIFICATION_SOUND} />

            <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-gray-800 pb-6">
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
                     {isLoading && (
                         <div className="text-center py-10 text-brand-500 flex items-center justify-center gap-2">
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-100"></div>
                             <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-200"></div>
                             <span className="text-xs font-bold uppercase tracking-widest ml-2">Conectando...</span>
                         </div>
                     )}

                     {!isLoading && materials.length === 0 && (
                         <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
                             <p className="text-gray-500 font-medium">Nenhum arquivo enviado para a turma <span className="text-white font-bold">{selectedClassName}</span> recentemente.</p>
                         </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                         {materials.map((file, index) => (
                             <div 
                                key={file.id} 
                                className={`bg-[#18181b] rounded-2xl p-6 border border-gray-800 hover:border-brand-500/50 transition-all group relative overflow-hidden ${index === 0 ? 'ring-2 ring-brand-500 shadow-[0_0_30px_rgba(220,38,38,0.2)] scale-[1.02]' : 'hover:-translate-y-1'}`}
                             >
                                 {index === 0 && (
                                     <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                         <Bell size={10} className="animate-pulse" /> Novo
                                     </div>
                                 )}

                                 <div className="flex items-start justify-between mb-4">
                                     <div className="p-3 bg-black/40 rounded-xl border border-gray-800 group-hover:bg-brand-900/20 group-hover:border-brand-500/30 transition-colors">
                                         {getFileIcon(file.fileType)}
                                     </div>
                                     <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                         {new Date(file.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                     </span>
                                 </div>

                                 <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight" title={file.title}>
                                     {file.title}
                                 </h3>
                                 <p className="text-xs text-gray-400 mb-6 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                    Prof. {file.teacherName}
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
                </div>
            )}
        </div>
    );
};
