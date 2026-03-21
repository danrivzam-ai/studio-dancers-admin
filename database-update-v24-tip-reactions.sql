-- ============================================================
-- v24 — Tip Reactions: emoji reactions on weekly_tips
-- ============================================================
-- Run in Supabase SQL Editor

-- 1. Reactions table
CREATE TABLE IF NOT EXISTS tip_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES weekly_tips(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👏','❤️','💪','🩰')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tip_id, student_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tip_reactions_tip ON tip_reactions(tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_reactions_student ON tip_reactions(student_id);

-- 2. RPC: Get tips for a course with reaction counts + student's own reaction
CREATE OR REPLACE FUNCTION rpc_client_get_tips(
  p_cedula TEXT,
  p_phone_last4 TEXT,
  p_course_id TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  week_start DATE,
  instructor_name TEXT,
  created_at TIMESTAMPTZ,
  reaction_applause INT,
  reaction_heart INT,
  reaction_strong INT,
  reaction_ballet INT,
  my_reaction TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Verify student access (reuse login logic)
  SELECT s.id INTO v_student_id
  FROM students s
  WHERE s.active = true
    AND s.course_id = p_course_id
    AND (
      REGEXP_REPLACE(COALESCE(s.cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.parent_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.payer_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
    )
    AND (
      RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
    )
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN; -- No access
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.title, t.body, t.week_start,
    COALESCE(i.name, 'Instructora')::TEXT as instructor_name,
    t.created_at,
    COALESCE(SUM(CASE WHEN r.emoji = '👏' THEN 1 ELSE 0 END), 0)::INT as reaction_applause,
    COALESCE(SUM(CASE WHEN r.emoji = '❤️' THEN 1 ELSE 0 END), 0)::INT as reaction_heart,
    COALESCE(SUM(CASE WHEN r.emoji = '💪' THEN 1 ELSE 0 END), 0)::INT as reaction_strong,
    COALESCE(SUM(CASE WHEN r.emoji = '🩰' THEN 1 ELSE 0 END), 0)::INT as reaction_ballet,
    (SELECT tr.emoji FROM tip_reactions tr WHERE tr.tip_id = t.id AND tr.student_id = v_student_id)::TEXT as my_reaction
  FROM weekly_tips t
  LEFT JOIN instructors i ON i.id = t.instructor_id
  LEFT JOIN tip_reactions r ON r.tip_id = t.id
  WHERE t.course_id::text = p_course_id
  GROUP BY t.id, t.title, t.body, t.week_start, i.name, t.created_at
  ORDER BY t.week_start DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_client_get_tips TO anon;

-- 3. RPC: Toggle reaction (upsert/delete)
CREATE OR REPLACE FUNCTION rpc_client_toggle_reaction(
  p_cedula TEXT,
  p_phone_last4 TEXT,
  p_tip_id UUID,
  p_emoji TEXT
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
  v_existing TEXT;
BEGIN
  -- Find student
  SELECT s.id INTO v_student_id
  FROM students s
  WHERE s.active = true
    AND (
      REGEXP_REPLACE(COALESCE(s.cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.parent_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.payer_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
    )
    AND (
      RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
    )
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Check existing reaction
  SELECT emoji INTO v_existing
  FROM tip_reactions
  WHERE tip_id = p_tip_id AND student_id = v_student_id;

  IF v_existing = p_emoji THEN
    -- Same emoji → remove (toggle off)
    DELETE FROM tip_reactions WHERE tip_id = p_tip_id AND student_id = v_student_id;
    RETURN json_build_object('success', true, 'action', 'removed');
  ELSIF v_existing IS NOT NULL THEN
    -- Different emoji → update
    UPDATE tip_reactions SET emoji = p_emoji, created_at = now()
    WHERE tip_id = p_tip_id AND student_id = v_student_id;
    RETURN json_build_object('success', true, 'action', 'changed');
  ELSE
    -- No reaction → insert
    INSERT INTO tip_reactions (tip_id, student_id, emoji) VALUES (p_tip_id, v_student_id, p_emoji);
    RETURN json_build_object('success', true, 'action', 'added');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_client_toggle_reaction TO anon;

-- 4. RPC: Get reaction counts for instructor view (no auth needed — instructor already authed)
CREATE OR REPLACE FUNCTION rpc_get_tip_reactions(p_tip_ids UUID[])
RETURNS TABLE (
  tip_id UUID,
  emoji TEXT,
  count BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r.tip_id, r.emoji, count(*)
  FROM tip_reactions r
  WHERE r.tip_id = ANY(p_tip_ids)
  GROUP BY r.tip_id, r.emoji;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_tip_reactions TO anon;
