-- Isolated staging only. Private support tickets, with server-enforced authorization.
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('account','listing','messages','offers_trades','safety','other')),
 subject text not null check (char_length(subject) between 8 and 120),
 body text not null check (char_length(body) between 20 and 3000),
 status text not null default 'open' check (status in ('open','waiting_on_staff','waiting_on_user','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists support_tickets_owner_recent_idx on public.support_tickets(owner_id,created_at desc);
create index if not exists support_tickets_staff_queue_idx on public.support_tickets(updated_at desc);
create table if not exists public.support_ticket_replies (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 is_staff boolean not null default false,
 body text not null check (char_length(body) between 2 and 3000),
 created_at timestamptz not null default now()
);
create index if not exists support_ticket_replies_thread_idx on public.support_ticket_replies(ticket_id,created_at,id);
alter table public.support_tickets enable row level security;
alter table public.support_ticket_replies enable row level security;
revoke all on public.support_tickets from anon,authenticated;
revoke all on public.support_ticket_replies from anon,authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_ticket_replies to authenticated;
create policy "ticket owner or verified staff reads" on public.support_tickets for select to authenticated
 using (owner_id = (select auth.uid()) or (select public.is_deckplay_moderator()));
create policy "ticket participant or verified staff reads replies" on public.support_ticket_replies for select to authenticated
 using (exists (select 1 from public.support_tickets t where t.id=ticket_id
   and (t.owner_id=(select auth.uid()) or (select public.is_deckplay_moderator()))));
-- All writes are RPC-only; client-side flags cannot impersonate staff.
create or replace function public.create_support_ticket(p_category text,p_subject text,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to contact support' using errcode='42501'; end if;
 if p_category is null or p_category not in ('account','listing','messages','offers_trades','safety','other')
   or char_length(btrim(coalesce(p_subject,''))) not between 8 and 120
   or char_length(btrim(coalesce(p_body,''))) not between 20 and 3000 then
  raise exception 'Choose a topic, subject (8–120) and details (20–3000)' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
 if (select count(*) from public.support_tickets where owner_id=v_user and created_at>now()-interval '24 hours')>=5
   or exists(select 1 from public.support_tickets where owner_id=v_user and created_at>now()-interval '1 minute') then
  raise exception 'Support request limit reached. Try again later.' using errcode='P0001';
 end if;
 insert into public.support_tickets(owner_id,category,subject,body)
 values(v_user,p_category,btrim(p_subject),btrim(p_body)) returning id into v_id;
 return v_id;
end $$;
create or replace function public.reply_support_ticket(p_ticket_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_owner uuid; v_status text; v_staff boolean; v_id uuid;
begin
 if v_user is null then raise exception 'Sign in to reply' using errcode='42501'; end if;
 if p_ticket_id is null or char_length(btrim(coalesce(p_body,''))) not between 2 and 3000 then
  raise exception 'Reply must contain 2–3000 characters' using errcode='22023';
 end if;
 select owner_id,status into v_owner,v_status from public.support_tickets where id=p_ticket_id for update;
 if not found then raise exception 'Ticket not found' using errcode='42501'; end if;
 v_staff:=public.is_deckplay_moderator();
 if v_owner<>v_user and not v_staff then raise exception 'Ticket not found' using errcode='42501'; end if;
 if v_status='resolved' then raise exception 'This ticket is resolved. Open a new request if needed.' using errcode='22023'; end if;
 if (select count(*) from public.support_ticket_replies where author_id=v_user and created_at>now()-interval '24 hours')>=30 then
  raise exception 'Reply limit reached. Try again later.' using errcode='P0001';
 end if;
 insert into public.support_ticket_replies(ticket_id,author_id,is_staff,body)
 values(p_ticket_id,v_user,v_staff,btrim(p_body)) returning id into v_id;
 update public.support_tickets set status=case when v_staff then 'waiting_on_user' else 'waiting_on_staff' end,
 updated_at=now() where id=p_ticket_id;
 return v_id;
end $$;
create or replace function public.set_support_ticket_status(p_ticket_id uuid,p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.is_deckplay_moderator() then
  raise exception 'Verified staff session required' using errcode='42501';
 end if;
 if p_status is null or p_status not in ('open','waiting_on_staff','waiting_on_user','resolved') then
  raise exception 'Invalid ticket status' using errcode='22023';
 end if;
 update public.support_tickets set status=p_status,updated_at=now() where id=p_ticket_id;
 if not found then raise exception 'Ticket not found' using errcode='22023'; end if;
end $$;
revoke all on function public.create_support_ticket(text,text,text) from public,anon;
revoke all on function public.reply_support_ticket(uuid,text) from public,anon;
revoke all on function public.set_support_ticket_status(uuid,text) from public,anon;
grant execute on function public.create_support_ticket(text,text,text) to authenticated;
grant execute on function public.reply_support_ticket(uuid,text) to authenticated;
grant execute on function public.set_support_ticket_status(uuid,text) to authenticated;
