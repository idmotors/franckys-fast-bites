
-- Add manager to carts
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS manager_user_id uuid;

-- Add delivery details to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_cart_id uuid REFERENCES public.carts(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_ar integer NOT NULL DEFAULT 0;

-- Cart stocks
CREATE TABLE IF NOT EXISTS public.cart_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

ALTER TABLE public.cart_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view stocks" ON public.cart_stocks;
CREATE POLICY "Anyone can view stocks" ON public.cart_stocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "BO manage stocks" ON public.cart_stocks;
CREATE POLICY "BO manage stocks" ON public.cart_stocks FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'));

DROP TRIGGER IF EXISTS update_cart_stocks_updated_at ON public.cart_stocks;
CREATE TRIGGER update_cart_stocks_updated_at BEFORE UPDATE ON public.cart_stocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.user_cart_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.carts WHERE manager_user_id = _user_id LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.user_cart_id(uuid) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Users view own orders, admins view all" ON public.orders;
DROP POLICY IF EXISTS "Orders read access" ON public.orders;
CREATE POLICY "Orders read access" ON public.orders FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'bo_manager')
  OR (public.has_role(auth.uid(), 'cart_manager') AND (
    cart_id = public.user_cart_id(auth.uid())
    OR assigned_cart_id = public.user_cart_id(auth.uid())
  ))
);

DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Orders update access" ON public.orders;
CREATE POLICY "Orders update access" ON public.orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'bo_manager')
  OR (public.has_role(auth.uid(), 'cart_manager') AND (
    cart_id = public.user_cart_id(auth.uid())
    OR assigned_cart_id = public.user_cart_id(auth.uid())
  ))
);

DROP POLICY IF EXISTS "Admins manage carts" ON public.carts;
DROP POLICY IF EXISTS "BO manage carts" ON public.carts;
CREATE POLICY "BO manage carts" ON public.carts FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
DROP POLICY IF EXISTS "BO manage products" ON public.products;
CREATE POLICY "BO manage products" ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'));

CREATE OR REPLACE FUNCTION public.prevent_ordered_product_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = OLD.id) THEN
    RAISE EXCEPTION 'Ce produit a déjà été commandé. Désactivez-le au lieu de le supprimer.';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_ordered_product_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_product_delete ON public.products;
CREATE TRIGGER prevent_product_delete BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ordered_product_delete();

CREATE OR REPLACE FUNCTION public.decrement_cart_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_cart uuid;
BEGIN
  SELECT COALESCE(assigned_cart_id, cart_id) INTO target_cart FROM public.orders WHERE id = NEW.order_id;
  IF target_cart IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    UPDATE public.cart_stocks
      SET quantity = GREATEST(0, quantity - NEW.quantity)
      WHERE cart_id = target_cart AND product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.decrement_cart_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS decrement_stock_on_order ON public.order_items;
CREATE TRIGGER decrement_stock_on_order AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_cart_stock();

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "BO manage roles" ON public.user_roles;
CREATE POLICY "BO manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager'));

DROP POLICY IF EXISTS "Profiles viewable by owner or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read" ON public.profiles;
CREATE POLICY "Profiles read" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'bo_manager')
);

DO $rt$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders'; END IF;
END $rt$;

-- Create admin user
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'glenn.rakotondramanana@idmotors.com';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'glenn.rakotondramanana@idmotors.com',
      crypt('adminFranckysBO2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Glenn Rakotondramanana"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'glenn.rakotondramanana@idmotors.com'),
      'email', now(), now(), now());
  END IF;
  INSERT INTO public.profiles (user_id, full_name) VALUES (admin_id, 'Glenn Rakotondramanana')
    ON CONFLICT DO NOTHING;
  DELETE FROM public.user_roles WHERE user_id = admin_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
END $$;
