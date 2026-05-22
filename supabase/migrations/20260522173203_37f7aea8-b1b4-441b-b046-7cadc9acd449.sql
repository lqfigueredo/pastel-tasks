
-- 1. Leads: add DELETE policy for solution_admin
CREATE POLICY "Solution admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));

-- 2. Fix team-attachments UPDATE policy: only original uploader
DROP POLICY IF EXISTS "Team members can update team attachments" ON storage.objects;

CREATE POLICY "Uploader can update team attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'team-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions (triggers + pgmq wrappers + admin sync)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_assignee_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_subscription_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_max_users() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_recurrence_type() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;

-- 4. Restrict RLS-helper / lookup functions to authenticated only (no anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_task_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_calendar_event_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_calendar_event_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_task(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_realtime_topic(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_team_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_visible_user_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_active_users_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_can_add_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.billing_profile_missing_fields(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_invoice_amount(uuid) FROM anon;

-- 5. Restrict admin-only RPCs to authenticated only (they self-check role internally)
REVOKE EXECUTE ON FUNCTION public.apply_voucher(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_voucher(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_direct_discount(uuid, text, integer, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.comp_activate_subscription(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_manual_payment(uuid, integer, text, text, text, boolean) FROM anon;
