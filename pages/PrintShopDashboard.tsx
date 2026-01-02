
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    updateExamStatus, 
    getStudents, 
    listenToAttendanceLogs, 
    listenToSystemConfig, 
    updateSystemConfig, 
    listenToEvents, 
    saveSchoolEvent, 
    deleteSchoolEvent,
    syncAllDataWithGennera
} from '../services/firebaseService';
import { 
    ExamRequest, 
    ExamStatus, 
    Student, 
    AttendanceLog, 
    SystemConfig, 
    SchoolEvent 
} from '../types';
import { Button } from '../components/Button';
import { 
    Printer, Search, Calendar, Users, Settings, Plus, ChevronLeft, ChevronRight,
    Save, X, CheckCircle, Activity, FileDown, Clock, AlertTriangle, Layers, Loader2, RefreshCw
} from 'lucide-react';
import { CLASSES } from '../constants';

export const PrintShopDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'calendar' | 'config'>('exams');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    // Data States
    const [exams, setExams] = useState<ExamRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [allExams, allStudents] = await Promise.all([
                getExams(),
                getStudents()
            ]);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
            setStudents(allStudents.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: ExamStatus) => {
        await updateExamStatus(id, status);
        setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSyncGennera = async () => {
        if (!confirm("Sincronizar todos os alunos da Gennera agora?")) return;
        setIsSyncing(true);
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            alert("Sincronização concluída!");
            fetchInitialData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                 <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Gestão Gráfica</p>
                    <SidebarItem id="exams" label="Fila de Impressão" icon={Printer} />
                    <SidebarItem id="students" label="Gestão Alunos" icon={Users} />
                    <SidebarItem id="config" label="Configurações" icon={Settings} />
                 </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 bg-transparent custom-scrollbar">
                {activeTab === 'exams' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila de Impressão</h1>
                            <p className="text-gray-400">Gerencie os pedidos de cópias enviados pelos professores.</p>
                        </header>

                        <div className="grid grid-cols-1 gap-4">
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).map(exam => (
                                <div key={exam.id} className="bg-[#18181b] border border-white/5 rounded-[2rem] p-6 flex items-center justify-between group hover:border-red-600/30 transition-all shadow-xl relative overflow-hidden">
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${exam.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <Printer size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold text-white uppercase">{exam.title}</h3>
                                                {exam.materialType === 'handout' && <span className="text-[8px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Apostila</span>}
                                            </div>
                                            <p className="text-gray-400 text-sm font-medium uppercase tracking-tight">
                                                Prof. <b className="text-white">{exam.teacherName}</b> • {exam.gradeLevel} • <span className="text-red-500 font-black">{exam.quantity} CÓPIAS</span>
                                            </p>
                                            {exam.instructions && (
                                                <p className="mt-2 text-xs text-yellow-500/80 italic flex items-center gap-1 font-bold">
                                                    <AlertTriangle size={12}/> Obs: {exam.instructions}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        {exam.fileUrl ? (
                                            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-blue-400 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                <FileDown size={14} /> Baixar Arquivo
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-gray-500 font-black uppercase border border-white/5 px-4 py-3 rounded-xl">Manual</span>
                                        )}
                                        
                                        {exam.status === ExamStatus.PENDING ? (
                                            <Button onClick={() => handleUpdateStatus(exam.id, ExamStatus.IN_PROGRESS)} className="rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest">Imprimir</Button>
                                        ) : (
                                            <Button onClick={() => handleUpdateStatus(exam.id, ExamStatus.COMPLETED)} className="bg-green-600 hover:bg-green-700 rounded-xl px-8 h-12 font-black uppercase text-xs tracking-widest">Finalizar</Button>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>
                                </div>
                            ))}
                            {exams.filter(e => e.status !== ExamStatus.COMPLETED).length === 0 && (
                                <div className="text-center py-20 text-gray-600 opacity-20">
                                    <Layers size={80} className="mx-auto mb-4"/>
                                    <p className="text-2xl font-black uppercase tracking-widest">Nenhum pedido pendente</p>
                                </div>
                            )}
                        </div>

                        {/* HISTÓRICO RECENTE (CONCLUÍDOS) */}
                        <div className="mt-12 opacity-40 hover:opacity-100 transition-opacity">
                            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><CheckCircle size={20} className="text-green-500"/> Finalizados Recentemente</h2>
                            <div className="grid grid-cols-1 gap-2">
                                {exams.filter(e => e.status === ExamStatus.COMPLETED).slice(0, 5).map(exam => (
                                    <div key={exam.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-400 uppercase">{exam.title}</span>
                                        <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Entregue</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="mb-8 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Integração Gennera</h1>
                                <p className="text-gray-400">Sincronize o banco de dados oficial da escola.</p>
                            </div>
                            <Button onClick={handleSyncGennera} isLoading={isSyncing} variant="outline" className="border-white/10 text-white font-black uppercase text-xs px-8 h-12 rounded-xl hover:bg-white/5 transition-all">
                                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> Atualizar Base de Alunos
                            </Button>
                        </header>

                        {isSyncing && (
                            <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-3xl mb-8 flex flex-col items-center gap-4 text-center">
                                <Loader2 size={48} className="text-blue-500 animate-spin" />
                                <p className="text-blue-400 font-bold uppercase tracking-widest">{syncProgress || 'Iniciando sincronização...'}</p>
                            </div>
                        )}

                        <div className="bg-[#18181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                             <table className="w-full text-left">
                                <thead className="bg-black/40 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="p-6">Nome do Aluno</th>
                                        <th className="p-6">Turma</th>
                                        <th className="p-6">Status Integração</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.slice(0, 50).map(s => (
                                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-6 font-bold text-white uppercase text-sm">{s.name}</td>
                                            <td className="p-6"><span className="text-xs text-gray-400 font-bold uppercase">{s.className}</span></td>
                                            <td className="p-6"><span className="text-[10px] text-green-500 font-black uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Sincronizado</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
