-- STAGING ONLY: apply exclusively to project prrrzeelltmyugssqnzk.
-- Not a production migration. Run with staging provisioning, never production deploy.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create unique index if not exists profiles_username_ci on public.profiles(lower(username));
alter table public.listings add constraint staging_listing_photos check (cardinality(image_urls) between 1 and 5);
alter table public.listings add constraint staging_listing_price check (price >= 0 and price <= 100000);
alter table public.collector_messages add constraint staging_message_body check (length(trim(body)) between 1 and 4000);
alter table public.wanted_posts add constraint staging_wanted_title check (length(trim(title)) between 1 and 150);
alter table public.price_offers add constraint staging_offer_amount check (amount > 0 and amount <= 100000);
create table if not exists public.seller_reviews (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.deal_progress(id),
 reviewer_id uuid not null references auth.users(id), seller_id uuid not null references auth.users(id),
 rating integer not null check (rating between 1 and 5), comment text check(length(comment)<=2000),
 created_at timestamptz not null default now(), unique(deal_id,reviewer_id)
);
alter table public.seller_reviews enable row level security;
create policy "Read seller reviews" on public.seller_reviews for select using(true);
grant select on public.seller_reviews to anon,authenticated;
-- Reviews and completed deals remain read-only until fulfillment is implemented.
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,username,display_name) values(new.id,
 coalesce(nullif(new.raw_user_meta_data->>'username',''),'collector_'||substr(replace(new.id::text,'-',''),1,10)),
 coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Collector'));
 return new;
end $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('listing-images','listing-images',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('profile-avatars','profile-avatars',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "Read own staging photos" on storage.objects for select to authenticated using(bucket_id in ('listing-images','profile-avatars') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own staging photos" on storage.objects for insert to authenticated with check(bucket_id in ('listing-images','profile-avatars') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Delete own staging photos" on storage.objects for delete to authenticated using(bucket_id in ('listing-images','profile-avatars') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Update own staging photos" on storage.objects for update to authenticated using(bucket_id in ('listing-images','profile-avatars') and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id in ('listing-images','profile-avatars') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Limit mutable columns so a participant cannot rewrite identities or message content.
revoke update on public.collector_messages,public.collector_notifications,public.trade_offers from authenticated;
grant update(read_at) on public.collector_messages,public.collector_notifications to authenticated;
grant update(status) on public.trade_offers to authenticated;
create policy "Recipient reads message" on public.collector_messages for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
create policy "Owner reads notification" on public.collector_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Update own read markers" on public.notification_reads for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Delete own wanted" on public.wanted_posts for delete to authenticated using(user_id=(select auth.uid()));
create policy "Trade sender inserts" on public.trade_offers for insert to authenticated with check(sender_id=(select auth.uid()) and status='pending');
create policy "Trade party responds" on public.trade_offers for update to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid())) with check(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create or replace function private.notify(p_user uuid,p_actor uuid,p_kind text,p_source uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if coalesce((select case when p_kind='message' then messages else trade_offers end from public.notification_preferences where user_id=p_user),true) then
 insert into public.collector_notifications(user_id,actor_id,kind,source_id) values(p_user,p_actor,p_kind,p_source);
 end if;
end $$;
revoke all on function private.notify(uuid,uuid,text,uuid) from public,anon,authenticated;
create or replace function private.message_notify() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Messaging is unavailable between these collectors'; end if;
 perform private.notify(new.recipient_id,new.sender_id,'message',new.id);return new;
end $$;
revoke all on function private.message_notify() from public,anon,authenticated;
create trigger message_notification after insert on public.collector_messages for each row execute function private.message_notify();
-- Offers are modified only by authenticated, validated functions. Row locks serialize acceptance.
create or replace function private.submit_price_offer(p_listing_id uuid,p_amount numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.listings; oid uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into l from public.listings where id=p_listing_id for update;
 if not found or l.status<>'active' or not l.accepts_price_offers then raise exception 'Listing is not available for offers'; end if;
 if uid=l.seller_id then raise exception 'Cannot offer on your own listing'; end if;
 if p_amount is null or p_amount<=0 or p_amount>100000 then raise exception 'Invalid offer amount'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=l.seller_id) or (blocker_id=l.seller_id and blocked_id=uid)) then raise exception 'Offer unavailable'; end if;
 insert into public.price_offers(listing_id,buyer_id,seller_id,amount,last_actor_id,status) values(l.id,uid,l.seller_id,p_amount,uid,'pending') returning id into oid;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(oid,l.id,uid,l.seller_id,uid,'submitted',p_amount);
 perform private.notify(l.seller_id,uid,'price_offer',oid);return oid;
end $$;
create or replace function private.respond_price_offer(p_offer_id uuid,p_action text,p_amount numeric default null) returns void language plpgsql security definer set search_path='' as $$
declare o public.price_offers; l public.listings; uid uuid:=auth.uid(); target uuid;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select listing_id into target from public.price_offers where id=p_offer_id and uid in (buyer_id,seller_id);
 if not found then raise exception 'Offer unavailable'; end if;
 select * into l from public.listings where id=target for update;
 select * into o from public.price_offers where id=p_offer_id for update;
 if o.status not in ('pending','countered') or l.status<>'active' then raise exception 'Offer or listing is closed'; end if;
 if p_action='withdraw' then
 if uid<>o.buyer_id then raise exception 'Only buyer can withdraw'; end if;
 elsif uid=o.last_actor_id then raise exception 'Wait for the other collector'; end if;
 if p_action='counter' then
 if p_amount is null or p_amount<=0 or p_amount>100000 then raise exception 'Invalid counteroffer amount'; end if;
 update public.price_offers set amount=p_amount,status='countered',last_actor_id=uid,updated_at=now() where id=o.id;
 elsif p_action in ('accept','decline','withdraw') then
 update public.price_offers set status=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end,last_actor_id=uid,updated_at=now() where id=o.id;
 if p_action='accept' then
 update public.listings set status='reserved',updated_at=now() where id=l.id;
 update public.price_offers set status='declined',updated_at=now() where listing_id=l.id and id<>o.id and status in ('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where (listing_id=l.id or offered_listing_id=l.id) and status='pending';
 end if;
 else raise exception 'Invalid offer action'; end if;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(o.id,o.listing_id,o.buyer_id,o.seller_id,uid,p_action,case when p_action='counter' then p_amount else o.amount end);
 perform private.notify(case when uid=o.buyer_id then o.seller_id else o.buyer_id end,uid,case when p_action='counter' then 'price_counter' else 'price_update' end,o.id);
end $$;
-- Public wrappers keep privileged implementations outside the exposed schema.
create or replace function public.submit_price_offer(p_listing_id uuid,p_amount numeric) returns uuid language sql security invoker set search_path='' as $$select private.submit_price_offer(p_listing_id,p_amount)$$;
create or replace function public.respond_price_offer(p_offer_id uuid,p_action text,p_amount numeric default null) returns void language sql security invoker set search_path='' as $$select private.respond_price_offer(p_offer_id,p_action,p_amount)$$;
revoke all on function private.submit_price_offer(uuid,numeric),private.respond_price_offer(uuid,text,numeric),public.submit_price_offer(uuid,numeric),public.respond_price_offer(uuid,text,numeric) from public,anon;
grant execute on function private.submit_price_offer(uuid,numeric),private.respond_price_offer(uuid,text,numeric),public.submit_price_offer(uuid,numeric),public.respond_price_offer(uuid,text,numeric) to authenticated;
-- Accepted participants must still see their reserved listing in their inbox.
create policy "Buyer views negotiated listing" on public.listings for select to authenticated using(exists(select 1 from public.price_offers o where o.listing_id=listings.id and o.buyer_id=(select auth.uid())) or exists(select 1 from public.trade_offers t where (t.listing_id=listings.id or t.offered_listing_id=listings.id) and (select auth.uid()) in (t.sender_id,t.recipient_id)));
create or replace function private.trade_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.listings; offered public.listings; uid uuid:=auth.uid();
begin
 -- Internal competing-offer closure is performed only by validated privileged routines.
 if tg_op='UPDATE' and new.status='declined' and old.status='pending' and exists(select 1 from public.listings reserved_listing where reserved_listing.id in (old.listing_id,old.offered_listing_id) and reserved_listing.status='reserved') then return new; end if;
 if uid is null then raise exception 'Sign in required'; end if;
 -- Lock both item rows in stable UUID order to avoid double reservation and lock inversion.
 perform 1 from public.listings where id in (new.listing_id,new.offered_listing_id) order by id for update;
 select * into l from public.listings where id=new.listing_id;
 if l.id is null or l.status<>'active' then raise exception 'Listing is not available'; end if;
 if new.sender_id=new.recipient_id or new.recipient_id<>l.seller_id then raise exception 'Invalid trade participants'; end if;
 if new.offered_listing_id is not null then
 select * into offered from public.listings where id=new.offered_listing_id;
 if offered.id is null or offered.seller_id<>new.sender_id or offered.status<>'active' then raise exception 'Offered item unavailable'; end if;
 end if;
 if tg_op='INSERT' then
 if uid<>new.sender_id or new.status<>'pending' or not l.accepts_trades then raise exception 'Trade unavailable'; end if;
 if length(trim(new.offer_note))=0 or new.cash_amount<0 or new.cash_amount>100000 or new.cash_direction not in ('none','sender_pays','recipient_pays') then raise exception 'Invalid trade terms'; end if;
 perform private.notify(new.recipient_id,uid,'trade_offer',new.id);
 else
 if old.status<>'pending' then raise exception 'Trade is closed'; end if;
 if new.status='cancelled' then
 if uid<>old.sender_id then raise exception 'Only sender can cancel'; end if;
 elsif new.status in ('accepted','declined') then
 if uid<>old.recipient_id and not (new.status='accepted' and exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=old.id and c.recipient_id=uid and c.status='accepted')) then raise exception 'Only recipient can respond'; end if;
 else raise exception 'Invalid trade action'; end if;
 if new.status='accepted' then
 update public.listings set status='reserved',updated_at=now() where id in (new.listing_id,new.offered_listing_id);
 end if;
 perform private.notify(case when uid=new.sender_id then new.recipient_id else new.sender_id end,uid,'trade_update',new.id);
 end if;
 return new;
end $$;
revoke all on function private.trade_guard() from public,anon,authenticated;
create trigger guard_trade before insert or update on public.trade_offers for each row execute function private.trade_guard();
-- Listings reserved by an agreement cannot be reopened through seller CRUD.
create or replace function private.listing_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and old.status='reserved' then raise exception 'Reserved listing is locked'; end if;
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function private.listing_guard() from public,anon,authenticated;
create trigger guard_listing before update or delete on public.listings for each row execute function private.listing_guard();
notify pgrst,'reload schema';
commit;
