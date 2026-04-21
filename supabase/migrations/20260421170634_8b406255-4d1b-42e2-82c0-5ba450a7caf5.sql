CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix text;
  rest text;
  uid uuid := auth.uid();
  parsed_uuid uuid;
  uuid_part text;
BEGIN
  IF uid IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  -- Allow Supabase system topics
  IF _topic LIKE 'realtime:%' OR _topic = 'phoenix' THEN
    RETURN true;
  END IF;

  prefix := split_part(_topic, ':', 1);
  rest   := substring(_topic from position(':' in _topic) + 1);

  IF position(':' in _topic) = 0 THEN
    RETURN false;
  END IF;

  IF prefix = 'user' THEN
    -- Accept both `user:<uuid>` and `user:<uuid>:<feature>` (e.g. user:<uuid>:tasks)
    uuid_part := split_part(rest, ':', 1);
    BEGIN
      parsed_uuid := uuid_part::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN parsed_uuid = uid;
  ELSIF prefix = 'team' THEN
    uuid_part := split_part(rest, ':', 1);
    BEGIN
      parsed_uuid := uuid_part::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_team_member(uid, parsed_uuid);
  ELSIF prefix = 'support' THEN
    uuid_part := split_part(rest, ':', 1);
    BEGIN
      parsed_uuid := uuid_part::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.has_role(uid, 'solution_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.support_tickets WHERE id = parsed_uuid AND created_by = uid);
  END IF;

  RETURN false;
END;
$function$;