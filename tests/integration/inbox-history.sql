-- Isolated staging only: disposable users/messages; full transaction rollback.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'history-rollback-'||a||'@deckplay.test','{}'),(b,'history-rollback-'||b||'@deckplay.test','{}'),(c,'history-rollback-'||c||'@deckplay.test','{}');
 perform set_config('deckplay.history.fixture',jsonb_build_object('a',a,'b',b,'c',c)::text,true);
end $$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('deckplay.history.fixture')::jsonb; a uuid:=(f->>'a')::uuid;b uuid:=(f->>'b')::uuid;c uuid:=(f->>'c')::uuid; cursor_row record; page_ids uuid[]; seen uuid[]:='{}'; i int; stamp timestamptz; outsider uuid:=gen_random_uuid();
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 for i in 1..6 loop
  stamp:='2026-01-01T10:00:00.123456Z'::timestamptz + case when i=1 then interval '1 microsecond' when i>=5 then interval '-1 microsecond' else interval '0' end;
  insert into public.collector_messages(id,sender_id,recipient_id,body,created_at) values(gen_random_uuid(),a,b,'TEST ONLY HISTORY boundary '||i,stamp);
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
 insert into public.collector_messages(id,sender_id,recipient_id,body,created_at) values(outsider,c,b,'TEST ONLY HISTORY other participant','2026-01-01T10:00:00.123456Z');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 select array_agg(id order by created_at desc,id desc) into page_ids from (select id,created_at from public.collector_messages where (sender_id=a and recipient_id=b) or (sender_id=b and recipient_id=a) order by created_at desc,id desc limit 2) p;
 seen:=page_ids;
 select id,created_at into cursor_row from public.collector_messages where id=any(page_ids) order by created_at,id limit 1;
 for i in 1..2 loop
  select array_agg(id order by created_at desc,id desc) into page_ids from (select id,created_at from public.collector_messages where ((sender_id=a and recipient_id=b) or (sender_id=b and recipient_id=a)) and (created_at<cursor_row.created_at or (created_at=cursor_row.created_at and id<cursor_row.id)) order by created_at desc,id desc limit 2) p;
  if cardinality(page_ids)<>2 or seen && page_ids then raise exception 'Skipped or repeated timestamp boundary messages';end if;
  seen:=seen||page_ids;
  select id,created_at into cursor_row from public.collector_messages where id=any(page_ids) order by created_at,id limit 1;
 end loop;
 if cardinality(seen)<>6 or outsider=any(seen) then raise exception 'History coverage or participant scope failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if exists(select 1 from public.collector_messages where id=outsider) then raise exception 'Unrelated message leaked through RLS';end if;
end $$;
reset role;
rollback;
select 'History keyset, microsecond boundary and participant RLS checks passed; fixtures rolled back' as result;
