-- Staging-only: blocking severs follows in both directions and prevents re-following.
create or replace function private.enforce_follow_block_boundary()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if exists(select 1 from public.user_blocks b where (b.blocker_id=new.follower_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=new.follower_id)) then
  raise exception 'Cannot follow a blocked collector' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.enforce_follow_block_boundary() from public,anon,authenticated;
drop trigger if exists enforce_follow_block_boundary on public.seller_follows;
create trigger enforce_follow_block_boundary before insert or update on public.seller_follows for each row execute function private.enforce_follow_block_boundary();
create or replace function private.end_follows_on_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 delete from public.seller_follows sf where (sf.follower_id=new.blocker_id and sf.seller_id=new.blocked_id) or (sf.follower_id=new.blocked_id and sf.seller_id=new.blocker_id);
 return new;
end;
$$;
revoke all on function private.end_follows_on_block() from public,anon,authenticated;
drop trigger if exists end_follows_on_block on public.user_blocks;
create trigger end_follows_on_block after insert on public.user_blocks for each row execute function private.end_follows_on_block();
delete from public.seller_follows sf where exists(select 1 from public.user_blocks b where (b.blocker_id=sf.follower_id and b.blocked_id=sf.seller_id) or (b.blocker_id=sf.seller_id and b.blocked_id=sf.follower_id));