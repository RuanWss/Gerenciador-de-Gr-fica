
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getStudents, 
    listenToLibraryBooks, 
    saveLibraryBook, 
    deleteLibraryBook, 
    listenToLibraryLoans, 
    createLoan, 
    returnLoan 
} from '../services/firebaseService';
import { LibraryBook, LibraryLoan, Student } from '../types';
import { Button } from '../components/Button';
import { 
    Book, 
    Library, 
    History, 
    Plus, 
    Search, 
    Trash2, 
    Edit3, 
    Save, 
    X, 
    Calendar, 
    User, 
    CheckCircle, 
    AlertCircle, 
    Printer 
} from 'lucide-react';

export const LibraryDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'inventory' | 'loans'>('inventory');
    
    // Data State
    const [books, setBooks] = useState<LibraryBook[]>([]);
    const [loans, setLoans] = useState<LibraryLoan[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [showBookModal, setShowBookModal] = useState(false);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);

    // Forms
    const [bookForm, setBookForm] = useState<Partial<LibraryBook>>({
        title: '', author: '', isbn: '', category: 'Literatura', totalQuantity: 1, availableQuantity: 1, location: ''
    });
    
    const [loanForm, setLoanForm] = useState({
        studentId: '',
        bookId: '',
        dueDate: ''
    });

    // Filters
    const filteredBooks = books.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.isbn?.includes(searchTerm)
    );

    const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'late').sort((a,b) => b.loanDate.localeCompare(a.loanDate));
    const historyLoans = loans.filter(l => l.status === 'returned').sort((a,b) => b.returnDate!.localeCompare(a.returnDate!));

    useEffect(() => {
        // Load Students for Loan Selection
        getStudents().then(setStudents);

        // Listeners
        const unsubBooks = listenToLibraryBooks(setBooks);
        const unsubLoans = listenToLibraryLoans(setLoans);

        return () => {
            unsubBooks();
            unsubLoans();
        };
    }, []);

    // --- BOOK HANDLERS ---

    const handleSaveBook = async () => {
        if (!bookForm.title || !bookForm.author || !bookForm.totalQuantity) return alert("Preencha os campos obrigatórios.");
        
        const newBook: LibraryBook = {
            id: editingBook ? editingBook.id : '',
            title: bookForm.title!,
            author: bookForm.author!,
            isbn: bookForm.isbn || '',
            category: bookForm.category || 'Geral',
            totalQuantity: Number(bookForm.totalQuantity),
            availableQuantity: editingBook ? (Number(bookForm.totalQuantity) - (editingBook.totalQuantity - editingBook.availableQuantity)) : Number(bookForm.totalQuantity),
            location: bookForm.location || '',
            createdAt: editingBook ? editingBook.createdAt : Date.now()
        };

        await saveLibraryBook(newBook);
        setShowBookModal(false);
        resetBookForm();
    };

    const handleDeleteBook = async (id: string) => {
        if (confirm("Excluir esta obra do acervo?")) {
            await deleteLibraryBook(id);
        }
    };

    const openBookModal = (book?: LibraryBook) => {
        if (book) {
            setEditingBook(book);
            setBookForm(book);
        } else {
            resetBookForm();
        }
        setShowBookModal(true);
    };

    const resetBookForm = () => {
        setEditingBook(null);
        setBookForm({ title: '', author: '', isbn: '', category: 'Literatura', totalQuantity: 1, availableQuantity: 1, location: '' });
    };

    // --- LOAN HANDLERS ---

    const handleCreateLoan = async () => {
        if (!loanForm.studentId || !loanForm.bookId || !loanForm.dueDate) return alert("Selecione aluno, livro e data de devolução.");

        const student = students.find(s => s.id === loanForm.studentId);
        const book = books.find(b => b.id === loanForm.bookId);

        if (!student || !book) return;
        if (book.availableQuantity <= 0) return alert("Livro indisponível no momento.");

        const newLoan: LibraryLoan = {
            id: '',
            bookId: book.id,
            bookTitle: book.title,
            studentId: student.id,
            studentName: student.name,
            studentClass: student.className,
            loanDate: new Date().toISOString().split('T')[0],
            dueDate: loanForm.dueDate,
            status: 'active'
        };

        await createLoan(newLoan);
        
        // Auto Print Receipt Option
        if (confirm("Empréstimo registrado! Deseja imprimir o comprovante?")) {
            printReceipt(newLoan);
        }

        setShowLoanModal(false);
        setLoanForm({ studentId: '', bookId: '', dueDate: '' });
    };

    const handleReturnLoan = async (loan: LibraryLoan) => {
        if (confirm(`Confirmar devolução do livro "${loan.bookTitle}" por ${loan.studentName}?`)) {
            await returnLoan(loan.id, loan.bookId);
        }
    };

    // --- PRINT RECEIPT ---
    const printReceipt = (loan: LibraryLoan) => {
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Recibo de Empréstimo - Biblioteca CEMAL</title>
                    <style>
                        body { font-family: monospace; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed black; padding-bottom: 10px; }
                        .logo { font-size: 20px; font-weight: bold; }
                        .info { margin-bottom: 15px; }
                        .label { font-weight: bold; }
                        .signature { margin-top: 50px; border-top: 1px solid black; width: 80%; margin-left: auto; margin-right: auto; text-align: center; padding-top: 5px; }
                        .footer { margin-top: 30px; font-size: 10px; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">BIBLIOTECA CEMAL</div>
                        <div>Comprovante de Empréstimo</div>
                    </div>
                    <div class="info">
                        <div><span class="label">Data:</span> ${new Date().toLocaleDateString('pt-BR')}</div>
                        <div><span class="label">Aluno:</span> ${loan.studentName}</div>
                        <div><span class="label">Turma:</span> ${loan.studentClass}</div>
                    </div>
                    <div class="info">
                        <div><span class="label">Obra:</span> ${loan.bookTitle}</div>
                        <div><span class="label">Devolução Prevista:</span> ${new Date(loan.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="signature">
                        Assinatura do Aluno
                    </div>
                    <div class="footer">
                        Sistema de Gestão Escolar CEMAL
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-8 bg-[#0f0f10]">
            {/* SIDEBAR */}
            <div className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col h-full z-20 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Biblioteca</p>
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === 'inventory' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                        <Book size={18} /> Acervo / Obras
                    </button>
                    <button 
                        onClick={() => setActiveTab('loans')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${activeTab === 'loans' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                    >
                        <Library size={18} /> Empréstimos
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 text-white">
                
                {/* --- INVENTORY TAB --- */}
                {activeTab === 'inventory' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Book className="text-red-500"/> Acervo Bibliográfico</h1>
                                <p className="text-gray-400">Gerenciamento de livros e obras</p>
                            </div>
                            <Button onClick={() => openBookModal()}>
                                <Plus size={18} className="mr-2"/> Nova Obra
                            </Button>
                        </header>

                        <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 mb-6 flex justify-between items-center">
                            <div className="relative w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    className="w-full bg-black/30 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-red-500 outline-none"
                                    placeholder="Buscar por título, autor ou ISBN..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="text-sm text-gray-400 font-bold">
                                {filteredBooks.length} Obras Cadastradas
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredBooks.map(book => (
                                <div key={book.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-red-900/20 rounded-lg flex items-center justify-center text-red-500">
                                            <Book size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{book.title}</h3>
                                            <p className="text-sm text-gray-400">{book.author} • <span className="text-gray-500">{book.category}</span></p>
                                            {book.isbn && <p className="text-xs text-gray-600 font-mono">ISBN: {book.isbn}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase font-bold">Disponível</p>
                                            <p className={`text-xl font-black ${book.availableQuantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {book.availableQuantity} <span className="text-sm text-gray-600 font-medium">/ {book.totalQuantity}</span>
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openBookModal(book)} className="p-2 hover:bg-white/10 rounded text-blue-400"><Edit3 size={18}/></button>
                                            <button onClick={() => handleDeleteBook(book.id)} className="p-2 hover:bg-white/10 rounded text-red-400"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- LOANS TAB --- */}
                {activeTab === 'loans' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Library className="text-red-500"/> Controle de Empréstimos</h1>
                                <p className="text-gray-400">Entradas, saídas e histórico</p>
                            </div>
                            <Button onClick={() => setShowLoanModal(true)}>
                                <Plus size={18} className="mr-2"/> Novo Empréstimo
                            </Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* ACTIVE LOANS */}
                            <div className="bg-[#18181b] rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                                <div className="p-4 bg-red-900/10 border-b border-gray-800 flex justify-between items-center">
                                    <h3 className="font-bold text-red-100 flex items-center gap-2"><AlertCircle size={18}/> Empréstimos Ativos</h3>
                                    <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-bold">{activeLoans.length}</span>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                                    {activeLoans.map(loan => {
                                        const isLate = new Date() > new Date(loan.dueDate + 'T23:59:59');
                                        return (
                                            <div key={loan.id} className={`p-4 rounded-lg border ${isLate ? 'bg-red-950/20 border-red-900/50' : 'bg-gray-900/50 border-gray-800'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm">{loan.bookTitle}</h4>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><User size={10}/> {loan.studentName}</p>
                                                        <p className="text-[10px] text-gray-500">{loan.studentClass}</p>
                                                    </div>
                                                    {isLate && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase">Atrasado</span>}
                                                </div>
                                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                                                    <div className="text-xs">
                                                        <span className="text-gray-500">Devolução: </span>
                                                        <span className={`font-bold ${isLate ? 'text-red-400' : 'text-white'}`}>
                                                            {new Date(loan.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => printReceipt(loan)} className="p-1.5 hover:bg-white/10 rounded text-gray-400" title="Reimprimir Recibo"><Printer size={14}/></button>
                                                        <button onClick={() => handleReturnLoan(loan)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-bold text-white transition-colors">
                                                            Devolver
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeLoans.length === 0 && <p className="text-center text-gray-500 py-10 text-sm">Nenhum empréstimo ativo.</p>}
                                </div>
                            </div>

                            {/* HISTORY */}
                            <div className="bg-[#18181b] rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                                <div className="p-4 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-300 flex items-center gap-2"><History size={18}/> Histórico de Devoluções</h3>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                                    {historyLoans.map(loan => (
                                        <div key={loan.id} className="p-3 rounded-lg border border-gray-800 bg-gray-900/30 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                                            <div>
                                                <h4 className="font-bold text-gray-300 text-sm">{loan.bookTitle}</h4>
                                                <p className="text-xs text-gray-500">{loan.studentName}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-green-500 flex items-center gap-1 justify-end"><CheckCircle size={10}/> Devolvido</span>
                                                <p className="text-[10px] text-gray-500">{new Date(loan.returnDate!).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {historyLoans.length === 0 && <p className="text-center text-gray-500 py-10 text-sm">Histórico vazio.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: BOOK FORM */}
                {showBookModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#18181b] border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{editingBook ? 'Editar Obra' : 'Nova Obra'}</h3>
                                <button onClick={() => setShowBookModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                    <input className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Autor</label>
                                        <input className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                        <select className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})}>
                                            <option value="Literatura">Literatura</option>
                                            <option value="Didático">Didático</option>
                                            <option value="Referência">Referência</option>
                                            <option value="Periódico">Periódico</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade</label>
                                        <input type="number" min="1" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.totalQuantity} onChange={e => setBookForm({...bookForm, totalQuantity: Number(e.target.value)})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Localização (Estante)</label>
                                        <input className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.location} onChange={e => setBookForm({...bookForm, location: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ISBN (Opcional)</label>
                                    <input className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button onClick={handleSaveBook}><Save size={16} className="mr-2"/> Salvar Obra</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: LOAN FORM */}
                {showLoanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#18181b] border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Registrar Empréstimo</h3>
                                <button onClick={() => setShowLoanModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Aluno</label>
                                    <select 
                                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" 
                                        value={loanForm.studentId} 
                                        onChange={e => setLoanForm({...loanForm, studentId: e.target.value})}
                                    >
                                        <option value="">-- Selecione --</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione a Obra (Disponíveis)</label>
                                    <select 
                                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" 
                                        value={loanForm.bookId} 
                                        onChange={e => setLoanForm({...loanForm, bookId: e.target.value})}
                                    >
                                        <option value="">-- Selecione --</option>
                                        {books.filter(b => b.availableQuantity > 0).map(b => (
                                            <option key={b.id} value={b.id}>{b.title} (Disp: {b.availableQuantity})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Devolução Prevista</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none focus:border-red-500" 
                                        value={loanForm.dueDate} 
                                        onChange={e => setLoanForm({...loanForm, dueDate: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button onClick={handleCreateLoan}><Save size={16} className="mr-2"/> Confirmar Empréstimo</Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
