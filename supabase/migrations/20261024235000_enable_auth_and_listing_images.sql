-- DeckPlay HQ: authenticated seller profiles and public listing images.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'DeckPlay member'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload listing images" on storage.objects;
create policy "Members can upload listing images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can update their listing images" on storage.objects;
create policy "Members can update their listing images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members can delete their listing images" on storage.objects;
create policy "Members can delete their listing images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Anyone can view active listings" on public.listings;
create policy "Anyone can view active listings"
on public.listings
for select
to public
using (
  status = 'active'
  or seller_id = (select auth.uid())
);

drop policy if exists "Sellers can create listings" on public.listings;
create policy "Sellers can create listings"
on public.listings
for insert
to authenticated
with check (seller_id = (select auth.uid()));

drop policy if exists "Sellers can update their listings" on public.listings;
create policy "Sellers can update their listings"
on public.listings
for update
to authenticated
using (seller_id = (select auth.uid()))
with check (seller_id = (select auth.uid()));

drop policy if exists "Sellers can delete their listings" on public.listings;
create policy "Sellers can delete their listings"
on public.listings
for delete
to authenticated
using (seller_id = (select auth.uid()));

drop policy if exists "Members can create their own profile" on public.profiles;
create policy "Members can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
