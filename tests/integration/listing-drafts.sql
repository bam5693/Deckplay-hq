begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'draft-rollback-'||a||'@deckplay.test','{}'),(b,'draft-rollback-'||b||'@deckplay.test','{}');
 perform set_config('deckplay.draft.a',a::text,true);perform set_config('deckplay.draft.b',b::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.draft.a'),'role','authenticated')::text,true);
insert into public.listing_drafts(user_id,content) values(current_setting('deckplay.draft.a')::uuid,'{"version":1,"fields":{"item":"Private graded card","price":"25.50","description":"Exact corner disclosure"}}');
do $$declare denied boolean;begin
 if (select content->'fields'->>'description' from public.listing_drafts where user_id=current_setting('deckplay.draft.a')::uuid)<>'Exact corner disclosure' then raise exception 'Owner draft did not persist';end if;
 denied:=false;begin update public.listing_drafts set content='{}' where user_id=current_setting('deckplay.draft.a')::uuid;exception when check_violation then denied:=true;end;if not denied then raise exception 'Malformed draft accepted';end if;
 denied:=false;begin update public.listing_drafts set content=jsonb_build_object('version',1,'fields',jsonb_build_object('description',repeat('x',33000))) where user_id=current_setting('deckplay.draft.a')::uuid;exception when check_violation then denied:=true;end;if not denied then raise exception 'Oversized draft accepted';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.draft.b'),'role','authenticated')::text,true);
do $$declare denied boolean;begin
 if exists(select 1 from public.listing_drafts where user_id=current_setting('deckplay.draft.a')::uuid) then raise exception 'Another collector read a private draft';end if;
 denied:=false;begin insert into public.listing_drafts(user_id,content) values(current_setting('deckplay.draft.a')::uuid,'{"version":1,"fields":{"item":"Impersonated draft"}}');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Draft impersonation accepted';end if;
 if has_table_privilege('anon','public.listing_drafts','select') or has_table_privilege('anon','public.listing_drafts','insert') then raise exception 'Anonymous draft access granted';end if;
end $$;
reset role;
rollback;
