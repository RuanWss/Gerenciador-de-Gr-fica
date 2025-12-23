
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
    
    // Prompt ultra-específico para simular comportamento de OMR profissional
    const prompt = `
      Você é um sistema de OMR (Optical Mark Recognition) de alta precisão.
      Analise a imagem deste cartão-resposta escolar.
      
      INSTRUÇÕES:
      1. Identifique as marcas (bolinhas ou quadrados preenchidos) para cada uma das ${numQuestions} questões.
      2. Se uma questão não tiver marcação clara, retorne "" (vazio).
      3. Retorne APENAS um objeto JSON onde a chave é o número da questão (1 a ${numQuestions}) e o valor é a letra (A, B, C, D ou E).
      
      EXEMPLO DE SAÍDA:
      { "1": "A", "2": "C", "3": "B" }
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
        temperature: 0.1 // Baixa temperatura para maior precisão factual
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Erro no processamento OMR:", error);
    return {};
  }
};
