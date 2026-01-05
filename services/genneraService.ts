
import { Student, SchoolClass } from '../types';

// Gateway configurado para contornar CORS e injetar autenticação se necessário
const CLOUD_RUN_GATEWAY = 'https://gerenciador-de-gr-fica-376976972882.europe-west1.run.app'; 
const BASE_URL = 'https://api2.gennera.com.br/api/v1';
const INSTITUTION_ID = '891';
// IMPORTANTE: Este token deve ser renovado periodicamente seguindo as regras da Gennera
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJuYW1lIjoiVXN1w6FyaW8gSW50ZWdyYcOnw6NvIiwidXNlcm5hbWUiOiJFcm1aQUlFMmdzbHdYTVc1M3VwR3lXanpJRnF6ZUJQUURORWtNVnNWIiwiaGFzaCI6InY3eUY2dDB0Ynl0MW9xVXFmZ0hYYWd5SURTMzNENU9ueElNRTJRVUMiLCJpZFVzZXIiOjE0NTU4NzQxLCJpZENvdW50cnkiOjMyLCJpZExhbmd1YWdlIjoyLCJsYW5ndWFnZUNvZGUiOiJwdCIsImlkVGltZXpvbmUiOjg5LCJpZEN1c3RvbWVyIjoxNzgyLCJpZElzc3VlclVzZXIiOjUyMzA2LCJtb2RlIjoicHJvZCIsImlhdCI6MTc2NjUwNTU1NCwiaXNzIjoiaHR0cHM6Ly9hcHBzLmdlbm5lcmEuY29tLmJyIiwic3ViIjoiRXJtWkFJRTJnc2x3WE1XNTN1cEd5V2p6SUZxemVCUFFETkVrTVZzViJ9.ewJW1lBafxoswb8oKcwl66_47QA3ZFASEJJjfOWIPV74bMsjMGW2YSqbzVSDDA8DOKUSETWAx48dk1GPNCAyRb9t0XqkW-nJCY6nz6K2hVKCtYrh-09CoN4Eum_Ew0rqYB3Fn1OuMuTW3LV7_Jg8asOw7r_cGUNnFDNJvH2PDgdk6IujrNk6o19PuDeJu5tScQtC3r6DKqmzNHVZzaBd55b5Ig43mbld2m95J2AtqW-ecqC666xlsYSqfArMICMvhh1hAeLnJfR8os4UQz6sozlei5p46cDXIjoNmRuKKHuS2OZz-YYbk0KlONbRd7QwVHT14Rw7UKmSnvIQR4vmjyU4zgS71LGXpS5tXydLQPNCtFITKdeR4mOFtLa1RSDJby9qEl1vsBWxB5fa_vx-wN3a3eaPV2wxhZPq5kuWELX8yCZjH7D6Se26oGGxrjiIAwixP8Q_jtijdFmZvf57dx_nccoalo9hRDWaHPqkt1kGVNSqf3-X0jjdVtQvWtX0hFWyETZM0JeuRRNoE_K0A4YskDEAb5i9NJMEIbtk5FD57n6YE7TxZJzB2-9MHamslz7Jns-cf6vpgp95W-o219ANOkxv6Q-vekF5ZWkBA5Hj5qsu3_505HrR04-JxZnYQdEm1G8lbZ8yrS7neZ0Wzy2_3fGwM6723Kri3zggTC4';

async function genneraRequest(endpoint: string) {
  const targetUrl = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(CLOUD_RUN_GATEWAY, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Url': targetUrl,
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ 
        url: targetUrl,
        method: 'GET'
      })
    });

    if (!response.ok) {
        // Log para depuração em caso de erro 4xx ou 5xx do Gateway
        const errorText = await response.text();
        console.error(`Erro no Gateway (${response.status}):`, errorText);
        throw new Error(`Falha na comunicação com o servidor de integração (${response.status})`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro na requisição Gennera:", error);
    throw error;
  }
}

export const fetchGenneraClasses = async (): Promise<SchoolClass[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/unidades-letivas/turmas`);
    // A API da Gennera pode retornar em diferentes campos dependendo da versão
    const list = data.data || data.lista || data.items || (Array.isArray(data) ? data : []);
    
    if (!Array.isArray(list)) {
        console.error("Formato de resposta inesperado para turmas:", data);
        return [];
    }

    return list.map((t: any) => ({
      id: String(t.id || t.idTurma),
      name: String(t.sigla || t.nome || t.descricao).toUpperCase(),
      shift: String(t.turno || '').toLowerCase().includes('manhã') ? 'morning' : 'afternoon'
    }));
  } catch (e) {
    console.error("Erro ao buscar turmas:", e);
    throw e;
  }
};

export const fetchGenneraStudentsByClass = async (classId: string, className: string): Promise<Student[]> => {
  try {
    const data = await genneraRequest(`/institutions/${INSTITUTION_ID}/turmas/${classId}/alunos`);
    const list = data.data || data.lista || data.items || (Array.isArray(data) ? data : []);

    if (!Array.isArray(list)) {
        console.error(`Formato inesperado para alunos da turma ${className}:`, data);
        return [];
    }

    return list.map((a: any) => ({
      id: String(a.id_matricula || a.id_aluno || a.id),
      name: String(a.nome_pessoa || a.nome || a.nomeAlunno).toUpperCase(),
      classId,
      className,
      photoUrl: a.url_foto || a.foto || ''
    }));
  } catch (e) {
    console.error(`Erro ao buscar alunos da turma ${className}:`, e);
    return []; // Retorna vazio para não travar a sincronização total
  }
};
