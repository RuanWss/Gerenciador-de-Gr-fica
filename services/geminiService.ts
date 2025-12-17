import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper para converter File em Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:image/png;base64, para enviar apenas os bytes
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
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
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt }
                ]
            }
        });

        // Limpar blocos de código markdown se a IA retornar ```html ... ```
        let text = response.text || "";
        text = text.replace(/```html/g, '').replace(/```/g, '');
        return text;

    } catch (error) {
        console.error("Erro na diagramação com IA:", error);
        throw new Error("Não foi possível processar o arquivo. Certifique-se de que é uma imagem legível.");
    }
};