
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client using named parameter as per guidelines
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the prefix data:image/png;base64, to send only the bytes
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Generates multiple choice questions based on a topic and grade level.
 * Uses gemini-3-pro-preview for complex reasoning and educational content quality.
 */
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
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Não foi possível gerar as questões.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error("Falha ao conectar com a IA. Verifique sua chave de API.");
  }
};

/**
 * Suggests header instructions for school exams.
 */
export const suggestExamInstructions = async (examType: string): Promise<string> => {
    try {
        const ai = getClient();
        const prompt = `Escreva instruções formais e claras para o cabeçalho de uma prova escolar do tipo: "${examType}". 
        Inclua orientações sobre uso de caneta, rasuras e tempo de duração. Mantenha curto (max 3 parágrafos).`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        return response.text || "";
    } catch (error) {
        console.error("Gemini Error", error);
        return "Leia atentamente as questões antes de responder. Utilize caneta azul ou preta.";
    }
}

/**
 * Digitizes physical material (scanned images/PDFs) into structured HTML for document reconstruction.
 */
export const digitizeMaterial = async (file: File, type: 'exam' | 'handout'): Promise<string> => {
    try {
        const ai = getClient();
        const base64Data = await fileToBase64(file);
        const mimeType = file.type;

        const prompt = type === 'exam' 
            ? `Você é um especialista em diagramação de provas escolares. 
               Analise a imagem fornecida, extraia todo o texto e o formate em HTML limpo e semântico (sem tags <html>, <head> ou <body>, apenas o conteúdo).
               
               Regras de Formatação:
               1. Para Questões: Use <div class="mb-6 break-inside-avoid">.
               2. Títulos de Questões: Use <h4 class="font-bold text-sm mb-2 uppercase border-b border-gray-300 pb-1">Questão X</h4> (Identifique a numeração).
               3. Enunciados: Use <p class="text-sm text-gray-800 mb-2 text-justify">.
               4. Alternativas: Use <ul class="space-y-1 pl-1"> e para cada item <li class="text-sm text-gray-700 list-none"><span class="font-bold mr-1">Letra)</span> Texto</li>.
               5. Imagens/Figuras: Se houver figuras no original, insira um placeholder <div class="bg-gray-100 border border-gray-300 rounded p-4 text-center text-xs text-gray-500 my-2">[Figura da Questão]</div> (pois não podemos recriar a imagem, apenas o texto).
               6. Corrija erros óbvios de OCR ou digitação.
               
               Retorne APENAS o código HTML.`
            : `Você é um especialista em diagramação de apostilas escolares.
               Analise a imagem fornecida, extraia o texto e formate em HTML limpo.
               
               Regras:
               1. Títulos: Use <h3 class="font-bold text-lg text-brand-700 mb-3 mt-4">.
               2. Parágrafos: Use <p class="text-sm text-gray-800 mb-3 leading-relaxed text-justify">.
               3. Listas: Use <ul class="list-disc pl-5 mb-3 text-sm">.
               4. Destaques: Use <strong> para negritos.
               
               Retorne APENAS o código HTML.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt }
                ]
            }
        });

        // Clean up markdown markers if returned
        let text = response.text || "";
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        return text;

    } catch (error) {
        console.error("Erro na diagramação com IA:", error);
        throw new Error("Não foi possível processar o arquivo. Certifique-se de que é uma imagem legível.");
    }
};

/**
 * Analyzes an answer sheet image and extracts the student's marks.
 * Required by PrintShopDashboard for auto-correction.
 */
export const analyzeAnswerSheet = async (file: File, numQuestions: number): Promise<Record<number, string>> => {
  try {
    const ai = getClient();
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const prompt = `Analise a imagem deste cartão-resposta de uma prova escolar. 
    Extraia as respostas marcadas pelo aluno para as ${numQuestions} questões.
    O formato da resposta deve ser um objeto JSON onde a chave é o número da questão (de 1 a ${numQuestions}) e o valor é a letra da alternativa marcada (A, B, C, D ou E).
    Se não for possível identificar a resposta de uma questão ou se ela estiver em branco, retorne uma string vazia "" para essa questão.
    Retorne apenas o JSON puro, sem blocos de código Markdown.`;

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
      }
    });

    const text = response.text?.trim() || "{}";
    try {
      // Remove potential markdown code blocks if the model included them despite instructions
      const sanitized = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(sanitized);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", text);
      return {};
    }
  } catch (error) {
    console.error("Error analyzing answer sheet:", error);
    throw new Error("Falha ao analisar o cartão-resposta com IA.");
  }
};
