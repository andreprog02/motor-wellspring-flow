
-- 1. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create invites table
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 4. Helper: get current user's tenant_id (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 5. Helper: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- 6. Add tenant_id to ALL existing tables
ALTER TABLE public.equipments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.equipment_sub_components ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cylinder_components ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.component_maintenance_plans ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_log_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.locations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.oil_types ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.component_manufacturers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.component_models ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.manufacturers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.manufacturer_models ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_descriptions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_plan_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_plan_template_tasks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cylinder_heads ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cylinder_head_installations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cylinder_head_maintenances ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cylinder_head_components ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.turbos ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.turbo_installations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.turbo_maintenances ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.turbo_components ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.oil_analyses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.oil_collections ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 7. Drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all access to equipments" ON public.equipments;
DROP POLICY IF EXISTS "Allow all access to equipment_sub_components" ON public.equipment_sub_components;
DROP POLICY IF EXISTS "Allow all access to cylinder_components" ON public.cylinder_components;
DROP POLICY IF EXISTS "Allow all access to component_maintenance_plans" ON public.component_maintenance_plans;
DROP POLICY IF EXISTS "Allow all access to maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow all access to maintenance_log_items" ON public.maintenance_log_items;
DROP POLICY IF EXISTS "Allow all access to inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow all access to locations" ON public.locations;
DROP POLICY IF EXISTS "Allow all access to oil_types" ON public.oil_types;
DROP POLICY IF EXISTS "Allow all access to component_manufacturers" ON public.component_manufacturers;
DROP POLICY IF EXISTS "Allow all access to component_models" ON public.component_models;
DROP POLICY IF EXISTS "Allow all access to manufacturers" ON public.manufacturers;
DROP POLICY IF EXISTS "Allow all access to manufacturer_models" ON public.manufacturer_models;
DROP POLICY IF EXISTS "Allow all access to maintenance_descriptions" ON public.maintenance_descriptions;
DROP POLICY IF EXISTS "Allow all access to maintenance_plan_templates" ON public.maintenance_plan_templates;
DROP POLICY IF EXISTS "Allow all access to maintenance_plan_template_tasks" ON public.maintenance_plan_template_tasks;
DROP POLICY IF EXISTS "Allow all access to cylinder_heads" ON public.cylinder_heads;
DROP POLICY IF EXISTS "Allow all access to cylinder_head_installations" ON public.cylinder_head_installations;
DROP POLICY IF EXISTS "Allow all access to cylinder_head_maintenances" ON public.cylinder_head_maintenances;
DROP POLICY IF EXISTS "Allow all access to cylinder_head_components" ON public.cylinder_head_components;
DROP POLICY IF EXISTS "Allow all access to turbos" ON public.turbos;
DROP POLICY IF EXISTS "Allow all access to turbo_installations" ON public.turbo_installations;
DROP POLICY IF EXISTS "Allow all access to turbo_maintenances" ON public.turbo_maintenances;
DROP POLICY IF EXISTS "Allow all access to turbo_components" ON public.turbo_components;
DROP POLICY IF EXISTS "Allow all access to oil_analyses" ON public.oil_analyses;
DROP POLICY IF EXISTS "Allow all access to oil_collections" ON public.oil_collections;

-- 8. Create tenant-scoped RLS policies for all tables
-- Tenants: users can see their own tenant
CREATE POLICY "tenant_select" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

-- Profiles: users can see profiles in their tenant
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (true);

-- Invites: admins can manage, users can see their own
CREATE POLICY "invites_select" ON public.invites FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "invites_insert" ON public.invites FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin());
CREATE POLICY "invites_update" ON public.invites FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
CREATE POLICY "invites_delete" ON public.invites FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
-- Allow anon to check invites by email (for signup flow)
CREATE POLICY "invites_anon_select" ON public.invites FOR SELECT TO anon
  USING (status = 'pending');

-- Macro for tenant-scoped all-access policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'equipments','equipment_sub_components','cylinder_components',
    'component_maintenance_plans','maintenance_logs','maintenance_log_items',
    'inventory_items','locations','oil_types',
    'component_manufacturers','component_models',
    'manufacturers','manufacturer_models',
    'maintenance_descriptions','maintenance_plan_templates','maintenance_plan_template_tasks',
    'cylinder_heads','cylinder_head_installations','cylinder_head_maintenances','cylinder_head_components',
    'turbos','turbo_installations','turbo_maintenances','turbo_components',
    'oil_analyses','oil_collections'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "tenant_select" ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id()) WITH CHECK (tenant_id = public.get_user_tenant_id())', tbl);
    EXECUTE format('CREATE POLICY "tenant_delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id())', tbl);
  END LOOP;
END;
$$;

-- 9. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_invite record;
  v_full_name text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Check if there's a pending invite for this email
  SELECT * INTO v_invite FROM public.invites
    WHERE email = NEW.email AND status = 'pending'
    LIMIT 1;
  
  IF v_invite IS NOT NULL THEN
    -- Join existing tenant via invite
    v_tenant_id := v_invite.tenant_id;
    UPDATE public.invites SET status = 'accepted' WHERE id = v_invite.id;
  ELSE
    -- Create new tenant
    INSERT INTO public.tenants (name) VALUES (v_full_name || '''s Organization')
      RETURNING id INTO v_tenant_id;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
    VALUES (
      NEW.id,
      v_tenant_id,
      v_full_name,
      NEW.email,
      CASE WHEN v_invite IS NULL THEN 'admin' ELSE 'member' END
    );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
