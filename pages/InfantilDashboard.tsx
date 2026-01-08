
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getExams, 
    saveExam, 
    uploadExamFile,
    getClassMaterials,
    saveClassMaterial,
    deleteClassMaterial,
    listenToStudents,
    saveOccurrence,
    listenToOccurrences,
    deleteOccurrence
} from '../services/firebaseService';
import { ExamRequest, ExamStatus, ClassMaterial, Student, StudentOccurrence } from '../types';
import { Button } from '../components/Button';
import { 
  Plus, UploadCloud, List, PlusCircle, X, 
  Folder, FileText, Trash2, FileUp, Search,
  Download, AlertCircle, Calendar, User, MessageSquare, Baby, Palette, Smile
} from 'lucide-react';

const INFANTIL_CLASSES = ["MATERNAL I", "MATERNAL II", "NÍVEL I", "NÍVEL II"];

export const InfantilDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'materials' | 'occurrences'>('requests');
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherOccurrences, setTeacherOccurrences] = useState<StudentOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- FORM STATES ---
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('');
  const [printQty, setPrintQty] = useState(25);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showOccModal, setShowOccModal] = useState(false);
  const [newOcc, setNewOcc] = useState<Partial<StudentOccurrence>>({
      studentId: '', category: 'elogio', severity: 'low', description: '', date: new Date().toISOString().split('T')[0]
  });
  const [occClass, setOccClass] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matFile, setMatFile] = useState<File | null>(null);
  const [newMaterial, setNewMaterial] = useState({ title: '', className: '', subject: 'Educação Infantil' });

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
      const unsubS = listenToStudents(setStudents);
      const unsubO = listenToOccurrences((all) => {
          setTeacherOccurrences(all.filter(o => o.reportedBy === user?.name));
      });
      return () => { unsubS(); unsubO(); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        if (activeTab === 'requests') {
            const allExams = await getExams(user.id);
            setExams(allExams.sort((a,b) => b.createdAt - a.createdAt));
        } else if (activeTab === 'materials') {
            const allMats = await getClassMaterials(user.id);
            setMaterials(allMats.sort((a,b) => b.createdAt - a.createdAt));
        }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const finalizeExam = async () => {
      if (!examTitle || !examGrade) return alert("Preencha o título e a turma.");
      if (uploadedFiles.length === 0) return alert("Anexe as atividades.");
      setIsSaving(true);
      try {
          const fileUrls: string[] = [];
          const fileNames: string[] = [];
          for (const file of uploadedFiles) {
              const url = await uploadExamFile(file, user?.name || 'Infantil');
              fileUrls.push(url);
              fileNames.push(file.name);
          }
          await saveExam({
              id: '', teacherId: user?.id || '', teacherName: user?.name || '',
              subject: 'Infantil', title: examTitle, quantity: Number(printQty),
              gradeLevel: examGrade, instructions: 'Educação Infantil',
              fileNames, fileUrls, status: ExamStatus.PENDING, createdAt: Date.now(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
          alert("Atividades enviadas para a gráfica!");
          setActiveTab('requests');
          setExamTitle(''); setUploadedFiles([]);
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  const handleSaveOccurrence = async () => {
      if (!newOcc.studentId || !newOcc.description) return alert("Preencha os campos.");
      setIsSaving(true);
      try {
          const student = students.find(s => s.id === newOcc.studentId);
          await saveOccurrence({
              id: '', studentId: student?.id || '', studentName: student?.name || '',
              studentClass: student?.className || '', category: newOcc.category || 'elogio',
              severity: 'low', description: newOcc.description || '',
              date: newOcc.date || new Date().toISOString().split('T')[0],
              timestamp: Date.now(), reportedBy: user?.name || 'Professor'
          });
          setShowOccModal(false);
          alert("Registro salvo!");
      } catch (e) { alert("Erro ao salvar."); }
      finally { setIsSaving(false); }
  };

  const handleSaveMaterial = async () => {
      if (!newMaterial.title || !newMaterial.className || !matFile) return alert("Preencha todos os campos.");
      setIsSaving(true);
      try {
          const fileUrl = await uploadExamFile(matFile, user?.name || 'Infantil');
          await saveClassMaterial({
              id: '', teacherId: user?.id || '', teacherName: user?.name || '',
              title: newMaterial.title, className: newMaterial.className,
              subject: newMaterial.subject, fileUrl: fileUrl, fileName: matFile.name,
              fileType: matFile.type, createdAt: Date.now()
          });
          setShowMaterialModal(false);
          alert("Material enviado para a TV!");
          fetchData();
      } catch (e) { alert("Erro ao enviar."); }
      finally { setIsSaving(false); }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-transparent">
        <div className="w-64 bg-[#fff7ed]/10 backdrop-blur-xl border-r border-orange-500/20 p-6 flex flex-col h-full z-20 shadow-2xl">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-6 px-2">
                    <Baby className="text-orange-500" size={24}/>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Portal Infantil</p>
                </div>
                <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-orange-200/60 hover:bg-white/10'}`}><List size={18} /> Minha Fila</button>
                <button onClick={() => setActiveTab('create')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-orange-200/60 hover:bg-white/10'}`}><PlusCircle size={18} /> Enviar Atividade</button>
                <button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-all ${activeTab === 'materials' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-orange-200/60 hover:bg-white/10'}`}><Palette size={18} /> Materiais TV</button>
                <button onClick={() => setActiveTab('occurrences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-bold transition-all ${activeTab === 'occurrences' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-orange-200/60 hover:bg-white/10'}`}><Smile size={18} /> Diário de Bordo</button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Fila de Impressões</h1>
                        <p className="text-orange-200/50 text-sm font-bold">Acompanhe as atividades enviadas para a gráfica.</p>
                    </header>
                    <div className="bg-[#1c1917] rounded-3xl border border-orange-500/10 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-orange-500/50 uppercase text-[10px] font-black tracking-widest border-b border-orange-500/10">
                                <tr><th className="p-6">Data</th><th className="p-6">Atividade</th><th className="p-6">Turma</th><th className="p-6">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-orange-500/5">
                                {exams.map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 text-sm text-gray-400 font-medium">{new Date(e.createdAt).toLocaleDateString()}</td>
                                        <td className="p-6 font-bold text-white uppercase">{e.title}</td>
                                        <td className="p-6"><span className="bg-orange-500/10 px-3 py-1 rounded-full text-xs font-bold text-orange-400">{e.gradeLevel}</span></td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                e.status === ExamStatus.PENDING ? 'bg-yellow-500/10 text-yellow-500' :
                                                e.status === ExamStatus.IN_PROGRESS ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                                {e.status === ExamStatus.PENDING ? 'Fila' : e.status === ExamStatus.IN_PROGRESS ? 'Rodando' : 'Pronto'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                    <div className="bg-[#1c1917] border border-orange-500/20 p-10 rounded-[3rem] shadow-2xl">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                            <UploadCloud className="text-orange-500" size={32} /> Solicitar Cópias
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nome da Atividade</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="Ex: Coordenação Motora - Maternal I" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Turma</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none" value={examGrade} onChange={e => setExamGrade(e.target.value)}>
                                        <option value="">-- Selecione --</option>
                                        {INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                                    <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all" value={printQty} onChange={e => setPrintQty(Number(e.target.value))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Anexar Folhas</label>
                                <div className="border-2 border-dashed border-orange-500/20 rounded-3xl p-10 text-center hover:border-orange-500 transition-all relative">
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                    <FileUp className="mx-auto text-gray-600 mb-4" size={48} />
                                    <p className="text-gray-400 font-bold uppercase text-xs">Clique para anexar PDFs ou Imagens</p>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {uploadedFiles.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-xs text-gray-300 font-bold truncate pr-4">{f.name}</span>
                                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><X size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={finalizeExam} isLoading={isSaving} className="w-full h-16 rounded-2xl font-black uppercase tracking-widest bg-orange-600 shadow-xl shadow-orange-900/40">Enviar p/ Gráfica</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'materials' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Materiais para TV</h1>
                            <p className="text-orange-200/50">Envie vídeos ou imagens para exibir na sala.</p>
                        </div>
                        <Button onClick={() => setShowMaterialModal(true)} className="bg-orange-600"><Plus size={18} className="mr-2"/> Novo Material</Button>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {materials.map(mat => (
                            <div key={mat.id} className="bg-[#1c1917] border border-orange-500/10 p-6 rounded-3xl shadow-xl flex flex-col group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Palette size={24}/></div>
                                    <button onClick={async () => { if(confirm("Excluir?")) await deleteClassMaterial(mat.id); fetchData(); }} className="text-gray-700 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{mat.title}</h3>
                                <p className="text-xs text-orange-500 font-black uppercase mb-6 tracking-widest">{mat.className}</p>
                                <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="mt-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/5 transition-all"><Download size={18}/> Baixar</a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'occurrences' && (
                <div className="animate-in fade-in slide-in-from-right-4">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Diário de Bordo</h1>
                            <p className="text-orange-200/50">Registre observações diárias e elogios dos pequenos.</p>
                        </div>
                        <Button onClick={() => setShowOccModal(true)} className="bg-orange-600"><Plus size={18} className="mr-2"/> Novo Registro</Button>
                    </header>
                    <div className="grid grid-cols-1 gap-4">
                        {teacherOccurrences.map(occ => (
                            <div key={occ.id} className="bg-[#1c1917] border border-orange-500/10 p-6 rounded-3xl shadow-xl flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${occ.category === 'elogio' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>{occ.category}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{new Date(occ.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white uppercase">{occ.studentName}</h3>
                                    <p className="text-xs text-orange-500 font-black uppercase tracking-widest mb-4">{occ.studentClass}</p>
                                    <div className="bg-black/20 p-4 rounded-xl text-gray-400 text-sm italic border border-white/5">"{occ.description}"</div>
                                </div>
                                <button onClick={async () => { if(confirm("Excluir?")) await deleteOccurrence(occ.id); }} className="text-gray-600 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* MODAL OCORRÊNCIA */}
        {showOccModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-[#1c1917] border border-orange-500/20 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white uppercase flex items-center gap-2"><Smile className="text-orange-500"/> Registro Diário</h3>
                        <button onClick={() => setShowOccModal(false)} className="text-gray-500"><X size={24}/></button>
                    </div>
                    <div className="space-y-6">
                        <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={occClass} onChange={e => setOccClass(e.target.value)}><option value="">-- Turma --</option>{INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newOcc.studentId} onChange={e => setNewOcc({...newOcc, studentId: e.target.value})} disabled={!occClass}><option value="">-- Aluno --</option>{students.filter(s => s.className === occClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        <select className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newOcc.category} onChange={e => setNewOcc({...newOcc, category: e.target.value as any})}><option value="elogio">Elogio / Destaque</option><option value="atraso">Atraso</option><option value="outros">Observação Geral</option></select>
                        <textarea className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" rows={4} value={newOcc.description} onChange={e => setNewOcc({...newOcc, description: e.target.value})} placeholder="Como foi o dia desse aluno?" />
                        <Button onClick={handleSaveOccurrence} isLoading={isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-orange-600">Salvar Registro</Button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL MATERIAL */}
        {showMaterialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-[#1c1917] border border-orange-500/20 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8">
                    <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black text-white uppercase">Novo Material TV</h3><button onClick={() => setShowMaterialModal(false)} className="text-gray-500"><X size={24}/></button></div>
                    <div className="space-y-6">
                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} placeholder="Título do Material" />
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" value={newMaterial.className} onChange={e => setNewMaterial({...newMaterial, className: e.target.value})}><option value="">-- Turma --</option>{INFANTIL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <div className="border-2 border-dashed border-orange-500/20 rounded-2xl p-8 text-center relative hover:bg-white/5 cursor-pointer">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setMatFile(e.target.files?.[0] || null)} />
                            {matFile ? <span className="text-green-500 font-bold truncate block">{matFile.name}</span> : <span className="text-orange-500/50 font-bold">Selecionar arquivo (PDF/Imagem)</span>}
                        </div>
                        <Button onClick={handleSaveMaterial} isLoading={isSaving} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-orange-600">Enviar para Sala</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
