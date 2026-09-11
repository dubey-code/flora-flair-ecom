CREATE OR REPLACE FUNCTION public.grant_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_first_admin_trigger ON auth.users;
CREATE TRIGGER grant_first_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_first_admin();

REVOKE ALL ON FUNCTION public.grant_first_admin() FROM PUBLIC;