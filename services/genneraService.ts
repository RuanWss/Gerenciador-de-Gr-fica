
import { Student, SchoolClass } from '../types';

/**
 * Gateway Proxy (BFF) configurado no server.js
 */
const BASE_URL = '/gennera-api';
const INSTITUTION_ID = '891';

// Token de API Gennera
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJuYW1lIjoiVXN1w6FyaW8gSW50ZWdyYcOnw6NvIiwidXNlcm5hbWUiOiJFcm1aQUlFMmdzbHdYTVc1M3VwR3lXanpJRnF6ZUJQUURORWtNVnNWIiwiaGFzaCI6InY3eUY2dDB0Ynl0MW9xVXFmZ0hYYWd5SURTMzNENU9ueElNRTJRVUMiLCJpZFVzZXIiOjE0NTU4NzQxLCJpZENvdW50cnkiOjMyLCJpZExhbmd1YWdlIjoyLCJsYW5ndWFnZUNvZGUiOiJwdCIsImlkVGltZXpvbmUiOjg5LCJpZEN1c3RvbWVyIjoxNzgyLCJpZElzc3VlclVzZXIiOjUyMzA2LCJtb2RlIjoicHJvZCIsImlhdCI6MTc2NjUwNTU1NCwiaXNzIjoiaHR0cHM6Ly9hcHBzLmdlbm5lcmEuY29tLmJyIiwic3ViIjoiRXJtWkFJRTJnc2x3WE1XNTN1cEd5V2p6SUZxemVCUFFETkVrTVZzViJ9.ewJW1lBafxoswb8oKcwl66_47QA3ZFASEJJjfOWIPV74bMsjMGW2YSqbzVSDDA8DOKUSETWAx48dk1GPNCAyRb9t0XqkW-nJCY6nz6K2hVKCtYrh-09CoN4Eum_Ew0rqYB3Fn1OuMuTW3LV7_Jg8asOw7r_cGUNnFDNJvH2PDgdk6IujrNk6o19PuDeJu5tScQtC3r6DKqmzNHVZzaBd55b5Ig43mbld2m95J2AtqW-ecqC666xlsYSqfArMICMvhh1hAeLnJfR8os4UQz6sozlei5p46cDXIjoNmRuKKHuS2OZz-YYbk0KlONbRd7QwVHT14Rw7UKmSnvIQR4vmjyU4zgS71LGXpS5tXydLQPNCtFITKdeR4mOFtLa1RSDJby9qEl1vsBWxB5fa_vx-wN3a3eaPV2wxhZPq5kuWELX8yCZjH7D6Se26oGGxrjiIAwixP8Q_jtijdFmZvf57dx_nccoalo9hRDWaHPqkt1kGVNSqf3-X0jjdVtQvWtX0hFWyETZM0JeuRRNoE_K0A4YskDEAb5i9NJMEIbtk5FD57n6YE7TxZJzB2-9MHamslz7Jns-cf6vpgp95W-o219ANOkxv6Q-vekF5ZWkBA5Hj5qsu3_505HrR04-JxZnYQdEm1G8lbZ8yrS7neZ0Wzy2_3fGwM6723Kri3zggTC4';

async function genneraRequest(endpoint: string) {
  // Garante que o path comece com barra única
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${path}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });

    if (!response.ok) {
        console.error(`Gennera API Error: ${response.status} em ${path}`);
        // Se der 404, lançamos um erro descritivo para o UI
        if (response.status === 404) throw new Error("Endpoint não encontrado (404). Verifique as rotas da API Gennera.");
        throw new Error(`Erro ${response.status} na API Gennera`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Erro Gennera Service:", error.message);
    throw error;
  }
}

/**
 * Retorna as turmas.
 * Algumas implementações da v1 Gennera usam /institutions/:id/classes 
 * outras usam apenas /classes com filtro.
 */
export const fetchGenneraClasses = async (): Promise<SchoolClass[]> => {
  // Tentativa no endpoint padrão de turmas por instituição
  const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/classes`);
  
  const list = data.data || data.lista || data.items || (Array.isArray(data) ? data : []);
  
  if (!Array.isArray(list)) return [];

  return list.map((t: any) => ({
    id: String(t.id || t.idClass || t.idTurma),
    name: String(t.name || t.description || t.sigla || 'TURMA SEM NOME').toUpperCase(),
    shift: String(t.shift || t.turno || '').toLowerCase().includes('manhã') ? 'morning' : 'afternoon'
  }));
};

/**
 * Retorna os alunos de uma turma.
 * Rota informada pelo usuário: /institutions/:idInstitution/classes/:idClass/students
 */
export const fetchGenneraStudentsByClass = async (classId: string, className: string): Promise<Student[]> => {
  const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/classes/${classId}/students`);
  
  const list = data.data || data.lista || data.items || (Array.isArray(data) ? data : []);

  if (!Array.isArray(list)) return [];

  return list.map((a: any) => ({
    id: String(a.id || a.id_matricula || a.id_aluno || a.studentId),
    name: String(a.studentName || a.nome || a.nome_pessoa || a.name).toUpperCase(),
    classId,
    className,
    photoUrl: a.photoUrl || a.url_foto || a.foto || ''
  }));
}
