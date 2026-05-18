# Club 8links - Implementação Futura

## Estrutura Atual do Banco

A tabela `club_replays` possui os seguintes campos que **não estão sendo exibidos na UI** mas estão disponíveis para implementação futura:

```sql
- site_analyzed  TEXT       -- Domínio do site analisado
- niche          TEXT       -- Nicho do site (ex: "E-commerce Fitness")
- duration       TEXT       -- Duração da aula (ex: "45min")
- highlights     JSONB      -- Pontos principais da análise (array de strings)
```

## Dados Necessários para Preencher

Para cada replay, precisamos extrair:

1. **Site Analisado** - Domínio completo (ex: `lojaexemplo.com.br`)
2. **Nicho** - Categoria do site (ex: "E-commerce", "SaaS B2B", "Info-produto")
3. **Duração** - Tempo total da aula em minutos
4. **Highlights** - 3-5 recomendações principais dadas durante a análise

## Como Obter os Dados

### Opção 1: Transcrição Automática (Recomendada)

Existe um script em `scripts/transcribe-club-replays.ts` que:
1. Baixa o vídeo da Backblaze B2
2. Extrai o áudio com ffmpeg
3. Transcreve usando Whisper (local, grátis)
4. Usa IA para extrair site/nicho/highlights da transcrição

**Status**: Funcional, mas requer:
- Whisper instalado (`pip install faster-whisper`)
- Tempo de processamento (~10-15 min por vídeo de 1h)

### Opção 2: Manual via Admin

O admin em `/admin/club` permite editar cada replay e preencher:
- Site analisado
- Nicho
- Duração
- Highlights (um por linha)

**Status**: Funcional, mas trabalhoso para muitos vídeos

## Script de Processamento em Lote

Para processar todos os vídeos de uma vez:

```bash
# 1. Instalar dependências
pip install faster-whisper

# 2. Adicionar chave da API (se quiser usar Gemini pra extração)
GEMINI_API_KEY=xxx no .env.local

# 3. Rodar script
npx tsx scripts/transcribe-club-replays.ts
```

O script vai:
1. Pegar replays sem `site_analyzed`
2. Baixar vídeo da B2
3. Transcrever áudio
4. Extrair informações
5. Atualizar no banco

## UI Atual (Simplificada)

A página `/courses` agora mostra apenas:
- ✅ Título da aula
- ✅ Data
- ✅ Vídeo
- ✅ Comentários dos alunos

## UI Futura (Quando tiver dados)

Poderia mostrar:
- 📌 Card do replay com thumbnail
- 🏷️ Badge do nicho
- ⏱️ Duração
- ⭐ Highlights da análise
- 🌐 Site analisado (linkável)

## Comentários - Funcionalidades Futuras

Implementado atualmente:
- ✅ Adicionar comentário
- ✅ Responder comentários
- ✅ Ver lista de comentários e respostas

Possíveis melhorias:
- 📝 Editar/deletar próprio comentário
- 👍 Upvote em comentários úteis
- 🔔 Notificações quando responderem
- 📌 Comentários fixados pelo admin
