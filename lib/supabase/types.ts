// Replace this file with the output of:
//   supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      dd_devices: {
        Row: {
          id: string
          hostname: string
          model: string | null
          serial_number: string | null
          location: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          hostname: string
          model?: string | null
          serial_number?: string | null
          location?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          hostname?: string
          model?: string | null
          serial_number?: string | null
          location?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      dd_reports: {
        Row: {
          id: string
          device_id: string
          report_date: string
          raw_text: string | null
          parsed_data: Json
          ingested_at: string
          is_valid: boolean
          parse_errors: string | null
        }
        Insert: {
          id?: string
          device_id: string
          report_date: string
          raw_text?: string | null
          parsed_data: Json
          ingested_at?: string
          is_valid?: boolean
          parse_errors?: string | null
        }
        Update: {
          id?: string
          device_id?: string
          report_date?: string
          raw_text?: string | null
          parsed_data?: Json
          ingested_at?: string
          is_valid?: boolean
          parse_errors?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'dd_reports_device_id_fkey'
            columns: ['device_id']
            referencedRelation: 'dd_devices'
            referencedColumns: ['id']
          }
        ]
      }
      dd_alerts: {
        Row: {
          id: string
          device_id: string
          report_id: string
          alert_id: string | null
          severity: string
          class: string | null
          object: string | null
          message: string
          post_time: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          report_id: string
          alert_id?: string | null
          severity: string
          class?: string | null
          object?: string | null
          message: string
          post_time?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          report_id?: string
          alert_id?: string | null
          severity?: string
          class?: string | null
          object?: string | null
          message?: string
          post_time?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dd_alerts_device_id_fkey'
            columns: ['device_id']
            referencedRelation: 'dd_devices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dd_alerts_report_id_fkey'
            columns: ['report_id']
            referencedRelation: 'dd_reports'
            referencedColumns: ['id']
          }
        ]
      }
      system_logs: {
        Row: {
          id: string
          event_type: string
          device_id: string | null
          message: string
          details: Json | null
          severity: string
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          device_id?: string | null
          message: string
          details?: Json | null
          severity: string
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          device_id?: string | null
          message?: string
          details?: Json | null
          severity?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'system_logs_device_id_fkey'
            columns: ['device_id']
            referencedRelation: 'dd_devices'
            referencedColumns: ['id']
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      system_settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey'
            columns: ['updated_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      email_notifications: {
        Row: {
          id: string
          type: string
          device_id: string | null
          recipients: string[] | null
          subject: string | null
          body: string | null
          sent_at: string
          status: string
        }
        Insert: {
          id?: string
          type: string
          device_id?: string | null
          recipients?: string[] | null
          subject?: string | null
          body?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          id?: string
          type?: string
          device_id?: string | null
          recipients?: string[] | null
          subject?: string | null
          body?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_notifications_device_id_fkey'
            columns: ['device_id']
            referencedRelation: 'dd_devices'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      cleanup_old_reports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Convenience row/insert type aliases
type Tables = Database['public']['Tables']
export type DDDeviceRow = Tables['dd_devices']['Row']
export type DDDeviceInsert = Tables['dd_devices']['Insert']
export type DDDeviceUpdate = Tables['dd_devices']['Update']
export type DDReportRow = Tables['dd_reports']['Row']
export type DDReportInsert = Tables['dd_reports']['Insert']
export type DDAlertRow = Tables['dd_alerts']['Row']
export type DDAlertInsert = Tables['dd_alerts']['Insert']
export type SystemLogRow = Tables['system_logs']['Row']
export type SystemLogInsert = Tables['system_logs']['Insert']
export type UserProfileRow = Tables['user_profiles']['Row']
export type UserProfileUpdate = Tables['user_profiles']['Update']
export type SystemSettingRow = Tables['system_settings']['Row']
export type SystemSettingUpdate = Tables['system_settings']['Update']

// Projection types for queries that select only a subset of columns
export type DDReportListRow = Pick<
  DDReportRow,
  'id' | 'device_id' | 'report_date' | 'ingested_at' | 'is_valid' | 'parse_errors'
>
export type DDReportDetailRow = Pick<
  DDReportRow,
  'id' | 'device_id' | 'report_date' | 'parsed_data' | 'ingested_at' | 'is_valid' | 'parse_errors'
>
