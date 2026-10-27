-- Honor each collector's wanted-match opt-out; following a seller remains an explicit opt-in.
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
 left join public.notification_preferences pref on pref.user_id=wp.user_id
 where coalesce(pref.wanted_matches,true)
 and wp.user_id <> new.seller_id
 and length(trim(wp.title)) >= 3
 and lower(new.title) like '%' || replace(replace(lower(trim(wp.title)),'%', '\%'),'_', '\_') || '%' escape '\'
 and (wp.budget is null or new.price <= wp.budget)
 and (wp.game is null or wp.game='' or wp.game='general' or wp.game=new.tcg_game or wp.game=new.category);
 return new;
end;
$$;
revoke all on function private.notify_new_listing_activity() from public,anon,authenticated;
