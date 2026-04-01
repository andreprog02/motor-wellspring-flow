
-- Add last_sign_in_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone;

-- Function to check if user is the super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email = 'andre_santos_02@yahoo.com.br'
  )
$$;

-- Function to update last_sign_in_at on login
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_sign_in_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users to update last sign in (on update of last_sign_in_at in auth.users)
-- We can't attach triggers to auth schema, so we'll update via RPC instead

-- RPC to get all tenants with users (super admin only)
CREATE OR REPLACE FUNCTION public.super_admin_get_all_accounts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (SELECT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT json_agg(tenant_data)
    FROM (
      SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.created_at AS tenant_created_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'email', p.email,
              'role', p.role,
              'created_at', p.created_at,
              'last_sign_in_at', p.last_sign_in_at
            )
          )
          FROM public.profiles p
          WHERE p.tenant_id = t.id
        ) AS users
      FROM public.tenants t
      ORDER BY t.created_at DESC
    ) tenant_data
  );
END;
$$;

-- RPC to record login (called from frontend on auth state change)
CREATE OR REPLACE FUNCTION public.record_sign_in()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_sign_in_at = now() WHERE id = auth.uid();
END;
$$;
