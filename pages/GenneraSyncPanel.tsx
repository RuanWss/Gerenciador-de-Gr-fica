
import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, CheckCircle2, History, Settings, Info, Loader2, Users, School, Clock } from 'lucide-react';
import { Button } from '../components/Button';
import { syncAllDataWithGennera, getStudents } from '../services/firebaseService';
import { Student } from '../types';

export const GenneraSyncPanel: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');
    const [syncHistory, setSyncHistory] = useState<{date: string, status: string, count: number}[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
        // Carrega histórico do localStorage para demonstração
        const savedHistory = localStorage.getItem('gennera_sync_history');
        if (savedHistory) setSyncHistory(JSON.parse(savedHistory));
        const savedLastSync = localStorage.getItem('gennera_last_sync');
        if (savedLastSync) setLastSyncDate(savedLastSync);
    }, []);

    const loadStats = async () => {
        const students = await getStudents();
        setTotalStudents(students.length);
    };

    const handleStartSync = async () => {
        if (!confirm("Iniciar sincronização global? Isso atualizará todos os dados de alunos e turmas com base no Gennera ERP.")) return;
        
        setIsSyncing(true);
        const startTime = new Date();
        
        try {
            await syncAllDataWithGennera((msg) => setSyncProgress(msg));
            
            const endTime = new Date();
            const newEntry = {
                date: endTime.toLocaleString('pt-BR'),
                status: 'Sucesso',
                count: totalStudents // Idealmente viria do retorno da sync
            };
            
            const updatedHistory = [newEntry, ...syncHistory].slice(0, 10);
            setSyncHistory(updatedHistory);
            localStorage.setItem('gennera_sync_history', JSON.stringify(updatedHistory));
            localStorage.setItem('gennera_last_sync', newEntry.date);
            setLastSyncDate(newEntry.date);
            
            alert("Sincronização global concluída!");
            loadStats();
        } catch (error: any) {
            alert("Erro crítico na sincronização: " + error.message);
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-12">
                <div className="flex items-center gap-6 mb-4">
                    <div className="h-20 w-20 bg-blue-600/20 text-blue-500 rounded-[2rem] border border-blue-500/20 flex items-center justify-center shadow-2xl shadow-blue-900/20">
                        <Database size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">Integração Gennera ERP</h1>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em]">Painel Administrativo de TI • Sincronização Global</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* STATUS ATUAL */}
                <div className="bg-[#18181b] border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <Users className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700" size={120} />
                    <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Base Local de Alunos</p>
                    <h3 className="text-5xl font-black text-white">{totalStudents}</h3>
                    <div className="mt-4 flex items-center gap-2 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 size={14} className="text-green-500"/> Registros Ativos
                    </div>
                </div>

                <div className="bg-[#18181b] border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <Clock className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700" size={120} />
                    <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest mb-2">Última Sincronização</p>
                    <h3 className="text-2xl font-black text-blue-400 uppercase leading-tight mt-4">
                        {lastSyncDate ? lastSyncDate.split(',')[0] : 'Nunca'}
                    </h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase mt-2">
                        {lastSyncDate ? lastSyncDate.split(',')[1] : '--:--'}
                    </p>
                </div>

                <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl shadow-blue-900/20 flex flex-col justify-center">
                    <Button 
                        disabled={isSyncing}
                        onClick={handleStartSync}
                        className="w-full h-20 bg-white text-blue-600 hover:bg-blue-50 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl"
                    >
                        {isSyncing ? <Loader2 size={24} className="animate-spin mr-3"/> : <RefreshCw size={24} className="mr-3"/>}
                        {isSyncing ? 'Processando...' : 'Sincronizar Agora'}
                    </Button>
                    {isSyncing && (
                        <p className="text-[9px] text-white font-black uppercase tracking-[0.2em] mt-4 text-center animate-pulse">
                            {syncProgress || 'Iniciando integração...'}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* PARÂMETROS DA INTEGRAÇÃO */}
                <div className="bg-[#18181b] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-black/20 flex items-center gap-4">
                        <Settings className="text-blue-500" size={24}/>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Parâmetros de Conexão</h3>
                    </div>
                    <div className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ID da Instituição</label>
                                <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-gray-400 font-mono text-sm">891</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Versão da API</label>
                                <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-gray-400 font-mono text-sm">v1 (Gateway Proxy)</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Endpoint Base</label>
                            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-gray-500 font-mono text-[11px] truncate">https://api2.gennera.com.br/api/v1/</div>
                        </div>
                        <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-3xl flex gap-4">
                            <Info size={20} className="text-blue-400 shrink-0"/>
                            <p className="text-[11px] text-blue-300 font-medium leading-relaxed">
                                O sistema utiliza um <b>Gateway Proxy (BFF)</b> para contornar restrições de CORS do navegador. 
                                O token de autenticação JWT é injetado automaticamente pelo servidor em todas as requisições de saída.
                            </p>
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO DE LOGS */}
                <div className="bg-[#18181b] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-black/20 flex items-center gap-4">
                        <History className="text-gray-400" size={24}/>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Relatório de Eventos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-600 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-6">Data/Hora</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Registros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {syncHistory.length > 0 ? syncHistory.map((log, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02]">
                                        <td className="p-6 text-xs text-gray-400 font-mono">{log.date}</td>
                                        <td className="p-6">
                                            <span className="bg-green-600/10 text-green-500 border border-green-600/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right font-black text-white text-sm">{log.count}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="p-20 text-center text-gray-700 font-black uppercase tracking-widest opacity-30">
                                            Sem logs recentes
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
