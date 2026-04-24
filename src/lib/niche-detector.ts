/**
 * Niche Detection Engine
 *
 * Classifica o nicho de um site baseado em:
 * 1. Keywords que o site já rankeia
 * 2. Conteúdo da homepage (título, meta, headings)
 * 3. Mapeamento de termos → nichos
 *
 * Não usa IA externa — classificação local por frequência de termos.
 */

// Mapeamento de termos-chave → nicho
const NICHE_TERMS: Record<string, string[]> = {
  "Tecnologia": ["tecnologia", "tech", "software", "hardware", "computador", "notebook", "celular", "smartphone", "gadget", "app", "programação", "código", "developer", "ti", "informática", "digital", "internet", "nuvem", "cloud", "inteligência artificial", "ia", "machine learning"],
  "Saúde": ["saúde", "saude", "médico", "medico", "hospital", "clínica", "clinica", "nutrição", "nutricao", "dieta", "exercício", "exercicio", "fitness", "academia", "bem-estar", "bem estar", "psicologia", "terapia", "medicina", "dentista", "odontologia", "farmácia", "suplemento"],
  "Finanças": ["finanças", "financas", "investimento", "dinheiro", "economia", "banco", "crédito", "credito", "empréstimo", "emprestimo", "bolsa", "ações", "acoes", "cripto", "bitcoin", "renda", "poupança", "cartão", "fintech", "contabilidade"],
  "Educação": ["educação", "educacao", "curso", "escola", "faculdade", "universidade", "ensino", "aprendizado", "professor", "aluno", "estudante", "concurso", "vestibular", "enem", "ead", "online", "certificação"],
  "E-commerce": ["loja", "comprar", "vender", "produto", "preço", "preco", "oferta", "promoção", "promocao", "ecommerce", "e-commerce", "shopify", "marketplace", "varejo", "atacado", "frete", "entrega"],
  "Marketing": ["marketing", "seo", "google", "anúncio", "anuncio", "publicidade", "social media", "instagram", "facebook", "tráfego", "trafego", "leads", "conversão", "conversao", "funil", "copy", "conteúdo", "conteudo", "branding", "marca"],
  "Jurídico": ["advogado", "advocacia", "direito", "lei", "jurídico", "juridico", "tribunal", "processo", "contrato", "trabalhista", "civil", "criminal", "penal", "constitucional", "oab"],
  "Imobiliário": ["imóvel", "imovel", "imobiliária", "imobiliaria", "casa", "apartamento", "terreno", "aluguel", "comprar imóvel", "condomínio", "condominio", "corretor", "construtora"],
  "Alimentação": ["receita", "comida", "culinária", "culinaria", "restaurante", "cozinha", "alimento", "gastronomia", "chef", "bolo", "vegano", "vegetariano", "saudável", "saudavel", "orgânico"],
  "Automotivo": ["carro", "automóvel", "automovel", "veículo", "veiculo", "moto", "mecânica", "mecanica", "peças", "pecas", "oficina", "concessionária", "revisão", "motor", "combustível"],
  "Moda": ["moda", "roupa", "vestuário", "vestuario", "estilo", "fashion", "tendência", "tendencia", "look", "outfit", "sapato", "acessório", "acessorio", "joia", "bolsa", "grife"],
  "Beleza": ["beleza", "cosmético", "cosmetico", "maquiagem", "skincare", "cabelo", "unha", "estética", "estetica", "dermatologia", "tratamento", "creme", "perfume", "salão"],
  "Pets": ["pet", "cachorro", "gato", "animal", "veterinário", "veterinario", "ração", "racao", "petshop", "pet shop", "adestramento", "raça", "raca", "filhote"],
  "Viagem": ["viagem", "turismo", "hotel", "pousada", "passagem", "destino", "aeroporto", "mala", "roteiro", "férias", "ferias", "resort", "cruzeiro", "mochilão"],
  "Esportes": ["esporte", "futebol", "basquete", "vôlei", "volei", "natação", "natacao", "corrida", "treino", "atleta", "campeonato", "time", "jogo", "academia", "crossfit"],
  "Jogos": ["game", "jogo", "gamer", "gaming", "playstation", "xbox", "nintendo", "pc gamer", "esports", "rpg", "fps", "mmorpg", "stream", "twitch"],
  "Infantil": ["criança", "crianca", "bebê", "bebe", "infantil", "kids", "brinquedo", "maternidade", "gestante", "escola infantil", "pediatra", "mamãe"],
  "Agronegócio": ["agro", "agricultura", "pecuária", "pecuaria", "fazenda", "rural", "campo", "plantio", "colheita", "soja", "milho", "gado", "equino", "cavalo", "trator"],
  "Construção": ["construção", "construcao", "obra", "reforma", "pedreiro", "arquitetura", "engenharia", "material de construção", "cimento", "tijolo", "piso", "telhado", "elétrica"],
  "Sustentabilidade": ["sustentável", "sustentavel", "sustentabilidade", "ecológico", "ecologico", "meio ambiente", "reciclagem", "energia solar", "renovável", "verde", "carbono"],
};

// Nichos secundários inferidos por combinação
const NICHE_COMBINATIONS: Record<string, [string, string]> = {
  "Tech Reviews": ["Tecnologia", "E-commerce"],
  "Saúde Digital": ["Saúde", "Tecnologia"],
  "Marketing Digital": ["Marketing", "Tecnologia"],
  "Fitness": ["Saúde", "Esportes"],
  "Agro Tech": ["Agronegócio", "Tecnologia"],
  "Moda Online": ["Moda", "E-commerce"],
};

interface NicheResult {
  primary: string;
  secondary: string | null;
  confidence: number; // 0-100
  topTerms: string[];
  scores: Record<string, number>;
}

/**
 * Detecta o nicho baseado em keywords e conteúdo
 */
export function detectNiche(params: {
  keywords?: string[];
  title?: string;
  metaDescription?: string;
  headings?: string[];
}): NicheResult {
  const { keywords = [], title = "", metaDescription = "", headings = [] } = params;

  // Combinar tudo num texto único para análise
  const allText = [
    ...keywords,
    title,
    metaDescription,
    ...headings,
  ].join(" ").toLowerCase();

  // Contar ocorrências de termos de cada nicho
  const scores: Record<string, number> = {};
  const matchedTerms: Record<string, string[]> = {};

  for (const [niche, terms] of Object.entries(NICHE_TERMS)) {
    scores[niche] = 0;
    matchedTerms[niche] = [];

    for (const term of terms) {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
      const matches = allText.match(regex);
      if (matches) {
        scores[niche] += matches.length;
        if (!matchedTerms[niche].includes(term)) {
          matchedTerms[niche].push(term);
        }
      }
    }
  }

  // Ordenar por score
  const sorted = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) {
    return {
      primary: "Geral",
      secondary: null,
      confidence: 0,
      topTerms: [],
      scores,
    };
  }

  const primary = sorted[0][0];
  const primaryScore = sorted[0][1];
  const secondary = sorted.length > 1 ? sorted[1][0] : null;
  const secondaryScore = sorted.length > 1 ? sorted[1][1] : 0;

  // Calcular confiança (0-100)
  const totalScore = sorted.reduce((a, [, s]) => a + s, 0);
  const confidence = totalScore > 0
    ? Math.min(100, Math.round((primaryScore / totalScore) * 100 + (matchedTerms[primary]?.length ?? 0) * 5))
    : 0;

  // Verificar se é uma combinação conhecida
  let refinedPrimary = primary;
  if (secondary && secondaryScore > primaryScore * 0.4) {
    for (const [combo, [a, b]] of Object.entries(NICHE_COMBINATIONS)) {
      if ((primary === a && secondary === b) || (primary === b && secondary === a)) {
        refinedPrimary = combo;
        break;
      }
    }
  }

  return {
    primary: refinedPrimary,
    secondary: secondary !== primary ? secondary : null,
    confidence,
    topTerms: matchedTerms[primary]?.slice(0, 5) ?? [],
    scores,
  };
}

/**
 * Conta quantos sites da rede são compatíveis com o nicho
 */
export function getCompatibleNiches(niche: string): string[] {
  // Nichos que são compatíveis entre si (universo temático)
  const compatibilityMap: Record<string, string[]> = {
    "Tecnologia": ["Marketing", "Jogos", "E-commerce", "Educação"],
    "Saúde": ["Esportes", "Alimentação", "Beleza", "Sustentabilidade"],
    "Finanças": ["E-commerce", "Marketing", "Educação", "Jurídico"],
    "Educação": ["Tecnologia", "Marketing", "Finanças"],
    "E-commerce": ["Marketing", "Tecnologia", "Moda", "Finanças"],
    "Marketing": ["Tecnologia", "E-commerce", "Educação", "Finanças"],
    "Jurídico": ["Finanças", "Imobiliário", "Educação"],
    "Imobiliário": ["Construção", "Finanças", "Jurídico"],
    "Alimentação": ["Saúde", "Sustentabilidade", "Agronegócio"],
    "Automotivo": ["Tecnologia", "E-commerce", "Esportes"],
    "Moda": ["Beleza", "E-commerce", "Sustentabilidade"],
    "Beleza": ["Saúde", "Moda", "E-commerce"],
    "Pets": ["Saúde", "E-commerce", "Agronegócio"],
    "Viagem": ["Alimentação", "Esportes", "Sustentabilidade"],
    "Esportes": ["Saúde", "Alimentação", "Tecnologia"],
    "Jogos": ["Tecnologia", "Esportes", "E-commerce"],
    "Infantil": ["Educação", "Saúde", "E-commerce"],
    "Agronegócio": ["Alimentação", "Sustentabilidade", "Pets"],
    "Construção": ["Imobiliário", "Sustentabilidade", "Tecnologia"],
    "Sustentabilidade": ["Alimentação", "Construção", "Agronegócio"],
  };

  const baseNiche = Object.keys(compatibilityMap).find(n =>
    niche.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(niche.toLowerCase())
  ) ?? niche;

  return [baseNiche, ...(compatibilityMap[baseNiche] ?? [])];
}
