import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExams, updateExamStatus } from '../services/firebaseService';
import { ExamRequest, ExamStatus } from '../types';
import { Button } from '../components/Button';
import { 
  Printer, 
  CheckCircle, 
  Clock, 
  FileText, 
  Download, 
  AlertCircle, 
  Search, 
  BookOpen, 
  Loader2,
  Filter
} from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<ExamStatus | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        setIsLoading(true);
        try {
            const allExams = await getExams();
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Erro ao carregar exames", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (examId: string, newStatus: ExamStatus) => {
        if (!confirm("Confirmar alteração de status?")) return;
        try {
            await updateExamStatus(examId, newStatus);
            setExams(exams.map(e => e.id === examId ? { ...e, status: newStatus } : e));
        } catch (error) {
            alert("Erro ao atualizar status.");
            console.error(error);
        }
    };

    const filteredExams = exams.filter(exam => {
        const matchesFilter = filter === 'ALL' || exam.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = exam.title.toLowerCase().includes(searchLower) || 
                              exam.teacherName.toLowerCase().includes(searchLower) ||
                              exam.gradeLevel.toLowerCase().includes(searchLower);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
             <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Printer className="text-blue-600" size={32} />
                        Central de Cópias
                    </h1>
                    <p className="text-gray-500 mt-1">Gerenciamento de solicitações de impressão</p>
                </div>
                <div className="flex gap-4">
                     <Button onClick={loadExams} variant="outline" title="Atualizar Lista">
                        Atualizar
                     </Button>
                </div>
             </header>

             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto max-w-full">
                    {(['ALL', ExamStatus.PENDING, ExamStatus.IN_PROGRESS, ExamStatus.COMPLETED] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${filter === s ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {s === 'ALL' ? 'Todos' : s === ExamStatus.PENDING ? 'Pendentes' : s === ExamStatus.IN_PROGRESS ? 'Em Produção' : 'Concluídos'}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar pedido..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
             </div>

             {isLoading ? (
                 <div className="text-center py-20 text-gray-500">
                     <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
                     <p>Carregando pedidos...</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 gap-4">
                     {filteredExams.length === 0 ? (
                         <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                             <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
                         </div>
                     ) : (
                         filteredExams.map(exam => (
                             <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
                                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                     exam.status === ExamStatus.PENDING ? 'bg-yellow-400' : 
                                     exam.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500' : 
                                     'bg-green-500'
                                 }`}></div>

                                 <div className="flex-1 pl-2">
                                     <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                                         <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                             {exam.title}
                                             {exam.status === ExamStatus.PENDING && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Novo</span>}
                                         </h3>
                                         <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                                             <Clock size={12} />
                                             {new Date(exam.createdAt).toLocaleString()}
                                         </span>
                                     </div>
                                     
                                     <div className="flex flex-wrap gap-2 mb-4">
                                         <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-1">
                                             <FileText size={12}/> Prof. {exam.teacherName}
                                         </span>
                                         <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-1">
                                             {exam.gradeLevel}
                                         </span>
                                         <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1">
                                             {exam.quantity} cópias
                                         </span>
                                         {exam.materialType === 'handout' ? (
                                             <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1">
                                                 <BookOpen size={12}/> Apostila
                                             </span>
                                         ) : (
                                            <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">
                                                 <FileText size={12}/> Prova
                                             </span>
                                         )}
                                         {exam.columns === 1 && (
                                              <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold">1 Coluna</span>
                                         )}
                                     </div>

                                     {exam.instructions && (
                                         <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg mb-4">
                                             <p className="text-xs text-yellow-800 font-bold uppercase mb-1 flex items-center gap-1"><AlertCircle size={10}/> Instruções:</p>
                                             <p className="text-sm text-yellow-900">{exam.instructions}</p>
                                         </div>
                                     )}

                                     <div className="flex items-center gap-4 mt-4">
                                         {exam.fileUrl ? (
                                             <a 
                                                 href={exam.fileUrl} 
                                                 target="_blank" 
                                                 rel="noopener noreferrer"
                                                 className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                                             >
                                                 <Download size={16} /> Baixar Arquivo
                                             </a>
                                         ) : (
                                             <span className="text-sm text-gray-400 italic">Arquivo não disponível</span>
                                         )}
                                     </div>
                                 </div>

                                 <div className="flex flex-row md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                                     <p className="text-xs font-bold text-gray-400 uppercase text-center md:text-left mb-2 hidden md:block">Ações</p>
                                     
                                     {exam.status === ExamStatus.PENDING && (
                                         <button 
                                             onClick={() => handleStatusUpdate(exam.id, ExamStatus.IN_PROGRESS)}
                                             className="flex-1 md:w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                         >
                                             <Printer size={16} /> Imprimir
                                         </button>
                                     )}
                                     
                                     {exam.status === ExamStatus.IN_PROGRESS && (
                                         <button 
                                             onClick={() => handleStatusUpdate(exam.id, ExamStatus.COMPLETED)}
                                             className="flex-1 md:w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                         >
                                             <CheckCircle size={16} /> Concluir
                                         </button>
                                     )}

                                     {exam.status === ExamStatus.COMPLETED && (
                                         <div className="flex-1 md:w-full flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 py-2 rounded-lg border border-green-100 cursor-default">
                                             <CheckCircle size={16} /> Entregue
                                         </div>
                                     )}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             )}
        </div>
    );
};