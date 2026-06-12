-- Add an optional music genre tag to every shareable content type
-- so Explore can filter by style (rap, pop, jazz, classique, …).
alter table public.brackets add column if not exists genre text;
alter table public.tierlists add column if not exists genre text;
alter table public.blindtests add column if not exists genre text;
alter table public.stream_clashes add column if not exists genre text;
alter table public.smash_passes add column if not exists genre text;

create index if not exists brackets_genre_idx on public.brackets (genre) where genre is not null;
create index if not exists tierlists_genre_idx on public.tierlists (genre) where genre is not null;
create index if not exists blindtests_genre_idx on public.blindtests (genre) where genre is not null;
create index if not exists stream_clashes_genre_idx on public.stream_clashes (genre) where genre is not null;
create index if not exists smash_passes_genre_idx on public.smash_passes (genre) where genre is not null;
