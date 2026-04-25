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
      admin_settings: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          max_users: number
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          max_users?: number
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          max_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          admin_user_id: string | null
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
          subscription_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          provider: string
          subscription_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_profiles: {
        Row: {
          address_complement: string | null
          address_line1: string | null
          address_line2: string | null
          address_number: string | null
          admin_user_id: string
          city: string | null
          country: string
          created_at: string
          email: string
          entity_type: string
          id: string
          legal_name: string
          municipal_registration: string | null
          neighborhood: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          state_registration: string | null
          tax_id: string
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_number?: string | null
          admin_user_id: string
          city?: string | null
          country?: string
          created_at?: string
          email: string
          entity_type?: string
          id?: string
          legal_name: string
          municipal_registration?: string | null
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          tax_id: string
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_number?: string | null
          admin_user_id?: string
          city?: string | null
          country?: string
          created_at?: string
          email?: string
          entity_type?: string
          id?: string
          legal_name?: string
          municipal_registration?: string | null
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          tax_id?: string
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calendar_event_participants: {
        Row: {
          added_at: string
          event_id: string
          external_name: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          added_at?: string
          event_id: string
          external_name?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          added_at?: string
          event_id?: string
          external_name?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          meeting_id: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          meeting_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          meeting_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      discount_vouchers: {
        Row: {
          applies_to_plan_id: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean
          is_adhoc: boolean
          max_redemptions: number | null
          times_redeemed: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to_plan_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          is_adhoc?: boolean
          max_redemptions?: number | null
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to_plan_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          is_adhoc?: boolean
          max_redemptions?: number | null
          times_redeemed?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_vouchers_applies_to_plan_id_fkey"
            columns: ["applies_to_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      help_texts: {
        Row: {
          id: string
          page_key: string
          sections: Json
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          page_key: string
          sections?: Json
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          page_key?: string
          sections?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      idea_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          idea_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          idea_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          idea_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_attachments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_tasks: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          linked_by: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          linked_by: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          linked_by?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_tasks_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_implemented: boolean
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_implemented?: boolean
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_implemented?: boolean
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          admin_user_id: string
          amount_cents: number
          created_at: string
          created_by: string | null
          currency: string
          discount_cents: number
          due_date: string | null
          external_invoice_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          subscription_id: string
          subtotal_cents: number | null
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          amount_cents: number
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_id: string
          subtotal_cents?: number | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string
          subtotal_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_saved_filters: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_name: string | null
          file_path: string | null
          id: string
          reference_url: string | null
          scope: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          reference_url?: string | null
          scope?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          reference_url?: string | null
          scope?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          replied_at: string | null
          reply_message: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          replied_at?: string | null
          reply_message?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          replied_at?: string | null
          reply_message?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string
          doc_type: string
          id: string
          published_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          doc_type: string
          id?: string
          published_at?: string
          updated_by?: string | null
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          doc_type?: string
          id?: string
          published_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      meeting_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          meeting_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          meeting_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          meeting_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attachments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          admin_user_id: string
          brand: string | null
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          is_default: boolean
          last4: string | null
          provider: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_default: boolean
          minimum_seats: number
          name: string
          price_per_seat_cents: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          minimum_seats?: number
          name: string
          price_per_seat_cents?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          minimum_seats?: number
          name?: string
          price_per_seat_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          locale: string
          onboarding_completed_at: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          onboarding_completed_at?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          onboarding_completed_at?: string | null
          theme?: string
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
      subscription_changes: {
        Row: {
          admin_user_id: string
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          subscription_id: string
        }
        Insert: {
          admin_user_id: string
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          subscription_id: string
        }
        Update: {
          admin_user_id?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_changes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_discounts: {
        Row: {
          applied_at: string
          applied_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          invoices_remaining: number | null
          is_active: boolean
          removed_at: string | null
          removed_by: string | null
          subscription_id: string
          voucher_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invoices_remaining?: number | null
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          subscription_id: string
          voucher_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invoices_remaining?: number | null
          is_active?: boolean
          removed_at?: string | null
          removed_by?: string | null
          subscription_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "discount_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          subscription_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          subscription_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_notes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_user_id: string
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          minimum_seats: number
          past_due_since: string | null
          plan_id: string | null
          price_per_seat_cents: number
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          seats_purchased: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          minimum_seats?: number
          past_due_since?: string | null
          plan_id?: string | null
          price_per_seat_cents?: number
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          seats_purchased?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          minimum_seats?: number
          past_due_since?: string | null
          plan_id?: string | null
          price_per_seat_cents?: number
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          seats_purchased?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string
          id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      task_time_entries: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          is_critical: boolean
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
          is_critical?: boolean
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
          is_critical?: boolean
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
      team_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          display_name: string | null
          email: string
          expires_at: string
          id: string
          inviter_id: string
          revoked_at: string | null
          team_id: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          expires_at: string
          id?: string
          inviter_id: string
          revoked_at?: string | null
          team_id?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          inviter_id?: string
          revoked_at?: string | null
          team_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
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
      timer_sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_approvals: {
        Row: {
          created_by_admin: string | null
          id: string
          license_expires_at: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_by_admin?: string | null
          id?: string
          license_expires_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_by_admin?: string | null
          id?: string
          license_expires_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_column_order: {
        Row: {
          id: string
          status_ids_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          status_ids_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          status_ids_order?: string[]
          updated_at?: string
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
      work_instruction_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          instruction_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          instruction_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          instruction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_instruction_logs_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "work_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      work_instruction_versions: {
        Row: {
          change_reason: string
          changed_by: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          instruction_id: string
          version_number: number
        }
        Insert: {
          change_reason: string
          changed_by: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          instruction_id: string
          version_number: number
        }
        Update: {
          change_reason?: string
          changed_by?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          instruction_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_instruction_versions_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "work_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      work_instructions: {
        Row: {
          created_at: string
          created_by: string
          current_file_name: string
          current_file_path: string
          description: string | null
          id: string
          is_active: boolean
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_file_name: string
          current_file_path: string
          description?: string | null
          id?: string
          is_active?: boolean
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_file_name?: string
          current_file_path?: string
          description?: string | null
          id?: string
          is_active?: boolean
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_instructions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_add_user: { Args: { _admin_id: string }; Returns: boolean }
      apply_direct_discount: {
        Args: {
          _discount_type: string
          _discount_value: number
          _duration: string
          _duration_in_months: number
          _reason: string
          _subscription_id: string
        }
        Returns: string
      }
      apply_voucher: {
        Args: { _code: string; _subscription_id: string }
        Returns: string
      }
      billing_profile_missing_fields: {
        Args: { _admin_id: string }
        Returns: string[]
      }
      calculate_invoice_amount: {
        Args: { _subscription_id: string }
        Returns: {
          discount_cents: number
          subtotal_cents: number
          total_cents: number
        }[]
      }
      can_access_realtime_topic: { Args: { _topic: string }; Returns: boolean }
      can_access_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _target_id: string; _viewer_id: string }
        Returns: boolean
      }
      comp_activate_subscription: {
        Args: { _months: number; _reason: string; _subscription_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_admin_active_users_count: {
        Args: { _admin_id: string }
        Returns: number
      }
      get_user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      get_visible_user_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_calendar_event_owner: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_calendar_event_participant: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_task_owner: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      register_manual_payment: {
        Args: {
          _advance_cycle?: boolean
          _amount_cents: number
          _notes?: string
          _payment_method: string
          _payment_reference?: string
          _subscription_id: string
        }
        Returns: string
      }
      remove_voucher: {
        Args: { _subscription_discount_id: string }
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
