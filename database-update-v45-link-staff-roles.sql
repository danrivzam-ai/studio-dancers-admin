-- ── v45: vincular roles del personal con su cuenta de Auth ──────────────────
--
-- Desde v42 los permisos (RLS) identifican al personal por user_roles.user_id.
-- El alta antigua (UserManagement) insertaba solo el email y la persona se
-- registraba después: la fila quedaba con user_id NULL, así que esa persona
-- entraría al panel sin poder ver datos.
--
-- 1. Vincula las filas existentes cuyo email ya tiene cuenta de Auth.
-- 2. El trigger de alta de usuarios, además de crear el primer admin, vincula
--    automáticamente una fila de rol pendiente con el mismo email.
--    (El alta nueva va por la Edge Function create-staff-user, que ya guarda
--    el user_id; esto cubre filas antiguas o invitaciones previas.)
-- Idempotente.

UPDATE public.user_roles r
SET user_id = u.id, updated_at = now()
FROM auth.users u
WHERE r.user_id IS NULL
  AND lower(u.email) = lower(r.email);

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si no hay usuarios, el primero es admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, email, role, display_name)
    VALUES (NEW.id, NEW.email, 'admin', COALESCE(NEW.raw_user_meta_data->>'studio_name', 'Administrador'));
  ELSE
    -- Vincular un rol asignado previamente por email (alta pendiente)
    UPDATE public.user_roles
    SET user_id = NEW.id, updated_at = now()
    WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$function$;
