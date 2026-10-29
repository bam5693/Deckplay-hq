-- STAGING ONLY: simulated orders never invoke payment or shipping services.
begin;
create policy "Create own fresh demo" on public.demo_orders for insert to authenticated with check
(creator_id=(select auth.uid()) and creator_role in ('buyer','seller') and participant_id is null and stage=0 and length(trim(item_name)) between 1 and 150 and item_price between 0 and 100000 and shipping_price between 0 and 1000);
grant insert on public.demo_orders to authenticated;
create or replace function private.join_deckplay_demo_order(p_code text) returns void language plpgsql security definer set search_path='' as $$
declare d public.demo_orders;uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 if p_code is null or p_code !~ '^[A-Z0-9]{10}$' then raise exception 'Invalid demo invite'; end if;
 select * into d from public.demo_orders where invite_code=p_code for update;
 if not found or d.creator_id=uid then raise exception 'Demo invite unavailable'; end if;
 if d.participant_id is not null and d.participant_id<>uid then raise exception 'Demo invite already used'; end if;
 update public.demo_orders set participant_id=uid,updated_at=now() where id=d.id;
end $$;
create or replace function private.advance_deckplay_demo_order(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.demo_orders;uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into d from public.demo_orders where id=p_id and uid in (creator_id,participant_id) for update;
 if not found or d.participant_id is null then raise exception 'Joined demo order required'; end if;
 if d.stage>=4 then raise exception 'Demo already complete'; end if;
 update public.demo_orders set stage=stage+1,updated_at=now() where id=d.id;
end $$;
create or replace function private.delete_deckplay_demo_order(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 delete from public.demo_orders where id=p_id and creator_id=auth.uid();
 if not found then raise exception 'Only demo creator can delete'; end if;
end $$;
revoke all on function private.join_deckplay_demo_order(text),private.advance_deckplay_demo_order(uuid),private.delete_deckplay_demo_order(uuid) from public,anon,authenticated;
grant execute on function private.join_deckplay_demo_order(text),private.advance_deckplay_demo_order(uuid),private.delete_deckplay_demo_order(uuid) to authenticated;
create or replace function public.join_deckplay_demo_order(p_code text) returns void language sql security invoker set search_path='' as $$select private.join_deckplay_demo_order(p_code)$$;
create or replace function public.advance_deckplay_demo_order(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.advance_deckplay_demo_order(p_id)$$;
create or replace function public.delete_deckplay_demo_order(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.delete_deckplay_demo_order(p_id)$$;
revoke all on function public.join_deckplay_demo_order(text),public.advance_deckplay_demo_order(uuid),public.delete_deckplay_demo_order(uuid) from public,anon;
grant execute on function public.join_deckplay_demo_order(text),public.advance_deckplay_demo_order(uuid),public.delete_deckplay_demo_order(uuid) to authenticated;
commit;
