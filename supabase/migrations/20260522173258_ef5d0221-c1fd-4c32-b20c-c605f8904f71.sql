
-- Functions that must NEVER be called from the API (triggers, pgmq wrappers, user provisioning)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_task_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_task_assignee_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_subscription_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_admin_max_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_recurrence_type() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;

-- RLS helper / lookup functions: revoke PUBLIC, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_task_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_owner(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_calendar_event_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_calendar_event_owner(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_calendar_event_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_calendar_event_participant(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_task(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_realtime_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_team_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_team_ids(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_visible_user_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visible_user_ids(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_active_users_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_active_users_count(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_can_add_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_can_add_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.billing_profile_missing_fields(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_profile_missing_fields(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_invoice_amount(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_invoice_amount(uuid) TO authenticated;

-- Admin-only RPCs (self-check role internally): authenticated only
REVOKE EXECUTE ON FUNCTION public.apply_voucher(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_voucher(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_voucher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_voucher(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_direct_discount(uuid, text, integer, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_direct_discount(uuid, text, integer, text, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.comp_activate_subscription(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comp_activate_subscription(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.register_manual_payment(uuid, integer, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_manual_payment(uuid, integer, text, text, text, boolean) TO authenticated;
