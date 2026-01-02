
import { Student, SchoolClass } from '../types';

// URL do seu Proxy no Cloud Run
const CORS_PROXY = 'https://cors-proxy-376976972882.europe-west1.run.app';
const BASE_URL = 'https://api2.gennera.com.br/api/v1';
const INSTITUTION_ID = '891';
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJuYW1lIjoiVXN1w6FyaW8gSW50ZWdyYcOnw6NvIiwidXNlcm5hbWUiOiJFcm1aQUlFMmdzbHdYTVc1M3VwR3lXanpJRnF6ZUJQUURORWtNVnNWIiwiaGFzaCI6InY3eUY2dDB0Ynl0MW9xVXFmZ0hYYWd5SURTMzNENU9ueElNRTJRVUMiLCJpZFVzZXIiOjE0NTU4NzQxLCJpZENvdW50cnkiOjMyLCJpZExhbmd1YWdlIjoyLCJsYW5ndWFnZUNvZGUiOiJwdCIsImlkVGltZXpvbmUiOjg5LCJpZEN1c3RvbWVyIjoxNzgyLCJpZElzc3VlclVzZXIiOjUyMzA2LCJtb2RlIjoicHJvZCIsImlhdCI6MTc2NjUwNTU1NCwiaXNzIjoiaHR0cHM6Ly9hcHBzLmdlbm5lcmEuY29tLmJyIiwic3ViIjoiRXJtWkFJRTJnc2x3WE1XNTN1cEd5V2p6SUZxemVCUFFETkVrTVZzViJ9.ewJW1lBafxoswb8oKcwl66_47QA3ZFASEJJjfOWIPV74bMsjMGW2YSqbzVSDDA8DOKUSETWAx48dk1GPNCAyRb9t0XqkW-nJCY6nz6K2hVKCtYrh-09CoN4Eum_Ew0rqYB3Fn1OuMuTW3LV7_Jg8asOw7r_cGUNnFDNJvH2PDgdk6IujrNk6o19PuDeJu5tScQtC3r6DKqmzNHVZzaBd55b5Ig43mbld2m95J2AtqW-ecqC666xlsYSqfArMICMvhh1hAeLnJfR8os4UQz6sozlei5p46cDXIjoNmRuKKHuS2OZz-YYbk0KlONbRd7QwVHT14Rw7UKmSnvIQR4vmjyU4zgS71LGXpS5tXydLQPNCtFITKdeR4mOFtLa1RSDJby9qEl1vsBWxB5fa_vx-wN3a3eaPV2wxhZPq5kuWELX8yCZjH7D6Se26oGGxrjiIAwixP8Q_jtijdFmZvf57dx_nccoalo9hRDWaHPqkt1kGVNSqf3-X0jjdVtQvWtX0hFWyETZM0JeuRRNoE_K0A4YskDEAb5i9NJMEIbtk5FD57n6YE7TxZJzB2-9MHamslz7Jns-cf6vpgp95W-o219ANOkxv6Q-vekF5ZWkBA5Hj5qsu3_505HrR04-JxZnYQdEm1G8lbZ8yrS7neZ0Wzy2_3fGwM6723Kri3zggTC4';

async function genneraRequest(endpoint: string) {
  const targetUrl = `${BASE_URL}${endpoint}`;
  const proxiedUrl = `${CORS_PROXY}?url=${encodeURIComponent(targetUrl)}`;
  
  console.log(`[Gennera] Requisitando: ${targetUrl} via Proxy`);
  
  try {
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gennera] Erro API (${response.status}):`, errorText);
        throw new Error(`Erro API Gennera: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("[Gennera] Erro na requisição:", error);
    throw error;
  }
}

export const fetchGenneraClasses = async (): Promise<SchoolClass[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/unidades-letivas/turmas`);
    console.log("[Gennera] Dados de turmas recebidos:", data);
    
    // Suporte a diferentes formatos de resposta da API
    const list = data?.lista || data?.data || (Array.isArray(data) ? data : []);
    
    if (!Array.isArray(list)) {
        throw new Error("Resposta de turmas não é uma lista válida.");
    }

    // Fix: Explicitly cast the shift property to 'morning' | 'afternoon' to satisfy the SchoolClass interface requirements.
    return list.map((t: any) => ({
      id: String(t.id || t.idTurma || t.codigo || ''),
      name: String(t.sigla || t.nome || t.descricao || 'TURMA SEM NOME').toUpperCase(),
      shift: (String(t.turno || '').toLowerCase().includes('manhã') ? 'morning' : 'afternoon') as 'morning' | 'afternoon'
    })).filter(t => t.id);
  } catch (error: any) {
    throw new Error(`Falha ao buscar turmas Gennera: ${error.message}`);
  }
};

export const fetchGenneraStudentsByClass = async (classId: string, className: string): Promise<Student[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/turmas/${classId}/alunos`);
    console.log(`[Gennera] Alunos da turma ${className} recebidos:`, data);
    
    const list = data?.lista || data?.data || (Array.isArray(data) ? data : []);

    if (!Array.isArray(list)) return [];

    return list.map((a: any) => ({
      id: String(a.id_matricula || a.id_aluno || a.id_pessoa || a.id || ''),
      name: String(a.nome_pessoa || a.nome_aluno || a.nome || 'ALUNO SEM NOME').trim().toUpperCase(),
      classId: String(classId),
      className: String(className),
      photoUrl: a.url_foto || a.foto || a.imagem || ''
    })).filter(a => a.id && a.name);
  } catch (error) {
    console.warn(`[Gennera] Erro ao buscar alunos da turma ${className}:`, error);
    return [];
  }
};
