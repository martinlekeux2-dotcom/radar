alter table public.articles
  add column if not exists featured_on_home boolean not null default false;

create unique index if not exists articles_single_home_featured_idx
  on public.articles (featured_on_home)
  where status = 'published' and featured_on_home;

create or replace function public.set_home_featured_article(target_article_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.articles
  set featured_on_home = false
  where featured_on_home and status = 'published';

  if target_article_id is not null then
    update public.articles
    set featured_on_home = true
    where id = target_article_id and status = 'published';

    if not found then
      raise exception 'L’article sélectionné doit être publié.';
    end if;
  end if;
end;
$$;

revoke all on function public.set_home_featured_article(uuid) from public, anon, authenticated;
grant execute on function public.set_home_featured_article(uuid) to service_role;

alter table public.events
  add column if not exists featured_position smallint
    check (featured_position is null or featured_position between 1 and 3);

create unique index if not exists events_featured_position_idx
  on public.events (featured_position)
  where status = 'published' and featured_position is not null;

create or replace function public.set_home_featured_event(target_event_id uuid, target_position smallint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_position is null or target_position not between 1 and 3 then
    raise exception 'La position mise en avant doit être 1, 2 ou 3.';
  end if;

  update public.events
  set featured_position = null
  where featured_position = target_position and status = 'published';

  update public.events
  set featured_position = target_position
  where id = target_event_id and status = 'published';

  if not found then
    raise exception 'L’événement sélectionné doit être publié.';
  end if;
end;
$$;

revoke all on function public.set_home_featured_event(uuid, smallint) from public, anon, authenticated;
grant execute on function public.set_home_featured_event(uuid, smallint) to service_role;

create table if not exists public.reportages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  author_name text not null,
  image_url text,
  image_description text,
  content text not null default '',
  position integer not null default 0 check (position >= 0),
  show_on_home boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reportages_published_at_required
    check (status <> 'published' or published_at is not null)
);

alter table public.reportages enable row level security;

drop policy if exists "Public can read published reportages" on public.reportages;
create policy "Public can read published reportages"
  on public.reportages for select to anon, authenticated
  using (status = 'published' and published_at <= now());

create index if not exists reportages_home_position_idx
  on public.reportages (position, published_at desc)
  where status = 'published' and show_on_home;

insert into public.reportages (
  slug, title, category, author_name, image_url, image_description,
  content, position, show_on_home, status, published_at
)
values
(
  'au-fil-du-fleuve',
  'Au fil du fleuve, la ville reprend son souffle',
  'Territoires',
  'Camille Moreau',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85',
  'Paysage ouvert au bord de l’eau',
  $content$À l’aube, les quais s’éveillent avant le reste de la ville. Des joggeurs croisent les équipes qui nettoient les berges, tandis que les premiers bateaux glissent sur l’eau. Longtemps tourné vers ses axes routiers, le quartier redécouvre aujourd’hui son fleuve.

De nouveaux cheminements piétons relient les anciens entrepôts aux jardins partagés. « On a retrouvé un endroit où l’on peut simplement s’arrêter », raconte Nadia, habitante du quartier depuis vingt ans. Les associations locales ont participé aux ateliers qui ont dessiné ces aménagements, avec une priorité : préserver les zones végétalisées.

Le chantier se poursuivra par étapes tout au long de l’année. Les élus promettent un suivi public de la qualité de l’eau et de la fréquentation des berges. Ici, la transformation ne tient pas à un grand geste, mais à ces accès quotidiens qui rapprochent peu à peu les habitants du fleuve.$content$,
  1, true, 'published', '2026-11-10T12:00:00+01:00'
),
(
  'les-mains-qui-reparent',
  'Dans l’atelier, les objets repartent pour une seconde vie',
  'Société',
  'Thomas Bernard',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=85',
  'Artisan au travail dans un atelier lumineux',
  $content$Sur les établis, radios, lampes et vélos attendent leur tour. Chaque semaine, l’atelier de réparation ouvre ses portes aux habitants qui veulent comprendre comment fonctionne un objet avant de le remplacer.

Les bénévoles accompagnent les visiteurs, sans faire à leur place. Une panne devient l’occasion d’apprendre un geste, d’identifier une pièce et parfois de rencontrer son voisin de table. Les outils sont prêtés et les pièces de rechange choisies ensemble.

Le collectif accueille désormais une centaine de personnes par mois. Son prochain défi : proposer des permanences dans plusieurs quartiers afin que la réparation reste accessible, même sans voiture ni matériel chez soi.$content$,
  2, true, 'published', '2026-11-08T12:00:00+01:00'
),
(
  'la-scene-au-coeur-du-quartier',
  'Une scène ouverte transforme la place du quartier',
  'Culture',
  'Sarah Diallo',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
  'Public réuni pour un spectacle en plein air',
  $content$À la tombée du jour, les chaises se remplissent autour de la petite scène installée sur la place. Au programme : un groupe du conservatoire, une chorale amateur et les textes écrits pendant les ateliers du centre social.

L’événement est né d’une idée simple : laisser les habitants choisir ce qu’ils ont envie de partager. Les commerçants prêtent des rallonges, les jeunes s’occupent du son et les artistes professionnels accompagnent les répétitions.

La scène restera ouverte un jeudi par mois jusqu’au printemps. Les organisateurs espèrent y faire découvrir les talents du quartier et donner aux passants une bonne raison de s’attarder.$content$,
  3, true, 'published', '2026-11-05T12:00:00+01:00'
),
(
  'des-cours-plus-frais',
  'À l’école, la cour se met à l’ombre',
  'Environnement',
  'Émile Laurent',
  'https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1200&q=85',
  'Arbres formant un couvert végétal',
  $content$Dans la cour de l’école Jean-Moulin, quelques arbres nouvellement plantés dessinent déjà les espaces de demain. Les classes ont suivi les travaux et observé le sol avant de décider où l’ombre serait la plus utile.

Une partie du bitume a été retirée pour laisser l’eau s’infiltrer. Des bancs ont été installés près des plantations et les enfants participent à leur entretien avec l’équipe éducative. L’aménagement cherche autant à rafraîchir la cour qu’à créer de nouveaux coins de jeu.

La commune prévoit d’évaluer la température des sols et le confort des élèves au fil des saisons. Si le test est concluant, le même principe pourrait être adapté à d’autres cours de la ville dès l’an prochain.$content$,
  4, true, 'published', '2026-11-02T12:00:00+01:00'
)
on conflict (slug) do nothing;
