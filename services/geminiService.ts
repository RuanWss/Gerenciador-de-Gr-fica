import { GoogleGenAI, SchemaType } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper para converter File para Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        if ((encoded.length % 4) > 0) {
            encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateExamQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 3
): Promise<string> => {
  try {
    const ai = getClient();
    
    const prompt = `Crie ${quantity} questões de múltipla escolha sobre o tema "${topic}" para alunos do nível escolar: "${gradeLevel}". 
    Inclua a pergunta, 4 opções (A, B, C, D) e a resposta correta no final.
    Formate a saída como um texto claro e formatado em Markdown, pronto para copiar e colar em um documento Word.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    });

    return response.text || "Não foi possível gerar as questões.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Falha ao conectar com a IA. Verifique sua chave de API.");
  }
};

export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const ai = getClient();
        const prompt = `Escreva instruções formais e claras para o cabeçalho de uma prova escolar do tipo: "${examType}". 
        Inclua orientações sobre uso de caneta, rasuras e tempo de duração. Mantenha curto (max 3 parágrafos).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text || "";
    } catch (error) {
        console.error("Gemini Error", error);
        return "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    }
}

export const correctExamWithAI = async (
    imageFile: File, 
    officialKey: Record<number, string>, 
    numQuestions: number
): Promise<{ studentName: string; answers: Record<number, string>; hits: number[]; score: number }> => {
    try {
        const ai = getClient();
        const base64Image = await fileToBase64(imageFile);

        const prompt = `
        Aja como um sistema de Leitura Óptica (OMR).
        1. Analise a imagem deste cartão resposta.
        2. Tente ler o "Nome do Participante" escrito à mão no cabeçalho. Se não conseguir ler, retorne "Aluno Identificado via ID".
        3. Identifique quais alternativas (A, B, C, D, E) foram marcadas para cada questão de 1 a ${numQuestions}.
        4. Compare com o Gabarito Oficial fornecido abaixo:
        ${JSON.stringify(officialKey)}
        
        5. Retorne APENAS um JSON válido com esta estrutura exata, sem markdown:
        {
            "studentName": "Nome Lido",
            "answers": { "1": "A", "2": "C" }, // As respostas que o aluno marcou
            "hits": [1, 3, 5] // Apenas os números das questões que ele acertou
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Usando Flash para ser rápido, ou Pro se precisar de mais precisão em caligrafia
            contents: [
                {
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Image
                    }
                },
                { text: prompt }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const result = JSON.parse(text);

        // Calcular Score (Nota de 0 a 10)
        const hitCount = result.hits ? result.hits.length : 0;
        const score = (hitCount / numQuestions) * 10;

        return {
            studentName: result.studentName || "Aluno Desconhecido",
            answers: result.answers || {},
            hits: result.hits || [],
            score: score
        };

    } catch (error) {
        console.error("Erro na correção com IA:", error);
        throw new Error("Falha ao processar imagem da prova.");
    }
};