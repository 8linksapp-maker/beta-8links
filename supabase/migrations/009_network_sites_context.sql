-- Expand network_sites with context, credentials, and categories
alter table public.network_sites add column if not exists vercel_url text;
alter table public.network_sites add column if not exists site_context jsonb default '{}';
alter table public.network_sites add column if not exists categories text[] default '{}';
alter table public.network_sites add column if not exists brand_voice text;
alter table public.network_sites add column if not exists wp_url text;
alter table public.network_sites add column if not exists wp_username text;
alter table public.network_sites add column if not exists wp_app_password text;
alter table public.network_sites add column if not exists github_token text;
alter table public.network_sites add column if not exists github_repo text;

-- Allow more site_type values
alter table public.network_sites drop constraint if exists network_sites_site_type_check;
alter table public.network_sites add constraint network_sites_site_type_check check (site_type in ('blog', 'portal', 'magazine', 'news', 'directory'));

-- Allow more hosting values
alter table public.network_sites drop constraint if exists network_sites_hosting_check;
alter table public.network_sites add constraint network_sites_hosting_check check (hosting in ('jamstack', 'wordpress', 'astro', 'nextjs', 'hugo'));

-- Insert all network sites from the Vercel list
-- Using ON CONFLICT to avoid duplicates if run multiple times
insert into public.network_sites (domain, niche, vercel_url, da, site_type, hosting, status) values
  ('3255coworking.com.br', 'Negócios', 'https://3255coworking-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('adventurebloggers.com.br', 'Viagem', 'https://adventurebloggers-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('alast.com.br', 'Negócios', 'https://alast-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('alpacapress.com.br', 'Saúde', 'https://alpacapress-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('atelierdobanho.com.br', 'Beleza', 'https://atelierdobanho-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('atelierh2o.com.br', 'Construção', 'https://atelierh2o-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('badulaquemix.com.br', 'Marketing', 'https://badulaquemix-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('baladaweek.com.br', 'Entretenimento', 'https://baladaweek-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('bolsajuventuderural.com.br', 'Educação', 'https://bolsajuventuderural-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('botequimrestaurante.com.br', 'Alimentação', 'https://botequimrestaurante-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('brasconpe.com.br', 'Educação', 'https://brasconpe-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('caleopreconceito.com.br', 'Esportes', 'https://caleopreconceito-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('carregandomalinhas.com.br', 'Viagem', 'https://carregandomalinhas-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('ceatox.com.br', 'Saúde', 'https://ceatox-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('cideb.com.br', 'Tecnologia', 'https://cideb-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('clubinhofabercastell.com.br', 'Educação', 'https://clubinhofabercastell-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('cmmanaus.com.br', 'Educação', 'https://cmmanaus-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('corridaesperanca.com.br', 'Esportes', 'https://corridaesperanca-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('corridamiranda.com.br', 'Esportes', 'https://corridamiranda-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('cursosdeverao.com.br', 'Educação', 'https://cursosdeverao-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('decorandocomclasseshop.com.br', 'Construção', 'https://decorandocomclasseshop-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('dingbatcobogo.com.br', 'Construção', 'https://dingbatcobogo-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('e-commerceguide.com.br', 'E-commerce', 'https://e-commerceguide-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('edipucrs.com.br', 'Educação', 'https://edipucrs-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('editorausinadeletras.com.br', 'Educação', 'https://editorausinadeletras-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('fashion4fun.com.br', 'Moda', 'https://fashion4fun-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('funeel.com.br', 'Marketing', 'https://funeel-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('guyrestaurante.com.br', 'Alimentação', 'https://guyrestaurante-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('institutoprogredir.com.br', 'Educação', 'https://institutoprogredir-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('katylene.com.br', 'Moda', 'https://katylene-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('lavalma.com.br', 'Moda', 'https://lavalma-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('limarestobar.com.br', 'Alimentação', 'https://limarestobar-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('lpfa.com.br', 'Esportes', 'https://lpfa-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('maratonasc.com.br', 'Esportes', 'https://maratonasc-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('mariahelenamisturinhas.com.br', 'Beleza', 'https://mariahelenamisturinhas-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('meiamaratonafloripa.com.br', 'Esportes', 'https://meiamaratonafloripa-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('melonmelonstore.com.br', 'Moda', 'https://melonmelonstore-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('mgaconcursos.com.br', 'Educação', 'https://mgaconcursos-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('minharotina.com.br', 'Saúde', 'https://minharotina-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('minihumanos.com.br', 'Educação', 'https://minihumanos-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('mktchallenge.com.br', 'Marketing', 'https://mktchallenge-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('mobiliintelligenti.com.br', 'Construção', 'https://mobiliintelligenti-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('motterhome.com.br', 'Viagem', 'https://motterhome-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('negociosdojapao.com.br', 'E-commerce', 'https://negociosdojapao-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('npcast.com.br', 'Tecnologia', 'https://npcast-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('octooc.com.br', 'Tecnologia', 'https://octooc-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('ossegredosdovitorio.com.br', 'Marketing', 'https://ossegredosdovitorio-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('paranabusinesscollection.com.br', 'Moda', 'https://paranabusinesscollection-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('perfilhumanorh.com.br', 'E-commerce', 'https://perfilhumanorh-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('pontocomm.com.br', 'Educação', 'https://pontocomm-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('prefeituradecampogrande.com.br', 'Construção', 'https://prefeituradecampogrande-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('querosersf.com.br', 'E-commerce', 'https://querosersf-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('rbsimportgames.com.br', 'Jogos', 'https://rbsimportgames-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('riosmariana.com.br', 'Viagem', 'https://riosmariana-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('salaomaisb.com.br', 'Beleza', 'https://salaomaisb-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('shopitos.com.br', 'E-commerce', 'https://shopitos-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('sibic.com.br', 'Educação', 'https://sibic-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('somar-ma.com.br', 'E-commerce', 'https://somar-ma-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('sonytv.com.br', 'Tecnologia', 'https://sonytv-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('sp00.net', 'Tecnologia', 'https://sp00-net.vercel.app', 0, 'blog', 'astro', 'active'),
  ('subbeachwear.com.br', 'Moda', 'https://subbeachwear-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('testedos100dias.com.br', 'Automotivo', 'https://testedos100dias-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('traineefiat.com.br', 'Automotivo', 'https://traineefiat-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('tropeirodalapa.com.br', 'Viagem', 'https://tropeirodalapa-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('tsrconcursos.com.br', 'E-commerce', 'https://tsrconcursos-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('unefolie.com.br', 'Alimentação', 'https://unefolie-com-br.vercel.app', 0, 'blog', 'astro', 'active'),
  ('vidigalbergue.com.br', 'Viagem', 'https://vidigalbergue-com-br.vercel.app', 0, 'blog', 'astro', 'active')
on conflict (domain) do update set
  vercel_url = excluded.vercel_url,
  niche = excluded.niche,
  hosting = excluded.hosting,
  status = excluded.status;
