-- ============================================
-- 026 - Stripe Price IDs
-- ============================================
-- Atualiza os planos com os Price IDs do Stripe

-- Planos de assinatura Stripe
UPDATE public.plans SET stripe_price_id = 'price_1S3PvoDssGMGr4ApVHjLcKBy' WHERE id = 'starter';
UPDATE public.plans SET stripe_price_id = 'price_1S3PwCDssGMGr4ApXhYzENaK' WHERE id = 'pro';
UPDATE public.plans SET stripe_price_id = 'price_1S3PwdDssGMGr4ApVu7rU8kB' WHERE id = 'agency';
UPDATE public.plans SET stripe_price_id = 'price_1S3finDssGMGr4ApW7wWdEOK' WHERE id = 'club';

-- Legacy Mensal (Stripe)
UPDATE public.plans SET stripe_price_id = 'price_1S3fgvDssGMGr4Ap2KNREK4i' WHERE id = 'legacy_monthly';

-- Lifetime e Legacy Anual são vendidos via Kiwify (sem Stripe)
-- stripe_price_id permanece NULL para estes
