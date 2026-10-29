-- Schema-only snapshot from read-only production catalogs on 2026-10-29.
-- No customer rows, login secrets, or role passwords. Auth fixtures are minimal shims.
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
grant usage on schema public,private,auth to anon,authenticated,service_role;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create table auth.mfa_factors(id uuid primary key,user_id uuid,factor_type text,status text,created_at timestamptz,updated_at timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid,factor_id uuid,aal text,created_at timestamptz,updated_at timestamptz,not_after timestamptz);
create table public."profiles"("id" uuid not null,"username" text,"display_name" text,"avatar_url" text,"created_at" timestamptz default now() not null,"bio" text default ''::text,"favorite_tcg" text default ''::text,"location_label" text default ''::text);
create table public."stores"("id" uuid default gen_random_uuid() not null,"owner_id" uuid not null,"name" text not null,"description" text,"logo_url" text,"created_at" timestamptz default now() not null);
create table public."trades"("id" uuid default gen_random_uuid() not null,"proposer_id" uuid not null,"recipient_id" uuid not null,"cash_from_proposer" numeric default 0 not null,"cash_from_recipient" numeric default 0 not null,"platform_fee" numeric default 0 not null,"status" text default 'pending'::text not null,"terms" text,"expires_at" timestamptz,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public."trade_items"("id" uuid default gen_random_uuid() not null,"trade_id" uuid not null,"listing_id" uuid,"offered_by" uuid not null,"item_title" text not null,"agreed_value" numeric not null,"created_at" timestamptz default now() not null);
create table public."orders"("id" uuid default gen_random_uuid() not null,"buyer_id" uuid not null,"seller_id" uuid not null,"listing_id" uuid,"item_title" text not null,"item_price" numeric not null,"shipping_cost" numeric default 0 not null,"buyer_protection_fee" numeric default 0 not null,"status" text default 'pending'::text not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public."shipments"("id" uuid default gen_random_uuid() not null,"order_id" uuid,"trade_id" uuid,"sender_id" uuid not null,"recipient_id" uuid not null,"carrier" text,"tracking_number" text,"label_url" text,"status" text default 'pending'::text not null,"shipped_at" timestamptz,"delivered_at" timestamptz,"created_at" timestamptz default now() not null);
create table public."disputes"("id" uuid default gen_random_uuid() not null,"order_id" uuid,"trade_id" uuid,"opened_by" uuid not null,"reason" text not null,"description" text,"evidence_urls" text[] default '{}'::text[] not null,"status" text default 'open'::text not null,"resolution_notes" text,"created_at" timestamptz default now() not null,"resolved_at" timestamptz);
create table public."listings"("id" uuid default gen_random_uuid() not null,"seller_id" uuid not null,"store_id" uuid,"title" text not null,"description" text,"category" text not null,"product_type" text,"condition" text default 'used'::text not null,"price" numeric not null,"quantity" int4 default 1 not null,"image_urls" text[] default '{}'::text[] not null,"accepts_trades" bool default false not null,"status" text default 'active'::text not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"tcg_game" text,"accepts_price_offers" bool default true not null,"collectible_subcategory" text);
create table public."wanted_posts"("id" uuid default gen_random_uuid() not null,"user_id" uuid not null,"title" text not null,"game" text,"details" text,"offer_type" text default 'either'::text not null,"budget" numeric,"created_at" timestamptz default now() not null);
create table public."saved_listings"("user_id" uuid not null,"listing_id" uuid not null,"created_at" timestamptz default now());
create table public."collector_messages"("id" uuid default gen_random_uuid() not null,"sender_id" uuid not null,"recipient_id" uuid not null,"listing_id" uuid,"body" text not null,"created_at" timestamptz default now() not null,"read_at" timestamptz);
create table public."trade_offers"("id" uuid default gen_random_uuid() not null,"listing_id" uuid not null,"sender_id" uuid not null,"recipient_id" uuid not null,"offered_listing_id" uuid,"offer_note" text default ''::text not null,"status" text default 'pending'::text not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"cash_amount" numeric default 0 not null,"cash_direction" text default 'none'::text not null);
create table public."user_blocks"("blocker_id" uuid not null,"blocked_id" uuid not null,"created_at" timestamptz default now() not null);
create table public."trade_counteroffers"("id" uuid default gen_random_uuid() not null,"trade_offer_id" uuid not null,"proposer_id" uuid not null,"recipient_id" uuid not null,"cash_amount" numeric default 0 not null,"cash_direction" text default 'none'::text not null,"offer_note" text not null,"status" text default 'pending'::text not null,"created_at" timestamptz default now() not null);
create table public."user_reports"("id" uuid default gen_random_uuid() not null,"reporter_id" uuid not null,"reported_id" uuid,"listing_id" uuid,"reason" text not null,"details" text,"status" text default 'open'::text not null,"created_at" timestamptz default now() not null);
create table public."notification_preferences"("user_id" uuid not null,"messages" bool default true not null,"trade_offers" bool default true not null,"wanted_matches" bool default true not null,"product_updates" bool default false not null,"updated_at" timestamptz default now() not null);
create table public."notification_reads"("user_id" uuid not null,"event_key" text not null,"read_at" timestamptz default now() not null);
create table public."price_offer_history"("id" uuid default gen_random_uuid() not null,"offer_id" uuid not null,"listing_id" uuid not null,"buyer_id" uuid not null,"seller_id" uuid not null,"actor_id" uuid,"action" text not null,"amount" numeric not null,"created_at" timestamptz default now() not null);
create table public."price_offers"("id" uuid default gen_random_uuid() not null,"listing_id" uuid not null,"buyer_id" uuid not null,"seller_id" uuid not null,"amount" numeric not null,"status" text default 'pending'::text not null,"last_actor_id" uuid not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public."deal_progress"("id" uuid default gen_random_uuid() not null,"offer_type" text not null,"offer_id" uuid not null,"seller_id" uuid not null,"buyer_id" uuid not null,"status" text default 'accepted'::text not null,"updated_at" timestamptz default now() not null,"buyer_confirmed_at" timestamptz,"seller_confirmed_at" timestamptz);
create table public."collector_notifications"("id" uuid default gen_random_uuid() not null,"user_id" uuid not null,"actor_id" uuid,"kind" text not null,"source_id" uuid not null,"created_at" timestamptz default now() not null,"read_at" timestamptz);
create table public."notification_email_deliveries"("notification_id" uuid not null,"claimed_at" timestamptz default now() not null,"sent_at" timestamptz,"error" text);
create table public."seller_reviews"("id" uuid default gen_random_uuid() not null,"deal_id" uuid not null,"reviewer_id" uuid not null,"seller_id" uuid not null,"rating" int4 not null,"comment" text default ''::text not null,"created_at" timestamptz default now() not null);
create table public."moderator_roles"("user_id" uuid not null,"role" text not null,"created_at" timestamptz default now() not null);
create table public."moderation_actions"("id" int8 not null,"moderator_id" uuid not null,"report_id" uuid,"listing_id" uuid,"action" text not null,"notes" text,"created_at" timestamptz default now() not null);
create table public."demo_orders"("id" uuid default gen_random_uuid() not null,"creator_id" uuid not null,"participant_id" uuid,"creator_role" text not null,"item_name" text not null,"item_price" numeric not null,"shipping_price" numeric not null,"stage" int4 default 0 not null,"invite_code" text default upper(encode(gen_random_bytes(9), 'hex'::text)) not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
alter table public.moderation_actions alter column id add generated always as identity;
set check_function_bodies=off;
CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.deckplay_reserve_accepted_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text;
begin
 if new.status='accepted' and old.status is distinct from 'accepted' then
  select status into v_status from public.listings where id=new.listing_id for update;
  if v_status is distinct from 'active' then raise exception 'This listing is no longer available'; end if;
  update public.listings set status='reserved',updated_at=now() where id=new.listing_id;
  update public.price_offers set status='declined',updated_at=now() where listing_id=new.listing_id and id<>new.id and status in ('pending','countered');
  update public.trade_offers set status='declined' where listing_id=new.listing_id and status='pending';
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.guard_message_read_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.id is distinct from old.id or new.sender_id is distinct from old.sender_id or new.recipient_id is distinct from old.recipient_id or new.listing_id is distinct from old.listing_id or new.body is distinct from old.body or new.created_at is distinct from old.created_at then raise exception 'Only read status may be updated'; end if; if auth.uid() <> old.recipient_id then raise exception 'Only recipient may mark message read'; end if; if old.read_at is not null and new.read_at is distinct from old.read_at then raise exception 'Read receipt cannot be changed'; end if; if new.read_at is null then raise exception 'Read timestamp required'; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.deckplay_guard_new_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text;
begin
 select status into v_status from public.listings where id=new.listing_id for update;
 if v_status is distinct from 'active' then raise exception 'This listing is no longer available for offers or trades'; end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.guard_trade_offer_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.id is distinct from old.id or new.listing_id is distinct from old.listing_id or new.sender_id is distinct from old.sender_id or new.recipient_id is distinct from old.recipient_id or new.offered_listing_id is distinct from old.offered_listing_id or new.offer_note is distinct from old.offer_note or new.cash_amount is distinct from old.cash_amount or new.cash_direction is distinct from old.cash_direction or new.created_at is distinct from old.created_at then
  raise exception 'Trade offer details cannot be changed after submission';
 end if;
 if old.status <> 'pending' then raise exception 'Only pending offers can be updated'; end if;
 if pg_trigger_depth() > 1 and new.status = 'declined' then
  new.updated_at=now(); return new;
 end if;
 if auth.uid()=old.recipient_id and new.status not in ('accepted','declined') then raise exception 'Recipient can only accept or decline';
 elsif auth.uid()=old.sender_id and new.status <> 'cancelled' then raise exception 'Sender can only cancel';
 elsif auth.uid() not in (old.sender_id,old.recipient_id) then raise exception 'Not a participant';
 end if;
 new.updated_at=now(); return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.moderation_report_queue()
 RETURNS TABLE(id uuid, reason text, details text, status text, created_at timestamp with time zone, reported_id uuid, listing_id uuid, reporter_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select r.id,r.reason,r.details,r.status,r.created_at,r.reported_id,r.listing_id,r.reporter_id from public.user_reports r where public.is_deckplay_moderator() order by r.created_at desc limit 200$function$
;
CREATE OR REPLACE FUNCTION public.prevent_blocked_messages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Messaging unavailable because one collector has blocked the other.';end if;return new;end$function$
;
CREATE OR REPLACE FUNCTION public.notify_collector_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_user uuid;v_actor uuid;v_kind text;v_pref text;begin if tg_table_name='collector_messages' then v_user:=new.recipient_id;v_actor:=new.sender_id;v_kind:='message';v_pref:='messages';elsif tg_table_name='trade_counteroffers' then v_user:=new.recipient_id;v_actor:=new.proposer_id;v_kind:='counteroffer';v_pref:='trade_offers';elsif tg_table_name='trade_offers' then if tg_op='UPDATE' then if new.status is not distinct from old.status then return new;end if;v_user:=new.sender_id;v_actor:=new.recipient_id;v_kind:='trade_update';else v_user:=new.recipient_id;v_actor:=new.sender_id;v_kind:='trade_offer';end if;v_pref:='trade_offers';end if;if v_user is null or v_user=v_actor then return new;end if;if exists(select 1 from public.notification_preferences where user_id=v_user and ((v_pref='messages' and messages=false) or (v_pref='trade_offers' and trade_offers=false))) then return new;end if;if exists(select 1 from public.user_blocks where (blocker_id=v_user and blocked_id=v_actor) or (blocker_id=v_actor and blocked_id=v_user)) then return new;end if;insert into public.collector_notifications(user_id,actor_id,kind,source_id) values(v_user,v_actor,v_kind,new.id) on conflict(user_id,kind,source_id) do update set read_at=null,created_at=now();return new;end$function$
;
CREATE OR REPLACE FUNCTION public.create_trade_counter(p_offer uuid, p_cash numeric, p_direction text, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare o public.trade_offers%rowtype; new_id uuid; begin select * into o from public.trade_offers where id=p_offer for update; if not found or o.status<>'pending' or o.recipient_id<>auth.uid() then raise exception 'Offer not available for countering'; end if; if exists(select 1 from public.trade_counteroffers where trade_offer_id=p_offer and status='pending') then raise exception 'A counteroffer is already pending'; end if; if p_cash is null or p_cash<0 or p_cash>100000 or round(p_cash,2)<>p_cash or ((p_cash=0)<>(p_direction='none')) or p_direction not in ('none','sender_pays','recipient_pays') then raise exception 'Invalid cash proposal'; end if; if length(trim(coalesce(p_note,'')))<1 or length(p_note)>1500 then raise exception 'Add a description'; end if; insert into public.trade_counteroffers(trade_offer_id,proposer_id,recipient_id,cash_amount,cash_direction,offer_note) values(p_offer,auth.uid(),o.sender_id,p_cash,p_direction,trim(p_note)) returning id into new_id; return new_id; end $function$
;
CREATE OR REPLACE FUNCTION public.respond_trade_counter(p_counter uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare c public.trade_counteroffers%rowtype; o public.trade_offers%rowtype; begin select * into c from public.trade_counteroffers where id=p_counter for update; if not found or c.status<>'pending' or c.recipient_id<>auth.uid() then raise exception 'Counteroffer unavailable'; end if; select * into o from public.trade_offers where id=c.trade_offer_id for update; if not found or o.status<>'pending' then raise exception 'Original offer no longer pending'; end if; update public.trade_counteroffers set status=case when p_accept then 'accepted' else 'declined' end where id=p_counter; if p_accept then update public.trade_offers set status='declined' where id=o.id; end if; end $function$
;
CREATE OR REPLACE FUNCTION public.notify_price_offer_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_recipient uuid;v_actor uuid;v_kind text;begin if tg_op='INSERT' then v_recipient:=new.seller_id;v_actor:=new.buyer_id;v_kind:='price_offer';elsif new.status='countered' and (old.amount is distinct from new.amount or old.last_actor_id is distinct from new.last_actor_id) then v_actor:=new.last_actor_id;v_recipient:=case when v_actor=new.buyer_id then new.seller_id else new.buyer_id end;v_kind:='price_counter';elsif new.status in ('accepted','declined','withdrawn') and old.status is distinct from new.status then v_recipient:=new.last_actor_id;v_actor:=case when v_recipient=new.buyer_id then new.seller_id else new.buyer_id end;v_kind:='price_update';else return new;end if;if v_recipient is null or v_recipient=v_actor then return new;end if;if exists(select 1 from public.notification_preferences where user_id=v_recipient and trade_offers=false) then return new;end if;if exists(select 1 from public.user_blocks where (blocker_id=new.buyer_id and blocked_id=new.seller_id) or (blocker_id=new.seller_id and blocked_id=new.buyer_id)) then return new;end if;insert into public.collector_notifications(user_id,actor_id,kind,source_id) values(v_recipient,v_actor,v_kind,new.id) on conflict(user_id,kind,source_id) do update set read_at=null,created_at=now();return new;end$function$
;
CREATE OR REPLACE FUNCTION public.deckplay_reserve_accepted_trade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text;
begin
 if new.status='accepted' and old.status is distinct from 'accepted' then
  select status into v_status from public.listings where id=new.listing_id for update;
  if v_status is distinct from 'active' then raise exception 'This listing is no longer available'; end if;
  update public.listings set status='reserved',updated_at=now() where id=new.listing_id;
  update public.trade_offers set status='declined' where listing_id=new.listing_id and id<>new.id and status='pending';
  update public.price_offers set status='declined',updated_at=now() where listing_id=new.listing_id and status in ('pending','countered');
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.deckplay_guard_listing_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if old.status='reserved' and new.status='active' then raise exception 'Reserved listings cannot be reopened without completing or cancelling the transaction'; end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.finalize_deal_after_confirmation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if new.buyer_confirmed_at is not null and new.seller_confirmed_at is not null and new.status not in ('completed','cancelled') then new.status='completed'; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.guard_deal_progress_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if new.status<>'accepted' or new.buyer_confirmed_at is not null or new.seller_confirmed_at is not null then raise exception 'New deals must start accepted and unconfirmed'; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.guard_deal_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if new.id<>old.id or new.offer_id<>old.offer_id or new.offer_type<>old.offer_type or new.seller_id<>old.seller_id or new.buyer_id<>old.buyer_id then raise exception 'Deal identity cannot be changed'; end if; if old.status in ('completed','cancelled') and new is distinct from old then raise exception 'Closed deals cannot be modified'; end if; if new.buyer_confirmed_at is distinct from old.buyer_confirmed_at and (auth.uid() is distinct from old.buyer_id or old.buyer_confirmed_at is not null or new.buyer_confirmed_at is null or new.buyer_confirmed_at > now() + interval '1 minute') then raise exception 'Only the buyer can confirm once'; end if; if new.seller_confirmed_at is distinct from old.seller_confirmed_at and (auth.uid() is distinct from old.seller_id or old.seller_confirmed_at is not null or new.seller_confirmed_at is null or new.seller_confirmed_at > now() + interval '1 minute') then raise exception 'Only the seller can confirm once'; end if; if new.status='completed' and (new.buyer_confirmed_at is null or new.seller_confirmed_at is null) then raise exception 'Both must confirm'; end if; if new.status='cancelled' and (old.buyer_confirmed_at is not null or old.seller_confirmed_at is not null) then raise exception 'Cannot cancel after either collector confirmed; contact support'; end if; return new; end $function$
;
CREATE OR REPLACE FUNCTION public.lock_listing_on_agreement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text;
begin
 if tg_table_name='price_offers' then
  if tg_op='INSERT' then select status into v_status from public.listings where id=new.listing_id for update; if v_status is distinct from 'active' then raise exception 'Listing is no longer available';end if;return new;end if;
  if new.status='accepted' and old.status is distinct from 'accepted' then
   select status into v_status from public.listings where id=new.listing_id for update;
   if v_status is distinct from 'active' then raise exception 'This listing is already reserved';end if;
   update public.listings set status='reserved',updated_at=now() where id=new.listing_id;
   update public.price_offers set status='declined',updated_at=now() where listing_id=new.listing_id and id<>new.id and status in ('pending','countered');
   update public.trade_offers set status='declined',updated_at=now() where listing_id=new.listing_id and status='pending';
  elsif new.status in ('pending','countered') then
   select status into v_status from public.listings where id=new.listing_id;
   if v_status is distinct from 'active' then raise exception 'Listing is reserved';end if;
  end if;
 else
  if tg_op='INSERT' then select status into v_status from public.listings where id=new.listing_id for update; if v_status is distinct from 'active' then raise exception 'Listing is no longer available';end if;return new;end if;
  if new.status='accepted' and old.status is distinct from 'accepted' then
   select status into v_status from public.listings where id=new.listing_id for update;
   if v_status is distinct from 'active' then raise exception 'This listing is already reserved';end if;
   update public.listings set status='reserved',updated_at=now() where id=new.listing_id;
   update public.price_offers set status='declined',updated_at=now() where listing_id=new.listing_id and status in ('pending','countered');
   update public.trade_offers set status='declined',updated_at=now() where listing_id=new.listing_id and id<>new.id and status='pending';
  elsif new.status='pending' then
   select status into v_status from public.listings where id=new.listing_id;
   if v_status is distinct from 'active' then raise exception 'Listing is reserved';end if;
  end if;
 end if;
 return new;
end$function$
;
CREATE OR REPLACE FUNCTION public.record_price_offer_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_action text;v_actor uuid;
begin
 if tg_op='INSERT' then v_action:='offered';v_actor:=new.buyer_id;
 elsif new.status='countered' and (new.amount is distinct from old.amount or new.last_actor_id is distinct from old.last_actor_id) then v_action:='countered';v_actor:=new.last_actor_id;
 elsif new.status is distinct from old.status and new.status in ('accepted','declined','withdrawn') then v_action:=new.status;v_actor:=case when new.status='withdrawn' then new.last_actor_id when new.last_actor_id=new.buyer_id then new.seller_id else new.buyer_id end;
 else return new;end if;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount,created_at)
 values(new.id,new.listing_id,new.buyer_id,new.seller_id,v_actor,v_action,new.amount,coalesce(new.updated_at,now()));
 return new;
end$function$
;
CREATE OR REPLACE FUNCTION public.respond_price_offer(p_offer_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_offer public.price_offers%rowtype;v_uid uuid:=auth.uid();begin if v_uid is null then raise exception 'Sign in required';end if;select * into v_offer from public.price_offers where id=p_offer_id for update;if not found or v_uid not in(v_offer.buyer_id,v_offer.seller_id) then raise exception 'Offer not found';end if;if v_offer.status not in ('pending','countered') then raise exception 'Offer is closed';end if;if p_action='counter' then if v_offer.last_actor_id=v_uid then raise exception 'Wait for the other collector to respond';end if;if p_amount is null or p_amount<0.01 or p_amount>100000 then raise exception 'Invalid counteroffer amount';end if;update public.price_offers set amount=p_amount,status='countered',last_actor_id=v_uid,updated_at=now() where id=p_offer_id;elsif p_action='accept' then if v_offer.last_actor_id=v_uid then raise exception 'You cannot accept your own offer';end if;update public.price_offers set status='accepted',updated_at=now() where id=p_offer_id;elsif p_action='decline' then if v_offer.last_actor_id=v_uid then raise exception 'You cannot decline your own offer';end if;update public.price_offers set status='declined',updated_at=now() where id=p_offer_id;elsif p_action='withdraw' then if v_offer.last_actor_id<>v_uid then raise exception 'Only the last offer maker can withdraw';end if;update public.price_offers set status='withdrawn',updated_at=now() where id=p_offer_id;else raise exception 'Unknown action';end if;end$function$
;
CREATE OR REPLACE FUNCTION public.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_listing public.listings%rowtype;v_id uuid;v_uid uuid:=auth.uid();begin if v_uid is null then raise exception 'Sign in required';end if;select * into v_listing from public.listings where id=p_listing_id and status='active' and accepts_price_offers=true;if not found then raise exception 'This listing does not accept price offers';end if;if v_uid=v_listing.seller_id then raise exception 'You cannot offer on your own listing';end if;if p_amount is null or p_amount<0.01 or p_amount>100000 then raise exception 'Enter a valid offer amount';end if;if exists(select 1 from public.user_blocks where (blocker_id=v_uid and blocked_id=v_listing.seller_id) or (blocker_id=v_listing.seller_id and blocked_id=v_uid)) then raise exception 'Offer unavailable';end if;insert into public.price_offers(listing_id,buyer_id,seller_id,amount,last_actor_id) values(p_listing_id,v_uid,v_listing.seller_id,p_amount,v_uid) returning id into v_id;return v_id;end$function$
;
CREATE OR REPLACE FUNCTION public.claim_notification_email(p_notification_id uuid, p_actor uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_count integer;begin if auth.uid() is null or auth.uid()<>p_actor then return false;end if;insert into public.notification_email_deliveries(notification_id) select n.id from public.collector_notifications n where n.id=p_notification_id and n.actor_id=p_actor and n.created_at>now()-interval '10 minutes' and not exists(select 1 from public.notification_preferences p where p.user_id=n.user_id and p.trade_offers=false and n.kind in ('trade_offer','counteroffer','trade_update','price_offer','price_counter','price_update')) and not exists(select 1 from public.notification_preferences p where p.user_id=n.user_id and p.messages=false and n.kind='message') on conflict do nothing;get diagnostics v_count=row_count;return v_count=1;end$function$
;
CREATE OR REPLACE FUNCTION public.is_deckplay_moderator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select exists(select 1 from public.moderator_roles where user_id=(select auth.uid()) and role in ('owner','moderator'))$function$
;
CREATE OR REPLACE FUNCTION public.advance_deckplay_demo_order(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin update public.demo_orders set stage=stage+1,updated_at=now() where id=p_id and stage<4 and (creator_id=auth.uid() or participant_id=auth.uid());if not found then raise exception 'Order not found or already complete';end if;return true;end$function$
;
CREATE OR REPLACE FUNCTION public.hide_deckplay_listing(p_listing_id uuid, p_report_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if not public.is_deckplay_moderator() then raise exception 'Not authorized';end if;if p_report_id is not null and not exists(select 1 from public.user_reports where id=p_report_id and listing_id=p_listing_id) then raise exception 'Report does not match listing';end if;update public.listings set status='removed' where id=p_listing_id and status='active';if not found then raise exception 'Active listing not found';end if;insert into public.moderation_actions(moderator_id,report_id,listing_id,action,notes) values(auth.uid(),p_report_id,p_listing_id,'listing_removed',left(p_notes,1000));return true;end$function$
;
CREATE OR REPLACE FUNCTION public.delete_deckplay_demo_order(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if auth.uid() is null then raise exception 'Sign in required'; end if; delete from public.demo_orders where id=p_id and creator_id=auth.uid(); if not found then raise exception 'Only the demo creator can delete this test order'; end if; return true; end $function$
;
CREATE OR REPLACE FUNCTION public.join_deckplay_demo_order(p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_id uuid;begin if auth.uid() is null then raise exception 'Sign in required';end if;update public.demo_orders set participant_id=auth.uid(),updated_at=now() where invite_code=upper(trim(p_code)) and participant_id is null and creator_id<>auth.uid() returning id into v_id;if v_id is null then raise exception 'Invite code invalid or already used';end if;return v_id;end$function$
;
CREATE OR REPLACE FUNCTION public.review_deckplay_report(p_report_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if not public.is_deckplay_moderator() then raise exception 'Not authorized';end if;if p_status not in ('open','reviewing','resolved') then raise exception 'Invalid status';end if;update public.user_reports set status=p_status where id=p_report_id;if not found then raise exception 'Report not found';end if;insert into public.moderation_actions(moderator_id,report_id,action,notes) values(auth.uid(),p_report_id,'report_'||p_status,left(p_notes,1000));return true;end$function$
;
alter table public."profiles" add constraint "profiles_bio_check" CHECK ((char_length(bio) <= 300));
alter table public."profiles" add constraint "profiles_location_label_check" CHECK ((char_length(location_label) <= 80));
alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_username_format" CHECK (((username IS NULL) OR (username ~ '^[A-Za-z0-9_]{3,20}$'::text)));
alter table public."profiles" add constraint "profiles_username_key" UNIQUE (username);
alter table public."stores" add constraint "stores_pkey" PRIMARY KEY (id);
alter table public."trades" add constraint "trades_cash_from_proposer_check" CHECK ((cash_from_proposer >= (0)::numeric));
alter table public."trades" add constraint "trades_cash_from_recipient_check" CHECK ((cash_from_recipient >= (0)::numeric));
alter table public."trades" add constraint "trades_check" CHECK ((proposer_id <> recipient_id));
alter table public."trades" add constraint "trades_pkey" PRIMARY KEY (id);
alter table public."trades" add constraint "trades_platform_fee_check" CHECK (((platform_fee >= (0)::numeric) AND (platform_fee <= (5)::numeric)));
alter table public."trades" add constraint "trades_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'countered'::text, 'accepted'::text, 'shipping'::text, 'delivered'::text, 'disputed'::text, 'completed'::text, 'cancelled'::text])));
alter table public."trade_items" add constraint "trade_items_agreed_value_check" CHECK ((agreed_value >= (0)::numeric));
alter table public."trade_items" add constraint "trade_items_pkey" PRIMARY KEY (id);
alter table public."orders" add constraint "orders_buyer_protection_fee_check" CHECK ((buyer_protection_fee >= (0)::numeric));
alter table public."orders" add constraint "orders_check" CHECK ((buyer_id <> seller_id));
alter table public."orders" add constraint "orders_item_price_check" CHECK ((item_price >= (0)::numeric));
alter table public."orders" add constraint "orders_pkey" PRIMARY KEY (id);
alter table public."orders" add constraint "orders_shipping_cost_check" CHECK ((shipping_cost >= (0)::numeric));
alter table public."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'disputed'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text])));
alter table public."shipments" add constraint "shipments_check" CHECK ((((order_id IS NOT NULL) AND (trade_id IS NULL)) OR ((order_id IS NULL) AND (trade_id IS NOT NULL))));
alter table public."shipments" add constraint "shipments_pkey" PRIMARY KEY (id);
alter table public."shipments" add constraint "shipments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'label_created'::text, 'in_transit'::text, 'delivered'::text, 'exception'::text, 'returned'::text])));
alter table public."disputes" add constraint "disputes_check" CHECK ((((order_id IS NOT NULL) AND (trade_id IS NULL)) OR ((order_id IS NULL) AND (trade_id IS NOT NULL))));
alter table public."disputes" add constraint "disputes_pkey" PRIMARY KEY (id);
alter table public."disputes" add constraint "disputes_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'under_review'::text, 'resolved'::text, 'rejected'::text])));
alter table public."listings" add constraint "listings_category_check" CHECK ((category = ANY (ARRAY['trading_cards'::text, 'video_games'::text, 'consoles'::text, 'controllers'::text, 'accessories'::text, 'collectibles'::text, 'other'::text])));
alter table public."listings" add constraint "listings_collectible_subcategory_check" CHECK (((collectible_subcategory IS NULL) OR ((category = ANY (ARRAY['collectibles'::text, 'other'::text])) AND (collectible_subcategory = ANY (ARRAY['anime_manga'::text, 'sports_memorabilia'::text, 'figures_statues'::text, 'funko_vinyl'::text, 'comics_books'::text, 'toys_retro'::text, 'other_collectibles'::text])))));
alter table public."listings" add constraint "listings_condition_check" CHECK ((condition = ANY (ARRAY['new'::text, 'like_new'::text, 'used'::text, 'damaged'::text, 'graded'::text])));
alter table public."listings" add constraint "listings_pkey" PRIMARY KEY (id);
alter table public."listings" add constraint "listings_price_check" CHECK ((price >= (0)::numeric));
alter table public."listings" add constraint "listings_quantity_check" CHECK ((quantity >= 0));
alter table public."listings" add constraint "listings_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'reserved'::text, 'sold'::text, 'removed'::text])));
alter table public."wanted_posts" add constraint "wanted_posts_budget_check" CHECK (((budget IS NULL) OR (budget >= (0)::numeric)));
alter table public."wanted_posts" add constraint "wanted_posts_details_check" CHECK ((char_length(details) <= 2000));
alter table public."wanted_posts" add constraint "wanted_posts_offer_type_check" CHECK ((offer_type = ANY (ARRAY['buy'::text, 'trade'::text, 'either'::text])));
alter table public."wanted_posts" add constraint "wanted_posts_pkey" PRIMARY KEY (id);
alter table public."wanted_posts" add constraint "wanted_posts_title_check" CHECK (((char_length(title) >= 3) AND (char_length(title) <= 120)));
alter table public."saved_listings" add constraint "saved_listings_pkey" PRIMARY KEY (user_id, listing_id);
alter table public."collector_messages" add constraint "collector_messages_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)));
alter table public."collector_messages" add constraint "collector_messages_check" CHECK ((sender_id <> recipient_id));
alter table public."collector_messages" add constraint "collector_messages_pkey" PRIMARY KEY (id);
alter table public."trade_offers" add constraint "trade_cash_direction_valid" CHECK ((((cash_amount = (0)::numeric) AND (cash_direction = 'none'::text)) OR ((cash_amount > (0)::numeric) AND (cash_direction = ANY (ARRAY['sender_pays'::text, 'recipient_pays'::text])))));
alter table public."trade_offers" add constraint "trade_offers_cash_amount_check" CHECK (((cash_amount >= (0)::numeric) AND (cash_amount <= (100000)::numeric)));
alter table public."trade_offers" add constraint "trade_offers_cash_direction_check" CHECK ((cash_direction = ANY (ARRAY['none'::text, 'sender_pays'::text, 'recipient_pays'::text])));
alter table public."trade_offers" add constraint "trade_offers_check" CHECK ((sender_id <> recipient_id));
alter table public."trade_offers" add constraint "trade_offers_offer_note_check" CHECK ((char_length(offer_note) <= 1500));
alter table public."trade_offers" add constraint "trade_offers_pkey" PRIMARY KEY (id);
alter table public."trade_offers" add constraint "trade_offers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text])));
alter table public."user_blocks" add constraint "no_self_block" CHECK ((blocker_id <> blocked_id));
alter table public."user_blocks" add constraint "user_blocks_pkey" PRIMARY KEY (blocker_id, blocked_id);
alter table public."trade_counteroffers" add constraint "trade_counteroffers_cash_amount_check" CHECK (((cash_amount >= (0)::numeric) AND (cash_amount <= (100000)::numeric)));
alter table public."trade_counteroffers" add constraint "trade_counteroffers_cash_direction_check" CHECK ((cash_direction = ANY (ARRAY['none'::text, 'sender_pays'::text, 'recipient_pays'::text])));
alter table public."trade_counteroffers" add constraint "trade_counteroffers_offer_note_check" CHECK (((char_length(TRIM(BOTH FROM offer_note)) >= 1) AND (char_length(TRIM(BOTH FROM offer_note)) <= 1500)));
alter table public."trade_counteroffers" add constraint "trade_counteroffers_pkey" PRIMARY KEY (id);
alter table public."trade_counteroffers" add constraint "trade_counteroffers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));
alter table public."trade_counteroffers" add constraint "valid_counter_cash" CHECK ((((cash_amount = (0)::numeric) AND (cash_direction = 'none'::text)) OR ((cash_amount > (0)::numeric) AND (cash_direction <> 'none'::text))));
alter table public."user_reports" add constraint "not_self_report" CHECK (((reported_id IS NULL) OR (reporter_id <> reported_id)));
alter table public."user_reports" add constraint "user_reports_details_check" CHECK ((length(details) <= 2000));
alter table public."user_reports" add constraint "user_reports_pkey" PRIMARY KEY (id);
alter table public."user_reports" add constraint "user_reports_reason_check" CHECK ((reason = ANY (ARRAY['spam'::text, 'scam'::text, 'harassment'::text, 'prohibited'::text, 'other'::text])));
alter table public."user_reports" add constraint "user_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text])));
alter table public."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY (user_id);
alter table public."notification_reads" add constraint "notification_reads_event_key_check" CHECK (((length(event_key) >= 3) AND (length(event_key) <= 150)));
alter table public."notification_reads" add constraint "notification_reads_pkey" PRIMARY KEY (user_id, event_key);
alter table public."price_offer_history" add constraint "price_offer_history_pkey" PRIMARY KEY (id);
alter table public."price_offers" add constraint "distinct_price_offer_parties" CHECK ((buyer_id <> seller_id));
alter table public."price_offers" add constraint "price_offers_amount_check" CHECK (((amount >= 0.01) AND (amount <= (100000)::numeric)));
alter table public."price_offers" add constraint "price_offers_pkey" PRIMARY KEY (id);
alter table public."price_offers" add constraint "price_offers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'countered'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text])));
alter table public."deal_progress" add constraint "deal_progress_offer_type_check" CHECK ((offer_type = ANY (ARRAY['price'::text, 'trade'::text])));
alter table public."deal_progress" add constraint "deal_progress_offer_type_offer_id_key" UNIQUE (offer_type, offer_id);
alter table public."deal_progress" add constraint "deal_progress_pkey" PRIMARY KEY (id);
alter table public."deal_progress" add constraint "deal_progress_status_check" CHECK ((status = ANY (ARRAY['accepted'::text, 'arranging'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])));
alter table public."collector_notifications" add constraint "collector_notifications_kind_check" CHECK ((kind = ANY (ARRAY['message'::text, 'trade_offer'::text, 'counteroffer'::text, 'trade_update'::text, 'price_offer'::text, 'price_counter'::text, 'price_update'::text])));
alter table public."collector_notifications" add constraint "collector_notifications_pkey" PRIMARY KEY (id);
alter table public."collector_notifications" add constraint "collector_notifications_user_id_kind_source_id_key" UNIQUE (user_id, kind, source_id);
alter table public."notification_email_deliveries" add constraint "notification_email_deliveries_pkey" PRIMARY KEY (notification_id);
alter table public."seller_reviews" add constraint "seller_reviews_comment_check" CHECK ((length(comment) <= 600));
alter table public."seller_reviews" add constraint "seller_reviews_deal_id_reviewer_id_key" UNIQUE (deal_id, reviewer_id);
alter table public."seller_reviews" add constraint "seller_reviews_pkey" PRIMARY KEY (id);
alter table public."seller_reviews" add constraint "seller_reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)));
alter table public."moderator_roles" add constraint "moderator_roles_pkey" PRIMARY KEY (user_id);
alter table public."moderator_roles" add constraint "moderator_roles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'moderator'::text])));
alter table public."moderation_actions" add constraint "moderation_actions_pkey" PRIMARY KEY (id);
alter table public."demo_orders" add constraint "demo_orders_creator_role_check" CHECK ((creator_role = ANY (ARRAY['buyer'::text, 'seller'::text])));
alter table public."demo_orders" add constraint "demo_orders_invite_code_key" UNIQUE (invite_code);
alter table public."demo_orders" add constraint "demo_orders_item_name_check" CHECK (((length(item_name) >= 1) AND (length(item_name) <= 100)));
alter table public."demo_orders" add constraint "demo_orders_item_price_check" CHECK (((item_price >= (0)::numeric) AND (item_price <= (100000)::numeric)));
alter table public."demo_orders" add constraint "demo_orders_pkey" PRIMARY KEY (id);
alter table public."demo_orders" add constraint "demo_orders_shipping_price_check" CHECK (((shipping_price >= (0)::numeric) AND (shipping_price <= (1000)::numeric)));
alter table public."demo_orders" add constraint "demo_orders_stage_check" CHECK (((stage >= 0) AND (stage <= 4)));
alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."stores" add constraint "stores_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."trades" add constraint "trades_proposer_id_fkey" FOREIGN KEY (proposer_id) REFERENCES profiles(id);
alter table public."trades" add constraint "trades_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id);
alter table public."trade_items" add constraint "trade_items_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
alter table public."trade_items" add constraint "trade_items_offered_by_fkey" FOREIGN KEY (offered_by) REFERENCES profiles(id);
alter table public."trade_items" add constraint "trade_items_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE;
alter table public."orders" add constraint "orders_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES profiles(id);
alter table public."orders" add constraint "orders_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
alter table public."orders" add constraint "orders_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES profiles(id);
alter table public."shipments" add constraint "shipments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public."shipments" add constraint "shipments_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id);
alter table public."shipments" add constraint "shipments_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id);
alter table public."shipments" add constraint "shipments_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE;
alter table public."disputes" add constraint "disputes_opened_by_fkey" FOREIGN KEY (opened_by) REFERENCES profiles(id);
alter table public."disputes" add constraint "disputes_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public."disputes" add constraint "disputes_trade_id_fkey" FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE;
alter table public."listings" add constraint "listings_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."listings" add constraint "listings_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
alter table public."wanted_posts" add constraint "wanted_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."saved_listings" add constraint "saved_listings_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
alter table public."saved_listings" add constraint "saved_listings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."collector_messages" add constraint "collector_messages_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
alter table public."collector_messages" add constraint "collector_messages_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."collector_messages" add constraint "collector_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."trade_offers" add constraint "trade_offers_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
alter table public."trade_offers" add constraint "trade_offers_offered_listing_id_fkey" FOREIGN KEY (offered_listing_id) REFERENCES listings(id) ON DELETE SET NULL;
alter table public."trade_offers" add constraint "trade_offers_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."trade_offers" add constraint "trade_offers_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_blocks" add constraint "user_blocks_blocked_id_fkey" FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_blocks" add constraint "user_blocks_blocker_id_fkey" FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."trade_counteroffers" add constraint "trade_counteroffers_proposer_id_fkey" FOREIGN KEY (proposer_id) REFERENCES auth.users(id);
alter table public."trade_counteroffers" add constraint "trade_counteroffers_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id);
alter table public."trade_counteroffers" add constraint "trade_counteroffers_trade_offer_id_fkey" FOREIGN KEY (trade_offer_id) REFERENCES trade_offers(id) ON DELETE CASCADE;
alter table public."user_reports" add constraint "user_reports_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
alter table public."user_reports" add constraint "user_reports_reported_id_fkey" FOREIGN KEY (reported_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."user_reports" add constraint "user_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notification_reads" add constraint "notification_reads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."price_offer_history" add constraint "price_offer_history_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES price_offers(id) ON DELETE CASCADE;
alter table public."price_offers" add constraint "price_offers_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."price_offers" add constraint "price_offers_last_actor_id_fkey" FOREIGN KEY (last_actor_id) REFERENCES auth.users(id);
alter table public."price_offers" add constraint "price_offers_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
alter table public."price_offers" add constraint "price_offers_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."deal_progress" add constraint "deal_progress_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES auth.users(id);
alter table public."deal_progress" add constraint "deal_progress_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table public."collector_notifications" add constraint "collector_notifications_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."collector_notifications" add constraint "collector_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notification_email_deliveries" add constraint "notification_email_deliveries_notification_id_fkey" FOREIGN KEY (notification_id) REFERENCES collector_notifications(id) ON DELETE CASCADE;
alter table public."seller_reviews" add constraint "seller_reviews_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES deal_progress(id) ON DELETE CASCADE;
alter table public."seller_reviews" add constraint "seller_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);
alter table public."seller_reviews" add constraint "seller_reviews_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table public."moderator_roles" add constraint "moderator_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."moderation_actions" add constraint "moderation_actions_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table public."moderation_actions" add constraint "moderation_actions_moderator_id_fkey" FOREIGN KEY (moderator_id) REFERENCES auth.users(id);
alter table public."moderation_actions" add constraint "moderation_actions_report_id_fkey" FOREIGN KEY (report_id) REFERENCES user_reports(id);
alter table public."demo_orders" add constraint "demo_orders_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES auth.users(id);
alter table public."demo_orders" add constraint "demo_orders_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES auth.users(id);
CREATE UNIQUE INDEX profiles_username_case_insensitive_unique ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);
CREATE INDEX trades_proposer_id_idx ON public.trades USING btree (proposer_id);
CREATE INDEX trades_recipient_id_idx ON public.trades USING btree (recipient_id);
CREATE INDEX orders_buyer_id_idx ON public.orders USING btree (buyer_id);
CREATE INDEX orders_seller_id_idx ON public.orders USING btree (seller_id);
CREATE INDEX shipments_trade_id_idx ON public.shipments USING btree (trade_id);
CREATE INDEX disputes_status_idx ON public.disputes USING btree (status);
CREATE INDEX listings_category_status_idx ON public.listings USING btree (category, status);
CREATE INDEX listings_seller_id_idx ON public.listings USING btree (seller_id);
CREATE INDEX listings_tcg_game_idx ON public.listings USING btree (tcg_game);
CREATE INDEX collector_messages_recipient_idx ON public.collector_messages USING btree (recipient_id, created_at DESC);
CREATE INDEX trade_offers_recipient_idx ON public.trade_offers USING btree (recipient_id, created_at DESC);
CREATE INDEX trade_offers_sender_idx ON public.trade_offers USING btree (sender_id, created_at DESC);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks USING btree (blocked_id);
CREATE INDEX idx_user_reports_reported ON public.user_reports USING btree (reported_id);
CREATE INDEX price_offer_history_offer_idx ON public.price_offer_history USING btree (offer_id, created_at);
CREATE INDEX price_offer_history_buyer_idx ON public.price_offer_history USING btree (buyer_id, created_at DESC);
CREATE INDEX price_offer_history_seller_idx ON public.price_offer_history USING btree (seller_id, created_at DESC);
CREATE INDEX price_offers_buyer_idx ON public.price_offers USING btree (buyer_id, updated_at DESC);
CREATE INDEX price_offers_seller_idx ON public.price_offers USING btree (seller_id, updated_at DESC);
CREATE INDEX collector_notifications_user_date ON public.collector_notifications USING btree (user_id, created_at DESC);
alter table public."profiles" enable row level security;
alter table public."stores" enable row level security;
alter table public."trades" enable row level security;
alter table public."trade_items" enable row level security;
alter table public."orders" enable row level security;
alter table public."shipments" enable row level security;
alter table public."disputes" enable row level security;
alter table public."listings" enable row level security;
alter table public."wanted_posts" enable row level security;
alter table public."saved_listings" enable row level security;
alter table public."collector_messages" enable row level security;
alter table public."trade_offers" enable row level security;
alter table public."user_blocks" enable row level security;
alter table public."trade_counteroffers" enable row level security;
alter table public."user_reports" enable row level security;
alter table public."notification_preferences" enable row level security;
alter table public."notification_reads" enable row level security;
alter table public."price_offer_history" enable row level security;
alter table public."price_offers" enable row level security;
alter table public."deal_progress" enable row level security;
alter table public."collector_notifications" enable row level security;
alter table public."notification_email_deliveries" enable row level security;
alter table public."seller_reviews" enable row level security;
alter table public."moderator_roles" enable row level security;
alter table public."moderation_actions" enable row level security;
alter table public."demo_orders" enable row level security;
create policy "Members can view profiles" on public."profiles" as PERMISSIVE for SELECT to "authenticated" using (true);
create policy "Anyone can view stores" on public."stores" as PERMISSIVE for SELECT to "public" using (true);
create policy "Owners can create stores" on public."stores" as PERMISSIVE for INSERT to "authenticated" with check ((owner_id = auth.uid()));
create policy "Owners can update stores" on public."stores" as PERMISSIVE for UPDATE to "authenticated" using ((owner_id = auth.uid())) with check ((owner_id = auth.uid()));
create policy "Trade participants can view their trades" on public."trades" as PERMISSIVE for SELECT to "authenticated" using (((proposer_id = auth.uid()) OR (recipient_id = auth.uid())));
create policy "Members can propose trades" on public."trades" as PERMISSIVE for INSERT to "authenticated" with check ((proposer_id = auth.uid()));
create policy "Trade participants can update trades" on public."trades" as PERMISSIVE for UPDATE to "authenticated" using (((proposer_id = auth.uid()) OR (recipient_id = auth.uid()))) with check (((proposer_id = auth.uid()) OR (recipient_id = auth.uid())));
create policy "Participants can view trade items" on public."trade_items" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = trade_items.trade_id) AND ((t.proposer_id = auth.uid()) OR (t.recipient_id = auth.uid()))))));
create policy "Participants can add trade items" on public."trade_items" as PERMISSIVE for INSERT to "authenticated" with check (((offered_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = trade_items.trade_id) AND ((t.proposer_id = auth.uid()) OR (t.recipient_id = auth.uid())) AND (t.status = ANY (ARRAY['pending'::text, 'countered'::text])))))));
create policy "Buyers and sellers can view orders" on public."orders" as PERMISSIVE for SELECT to "authenticated" using (((buyer_id = auth.uid()) OR (seller_id = auth.uid())));
create policy "Buyers can create orders" on public."orders" as PERMISSIVE for INSERT to "authenticated" with check ((buyer_id = auth.uid()));
create policy "Shipment participants can view shipments" on public."shipments" as PERMISSIVE for SELECT to "authenticated" using (((sender_id = auth.uid()) OR (recipient_id = auth.uid())));
create policy "Dispute participants can view disputes" on public."disputes" as PERMISSIVE for SELECT to "authenticated" using (((opened_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND ((o.buyer_id = auth.uid()) OR (o.seller_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = disputes.trade_id) AND ((t.proposer_id = auth.uid()) OR (t.recipient_id = auth.uid())))))));
create policy "Members can open disputes" on public."disputes" as PERMISSIVE for INSERT to "authenticated" with check (((opened_by = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND ((o.buyer_id = auth.uid()) OR (o.seller_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = disputes.trade_id) AND ((t.proposer_id = auth.uid()) OR (t.recipient_id = auth.uid()))))))));
create policy "Anyone can view active listings" on public."listings" as PERMISSIVE for SELECT to "public" using (((status = 'active'::text) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "Sellers can create listings" on public."listings" as PERMISSIVE for INSERT to "authenticated" with check ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "Sellers can update their listings" on public."listings" as PERMISSIVE for UPDATE to "authenticated" using ((seller_id = ( SELECT auth.uid() AS uid))) with check ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "Sellers can delete their listings" on public."listings" as PERMISSIVE for DELETE to "authenticated" using ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "Trade participants can update statuses" on public."trade_offers" as PERMISSIVE for UPDATE to "authenticated" using ((((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)) OR ((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)))) with check ((((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text]))) OR ((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'cancelled'::text))));
create policy "Members can create their own profile" on public."profiles" as PERMISSIVE for INSERT to "authenticated" with check ((id = ( SELECT auth.uid() AS uid)));
create policy "Members can update their own profile" on public."profiles" as PERMISSIVE for UPDATE to "authenticated" using ((id = ( SELECT auth.uid() AS uid))) with check ((id = ( SELECT auth.uid() AS uid)));
create policy "Anyone can browse wanted posts" on public."wanted_posts" as PERMISSIVE for SELECT to "anon","authenticated" using (true);
create policy "Members create own wanted posts" on public."wanted_posts" as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members update own wanted posts" on public."wanted_posts" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members delete own wanted posts" on public."wanted_posts" as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members read own saved listings" on public."saved_listings" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members save own listings" on public."saved_listings" as PERMISSIVE for INSERT to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members unsave own listings" on public."saved_listings" as PERMISSIVE for DELETE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Participants can read messages" on public."collector_messages" as PERMISSIVE for SELECT to "authenticated" using (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Members can send their own messages" on public."collector_messages" as PERMISSIVE for INSERT to "authenticated" with check ((sender_id = ( SELECT auth.uid() AS uid)));
create policy "Trade participants can read" on public."trade_offers" as PERMISSIVE for SELECT to "authenticated" using (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Members can propose trades" on public."trade_offers" as PERMISSIVE for INSERT to "authenticated" with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = trade_offers.listing_id) AND (l.seller_id = trade_offers.recipient_id) AND (l.status = 'active'::text) AND (l.accepts_trades = true)))) AND ((offered_listing_id IS NULL) OR (EXISTS ( SELECT 1
   FROM listings o
  WHERE ((o.id = trade_offers.offered_listing_id) AND (o.seller_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'active'::text)))))));
create policy "Recipients can mark their messages read" on public."collector_messages" as PERMISSIVE for UPDATE to "authenticated" using ((recipient_id = ( SELECT auth.uid() AS uid))) with check ((recipient_id = ( SELECT auth.uid() AS uid)));
create policy "Trade counter participants read" on public."trade_counteroffers" as PERMISSIVE for SELECT to "authenticated" using (((proposer_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "read own blocks" on public."user_blocks" as PERMISSIVE for SELECT to "authenticated" using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "create own blocks" on public."user_blocks" as PERMISSIVE for INSERT to "authenticated" with check ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "delete own blocks" on public."user_blocks" as PERMISSIVE for DELETE to "authenticated" using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "submit reports" on public."user_reports" as PERMISSIVE for INSERT to "authenticated" with check ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy "read own reports" on public."user_reports" as PERMISSIVE for SELECT to "authenticated" using ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy "read own notification preferences" on public."notification_preferences" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "insert own notification preferences" on public."notification_preferences" as PERMISSIVE for INSERT to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "update own notification preferences" on public."notification_preferences" as PERMISSIVE for UPDATE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "read own notification read markers" on public."notification_reads" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "insert own notification read markers" on public."notification_reads" as PERMISSIVE for INSERT to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "update own notification read markers" on public."notification_reads" as PERMISSIVE for UPDATE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "read own notifications" on public."collector_notifications" as PERMISSIVE for SELECT to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "mark own notifications read" on public."collector_notifications" as PERMISSIVE for UPDATE to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "participants read offers" on public."price_offers" as PERMISSIVE for SELECT to "authenticated" using (((( SELECT auth.uid() AS uid) = buyer_id) OR (( SELECT auth.uid() AS uid) = seller_id)));
create policy "participants read price offer history" on public."price_offer_history" as PERMISSIVE for SELECT to "authenticated" using (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "deal_read" on public."deal_progress" as PERMISSIVE for SELECT to "authenticated" using (((auth.uid() = seller_id) OR (auth.uid() = buyer_id)));
create policy "deal_update" on public."deal_progress" as PERMISSIVE for UPDATE to "authenticated" using (((auth.uid() = seller_id) OR (auth.uid() = buyer_id))) with check (((auth.uid() = seller_id) OR (auth.uid() = buyer_id)));
create policy "review_read" on public."seller_reviews" as PERMISSIVE for SELECT to "public" using (true);
create policy "deal_insert" on public."deal_progress" as PERMISSIVE for INSERT to "authenticated" with check (((auth.uid() = seller_id) AND (((offer_type = 'price'::text) AND (EXISTS ( SELECT 1
   FROM price_offers p
  WHERE ((p.id = deal_progress.offer_id) AND (p.status = 'accepted'::text) AND (p.seller_id = deal_progress.seller_id) AND (p.buyer_id = deal_progress.buyer_id))))) OR ((offer_type = 'trade'::text) AND (EXISTS ( SELECT 1
   FROM trade_offers t
  WHERE ((t.id = deal_progress.offer_id) AND (t.status = 'accepted'::text) AND (t.recipient_id = deal_progress.seller_id) AND (t.sender_id = deal_progress.buyer_id))))))));
create policy "review_write" on public."seller_reviews" as PERMISSIVE for INSERT to "authenticated" with check (((auth.uid() = reviewer_id) AND (EXISTS ( SELECT 1
   FROM deal_progress d
  WHERE ((d.id = seller_reviews.deal_id) AND (d.status = 'completed'::text) AND (d.buyer_id = seller_reviews.reviewer_id) AND (d.seller_id = seller_reviews.seller_id))))));
create policy "participants read demo orders" on public."demo_orders" as PERMISSIVE for SELECT to "authenticated" using (((creator_id = ( SELECT auth.uid() AS uid)) OR (participant_id = ( SELECT auth.uid() AS uid))));
create policy "users create own demo orders" on public."demo_orders" as PERMISSIVE for INSERT to "authenticated" with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (participant_id IS NULL) AND (stage = 0)));
revoke all on public."profiles" from public,anon,authenticated;
grant SELECT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to anon;
grant INSERT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to anon;
grant UPDATE("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to anon;
grant REFERENCES("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to anon;
grant SELECT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to authenticated;
grant INSERT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to authenticated;
grant UPDATE("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to authenticated;
grant REFERENCES("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to authenticated;
grant SELECT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to service_role;
grant INSERT("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to service_role;
grant UPDATE("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to service_role;
grant REFERENCES("avatar_url","bio","created_at","display_name","favorite_tcg","id","location_label","username") on public."profiles" to service_role;
grant SELECT on public."profiles" to anon;
grant INSERT on public."profiles" to anon;
grant UPDATE on public."profiles" to anon;
grant REFERENCES on public."profiles" to anon;
grant DELETE on public."profiles" to anon;
grant TRUNCATE on public."profiles" to anon;
grant TRIGGER on public."profiles" to anon;
grant SELECT on public."profiles" to authenticated;
grant INSERT on public."profiles" to authenticated;
grant UPDATE on public."profiles" to authenticated;
grant REFERENCES on public."profiles" to authenticated;
grant DELETE on public."profiles" to authenticated;
grant TRUNCATE on public."profiles" to authenticated;
grant TRIGGER on public."profiles" to authenticated;
grant SELECT on public."profiles" to service_role;
grant INSERT on public."profiles" to service_role;
grant UPDATE on public."profiles" to service_role;
grant REFERENCES on public."profiles" to service_role;
grant DELETE on public."profiles" to service_role;
grant TRUNCATE on public."profiles" to service_role;
grant TRIGGER on public."profiles" to service_role;
revoke all on public."stores" from public,anon,authenticated;
grant SELECT("created_at","description","id","logo_url","name","owner_id") on public."stores" to anon;
grant INSERT("created_at","description","id","logo_url","name","owner_id") on public."stores" to anon;
grant UPDATE("created_at","description","id","logo_url","name","owner_id") on public."stores" to anon;
grant REFERENCES("created_at","description","id","logo_url","name","owner_id") on public."stores" to anon;
grant SELECT("created_at","description","id","logo_url","name","owner_id") on public."stores" to authenticated;
grant INSERT("created_at","description","id","logo_url","name","owner_id") on public."stores" to authenticated;
grant UPDATE("created_at","description","id","logo_url","name","owner_id") on public."stores" to authenticated;
grant REFERENCES("created_at","description","id","logo_url","name","owner_id") on public."stores" to authenticated;
grant SELECT("created_at","description","id","logo_url","name","owner_id") on public."stores" to service_role;
grant INSERT("created_at","description","id","logo_url","name","owner_id") on public."stores" to service_role;
grant UPDATE("created_at","description","id","logo_url","name","owner_id") on public."stores" to service_role;
grant REFERENCES("created_at","description","id","logo_url","name","owner_id") on public."stores" to service_role;
grant SELECT on public."stores" to anon;
grant INSERT on public."stores" to anon;
grant UPDATE on public."stores" to anon;
grant REFERENCES on public."stores" to anon;
grant DELETE on public."stores" to anon;
grant TRUNCATE on public."stores" to anon;
grant TRIGGER on public."stores" to anon;
grant SELECT on public."stores" to authenticated;
grant INSERT on public."stores" to authenticated;
grant UPDATE on public."stores" to authenticated;
grant REFERENCES on public."stores" to authenticated;
grant DELETE on public."stores" to authenticated;
grant TRUNCATE on public."stores" to authenticated;
grant TRIGGER on public."stores" to authenticated;
grant SELECT on public."stores" to service_role;
grant INSERT on public."stores" to service_role;
grant UPDATE on public."stores" to service_role;
grant REFERENCES on public."stores" to service_role;
grant DELETE on public."stores" to service_role;
grant TRUNCATE on public."stores" to service_role;
grant TRIGGER on public."stores" to service_role;
revoke all on public."trades" from public,anon,authenticated;
grant SELECT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to anon;
grant INSERT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to anon;
grant UPDATE("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to anon;
grant REFERENCES("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to anon;
grant SELECT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to authenticated;
grant INSERT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to authenticated;
grant UPDATE("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to authenticated;
grant REFERENCES("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to authenticated;
grant SELECT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to service_role;
grant INSERT("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to service_role;
grant UPDATE("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to service_role;
grant REFERENCES("cash_from_proposer","cash_from_recipient","created_at","expires_at","id","platform_fee","proposer_id","recipient_id","status","terms","updated_at") on public."trades" to service_role;
grant SELECT on public."trades" to anon;
grant INSERT on public."trades" to anon;
grant UPDATE on public."trades" to anon;
grant REFERENCES on public."trades" to anon;
grant DELETE on public."trades" to anon;
grant TRUNCATE on public."trades" to anon;
grant TRIGGER on public."trades" to anon;
grant SELECT on public."trades" to authenticated;
grant INSERT on public."trades" to authenticated;
grant UPDATE on public."trades" to authenticated;
grant REFERENCES on public."trades" to authenticated;
grant DELETE on public."trades" to authenticated;
grant TRUNCATE on public."trades" to authenticated;
grant TRIGGER on public."trades" to authenticated;
grant SELECT on public."trades" to service_role;
grant INSERT on public."trades" to service_role;
grant UPDATE on public."trades" to service_role;
grant REFERENCES on public."trades" to service_role;
grant DELETE on public."trades" to service_role;
grant TRUNCATE on public."trades" to service_role;
grant TRIGGER on public."trades" to service_role;
revoke all on public."trade_items" from public,anon,authenticated;
grant SELECT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to anon;
grant INSERT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to anon;
grant UPDATE("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to anon;
grant REFERENCES("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to anon;
grant SELECT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to authenticated;
grant INSERT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to authenticated;
grant UPDATE("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to authenticated;
grant REFERENCES("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to authenticated;
grant SELECT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to service_role;
grant INSERT("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to service_role;
grant UPDATE("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to service_role;
grant REFERENCES("agreed_value","created_at","id","item_title","listing_id","offered_by","trade_id") on public."trade_items" to service_role;
grant SELECT on public."trade_items" to anon;
grant INSERT on public."trade_items" to anon;
grant UPDATE on public."trade_items" to anon;
grant REFERENCES on public."trade_items" to anon;
grant DELETE on public."trade_items" to anon;
grant TRUNCATE on public."trade_items" to anon;
grant TRIGGER on public."trade_items" to anon;
grant SELECT on public."trade_items" to authenticated;
grant INSERT on public."trade_items" to authenticated;
grant UPDATE on public."trade_items" to authenticated;
grant REFERENCES on public."trade_items" to authenticated;
grant DELETE on public."trade_items" to authenticated;
grant TRUNCATE on public."trade_items" to authenticated;
grant TRIGGER on public."trade_items" to authenticated;
grant SELECT on public."trade_items" to service_role;
grant INSERT on public."trade_items" to service_role;
grant UPDATE on public."trade_items" to service_role;
grant REFERENCES on public."trade_items" to service_role;
grant DELETE on public."trade_items" to service_role;
grant TRUNCATE on public."trade_items" to service_role;
grant TRIGGER on public."trade_items" to service_role;
revoke all on public."orders" from public,anon,authenticated;
grant SELECT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to anon;
grant INSERT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to anon;
grant UPDATE("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to anon;
grant REFERENCES("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to anon;
grant SELECT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to authenticated;
grant INSERT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to authenticated;
grant UPDATE("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to authenticated;
grant REFERENCES("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to authenticated;
grant SELECT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to service_role;
grant INSERT("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to service_role;
grant UPDATE("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to service_role;
grant REFERENCES("buyer_id","buyer_protection_fee","created_at","id","item_price","item_title","listing_id","seller_id","shipping_cost","status","updated_at") on public."orders" to service_role;
grant SELECT on public."orders" to anon;
grant INSERT on public."orders" to anon;
grant UPDATE on public."orders" to anon;
grant REFERENCES on public."orders" to anon;
grant DELETE on public."orders" to anon;
grant TRUNCATE on public."orders" to anon;
grant TRIGGER on public."orders" to anon;
grant SELECT on public."orders" to authenticated;
grant INSERT on public."orders" to authenticated;
grant UPDATE on public."orders" to authenticated;
grant REFERENCES on public."orders" to authenticated;
grant DELETE on public."orders" to authenticated;
grant TRUNCATE on public."orders" to authenticated;
grant TRIGGER on public."orders" to authenticated;
grant SELECT on public."orders" to service_role;
grant INSERT on public."orders" to service_role;
grant UPDATE on public."orders" to service_role;
grant REFERENCES on public."orders" to service_role;
grant DELETE on public."orders" to service_role;
grant TRUNCATE on public."orders" to service_role;
grant TRIGGER on public."orders" to service_role;
revoke all on public."shipments" from public,anon,authenticated;
grant SELECT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to anon;
grant INSERT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to anon;
grant UPDATE("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to anon;
grant REFERENCES("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to anon;
grant SELECT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to authenticated;
grant INSERT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to authenticated;
grant UPDATE("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to authenticated;
grant REFERENCES("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to authenticated;
grant SELECT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to service_role;
grant INSERT("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to service_role;
grant UPDATE("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to service_role;
grant REFERENCES("carrier","created_at","delivered_at","id","label_url","order_id","recipient_id","sender_id","shipped_at","status","tracking_number","trade_id") on public."shipments" to service_role;
grant SELECT on public."shipments" to anon;
grant INSERT on public."shipments" to anon;
grant UPDATE on public."shipments" to anon;
grant REFERENCES on public."shipments" to anon;
grant DELETE on public."shipments" to anon;
grant TRUNCATE on public."shipments" to anon;
grant TRIGGER on public."shipments" to anon;
grant SELECT on public."shipments" to authenticated;
grant INSERT on public."shipments" to authenticated;
grant UPDATE on public."shipments" to authenticated;
grant REFERENCES on public."shipments" to authenticated;
grant DELETE on public."shipments" to authenticated;
grant TRUNCATE on public."shipments" to authenticated;
grant TRIGGER on public."shipments" to authenticated;
grant SELECT on public."shipments" to service_role;
grant INSERT on public."shipments" to service_role;
grant UPDATE on public."shipments" to service_role;
grant REFERENCES on public."shipments" to service_role;
grant DELETE on public."shipments" to service_role;
grant TRUNCATE on public."shipments" to service_role;
grant TRIGGER on public."shipments" to service_role;
revoke all on public."disputes" from public,anon,authenticated;
grant SELECT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to anon;
grant INSERT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to anon;
grant UPDATE("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to anon;
grant REFERENCES("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to anon;
grant SELECT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to authenticated;
grant INSERT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to authenticated;
grant UPDATE("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to authenticated;
grant REFERENCES("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to authenticated;
grant SELECT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to service_role;
grant INSERT("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to service_role;
grant UPDATE("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to service_role;
grant REFERENCES("created_at","description","evidence_urls","id","opened_by","order_id","reason","resolution_notes","resolved_at","status","trade_id") on public."disputes" to service_role;
grant SELECT on public."disputes" to anon;
grant INSERT on public."disputes" to anon;
grant UPDATE on public."disputes" to anon;
grant REFERENCES on public."disputes" to anon;
grant DELETE on public."disputes" to anon;
grant TRUNCATE on public."disputes" to anon;
grant TRIGGER on public."disputes" to anon;
grant SELECT on public."disputes" to authenticated;
grant INSERT on public."disputes" to authenticated;
grant UPDATE on public."disputes" to authenticated;
grant REFERENCES on public."disputes" to authenticated;
grant DELETE on public."disputes" to authenticated;
grant TRUNCATE on public."disputes" to authenticated;
grant TRIGGER on public."disputes" to authenticated;
grant SELECT on public."disputes" to service_role;
grant INSERT on public."disputes" to service_role;
grant UPDATE on public."disputes" to service_role;
grant REFERENCES on public."disputes" to service_role;
grant DELETE on public."disputes" to service_role;
grant TRUNCATE on public."disputes" to service_role;
grant TRIGGER on public."disputes" to service_role;
revoke all on public."listings" from public,anon,authenticated;
grant SELECT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to anon;
grant INSERT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to anon;
grant UPDATE("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to anon;
grant REFERENCES("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to anon;
grant SELECT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to authenticated;
grant INSERT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to authenticated;
grant UPDATE("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to authenticated;
grant REFERENCES("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to authenticated;
grant SELECT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to service_role;
grant INSERT("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to service_role;
grant UPDATE("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to service_role;
grant REFERENCES("accepts_price_offers","accepts_trades","category","collectible_subcategory","condition","created_at","description","id","image_urls","price","product_type","quantity","seller_id","status","store_id","tcg_game","title","updated_at") on public."listings" to service_role;
grant SELECT on public."listings" to anon;
grant INSERT on public."listings" to anon;
grant UPDATE on public."listings" to anon;
grant REFERENCES on public."listings" to anon;
grant DELETE on public."listings" to anon;
grant TRUNCATE on public."listings" to anon;
grant TRIGGER on public."listings" to anon;
grant SELECT on public."listings" to authenticated;
grant INSERT on public."listings" to authenticated;
grant UPDATE on public."listings" to authenticated;
grant REFERENCES on public."listings" to authenticated;
grant DELETE on public."listings" to authenticated;
grant TRUNCATE on public."listings" to authenticated;
grant TRIGGER on public."listings" to authenticated;
grant SELECT on public."listings" to service_role;
grant INSERT on public."listings" to service_role;
grant UPDATE on public."listings" to service_role;
grant REFERENCES on public."listings" to service_role;
grant DELETE on public."listings" to service_role;
grant TRUNCATE on public."listings" to service_role;
grant TRIGGER on public."listings" to service_role;
revoke all on public."wanted_posts" from public,anon,authenticated;
grant SELECT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to anon;
grant INSERT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to anon;
grant UPDATE("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to anon;
grant REFERENCES("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to anon;
grant SELECT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to authenticated;
grant INSERT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to authenticated;
grant UPDATE("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to authenticated;
grant REFERENCES("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to authenticated;
grant SELECT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to service_role;
grant INSERT("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to service_role;
grant UPDATE("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to service_role;
grant REFERENCES("budget","created_at","details","game","id","offer_type","title","user_id") on public."wanted_posts" to service_role;
grant SELECT on public."wanted_posts" to anon;
grant INSERT on public."wanted_posts" to anon;
grant UPDATE on public."wanted_posts" to anon;
grant REFERENCES on public."wanted_posts" to anon;
grant DELETE on public."wanted_posts" to anon;
grant TRUNCATE on public."wanted_posts" to anon;
grant TRIGGER on public."wanted_posts" to anon;
grant SELECT on public."wanted_posts" to authenticated;
grant INSERT on public."wanted_posts" to authenticated;
grant UPDATE on public."wanted_posts" to authenticated;
grant REFERENCES on public."wanted_posts" to authenticated;
grant DELETE on public."wanted_posts" to authenticated;
grant TRUNCATE on public."wanted_posts" to authenticated;
grant TRIGGER on public."wanted_posts" to authenticated;
grant SELECT on public."wanted_posts" to service_role;
grant INSERT on public."wanted_posts" to service_role;
grant UPDATE on public."wanted_posts" to service_role;
grant REFERENCES on public."wanted_posts" to service_role;
grant DELETE on public."wanted_posts" to service_role;
grant TRUNCATE on public."wanted_posts" to service_role;
grant TRIGGER on public."wanted_posts" to service_role;
revoke all on public."saved_listings" from public,anon,authenticated;
grant SELECT("created_at","listing_id","user_id") on public."saved_listings" to anon;
grant INSERT("created_at","listing_id","user_id") on public."saved_listings" to anon;
grant UPDATE("created_at","listing_id","user_id") on public."saved_listings" to anon;
grant REFERENCES("created_at","listing_id","user_id") on public."saved_listings" to anon;
grant SELECT("created_at","listing_id","user_id") on public."saved_listings" to authenticated;
grant INSERT("created_at","listing_id","user_id") on public."saved_listings" to authenticated;
grant UPDATE("created_at","listing_id","user_id") on public."saved_listings" to authenticated;
grant REFERENCES("created_at","listing_id","user_id") on public."saved_listings" to authenticated;
grant SELECT("created_at","listing_id","user_id") on public."saved_listings" to service_role;
grant INSERT("created_at","listing_id","user_id") on public."saved_listings" to service_role;
grant UPDATE("created_at","listing_id","user_id") on public."saved_listings" to service_role;
grant REFERENCES("created_at","listing_id","user_id") on public."saved_listings" to service_role;
grant SELECT on public."saved_listings" to anon;
grant INSERT on public."saved_listings" to anon;
grant UPDATE on public."saved_listings" to anon;
grant REFERENCES on public."saved_listings" to anon;
grant DELETE on public."saved_listings" to anon;
grant TRUNCATE on public."saved_listings" to anon;
grant TRIGGER on public."saved_listings" to anon;
grant SELECT on public."saved_listings" to authenticated;
grant INSERT on public."saved_listings" to authenticated;
grant UPDATE on public."saved_listings" to authenticated;
grant REFERENCES on public."saved_listings" to authenticated;
grant DELETE on public."saved_listings" to authenticated;
grant TRUNCATE on public."saved_listings" to authenticated;
grant TRIGGER on public."saved_listings" to authenticated;
grant SELECT on public."saved_listings" to service_role;
grant INSERT on public."saved_listings" to service_role;
grant UPDATE on public."saved_listings" to service_role;
grant REFERENCES on public."saved_listings" to service_role;
grant DELETE on public."saved_listings" to service_role;
grant TRUNCATE on public."saved_listings" to service_role;
grant TRIGGER on public."saved_listings" to service_role;
revoke all on public."collector_messages" from public,anon,authenticated;
grant SELECT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to anon;
grant INSERT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to anon;
grant UPDATE("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to anon;
grant REFERENCES("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to anon;
grant SELECT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to authenticated;
grant INSERT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to authenticated;
grant UPDATE("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to authenticated;
grant REFERENCES("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to authenticated;
grant SELECT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to service_role;
grant INSERT("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to service_role;
grant UPDATE("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to service_role;
grant REFERENCES("body","created_at","id","listing_id","read_at","recipient_id","sender_id") on public."collector_messages" to service_role;
grant SELECT on public."collector_messages" to anon;
grant INSERT on public."collector_messages" to anon;
grant UPDATE on public."collector_messages" to anon;
grant REFERENCES on public."collector_messages" to anon;
grant DELETE on public."collector_messages" to anon;
grant TRUNCATE on public."collector_messages" to anon;
grant TRIGGER on public."collector_messages" to anon;
grant SELECT on public."collector_messages" to authenticated;
grant INSERT on public."collector_messages" to authenticated;
grant UPDATE on public."collector_messages" to authenticated;
grant REFERENCES on public."collector_messages" to authenticated;
grant DELETE on public."collector_messages" to authenticated;
grant TRUNCATE on public."collector_messages" to authenticated;
grant TRIGGER on public."collector_messages" to authenticated;
grant SELECT on public."collector_messages" to service_role;
grant INSERT on public."collector_messages" to service_role;
grant UPDATE on public."collector_messages" to service_role;
grant REFERENCES on public."collector_messages" to service_role;
grant DELETE on public."collector_messages" to service_role;
grant TRUNCATE on public."collector_messages" to service_role;
grant TRIGGER on public."collector_messages" to service_role;
revoke all on public."trade_offers" from public,anon,authenticated;
grant SELECT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to anon;
grant INSERT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to anon;
grant UPDATE("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to anon;
grant REFERENCES("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to anon;
grant SELECT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to authenticated;
grant INSERT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to authenticated;
grant UPDATE("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to authenticated;
grant REFERENCES("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to authenticated;
grant SELECT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to service_role;
grant INSERT("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to service_role;
grant UPDATE("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to service_role;
grant REFERENCES("cash_amount","cash_direction","created_at","id","listing_id","offer_note","offered_listing_id","recipient_id","sender_id","status","updated_at") on public."trade_offers" to service_role;
grant SELECT on public."trade_offers" to anon;
grant INSERT on public."trade_offers" to anon;
grant UPDATE on public."trade_offers" to anon;
grant REFERENCES on public."trade_offers" to anon;
grant DELETE on public."trade_offers" to anon;
grant TRUNCATE on public."trade_offers" to anon;
grant TRIGGER on public."trade_offers" to anon;
grant SELECT on public."trade_offers" to authenticated;
grant INSERT on public."trade_offers" to authenticated;
grant UPDATE on public."trade_offers" to authenticated;
grant REFERENCES on public."trade_offers" to authenticated;
grant DELETE on public."trade_offers" to authenticated;
grant TRUNCATE on public."trade_offers" to authenticated;
grant TRIGGER on public."trade_offers" to authenticated;
grant SELECT on public."trade_offers" to service_role;
grant INSERT on public."trade_offers" to service_role;
grant UPDATE on public."trade_offers" to service_role;
grant REFERENCES on public."trade_offers" to service_role;
grant DELETE on public."trade_offers" to service_role;
grant TRUNCATE on public."trade_offers" to service_role;
grant TRIGGER on public."trade_offers" to service_role;
revoke all on public."user_blocks" from public,anon,authenticated;
grant SELECT("blocked_id","blocker_id","created_at") on public."user_blocks" to anon;
grant INSERT("blocked_id","blocker_id","created_at") on public."user_blocks" to anon;
grant UPDATE("blocked_id","blocker_id","created_at") on public."user_blocks" to anon;
grant REFERENCES("blocked_id","blocker_id","created_at") on public."user_blocks" to anon;
grant SELECT("blocked_id","blocker_id","created_at") on public."user_blocks" to authenticated;
grant INSERT("blocked_id","blocker_id","created_at") on public."user_blocks" to authenticated;
grant UPDATE("blocked_id","blocker_id","created_at") on public."user_blocks" to authenticated;
grant REFERENCES("blocked_id","blocker_id","created_at") on public."user_blocks" to authenticated;
grant SELECT("blocked_id","blocker_id","created_at") on public."user_blocks" to service_role;
grant INSERT("blocked_id","blocker_id","created_at") on public."user_blocks" to service_role;
grant UPDATE("blocked_id","blocker_id","created_at") on public."user_blocks" to service_role;
grant REFERENCES("blocked_id","blocker_id","created_at") on public."user_blocks" to service_role;
grant SELECT on public."user_blocks" to anon;
grant INSERT on public."user_blocks" to anon;
grant UPDATE on public."user_blocks" to anon;
grant REFERENCES on public."user_blocks" to anon;
grant DELETE on public."user_blocks" to anon;
grant TRUNCATE on public."user_blocks" to anon;
grant TRIGGER on public."user_blocks" to anon;
grant SELECT on public."user_blocks" to authenticated;
grant INSERT on public."user_blocks" to authenticated;
grant UPDATE on public."user_blocks" to authenticated;
grant REFERENCES on public."user_blocks" to authenticated;
grant DELETE on public."user_blocks" to authenticated;
grant TRUNCATE on public."user_blocks" to authenticated;
grant TRIGGER on public."user_blocks" to authenticated;
grant SELECT on public."user_blocks" to service_role;
grant INSERT on public."user_blocks" to service_role;
grant UPDATE on public."user_blocks" to service_role;
grant REFERENCES on public."user_blocks" to service_role;
grant DELETE on public."user_blocks" to service_role;
grant TRUNCATE on public."user_blocks" to service_role;
grant TRIGGER on public."user_blocks" to service_role;
revoke all on public."trade_counteroffers" from public,anon,authenticated;
grant SELECT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to anon;
grant INSERT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to anon;
grant UPDATE("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to anon;
grant REFERENCES("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to anon;
grant SELECT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to authenticated;
grant INSERT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to authenticated;
grant UPDATE("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to authenticated;
grant REFERENCES("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to authenticated;
grant SELECT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to service_role;
grant INSERT("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to service_role;
grant UPDATE("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to service_role;
grant REFERENCES("cash_amount","cash_direction","created_at","id","offer_note","proposer_id","recipient_id","status","trade_offer_id") on public."trade_counteroffers" to service_role;
grant SELECT on public."trade_counteroffers" to anon;
grant INSERT on public."trade_counteroffers" to anon;
grant UPDATE on public."trade_counteroffers" to anon;
grant REFERENCES on public."trade_counteroffers" to anon;
grant DELETE on public."trade_counteroffers" to anon;
grant TRUNCATE on public."trade_counteroffers" to anon;
grant TRIGGER on public."trade_counteroffers" to anon;
grant SELECT on public."trade_counteroffers" to authenticated;
grant INSERT on public."trade_counteroffers" to authenticated;
grant UPDATE on public."trade_counteroffers" to authenticated;
grant REFERENCES on public."trade_counteroffers" to authenticated;
grant DELETE on public."trade_counteroffers" to authenticated;
grant TRUNCATE on public."trade_counteroffers" to authenticated;
grant TRIGGER on public."trade_counteroffers" to authenticated;
grant SELECT on public."trade_counteroffers" to service_role;
grant INSERT on public."trade_counteroffers" to service_role;
grant UPDATE on public."trade_counteroffers" to service_role;
grant REFERENCES on public."trade_counteroffers" to service_role;
grant DELETE on public."trade_counteroffers" to service_role;
grant TRUNCATE on public."trade_counteroffers" to service_role;
grant TRIGGER on public."trade_counteroffers" to service_role;
revoke all on public."user_reports" from public,anon,authenticated;
grant SELECT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to anon;
grant INSERT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to anon;
grant UPDATE("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to anon;
grant REFERENCES("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to anon;
grant SELECT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to authenticated;
grant INSERT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to authenticated;
grant UPDATE("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to authenticated;
grant REFERENCES("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to authenticated;
grant SELECT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to service_role;
grant INSERT("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to service_role;
grant UPDATE("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to service_role;
grant REFERENCES("created_at","details","id","listing_id","reason","reported_id","reporter_id","status") on public."user_reports" to service_role;
grant SELECT on public."user_reports" to anon;
grant INSERT on public."user_reports" to anon;
grant UPDATE on public."user_reports" to anon;
grant REFERENCES on public."user_reports" to anon;
grant DELETE on public."user_reports" to anon;
grant TRUNCATE on public."user_reports" to anon;
grant TRIGGER on public."user_reports" to anon;
grant SELECT on public."user_reports" to authenticated;
grant INSERT on public."user_reports" to authenticated;
grant UPDATE on public."user_reports" to authenticated;
grant REFERENCES on public."user_reports" to authenticated;
grant DELETE on public."user_reports" to authenticated;
grant TRUNCATE on public."user_reports" to authenticated;
grant TRIGGER on public."user_reports" to authenticated;
grant SELECT on public."user_reports" to service_role;
grant INSERT on public."user_reports" to service_role;
grant UPDATE on public."user_reports" to service_role;
grant REFERENCES on public."user_reports" to service_role;
grant DELETE on public."user_reports" to service_role;
grant TRUNCATE on public."user_reports" to service_role;
grant TRIGGER on public."user_reports" to service_role;
revoke all on public."notification_preferences" from public,anon,authenticated;
grant SELECT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to anon;
grant INSERT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to anon;
grant UPDATE("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to anon;
grant REFERENCES("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to anon;
grant SELECT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to authenticated;
grant INSERT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to authenticated;
grant UPDATE("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to authenticated;
grant REFERENCES("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to authenticated;
grant SELECT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to service_role;
grant INSERT("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to service_role;
grant UPDATE("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to service_role;
grant REFERENCES("messages","product_updates","trade_offers","updated_at","user_id","wanted_matches") on public."notification_preferences" to service_role;
grant SELECT on public."notification_preferences" to anon;
grant INSERT on public."notification_preferences" to anon;
grant UPDATE on public."notification_preferences" to anon;
grant REFERENCES on public."notification_preferences" to anon;
grant DELETE on public."notification_preferences" to anon;
grant TRUNCATE on public."notification_preferences" to anon;
grant TRIGGER on public."notification_preferences" to anon;
grant SELECT on public."notification_preferences" to authenticated;
grant INSERT on public."notification_preferences" to authenticated;
grant UPDATE on public."notification_preferences" to authenticated;
grant REFERENCES on public."notification_preferences" to authenticated;
grant DELETE on public."notification_preferences" to authenticated;
grant TRUNCATE on public."notification_preferences" to authenticated;
grant TRIGGER on public."notification_preferences" to authenticated;
grant SELECT on public."notification_preferences" to service_role;
grant INSERT on public."notification_preferences" to service_role;
grant UPDATE on public."notification_preferences" to service_role;
grant REFERENCES on public."notification_preferences" to service_role;
grant DELETE on public."notification_preferences" to service_role;
grant TRUNCATE on public."notification_preferences" to service_role;
grant TRIGGER on public."notification_preferences" to service_role;
revoke all on public."notification_reads" from public,anon,authenticated;
grant SELECT("event_key","read_at","user_id") on public."notification_reads" to anon;
grant INSERT("event_key","read_at","user_id") on public."notification_reads" to anon;
grant UPDATE("event_key","read_at","user_id") on public."notification_reads" to anon;
grant REFERENCES("event_key","read_at","user_id") on public."notification_reads" to anon;
grant SELECT("event_key","read_at","user_id") on public."notification_reads" to authenticated;
grant INSERT("event_key","read_at","user_id") on public."notification_reads" to authenticated;
grant UPDATE("event_key","read_at","user_id") on public."notification_reads" to authenticated;
grant REFERENCES("event_key","read_at","user_id") on public."notification_reads" to authenticated;
grant SELECT("event_key","read_at","user_id") on public."notification_reads" to service_role;
grant INSERT("event_key","read_at","user_id") on public."notification_reads" to service_role;
grant UPDATE("event_key","read_at","user_id") on public."notification_reads" to service_role;
grant REFERENCES("event_key","read_at","user_id") on public."notification_reads" to service_role;
grant SELECT on public."notification_reads" to anon;
grant INSERT on public."notification_reads" to anon;
grant UPDATE on public."notification_reads" to anon;
grant REFERENCES on public."notification_reads" to anon;
grant DELETE on public."notification_reads" to anon;
grant TRUNCATE on public."notification_reads" to anon;
grant TRIGGER on public."notification_reads" to anon;
grant SELECT on public."notification_reads" to authenticated;
grant INSERT on public."notification_reads" to authenticated;
grant UPDATE on public."notification_reads" to authenticated;
grant REFERENCES on public."notification_reads" to authenticated;
grant DELETE on public."notification_reads" to authenticated;
grant TRUNCATE on public."notification_reads" to authenticated;
grant TRIGGER on public."notification_reads" to authenticated;
grant SELECT on public."notification_reads" to service_role;
grant INSERT on public."notification_reads" to service_role;
grant UPDATE on public."notification_reads" to service_role;
grant REFERENCES on public."notification_reads" to service_role;
grant DELETE on public."notification_reads" to service_role;
grant TRUNCATE on public."notification_reads" to service_role;
grant TRIGGER on public."notification_reads" to service_role;
revoke all on public."price_offer_history" from public,anon,authenticated;
grant SELECT("action","actor_id","amount","buyer_id","created_at","id","listing_id","offer_id","seller_id") on public."price_offer_history" to authenticated;
grant SELECT("action","actor_id","amount","buyer_id","created_at","id","listing_id","offer_id","seller_id") on public."price_offer_history" to service_role;
grant INSERT("action","actor_id","amount","buyer_id","created_at","id","listing_id","offer_id","seller_id") on public."price_offer_history" to service_role;
grant UPDATE("action","actor_id","amount","buyer_id","created_at","id","listing_id","offer_id","seller_id") on public."price_offer_history" to service_role;
grant REFERENCES("action","actor_id","amount","buyer_id","created_at","id","listing_id","offer_id","seller_id") on public."price_offer_history" to service_role;
grant SELECT on public."price_offer_history" to service_role;
grant INSERT on public."price_offer_history" to service_role;
grant UPDATE on public."price_offer_history" to service_role;
grant REFERENCES on public."price_offer_history" to service_role;
grant DELETE on public."price_offer_history" to service_role;
grant TRUNCATE on public."price_offer_history" to service_role;
grant TRIGGER on public."price_offer_history" to service_role;
grant SELECT on public."price_offer_history" to authenticated;
revoke all on public."price_offers" from public,anon,authenticated;
grant SELECT("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to anon;
grant REFERENCES("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to anon;
grant SELECT("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to authenticated;
grant REFERENCES("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to authenticated;
grant SELECT("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to service_role;
grant INSERT("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to service_role;
grant UPDATE("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to service_role;
grant REFERENCES("amount","buyer_id","created_at","id","last_actor_id","listing_id","seller_id","status","updated_at") on public."price_offers" to service_role;
grant SELECT on public."price_offers" to anon;
grant REFERENCES on public."price_offers" to anon;
grant TRUNCATE on public."price_offers" to anon;
grant TRIGGER on public."price_offers" to anon;
grant SELECT on public."price_offers" to authenticated;
grant REFERENCES on public."price_offers" to authenticated;
grant TRUNCATE on public."price_offers" to authenticated;
grant TRIGGER on public."price_offers" to authenticated;
grant SELECT on public."price_offers" to service_role;
grant INSERT on public."price_offers" to service_role;
grant UPDATE on public."price_offers" to service_role;
grant REFERENCES on public."price_offers" to service_role;
grant DELETE on public."price_offers" to service_role;
grant TRUNCATE on public."price_offers" to service_role;
grant TRIGGER on public."price_offers" to service_role;
revoke all on public."deal_progress" from public,anon,authenticated;
grant SELECT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to anon;
grant INSERT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to anon;
grant UPDATE("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to anon;
grant REFERENCES("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to anon;
grant SELECT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to authenticated;
grant INSERT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to authenticated;
grant UPDATE("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to authenticated;
grant REFERENCES("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to authenticated;
grant SELECT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to service_role;
grant INSERT("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to service_role;
grant UPDATE("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to service_role;
grant REFERENCES("buyer_confirmed_at","buyer_id","id","offer_id","offer_type","seller_confirmed_at","seller_id","status","updated_at") on public."deal_progress" to service_role;
grant SELECT on public."deal_progress" to anon;
grant INSERT on public."deal_progress" to anon;
grant UPDATE on public."deal_progress" to anon;
grant REFERENCES on public."deal_progress" to anon;
grant DELETE on public."deal_progress" to anon;
grant TRUNCATE on public."deal_progress" to anon;
grant TRIGGER on public."deal_progress" to anon;
grant SELECT on public."deal_progress" to authenticated;
grant INSERT on public."deal_progress" to authenticated;
grant UPDATE on public."deal_progress" to authenticated;
grant REFERENCES on public."deal_progress" to authenticated;
grant DELETE on public."deal_progress" to authenticated;
grant TRUNCATE on public."deal_progress" to authenticated;
grant TRIGGER on public."deal_progress" to authenticated;
grant SELECT on public."deal_progress" to service_role;
grant INSERT on public."deal_progress" to service_role;
grant UPDATE on public."deal_progress" to service_role;
grant REFERENCES on public."deal_progress" to service_role;
grant DELETE on public."deal_progress" to service_role;
grant TRUNCATE on public."deal_progress" to service_role;
grant TRIGGER on public."deal_progress" to service_role;
revoke all on public."collector_notifications" from public,anon,authenticated;
grant SELECT("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to anon;
grant UPDATE("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to anon;
grant REFERENCES("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to anon;
grant SELECT("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to authenticated;
grant UPDATE("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to authenticated;
grant REFERENCES("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to authenticated;
grant SELECT("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to service_role;
grant INSERT("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to service_role;
grant UPDATE("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to service_role;
grant REFERENCES("actor_id","created_at","id","kind","read_at","source_id","user_id") on public."collector_notifications" to service_role;
grant SELECT on public."collector_notifications" to anon;
grant UPDATE on public."collector_notifications" to anon;
grant REFERENCES on public."collector_notifications" to anon;
grant TRUNCATE on public."collector_notifications" to anon;
grant TRIGGER on public."collector_notifications" to anon;
grant SELECT on public."collector_notifications" to authenticated;
grant UPDATE on public."collector_notifications" to authenticated;
grant REFERENCES on public."collector_notifications" to authenticated;
grant TRUNCATE on public."collector_notifications" to authenticated;
grant TRIGGER on public."collector_notifications" to authenticated;
grant SELECT on public."collector_notifications" to service_role;
grant INSERT on public."collector_notifications" to service_role;
grant UPDATE on public."collector_notifications" to service_role;
grant REFERENCES on public."collector_notifications" to service_role;
grant DELETE on public."collector_notifications" to service_role;
grant TRUNCATE on public."collector_notifications" to service_role;
grant TRIGGER on public."collector_notifications" to service_role;
revoke all on public."notification_email_deliveries" from public,anon,authenticated;
grant SELECT("claimed_at","error","notification_id","sent_at") on public."notification_email_deliveries" to service_role;
grant INSERT("claimed_at","error","notification_id","sent_at") on public."notification_email_deliveries" to service_role;
grant UPDATE("claimed_at","error","notification_id","sent_at") on public."notification_email_deliveries" to service_role;
grant REFERENCES("claimed_at","error","notification_id","sent_at") on public."notification_email_deliveries" to service_role;
grant SELECT on public."notification_email_deliveries" to service_role;
grant INSERT on public."notification_email_deliveries" to service_role;
grant UPDATE on public."notification_email_deliveries" to service_role;
grant REFERENCES on public."notification_email_deliveries" to service_role;
grant DELETE on public."notification_email_deliveries" to service_role;
grant TRUNCATE on public."notification_email_deliveries" to service_role;
grant TRIGGER on public."notification_email_deliveries" to service_role;
revoke all on public."seller_reviews" from public,anon,authenticated;
grant SELECT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to anon;
grant INSERT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to anon;
grant UPDATE("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to anon;
grant REFERENCES("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to anon;
grant SELECT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to authenticated;
grant INSERT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to authenticated;
grant UPDATE("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to authenticated;
grant REFERENCES("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to authenticated;
grant SELECT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to service_role;
grant INSERT("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to service_role;
grant UPDATE("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to service_role;
grant REFERENCES("comment","created_at","deal_id","id","rating","reviewer_id","seller_id") on public."seller_reviews" to service_role;
grant SELECT on public."seller_reviews" to anon;
grant INSERT on public."seller_reviews" to anon;
grant UPDATE on public."seller_reviews" to anon;
grant REFERENCES on public."seller_reviews" to anon;
grant DELETE on public."seller_reviews" to anon;
grant TRUNCATE on public."seller_reviews" to anon;
grant TRIGGER on public."seller_reviews" to anon;
grant SELECT on public."seller_reviews" to authenticated;
grant INSERT on public."seller_reviews" to authenticated;
grant UPDATE on public."seller_reviews" to authenticated;
grant REFERENCES on public."seller_reviews" to authenticated;
grant DELETE on public."seller_reviews" to authenticated;
grant TRUNCATE on public."seller_reviews" to authenticated;
grant TRIGGER on public."seller_reviews" to authenticated;
grant SELECT on public."seller_reviews" to service_role;
grant INSERT on public."seller_reviews" to service_role;
grant UPDATE on public."seller_reviews" to service_role;
grant REFERENCES on public."seller_reviews" to service_role;
grant DELETE on public."seller_reviews" to service_role;
grant TRUNCATE on public."seller_reviews" to service_role;
grant TRIGGER on public."seller_reviews" to service_role;
revoke all on public."moderator_roles" from public,anon,authenticated;
grant SELECT("created_at","role","user_id") on public."moderator_roles" to service_role;
grant INSERT("created_at","role","user_id") on public."moderator_roles" to service_role;
grant UPDATE("created_at","role","user_id") on public."moderator_roles" to service_role;
grant REFERENCES("created_at","role","user_id") on public."moderator_roles" to service_role;
grant SELECT on public."moderator_roles" to service_role;
grant INSERT on public."moderator_roles" to service_role;
grant UPDATE on public."moderator_roles" to service_role;
grant REFERENCES on public."moderator_roles" to service_role;
grant DELETE on public."moderator_roles" to service_role;
grant TRUNCATE on public."moderator_roles" to service_role;
grant TRIGGER on public."moderator_roles" to service_role;
revoke all on public."moderation_actions" from public,anon,authenticated;
grant SELECT("action","created_at","id","listing_id","moderator_id","notes","report_id") on public."moderation_actions" to service_role;
grant INSERT("action","created_at","id","listing_id","moderator_id","notes","report_id") on public."moderation_actions" to service_role;
grant UPDATE("action","created_at","id","listing_id","moderator_id","notes","report_id") on public."moderation_actions" to service_role;
grant REFERENCES("action","created_at","id","listing_id","moderator_id","notes","report_id") on public."moderation_actions" to service_role;
grant SELECT on public."moderation_actions" to service_role;
grant INSERT on public."moderation_actions" to service_role;
grant UPDATE on public."moderation_actions" to service_role;
grant REFERENCES on public."moderation_actions" to service_role;
grant DELETE on public."moderation_actions" to service_role;
grant TRUNCATE on public."moderation_actions" to service_role;
grant TRIGGER on public."moderation_actions" to service_role;
revoke all on public."demo_orders" from public,anon,authenticated;
grant SELECT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to anon;
grant INSERT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to anon;
grant UPDATE("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to anon;
grant REFERENCES("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to anon;
grant SELECT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to authenticated;
grant INSERT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to authenticated;
grant UPDATE("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to authenticated;
grant REFERENCES("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to authenticated;
grant SELECT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to service_role;
grant INSERT("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to service_role;
grant UPDATE("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to service_role;
grant REFERENCES("created_at","creator_id","creator_role","id","invite_code","item_name","item_price","participant_id","shipping_price","stage","updated_at") on public."demo_orders" to service_role;
grant SELECT on public."demo_orders" to anon;
grant INSERT on public."demo_orders" to anon;
grant UPDATE on public."demo_orders" to anon;
grant REFERENCES on public."demo_orders" to anon;
grant DELETE on public."demo_orders" to anon;
grant TRUNCATE on public."demo_orders" to anon;
grant TRIGGER on public."demo_orders" to anon;
grant SELECT on public."demo_orders" to authenticated;
grant INSERT on public."demo_orders" to authenticated;
grant UPDATE on public."demo_orders" to authenticated;
grant REFERENCES on public."demo_orders" to authenticated;
grant DELETE on public."demo_orders" to authenticated;
grant TRUNCATE on public."demo_orders" to authenticated;
grant TRIGGER on public."demo_orders" to authenticated;
grant SELECT on public."demo_orders" to service_role;
grant INSERT on public."demo_orders" to service_role;
grant UPDATE on public."demo_orders" to service_role;
grant REFERENCES on public."demo_orders" to service_role;
grant DELETE on public."demo_orders" to service_role;
grant TRUNCATE on public."demo_orders" to service_role;
grant TRIGGER on public."demo_orders" to service_role;
revoke all on function private."handle_new_user"() from public,anon,authenticated;
revoke all on function public."deckplay_reserve_accepted_offer"() from public,anon,authenticated;
grant execute on function public."deckplay_reserve_accepted_offer"() to service_role;
revoke all on function public."guard_message_read_update"() from public,anon,authenticated;
grant execute on function public."guard_message_read_update"() to public;
grant execute on function public."guard_message_read_update"() to anon;
grant execute on function public."guard_message_read_update"() to authenticated;
grant execute on function public."guard_message_read_update"() to service_role;
revoke all on function public."deckplay_guard_new_offer"() from public,anon,authenticated;
grant execute on function public."deckplay_guard_new_offer"() to service_role;
revoke all on function public."guard_trade_offer_update"() from public,anon,authenticated;
grant execute on function public."guard_trade_offer_update"() to public;
grant execute on function public."guard_trade_offer_update"() to anon;
grant execute on function public."guard_trade_offer_update"() to authenticated;
grant execute on function public."guard_trade_offer_update"() to service_role;
revoke all on function public."moderation_report_queue"() from public,anon,authenticated;
grant execute on function public."moderation_report_queue"() to authenticated;
grant execute on function public."moderation_report_queue"() to service_role;
revoke all on function public."prevent_blocked_messages"() from public,anon,authenticated;
grant execute on function public."prevent_blocked_messages"() to service_role;
revoke all on function public."notify_collector_event"() from public,anon,authenticated;
grant execute on function public."notify_collector_event"() to service_role;
revoke all on function public."create_trade_counter"(p_offer uuid, p_cash numeric, p_direction text, p_note text) from public,anon,authenticated;
grant execute on function public."create_trade_counter"(p_offer uuid, p_cash numeric, p_direction text, p_note text) to authenticated;
grant execute on function public."create_trade_counter"(p_offer uuid, p_cash numeric, p_direction text, p_note text) to service_role;
revoke all on function public."respond_trade_counter"(p_counter uuid, p_accept boolean) from public,anon,authenticated;
grant execute on function public."respond_trade_counter"(p_counter uuid, p_accept boolean) to authenticated;
grant execute on function public."respond_trade_counter"(p_counter uuid, p_accept boolean) to service_role;
revoke all on function public."notify_price_offer_event"() from public,anon,authenticated;
grant execute on function public."notify_price_offer_event"() to service_role;
revoke all on function public."deckplay_reserve_accepted_trade"() from public,anon,authenticated;
grant execute on function public."deckplay_reserve_accepted_trade"() to service_role;
revoke all on function public."deckplay_guard_listing_status"() from public,anon,authenticated;
grant execute on function public."deckplay_guard_listing_status"() to service_role;
revoke all on function public."finalize_deal_after_confirmation"() from public,anon,authenticated;
grant execute on function public."finalize_deal_after_confirmation"() to public;
grant execute on function public."finalize_deal_after_confirmation"() to anon;
grant execute on function public."finalize_deal_after_confirmation"() to authenticated;
grant execute on function public."finalize_deal_after_confirmation"() to service_role;
revoke all on function public."guard_deal_progress_insert"() from public,anon,authenticated;
grant execute on function public."guard_deal_progress_insert"() to public;
grant execute on function public."guard_deal_progress_insert"() to anon;
grant execute on function public."guard_deal_progress_insert"() to authenticated;
grant execute on function public."guard_deal_progress_insert"() to service_role;
revoke all on function public."guard_deal_progress"() from public,anon,authenticated;
grant execute on function public."guard_deal_progress"() to public;
grant execute on function public."guard_deal_progress"() to anon;
grant execute on function public."guard_deal_progress"() to authenticated;
grant execute on function public."guard_deal_progress"() to service_role;
revoke all on function public."lock_listing_on_agreement"() from public,anon,authenticated;
grant execute on function public."lock_listing_on_agreement"() to service_role;
revoke all on function public."record_price_offer_history"() from public,anon,authenticated;
grant execute on function public."record_price_offer_history"() to service_role;
revoke all on function public."respond_price_offer"(p_offer_id uuid, p_action text, p_amount numeric) from public,anon,authenticated;
grant execute on function public."respond_price_offer"(p_offer_id uuid, p_action text, p_amount numeric) to authenticated;
grant execute on function public."respond_price_offer"(p_offer_id uuid, p_action text, p_amount numeric) to service_role;
revoke all on function public."submit_price_offer"(p_listing_id uuid, p_amount numeric) from public,anon,authenticated;
grant execute on function public."submit_price_offer"(p_listing_id uuid, p_amount numeric) to authenticated;
grant execute on function public."submit_price_offer"(p_listing_id uuid, p_amount numeric) to service_role;
revoke all on function public."claim_notification_email"(p_notification_id uuid, p_actor uuid) from public,anon,authenticated;
grant execute on function public."claim_notification_email"(p_notification_id uuid, p_actor uuid) to service_role;
revoke all on function public."is_deckplay_moderator"() from public,anon,authenticated;
grant execute on function public."is_deckplay_moderator"() to authenticated;
grant execute on function public."is_deckplay_moderator"() to service_role;
revoke all on function public."advance_deckplay_demo_order"(p_id uuid) from public,anon,authenticated;
grant execute on function public."advance_deckplay_demo_order"(p_id uuid) to authenticated;
grant execute on function public."advance_deckplay_demo_order"(p_id uuid) to service_role;
revoke all on function public."hide_deckplay_listing"(p_listing_id uuid, p_report_id uuid, p_notes text) from public,anon,authenticated;
grant execute on function public."hide_deckplay_listing"(p_listing_id uuid, p_report_id uuid, p_notes text) to authenticated;
grant execute on function public."hide_deckplay_listing"(p_listing_id uuid, p_report_id uuid, p_notes text) to service_role;
revoke all on function public."delete_deckplay_demo_order"(p_id uuid) from public,anon,authenticated;
grant execute on function public."delete_deckplay_demo_order"(p_id uuid) to authenticated;
grant execute on function public."delete_deckplay_demo_order"(p_id uuid) to service_role;
revoke all on function public."join_deckplay_demo_order"(p_code text) from public,anon,authenticated;
grant execute on function public."join_deckplay_demo_order"(p_code text) to authenticated;
grant execute on function public."join_deckplay_demo_order"(p_code text) to service_role;
revoke all on function public."review_deckplay_report"(p_report_id uuid, p_status text, p_notes text) from public,anon,authenticated;
grant execute on function public."review_deckplay_report"(p_report_id uuid, p_status text, p_notes text) to authenticated;
grant execute on function public."review_deckplay_report"(p_report_id uuid, p_status text, p_notes text) to service_role;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
CREATE TRIGGER guard_trade_offer_update BEFORE UPDATE ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION guard_trade_offer_update();
CREATE TRIGGER guard_message_read_update BEFORE UPDATE ON public.collector_messages FOR EACH ROW EXECUTE FUNCTION guard_message_read_update();
CREATE TRIGGER check_blocked_messages BEFORE INSERT ON public.collector_messages FOR EACH ROW EXECUTE FUNCTION prevent_blocked_messages();
CREATE TRIGGER notify_message_created AFTER INSERT ON public.collector_messages FOR EACH ROW EXECUTE FUNCTION notify_collector_event();
CREATE TRIGGER notify_trade_created AFTER INSERT OR UPDATE OF status ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION notify_collector_event();
CREATE TRIGGER notify_counter_created AFTER INSERT ON public.trade_counteroffers FOR EACH ROW EXECUTE FUNCTION notify_collector_event();
CREATE TRIGGER notify_price_offer_change AFTER INSERT OR UPDATE OF status, amount, last_actor_id ON public.price_offers FOR EACH ROW EXECUTE FUNCTION notify_price_offer_event();
CREATE TRIGGER enforce_price_listing_agreement BEFORE INSERT OR UPDATE OF status, amount ON public.price_offers FOR EACH ROW EXECUTE FUNCTION lock_listing_on_agreement();
CREATE TRIGGER enforce_trade_listing_agreement BEFORE INSERT OR UPDATE OF status ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION lock_listing_on_agreement();
CREATE TRIGGER record_price_offer_history_event AFTER INSERT OR UPDATE OF status, amount, last_actor_id ON public.price_offers FOR EACH ROW EXECUTE FUNCTION record_price_offer_history();
CREATE TRIGGER deckplay_guard_price_offer BEFORE INSERT ON public.price_offers FOR EACH ROW EXECUTE FUNCTION deckplay_guard_new_offer();
CREATE TRIGGER deckplay_guard_trade_offer BEFORE INSERT ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION deckplay_guard_new_offer();
CREATE TRIGGER deckplay_guard_listing_status BEFORE UPDATE OF status ON public.listings FOR EACH ROW EXECUTE FUNCTION deckplay_guard_listing_status();
CREATE TRIGGER guard_deal_progress_update BEFORE UPDATE ON public.deal_progress FOR EACH ROW EXECUTE FUNCTION guard_deal_progress();
CREATE TRIGGER finalize_deal_confirmation BEFORE UPDATE ON public.deal_progress FOR EACH ROW EXECUTE FUNCTION finalize_deal_after_confirmation();
CREATE TRIGGER guard_deal_progress_insert_trigger BEFORE INSERT ON public.deal_progress FOR EACH ROW EXECUTE FUNCTION guard_deal_progress_insert();
set check_function_bodies=on;
