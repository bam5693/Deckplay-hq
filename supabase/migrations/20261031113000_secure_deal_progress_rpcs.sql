-- Private staging ONLY: accepted-deal progress was read-only under RLS.
-- Leave direct client INSERT/UPDATE denied; provide participant-scoped actions.
-- This migration MUST NOT be applied to production without explicit release approval.

CREATE UNIQUE INDEX IF NOT EXISTS deal_progress_unique_accepted_offer_idx
  ON public.deal_progress (offer_type,offer_id);

CREATE OR REPLACE FUNCTION private.ensure_deal_progress(p_offer_type text,p_offer_id uuid)
RETURNS public.deal_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 uid uuid:=auth.uid();
 buyer uuid; seller uuid; offer_state text;
 progress public.deal_progress;
BEGIN
 IF uid IS NULL OR p_offer_id IS NULL OR p_offer_type NOT IN ('price','trade') THEN
   RAISE EXCEPTION 'Deal unavailable';
 END IF;
 IF p_offer_type='price' THEN
   SELECT buyer_id,seller_id,status INTO buyer,seller,offer_state
   FROM public.price_offers WHERE id=p_offer_id;
 ELSE
   SELECT sender_id,recipient_id,status INTO buyer,seller,offer_state
   FROM public.trade_offers WHERE id=p_offer_id;
 END IF;
 IF buyer IS NULL OR seller IS NULL OR uid NOT IN(buyer,seller) OR offer_state<>'accepted' THEN
   RAISE EXCEPTION 'Deal unavailable';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_offer_type||':'||p_offer_id::text,0));
 SELECT * INTO progress FROM public.deal_progress
 WHERE offer_type=p_offer_type AND offer_id=p_offer_id FOR UPDATE;
 IF FOUND THEN
   IF progress.buyer_id<>buyer OR progress.seller_id<>seller THEN
     RAISE EXCEPTION 'Deal participant mismatch';
   END IF;
   RETURN progress;
 END IF;
 INSERT INTO public.deal_progress(offer_type,offer_id,buyer_id,seller_id,status)
 VALUES(p_offer_type,p_offer_id,buyer,seller,'accepted') RETURNING * INTO progress;
 RETURN progress;
END
$function$;

CREATE OR REPLACE FUNCTION private.set_deal_progress(p_deal_id uuid,p_action text,p_status text DEFAULT NULL)
RETURNS public.deal_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 uid uuid:=auth.uid();
 progress public.deal_progress;
BEGIN
 IF uid IS NULL OR p_deal_id IS NULL THEN RAISE EXCEPTION 'Deal unavailable'; END IF;
 SELECT * INTO progress FROM public.deal_progress WHERE id=p_deal_id FOR UPDATE;
 IF NOT FOUND OR uid NOT IN(progress.buyer_id,progress.seller_id) THEN
  RAISE EXCEPTION 'Deal unavailable';
 END IF;
 IF progress.status IN('completed','cancelled') THEN
  RAISE EXCEPTION 'Deal is closed';
 END IF;
 IF p_action='confirm' THEN
  IF p_status IS NOT NULL THEN RAISE EXCEPTION 'Invalid confirmation'; END IF;
  IF uid=progress.buyer_id THEN
   UPDATE public.deal_progress SET buyer_confirmed_at=coalesce(buyer_confirmed_at,now()),updated_at=now()
   WHERE id=p_deal_id RETURNING * INTO progress;
  ELSE
   UPDATE public.deal_progress SET seller_confirmed_at=coalesce(seller_confirmed_at,now()),updated_at=now()
   WHERE id=p_deal_id RETURNING * INTO progress;
  END IF;
  IF progress.buyer_confirmed_at IS NOT NULL AND progress.seller_confirmed_at IS NOT NULL THEN
   UPDATE public.deal_progress SET status='completed',updated_at=now()
   WHERE id=p_deal_id RETURNING * INTO progress;
  END IF;
 ELSIF p_action='status' THEN
  IF p_status NOT IN('accepted','arranging','shipped','cancelled') THEN
   RAISE EXCEPTION 'Invalid deal status';
  END IF;
  IF p_status='cancelled' AND (progress.buyer_confirmed_at IS NOT NULL OR progress.seller_confirmed_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Cannot cancel after confirmation';
  END IF;
  IF (progress.status='arranging' AND p_status='accepted')
    OR (progress.status='shipped' AND p_status IN('accepted','arranging')) THEN
   RAISE EXCEPTION 'Cannot reverse deal progress';
  END IF;
  UPDATE public.deal_progress SET status=p_status,updated_at=now()
  WHERE id=p_deal_id RETURNING * INTO progress;
 ELSE
  RAISE EXCEPTION 'Invalid deal action';
 END IF;
 RETURN progress;
END
$function$;

CREATE OR REPLACE FUNCTION public.ensure_deal_progress(p_offer_type text,p_offer_id uuid)
RETURNS public.deal_progress LANGUAGE sql SET search_path TO ''
AS $function$ SELECT private.ensure_deal_progress(p_offer_type,p_offer_id) $function$;

CREATE OR REPLACE FUNCTION public.set_deal_progress(p_deal_id uuid,p_action text,p_status text DEFAULT NULL)
RETURNS public.deal_progress LANGUAGE sql SET search_path TO ''
AS $function$ SELECT private.set_deal_progress(p_deal_id,p_action,p_status) $function$;

REVOKE ALL ON FUNCTION private.ensure_deal_progress(text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.set_deal_progress(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ensure_deal_progress(text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_deal_progress(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.ensure_deal_progress(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_deal_progress(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_deal_progress(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_deal_progress(uuid,text,text) TO authenticated;
