
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
      model: 'gemini-2.0-flash-lite-preview-02-05',
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
            model: 'gemini-2.0-flash-lite-preview-02-05',
            contents: prompt
        });
        // Access the text property directly on the response object
        return response.text || "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    } catch (error) {
        return "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    }
}

// Function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = result.split(',')[1];
        resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

export const analyzeAnswerSheet = async (imageFile: File, numQuestions: number) => {
    try {
        const ai = getAiClient();
        const base64Image = await fileToBase64(imageFile);

        const prompt = `
            Analise esta imagem de um cartão resposta ou prova de aluno.
            1. Identifique o nome do aluno se estiver escrito (campo 'studentName'). Se não encontrar, retorne string vazia.
            2. Identifique as respostas marcadas para as questões de 1 a ${numQuestions}.
            3. Retorne um JSON onde 'answers' é um objeto com o número da questão como chave e a letra (A, B, C, D, E) como valor.
            4. Se uma questão não estiver marcada ou estiver rasurada, use "X" como valor.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite-preview-02-05',
            contents: {
                parts: [
                    { inlineData: { mimeType: imageFile.type, data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        studentName: { type: Type.STRING },
                        answers: { 
                            type: Type.OBJECT,
                            description: "Map of question number to selected option (A-E)",
                            nullable: true
                        }
                    }
                }
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Error analyzing answer sheet:", error);
        throw new Error("Falha ao analisar o gabarito.");
    }
};
