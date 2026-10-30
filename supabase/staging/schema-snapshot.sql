-- STAGING ONLY schema snapshot from prrrzeelltmyugssqnzk on 2026-10-26.
-- Apply only to an EMPTY dedicated Supabase project with auth/storage schemas present.
-- Contains schema and policies only; no user records, keys or passwords. Fresh rebuild not yet verified.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.collector_messages (
  id uuid default gen_random_uuid() not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  listing_id uuid,
  body text not null,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone
);
alter table public.collector_messages enable row level security;
create table public.collector_notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  actor_id uuid,
  kind text not null,
  source_id uuid not null,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone
);
alter table public.collector_notifications enable row level security;
create table public.deal_progress (
  id uuid default gen_random_uuid() not null,
  offer_type text not null,
  offer_id uuid not null,
  seller_id uuid not null,
  buyer_id uuid not null,
  status text default 'pending'::text not null,
  updated_at timestamp with time zone default now() not null,
  buyer_confirmed_at timestamp with time zone,
  seller_confirmed_at timestamp with time zone
);
alter table public.deal_progress enable row level security;
create table public.demo_orders (
  id uuid default gen_random_uuid() not null,
  creator_id uuid not null,
  participant_id uuid,
  creator_role text not null,
  item_name text not null,
  item_price numeric default 0 not null,
  shipping_price numeric default 0 not null,
  stage integer default 0 not null,
  invite_code text default upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 10)) not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.demo_orders enable row level security;
create table public.listings (
  id uuid default gen_random_uuid() not null,
  seller_id uuid not null,
  title text not null,
  description text,
  category text not null,
  product_type text,
  condition text default 'used'::text not null,
  price numeric(12,2) not null,
  quantity integer default 1 not null,
  image_urls text[] default '{}'::text[] not null,
  accepts_trades boolean default false not null,
  accepts_price_offers boolean default true not null,
  tcg_game text,
  collectible_subcategory text,
  status text default 'active'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  store_id uuid
);
alter table public.listings enable row level security;
create table public.notification_preferences (
  user_id uuid not null,
  messages boolean default true not null,
  trade_offers boolean default true not null,
  wanted_matches boolean default true not null,
  product_updates boolean default false not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.notification_preferences enable row level security;
create table public.notification_reads (
  user_id uuid not null,
  event_key text not null,
  read_at timestamp with time zone default now() not null
);
alter table public.notification_reads enable row level security;
create table public.orders (
  id uuid default gen_random_uuid() not null,
  buyer_id uuid not null,
  seller_id uuid not null,
  listing_id uuid,
  item_title text not null,
  item_price numeric default 0 not null,
  shipping_cost numeric default 0 not null,
  buyer_protection_fee numeric default 0 not null,
  status text default 'demo'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.orders enable row level security;
create table public.price_offer_history (
  id uuid default gen_random_uuid() not null,
  offer_id uuid not null,
  listing_id uuid not null,
  buyer_id uuid not null,
  seller_id uuid not null,
  actor_id uuid,
  action text not null,
  amount numeric not null,
  created_at timestamp with time zone default now() not null
);
alter table public.price_offer_history enable row level security;
create table public.price_offers (
  id uuid default gen_random_uuid() not null,
  listing_id uuid not null,
  buyer_id uuid not null,
  seller_id uuid not null,
  amount numeric not null,
  status text default 'pending'::text not null,
  last_actor_id uuid not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.price_offers enable row level security;
create table public.profiles (
  id uuid not null,
  display_name text default 'DeckPlay member'::text not null,
  username text,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  bio text,
  favorite_tcg text,
  location_label text
);
alter table public.profiles enable row level security;
create table public.saved_listings (
  user_id uuid not null,
  listing_id uuid not null,
  created_at timestamp with time zone default now() not null
);
alter table public.saved_listings enable row level security;
create table public.seller_reviews (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  reviewer_id uuid not null,
  seller_id uuid not null,
  rating integer not null,
  comment text,
  created_at timestamp with time zone default now() not null
);
alter table public.seller_reviews enable row level security;
create table public.staging_test_runs (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_at timestamp with time zone default now() not null,
  suite text not null,
  passed boolean not null,
  checks jsonb not null,
  error text
);
alter table public.staging_test_runs enable row level security;
create table public.stores (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  description text,
  logo_url text,
  created_at timestamp with time zone default now() not null
);
alter table public.stores enable row level security;
create table public.trade_counteroffers (
  id uuid default gen_random_uuid() not null,
  trade_offer_id uuid not null,
  proposer_id uuid not null,
  recipient_id uuid not null,
  cash_amount numeric default 0 not null,
  cash_direction text default 'none'::text not null,
  offer_note text default ''::text not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null
);
alter table public.trade_counteroffers enable row level security;
create table public.trade_items (
  id uuid default gen_random_uuid() not null,
  trade_id uuid not null,
  listing_id uuid,
  offered_by uuid not null,
  item_title text not null,
  agreed_value numeric default 0 not null,
  created_at timestamp with time zone default now() not null
);
alter table public.trade_items enable row level security;
create table public.trade_offers (
  id uuid default gen_random_uuid() not null,
  listing_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  offered_listing_id uuid,
  offer_note text default ''::text,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  cash_amount numeric default 0 not null,
  cash_direction text default 'none'::text
);
alter table public.trade_offers enable row level security;
create table public.trades (
  id uuid default gen_random_uuid() not null,
  proposer_id uuid not null,
  recipient_id uuid not null,
  cash_from_proposer numeric default 0 not null,
  cash_from_recipient numeric default 0 not null,
  platform_fee numeric default 0 not null,
  status text default 'pending'::text not null,
  terms text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.trades enable row level security;
create table public.user_blocks (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamp with time zone default now() not null
);
alter table public.user_blocks enable row level security;
create table public.user_reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid not null,
  reported_id uuid,
  listing_id uuid,
  reason text not null,
  details text,
  status text default 'open'::text not null,
  created_at timestamp with time zone default now() not null
);
alter table public.user_reports enable row level security;
create table public.wanted_posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  game text,
  details text,
  offer_type text default 'either'::text,
  budget numeric,
  created_at timestamp with time zone default now() not null
);
alter table public.wanted_posts enable row level security;
alter table collector_messages add constraint collector_messages_pkey PRIMARY KEY (id);
alter table collector_notifications add constraint collector_notifications_pkey PRIMARY KEY (id);
alter table deal_progress add constraint deal_progress_pkey PRIMARY KEY (id);
alter table demo_orders add constraint demo_orders_invite_code_key UNIQUE (invite_code);
alter table demo_orders add constraint demo_orders_pkey PRIMARY KEY (id);
alter table listings add constraint listings_pkey PRIMARY KEY (id);
alter table listings add constraint listings_price_check CHECK ((price >= (0)::numeric));
alter table listings add constraint listings_quantity_check CHECK ((quantity > 0));
alter table listings add constraint listings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'reserved'::text, 'sold'::text, 'removed'::text])));
alter table notification_preferences add constraint notification_preferences_pkey PRIMARY KEY (user_id);
alter table notification_reads add constraint notification_reads_pkey PRIMARY KEY (user_id, event_key);
alter table orders add constraint orders_pkey PRIMARY KEY (id);
alter table price_offer_history add constraint price_offer_history_pkey PRIMARY KEY (id);
alter table price_offers add constraint price_offers_amount_check CHECK ((amount > (0)::numeric));
alter table price_offers add constraint price_offers_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_username_key UNIQUE (username);
alter table saved_listings add constraint saved_listings_pkey PRIMARY KEY (user_id, listing_id);
alter table seller_reviews add constraint seller_reviews_comment_check CHECK ((length(comment) <= 2000));
alter table seller_reviews add constraint seller_reviews_deal_id_reviewer_id_key UNIQUE (deal_id, reviewer_id);
alter table seller_reviews add constraint seller_reviews_pkey PRIMARY KEY (id);
alter table seller_reviews add constraint seller_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
alter table listings add constraint staging_listing_photos CHECK (((cardinality(image_urls) >= 1) AND (cardinality(image_urls) <= 5)));
alter table listings add constraint staging_listing_price CHECK (((price >= (0)::numeric) AND (price <= (100000)::numeric)));
alter table collector_messages add constraint staging_message_body CHECK (((length(TRIM(BOTH FROM body)) >= 1) AND (length(TRIM(BOTH FROM body)) <= 4000)));
alter table price_offers add constraint staging_offer_amount CHECK (((amount > (0)::numeric) AND (amount <= (100000)::numeric)));
alter table staging_test_runs add constraint staging_test_runs_pkey PRIMARY KEY (id);
alter table wanted_posts add constraint staging_wanted_title CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 150)));
alter table stores add constraint stores_pkey PRIMARY KEY (id);
alter table trade_counteroffers add constraint trade_counteroffers_pkey PRIMARY KEY (id);
alter table trade_items add constraint trade_items_pkey PRIMARY KEY (id);
alter table trade_offers add constraint trade_offers_pkey PRIMARY KEY (id);
alter table trades add constraint trades_pkey PRIMARY KEY (id);
alter table user_blocks add constraint user_blocks_check CHECK ((blocker_id <> blocked_id));
alter table user_blocks add constraint user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id);
alter table user_reports add constraint user_reports_pkey PRIMARY KEY (id);
alter table wanted_posts add constraint wanted_posts_pkey PRIMARY KEY (id);
alter table collector_messages add constraint collector_messages_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table collector_messages add constraint collector_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id);
alter table collector_messages add constraint collector_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);
alter table collector_notifications add constraint collector_notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
alter table collector_notifications add constraint collector_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table deal_progress add constraint deal_progress_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id);
alter table deal_progress add constraint deal_progress_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table demo_orders add constraint demo_orders_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id);
alter table demo_orders add constraint demo_orders_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES auth.users(id);
alter table listings add constraint listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table notification_preferences add constraint notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table notification_reads add constraint notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table orders add constraint orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id);
alter table orders add constraint orders_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table orders add constraint orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table price_offer_history add constraint price_offer_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
alter table price_offer_history add constraint price_offer_history_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id);
alter table price_offer_history add constraint price_offer_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table price_offer_history add constraint price_offer_history_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES price_offers(id);
alter table price_offer_history add constraint price_offer_history_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table price_offers add constraint price_offers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id);
alter table price_offers add constraint price_offers_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table price_offers add constraint price_offers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table saved_listings add constraint saved_listings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table saved_listings add constraint saved_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table seller_reviews add constraint seller_reviews_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deal_progress(id);
alter table seller_reviews add constraint seller_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);
alter table seller_reviews add constraint seller_reviews_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);
alter table staging_test_runs add constraint staging_test_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table stores add constraint stores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);
alter table trade_counteroffers add constraint trade_counteroffers_proposer_id_fkey FOREIGN KEY (proposer_id) REFERENCES auth.users(id);
alter table trade_counteroffers add constraint trade_counteroffers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id);
alter table trade_counteroffers add constraint trade_counteroffers_trade_offer_id_fkey FOREIGN KEY (trade_offer_id) REFERENCES trade_offers(id);
alter table trade_items add constraint trade_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table trade_items add constraint trade_items_offered_by_fkey FOREIGN KEY (offered_by) REFERENCES auth.users(id);
alter table trade_items add constraint trade_items_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES trades(id);
alter table trade_offers add constraint trade_offers_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table trade_offers add constraint trade_offers_offered_listing_id_fkey FOREIGN KEY (offered_listing_id) REFERENCES listings(id);
alter table trade_offers add constraint trade_offers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id);
alter table trade_offers add constraint trade_offers_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);
alter table trades add constraint trades_proposer_id_fkey FOREIGN KEY (proposer_id) REFERENCES auth.users(id);
alter table trades add constraint trades_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id);
alter table user_blocks add constraint user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES auth.users(id);
alter table user_blocks add constraint user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id);
alter table user_reports add constraint user_reports_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id);
alter table user_reports add constraint user_reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES auth.users(id);
alter table user_reports add constraint user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id);
alter table wanted_posts add constraint wanted_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
CREATE UNIQUE INDEX profiles_username_ci ON public.profiles USING btree (lower(username));
CREATE OR REPLACE FUNCTION private.create_trade_counter(p_offer uuid, p_cash numeric, p_direction text, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.trade_offers; uid uuid:=auth.uid(); cid uuid;
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' or exists(select 1 from public.listings where id in(t.listing_id,t.offered_listing_id) and status<>'active') then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') then raise exception 'A counteroffer is already pending';end if;
 if uid<>t.recipient_id then raise exception 'Only recipient can counter the original offer';end if;
 if p_cash is null or p_cash<0 or p_cash>100000 or p_direction not in('none','sender_pays','recipient_pays') or (p_direction='none' and p_cash<>0) or (p_direction<>'none' and p_cash<=0) or length(coalesce(p_note,''))>2000 then raise exception 'Invalid counteroffer terms';end if;
 insert into public.trade_counteroffers(trade_offer_id,proposer_id,recipient_id,cash_amount,cash_direction,offer_note) values(t.id,uid,t.sender_id,p_cash,p_direction,coalesce(p_note,'')) returning id into cid;
 perform private.notify(t.sender_id,uid,'counteroffer',cid);return cid;
end $function$

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.profiles(id,username,display_name) values(new.id,
 coalesce(nullif(new.raw_user_meta_data->>'username',''),'collector_'||substr(replace(new.id::text,'-',''),1,10)),
 coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Collector'));
 return new;
end $function$

CREATE OR REPLACE FUNCTION private.listing_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if current_user in ('authenticated','anon') and old.status='reserved' then raise exception 'Reserved listing is locked'; end if;
 if tg_op='DELETE' then return old; end if;return new;
end $function$

CREATE OR REPLACE FUNCTION private.message_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Messaging is unavailable between these collectors'; end if;
 perform private.notify(new.recipient_id,new.sender_id,'message',new.id);return new;
end $function$

CREATE OR REPLACE FUNCTION private.notify(p_user uuid, p_actor uuid, p_kind text, p_source uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if coalesce((select case when p_kind='message' then messages else trade_offers end from public.notification_preferences where user_id=p_user),true) then
 insert into public.collector_notifications(user_id,actor_id,kind,source_id) values(p_user,p_actor,p_kind,p_source);
 end if;
end $function$

CREATE OR REPLACE FUNCTION private.respond_price_offer(p_offer_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$

CREATE OR REPLACE FUNCTION private.respond_trade_counter(p_counter uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.trade_counteroffers; t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into c from public.trade_counteroffers where id=p_counter and recipient_id=uid;
 if not found then raise exception 'Counteroffer unavailable';end if;
 select * into t from public.trade_offers where id=c.trade_offer_id;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=c.trade_offer_id for update;
 select * into c from public.trade_counteroffers where id=p_counter for update;
 if c.status<>'pending' or t.status<>'pending' then raise exception 'Counteroffer is closed';end if;
 update public.trade_counteroffers set status=case when p_accept then 'accepted' else 'declined' end where id=c.id;
 if p_accept then
 -- Trigger verifies that the accepting actor is recipient of this accepted counter.
 update public.trade_offers set status='accepted',cash_amount=c.cash_amount,cash_direction=c.cash_direction,offer_note=c.offer_note,updated_at=now() where id=t.id;
 update public.price_offers set status='declined',updated_at=now() where listing_id in(t.listing_id,t.offered_listing_id) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id in(t.listing_id,t.offered_listing_id) or offered_listing_id in(t.listing_id,t.offered_listing_id)) and status='pending';
 end if;
 perform private.notify(c.proposer_id,uid,'trade_update',t.id);
end $function$

CREATE OR REPLACE FUNCTION private.respond_trade_offer(p_offer uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') and p_action='accepted' then raise exception 'Respond to the pending counteroffer first';end if;
 update public.trade_offers set status=p_action,updated_at=now() where id=t.id;
 if p_action='accepted' then
 update public.price_offers set status='declined',updated_at=now() where listing_id in(t.listing_id,t.offered_listing_id) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id in(t.listing_id,t.offered_listing_id) or offered_listing_id in(t.listing_id,t.offered_listing_id)) and status='pending';
 end if;
end $function$

CREATE OR REPLACE FUNCTION private.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$

CREATE OR REPLACE FUNCTION private.trade_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$

CREATE OR REPLACE FUNCTION public.create_trade_counter(p_offer uuid, p_cash numeric, p_direction text, p_note text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.create_trade_counter(p_offer,p_cash,p_direction,p_note)$function$

CREATE OR REPLACE FUNCTION public.respond_price_offer(p_offer_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_price_offer(p_offer_id,p_action,p_amount)$function$

CREATE OR REPLACE FUNCTION public.respond_trade_counter(p_counter uuid, p_accept boolean)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_trade_counter(p_counter,p_accept)$function$

CREATE OR REPLACE FUNCTION public.respond_trade_offer(p_offer uuid, p_action text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_trade_offer(p_offer,p_action)$function$

CREATE OR REPLACE FUNCTION public.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.submit_price_offer(p_listing_id,p_amount)$function$

revoke all on function private.create_trade_counter(uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function private.create_trade_counter(uuid,numeric,text,text) to authenticated;
revoke all on function private.handle_new_user() from public,anon,authenticated;
revoke all on function private.listing_guard() from public,anon,authenticated;
revoke all on function private.message_notify() from public,anon,authenticated;
revoke all on function private.notify(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function private.respond_price_offer(uuid,text,numeric) from public,anon,authenticated;
grant execute on function private.respond_price_offer(uuid,text,numeric) to authenticated;
revoke all on function private.respond_trade_counter(uuid,boolean) from public,anon,authenticated;
grant execute on function private.respond_trade_counter(uuid,boolean) to authenticated;
revoke all on function private.respond_trade_offer(uuid,text) from public,anon,authenticated;
grant execute on function private.respond_trade_offer(uuid,text) to authenticated;
revoke all on function private.submit_price_offer(uuid,numeric) from public,anon,authenticated;
grant execute on function private.submit_price_offer(uuid,numeric) to authenticated;
revoke all on function private.trade_guard() from public,anon,authenticated;
revoke all on function create_trade_counter(uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function create_trade_counter(uuid,numeric,text,text) to authenticated;
revoke all on function respond_price_offer(uuid,text,numeric) from public,anon,authenticated;
grant execute on function respond_price_offer(uuid,text,numeric) to authenticated;
revoke all on function respond_trade_counter(uuid,boolean) from public,anon,authenticated;
grant execute on function respond_trade_counter(uuid,boolean) to authenticated;
revoke all on function respond_trade_offer(uuid,text) from public,anon,authenticated;
grant execute on function respond_trade_offer(uuid,text) to authenticated;
revoke all on function submit_price_offer(uuid,numeric) from public,anon,authenticated;
grant execute on function submit_price_offer(uuid,numeric) to authenticated;
create policy "Participants read messages" on public.collector_messages as PERMISSIVE for SELECT to authenticated using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));
create policy "Recipient reads message" on public.collector_messages as PERMISSIVE for UPDATE to authenticated using ((recipient_id = ( SELECT auth.uid() AS uid))) with check ((recipient_id = ( SELECT auth.uid() AS uid)));
create policy "Sender inserts messages" on public.collector_messages as PERMISSIVE for INSERT to authenticated with check (((auth.uid() = sender_id) AND (sender_id <> recipient_id)));
create policy "Owner reads notification" on public.collector_notifications as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Owner views notifications" on public.collector_notifications as PERMISSIVE for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Deal participants view" on public.deal_progress as PERMISSIVE for SELECT to authenticated using (((seller_id = ( SELECT auth.uid() AS uid)) OR (buyer_id = ( SELECT auth.uid() AS uid))));
create policy "Demo participants read" on public.demo_orders as PERMISSIVE for SELECT to authenticated using (((creator_id = ( SELECT auth.uid() AS uid)) OR (participant_id = ( SELECT auth.uid() AS uid))));
create policy "Active listings public and owners can view theirs" on public.listings as PERMISSIVE for SELECT to anon,authenticated using (((status = 'active'::text) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "Buyer views negotiated listing" on public.listings as PERMISSIVE for SELECT to authenticated using (((EXISTS ( SELECT 1
   FROM price_offers o
  WHERE ((o.listing_id = listings.id) AND (o.buyer_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM trade_offers t
  WHERE (((t.listing_id = listings.id) OR (t.offered_listing_id = listings.id)) AND ((( SELECT auth.uid() AS uid) = t.sender_id) OR (( SELECT auth.uid() AS uid) = t.recipient_id)))))));
create policy "Seller deletes listing" on public.listings as PERMISSIVE for DELETE to authenticated using ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "Seller inserts listing" on public.listings as PERMISSIVE for INSERT to authenticated with check (((seller_id = ( SELECT auth.uid() AS uid)) AND (status = 'active'::text)));
create policy "Seller updates listing" on public.listings as PERMISSIVE for UPDATE to authenticated using ((seller_id = ( SELECT auth.uid() AS uid))) with check ((seller_id = ( SELECT auth.uid() AS uid)));
create policy "Insert own preferences" on public.notification_preferences as PERMISSIVE for INSERT to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Read own preferences" on public.notification_preferences as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Update own preferences" on public.notification_preferences as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Mark own notifications" on public.notification_reads as PERMISSIVE for INSERT to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Read own notification markers" on public.notification_reads as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Update own read markers" on public.notification_reads as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Order participants view" on public.orders as PERMISSIVE for SELECT to authenticated using (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "Participants view price offer history" on public.price_offer_history as PERMISSIVE for SELECT to authenticated using (((buyer_id = ( SELECT auth.uid() AS uid)) OR (seller_id = ( SELECT auth.uid() AS uid))));
create policy "Participants view price offers" on public.price_offers as PERMISSIVE for SELECT to authenticated using (((auth.uid() = buyer_id) OR (auth.uid() = seller_id)));
create policy "Profiles publicly readable" on public.profiles as PERMISSIVE for SELECT to anon,authenticated using (true);
create policy "Users create own profiles" on public.profiles as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = id));
create policy "Users update own profiles" on public.profiles as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy "Add own saved listings" on public.saved_listings as PERMISSIVE for INSERT to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Delete own saved listings" on public.saved_listings as PERMISSIVE for DELETE to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "View own saved listings" on public.saved_listings as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Read seller reviews" on public.seller_reviews as PERMISSIVE for SELECT to public using (true);
create policy "Runner reads own health reports" on public.staging_test_runs as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'deckplay_test_runner'::text)) = 'true'::text)));
create policy "Runner writes own health reports" on public.staging_test_runs as PERMISSIVE for INSERT to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'deckplay_test_runner'::text)) = 'true'::text)));
create policy "Create own store" on public.stores as PERMISSIVE for INSERT to authenticated with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy "Public store profiles" on public.stores as PERMISSIVE for SELECT to anon,authenticated using (true);
create policy "Trade counteroffer parties read" on public.trade_counteroffers as PERMISSIVE for SELECT to authenticated using (((proposer_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Trade parties view items" on public.trade_items as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = trade_items.trade_id) AND ((t.proposer_id = ( SELECT auth.uid() AS uid)) OR (t.recipient_id = ( SELECT auth.uid() AS uid)))))));
create policy "Participants view trade offers" on public.trade_offers as PERMISSIVE for SELECT to authenticated using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));
create policy "Trade party responds" on public.trade_offers as PERMISSIVE for UPDATE to authenticated using (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid)))) with check (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Trade sender inserts" on public.trade_offers as PERMISSIVE for INSERT to authenticated with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));
create policy "Trade participants view" on public.trades as PERMISSIVE for SELECT to authenticated using (((proposer_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Create own blocks" on public.user_blocks as PERMISSIVE for INSERT to authenticated with check ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "Remove own blocks" on public.user_blocks as PERMISSIVE for DELETE to authenticated using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "See own blocks" on public.user_blocks as PERMISSIVE for SELECT to authenticated using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "Read own reports" on public.user_reports as PERMISSIVE for SELECT to authenticated using ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy "Submit own reports" on public.user_reports as PERMISSIVE for INSERT to authenticated with check ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy "Anyone views wanted posts" on public.wanted_posts as PERMISSIVE for SELECT to anon,authenticated using (true);
create policy "Delete own wanted" on public.wanted_posts as PERMISSIVE for DELETE to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members create wanted posts" on public.wanted_posts as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));
create policy "Delete own staging photos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = ANY (ARRAY['listing-images'::text, 'profile-avatars'::text])) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "Read own staging photos" on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = ANY (ARRAY['listing-images'::text, 'profile-avatars'::text])) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "Update own staging photos" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = ANY (ARRAY['listing-images'::text, 'profile-avatars'::text])) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) with check (((bucket_id = ANY (ARRAY['listing-images'::text, 'profile-avatars'::text])) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "Upload own staging photos" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = ANY (ARRAY['listing-images'::text, 'profile-avatars'::text])) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE TRIGGER guard_listing BEFORE DELETE OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION private.listing_guard();
CREATE TRIGGER guard_trade BEFORE INSERT OR UPDATE ON public.trade_offers FOR EACH ROW EXECUTE FUNCTION private.trade_guard();
CREATE TRIGGER message_notification AFTER INSERT ON public.collector_messages FOR EACH ROW EXECUTE FUNCTION private.message_notify();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
revoke all on table public.collector_messages from anon,authenticated;
revoke all on table public.collector_notifications from anon,authenticated;
revoke all on table public.deal_progress from anon,authenticated;
revoke all on table public.demo_orders from anon,authenticated;
revoke all on table public.listings from anon,authenticated;
revoke all on table public.notification_preferences from anon,authenticated;
revoke all on table public.notification_reads from anon,authenticated;
revoke all on table public.orders from anon,authenticated;
revoke all on table public.price_offer_history from anon,authenticated;
revoke all on table public.price_offers from anon,authenticated;
revoke all on table public.profiles from anon,authenticated;
revoke all on table public.saved_listings from anon,authenticated;
revoke all on table public.seller_reviews from anon,authenticated;
revoke all on table public.staging_test_runs from anon,authenticated;
revoke all on table public.stores from anon,authenticated;
revoke all on table public.trade_counteroffers from anon,authenticated;
revoke all on table public.trade_items from anon,authenticated;
revoke all on table public.trade_offers from anon,authenticated;
revoke all on table public.trades from anon,authenticated;
revoke all on table public.user_blocks from anon,authenticated;
revoke all on table public.user_reports from anon,authenticated;
revoke all on table public.wanted_posts from anon,authenticated;
grant DELETE on table public.collector_messages to anon;
grant INSERT on table public.collector_messages to anon;
grant REFERENCES on table public.collector_messages to anon;
grant SELECT on table public.collector_messages to anon;
grant TRIGGER on table public.collector_messages to anon;
grant TRUNCATE on table public.collector_messages to anon;
grant UPDATE on table public.collector_messages to anon;
grant DELETE on table public.collector_messages to authenticated;
grant INSERT on table public.collector_messages to authenticated;
grant REFERENCES on table public.collector_messages to authenticated;
grant SELECT on table public.collector_messages to authenticated;
grant TRIGGER on table public.collector_messages to authenticated;
grant TRUNCATE on table public.collector_messages to authenticated;
grant DELETE on table public.collector_messages to service_role;
grant INSERT on table public.collector_messages to service_role;
grant REFERENCES on table public.collector_messages to service_role;
grant SELECT on table public.collector_messages to service_role;
grant TRIGGER on table public.collector_messages to service_role;
grant TRUNCATE on table public.collector_messages to service_role;
grant UPDATE on table public.collector_messages to service_role;
grant DELETE on table public.collector_notifications to anon;
grant INSERT on table public.collector_notifications to anon;
grant REFERENCES on table public.collector_notifications to anon;
grant SELECT on table public.collector_notifications to anon;
grant TRIGGER on table public.collector_notifications to anon;
grant TRUNCATE on table public.collector_notifications to anon;
grant UPDATE on table public.collector_notifications to anon;
grant DELETE on table public.collector_notifications to authenticated;
grant INSERT on table public.collector_notifications to authenticated;
grant REFERENCES on table public.collector_notifications to authenticated;
grant SELECT on table public.collector_notifications to authenticated;
grant TRIGGER on table public.collector_notifications to authenticated;
grant TRUNCATE on table public.collector_notifications to authenticated;
grant DELETE on table public.collector_notifications to service_role;
grant INSERT on table public.collector_notifications to service_role;
grant REFERENCES on table public.collector_notifications to service_role;
grant SELECT on table public.collector_notifications to service_role;
grant TRIGGER on table public.collector_notifications to service_role;
grant TRUNCATE on table public.collector_notifications to service_role;
grant UPDATE on table public.collector_notifications to service_role;
grant DELETE on table public.deal_progress to anon;
grant INSERT on table public.deal_progress to anon;
grant REFERENCES on table public.deal_progress to anon;
grant SELECT on table public.deal_progress to anon;
grant TRIGGER on table public.deal_progress to anon;
grant TRUNCATE on table public.deal_progress to anon;
grant UPDATE on table public.deal_progress to anon;
grant DELETE on table public.deal_progress to authenticated;
grant INSERT on table public.deal_progress to authenticated;
grant REFERENCES on table public.deal_progress to authenticated;
grant SELECT on table public.deal_progress to authenticated;
grant TRIGGER on table public.deal_progress to authenticated;
grant TRUNCATE on table public.deal_progress to authenticated;
grant UPDATE on table public.deal_progress to authenticated;
grant DELETE on table public.deal_progress to service_role;
grant INSERT on table public.deal_progress to service_role;
grant REFERENCES on table public.deal_progress to service_role;
grant SELECT on table public.deal_progress to service_role;
grant TRIGGER on table public.deal_progress to service_role;
grant TRUNCATE on table public.deal_progress to service_role;
grant UPDATE on table public.deal_progress to service_role;
grant DELETE on table public.demo_orders to anon;
grant INSERT on table public.demo_orders to anon;
grant REFERENCES on table public.demo_orders to anon;
grant SELECT on table public.demo_orders to anon;
grant TRIGGER on table public.demo_orders to anon;
grant TRUNCATE on table public.demo_orders to anon;
grant UPDATE on table public.demo_orders to anon;
grant DELETE on table public.demo_orders to authenticated;
grant INSERT on table public.demo_orders to authenticated;
grant REFERENCES on table public.demo_orders to authenticated;
grant SELECT on table public.demo_orders to authenticated;
grant TRIGGER on table public.demo_orders to authenticated;
grant TRUNCATE on table public.demo_orders to authenticated;
grant UPDATE on table public.demo_orders to authenticated;
grant DELETE on table public.demo_orders to service_role;
grant INSERT on table public.demo_orders to service_role;
grant REFERENCES on table public.demo_orders to service_role;
grant SELECT on table public.demo_orders to service_role;
grant TRIGGER on table public.demo_orders to service_role;
grant TRUNCATE on table public.demo_orders to service_role;
grant UPDATE on table public.demo_orders to service_role;
grant DELETE on table public.listings to anon;
grant INSERT on table public.listings to anon;
grant REFERENCES on table public.listings to anon;
grant SELECT on table public.listings to anon;
grant TRIGGER on table public.listings to anon;
grant TRUNCATE on table public.listings to anon;
grant UPDATE on table public.listings to anon;
grant DELETE on table public.listings to authenticated;
grant INSERT on table public.listings to authenticated;
grant REFERENCES on table public.listings to authenticated;
grant SELECT on table public.listings to authenticated;
grant TRIGGER on table public.listings to authenticated;
grant TRUNCATE on table public.listings to authenticated;
grant UPDATE on table public.listings to authenticated;
grant DELETE on table public.listings to service_role;
grant INSERT on table public.listings to service_role;
grant REFERENCES on table public.listings to service_role;
grant SELECT on table public.listings to service_role;
grant TRIGGER on table public.listings to service_role;
grant TRUNCATE on table public.listings to service_role;
grant UPDATE on table public.listings to service_role;
grant DELETE on table public.notification_preferences to anon;
grant INSERT on table public.notification_preferences to anon;
grant REFERENCES on table public.notification_preferences to anon;
grant SELECT on table public.notification_preferences to anon;
grant TRIGGER on table public.notification_preferences to anon;
grant TRUNCATE on table public.notification_preferences to anon;
grant UPDATE on table public.notification_preferences to anon;
grant DELETE on table public.notification_preferences to authenticated;
grant INSERT on table public.notification_preferences to authenticated;
grant REFERENCES on table public.notification_preferences to authenticated;
grant SELECT on table public.notification_preferences to authenticated;
grant TRIGGER on table public.notification_preferences to authenticated;
grant TRUNCATE on table public.notification_preferences to authenticated;
grant UPDATE on table public.notification_preferences to authenticated;
grant DELETE on table public.notification_preferences to service_role;
grant INSERT on table public.notification_preferences to service_role;
grant REFERENCES on table public.notification_preferences to service_role;
grant SELECT on table public.notification_preferences to service_role;
grant TRIGGER on table public.notification_preferences to service_role;
grant TRUNCATE on table public.notification_preferences to service_role;
grant UPDATE on table public.notification_preferences to service_role;
grant DELETE on table public.notification_reads to anon;
grant INSERT on table public.notification_reads to anon;
grant REFERENCES on table public.notification_reads to anon;
grant SELECT on table public.notification_reads to anon;
grant TRIGGER on table public.notification_reads to anon;
grant TRUNCATE on table public.notification_reads to anon;
grant UPDATE on table public.notification_reads to anon;
grant DELETE on table public.notification_reads to authenticated;
grant INSERT on table public.notification_reads to authenticated;
grant REFERENCES on table public.notification_reads to authenticated;
grant SELECT on table public.notification_reads to authenticated;
grant TRIGGER on table public.notification_reads to authenticated;
grant TRUNCATE on table public.notification_reads to authenticated;
grant UPDATE on table public.notification_reads to authenticated;
grant DELETE on table public.notification_reads to service_role;
grant INSERT on table public.notification_reads to service_role;
grant REFERENCES on table public.notification_reads to service_role;
grant SELECT on table public.notification_reads to service_role;
grant TRIGGER on table public.notification_reads to service_role;
grant TRUNCATE on table public.notification_reads to service_role;
grant UPDATE on table public.notification_reads to service_role;
grant DELETE on table public.orders to anon;
grant INSERT on table public.orders to anon;
grant REFERENCES on table public.orders to anon;
grant SELECT on table public.orders to anon;
grant TRIGGER on table public.orders to anon;
grant TRUNCATE on table public.orders to anon;
grant UPDATE on table public.orders to anon;
grant DELETE on table public.orders to authenticated;
grant INSERT on table public.orders to authenticated;
grant REFERENCES on table public.orders to authenticated;
grant SELECT on table public.orders to authenticated;
grant TRIGGER on table public.orders to authenticated;
grant TRUNCATE on table public.orders to authenticated;
grant UPDATE on table public.orders to authenticated;
grant DELETE on table public.orders to service_role;
grant INSERT on table public.orders to service_role;
grant REFERENCES on table public.orders to service_role;
grant SELECT on table public.orders to service_role;
grant TRIGGER on table public.orders to service_role;
grant TRUNCATE on table public.orders to service_role;
grant UPDATE on table public.orders to service_role;
grant DELETE on table public.price_offer_history to anon;
grant INSERT on table public.price_offer_history to anon;
grant REFERENCES on table public.price_offer_history to anon;
grant SELECT on table public.price_offer_history to anon;
grant TRIGGER on table public.price_offer_history to anon;
grant TRUNCATE on table public.price_offer_history to anon;
grant UPDATE on table public.price_offer_history to anon;
grant DELETE on table public.price_offer_history to authenticated;
grant INSERT on table public.price_offer_history to authenticated;
grant REFERENCES on table public.price_offer_history to authenticated;
grant SELECT on table public.price_offer_history to authenticated;
grant TRIGGER on table public.price_offer_history to authenticated;
grant TRUNCATE on table public.price_offer_history to authenticated;
grant UPDATE on table public.price_offer_history to authenticated;
grant DELETE on table public.price_offer_history to service_role;
grant INSERT on table public.price_offer_history to service_role;
grant REFERENCES on table public.price_offer_history to service_role;
grant SELECT on table public.price_offer_history to service_role;
grant TRIGGER on table public.price_offer_history to service_role;
grant TRUNCATE on table public.price_offer_history to service_role;
grant UPDATE on table public.price_offer_history to service_role;
grant DELETE on table public.price_offers to anon;
grant INSERT on table public.price_offers to anon;
grant REFERENCES on table public.price_offers to anon;
grant SELECT on table public.price_offers to anon;
grant TRIGGER on table public.price_offers to anon;
grant TRUNCATE on table public.price_offers to anon;
grant UPDATE on table public.price_offers to anon;
grant DELETE on table public.price_offers to authenticated;
grant INSERT on table public.price_offers to authenticated;
grant REFERENCES on table public.price_offers to authenticated;
grant SELECT on table public.price_offers to authenticated;
grant TRIGGER on table public.price_offers to authenticated;
grant TRUNCATE on table public.price_offers to authenticated;
grant UPDATE on table public.price_offers to authenticated;
grant DELETE on table public.price_offers to service_role;
grant INSERT on table public.price_offers to service_role;
grant REFERENCES on table public.price_offers to service_role;
grant SELECT on table public.price_offers to service_role;
grant TRIGGER on table public.price_offers to service_role;
grant TRUNCATE on table public.price_offers to service_role;
grant UPDATE on table public.price_offers to service_role;
grant DELETE on table public.profiles to anon;
grant INSERT on table public.profiles to anon;
grant REFERENCES on table public.profiles to anon;
grant SELECT on table public.profiles to anon;
grant TRIGGER on table public.profiles to anon;
grant TRUNCATE on table public.profiles to anon;
grant UPDATE on table public.profiles to anon;
grant DELETE on table public.profiles to authenticated;
grant INSERT on table public.profiles to authenticated;
grant REFERENCES on table public.profiles to authenticated;
grant SELECT on table public.profiles to authenticated;
grant TRIGGER on table public.profiles to authenticated;
grant TRUNCATE on table public.profiles to authenticated;
grant UPDATE on table public.profiles to authenticated;
grant DELETE on table public.profiles to service_role;
grant INSERT on table public.profiles to service_role;
grant REFERENCES on table public.profiles to service_role;
grant SELECT on table public.profiles to service_role;
grant TRIGGER on table public.profiles to service_role;
grant TRUNCATE on table public.profiles to service_role;
grant UPDATE on table public.profiles to service_role;
grant DELETE on table public.saved_listings to anon;
grant INSERT on table public.saved_listings to anon;
grant REFERENCES on table public.saved_listings to anon;
grant SELECT on table public.saved_listings to anon;
grant TRIGGER on table public.saved_listings to anon;
grant TRUNCATE on table public.saved_listings to anon;
grant UPDATE on table public.saved_listings to anon;
grant DELETE on table public.saved_listings to authenticated;
grant INSERT on table public.saved_listings to authenticated;
grant REFERENCES on table public.saved_listings to authenticated;
grant SELECT on table public.saved_listings to authenticated;
grant TRIGGER on table public.saved_listings to authenticated;
grant TRUNCATE on table public.saved_listings to authenticated;
grant UPDATE on table public.saved_listings to authenticated;
grant DELETE on table public.saved_listings to service_role;
grant INSERT on table public.saved_listings to service_role;
grant REFERENCES on table public.saved_listings to service_role;
grant SELECT on table public.saved_listings to service_role;
grant TRIGGER on table public.saved_listings to service_role;
grant TRUNCATE on table public.saved_listings to service_role;
grant UPDATE on table public.saved_listings to service_role;
grant DELETE on table public.seller_reviews to anon;
grant INSERT on table public.seller_reviews to anon;
grant REFERENCES on table public.seller_reviews to anon;
grant SELECT on table public.seller_reviews to anon;
grant TRIGGER on table public.seller_reviews to anon;
grant TRUNCATE on table public.seller_reviews to anon;
grant UPDATE on table public.seller_reviews to anon;
grant DELETE on table public.seller_reviews to authenticated;
grant INSERT on table public.seller_reviews to authenticated;
grant REFERENCES on table public.seller_reviews to authenticated;
grant SELECT on table public.seller_reviews to authenticated;
grant TRIGGER on table public.seller_reviews to authenticated;
grant TRUNCATE on table public.seller_reviews to authenticated;
grant UPDATE on table public.seller_reviews to authenticated;
grant DELETE on table public.seller_reviews to service_role;
grant INSERT on table public.seller_reviews to service_role;
grant REFERENCES on table public.seller_reviews to service_role;
grant SELECT on table public.seller_reviews to service_role;
grant TRIGGER on table public.seller_reviews to service_role;
grant TRUNCATE on table public.seller_reviews to service_role;
grant UPDATE on table public.seller_reviews to service_role;
grant DELETE on table public.staging_test_runs to anon;
grant INSERT on table public.staging_test_runs to anon;
grant REFERENCES on table public.staging_test_runs to anon;
grant SELECT on table public.staging_test_runs to anon;
grant TRIGGER on table public.staging_test_runs to anon;
grant TRUNCATE on table public.staging_test_runs to anon;
grant UPDATE on table public.staging_test_runs to anon;
grant DELETE on table public.staging_test_runs to authenticated;
grant INSERT on table public.staging_test_runs to authenticated;
grant REFERENCES on table public.staging_test_runs to authenticated;
grant SELECT on table public.staging_test_runs to authenticated;
grant TRIGGER on table public.staging_test_runs to authenticated;
grant TRUNCATE on table public.staging_test_runs to authenticated;
grant UPDATE on table public.staging_test_runs to authenticated;
grant DELETE on table public.staging_test_runs to service_role;
grant INSERT on table public.staging_test_runs to service_role;
grant REFERENCES on table public.staging_test_runs to service_role;
grant SELECT on table public.staging_test_runs to service_role;
grant TRIGGER on table public.staging_test_runs to service_role;
grant TRUNCATE on table public.staging_test_runs to service_role;
grant UPDATE on table public.staging_test_runs to service_role;
grant DELETE on table public.stores to anon;
grant INSERT on table public.stores to anon;
grant REFERENCES on table public.stores to anon;
grant SELECT on table public.stores to anon;
grant TRIGGER on table public.stores to anon;
grant TRUNCATE on table public.stores to anon;
grant UPDATE on table public.stores to anon;
grant DELETE on table public.stores to authenticated;
grant INSERT on table public.stores to authenticated;
grant REFERENCES on table public.stores to authenticated;
grant SELECT on table public.stores to authenticated;
grant TRIGGER on table public.stores to authenticated;
grant TRUNCATE on table public.stores to authenticated;
grant UPDATE on table public.stores to authenticated;
grant DELETE on table public.stores to service_role;
grant INSERT on table public.stores to service_role;
grant REFERENCES on table public.stores to service_role;
grant SELECT on table public.stores to service_role;
grant TRIGGER on table public.stores to service_role;
grant TRUNCATE on table public.stores to service_role;
grant UPDATE on table public.stores to service_role;
grant DELETE on table public.trade_counteroffers to anon;
grant INSERT on table public.trade_counteroffers to anon;
grant REFERENCES on table public.trade_counteroffers to anon;
grant SELECT on table public.trade_counteroffers to anon;
grant TRIGGER on table public.trade_counteroffers to anon;
grant TRUNCATE on table public.trade_counteroffers to anon;
grant UPDATE on table public.trade_counteroffers to anon;
grant DELETE on table public.trade_counteroffers to authenticated;
grant INSERT on table public.trade_counteroffers to authenticated;
grant REFERENCES on table public.trade_counteroffers to authenticated;
grant SELECT on table public.trade_counteroffers to authenticated;
grant TRIGGER on table public.trade_counteroffers to authenticated;
grant TRUNCATE on table public.trade_counteroffers to authenticated;
grant UPDATE on table public.trade_counteroffers to authenticated;
grant DELETE on table public.trade_counteroffers to service_role;
grant INSERT on table public.trade_counteroffers to service_role;
grant REFERENCES on table public.trade_counteroffers to service_role;
grant SELECT on table public.trade_counteroffers to service_role;
grant TRIGGER on table public.trade_counteroffers to service_role;
grant TRUNCATE on table public.trade_counteroffers to service_role;
grant UPDATE on table public.trade_counteroffers to service_role;
grant DELETE on table public.trade_items to anon;
grant INSERT on table public.trade_items to anon;
grant REFERENCES on table public.trade_items to anon;
grant SELECT on table public.trade_items to anon;
grant TRIGGER on table public.trade_items to anon;
grant TRUNCATE on table public.trade_items to anon;
grant UPDATE on table public.trade_items to anon;
grant DELETE on table public.trade_items to authenticated;
grant INSERT on table public.trade_items to authenticated;
grant REFERENCES on table public.trade_items to authenticated;
grant SELECT on table public.trade_items to authenticated;
grant TRIGGER on table public.trade_items to authenticated;
grant TRUNCATE on table public.trade_items to authenticated;
grant UPDATE on table public.trade_items to authenticated;
grant DELETE on table public.trade_items to service_role;
grant INSERT on table public.trade_items to service_role;
grant REFERENCES on table public.trade_items to service_role;
grant SELECT on table public.trade_items to service_role;
grant TRIGGER on table public.trade_items to service_role;
grant TRUNCATE on table public.trade_items to service_role;
grant UPDATE on table public.trade_items to service_role;
grant DELETE on table public.trade_offers to anon;
grant INSERT on table public.trade_offers to anon;
grant REFERENCES on table public.trade_offers to anon;
grant SELECT on table public.trade_offers to anon;
grant TRIGGER on table public.trade_offers to anon;
grant TRUNCATE on table public.trade_offers to anon;
grant UPDATE on table public.trade_offers to anon;
grant DELETE on table public.trade_offers to authenticated;
grant INSERT on table public.trade_offers to authenticated;
grant REFERENCES on table public.trade_offers to authenticated;
grant SELECT on table public.trade_offers to authenticated;
grant TRIGGER on table public.trade_offers to authenticated;
grant TRUNCATE on table public.trade_offers to authenticated;
grant DELETE on table public.trade_offers to service_role;
grant INSERT on table public.trade_offers to service_role;
grant REFERENCES on table public.trade_offers to service_role;
grant SELECT on table public.trade_offers to service_role;
grant TRIGGER on table public.trade_offers to service_role;
grant TRUNCATE on table public.trade_offers to service_role;
grant UPDATE on table public.trade_offers to service_role;
grant DELETE on table public.trades to anon;
grant INSERT on table public.trades to anon;
grant REFERENCES on table public.trades to anon;
grant SELECT on table public.trades to anon;
grant TRIGGER on table public.trades to anon;
grant TRUNCATE on table public.trades to anon;
grant UPDATE on table public.trades to anon;
grant DELETE on table public.trades to authenticated;
grant INSERT on table public.trades to authenticated;
grant REFERENCES on table public.trades to authenticated;
grant SELECT on table public.trades to authenticated;
grant TRIGGER on table public.trades to authenticated;
grant TRUNCATE on table public.trades to authenticated;
grant UPDATE on table public.trades to authenticated;
grant DELETE on table public.trades to service_role;
grant INSERT on table public.trades to service_role;
grant REFERENCES on table public.trades to service_role;
grant SELECT on table public.trades to service_role;
grant TRIGGER on table public.trades to service_role;
grant TRUNCATE on table public.trades to service_role;
grant UPDATE on table public.trades to service_role;
grant DELETE on table public.user_blocks to anon;
grant INSERT on table public.user_blocks to anon;
grant REFERENCES on table public.user_blocks to anon;
grant SELECT on table public.user_blocks to anon;
grant TRIGGER on table public.user_blocks to anon;
grant TRUNCATE on table public.user_blocks to anon;
grant UPDATE on table public.user_blocks to anon;
grant DELETE on table public.user_blocks to authenticated;
grant INSERT on table public.user_blocks to authenticated;
grant REFERENCES on table public.user_blocks to authenticated;
grant SELECT on table public.user_blocks to authenticated;
grant TRIGGER on table public.user_blocks to authenticated;
grant TRUNCATE on table public.user_blocks to authenticated;
grant UPDATE on table public.user_blocks to authenticated;
grant DELETE on table public.user_blocks to service_role;
grant INSERT on table public.user_blocks to service_role;
grant REFERENCES on table public.user_blocks to service_role;
grant SELECT on table public.user_blocks to service_role;
grant TRIGGER on table public.user_blocks to service_role;
grant TRUNCATE on table public.user_blocks to service_role;
grant UPDATE on table public.user_blocks to service_role;
grant DELETE on table public.user_reports to anon;
grant INSERT on table public.user_reports to anon;
grant REFERENCES on table public.user_reports to anon;
grant SELECT on table public.user_reports to anon;
grant TRIGGER on table public.user_reports to anon;
grant TRUNCATE on table public.user_reports to anon;
grant UPDATE on table public.user_reports to anon;
grant DELETE on table public.user_reports to authenticated;
grant INSERT on table public.user_reports to authenticated;
grant REFERENCES on table public.user_reports to authenticated;
grant SELECT on table public.user_reports to authenticated;
grant TRIGGER on table public.user_reports to authenticated;
grant TRUNCATE on table public.user_reports to authenticated;
grant UPDATE on table public.user_reports to authenticated;
grant DELETE on table public.user_reports to service_role;
grant INSERT on table public.user_reports to service_role;
grant REFERENCES on table public.user_reports to service_role;
grant SELECT on table public.user_reports to service_role;
grant TRIGGER on table public.user_reports to service_role;
grant TRUNCATE on table public.user_reports to service_role;
grant UPDATE on table public.user_reports to service_role;
grant DELETE on table public.wanted_posts to anon;
grant INSERT on table public.wanted_posts to anon;
grant REFERENCES on table public.wanted_posts to anon;
grant SELECT on table public.wanted_posts to anon;
grant TRIGGER on table public.wanted_posts to anon;
grant TRUNCATE on table public.wanted_posts to anon;
grant UPDATE on table public.wanted_posts to anon;
grant DELETE on table public.wanted_posts to authenticated;
grant INSERT on table public.wanted_posts to authenticated;
grant REFERENCES on table public.wanted_posts to authenticated;
grant SELECT on table public.wanted_posts to authenticated;
grant TRIGGER on table public.wanted_posts to authenticated;
grant TRUNCATE on table public.wanted_posts to authenticated;
grant UPDATE on table public.wanted_posts to authenticated;
grant DELETE on table public.wanted_posts to service_role;
grant INSERT on table public.wanted_posts to service_role;
grant REFERENCES on table public.wanted_posts to service_role;
grant SELECT on table public.wanted_posts to service_role;
grant TRIGGER on table public.wanted_posts to service_role;
grant TRUNCATE on table public.wanted_posts to service_role;
grant UPDATE on table public.wanted_posts to service_role;
grant update(read_at) on public.collector_messages to authenticated;
grant update(read_at) on public.collector_notifications to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('listing-images','listing-images',true,5242880,array['image/jpeg','image/png','image/webp']),('profile-avatars','profile-avatars',true,3145728,array['image/jpeg','image/png','image/webp']);
notify pgrst,'reload schema';
commit;

