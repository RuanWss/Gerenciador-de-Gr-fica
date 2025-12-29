
import { Student, SchoolClass } from '../types';

const BASE_URL = 'https://api2.gennera.com.br/api/v1';
const INSTITUTION_ID = '891';
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJuYW1lIjoiVXN1w6FyaW8gSW50ZWdyYcOnw6NvIiwidXNlcm5hbWUiOiJFcm1aQUlFMmdzbHdYTVc1M3VwR3lXanpJRnF6ZUJQUURORWtNVnNWIiwiaGFzaCI6InY3eUY2dDB0Ynl0MW9xVXFmZ0hYYWd5SURTMzNENU9ueElNRTJRVUMiLCJpZFVzZXIiOjE0NTU4NzQxLCJpZENvdW50cnkiOjMyLCJpZExhbmd1YWdlIjoyLCJsYW5ndWFnZUNvZGUiOiJwdCIsImlkVGltZXpvbmUiOjg5LCJpZEN1c3RvbWVyIjoxNzgyLCJpZElzc3VlclVzZXIiOjUyMzA2LCJtb2RlIjoicHJvZCIsImlhdCI6MTc2NjUwNTU1NCwiaXNzIjoiaHR0cHM6Ly9hcHBzLmdlbm5lcmEuY29tLmJyIiwic3ViIjoiRXJtWkFJRTJnc2x3WE1XNTN1cEd5V2p6SUZxemVCUFFETkVrTVZzViJ9.ewJW1lBafxoswb8oKcwl66_47QA3ZFASEJJjfOWIPV74bMsjMGW2YSqbzVSDDA8DOKUSETWAx48dk1GPNCAyRb9t0XqkW-nJCY6nz6K2hVKCtYrh-09CoN4Eum_Ew0rqYB3Fn1OuMuTW3LV7_Jg8asOw7r_cGUNnFDNJvH2PDgdk6IujrNk6o19PuDeJu5tScQtC3r6DKqmzNHVZzaBd55b5Ig43mbld2m95J2AtqW-ecqC666xlsYSqfArMICMvhh1hAeLnJfR8os4UQz6sozlei5p46cDXIjoNmRuKKHuS2OZz-YYbk0KlONbRd7QwVHT14Rw7UKmSnvIQR4vmjyU4zgS71LGXpS5tXydLQPNCtFITKdeR4mOFtLa1RSDJby9qEl1vsBWxB5fa_vx-wN3a3eaPV2wxhZPq5kuWELX8yCZjH7D6Se26oGGxrjiIAwixP8Q_jtijdFmZvf57dx_nccoalo9hRDWaHPqkt1kGVNSqf3-X0jjdVtQvWtX0hFWyETZM0JeuRRNoE_K0A4YskDEAb5i9NJMEIbtk5FD57n6YE7TxZJzB2-9MHamslz7Jns-cf6vpgp95W-o219ANOkxv6Q-vekF5ZWkBA5Hj5qsu3_505HrR04-JxZnYQdEm1G8lbZ8yrS7neZ0Wzy2_3fGwM6723Kri3zggTC4';

const getHeaders = () => {
  return {
    'X-Api-Key': API_TOKEN,
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

/**
 * Função utilitária para fetch com tratamento de erro detalhado
 */
async function genneraRequest(endpoint: string) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[Gennera Sync] Requisitando: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      mode: 'cors' // Tenta modo CORS
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Token expirado ou sem permissão (401/403).");
    }

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error(`[Gennera Sync] Erro HTTP ${response.status}:`, errorDetail);
      throw new Error(`Erro no servidor Gennera: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      console.error("[Gennera Sync] Erro de CORS detectado. O servidor Gennera bloqueou o acesso do navegador.");
      throw new Error("Bloqueio de segurança do navegador (CORS). Contate o suporte Gennera para liberar seu domínio.");
    }
    throw error;
  }
}

export const fetchGenneraClasses = async (): Promise<SchoolClass[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/unidades-letivas/turmas`);
    
    // Mapeia diferentes estruturas possíveis de retorno
    const list = Array.isArray(data) ? data : (data.lista || data.data || data.result || []);
    
    return list.map((t: any) => ({
      id: String(t.id || t.idTurma || t.codigo || t.id_turma),
      name: String(t.sigla || t.nome || t.descricao || `Turma ${t.id}`).toUpperCase(),
      shift: (t.turno || t.idTurno || '').toString().toLowerCase().includes('manhã') ? 'morning' : 'afternoon'
    }));
  } catch (error: any) {
    console.error("[Gennera Sync] Falha ao buscar turmas:", error.message);
    throw error;
  }
};

export const fetchGenneraStudentsByClass = async (classId: string, className: string): Promise<Student[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/turmas/${classId}/alunos`);
    
    const list = Array.isArray(data) ? data : (data.lista || data.data || data.result || []);

    return list.map((a: any) => ({
      id: String(a.id_matricula || a.id_aluno || a.id || a.codigoMatricula || a.id_pessoa),
      name: String(a.nome_pessoa || a.nome_aluno || a.nome || a.nomePessoa || "Aluno sem nome").trim(),
      classId: String(classId),
      className: String(className),
      photoUrl: a.url_foto || a.foto || a.linkFoto || a.urlFoto || ''
    }));
  } catch (error) {
    console.warn(`[Gennera Sync] Não foi possível carregar alunos da turma ${className}`);
    return [];
  }
};
