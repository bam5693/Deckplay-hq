-- Isolated staging only. Transaction rollback leaves no test users or listing changes.
begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();l uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'editor-rollback-'||a||'@deckplay.test','{}'),(b,'editor-rollback-'||b||'@deckplay.test','{}');
 perform set_config('deckplay.editor.a',a::text,true);perform set_config('deckplay.editor.b',b::text,true);perform set_config('deckplay.editor.listing',l::text,true);
 insert into public.listings(id,seller_id,title,description,category,condition,price,image_urls,product_type) values(l,a,'TEST ONLY editor rollback','Exact disclosure','video_games','used',25,array['https://example.test/synthetic.jpg'],'game');
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.editor.a'),'role','authenticated')::text,true);
do $$declare original public.listings;affected integer;begin
 select * into strict original from public.listings where id=current_setting('deckplay.editor.listing')::uuid;
 update public.listings set title='TEST ONLY edited',price=19.5,updated_at=clock_timestamp() where id=original.id and seller_id=auth.uid() and status='active' and updated_at=original.updated_at and title=original.title and description=original.description and price=original.price;
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Owner edit failed';end if;
 update public.listings set title='Lost stale edit' where id=original.id and seller_id=auth.uid() and status='active' and updated_at=original.updated_at and title=original.title and price=original.price;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Stale edit overwrote newer details';end if;
 update public.listings set status='reserved' where id=original.id and seller_id=auth.uid();
 update public.listings set title='Changed reserved item' where id=original.id and seller_id=auth.uid() and status='active';
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Active-only filter changed reserved item';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.editor.b'),'role','authenticated')::text,true);
do $$declare affected integer;begin
 update public.listings set title='Outsider overwrite' where id=current_setting('deckplay.editor.listing')::uuid;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Outsider edit allowed';end if;
end $$;
reset role;
rollback;
