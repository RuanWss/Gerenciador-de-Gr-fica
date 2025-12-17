
import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

export const analyzeAnswerSheet = async (file: File, numQuestions: number): Promise<Record<number, string>> => {
  try {
    const ai = getClient();
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const prompt = `Analise a imagem deste cartão resposta escolar. 
    Identifique as alternativas marcadas pelo aluno para cada uma das ${numQuestions} questões.
    Geralmente as marcações são círculos pintados (bolinhas).
    Retorne as respostas em formato JSON mapeando o número da questão para a letra marcada (A, B, C, D ou E).
    Exemplo de saída: {"1": "A", "2": "C", ...}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Mapeamento de questões para respostas marcadas"
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Falha ao analisar o cartão resposta. Verifique a qualidade da imagem.");
  }
};

export const generateExamQuestions = async (topic: string, gradeLevel: string, quantity: number = 3): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Crie ${quantity} questões de múltipla escolha sobre "${topic}" para "${gradeLevel}". Retorne em Markdown.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Não foi possível gerar as questões.";
  } catch (error) {
    throw new Error("Falha ao conectar com a IA.");
  }
};

export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const ai = getClient();
        const prompt = `Instruções para prova do tipo "${examType}". Max 3 parágrafos.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "";
    } catch (error) { return "Leia com atenção."; }
}

export const digitizeMaterial = async (file: File, type: 'exam' | 'handout'): Promise<string> => {
    try {
        const ai = getClient();
        const base64Data = await fileToBase64(file);
        const mimeType = file.type;
        const prompt = type === 'exam' ? `Extraia texto de prova em HTML limpo.` : `Extraia texto de apostila em HTML limpo.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }
        });
        return (response.text || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (error) { throw new Error("Erro na digitalização."); }
};
