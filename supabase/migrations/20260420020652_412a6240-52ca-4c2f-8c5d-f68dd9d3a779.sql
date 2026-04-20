ALTER TABLE public.subscription_changes
DROP CONSTRAINT IF EXISTS subscription_changes_change_type_check;

ALTER TABLE public.subscription_changes
ADD CONSTRAINT subscription_changes_change_type_check
CHECK (change_type IN (
  'seats_changed',
  'status_changed',
  'trial_extended',
  'manual_payment',
  'cycle_advanced',
  'created',
  'cancellation_scheduled',
  'reactivated',
  'note',
  'voucher_applied',
  'voucher_removed',
  'direct_discount',
  'comp_activation'
));