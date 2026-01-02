
// Serviço de WhatsApp (Evolution API) removido conforme solicitação.
export const evolutionService = {
    async getInstanceStatus() { return { error: true, message: "Serviço desativado." }; },
    async sendMessage() { return { error: true, message: "Serviço desativado." }; }
};
