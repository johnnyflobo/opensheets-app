
// Mapeamento de categorias padrão fornecidas pelo usuário
// ID -> Nome e Keywords
export const SYSTEM_CATEGORIES = {
  "5efeaafb-b096-4a0c-a573-cf25e06c785d": { name: "Alimentação", keywords: ["comida", "almoço", "jantar", "lanche", "restaurante", "padaria", "ifood"] },
  "7ed4ca94-c240-4b79-9a86-5ca359432c1c": { name: "Aluguel recebido", keywords: [] },
  "81e447a7-a2ae-489b-9bf9-03f06de6f648": { name: "Assinaturas", keywords: ["netflix", "amazon", "spotify", "internet"] },
  "6cf64a01-c3b6-429d-b571-c53642298013": { name: "Compras", keywords: ["shopping", "loja"] },
  "28f66409-c4e1-405a-809b-b04f7bc90c5d": { name: "Delivery", keywords: ["entrega"] },
  "67281993-403c-433b-bb31-5bb2861e1f55": { name: "Educação", keywords: ["curso", "faculdade", "livro"] },
  "599563ce-32f2-4ffa-890d-2f728d31c491": { name: "Energia e água", keywords: ["luz", "conta", "embasa", "coelba"] },
  "e7d639b2-2860-4663-92ce-e0c8ad043cd4": { name: "Freelance", keywords: ["freela", "job"] },
  "050e10ea-c38a-4b09-96d1-45346ba437e0": { name: "Internet", keywords: ["wifi", "vivo", "tim", "claro"] },
  "df832c6d-42a4-45dc-a31c-5728c86f401a": { name: "Investimentos", keywords: ["aplicação", "rendimento"] },
  "95e70883-b82f-434b-ad2d-f499e3ce2545": { name: "Lazer", keywords: ["cinema", "jogo", "game", "lazer"] },
  "ca30b910-d456-44d0-839d-85cb20f524be": { name: "Mercado", keywords: ["supermercado", "feira", "assai", "carrefour"] },
  "045da7f5-6033-4f71-8b13-c1b482a94282": { name: "Moradia", keywords: ["aluguel", "condominio"] },
  "e8d94b41-0f0a-457b-836e-95af70aaac1a": { name: "Outras despesas", keywords: ["outros"] },
  "2f761fe5-67a2-4245-acce-bc53cc3d97fb": { name: "Outras receitas", keywords: [] },
  "5c49079b-38ad-4e94-b2ec-494dce2e0c12": { name: "Pagamentos", keywords: [] },
  "94328c54-0ac7-4515-b65e-9eb5e9f84af5": { name: "Pets", keywords: ["cachorro", "gato", "ração", "vet"] },
  "cc3d49c5-a32b-4471-93ca-3b2554f6caed": { name: "Prêmios", keywords: [] },
  "80fd79e1-93f7-4cec-90fa-be137d7a1813": { name: "Presentes", keywords: ["presente", "aniversário"] },
  "37888a2c-0356-4a93-8068-f082d1d99bb7": { name: "Reembolso", keywords: [] },
  "24caf242-3ba2-4610-97eb-1743f654630e": { name: "Restaurantes", keywords: ["comer fora"] },
  "1adaad2d-74c7-4e7d-81c7-4f5a82caf090": { name: "Salário", keywords: ["pagamento", "holerite"] },
  "62aed9f5-3b62-41d7-a65a-4bf38e174aa3": { name: "Saldo inicial", keywords: [] },
  "18412eaa-dd63-4b55-943e-6e84c38f52ee": { name: "Saúde", keywords: ["medico", "farmacia", "generico", "remedio"] },
  "3676d2d4-fa91-47f5-8250-9bb272b8e019": { name: "Transferência interna", keywords: [] },
  "c263532e-d9c3-49e8-aedc-3bc624d70705": { name: "Transporte", keywords: ["uber", "taxi", "onibus", "gasolina", "combustivel"] },
  "30770fc7-62d4-4b29-9dc4-63f71eb8173b": { name: "Vendas", keywords: [] },
  "9e35817f-c52e-4de6-9aee-68c28904a9e9": { name: "Vestuário", keywords: ["roupa", "tenis", "camisa"] },
  "a3b5ce75-9000-4001-9bd6-c1875561ad09": { name: "Viagem", keywords: ["viagem", "passagem", "hotel"] }
};

export const CATEGORY_LIST = Object.entries(SYSTEM_CATEGORIES).map(([id, data]) => ({
  id,
  name: data.name
}));
