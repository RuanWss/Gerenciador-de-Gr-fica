
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, updateStudent, uploadReportFile } from '../services/firebaseService';
import { Student } from '../types';
import { Button } from '../components/Button';
import { 
    Users, Search, Edit3, X, Save, FileText, UploadCloud, 
    CheckCircle, ShieldAlert, Heart, FileCheck, ExternalLink, School
} from 'lucide-react';

const DISORDERS = [
    "TEA (Autismo)",
    "TDAH",
    "Deficiência Intelectual",
    "Deficiência Auditiva",
    "Deficiência Visual",
    "Deficiência Física",
    "Altas Habilidades/Superdotação",
    "Transtorno de Aprendizagem",
    "Outros"
];

export const AEEDashboard: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Edit Modal
    const [showEdit, setShowEdit] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [reportFile, setReportFile] = useState<File | null>(null);

    useEffect(() => {
        const unsub = listenToStudents(setStudents);
        return () => unsub();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        setIsLoading(true);
        try {
            let reportUrl = selectedStudent.reportUrl;
            if (reportFile) {
                reportUrl = await uploadReportFile(reportFile, selectedStudent.name);
            }
            await updateStudent({
                ...selectedStudent,
                reportUrl
            });
            setShowEdit(false);
            setReportFile(null);
            alert("Cadastro AEE atualizado!");
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.className.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 p-8">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3">
                        <Heart size={40} className="text-red-500 fill-red-500/20" /> Painel AEE
                    </h1>
                    <p className="text-gray-400 font-medium">Gestão de Atendimento Educacional Especializado</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                        placeholder="Buscar aluno ou turma..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map(student => (
                    <div key={student.id} className={`bg-[#18181b] border-2 rounded-3xl p-6 transition-all group relative overflow-hidden ${student.isAEE ? 'border-red-600/50 shadow-lg shadow-red-900/10' : 'border-gray-800'}`}>
                        {student.isAEE && (
                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">AEE</div>
                        )}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-14 w-14 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover"/> : <Users className="p-3 text-gray-700 w-full h-full"/>}
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-bold text-white truncate text-lg leading-tight">{student.name}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{student.className}</p>
                            </div>
                        </div>

                        {student.isAEE ? (
                            <div className="space-y-3 mb-6">
                                <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/20">
                                    <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Diagnóstico</span>
                                    <p className="text-sm font-bold text-red-100">{student.disorder || 'Não informado'}</p>
                                </div>
                                {student.reportUrl ? (
                                    <a href={student.reportUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 p-2 rounded-lg justify-center border border-blue-400/20">
                                        <FileCheck size={14}/> VER LAUDO MÉDICO
                                    </a>
                                ) : (
                                    <div className="text-[10px] font-bold text-orange-500 bg-orange-500/10 p-2 rounded-lg text-center border border-orange-500/20">
                                        <ShieldAlert size={12} className="inline mr-1"/> LAUDO PENDENTE
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-6 flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-800 rounded-2xl opacity-40">
                                <School size={32} className="text-gray-600 mb-2"/>
                                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tighter">Estudante Regular</p>
                            </div>
                        )}

                        <button 
                            onClick={() => { setSelectedStudent(student); setShowEdit(true); }}
                            className="w-full py-3 bg-white/5 hover:bg-red-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/5 group-hover:border-red-600/30"
                        >
                            <Edit3 size={16}/> Configurar AEE
                        </button>
                    </div>
                ))}
            </div>

            {/* EDIT MODAL */}
            {showEdit && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Atendimento Especializado</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedStudent.name}</p>
                            </div>
                            <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="flex items-center gap-4 bg-red-50 p-6 rounded-3xl border border-red-100">
                                <input 
                                    type="checkbox" 
                                    id="isAee"
                                    className="w-8 h-8 rounded-xl border-gray-300 text-red-600 focus:ring-red-500"
                                    checked={selectedStudent.isAEE || false}
                                    onChange={e => setSelectedStudent({...selectedStudent, isAEE: e.target.checked})}
                                />
                                <label htmlFor="isAee" className="text-lg font-black text-red-900 uppercase">Aluno Atendido pelo AEE?</label>
                            </div>

                            {selectedStudent.isAEE && (
                                <div className="space-y-6 animate-in slide-in-from-top-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Transtorno ou Deficiência</label>
                                        <select 
                                            className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors bg-gray-50"
                                            value={selectedStudent.disorder || ''}
                                            onChange={e => setSelectedStudent({...selectedStudent, disorder: e.target.value})}
                                        >
                                            <option value="">Selecione...</option>
                                            {DISORDERS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Laudo Médico (PDF)</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                                            <input 
                                                type="file" 
                                                accept="application/pdf"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={e => e.target.files && setReportFile(e.target.files[0])}
                                            />
                                            {reportFile ? (
                                                <div className="text-green-600 flex flex-col items-center">
                                                    <FileCheck size={40} className="mb-2"/>
                                                    <span className="font-bold">{reportFile.name}</span>
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 flex flex-col items-center">
                                                    <UploadCloud size={40} className="mb-2"/>
                                                    <span className="font-bold">Anexar Laudo Digital</span>
                                                    <span className="text-[10px]">Apenas arquivos PDF</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button variant="outline" type="button" onClick={() => setShowEdit(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest border-2">Cancelar</Button>
                                <Button type="submit" isLoading={isLoading} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20"><Save size={20} className="mr-2"/> Salvar Cadastro</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
