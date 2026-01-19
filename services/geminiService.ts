
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the required named parameter
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateStructuredQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 1
) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie ${quantity} questões de múltipla escolha sobre "${topic}" para o nível "${gradeLevel}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              statement: {
                type: Type.STRING,
                description: 'The question text.',
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'The multiple choice options.',
              },
              answer: {
                type: Type.INTEGER,
                description: 'The zero-based index of the correct option.',
              },
            },
            required: ["statement", "options", "answer"],
            propertyOrdering: ["statement", "options", "answer"],
          },
        },
      }
    });

    // Access the text property directly on the response object
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Falha ao gerar questões com IA.");
  }
};

export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Escreva instruções curtas e formais para o cabeçalho de uma prova escolar do tipo: "${examType}".`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        // Access the text property directly on the response object
        return response.text || "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    } catch (error) {
        return "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    }
}
