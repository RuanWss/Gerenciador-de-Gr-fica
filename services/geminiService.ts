
import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

export const generateStructuredQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 1
) => {
  try {
    const ai = getClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie ${quantity} questões de múltipla escolha sobre "${topic}" para o nível "${gradeLevel}". 
      Retorne APENAS um JSON seguindo esta estrutura: 
      [{ "statement": "texto", "options": ["A", "B", "C", "D"], "answer": 0 }]`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Falha ao gerar questões com IA.");
  }
};

export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const ai = getClient();
        const prompt = `Escreva instruções curtas e formais para o cabeçalho de uma prova escolar do tipo: "${examType}".`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "";
    } catch (error) {
        return "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    }
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const analyzeAnswerSheet = async (file: File, numQuestions: number): Promise<Record<number, string>> => {
  try {
    const ai = getClient();
    const base64Data = await fileToBase64(file);
    const prompt = `Analise este cartão-resposta e retorne as letras marcadas (A-E) para ${numQuestions} questões em JSON { "1": "A", "2": "B" }.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: file.type, data: base64Data } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {};
  }
};
