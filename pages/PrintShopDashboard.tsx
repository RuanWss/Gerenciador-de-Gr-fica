import React, { useState, useEffect } from 'react';
import { 
    getExams, 
    updateExamStatus, 
    listenToSystemConfig, 
    updateSystemConfig 
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, SystemConfig } from '../types';
import { Button } from '../components/Button';
import { 
  Printer, 
  CheckCircle, 
  Tv,
  Save,
  Eraser,
  Settings,
  FileText,
  BookOpen
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'requests' | 'config'>('requests');
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [config, setConfig] = useState<SystemConfig>({
        bannerMessage: '',
        bannerType: 'info',
        isBannerActive: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'printing' | 'completed'>('all');

    useEffect(() => {
        loadExams();
        const unsubscribe = listenToSystemConfig((data) => {
            if (data) setConfig(data);
        });
        return () => unsubscribe();
    }, []);

    const loadExams = async () => {
        setIsLoading(true);
        const allExams = await getExams();
        // Sort by date desc
        setExams(allExams.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
    };

    const handleStatusChange = async (id: string, newStatus: ExamStatus) => {
        try {
            await updateExamStatus(id, newStatus);
            setExams(exams.map(e => e.id === id ? { ...e, status: newStatus } : e));
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status.");
        }
    };

    const handleSaveConfig = async () => {
        try {
            await updateSystemConfig(config);
            alert("Configuração da TV atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar config:", error);
            alert("Erro ao salvar configuração.");
        }
    };

    const filteredExams = exams.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'pending') return e.status === ExamStatus.PENDING;
        if (filter === 'printing') return e.status === ExamStatus.IN_PROGRESS;
        if (filter === 'completed') return e.status === ExamStatus.COMPLETED;
        return true;
    });

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Central de Cópias</p>
                    
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 font-medium text-sm
                        ${activeTab === 'requests' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Printer size={18} />
                        <span>Fila de Impressão</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('config')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 font-medium text-sm
                        ${activeTab === 'config' 
                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' 
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Tv size={18} />
                        <span>Configuração TV</span>
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 bg-transparent">
                
                {/* --- TAB: REQUESTS --- */}
                {activeTab === 'requests' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Fila de Impressão</h1>
                                <p className="text-gray-400">Gerencie as solicitações enviadas pelos professores.</p>
                            </div>
                            
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                                <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>TODOS</button>
                                <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'pending' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>PENDENTES</button>
                                <button onClick={() => setFilter('printing')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'printing' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>IMPRIMINDO</button>
                                <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'completed' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}>PRONTOS</button>
                            </div>
                        </header>

                        <div className="grid gap-4">
                            {filteredExams.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
                                    <Printer size={48} className="mx-auto text-gray-600 mb-4" />
                                    <p className="text-gray-500">Nenhuma solicitação encontrada.</p>
                                </div>
                            ) : (
                                filteredExams.map(exam => (
                                    <div key={exam.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    exam.status === ExamStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                    exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {exam.status === ExamStatus.PENDING ? 'Pendente' : 
                                                     exam.status === ExamStatus.IN_PROGRESS ? 'Em Impressão' : 'Pronto'}
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {new Date(exam.createdAt).toLocaleString()}
                                                </span>
                                                {exam.materialType && (
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${exam.materialType === 'handout' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {exam.materialType === 'handout' ? <BookOpen size={10}/> : <FileText size={10}/>}
                                                        {exam.materialType === 'handout' ? 'Apostila' : 'Prova'}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800">{exam.title}</h3>
                                            <p className="text-sm text-gray-600 mb-1">
                                                <span className="font-bold">Prof. {exam.teacherName}</span> • {exam.gradeLevel}
                                            </p>
                                            <p className="text-sm text-gray-500 italic mb-3">
                                                "{exam.instructions || 'Sem observações.'}"
                                            </p>
                                            
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 inline-flex">
                                                <span className="flex items-center gap-1"><Settings size={14}/> {exam.columns || 1} Coluna(s)</span>
                                                <span className="w-px h-4 bg-gray-300"></span>
                                                <span>{exam.quantity} Cópias</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center min-w-[200px]">
                                            <a 
                                                href={exam.fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm text-center flex items-center justify-center gap-2"
                                            >
                                                Ver Arquivo
                                            </a>
                                            
                                            {exam.status === ExamStatus.PENDING && (
                                                <button 
                                                    onClick={() => handleStatusChange(exam.id, ExamStatus.IN_PROGRESS)}
                                                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                                >
                                                    <Printer size={16} /> Iniciar Impressão
                                                </button>
                                            )}
                                            
                                            {exam.status === ExamStatus.IN_PROGRESS && (
                                                <button 
                                                    onClick={() => handleStatusChange(exam.id, ExamStatus.COMPLETED)}
                                                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                                >
                                                    <CheckCircle size={16} /> Marcar como Pronto
                                                </button>
                                            )}
                                            
                                            {exam.status === ExamStatus.COMPLETED && (
                                                <div className="w-full py-2 px-4 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold text-sm text-center flex items-center justify-center gap-2">
                                                    <CheckCircle size={16} /> Concluído
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: CONFIG (TV) --- */}
                {activeTab === 'config' && (
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Tv className="text-red-500"/> Configuração da TV</h1>
                            <p className="text-gray-400">Controle de avisos e exibição pública</p>
                        </header>

                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg relative overflow-hidden">
                             {config.isBannerActive && (
                                 <div className={`absolute top-0 left-0 right-0 h-2 ${config.bannerType === 'warning' ? 'bg-yellow-500' : config.bannerType === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                             )}
                             
                             <div className="mb-6">
                                 <label className="flex items-center gap-3 cursor-pointer">
                                     <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.isBannerActive ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setConfig({...config, isBannerActive: !config.isBannerActive})}>
                                         <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.isBannerActive ? 'translate-x-6' : ''}`}></div>
                                     </div>
                                     <span className="font-bold text-gray-700">Ativar Aviso na TV</span>
                                 </label>
                             </div>

                             <div className={`space-y-6 transition-opacity ${config.isBannerActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem do Aviso</label>
                                     <textarea 
                                         className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 text-lg text-gray-300 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                                         rows={3}
                                         placeholder="Ex: Reunião de Pais hoje às 19h"
                                         value={config.bannerMessage}
                                         onChange={e => setConfig({...config, bannerMessage: e.target.value})}
                                     />
                                 </div>

                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Alerta (Cor)</label>
                                     <div className="flex gap-4">
                                         <button onClick={() => setConfig({...config, bannerType: 'info'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'info' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Informativo (Azul)</button>
                                         <button onClick={() => setConfig({...config, bannerType: 'warning'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'warning' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Atenção (Amarelo)</button>
                                         <button onClick={() => setConfig({...config, bannerType: 'error'})} className={`flex-1 py-3 rounded-lg border-2 font-bold ${config.bannerType === 'error' ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-gray-100 text-gray-500'}`}>Urgente (Vermelho)</button>
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                     <div>
                                         <div className="flex justify-between items-center mb-1">
                                             <label className="block text-xs font-bold text-gray-500 uppercase">Início da Exibição</label>
                                             <button type="button" onClick={() => setConfig({...config, tvStart: ''})} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-bold"><Eraser size={12}/> Limpar</button>
                                         </div>
                                         <input 
                                            type="datetime-local" 
                                            className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 text-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                                            value={config.tvStart || ''} 
                                            onChange={e => setConfig({...config, tvStart: e.target.value})} 
                                         />
                                     </div>
                                     <div>
                                         <div className="flex justify-between items-center mb-1">
                                             <label className="block text-xs font-bold text-gray-500 uppercase">Fim da Exibição</label>
                                             <button type="button" onClick={() => setConfig({...config, tvEnd: ''})} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-bold"><Eraser size={12}/> Limpar</button>
                                         </div>
                                         <input 
                                            type="datetime-local" 
                                            className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 text-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" 
                                            value={config.tvEnd || ''} 
                                            onChange={e => setConfig({...config, tvEnd: e.target.value})} 
                                         />
                                     </div>
                                 </div>
                                 <p className="text-xs text-gray-400 text-center italic">Deixe as datas em branco para exibir o aviso imediatamente e indefinidamente.</p>
                             </div>

                             <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                 <Button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-700 shadow-lg text-white"><Save size={18} className="mr-2"/> Salvar Configuração</Button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};