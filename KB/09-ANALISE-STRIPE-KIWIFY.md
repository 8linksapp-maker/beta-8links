# 8links — Análise Completa Stripe vs Kiwify (544 Clientes)

**Data da análise**: 9 de maio de 2026
**Status**: ✅ **ANÁLISE VALIDADA COM DADOS ATUAIS**

**Fontes validadas:**
- Supabase: 544 usuários (KB/12-SUPABASE-DATA.md)
- Stripe API: 170 assinaturas (KB/11-STRIPE-DATA.md)
- Kiwify Lifetime: 62 vendas paid/waiting (KB/13-KIWIFY-DATA.md)
- Kiwify Mensal: 25 assinaturas (3 ativas verdadeiras) (KB/13-KIWIFY-DATA.md)

---

## Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Total de clientes no Supabase** | **544** |
| **Ativos/Trialing/Past Due** | **151** |
| ✅ **Com pagamento válido (Stripe + Kiwify)** | **140** |
| ⚠️ **Free Riders (ativos sem pagar)** | **25** |
| 📦 **Kiwify Lifetime** | **62** |
| 💳 **Stripe (active/trialing/past_due)** | **93** |

---

## 📊 CATEGORIZAÇÃO COMPLETA

### 1. ✅ OK — NÃO PRECISAM DE NADA (Supabase correto)

Clientes que já estão corretos no Supabase:

| Categoria | Qtd | Descrição |
|-----------|-----|-----------|
| Kiwify Lifetime | 0 | Nenhum está 100% correto (todos precisam de provider) |
| Kiwify Mensal | 0 | Nenhum está 100% correto |
| Stripe | ~70 | Clientes Stripe com provider marcado |

---

### 2. ⚠️ PRECISAM DE ATUALIZAÇÃO NO SUPABASE

#### 2.1. Kiwify Lifetime — Atualizar `payment_provider = 'kiwify'` (51 clientes)

Todos estão com `plan_id` e `subscription_status` corretos, mas `payment_provider = null`:

| Email | Plano | Status | Provider Atual |
|-------|-------|--------|----------------|
| 16vmarques@gmail.com | lifetime | active | null |
| aparicio@maximoconsultoria.com.br | legacy | active | null |
| axandex@gmail.com | lifetime | active | null |
| beneficiorh@gmail.com | legacy | active | null |
| brescia81@hotmail.com | legacy | active | null |
| carlanovas7@gmail.com | lifetime | active | null |
| carlos.siqueira.carmo@gmail.com | legacy | active | null |
| comercial@acorsan.com.br | lifetime | active | null |
| contato.multiversopop@gmail.com | lifetime | active | null |
| daniel@seogenome.com | legacy | active | null |
| dmendes40@gmail.com | legacy | active | null |
| e.curyosidades@gmail.com | lifetime | active | null |
| edumelo2013@gmail.com | legacy | active | null |
| eng.bruno.cesar@outlook.com | lifetime | active | null |
| f.s.gomes96@gmail.com | legacy | active | null |
| felipe.amb@hotmail.com | legacy | active | null |
| fernandolopespro@gmail.com | legacy | active | null |
| fernandovale@msn.com | lifetime | active | null |
| financeiro@marketnet.com.br | lifetime | active | null |
| flavio@raffaelli.com.br | lifetime | active | null |
| fleck.martin@gmail.com | legacy | active | null |
| fpncreation@gmail.com | lifetime | active | null |
| frbarbozacomz@gmail.com | legacy | active | null |
| hercules.silvva@bol.com.br | lifetime | active | null |
| hpires87@gmail.com | legacy | active | null |
| hugomurilo@hotmail.com | lifetime | active | null |
| joycer.tx@hotmail.com | lifetime | active | null |
| juniodomingues@gmail.com | legacy | active | null |
| karen.lemuche@icloud.com | lifetime | active | null |
| leandragcosta@yahoo.com.br | legacy | active | null |
| lorenagarcia.web@gmail.com | legacy | active | null |
| marcelo.marconcini@gmail.com | legacy | active | null |
| marcoshalter@gmail.com | legacy | active | null |
| mikeiasdesigner@gmail.com | legacy | active | null |
| mwnegociosdigitais@gmail.com | lifetime | active | null |
| neojps@gmail.com | lifetime | active | null |
| novoclaudio2023@gmail.com | legacy | active | null |
| porto.biomed@gmail.com | lifetime | active | null |
| randalos.madeira@grupordm.com.br | legacy | active | null |
| regerjs@gmail.com | legacy | active | null |
| spassibvendaslima@gmail.com | legacy | active | null |
| spsantos.bruno@gmail.com | lifetime | active | null |
| tecjuliano@gmail.com | legacy | active | null |
| ton.bsantos@gmail.com | legacy | active | null |
| trafego.seo.marketing@gmail.com | legacy | active | null |
| victor.sanacleto@gmail.com | legacy | active | null |
| victormarquesadvo@gmail.com | lifetime | active | null |
| willianwfmulti@gmail.com | legacy | active | null |
| willtonbrito@gmail.com | lifetime | active | null |
| yuricxgomes@gmail.com | legacy | active | null |

**Ação**: `UPDATE profiles SET payment_provider = 'kiwify' WHERE email IN (lista acima)`

---

#### 2.2. Kiwify Mensal Ativas — Atualizar `payment_provider = 'kiwify'` (3 clientes)

| Email | Plano Atual | Status Atual | Provider | Ação |
|-------|-------------|--------------|----------|------|
| limpacano@hotmail.com | starter | trialing | null | Update provider + status |
| seopersonall@gmail.com | starter | active | null | Update provider |
| zaume7@gmail.com | starter | active | null | Update provider |

**Ação**: `UPDATE profiles SET payment_provider = 'kiwify', subscription_status = 'active' WHERE email = 'limpacano@hotmail.com'`

---

#### 2.3. Plano Errado — Kiwify Lifetime com plano incorreto no Supabase (7 clientes)

| Email | Plano Atual | Deveria Ser |
|-------|-------------|-------------|
| nildo.farias.renda@gmail.com | pro | lifetime/legacy |
| marcos@megadigital.com.br | agency | lifetime/legacy |
| diogo@cloudmarket.com.br | agency | lifetime/legacy |
| marcus.baracho2016@gmail.com | agency | lifetime/legacy |
| getuliovaladaresalves@gmail.com | agency | lifetime/legacy |
| gabrielsaccomorilopes@gmail.com | agency | lifetime/legacy |
| michaeldesantana@gmail.com | agency | lifetime/legacy |

**Ação**: Investigar — podem ser upgrades ou erros de cadastro.

---

#### 2.4. Não Estão no Supabase — Criar Usuários (4 clientes Kiwify Lifetime)

| Email | Produto | Status |
|-------|---------|--------|
| digitalalexman@gmail.com | 8links Lifetime | paid |
| juliocelesc@yahoo.com.br | 8links Legacy | paid |
| maiconr@gmail.com | 8links Lifetime | paid |
| paradisevalley@gmail.com | 8links Lifetime | paid |

**Ação**: Criar usuários via invite ou manualmente.

---

### 3. 🚨 PRECISAM SAIR / CANCELAR

#### 3.1. Stripe Trials — Cancelar (41 assinaturas)

**37 clientes Kiwify + 4 especiais (funcionários/negociação direta):**

| Email | Motivo |
|-------|--------|
| aparicio@maximoconsultoria.com.br | Kiwify Lifetime |
| axandex@gmail.com | Kiwify Lifetime |
| beneficiorh@gmail.com | Kiwify Lifetime |
| brescia81@hotmail.com | Kiwify Lifetime |
| carlanovas7@gmail.com | Kiwify Lifetime |
| carlos.siqueira.carmo@gmail.com | Kiwify Lifetime |
| daniel@seogenome.com | Kiwify Lifetime |
| dmendes40@gmail.com | Kiwify Lifetime |
| edumelo2013@gmail.com | Kiwify Lifetime |
| eng.bruno.cesar@outlook.com | Kiwify Lifetime |
| f.s.gomes96@gmail.com | Kiwify Lifetime |
| felipe.amb@hotmail.com | Kiwify Lifetime |
| fernandolopespro@gmail.com | Kiwify Lifetime |
| fernandovale@msn.com | Kiwify Lifetime |
| flavio@raffaelli.com.br | Kiwify Lifetime |
| fleck.martin@gmail.com | Kiwify Lifetime |
| fpncreation@gmail.com | Kiwify Lifetime |
| franklin.tekk@hotmail.com | Kiwify Lifetime |
| frbarbozacomz@gmail.com | Kiwify Lifetime |
| hercules.silvva@bol.com.br | Kiwify Lifetime |
| hpires87@gmail.com | Kiwify Lifetime |
| joycer.tx@hotmail.com | Kiwify Lifetime |
| juniodomingues@gmail.com | Kiwify Lifetime |
| karen.lemuche@icloud.com | Kiwify Lifetime |
| lorenagarcia.web@gmail.com | Kiwify Lifetime |
| marcelo.marconcini@gmail.com | Kiwify Lifetime |
| mikeiasdesigner@gmail.com | Kiwify Lifetime |
| neojps@gmail.com | Kiwify Lifetime |
| nestorvicentesoares@gmail.com | Kiwify Lifetime |
| novoclaudio2023@gmail.com | Kiwify Lifetime |
| randalos.madeira@grupordm.com.br | Kiwify Lifetime |
| spassibvendaslima@gmail.com | Kiwify Lifetime |
| tecjuliano@gmail.com | Kiwify Lifetime |
| ton.bsantos@gmail.com | Kiwify Lifetime |
| victor.sanacleto@gmail.com | Kiwify Lifetime |
| willtonbrito@gmail.com | Kiwify Lifetime |
| yuricxgomes@gmail.com | Kiwify Lifetime |
| alexdigital50@gmail.com | Especial/Funcionário |
| gugalimaseo@gmail.com | Especial/Funcionário |
| maia.juanchaves@gmail.com | Especial/Funcionário |
| prbn021@gmail.com | Especial/Funcionário |

**Ação**: Cancelar no Stripe Dashboard ou via API.

---

#### 3.2. Stripe Trials — Analisar (4 clientes)

| Email | Status | Observação |
|-------|--------|------------|
| berniceh.olt.1.5.1.1.3@gmail.com | trialing | Não é Kiwify, não é funcionário |
| emersonalexandrevieira5@gmail.com | trialing | Não é Kiwify, não é funcionário |
| eu.flauneves@gmail.com | trialing | Não é Kiwify, não é funcionário |
| fredmorg.a.n.21115@gmail.com | trialing | Não é Kiwify, não é funcionário |

**Ação**: Investigar — são trials legítimos ou devem ser cancelados?

---

### 4. ⚠️ FREE RIDERS — 25 CLIENTES

Usuários ativos no Supabase SEM pagamento no Stripe E SEM pagamento na Kiwify:

| Email | Plano | Status | Observação |
|-------|-------|--------|------------|
| arplay1215@gmail.com | legacy | active | |
| bsnegocio9@gmail.com | starter | trialing | |
| businessintext@gmail.com | starter | past_due | Tem no Stripe (cancelado) |
| cliente-teste@exemplo.com.br | ? | ? | CONTA DE TESTE — REMOVER |
| danielsousaf23@gmail.com | starter | trialing | |
| desentopeurgencia@gmail.com | starter | trialing | |
| dionelgcosta@gmail.com | starter | trialing | |
| jsoaresngc@gmail.com | starter | trialing | |
| junioreawil@gmail.com | starter | trialing | |
| maicon@agenciafidelis.com.br | starter | active | |
| maiconpublicitario@gmail.com | pro | past_due | |
| marina-pastdue@8links.test | pro | past_due | CONTA DE TESTE — REMOVER |
| marina-test@8links.test | pro | active | CONTA DE TESTE — REMOVER |
| marketing@wawebdesign.com.br | pro | active | |
| me@brunomedeiroseo.com.br | starter | trialing | |
| mkt.williamaranha@gmail.com | legacy_monthly | active | |
| murilogxmautex@gmail.com | starter | trialing | |
| novaeracomvisual@gmail.com | pro | active | |
| oficial.blackbrindes@gmail.com | starter | trialing | |
| paradisevalley1883@gmail.com | lifetime | active | |
| pauloreis.rj97@gmail.com | starter | active | |
| pcfiz73@gmail.com | starter | trialing | |
| teste22055464356456@gmail.com | starter | trialing | CONTA DE TESTE — REMOVER |
| victorprsilva@outlook.com | starter | trialing | |
| wesllyinfo@gmail.com | starter | trialing | |

**Ações**:
1. Remover 4 contas de teste
2. Investigar 21 restantes — podem ser equipe, testes, ou free riders reais

---

## 📋 RESUMO DAS AÇÕES

| Prioridade | Ação | Qtd | Impacto |
|------------|------|-----|---------|
| 🔴 ALTA | Atualizar `payment_provider = 'kiwify'` | 54 | Corrige base de dados |
| 🔴 ALTA | Cancelar trials Stripe | 41 | Evita cobrança indevida |
| 🟡 MÉDIA | Criar 4 usuários Kiwify faltantes | 4 | Onboard clientes |
| 🟡 MÉDIA | Investigar 7 planos errados | 7 | Corrige inconsistências |
| 🟡 MÉDIA | Analisar 4 trials não-Kiwify | 4 | Decidir manter/cancelar |
| 🟡 MÉDIA | Remover 4 contas de teste | 4 | Limpeza de dados |
| 🟢 BAIXA | Investigar 21 free riders | 21 | Recupera receita |

---

## PRÓXIMOS PASSOS

1. **Rodar update do payment_provider** para 54 clientes Kiwify
2. **Cancelar 41 trials no Stripe** (37 Kiwify + 4 especiais)
3. **Criar 4 usuários faltantes** do Kiwify no Supabase
4. **Investigar 7 clientes com plano errado**
5. **Decidir sobre 4 trials não-Kiwify** (manter ou cancelar)
6. **Remover 4 contas de teste** do Supabase
7. **Contatar 21 free riders** para regularização

---

## Fontes dos Dados

- **KB/11-STRIPE-DATA.md** — 170 assinaturas Stripe (snapshot 2026-05-09)
- **KB/12-SUPABASE-DATA.md** — 544 usuários Supabase (snapshot 2026-05-09)
- **KB/13-KIWIFY-DATA.md** — 62 vendas Lifetime + 25 mensal (snapshot 2026-05-09)
- **sales_yof04_1778287322883.csv** — Kiwify Lifetime
- **subscriptions_zhzobc_1778289509552.csv** — Kiwify Mensal
- **sales_8links_kiwify.csv** — Kiwify Vendas
