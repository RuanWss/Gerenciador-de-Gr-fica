import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExams, updateExamStatus, saveUser } from '../services/mockStorage';
import { ExamRequest, ExamStatus, UserRole } from '../types';
import { Button } from '../components/Button';
import { Printer, CheckCircle, Clock, Download, Eye, UserPlus, X, Briefcase } from 'lucide-react';

export const PrintShopDashboard: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // State for Add Teacher Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherShift, setNewTeacherShift] = useState<'morning' | 'afternoon'>('morning');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const morningClasses = ['6º Ano EFAI', '7º Ano EFAI', '8º Ano EFAI', '9º Ano EFAI'];
  const afternoonClasses = ['1ª Série EM', '2ª Série EM', '3ª Série EM'];

  const refreshExams = () => {
    const allExams = getExams();
    setExams(allExams.sort((a,b) => a.createdAt - b.createdAt)); // Oldest first for queue
  };

  useEffect(() => {
    refreshExams();
  }, [user]);

  const handleStatusChange = (id: string, newStatus: ExamStatus) => {
    updateExamStatus(id, newStatus);
    refreshExams();
  };

  const handleViewFile = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
        window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
    } else {
        alert(`Simulação: Download do arquivo "${fileName}" iniciado.`);
    }
  };

  const toggleClass = (className: string) => {
    if (selectedClasses.includes(className)) {
        setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
        setSelectedClasses([...selectedClasses, className]);
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
        id: crypto.randomUUID(),
        name: newTeacherName,
        email: newTeacherEmail,
        password: newTeacherPassword,
        role: UserRole.TEACHER,
        subject: newTeacherSubject,
        classes: selectedClasses
    };
    
    saveUser(newUser);
    alert('Professor cadastrado com sucesso!');
    setIsModalOpen(false);
    
    // Reset form
    setNewTeacherName('');
    setNewTeacherEmail('');
    setNewTeacherPassword('');
    setNewTeacherSubject('');
    setSelectedClasses([]);
  };

  const filteredExams = exams.filter(exam => {
    if (filter === 'pending') return exam.status !== ExamStatus.COMPLETED;
    if (filter === 'completed') return exam.status === ExamStatus.COMPLETED;
    return true;
  });

  return (
    <div className="space-y-6 relative">
      {/* Add Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus className="text-brand-600" size={24}/> 
                        Cadastrar Novo Professor
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleAddTeacher} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                        <input required type="text" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 p-2 border" 
                            value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Login (Email)</label>
                            <input required type="email" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 p-2 border" 
                                value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <input required type="password" className="mt-1 block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 p-2 border" 
                                value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Briefcase size={14} /> Disciplina
                        </label>
                        <input 
                            required 
                            type="text" 
                            placeholder="Ex: Matemática, História..." 
                            className="block w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 p-2 border"
                            value={newTeacherSubject}
                            onChange={e => setNewTeacherSubject(e.target.value)}
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Turno & Turmas</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={newTeacherShift === 'morning'} 
                                    onChange={() => {
                                        setNewTeacherShift('morning'); 
                                        setSelectedClasses([]);
                                    }}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-sm text-gray-700">Manhã (EFAI)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={newTeacherShift === 'afternoon'} 
                                    onChange={() => {
                                        setNewTeacherShift('afternoon');
                                        setSelectedClasses([]);
                                    }}
                                    className="text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-sm text-gray-700">Tarde (Ensino Médio)</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {(newTeacherShift === 'morning' ? morningClasses : afternoonClasses).map(cls => (
                                <label key={cls} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedClasses.includes(cls)}
                                        onChange={() => toggleClass(cls)}
                                        className="rounded text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-gray-600">{cls}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Salvar Professor</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <header className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Printer className="text-brand-600" /> 
            Central de Impressão
          </h1>
          <p className="text-gray-500">Gerenciamento da fila de provas</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-900 text-white hover:bg-gray-800"
            >
                <UserPlus className="w-4 h-4 mr-2" /> Novo Professor
            </Button>

            <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-white shadow text-gray-900 ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                >
                    Todas
                </button>
                <button 
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'pending' ? 'bg-white shadow text-brand-600 ring-1 ring-brand-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                >
                    Fila
                </button>
                <button 
                    onClick={() => setFilter('completed')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'completed' ? 'bg-white shadow text-green-600 ring-1 ring-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                >
                    Concluídas
                </button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredExams.length === 0 ? (
             <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-500">
                <p>Nenhuma prova encontrada com este filtro.</p>
             </div>
        ) : (
            filteredExams.map((exam) => (
                <div key={exam.id} className={`bg-white rounded-lg shadow-sm border-l-4 p-6 transition-all hover:shadow-md ${exam.status === ExamStatus.COMPLETED ? 'border-l-green-500 opacity-75' : 'border-l-brand-500'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide border
                                    ${exam.status === ExamStatus.PENDING ? 'bg-white border-red-500 text-red-600' : 
                                      exam.status === ExamStatus.IN_PROGRESS ? 'bg-white border-yellow-500 text-yellow-600' : 
                                      'bg-white border-green-500 text-green-600'}`}>
                                    {exam.status === ExamStatus.PENDING ? 'Aguardando' : 
                                     exam.status === ExamStatus.IN_PROGRESS ? 'Em andamento' : 'Finalizado'}
                                </span>
                                <span className="text-gray-400 text-sm flex items-center">
                                    <Clock size={14} className="mr-1"/> Enviado em {new Date(exam.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                            <p className="text-gray-600 font-medium">{exam.teacherName} — {exam.subject}</p>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                                <div>
                                    <span className="block text-xs uppercase text-gray-400">Turma</span>
                                    {exam.gradeLevel}
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-400">Quantidade</span>
                                    {exam.quantity > 0 ? (
                                        <><span className="font-bold text-gray-900 text-lg">{exam.quantity}</span> cópias</>
                                    ) : (
                                        <span className="text-gray-800 font-semibold text-xs">Ver Arquivo/Instruções</span>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-400">Prazo</span>
                                    <span className="text-red-500 font-medium">{new Date(exam.dueDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-400">Arquivo</span>
                                    {exam.fileName}
                                </div>
                            </div>
                            {exam.instructions && (
                                <div className="mt-3 text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
                                    "Obs: {exam.instructions}"
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 justify-center border-l border-gray-100 pl-0 md:pl-6">
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => handleViewFile(exam.fileName)}
                            >
                                {exam.fileName.toLowerCase().endsWith('.pdf') ? (
                                    <><Eye size={16} className="mr-2"/> Visualizar PDF</>
                                ) : (
                                    <><Download size={16} className="mr-2"/> Baixar Arquivo</>
                                )}
                            </Button>
                            
                            {exam.status === ExamStatus.PENDING && (
                                <Button onClick={() => handleStatusChange(exam.id, ExamStatus.IN_PROGRESS)} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                                    <Printer size={16} className="mr-2"/> Iniciar Impressão
                                </Button>
                            )}

                            {exam.status === ExamStatus.IN_PROGRESS && (
                                <Button onClick={() => handleStatusChange(exam.id, ExamStatus.COMPLETED)} className="w-full bg-green-600 hover:bg-green-700">
                                    <CheckCircle size={16} className="mr-2"/> Marcar Pronto
                                </Button>
                            )}

                            {exam.status === ExamStatus.COMPLETED && (
                                <Button onClick={() => handleStatusChange(exam.id, ExamStatus.IN_PROGRESS)} variant="outline" className="w-full text-xs">
                                    Reabrir
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};