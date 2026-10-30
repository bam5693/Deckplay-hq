-- STAGING ONLY. Seller may hide an active listing temporarily and restore it
-- without losing photos, categorization or seller notes. Never resurrect sold or
-- removed inventory or alter reserved transactional listings.
BEGIN;
ALTER TABLE public.listings DROP CONSTRAINT listings_status_check;
ALTER TABLE public.listings
 ADD CONSTRAINT listings_status_check
 CHECK (status IN ('active', 'paused', 'reserved', 'sold', 'removed'));
CREATE OR REPLACE FUNCTION private.prevent_unsafe_seller_listing_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF OLD.status IN ('reserved','sold','removed') THEN
   RAISE EXCEPTION 'Reserved, sold or removed inventory cannot be reactivated by a seller'
    USING ERRCODE='23514';
  END IF;
  IF OLD.status='paused' AND NEW.status <> 'active' THEN
   RAISE EXCEPTION 'A paused listing can only be resumed as active' USING ERRCODE='23514';
  END IF;
  IF OLD.status='active' AND NEW.status NOT IN ('paused','sold','removed') THEN
   RAISE EXCEPTION 'Invalid direct seller listing status transition' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_seller_listing_status ON public.listings;
CREATE TRIGGER guard_seller_listing_status BEFORE UPDATE OF status ON public.listings
 FOR EACH ROW EXECUTE FUNCTION private.prevent_unsafe_seller_listing_status();
COMMIT;
