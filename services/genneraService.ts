
import { Student, SchoolClass } from '../types';

const BASE_URL = 'https://api2.gennera.com.br/api/v1';

/**
 * Nota: Integrações reais com a Gennera exigem um Token de Acesso (X-Api-Key).
 * Este serviço está estruturado para receber esse token via configuração.
 */

export const fetchGenneraClasses = async (token: string): Promise<SchoolClass[]> => {
  try {
    const response = await fetch(`${BASE_URL}/unidades-letivas/turmas`, {
      headers: { 'X-Api-Key': token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Falha ao buscar turmas na Gennera');
    const data = await response.json();
    
    // Mapeamento simplificado do retorno da API Gennera para o nosso padrão
    return data.map((t: any) => ({
      id: t.id,
      name: t.sigla || t.nome,
      shift: t.turno?.toLowerCase().includes('manhã') ? 'morning' : 'afternoon'
    }));
  } catch (error) {
    console.error("Erro Gennera API:", error);
    return [];
  }
};

export const fetchGenneraStudentsByClass = async (token: string, classId: string, className: string): Promise<Student[]> => {
  try {
    const response = await fetch(`${BASE_URL}/turmas/${classId}/alunos`, {
      headers: { 'X-Api-Key': token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Falha ao buscar alunos na Gennera');
    const data = await response.json();

    return data.map((a: any) => ({
      id: String(a.id_matricula || a.id),
      name: a.nome_pessoa || a.nome,
      classId: classId,
      className: className,
      photoUrl: a.url_foto || ''
    }));
  } catch (error) {
    console.error("Erro Gennera API (Alunos):", error);
    return [];
  }
};
