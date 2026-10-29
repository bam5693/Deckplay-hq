-- Staging-only marketplace activity notifications.
create table if not exists public.seller_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (follower_id,seller_id),
 constraint cannot_follow_self check (follower_id <> seller_id)
);
alter table public.seller_follows enable row level security;
create policy "Members read their follows" on public.seller_follows for select to authenticated using (follower_id = (select auth.uid()));
create policy "Members follow sellers" on public.seller_follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Members unfollow sellers" on public.seller_follows for delete to authenticated using (follower_id = (select auth.uid()));
grant select,insert,delete on public.seller_follows to authenticated;

create or replace function private.notify_new_listing_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status <> 'active' then return new; end if;
 insert into public.collector_notifications(user_id,actor_id,kind,source_id)
 select sf.follower_id,new.seller_id,'followed_seller_listing',new.id
 from public.seller_follows sf where sf.seller_id=new.seller_id;
 insert into public.collector_notifications(user_id,actor_id,kind,source_id)
 select distinct wp.user_id,new.seller_id,'wanted_match',new.id
 from public.wanted_posts wp
 where wp.user_id <> new.seller_id
 and length(trim(wp.title)) >= 3
 and lower(new.title) like '%' || replace(replace(lower(trim(wp.title)),'%', '\%'),'_', '\_') || '%' escape '\'
 and (wp.budget is null or new.price <= wp.budget)
 and (wp.game is null or wp.game='' or wp.game='general' or wp.game=new.tcg_game or wp.game=new.category);
 return new;
end;
$$;
revoke all on function private.notify_new_listing_activity() from public,anon,authenticated;
drop trigger if exists notify_new_listing_activity on public.listings;
create trigger notify_new_listing_activity after insert on public.listings
for each row execute function private.notify_new_listing_activity();
