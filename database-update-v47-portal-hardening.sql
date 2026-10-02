-- ── v47: endurecimiento del portal de alumnas (Mi Studio) ─────────────────────
-- Requiere v46 (helper _portal_student_ids y límite de intentos en rpc_client_login).
--
-- 1. Telegram: el portal llamaba a la API de Telegram con el token del bot
--    empaquetado en el JS público. Ahora llama a la Edge Function
--    `notify-transfer` con el id de la solicitud; la función lee el token de
--    school_settings y marca `telegram_notified_at` para no repetir el aviso.
--    → Después de aplicar: desplegar notify-transfer y REVOCAR el token viejo
--      en @BotFather (/revoke), guardar el nuevo en Configuración del Admin.
--
-- 2. Cuentas bancarias: estaban escritas en el código del portal. Se guardan en
--    school_settings.portal_bank_accounts (editable desde Configuración del
--    Admin) y el portal las lee con rpc_client_get_bank_accounts().
--
-- 3. "Recordar este dispositivo": el portal guardaba cédula + 4 dígitos en
--    localStorage por 30 días. Ahora guarda un token aleatorio; en la base solo
--    queda su hash, expira a los 30 días y se revoca al cerrar sesión.
--
-- 4. Fotos de perfil: cualquier visitante con la anon key podía sobrescribir
--    `avatars/{id}.jpg` de cualquier alumna. Se quitan las políticas anon de
--    escritura; el portal sube la foto con la Edge Function `upload-avatar`,
--    que valida cédula + teléfono antes de escribir con service role.
--    → Aplicar DESPUÉS de desplegar upload-avatar (o el cambio de foto falla).
--
-- Idempotente: se puede ejecutar varias veces.

-- ── 1. Telegram ───────────────────────────────────────────────────────────────
ALTER TABLE public.transfer_requests
  ADD COLUMN IF NOT EXISTS telegram_notified_at TIMESTAMPTZ;

-- ── 2. Cuentas bancarias del portal ───────────────────────────────────────────
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS portal_bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Sembrar con la cuenta principal + las dos que estaban fijas en el portal
-- (solo si aún está vacío, para no pisar ediciones hechas desde el Admin).
UPDATE public.school_settings s
SET portal_bank_accounts = (
  SELECT jsonb_agg(acc) FROM (
    SELECT jsonb_build_object(
      'bank', s.bank_name, 'account', s.bank_account_number,
      'type', COALESCE(NULLIF(s.bank_account_type, ''), 'Cuenta de Ahorros'),
      'holder', s.bank_account_holder, 'holder_id', '0915553630'
    ) AS acc
    WHERE COALESCE(s.bank_account_number, '') <> ''
    UNION ALL
    SELECT jsonb_build_object('bank', 'Produbanco', 'account', '20007543342',
      'type', 'Cuenta de Ahorros', 'holder', s.bank_account_holder, 'holder_id', '0915553630')
    UNION ALL
    SELECT jsonb_build_object('bank', 'Banco del Pacífico', 'account', '1040219097',
      'type', 'Cuenta de Ahorros', 'holder', s.bank_account_holder, 'holder_id', '0915553630')
  ) t
)
WHERE s.id = 1 AND s.portal_bank_accounts = '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.rpc_client_get_bank_accounts()
RETURNS TABLE(bank text, account text, type text, holder text, holder_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a->>'bank', a->>'account', a->>'type', a->>'holder', a->>'holder_id'
  FROM school_settings s, jsonb_array_elements(s.portal_bank_accounts) a
  WHERE s.id = 1 AND COALESCE(a->>'account', '') <> ''
$$;

GRANT EXECUTE ON FUNCTION public.rpc_client_get_bank_accounts() TO anon, authenticated;

-- ── 3. Tokens de "recordar este dispositivo" ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  cedula TEXT NOT NULL,
  phone_last4 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

-- Sin políticas: solo las RPC SECURITY DEFINER acceden.
ALTER TABLE public.client_device_tokens ENABLE ROW LEVEL SECURITY;

-- Crea un token para cédula + teléfono válidos (pasa por el límite de intentos).
CREATE OR REPLACE FUNCTION public.rpc_client_device_register(p_cedula text, p_phone_last4 text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rpc_client_login(p_cedula, p_phone_last4)) THEN
    RETURN NULL;
  END IF;
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO client_device_tokens (token_hash, cedula, phone_last4)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'),
          REGEXP_REPLACE(p_cedula, '\D', '', 'g'), p_phone_last4);
  DELETE FROM client_device_tokens WHERE expires_at < NOW();
  RETURN v_token;
END;
$$;

-- Canjea un token vigente por las credenciales de la sesión.
CREATE OR REPLACE FUNCTION public.rpc_client_device_login(p_token text)
RETURNS TABLE(cedula text, phone_last4 text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT t.cedula, t.phone_last4
  FROM client_device_tokens t
  WHERE t.token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex')
    AND t.expires_at > NOW()
$$;

CREATE OR REPLACE FUNCTION public.rpc_client_device_revoke(p_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  DELETE FROM client_device_tokens
  WHERE token_hash = encode(digest(COALESCE(p_token, ''), 'sha256'), 'hex')
$$;

GRANT EXECUTE ON FUNCTION public.rpc_client_device_register(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_client_device_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_client_device_revoke(text) TO anon, authenticated;

-- ── 4. Fotos de perfil: sin escritura anónima ─────────────────────────────────
-- (La lectura pública se mantiene: el portal y el Admin muestran avatars/{id}.jpg)
DROP POLICY IF EXISTS "avatars_anon_insert"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_update"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload"            ON storage.objects;
DROP POLICY IF EXISTS "avatars_update"            ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload avatars" ON storage.objects;

-- Verificación
SELECT 'portal_bank_accounts' AS item, jsonb_array_length(portal_bank_accounts)::text AS valor
FROM public.school_settings WHERE id = 1
UNION ALL
SELECT 'politicas_avatars_escritura', count(*)::text
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND cmd IN ('INSERT', 'UPDATE') AND COALESCE(with_check, qual) LIKE '%avatars%';
