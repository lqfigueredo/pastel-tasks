CREATE OR REPLACE FUNCTION public.validate_recurrence_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.recurrence_type NOT IN ('daily', 'weekly', 'monthly', 'yearly') THEN
    RAISE EXCEPTION 'recurrence_type must be daily, weekly, monthly, or yearly';
  END IF;
  RETURN NEW;
END;
$function$;