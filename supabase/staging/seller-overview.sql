-- Isolated staging. No tracking SDKs, payments, extra grants or visitor analytics.
create function private.seller_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();inventory jsonb;price_replies bigint;trade_replies bigint;
begin
 if uid is null then raise exception 'Sign in to see your seller overview' using errcode='42501';end if;
 select jsonb_build_object('active',count(*) filter(where status='active'),'reserved',count(*) filter(where status='reserved'),'sold',count(*) filter(where status='sold'),'removed',count(*) filter(where status='removed'),'active_asking_total',coalesce(sum(price) filter(where status='active'),0)) into inventory from public.listings where seller_id=uid;
 select count(*) into price_replies from public.price_offers where seller_id=uid and status in('pending','countered') and last_actor_id is distinct from uid;
 select count(*) into trade_replies from public.trade_offers t where t.recipient_id=uid and t.status='pending' and (not exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=t.id and c.status='pending') or exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=t.id and c.status='pending' and c.recipient_id=uid));
 return inventory||jsonb_build_object('price_replies',price_replies,'trade_replies',trade_replies,'as_of',now());
end $$;
create function public.get_my_seller_overview() returns jsonb language sql stable security invoker set search_path='' as $$select private.seller_overview()$$;
revoke all on function private.seller_overview(),public.get_my_seller_overview() from public,anon;
grant execute on function private.seller_overview(),public.get_my_seller_overview() to authenticated;
notify pgrst,'reload schema';
