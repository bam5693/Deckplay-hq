-- Every account, message and Storage metadata fixture is rolled back; no files uploaded.
begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();m uuid:=gen_random_uuid();p uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'photo-rollback-'||a||'@deckplay.test','{}'),(b,'photo-rollback-'||b||'@deckplay.test','{}'),(c,'photo-rollback-'||c||'@deckplay.test','{}');
 insert into public.collector_messages(sender_id,recipient_id,body) values(a,b,'Existing synthetic conversation');
 perform set_config('deckplay.photo.fixture',jsonb_build_object('a',a,'b',b,'c',c,'m',m,'p',p)::text,true);
end $$;
set local role authenticated;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;denied boolean;v jsonb;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 v:=public.prepare_private_message_photo((f->>'p')::uuid,(f->>'b')::uuid,(f->>'m')::uuid);
 if v->>'status'<>'pending' then raise exception 'Photo not prepared';end if;
 denied:=false;begin perform public.claim_validated_private_photo((f->>'p')::uuid,(f->>'a')::uuid,repeat('a',64),repeat('b',64),600);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Client forged validated image';end if;
 denied:=false;begin insert into storage.objects(bucket_id,name) values('conversation-photos',(f->>'a')||'/direct.jpg');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Client uploaded unvalidated file';end if;
 denied:=false;begin insert into public.collector_messages(id,sender_id,recipient_id,body,attachment_ids) values((f->>'m')::uuid,(f->>'a')::uuid,(f->>'b')::uuid,'Unuploaded photo',array[(f->>'p')::uuid]);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Unuploaded photo published';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'b','role','authenticated')::text,true);
 if exists(select 1 from public.message_photo_attachments where id=(f->>'p')::uuid) then raise exception 'Recipient read pending photo';end if;
end $$;
reset role;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;begin
 perform public.claim_validated_private_photo((f->>'p')::uuid,(f->>'a')::uuid,repeat('a',64),repeat('b',64),600);
 insert into storage.objects(bucket_id,name) values('conversation-photos',(f->>'a')||'/'||(f->>'p')||'.jpg');
 perform public.finish_validated_private_photo((f->>'p')::uuid,(f->>'a')::uuid);
end $$;
set local role authenticated;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;denied boolean;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'b','role','authenticated')::text,true);
 if exists(select 1 from storage.objects where bucket_id='conversation-photos') then raise exception 'Recipient read uploaded but unsent photo';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 if (select count(*) from storage.objects where bucket_id='conversation-photos' and name=(f->>'a')||'/'||(f->>'p')||'.jpg')<>1 then raise exception 'Sender cannot read own upload';end if;
 denied:=false;begin insert into public.collector_messages(id,sender_id,recipient_id,body,attachment_ids) values(gen_random_uuid(),(f->>'a')::uuid,(f->>'b')::uuid,'Wrong draft message',array[(f->>'p')::uuid]);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Photo linked to wrong draft';end if;
 insert into public.collector_messages(id,sender_id,recipient_id,body,attachment_ids) values((f->>'m')::uuid,(f->>'a')::uuid,(f->>'b')::uuid,'Photo delivered atomically',array[(f->>'p')::uuid]);
 if (select message_id from public.message_photo_attachments where id=(f->>'p')::uuid)<>(f->>'m')::uuid then raise exception 'Photo not atomically attached';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'b','role','authenticated')::text,true);
 if (select count(*) from storage.objects where bucket_id='conversation-photos' and name=(f->>'a')||'/'||(f->>'p')||'.jpg')<>1 then raise exception 'Recipient cannot read delivered photo';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'c','role','authenticated')::text,true);
 if exists(select 1 from public.message_photo_attachments where id=(f->>'p')::uuid) or exists(select 1 from storage.objects where bucket_id='conversation-photos') then raise exception 'Outsider read private photo';end if;
 denied:=false;begin perform public.prepare_private_message_photo(gen_random_uuid(),(f->>'b')::uuid,gen_random_uuid());exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Outsider started unsolicited photo conversation';end if;
 if has_table_privilege('anon','public.message_photo_attachments','select') or has_function_privilege('authenticated','public.finish_validated_private_photo(uuid,uuid)','execute') then raise exception 'Private grant too broad';end if;
end $$;
-- Pending photo quotas and bilateral blocks are enforced by the real authenticated role.
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;d uuid:=gen_random_uuid();denied boolean;i integer;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 for i in 1..3 loop perform public.prepare_private_message_photo(gen_random_uuid(),(f->>'b')::uuid,d);end loop;
 denied:=false;begin perform public.prepare_private_message_photo(gen_random_uuid(),(f->>'b')::uuid,d);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Fourth photo accepted';end if;
end $$;
reset role;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;denied boolean;v jsonb;begin
 v:=public.cancel_unpublished_private_photo((f->>'p')::uuid,(f->>'a')::uuid);if v->>'status'<>'attached' then raise exception 'Sent photo canceled';end if;
 denied:=false;begin perform public.claim_validated_private_photo((f->>'p')::uuid,(f->>'a')::uuid,repeat('c',64),repeat('b',64),600);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Retry changed immutable bytes';end if;
end $$;
-- Private rate counters cannot be changed by clients. Enforce the rolling cap.
insert into deckplay_chat.upload_events(user_id) select (current_setting('deckplay.photo.fixture')::jsonb->>'a')::uuid from generate_series(1,30);
set local role authenticated;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;denied boolean;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 denied:=false;begin perform public.prepare_private_message_photo(gen_random_uuid(),(f->>'b')::uuid,gen_random_uuid());exception when raise_exception then denied:=true;end;if not denied then raise exception 'Daily upload cap bypassed';end if;
end $$;
-- A validated retry of the same photo is allowed even after the daily cap.
-- It must not create a fresh upload event, while a new photo remains blocked.
set local role authenticated;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;before_count bigint;after_count bigint;v jsonb;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 select count(*) into before_count from deckplay_chat.upload_events where user_id=(f->>'a')::uuid;
 v:=public.prepare_private_message_photo((f->>'p')::uuid,(f->>'b')::uuid,(f->>'m')::uuid);
 if v->>'status'<>'attached' then raise exception 'Idempotent sent-photo retry was blocked';end if;
 select count(*) into after_count from deckplay_chat.upload_events where user_id=(f->>'a')::uuid;
 if before_count<>after_count then raise exception 'Retry consumed a new photo quota slot';end if;
end $$;
reset role;
insert into public.user_blocks(blocker_id,blocked_id) values((current_setting('deckplay.photo.fixture')::jsonb->>'b')::uuid,(current_setting('deckplay.photo.fixture')::jsonb->>'a')::uuid);
set local role authenticated;
do $$declare f jsonb:=current_setting('deckplay.photo.fixture')::jsonb;denied boolean;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f->>'a','role','authenticated')::text,true);
 denied:=false;begin perform public.prepare_private_message_photo(gen_random_uuid(),(f->>'b')::uuid,gen_random_uuid());exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Recipient block ignored for photo upload';end if;
end $$;
reset role;
rollback;
