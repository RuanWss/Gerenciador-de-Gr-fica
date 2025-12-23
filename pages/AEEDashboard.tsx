
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToStudents, updateStudent, uploadReportFile, getAllPEIs } from '../services/firebaseService';
import { Student, PEIDocument } from '../types';
import { Button } from '../components/Button';
import { 
    Users, Search, Edit3, X, Save, FileText, UploadCloud, 
    CheckCircle, ShieldAlert, Heart, FileCheck, ExternalLink, School, Eye, List,
    Phone, UserCircle, MessageSquare
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
    const [activeTab, setActiveTab] = useState<'students' | 'pei_reports'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [allPeis, setAllPeis] = useState<PEIDocument[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Edit Modal (Students)
    const [showEdit, setShowEdit] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [reportFile, setReportFile] = useState<File | null>(null);

    // PEI View Modal
    const [showPeiView, setShowPeiView] = useState(false);
    const [selectedPei, setSelectedPei] = useState<PEIDocument | null>(null);

    useEffect(() => {
        const unsub = listenToStudents((data) => {
            // EXIBIR APENAS ALUNOS MARCADOS COMO AEE
            setStudents(data.filter(s => s.isAEE));
        });
        fetchPeis();
        return () => unsub();
    }, []);

    const fetchPeis = async () => {
        const data = await getAllPEIs();
        setAllPeis(data.sort((a,b) => b.updatedAt - a.updatedAt));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        setIsLoading(true);
        try {
            let reportUrl = selectedStudent.reportUrl;
            if (reportFile) {
                reportUrl = await uploadReportFile(reportFile, selectedStudent.name);
            }
            
            // Garantir que campos opcionais não sejam undefined para o Firestore
            const studentToUpdate: Student = {
                ...selectedStudent,
                reportUrl: reportUrl || '',
                pedagogicalResponsible: selectedStudent.pedagogicalResponsible || '',
                fatherName: selectedStudent.fatherName || '',
                motherName: selectedStudent.motherName || '',
                contacts: selectedStudent.contacts || '',
                coordinationOpinion: selectedStudent.coordinationOpinion || '',
                disorder: selectedStudent.disorder || ''
            };

            await updateStudent(studentToUpdate);
            setShowEdit(false);
            setReportFile(null);
            alert("Ficha do Aluno AEE atualizada!");
        } catch (err: any) {
            console.error("Erro ao salvar prontuário:", err);
            alert("Erro ao salvar prontuário: " + (err.message || 'Erro desconhecido'));
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.className.toLowerCase().includes(search.toLowerCase())
    );

    const filteredPeis = allPeis.filter(p => 
        p.studentName.toLowerCase().includes(search.toLowerCase()) ||
        p.teacherName.toLowerCase().includes(search.toLowerCase()) ||
        p.subject.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3">
                        <Heart size={40} className="text-red-500 fill-red-500/20" /> Painel AEE
                    </h1>
                    <p className="text-gray-400 font-medium">Gestão de Atendimento Educacional Especializado</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mr-4">
                        <button onClick={() => setActiveTab('students')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'students' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Fila de Atendimento</button>
                        <button onClick={() => { setActiveTab('pei_reports'); fetchPeis(); }} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'pei_reports' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Relatórios PEI</button>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                            placeholder="Buscar aluno inclusive..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {activeTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-right-4">
                    {filteredStudents.map(student => (
                        <div key={student.id} className="bg-[#18181b] border-2 rounded-3xl p-6 transition-all group relative overflow-hidden border-red-600/50 shadow-lg shadow-red-900/10">
                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">AEE</div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                    {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover"/> : <Users className="p-3 text-gray-700 w-full h-full"/>}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-white truncate text-lg leading-tight">{student.name}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{student.className}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/20">
                                    <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Diagnóstico</span>
                                    <p className="text-sm font-bold text-red-100">{student.disorder || 'Não informado'}</p>
                                </div>
                                
                                {student.motherName && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <UserCircle size={14} className="text-gray-600"/>
                                        <span className="truncate"><b>Mãe:</b> {student.motherName}</span>
                                    </div>
                                )}

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

                            <button 
                                onClick={() => { setSelectedStudent(student); setShowEdit(true); }}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 uppercase text-xs tracking-widest"
                            >
                                <Edit3 size={16}/> Abrir Prontuário
                            </button>
                        </div>
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/5 opacity-40">
                             <Heart size={64} className="mx-auto text-gray-500 mb-4"/>
                             <p className="font-bold text-gray-400 uppercase tracking-widest">Nenhum aluno encaminhado para o AEE</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'pei_reports' && (
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-right-4">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                            <tr>
                                <th className="p-6">Aluno</th>
                                <th className="p-6">Professor / Disciplina</th>
                                <th className="p-6">Atualização</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPeis.map(pei => (
                                <tr key={pei.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-6">
                                        <p className="font-bold text-gray-800">{pei.studentName}</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-bold text-gray-700 text-sm">{pei.teacherName}</p>
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">{pei.subject}</p>
                                    </td>
                                    <td className="p-6 text-xs text-gray-500 font-medium">
                                        {new Date(pei.updatedAt).toLocaleDateString()} {new Date(pei.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="p-6 text-center">
                                        <button 
                                            onClick={() => { setSelectedPei(pei); setShowPeiView(true); }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                                        >
                                            <Eye size={14}/> Abrir PEI
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT MODAL (PRONTUÁRIO COMPLETO AEE) */}
            {showEdit && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Prontuário de Atendimento</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedStudent.name}</p>
                            </div>
                            <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto flex-1">
                            {/* SEÇÃO 1: DADOS FAMILIARES */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users size={14}/> Núcleo Familiar e Contatos
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsável Pedagógica</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.pedagogicalResponsible || ''} onChange={e => setSelectedStudent({...selectedStudent, pedagogicalResponsible: e.target.value})} placeholder="Nome da profissional responsável"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome do Pai</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.fatherName || ''} onChange={e => setSelectedStudent({...selectedStudent, fatherName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome da Mãe</label>
                                        <input className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.motherName || ''} onChange={e => setSelectedStudent({...selectedStudent, motherName: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contatos (Telefones/E-mails)</label>
                                        <textarea rows={2} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 outline-none bg-white text-gray-900 font-medium" value={selectedStudent.contacts || ''} onChange={e => setSelectedStudent({...selectedStudent, contacts: e.target.value})} placeholder="(XX) XXXXX-XXXX / exemplo@email.com"/>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 2: PARECER DA COORDENAÇÃO */}
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MessageSquare size={14}/> Parecer da Coordenação do AEE
                                </h4>
                                <textarea 
                                    rows={4} 
                                    className="w-full border-2 border-blue-200 rounded-xl p-4 text-sm focus:border-blue-500 outline-none bg-white font-medium text-gray-900" 
                                    value={selectedStudent.coordinationOpinion || ''} 
                                    onChange={e => setSelectedStudent({...selectedStudent, coordinationOpinion: e.target.value})} 
                                    placeholder="Descreva aqui o parecer técnico e orientações da coordenação sobre este aluno..."
                                />
                            </div>

                            {/* SEÇÃO 3: DADOS TÉCNICOS */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Transtorno ou Deficiência Principal</label>
                                    <select className="w-full border-2 border-gray-100 rounded-2xl p-4 text-gray-800 font-bold outline-none focus:border-red-600 transition-colors bg-white" value={selectedStudent.disorder || ''} onChange={e => setSelectedStudent({...selectedStudent, disorder: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {DISORDERS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Laudo Médico Atualizado (PDF)</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                                        <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setReportFile(e.target.files[0])}/>
                                        {reportFile ? (<div className="text-green-600 flex flex-col items-center"><FileCheck size={40} className="mb-2"/><span className="font-bold">{reportFile.name}</span></div>) : (<div className="text-gray-400 flex flex-col items-center"><UploadCloud size={40} className="mb-2"/><span className="font-bold">Anexar Laudo Digital</span><span className="text-[10px]">Apenas arquivos PDF</span></div>)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <Button variant="outline" type="button" onClick={() => setShowEdit(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest border-2">Cancelar</Button>
                                <Button type="submit" isLoading={isLoading} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-900/20"><Save size={20} className="mr-2"/> Salvar Cadastro</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PEI VIEW MODAL */}
            {showPeiView && selectedPei && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-3"><Heart size={24} className="text-red-600"/> Planejamento PEI</h3>
                                <p className="text-sm text-gray-500 font-bold">{selectedPei.studentName} • Disciplina: {selectedPei.subject} • {selectedPei.period || '1º Bimestre'}</p>
                            </div>
                            <button onClick={() => setShowPeiView(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={32}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Competências Essenciais</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.essentialCompetencies || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Conteúdos Selecionados</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.selectedContents || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Recursos Didáticos</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.didacticResources || 'Não preenchido'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 border-b pb-1">Avaliação</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedPei.evaluation || 'Não preenchido'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button onClick={() => setShowPeiView(false)} className="px-10 h-14 bg-gray-800 hover:bg-black font-black uppercase tracking-widest">Fechar Visualização</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
