-- Run on isolated staging only; all fixtures roll back. No real accounts are used.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();mid uuid;denied boolean;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'collection-rollback-'||a||'@deckplay.test','{}'),(b,'collection-rollback-'||b||'@deckplay.test','{}'),(outsider,'collection-rollback-'||outsider||'@deckplay.test','{}');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if (select collection_inquiry_mode from public.profiles where id=b)<>'off' then raise exception 'Default must be off';end if;
 denied:=false;begin perform public.send_collection_inquiry(b,'PSA sports card','trade','Would you consider trading?');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Off mode allowed inquiry';end if;
 if private.valid_collection_links('[{"label":"Bad","url":"javascript:alert(1)"}]') or private.valid_collection_links('[{"label":"Missing URL"}]') or private.valid_collection_links('[{"label":"Bad","url":"https://user@collectr.com/"}]') or private.valid_collection_links('[{"label":"Bad","url":"https://127.0.0.1/"}]') or private.valid_collection_links('[{"label":"Bad","url":"https://collectr.com/?token=private"}]') then raise exception 'Unsafe collection URL accepted';end if;
 update public.profiles set collection_links='[{"label":"Public collection","url":"https://collectr.com/collector"}]',collection_inquiry_mode='trades' where id=b;
 denied:=false;begin perform public.send_collection_inquiry(b,'PSA sports card','buy','Would you sell?');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Trade-only allowed buy';end if;
 insert into public.user_blocks(blocker_id,blocked_id) values(b,a);
 denied:=false;begin perform public.send_collection_inquiry(b,'PSA sports card','trade','Would you trade?');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Blocked inquiry allowed';end if;
 delete from public.user_blocks where blocker_id=b and blocked_id=a;
 mid:=public.send_collection_inquiry(b,'PSA sports card','trade','Would you trade?');
 if not exists(select 1 from public.collector_messages where id=mid and sender_id=a and recipient_id=b and body like 'Collection inquiry%') then raise exception 'Message missing';end if;
 denied:=false;begin perform public.send_collection_inquiry(b,'  psa sports card  ','trade','Again');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Duplicate inquiry allowed';end if;
 denied:=false;begin perform public.send_collection_inquiry(b,'Different card','trade','Again');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Daily recipient limit bypassed';end if;
 update public.profiles set collection_inquiry_mode='off' where id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
 denied:=false;begin perform public.send_collection_inquiry(b,'Different card','trade','Again');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Paused collector got inquiry';end if;
 if has_function_privilege('anon','public.send_collection_inquiry(uuid,text,text,text)','execute') or has_table_privilege('authenticated','private.collection_inquiries','insert') then raise exception 'Unexpected client mutation grants';end if;
 perform set_config('deckplay.collection_test_sender',a::text,true);
 perform set_config('deckplay.collection_test_receiver',b::text,true);
 perform set_config('deckplay.collection_test_outsider',outsider::text,true);
end $$;
-- Verify actual role/RLS boundaries, not just function-owner execution.
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.collection_test_outsider'),'role','authenticated')::text,true);
do $$begin if exists(select 1 from public.collector_messages where sender_id=current_setting('deckplay.collection_test_sender')::uuid) then raise exception 'Third party read inquiry';end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.collection_test_receiver'),'role','authenticated')::text,true);
do $$begin if not exists(select 1 from public.collector_messages where sender_id=current_setting('deckplay.collection_test_sender')::uuid) then raise exception 'Recipient cannot read inquiry';end if;end $$;
reset role;
update public.profiles set collection_inquiry_mode='buy_trade' where id=current_setting('deckplay.collection_test_receiver')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.collection_test_outsider'),'role','authenticated')::text,true);
select public.send_collection_inquiry(current_setting('deckplay.collection_test_receiver')::uuid,'Another public card','buy','Would you consider listing it?');
reset role;
rollback;
