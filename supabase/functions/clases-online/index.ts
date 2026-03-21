import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0"

// ── CORS ────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

// ── R2 Client ───────────────────────────────────────────────────
function getR2Client(): S3Client {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
    },
  })
}

const BUCKET = () => Deno.env.get("R2_BUCKET_NAME") || "studio-dancers-clases"

// ── Auth helper ─────────────────────────────────────────────────
interface AuthResult {
  userId: string
  isAdmin: boolean
  isPortal: boolean
}

async function verifyAuth(req: Request, supabaseAdmin: ReturnType<typeof createClient>): Promise<AuthResult | null> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return null

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const portalRole = user.app_metadata?.portal_role
  return {
    userId: user.id,
    isAdmin: !portalRole,
    isPortal: portalRole === "alumna",
  }
}

// ── Actions ─────────────────────────────────────────────────────

/** Admin: get presigned upload URL for R2 */
async function getUploadUrl(
  body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const type = body.type as string
  const title = (body.title as string) || null
  const fileSize = (body.fileSize as number) || null
  const contentType = (body.contentType as string) || "video/mp4"

  if (!type || !["daily", "weekly"].includes(type)) {
    return jsonResponse({ error: "invalid type" }, 400)
  }

  const today = new Date().toISOString().split("T")[0]
  const storageKey = `clases/${today}-${type}.mp4`

  // Desactivar clase anterior del mismo tipo si existe
  await supabaseAdmin
    .from("online_classes")
    .update({ active: false })
    .eq("type", type)
    .eq("active", true)
    .is("deleted_at", null)

  // Calcular expiración: 24h para daily, 7 días para weekly
  const expiresAt = new Date()
  if (type === "daily") {
    expiresAt.setHours(expiresAt.getHours() + 24)
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7)
  }

  // Crear registro en DB (active = false hasta confirm)
  const { data: row, error: insertError } = await supabaseAdmin
    .from("online_classes")
    .insert({
      type,
      class_date: today,
      storage_key: storageKey,
      title,
      file_size: fileSize,
      active: false,
      expires_at: expiresAt.toISOString(),
      uploaded_by: auth.userId,
    })
    .select()
    .single()

  if (insertError) {
    // Si ya existe registro para hoy, actualizarlo
    if (insertError.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("online_classes")
        .update({
          storage_key: storageKey,
          title,
          file_size: fileSize,
          active: false,
          expires_at: expiresAt.toISOString(),
          uploaded_by: auth.userId,
          deleted_at: null,
        })
        .eq("type", type)
        .eq("class_date", today)
        .is("deleted_at", null)
        .select()
        .single()

      if (!existing) return jsonResponse({ error: "db_error" }, 500)

      const r2 = getR2Client()
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: BUCKET(),
          Key: storageKey,
          ContentType: contentType,
        }),
        { expiresIn: 3600 }
      )

      return jsonResponse({ uploadUrl, classId: existing.id, storageKey }, 200)
    }
    console.error("insert error:", insertError)
    return jsonResponse({ error: "db_error" }, 500)
  }

  // Generar presigned PUT URL (1h de validez)
  const r2 = getR2Client()
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: storageKey,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  )

  return jsonResponse({ uploadUrl, classId: row.id, storageKey }, 200)
}

/** Admin: confirm upload completed → activate class */
async function confirmUpload(
  body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const classId = body.classId as string
  if (!classId) return jsonResponse({ error: "missing classId" }, 400)

  const { data, error } = await supabaseAdmin
    .from("online_classes")
    .update({ active: true })
    .eq("id", classId)
    .is("deleted_at", null)
    .select()
    .single()

  if (error) return jsonResponse({ error: "not_found" }, 404)
  return jsonResponse({ success: true, class: data }, 200)
}

/** Student: get presigned download URL (2h expiry) */
async function getVideoUrl(
  body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isPortal && !auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const classId = body.classId as string
  if (!classId) return jsonResponse({ error: "missing classId" }, 400)

  // Verificar que la clase esté activa
  const { data: cls, error } = await supabaseAdmin
    .from("online_classes")
    .select("storage_key, active, expires_at")
    .eq("id", classId)
    .is("deleted_at", null)
    .single()

  if (error || !cls) return jsonResponse({ error: "not_found" }, 404)
  if (!cls.active) return jsonResponse({ error: "class_expired" }, 410)
  if (cls.expires_at && new Date(cls.expires_at) < new Date()) {
    return jsonResponse({ error: "class_expired" }, 410)
  }

  const r2 = getR2Client()
  const videoUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: BUCKET(),
      Key: cls.storage_key,
    }),
    { expiresIn: 7200 } // 2 horas
  )

  return jsonResponse({ videoUrl }, 200)
}

/** Student/Admin: list active classes metadata */
async function listActive(
  _body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isPortal && !auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const { data, error } = await supabaseAdmin
    .from("online_classes")
    .select("id, type, class_date, title, file_size, active, expires_at, created_at")
    .eq("active", true)
    .is("deleted_at", null)
    .order("type", { ascending: true })

  if (error) return jsonResponse({ error: "query_error" }, 500)
  return jsonResponse({ classes: data || [] }, 200)
}

/** Admin: list all classes (including inactive) for management */
async function listAll(
  _body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const { data, error } = await supabaseAdmin
    .from("online_classes")
    .select("id, type, class_date, title, file_size, active, expires_at, created_at, uploaded_by")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return jsonResponse({ error: "query_error" }, 500)
  return jsonResponse({ classes: data || [] }, 200)
}

/** Admin: soft-delete class + remove from R2 */
async function deleteClass(
  body: Record<string, unknown>,
  auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  if (!auth.isAdmin) return jsonResponse({ error: "forbidden" }, 403)

  const classId = body.classId as string
  if (!classId) return jsonResponse({ error: "missing classId" }, 400)

  // Obtener storage_key antes de borrar
  const { data: cls } = await supabaseAdmin
    .from("online_classes")
    .select("storage_key")
    .eq("id", classId)
    .is("deleted_at", null)
    .single()

  if (!cls) return jsonResponse({ error: "not_found" }, 404)

  // Soft delete en DB
  await supabaseAdmin
    .from("online_classes")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", classId)

  // Eliminar de R2
  try {
    const r2 = getR2Client()
    await r2.send(new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: cls.storage_key,
    }))
  } catch (err) {
    console.error("R2 delete error:", err)
    // No fallar — el registro ya se marcó como eliminado
  }

  return jsonResponse({ success: true }, 200)
}

/** Cron/Internal: expire old classes + cleanup R2 */
async function expireClasses(
  _body: Record<string, unknown>,
  _auth: AuthResult,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  // Buscar clases expiradas que aún están activas
  const { data: expired } = await supabaseAdmin
    .from("online_classes")
    .select("id, storage_key")
    .eq("active", true)
    .lt("expires_at", new Date().toISOString())
    .is("deleted_at", null)

  if (!expired || expired.length === 0) {
    return jsonResponse({ expired: 0 }, 200)
  }

  // Desactivar en DB
  const ids = expired.map((c: { id: string }) => c.id)
  await supabaseAdmin
    .from("online_classes")
    .update({ active: false })
    .in("id", ids)

  // Eliminar archivos de R2
  const r2 = getR2Client()
  for (const cls of expired) {
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: BUCKET(),
        Key: cls.storage_key,
      }))
    } catch (err) {
      console.error(`R2 cleanup error for ${cls.storage_key}:`, err)
    }
  }

  return jsonResponse({ expired: expired.length }, 200)
}

// ── Main handler ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const body = await req.json()
    const action = body.action as string

    if (!action) {
      return jsonResponse({ error: "missing action" }, 400)
    }

    // expire-classes puede correr sin auth (llamado por cron)
    if (action === "expire-classes") {
      return await expireClasses(body, { userId: "", isAdmin: true, isPortal: false }, supabaseAdmin)
    }

    // Todas las demás acciones requieren auth
    const auth = await verifyAuth(req, supabaseAdmin)
    if (!auth) {
      return jsonResponse({ error: "unauthorized" }, 401)
    }

    switch (action) {
      case "get-upload-url":
        return await getUploadUrl(body, auth, supabaseAdmin)
      case "confirm-upload":
        return await confirmUpload(body, auth, supabaseAdmin)
      case "get-video-url":
        return await getVideoUrl(body, auth, supabaseAdmin)
      case "list-active":
        return await listActive(body, auth, supabaseAdmin)
      case "list-all":
        return await listAll(body, auth, supabaseAdmin)
      case "delete-class":
        return await deleteClass(body, auth, supabaseAdmin)
      default:
        return jsonResponse({ error: "unknown action" }, 400)
    }
  } catch (err) {
    console.error("clases-online error:", err)
    return jsonResponse({ error: "internal_error" }, 500)
  }
})
