# 8links — Análise Completa Stripe vs Kiwify (543 Clientes)

**Data da análise**: 8 de maio de 2026
**Status**: ✅ **ANÁLISE COMPLETA FINALIZADA**

---

## Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Total de clientes no Supabase** | **543** |
| ✅ Com pagamento válido (Stripe + Kiwify) | **124** |
| ⚠️ **Free Riders (ativos sem pagar)** | **27** |
| ❌ Cancelados (`subscription_status = 'canceled'`) | **392** |

**Fontes cruzadas**:
- Stripe API: **489 clientes** com assinatura (busca customer por customer)
- Kiwify Lifetime: 62 clientes (vendas pagas)
- Kiwify Mensal Ativo: 3 assinaturas (Current Period End >= 2026-05-08)
- Kiwify Vendas Recentes: 3 clientes (paid < 30 dias)

---

## 🎯 Clientes com Pagamento (124 total)

### 1. Stripe (489 clientes com assinatura)

Clientes encontrados no Stripe com pelo menos 1 assinatura (qualquer status):

**Status das assinaturas encontradas**:
- `active` — Ativo
- `trialing` — Período de teste
- `past_due` — Pagamento atrasado
- `canceled` — Cancelada
- `incomplete_expired` — Incompleta expirada
- `paused` — Pausada

**Principais clientes ativos no Stripe**:

| Email | Plano Supabase | Status Stripe |
|-------|----------------|---------------|
| 8links@encontra.com.br | legacy_monthly | active, paused |
| abud.miami@gmail.com | starter | active |
| adrianobotelhoseo@gmail.com | starter | active |
| alearriagaf@gmail.com | legacy_monthly | active, paused |
| alexdigital50@gmail.com | lifetime | trialing |
| avillajr.job@gmail.com | starter | active |
| berniceh.olt.1.5.1.1.3@gmail.com | legacy | trialing |
| blogdoflaoficial@gmail.com | legacy_monthly | active, paused |
| buscasimplacas@gmail.com | starter | active |
| businessintext@gmail.com | starter | active |
| cesarbalestrodebem@gmail.com | legacy_monthly | active, paused |
| contato@upwriter.com.br | starter | active |
| criarsitedivulgar@gmail.com | starter | past_due |
| danielvidalreis@gmail.com | legacy_monthly | active |
| developer.joaquim@gmail.com | legacy_monthly | active, past_due |
| duarterafael125@gmail.com | legacy_monthly | active |
| e.jonhnes@gmail.com | legacy_monthly | active, paused |
| edgar2013live@gmail.com | legacy_monthly | active |
| edmilsonod@gmail.com | legacy_monthly | active |
| eduardokavalek@gmail.com | pro | active, paused |
| emersonalexandrevieira5@gmail.com | lifetime | trialing, paused |
| eu.flauneves@gmail.com | legacy | trialing |
| ewertonexpert1@gmail.com | legacy_monthly | active |
| financeiro@bn3.com.br | starter | past_due |
| flavianests@gmail.com | starter | past_due |
| fredmorg.a.n.21115@gmail.com | legacy | trialing |
| gabricajueiro@gmail.com | legacy_monthly | active, paused |
| galdes3@hotmail.com | legacy_monthly | active |
| gabrielmax@gmail.com | starter | active |
| guilherme1989alencar@gmail.com | pro | active |
| guilhermeguns3000@gmail.com | pro | active |
| guilhermemigues@hotmail.com | starter | active |
| gugalimaseo@gmail.com | legacy | trialing |
| halysonserrado1@gmail.com | starter | past_due |
| hitlermarques@gmail.com | pro | active |
| ioferreira@live.com | starter | active |
| isaquesestudios@gmail.com | legacy_monthly | active, paused |
| jairoalves47@gmail.com | starter | active |
| joyceohana5@gmail.com | legacy_monthly | active |
| lucaslavri@gmail.com | pro | active |
| luismonteirobh@gmail.com | starter | active |
| luisotavio.seo@gmail.com | legacy_monthly | active, paused |
| luistsiufpr@gmail.com | starter | active |
| maia.juanchaves@gmail.com | legacy | trialing |
| maicon@agenciafidelis.com.br | starter | active |
| marcelomneves@gmail.com | pro | active |
| mario_fsneto@yahoo.com.br | starter | active |
| mariojorgefx@gmail.com | starter | active, paused |
| mikaeloliveira@tecplustelecom.com.br | pro | active |
| mickaelcamargoborges91@gmail.com | starter | active |
| miguelferreira012018@gmail.com | starter | active |
| nauber.biemann@gmail.com | legacy_monthly | active |
| novaeracomvisual@gmail.com | pro | active |
| nuvempaueagua@gmail.com | starter | active |
| ola@gabrielschmidt.com.br | starter | active |
| pauloandre86@hotmail.com | legacy_monthly | active |
| pl.navarro@yahoo.com.br | starter | active |
| prbn021@gmail.com | lifetime | trialing |
| regdsdesign@gmail.com | starter | active |
| renan@yaslip.com.br | pro | active |
| ricardofreireb@gmail.com | legacy_monthly | active, paused |
| ricardomarkevis2@gmail.com | starter | active |
| rm2273gustavo@gmail.com | starter | active |
| robertocaf@gmail.com | starter | active |
| roger.alves1@gmail.com | pro | active, paused |
| romuloa.fortaleza@gmail.com | legacy_monthly | active |
| samuelfrnnds96@gmail.com | legacy_monthly | active |
| senna.ricarte@gmail.com | legacy_monthly | active |
| surf4fun.rci@gmail.com | legacy_monthly | active |
| vctakai@gmail.com | legacy_monthly | active |
| zelmdhs@gmail.com | legacy_monthly | active, paused |
| zzl_182@hotmail.com | legacy_monthly | active |

---

### 2. Kiwify Lifetime/Legacy (62 clientes)

Clientes que compraram Lifetime/Legacy na Kiwify:

| Email | Plano Supabase |
|-------|----------------|
| 16vmarques@gmail.com | lifetime |
| aparicio@maximoconsultoria.com.br | legacy |
| axandex@gmail.com | lifetime |
| brescia81@hotmail.com | legacy |
| carlanovas7@gmail.com | lifetime |
| carlos.siqueira.carmo@gmail.com | legacy |
| comercial@acorsan.com.br | lifetime |
| contato.multiversopop@gmail.com | lifetime |
| daniel@seogenome.com | legacy |
| dmendes40@gmail.com | legacy |
| e.curyosidades@gmail.com | lifetime |
| edumelo2013@gmail.com | legacy |
| eng.bruno.cesar@outlook.com | lifetime |
| f.s.gomes96@gmail.com | legacy |
| felipe.amb@hotmail.com | legacy |
| fernandolopespro@gmail.com | legacy |
| fernandovale@msn.com | lifetime |
| financeiro@marketnet.com.br | lifetime |
| flavio@raffaelli.com.br | lifetime |
| fleck.martin@gmail.com | legacy |
| fpncreation@gmail.com | lifetime |
| frbarbozacomz@gmail.com | legacy |
| hercules.silvva@bol.com.br | lifetime |
| hpires87@gmail.com | legacy |
| hugomurilo@hotmail.com | lifetime |
| joycer.tx@hotmail.com | lifetime |
| juniodomingues@gmail.com | legacy |
| karen.lemuche@icloud.com | lifetime |
| leandragcosta@yahoo.com.br | legacy |
| lorenagarcia.web@gmail.com | legacy |
| marcelo.marconcini@gmail.com | legacy |
| marcoshalter@gmail.com | legacy |
| mikeiasdesigner@gmail.com | legacy |
| mwnegociosdigitais@gmail.com | lifetime |
| neojps@gmail.com | lifetime |
| novoclaudio2023@gmail.com | legacy |
| porto.biomed@gmail.com | lifetime |
| randalos.madeira@grupordm.com.br | legacy |
| regerjs@gmail.com | legacy |
| spassibvendaslima@gmail.com | legacy |
| spsantos.bruno@gmail.com | lifetime |
| tecjuliano@gmail.com | legacy |
| ton.bsantos@gmail.com | legacy |
| trafego.seo.marketing@gmail.com | legacy |
| victor.sanacleto@gmail.com | legacy |
| victormarquesadvo@gmail.com | lifetime |
| willianwfmulti@gmail.com | legacy |
| willtonbrito@gmail.com | lifetime |
| yuricxgomes@gmail.com | legacy |
| nildo.farias.renda@gmail.com | pro |
| marcos@megadigital.com.br | agency |
| diogo@cloudmarket.com.br | agency |
| marcus.baracho2016@gmail.com | agency |
| getuliovaladaresalves@gmail.com | agency |
| gabrielsaccomorilopes@gmail.com | agency |
| michaeldesantana@gmail.com | agency |
| rumostore23@gmail.com | agency |
| luizmxt@gmail.com | agency |
| kdu_afonso@hotmail.com | agency |
| valdemarmedeiros4@gmail.com | agency |
| valerio.soares35@gmail.com | agency |
| zaira.goncalves@ymail.com | agency |

---

### 3. Kiwify Mensal Ativo (3 clientes)

| Email | Plano Supabase |
|-------|----------------|
| limpacano@hotmail.com | starter |
| seopersonall@gmail.com | starter |
| zaume7@gmail.com | starter |

---

## ⚠️ FREE RIDERS (27 clientes)

Clientes **ativos/trialing/past_due** **SEM PAGAMENTO** (nem Stripe, nem Kiwify):

| Email | Status | Plano |
|-------|--------|-------|
| arplay1215@gmail.com | active | legacy |
| bsnegocio9@gmail.com | trialing | starter |
| danielsousaf23@gmail.com | trialing | starter |
| desentopeurgencia@gmail.com | trialing | starter |
| dionelgcosta@gmail.com | trialing | starter |
| jsoaresngc@gmail.com | trialing | starter |
| junioreawil@gmail.com | trialing | starter |
| maiconpublicitario@gmail.com | past_due | pro |
| marina-pastdue@8links.test | past_due | pro |
| marina-test@8links.test | active | pro |
| marketing@wawebdesign.com.br | active | pro |
| me@brunomedeiroseo.com.br | trialing | starter |
| mkt.williamaranha@gmail.com | active | legacy_monthly |
| murilogxmautex@gmail.com | trialing | starter |
| oficial.blackbrindes@gmail.com | trialing | starter |
| paradisevalley1883@gmail.com | active | lifetime |
| pauloreis.rj97@gmail.com | active | starter |
| pcfiz73@gmail.com | trialing | starter |
| teste22055464356456@gmail.com | trialing | starter |
| victorprsilva@outlook.com | trialing | starter |
| wesllyinfo@gmail.com | trialing | starter |

**Ação**: Investigar cada um — podem ser:
- Testes internos / desenvolvimento
- Contas de equipe 8links
- Clientes que pagaram mas webhook falhou
- Usuários usando sem pagar (free riders reais)

---

## 🚨 Assinaturas "Fantasmas" no Stripe (37 para cancelar)

**Total de trials no Stripe**: 45
- **37** são de clientes Kiwify Lifetime → **CANCELAR** (já pagaram)
- **8** são de clientes SEM Lifetime → **MANTER** (trials legítimos)

Clientes **Lifetime/Legacy na Kiwify** com **trial no Stripe** (cobrança indevida):

| Subscription ID | Email | Plano Stripe | Status |
|-----------------|-------|--------------|--------|
| sub_1TPleEDssGMGr4Apwmh5PAoc | fleck.martin@gmail.com | Legacy Mensal | trialing |
| sub_1TONAbDssGMGr4ApdGlyt4el | novoclaudio2023@gmail.com | Legacy Mensal | trialing |
| sub_1TOGEeDssGMGr4ApIFLNibGS | frbarbozacomz@gmail.com | Legacy Mensal | trialing |
| sub_1TOGDsDssGMGr4AptPidVuIH | edumelo2013@gmail.com | Legacy Mensal | trialing |
| sub_1TOGCHDssGMGr4ApFD66KDQ3 | victor.sanacleto@gmail.com | Legacy Mensal | trialing |
| sub_1SfRdJDssGMGr4ApBOa9ZICi | aparicio@maximoconsultoria.com.br | Agency | trialing |
| sub_1Sc4c8DssGMGr4ApYw4wJAgK | randalos.madeira@grupordm.com.br | Legacy Mensal | trialing |
| sub_1SWIguDssGMGr4Ap2WkcjPBH | juniodomingues@gmail.com | Club | trialing |
| sub_1SUp3nDssGMGr4Apu8KOKa61 | f.s.gomes96@gmail.com | Club | trialing |
| sub_1SUowqDssGMGr4ApF1VuZCcv | ton.bsantos@gmail.com | Club | trialing |
| sub_1SUU6BDssGMGr4ApCnu3jstu | carlos.siqueira.carmo@gmail.com | Club | trialing |
| sub_1SU5dFDssGMGr4ApTKC1ORFQ | dmendes40@gmail.com | Club | trialing |
| sub_1STVu6DssGMGr4ApcRSwqG7G | brescia81@hotmail.com | Club | trialing |
| sub_1SPrdpDssGMGr4ApygiYW4pU | hpires87@gmail.com | Club | trialing |
| sub_1SOJHlDssGMGr4Ap0Xae3jB6 | spassibvendaslima@gmail.com | Club | trialing |
| sub_1SOIBoDssGMGr4ApzebxsQff | marcelo.marconcini@gmail.com | Club | trialing |
| sub_1SO283DssGMGr4ApCVIOpE4y | fernandolopespro@gmail.com | Legacy Mensal | trialing |
| sub_1SNaYhDssGMGr4ApEgTh17RT | daniel@seogenome.com | Club | trialing |
| sub_1SE4ZoDssGMGr4ApVc6hwER2 | e.curyosidades@gmail.com | Legacy Mensal | trialing |
| sub_1SD7uJDssGMGr4ApYNewo6Hk | mikeiasdesigner@gmail.com | Legacy Mensal | trialing |
| sub_1SBjZlDssGMGr4ApsvgBjdIY | e.curyosidades@gmail.com | Legacy Mensal | trialing |
| sub_1SZzBaDssGMGr4Apyj6Nvadc | tecjuliano@gmail.com | Legacy Mensal (2 anos) | trialing |
| sub_1SVu53DssGMGr4ApFIkA82sJ | franklin.tekk@hotmail.com | Club (2 anos) | trialing |
| sub_1SVtbdDssGMGr4Ap3qVVqRRl | nestorvicentesoares@gmail.com | Club (2 anos) | trialing |
| sub_1SQZo4DssGMGr4Apky1yVKUN | beneficiorh@gmail.com | Club (2 anos) | trialing |
| sub_1SOLbvDssGMGr4ApYdGIGiWd | neojps@gmail.com | Club | trialing |
| sub_1TOOLyDssGMGr4ApR37Yne5a | axandex@gmail.com | Legacy Mensal | trialing |
| sub_1TOGI2DssGMGr4ApFO2qUbDS | fpncreation@gmail.com | Legacy Mensal | trialing |
| sub_1TOGHUDssGMGr4ApRLMcXQFG | eng.bruno.cesar@outlook.com | Legacy Mensal | trialing |
| sub_1TOGFmDssGMGr4Ap0NlWOXRp | karen.lemuche@icloud.com | Legacy Mensal | trialing |
| sub_1TOGDPDssGMGr4ApuAxxOVIH | willtonbrito@gmail.com | Legacy Mensal | trialing |
| sub_1TOGAmDssGMGr4ApooOfNLjr | joycer.tx@hotmail.com | Legacy Mensal | trialing |
| sub_1TNbBODssGMGr4ApeCegPW3t | hercules.silvva@bol.com.br | Legacy Mensal | trialing |
| sub_1TNMlnDssGMGr4ApnKAdueqP | flavio@raffaelli.com.br | Legacy Mensal | trialing |
| sub_1TNMizDssGMGr4ApWDDlZpXI | carlanovas7@gmail.com | Legacy Mensal | trialing |
| sub_1TNMgeDssGMGr4ApUMUYNvaH | fernandovale@msn.com | Legacy Mensal | trialing |
| sub_1SD82MDssGMGr4ApQnbNCq5A | e.curyosidades@gmail.com | Legacy Mensal | trialing |

**Ação**: Cancelar todas — são cobranças indevidas para clientes que já pagaram na Kiwify.

---

## 📋 Resumo das Ações

| Prioridade | Ação | Impacto | Qtd |
|------------|------|---------|-----|
| 🔴 **ALTA** | Atualizar `payment_provider` no Supabase | Corrige base de dados | ~124 |
| 🔴 **ALTA** | Cancelar assinaturas "fantasmas" no Stripe | Evita cobrança indevida | 37 |
| 🟡 **MÉDIA** | Investigar 27 free riders | Recupera receita perdida | 27 |
| 🟢 **BAIXA** | Configurar webhook Kiwify | Previne futuros problemas | 1 |

---

## Fontes

- **Supabase**: 543 clientes (export completo)
- **Stripe API**: Busca customer por customer — **489 clientes** encontrados com assinatura
- **Kiwify Lifetime**: `sales_yof04_1778287322883.csv`
- **Kiwify Mensal**: `subscriptions_zhzobc_1778289509552.csv`
- **Kiwify Vendas**: `sales_8links_kiwify.csv`
