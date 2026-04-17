/**
 * Centralized Kanban-related types.
 * Avoid redefining these in components or hooks.
 */

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  start_date: string | null;
  end_date: string | null;
  estimated_delivery_date: string | null;
  actual_end_date: string | null;
  is_minimized: boolean;
  recurring_task_id: string | null;
  meeting_pendency_id: string | null;
  is_critical: boolean;
  created_by: string;
  team_id: string | null;
  created_at: string;
  assignees: Profile[];
}
