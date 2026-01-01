
// Use a URL do seu serviço que aparece no topo do painel do Cloud Run
const PROXY_URL = 'https://cors-proxy-376976972882.europe-west1.run.app';

async function proxiedRequest(targetUrl: string, method: string, apiKey: string, body?: any) {
    const fullUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const response = await fetch(fullUrl, {
            method: method,
            headers: { 
                'apikey': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        // Se o proxy retornar erro de inicialização (504 ou 503), tratamos aqui
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Erro desconhecido");
            console.error(`Erro no Proxy (${response.status}):`, errorText);
            return { error: true, status: response.status, message: "O Proxy não respondeu corretamente. Verifique o Cloud Run." };
        }

        return await response.json();
    } catch (e: any) {
        console.error("Falha na conexão com o Proxy:", e);
        return { error: true, message: "Não foi possível conectar ao Proxy. Verifique se o serviço está ativo." };
    }
}

export const evolutionService = {
    async getInstanceStatus(baseUrl: string, apiKey: string, instanceName: string) {
        const url = `${baseUrl}/instance/connectionState/${instanceName}`;
        return await proxiedRequest(url, 'GET', apiKey);
    },

    async sendMessage(baseUrl: string, apiKey: string, instanceName: string, number: string, text: string) {
        const url = `${baseUrl}/message/sendText/${instanceName}`;
        const cleanNumber = number.replace(/\D/g, '');
        
        const payload = {
            number: cleanNumber,
            options: { 
                delay: 1200, 
                presence: 'composing',
                linkPreview: true
            },
            textMessage: { text }
        };
        return await proxiedRequest(url, 'POST', apiKey, payload);
    }
};
