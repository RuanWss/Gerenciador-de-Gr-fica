
import { Student, SchoolClass } from '../types';

const BASE_URL = 'https://api2.gennera.com.br/api/v1';
const INSTITUTION_ID = '891';
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJuYW1lIjoiVXN1w6FyaW8gSW50ZWdyYcOnw6NvIiwidXNlcm5hbWUiOiJFcm1aQUlFMmdzbHdYTVc1M3VwR3lXanpJRnF6ZUJQUURORWtNVnNWIiwiaGFzaCI6InY3eUY2dDB0Ynl0MW9xVXFmZ0hYYWd5SURTMzNENU9ueElNRTJRVUMiLCJpZFVzZXIiOjE0NTU4NzQxLCJpZENvdW50cnkiOjMyLCJpZExhbmd1YWdlIjoyLCJsYW5ndWFnZUNvZGUiOiJwdCIsImlkVGltZXpvbmUiOjg5LCJpZEN1c3RvbWVyIjoxNzgyLCJpZElzc3VlclVzZXIiOjUyMzA2LCJtb2RlIjoicHJvZCIsImlhdCI6MTc2NjUwNTU1NCwiaXNzIjoiaHR0cHM6Ly9hcHBzLmdlbm5lcmEuY29tLmJyIiwic3ViIjoiRXJtWkFJRTJnc2x3WE1XNTN1cEd5V2p6SUZxemVCUFFETkVrTVZzViJ9.ewJW1lBafxoswb8oKcwl66_47QA3ZFASEJJjfOWIPV74bMsjMGW2YSqbzVSDDA8DOKUSETWAx48dk1GPNCAyRb9t0XqkW-nJCY6nz6K2hVKCtYrh-09CoN4Eum_Ew0rqYB3Fn1OuMuTW3LV7_Jg8asOw7r_cGUNnFDNJvH2PDgdk6IujrNk6o19PuDeJu5tScQtC3r6DKqmzNHVZzaBd55b5Ig43mbld2m95J2AtqW-ecqC666xlsYSqfArMICMvhh1hAeLnJfR8os4UQz6sozlei5p46cDXIjoNmRuKKHuS2OZz-YYbk0KlONbRd7QwVHT14Rw7UKmSnvIQR4vmjyU4zgS71LGXpS5tXydLQPNCtFITKdeR4mOFtLa1RSDJby9qEl1vsBWxB5fa_vx-wN3a3eaPV2wxhZPq5kuWELX8yCZjH7D6Se26oGGxrjiIAwixP8Q_jtijdFmZvf57dx_nccoalo9hRDWaHPqkt1kGVNSqf3-X0jjdVtQvWtX0hFWyETZM0JeuRRNoE_K0A4YskDEAb5i9NJMEIbtk5FD57n6YE7TxZJzB2-9MHamslz7Jns-cf6vpgp95W-o219ANOkxv6Q-vekF5ZWkBA5Hj5qsu3_505HrR04-JxZnYQdEm1G8lbZ8yrS7neZ0Wzy2_3fGwM6723Kri3zggTC4';

const getHeaders = () => ({
  'X-Api-Key': API_TOKEN,
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

export const fetchGenneraClasses = async (): Promise<SchoolClass[]> => {
  try {
    const response = await fetch(`${BASE_URL}/institutions/${INSTITUTION_ID}/unidades-letivas/turmas`, {
      headers: getHeaders()
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    // Tenta encontrar a lista de turmas em diferentes caminhos comuns da Gennera
    const classesList = Array.isArray(data) ? data : (data.lista || data.data || data.result || []);

    return classesList.map((t: any) => ({
      id: String(t.id || t.idTurma || t.codigo),
      name: t.sigla || t.nome || t.descricao || `Turma ${t.id}`,
      shift: (t.turno || t.idTurno || '').toString().toLowerCase().includes('manhã') ? 'morning' : 'afternoon'
    }));
  } catch (error) {
    console.error("Erro Gennera (Classes):", error);
    throw error;
  }
};

export const fetchGenneraStudentsByClass = async (classId: string, className: string): Promise<Student[]> => {
  try {
    const response = await fetch(`${BASE_URL}/institutions/${INSTITUTION_ID}/turmas/${classId}/alunos`, {
      headers: getHeaders()
    });

    if (!response.ok) return [];

    const data = await response.json();
    const studentsList = Array.isArray(data) ? data : (data.lista || data.data || data.result || []);

    return studentsList.map((a: any) => ({
      id: String(a.id_matricula || a.id_aluno || a.id || a.codigoMatricula),
      name: a.nome_pessoa || a.nome_aluno || a.nome || "Aluno Sem Nome",
      classId: classId,
      className: className,
      photoUrl: a.url_foto || a.foto || a.linkFoto || ''
    }));
  } catch (error) {
    console.error(`Erro Gennera (Alunos - ${className}):`, error);
    return [];
  }
};
