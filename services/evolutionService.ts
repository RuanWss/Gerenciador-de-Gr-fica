
const API_URL = 'https://api.evolution-api.com'; // O usuário deve trocar pela sua URL
const API_KEY = 'sua_global_api_key'; // O usuário deve trocar pela sua Key

export const evolutionService = {
    async getInstanceStatus(instanceName: string) {
        try {
            const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
                headers: { 'apikey': API_KEY }
            });
            return await response.json();
        } catch (e) {
            return { instance: { state: 'disconnected' } };
        }
    },

    async connectInstance(instanceName: string) {
        try {
            const response = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': API_KEY }
            });
            return await response.json();
        } catch (e) {
            return null;
        }
    },

    async logoutInstance(instanceName: string) {
        try {
            await fetch(`${API_URL}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': API_KEY }
            });
        } catch (e) {}
    },

    async sendMessage(instanceName: string, number: string, text: string) {
        const cleanNumber = number.replace(/\D/g, '');
        try {
            const response = await fetch(`${API_URL}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: { 
                    'apikey': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: cleanNumber,
                    options: { delay: 1200, presence: 'composing' },
                    textMessage: { text }
                })
            });
            return await response.json();
        } catch (e) {
            return { error: true };
        }
    }
};
