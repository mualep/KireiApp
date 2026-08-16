-- Fix: Pass through domain error codes from apply_tracker_action_impl exceptions
-- The Sprint1 wrapper hardcoded 'invalid_input' for all sqlstate 22023 exceptions,
-- losing the original domain codes like 'tracker.invalid_transition',
-- 'tracker.alpha_rejected', etc. This caused the frontend to always show
-- the unhelpful generic_error message.
--
-- The fix: use sqlerrm (which contains the domain code set via RAISE EXCEPTION)
-- as the JSON 'code' field, so the frontend can map it correctly.

CREATE OR REPLACE FUNCTION public.apply_tracker_action(
  p_target_user_id uuid,
  p_action text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_actor_tier text;
  v_res jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'unauthenticated',
      'message', 'User is unauthenticated'
    );
  END IF;

  SELECT u.tier
    INTO v_actor_tier
  FROM public.users AS u
  WHERE u.id = v_actor_id
    AND u.is_deleted = false
    AND u.tier IN ('owner', 'admin')
  LIMIT 1;

  IF v_actor_tier IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'unauthorized',
      'message', 'User is not authorized for tracker actions'
    );
  END IF;

  BEGIN
    v_res := app_private.apply_tracker_action_impl(
      v_actor_id,
      p_target_user_id,
      p_action,
      p_expected_version,
      pg_catalog.clock_timestamp()
    );
    RETURN v_res;
  EXCEPTION
    WHEN sqlstate '40001' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'tracker.version_conflict',
        'message', 'Tracker version conflict. The card was updated by another process.'
      );
    WHEN sqlstate '42501' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', sqlerrm,
        'message', 'Tracker action unauthorized.'
      );
    WHEN sqlstate '22023' THEN
      -- sqlerrm contains the domain error code (e.g. 'tracker.invalid_transition')
      RETURN jsonb_build_object(
        'ok', false,
        'code', sqlerrm,
        'message', sqlerrm
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'generic_error',
        'message', sqlerrm
      );
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_tracker_action(uuid, text, bigint) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
