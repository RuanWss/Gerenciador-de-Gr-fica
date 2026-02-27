import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the required named parameter and process.env.API_KEY directly
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateStructuredQuestions = async (
  topic: string,
  gradeLevel: string,
  quantity: number = 1
) => {
  try {
    const ai = getAiClient();
    // Updated to gemini-3-flash-preview as per guidelines for basic text tasks
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
        // Updated to gemini-3-flash-preview for text generation
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

        // Updated to gemini-3-flash-preview for multimodal task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: imageFile.type, data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (error) {
        console.error("Error analyzing answer sheet:", error);
        throw new Error("Falha ao analisar o gabarito.");
    }
};

export const analyzeAnswerSheetWithQR = async (imageFile: File, numQuestions: number) => {
    try {
        const ai = getAiClient();
        const base64Image = await fileToBase64(imageFile);

        const prompt = `
            Você é um corretor automático de provas via OCR.
            Analise a imagem enviada, que é um Cartão Resposta.
            
            TAREFA 1: IDENTIFICAÇÃO
            - Localize e DECODIFIQUE o QR CODE presente no cabeçalho.
            - O QR Code contém um JSON (ex: {"e":"examId","s":"studentId"}). 
            - Extraia o valor de 'e' para o campo 'examId' e 's' para o campo 'studentId'.
            - Se não conseguir ler, deixe os campos como null.

            TAREFA 2: RESPOSTAS
            - Identifique as bolhas preenchidas para as questões de 1 a ${numQuestions}.
            - Se a bolha estiver preenchida, retorne a letra (A, B, C, D, E).
            - Se rasurado, duplicado ou em branco, retorne "X".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
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
                        examId: { type: Type.STRING, description: "The exam ID from QR code 'e' field" },
                        studentId: { type: Type.STRING, description: "The student ID from QR code 's' field" },
                        responses: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    q: { type: Type.INTEGER, description: "Question number" },
                                    a: { type: Type.STRING, description: "Answer letter (A-E) or X" }
                                },
                                required: ["q", "a"]
                            }
                        }
                    },
                    required: ["responses"]
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        
        // Transform schema array back to object map for easier consumption
        const answersMap: Record<string, string> = {};
        if (json.responses && Array.isArray(json.responses)) {
            json.responses.forEach((item: any) => {
                answersMap[String(item.q)] = item.a;
            });
        }

        return {
            qrData: { e: json.examId, s: json.studentId },
            answers: answersMap
        };

    } catch (error) {
        console.error("Error analyzing with QR:", error);
        throw new Error("Falha na correção automática.");
    }
};