
import { GoogleGenAI, Type } from "@google/genai";

// Initialize GoogleGenAI once with the API Key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStructuredQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 1
) => {
  try {
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

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Falha ao gerar questões com IA.");
  }
};

export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const prompt = `Escreva instruções curtas e formais para o cabeçalho de uma prova escolar do tipo: "${examType}".`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
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

export const analyzeAnswerSheet = async (file: File, numQuestions: number): Promise<{ studentId?: string; answers: Record<number, string> }> => {
  try {
    const base64Data = await fileToBase64(file);
    
    const prompt = `
      Você é um sistema de OMR (Optical Mark Recognition) de alta precisão.
      Analise a imagem deste cartão-resposta escolar.
      
      INSTRUÇÕES:
      1. Localize o QR Code no topo para identificar o Aluno/ID se possível (leia o texto próximo ou o conteúdo do código).
      2. Identifique as marcas preenchidas para cada uma das ${numQuestions} questões.
      3. Se uma questão não tiver marcação clara, retorne "" (vazio).
      4. Retorne APENAS um objeto JSON com:
         - "studentId": string com o ID do aluno se identificado no QR Code ou cabeçalho.
         - "answers": objeto onde a chave é o número da questão (1 a ${numQuestions}) e o valor é a letra (A, B, C, D ou E).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } }, 
          { text: prompt }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentId: { type: Type.STRING },
            answers: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.STRING }
            }
          }
        },
        temperature: 0.1
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
        studentId: result.studentId,
        answers: result.answers || {}
    };
  } catch (error) {
    console.error("Erro no processamento OMR:", error);
    return { answers: {} };
  }
};
