import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateExamQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 3
): Promise<string> => {
  try {
    const ai = getClient();
    
    // We want a structured JSON response to easily display or copy
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
