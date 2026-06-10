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
          chassis_serial: string | null
          os_version: string | null
          hw_revision: string | null
          location: string | null
          admin_email: string | null
          data_encryption_enabled: boolean
          ha_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hostname: string
          model?: string | null
          serial_number?: string | null
          chassis_serial?: string | null
          os_version?: string | null
          hw_revision?: string | null
          location?: string | null
          admin_email?: string | null
          data_encryption_enabled?: boolean
          ha_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hostname?: string
          model?: string | null
          serial_number?: string | null
          chassis_serial?: string | null
          os_version?: string | null
          hw_revision?: string | null
          location?: string | null
          admin_email?: string | null
          data_encryption_enabled?: boolean
          ha_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dd_reports: {
        Row: {
          id: string
          device_id: string
          report_date: string
          generated_on: string | null
          timezone: string | null
          uptime_days: number | null
          is_valid: boolean
          parse_errors: string | null
          ingested_at: string
        }
        Insert: {
          id?: string
          device_id: string
          report_date: string
          generated_on?: string | null
          timezone?: string | null
          uptime_days?: number | null
          is_valid?: boolean
          parse_errors?: string | null
          ingested_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          report_date?: string
          generated_on?: string | null
          timezone?: string | null
          uptime_days?: number | null
          is_valid?: boolean
          parse_errors?: string | null
          ingested_at?: string
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
      dd_storage: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          total_gib: number | null
          used_gib: number | null
          available_gib: number | null
          used_percent: number | null
          cleanable_gib: number | null
          pre_comp_gib: number | null
          last_cleaning_at: string | null
          active_tier_size_tib: number | null
          active_tier_max_tib: number | null
          cache_tier_size_tib: number | null
          total_disks: number | null
          in_use_disks: number | null
          spare_disks: number | null
          not_installed_disks: number | null
          cache_in_use_disks: number | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          total_gib?: number | null
          used_gib?: number | null
          available_gib?: number | null
          used_percent?: number | null
          cleanable_gib?: number | null
          pre_comp_gib?: number | null
          last_cleaning_at?: string | null
          active_tier_size_tib?: number | null
          active_tier_max_tib?: number | null
          cache_tier_size_tib?: number | null
          total_disks?: number | null
          in_use_disks?: number | null
          spare_disks?: number | null
          not_installed_disks?: number | null
          cache_in_use_disks?: number | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          total_gib?: number | null
          used_gib?: number | null
          available_gib?: number | null
          used_percent?: number | null
          cleanable_gib?: number | null
          pre_comp_gib?: number | null
          last_cleaning_at?: string | null
          active_tier_size_tib?: number | null
          active_tier_max_tib?: number | null
          cache_tier_size_tib?: number | null
          total_disks?: number | null
          in_use_disks?: number | null
          spare_disks?: number | null
          not_installed_disks?: number | null
          cache_in_use_disks?: number | null
        }
        Relationships: [
          { foreignKeyName: 'dd_storage_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_storage_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_compression: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          period_from: string | null
          period_to: string | null
          cur_pre_comp_gib: number | null
          cur_post_comp_gib: number | null
          cur_total_factor: number | null
          cur_reduction_pct: number | null
          w7_pre_gib: number | null
          w7_post_gib: number | null
          w7_global_factor: number | null
          w7_local_factor: number | null
          w7_total_factor: number | null
          w7_reduction_pct: number | null
          w24_pre_gib: number | null
          w24_post_gib: number | null
          w24_global_factor: number | null
          w24_local_factor: number | null
          w24_total_factor: number | null
          w24_reduction_pct: number | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          period_from?: string | null
          period_to?: string | null
          cur_pre_comp_gib?: number | null
          cur_post_comp_gib?: number | null
          cur_total_factor?: number | null
          cur_reduction_pct?: number | null
          w7_pre_gib?: number | null
          w7_post_gib?: number | null
          w7_global_factor?: number | null
          w7_local_factor?: number | null
          w7_total_factor?: number | null
          w7_reduction_pct?: number | null
          w24_pre_gib?: number | null
          w24_post_gib?: number | null
          w24_global_factor?: number | null
          w24_local_factor?: number | null
          w24_total_factor?: number | null
          w24_reduction_pct?: number | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          period_from?: string | null
          period_to?: string | null
          cur_pre_comp_gib?: number | null
          cur_post_comp_gib?: number | null
          cur_total_factor?: number | null
          cur_reduction_pct?: number | null
          w7_pre_gib?: number | null
          w7_post_gib?: number | null
          w7_global_factor?: number | null
          w7_local_factor?: number | null
          w7_total_factor?: number | null
          w7_reduction_pct?: number | null
          w24_pre_gib?: number | null
          w24_post_gib?: number | null
          w24_global_factor?: number | null
          w24_local_factor?: number | null
          w24_total_factor?: number | null
          w24_reduction_pct?: number | null
        }
        Relationships: [
          { foreignKeyName: 'dd_compression_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_compression_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_mtrees: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          name: string
          mtree_id: string | null
          status: string | null
          pre_comp_gib: number | null
          post_comp_gib: number | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          name: string
          mtree_id?: string | null
          status?: string | null
          pre_comp_gib?: number | null
          post_comp_gib?: number | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          name?: string
          mtree_id?: string | null
          status?: string | null
          pre_comp_gib?: number | null
          post_comp_gib?: number | null
        }
        Relationships: [
          { foreignKeyName: 'dd_mtrees_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_mtrees_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_disk_groups: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          group_name: string
          disk_slots: string | null
          disk_count: number | null
          disk_size_tib: number | null
          tier_type: string | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          group_name: string
          disk_slots?: string | null
          disk_count?: number | null
          disk_size_tib?: number | null
          tier_type?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          group_name?: string
          disk_slots?: string | null
          disk_count?: number | null
          disk_size_tib?: number | null
          tier_type?: string | null
        }
        Relationships: [
          { foreignKeyName: 'dd_disk_groups_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_disk_groups_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_performance_metrics: {
        Row: {
          id: string
          report_id: string
          device_id: string
          metric_time: string
          read_mbps: number | null
          write_mbps: number | null
          repl_in_mbps: number | null
          repl_out_mbps: number | null
          repl_precomp_in_mbps: number | null
          repl_precomp_out_mbps: number | null
          compression_ops: number | null
          pre_comp_used_pct: number | null
          cache_miss_data_in: number | null
          cache_miss_data_out: number | null
          cache_miss_wait_in: number | null
          cache_miss_wait_out: number | null
          cpu_avg_pct: number | null
          cpu_max_pct: number | null
          disk_util_pct: number | null
          util_thra_pct: number | null
          util_unus_pct: number | null
          util_ovhd_pct: number | null
          util_data_pct: number | null
          util_meta_pct: number | null
          streams_read: number | null
          streams_write: number | null
          streams_repl_in: number | null
          streams_repl_out: number | null
          latency_avg_ms: number | null
          latency_max_ms: number | null
          gcomp_pct: number | null
          lcomp_pct: number | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          metric_time: string
          read_mbps?: number | null
          write_mbps?: number | null
          repl_in_mbps?: number | null
          repl_out_mbps?: number | null
          repl_precomp_in_mbps?: number | null
          repl_precomp_out_mbps?: number | null
          compression_ops?: number | null
          pre_comp_used_pct?: number | null
          cache_miss_data_in?: number | null
          cache_miss_data_out?: number | null
          cache_miss_wait_in?: number | null
          cache_miss_wait_out?: number | null
          cpu_avg_pct?: number | null
          cpu_max_pct?: number | null
          disk_util_pct?: number | null
          util_thra_pct?: number | null
          util_unus_pct?: number | null
          util_ovhd_pct?: number | null
          util_data_pct?: number | null
          util_meta_pct?: number | null
          streams_read?: number | null
          streams_write?: number | null
          streams_repl_in?: number | null
          streams_repl_out?: number | null
          latency_avg_ms?: number | null
          latency_max_ms?: number | null
          gcomp_pct?: number | null
          lcomp_pct?: number | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          metric_time?: string
          read_mbps?: number | null
          write_mbps?: number | null
          repl_in_mbps?: number | null
          repl_out_mbps?: number | null
          repl_precomp_in_mbps?: number | null
          repl_precomp_out_mbps?: number | null
          compression_ops?: number | null
          pre_comp_used_pct?: number | null
          cache_miss_data_in?: number | null
          cache_miss_data_out?: number | null
          cache_miss_wait_in?: number | null
          cache_miss_wait_out?: number | null
          cpu_avg_pct?: number | null
          cpu_max_pct?: number | null
          disk_util_pct?: number | null
          util_thra_pct?: number | null
          util_unus_pct?: number | null
          util_ovhd_pct?: number | null
          util_data_pct?: number | null
          util_meta_pct?: number | null
          streams_read?: number | null
          streams_write?: number | null
          streams_repl_in?: number | null
          streams_repl_out?: number | null
          latency_avg_ms?: number | null
          latency_max_ms?: number | null
          gcomp_pct?: number | null
          lcomp_pct?: number | null
        }
        Relationships: [
          { foreignKeyName: 'dd_perf_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_perf_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_backup_summary: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          jobs_total: number
          jobs_ok: number
          jobs_failed: number
          jobs_scheduled: number
          success_rate_pct: number | null
          avg_duration_min: number | null
          total_data_written_gib: number | null
          status: string
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          jobs_total?: number
          jobs_ok?: number
          jobs_failed?: number
          jobs_scheduled?: number
          success_rate_pct?: number | null
          avg_duration_min?: number | null
          total_data_written_gib?: number | null
          status?: string
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          jobs_total?: number
          jobs_ok?: number
          jobs_failed?: number
          jobs_scheduled?: number
          success_rate_pct?: number | null
          avg_duration_min?: number | null
          total_data_written_gib?: number | null
          status?: string
        }
        Relationships: [
          { foreignKeyName: 'dd_backup_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_backup_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_network_ports: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          port_name: string
          speed: string | null
          duplex: string | null
          link_status: string | null
          mac_address: string | null
          port_type: string | null
          autoneg: string | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          port_name: string
          speed?: string | null
          duplex?: string | null
          link_status?: string | null
          mac_address?: string | null
          port_type?: string | null
          autoneg?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          port_name?: string
          speed?: string | null
          duplex?: string | null
          link_status?: string | null
          mac_address?: string | null
          port_type?: string | null
          autoneg?: string | null
        }
        Relationships: [
          { foreignKeyName: 'dd_network_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_network_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_system_health: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          availability_since: string | null
          system_avail_pct: number | null
          system_avail_excl_pct: number | null
          filesystem_avail_pct: number | null
          filesystem_avail_excl_pct: number | null
          memory_total_mib: number | null
          memory_free_mib: number | null
          memory_inactive_mib: number | null
          swap_total_mib: number | null
          swap_free_mib: number | null
          nfs_status: string | null
          cifs_status: string | null
          filesystem_verify_status: string | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          availability_since?: string | null
          system_avail_pct?: number | null
          system_avail_excl_pct?: number | null
          filesystem_avail_pct?: number | null
          filesystem_avail_excl_pct?: number | null
          memory_total_mib?: number | null
          memory_free_mib?: number | null
          memory_inactive_mib?: number | null
          swap_total_mib?: number | null
          swap_free_mib?: number | null
          nfs_status?: string | null
          cifs_status?: string | null
          filesystem_verify_status?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          availability_since?: string | null
          system_avail_pct?: number | null
          system_avail_excl_pct?: number | null
          filesystem_avail_pct?: number | null
          filesystem_avail_excl_pct?: number | null
          memory_total_mib?: number | null
          memory_free_mib?: number | null
          memory_inactive_mib?: number | null
          swap_total_mib?: number | null
          swap_free_mib?: number | null
          nfs_status?: string | null
          cifs_status?: string | null
          filesystem_verify_status?: string | null
        }
        Relationships: [
          { foreignKeyName: 'dd_health_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_health_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_replication: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          is_configured: boolean
          destination: string | null
          status: string | null
          lag_seconds: number | null
          last_sync_at: string | null
          bytes_remaining: number | null
          throughput_mbps: number | null
          sync_percent: number | null
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          is_configured?: boolean
          destination?: string | null
          status?: string | null
          lag_seconds?: number | null
          last_sync_at?: string | null
          bytes_remaining?: number | null
          throughput_mbps?: number | null
          sync_percent?: number | null
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          is_configured?: boolean
          destination?: string | null
          status?: string | null
          lag_seconds?: number | null
          last_sync_at?: string | null
          bytes_remaining?: number | null
          throughput_mbps?: number | null
          sync_percent?: number | null
        }
        Relationships: [
          { foreignKeyName: 'dd_repl_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_repl_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      dd_alerts: {
        Row: {
          id: string
          report_id: string
          device_id: string
          report_date: string
          alert_id: string | null
          severity: string
          class: string | null
          object: string | null
          message: string
          post_time: string | null
          clear_time: string | null
          is_active: boolean
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          device_id: string
          report_date: string
          alert_id?: string | null
          severity: string
          class?: string | null
          object?: string | null
          message: string
          post_time?: string | null
          clear_time?: string | null
          is_active?: boolean
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          device_id?: string
          report_date?: string
          alert_id?: string | null
          severity?: string
          class?: string | null
          object?: string | null
          message?: string
          post_time?: string | null
          clear_time?: string | null
          is_active?: boolean
          status?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'dd_alerts_report_id_fkey'; columns: ['report_id']; referencedRelation: 'dd_reports'; referencedColumns: ['id'] },
          { foreignKeyName: 'dd_alerts_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
        ]
      }
      alert_rules: {
        Row: {
          id: string
          metric: string
          operator: string
          threshold: number
          severity: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          metric: string
          operator: string
          threshold: number
          severity: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          metric?: string
          operator?: string
          threshold?: number
          severity?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
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
          { foreignKeyName: 'system_logs_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
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
          { foreignKeyName: 'email_notifications_device_id_fkey'; columns: ['device_id']; referencedRelation: 'dd_devices'; referencedColumns: ['id'] }
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
          { foreignKeyName: 'user_profiles_id_fkey'; columns: ['id']; referencedRelation: 'users'; referencedColumns: ['id'] }
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
          { foreignKeyName: 'system_settings_updated_by_fkey'; columns: ['updated_by']; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {
      v_device_overview: {
        Row: {
          id: string
          hostname: string
          location: string | null
          model: string | null
          is_active: boolean
          last_report_date: string | null
          storage_used_pct: number | null
          total_gib: number | null
          used_gib: number | null
          available_gib: number | null
          compression_ratio: number | null
          cur_reduction_pct: number | null
          critical_alerts: number
          warning_alerts: number
          total_alerts: number
          jobs_ok: number | null
          jobs_failed: number | null
          backup_success_pct: number | null
          device_status: string
        }
        Relationships: []
      }
      v_latest_storage: {
        Row: {
          device_id: string
          hostname: string
          location: string | null
          report_date: string
          total_gib: number | null
          used_gib: number | null
          available_gib: number | null
          used_percent: number | null
          pre_comp_gib: number | null
          cleanable_gib: number | null
        }
        Relationships: []
      }
      v_latest_compression: {
        Row: {
          device_id: string
          hostname: string
          report_date: string
          cur_total_factor: number | null
          cur_reduction_pct: number | null
          w24_pre_gib: number | null
          w24_post_gib: number | null
          w24_total_factor: number | null
          w7_total_factor: number | null
        }
        Relationships: []
      }
      v_active_alerts_summary: {
        Row: {
          device_id: string
          critical_count: number
          warning_count: number
          info_count: number
          total_count: number
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Convenience type aliases
type Tables = Database['public']['Tables']

export type DDDeviceRow    = Tables['dd_devices']['Row']
export type DDDeviceInsert = Tables['dd_devices']['Insert']
export type DDDeviceUpdate = Tables['dd_devices']['Update']

export type DDReportRow    = Tables['dd_reports']['Row']
export type DDReportInsert = Tables['dd_reports']['Insert']
export type DDReportUpdate = Tables['dd_reports']['Update']

export type DDStorageRow    = Tables['dd_storage']['Row']
export type DDStorageInsert = Tables['dd_storage']['Insert']

export type DDCompressionRow    = Tables['dd_compression']['Row']
export type DDCompressionInsert = Tables['dd_compression']['Insert']

export type DDMtreeRow    = Tables['dd_mtrees']['Row']
export type DDMtreeInsert = Tables['dd_mtrees']['Insert']

export type DDDiskGroupRow    = Tables['dd_disk_groups']['Row']
export type DDDiskGroupInsert = Tables['dd_disk_groups']['Insert']

export type DDPerformanceRow    = Tables['dd_performance_metrics']['Row']
export type DDPerformanceInsert = Tables['dd_performance_metrics']['Insert']

export type DDBackupSummaryRow    = Tables['dd_backup_summary']['Row']
export type DDBackupSummaryInsert = Tables['dd_backup_summary']['Insert']

export type DDNetworkPortRow    = Tables['dd_network_ports']['Row']
export type DDNetworkPortInsert = Tables['dd_network_ports']['Insert']

export type DDSystemHealthRow    = Tables['dd_system_health']['Row']
export type DDSystemHealthInsert = Tables['dd_system_health']['Insert']

export type DDReplicationRow    = Tables['dd_replication']['Row']
export type DDReplicationInsert = Tables['dd_replication']['Insert']

export type DDAlertRow    = Tables['dd_alerts']['Row']
export type DDAlertInsert = Tables['dd_alerts']['Insert']

export type AlertRuleRow = Tables['alert_rules']['Row']

export type SystemLogRow    = Tables['system_logs']['Row']
export type SystemLogInsert = Tables['system_logs']['Insert']

export type UserProfileRow    = Tables['user_profiles']['Row']
export type UserProfileUpdate = Tables['user_profiles']['Update']

export type SystemSettingRow    = Tables['system_settings']['Row']
export type SystemSettingUpdate = Tables['system_settings']['Update']

// View types
type Views = Database['public']['Views']
export type DeviceOverviewRow = Views['v_device_overview']['Row']

// Projection types used by report list/detail queries
export type DDReportListRow = Pick<
  DDReportRow,
  'id' | 'device_id' | 'report_date' | 'ingested_at' | 'is_valid' | 'parse_errors'
>
export type DDReportDetailRow = Pick<
  DDReportRow,
  'id' | 'device_id' | 'report_date' | 'generated_on' | 'timezone' | 'uptime_days' | 'ingested_at' | 'is_valid' | 'parse_errors'
>
