export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      delivery_date_logs: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_date: string | null
          old_date: string | null
          task_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_date?: string | null
          old_date?: string | null
          task_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_date?: string | null
          old_date?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_date_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          created_at: string
          created_by: string
          description: string
          external_participants: string[]
          id: string
          meeting_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          external_participants?: string[]
          id?: string
          meeting_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          external_participants?: string[]
          id?: string
          meeting_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_participants: {
        Row: {
          added_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_pendencies: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          is_completed: boolean
          meeting_id: string
          responsible_external_name: string | null
          responsible_user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          meeting_id: string
          responsible_external_name?: string | null
          responsible_user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          meeting_id?: string
          responsible_external_name?: string | null
          responsible_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_pendencies_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_tasks: {
        Row: {
          assignee_ids: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          next_run_date: string
          recurrence_day: number | null
          recurrence_type: string
          status_id: string
          team_id: string | null
          title: string
        }
        Insert: {
          assignee_ids?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_run_date: string
          recurrence_day?: number | null
          recurrence_type: string
          status_id: string
          team_id?: string | null
          title: string
        }
        Update: {
          assignee_ids?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_run_date?: string
          recurrence_day?: number | null
          recurrence_type?: string
          status_id?: string
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assigned_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_change_logs: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_change_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment_type: string
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment_type?: string
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment_type?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          team_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          team_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_end_date: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          estimated_delivery_date: string | null
          id: string
          is_minimized: boolean
          meeting_pendency_id: string | null
          recurring_task_id: string | null
          start_date: string | null
          status_id: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          estimated_delivery_date?: string | null
          id?: string
          is_minimized?: boolean
          meeting_pendency_id?: string | null
          recurring_task_id?: string | null
          start_date?: string | null
          status_id: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          estimated_delivery_date?: string | null
          id?: string
          is_minimized?: boolean
          meeting_pendency_id?: string | null
          recurring_task_id?: string | null
          start_date?: string | null
          status_id?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_meeting_pendency_id_fkey"
            columns: ["meeting_pendency_id"]
            isOneToOne: false
            referencedRelation: "meeting_pendencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          team_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          team_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          team_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          max_members: number
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          max_members?: number
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          max_members?: number
          name?: string
        }
        Relationships: []
      }
      user_approvals: {
        Row: {
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "solution_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "solution_admin"],
    },
  },
} as const
