import React, { useState, useEffect, useRef, useMemo } from 'react';
import { listenToClassMaterials } from '../services/firebaseService';
import { ClassMaterial } from '../types';
import { useAuth } from '../context/AuthContext';
import { CLASSES, EFAF_SUBJECTS, EM_SUBJECTS } from '../constants';
import { 
    Folder, Download, FileText, Image as ImageIcon, 
    AlertTriangle, ArrowLeft, LogOut, Search, 
    LayoutGrid, FolderOpen, Lock, LogIn, ChevronRight
} from 'lucide-react';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const ACCESS_PIN = '020116';
const CLASSROOM_USER_EMAIL = 'cemal.salas@ceprofmal.com';
const CLASSROOM_USER_PASS = 'cemal#2016';

export const ClassroomFiles: React.FC = () => {
    const { user, login, logout } = useAuth();
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const availableClasses = useMemo(() => CLASSES, []);

    const currentSubjectsList = useMemo(() => {
        if (!selectedClassName) return [];
        if (selectedClassName.includes('SÉRIE') || selectedClassName.includes('EM')) return EM_SUBJECTS;
        if (selectedClassName.includes('EFAF')) return EFAF_SUBJECTS;
        return [
            "GERAL", "LÍNGUA PORTUGUESA", "MATEMÁTICA", "HISTÓRIA", "GEOGRAFIA", 
            "CIÊNCIAS", "ARTE", "INGLÊS", "EDUCAÇÃO FÍSICA", "ENSINO RELIGIOSO", 
            "PROJETOS", "AVALIAÇÕES"
        ];
    }, [selectedClassName]);

    // Função inteligente para determinar a categoria (Pasta) do arquivo
    // 1. Normaliza espaços e maiúsculas.
    // 2. Se não tiver assunto (ou for GERAL), tenta extrair do nome do professor (ex: "Fulano - História").
    const getFileCategory = (file: ClassMaterial) => {
        let subject = file.subject;

        // Normalização inicial
        if (subject) subject = subject.trim().toUpperCase();

        // Lógica de recuperação de categoria para arquivos legados
        if (!subject || subject === 'GERAL' || subject === '') {
            if (file.teacherName) {
                // Tenta extrair do nome do professor (ex: "João - Matemática")
                // Adicionado mais separadores e lógica de limpeza
                const separators = [' - ', ' – ', ': ', ' | ', ' • ', ' / '];
                for (const sep of separators) {
                    if (file.teacherName.includes(sep)) {
                        const parts = file.teacherName.split(sep);
                        if (parts.length > 1) {
                            // Assume que a última parte é a disciplina
                            const potentialSubject = parts[parts.length - 1].trim();
                            // Validação básica para evitar pegar sobrenomes compostos errados se não for um separador claro
                            if (potentialSubject.length > 2) {
                                subject = potentialSubject.toUpperCase();
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!subject || !subject.trim()) return 'GERAL';
        return subject;
    };

    const displaySubjects = useMemo(() => {
        // Coleta todas as categorias calculadas dos arquivos atuais
        const materialSubjects = new Set(materials.map(m => getFileCategory(m)));
        
        // Adiciona as disciplinas padrão da turma (normalizadas)
        const defaultSubjects = new Set(currentSubjectsList.map(s => s.trim().toUpperCase()));
        
        // Une tudo e ordena. Isso garante que se um arquivo tiver uma disciplina "Exótica",
        // uma pasta será criada automaticamente para ele.
        return Array.from(new Set([...defaultSubjects, ...materialSubjects])).sort();
    }, [materials, currentSubjectsList]);

    useEffect(() => {
        const savedClass = localStorage.getItem('classroom_selected_class');
        if (savedClass && availableClasses.includes(savedClass)) {
            setSelectedClassName(savedClass);
        }
    }, [availableClasses]);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
        }
    };

    const verifyPin = async (finalPin: string) => {
        if (finalPin === ACCESS_PIN) {
            setIsAuthenticating(true);
            const success = await login(CLASSROOM_USER_EMAIL, CLASSROOM_USER_PASS);
            if (!success)