
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bo_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cart_manager';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivering';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivered';
