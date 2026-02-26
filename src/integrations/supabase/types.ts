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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      component_maintenance_plans: {
        Row: {
          component_id: string | null
          component_type: string
          created_at: string
          equipment_id: string
          id: string
          interval_value: number
          last_execution_value: number
          task: string
          trigger_type: string
        }
        Insert: {
          component_id?: string | null
          component_type: string
          created_at?: string
          equipment_id: string
          id?: string
          interval_value?: number
          last_execution_value?: number
          task: string
          trigger_type?: string
        }
        Update: {
          component_id?: string | null
          component_type?: string
          created_at?: string
          equipment_id?: string
          id?: string
          interval_value?: number
          last_execution_value?: number
          task?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_maintenance_plans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      component_manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      component_models: {
        Row: {
          created_at: string
          id: string
          manufacturer_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "component_manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_components: {
        Row: {
          component_type: string
          created_at: string
          cylinder_number: number
          equipment_id: string
          horimeter_at_install: number
          id: string
        }
        Insert: {
          component_type: string
          created_at?: string
          cylinder_number: number
          equipment_id: string
          horimeter_at_install?: number
          id?: string
        }
        Update: {
          component_type?: string
          created_at?: string
          cylinder_number?: number
          equipment_id?: string
          horimeter_at_install?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_components_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_head_components: {
        Row: {
          component_type: string
          created_at: string
          cylinder_head_id: string
          horimeter_at_replacement: number
          id: string
          replacement_date: string
        }
        Insert: {
          component_type: string
          created_at?: string
          cylinder_head_id: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
        }
        Update: {
          component_type?: string
          created_at?: string
          cylinder_head_id?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_head_components_cylinder_head_id_fkey"
            columns: ["cylinder_head_id"]
            isOneToOne: false
            referencedRelation: "cylinder_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_head_installations: {
        Row: {
          created_at: string
          cylinder_head_id: string
          equipment_id: string
          id: string
          install_date: string
          install_equipment_horimeter: number
          remove_date: string | null
          remove_equipment_horimeter: number | null
        }
        Insert: {
          created_at?: string
          cylinder_head_id: string
          equipment_id: string
          id?: string
          install_date?: string
          install_equipment_horimeter?: number
          remove_date?: string | null
          remove_equipment_horimeter?: number | null
        }
        Update: {
          created_at?: string
          cylinder_head_id?: string
          equipment_id?: string
          id?: string
          install_date?: string
          install_equipment_horimeter?: number
          remove_date?: string | null
          remove_equipment_horimeter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_head_installations_cylinder_head_id_fkey"
            columns: ["cylinder_head_id"]
            isOneToOne: false
            referencedRelation: "cylinder_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_head_installations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_head_maintenances: {
        Row: {
          created_at: string
          cylinder_head_id: string
          description: string
          horimeter_at_maintenance: number
          id: string
          maintenance_date: string
        }
        Insert: {
          created_at?: string
          cylinder_head_id: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
        }
        Update: {
          created_at?: string
          cylinder_head_id?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_head_maintenances_cylinder_head_id_fkey"
            columns: ["cylinder_head_id"]
            isOneToOne: false
            referencedRelation: "cylinder_heads"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_heads: {
        Row: {
          created_at: string
          estimated_total_hours: number | null
          id: string
          last_maintenance_date: string | null
          location_id: string | null
          serial_number: string
          status: string
        }
        Insert: {
          created_at?: string
          estimated_total_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
        }
        Update: {
          created_at?: string
          estimated_total_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_heads_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_sub_components: {
        Row: {
          component_type: string
          created_at: string
          equipment_id: string
          horimeter: number
          id: string
          manufacturer_id: string | null
          model_id: string | null
          serial_number: string
          use_equipment_hours: boolean
        }
        Insert: {
          component_type: string
          created_at?: string
          equipment_id: string
          horimeter?: number
          id?: string
          manufacturer_id?: string | null
          model_id?: string | null
          serial_number?: string
          use_equipment_hours?: boolean
        }
        Update: {
          component_type?: string
          created_at?: string
          equipment_id?: string
          horimeter?: number
          id?: string
          manufacturer_id?: string | null
          model_id?: string | null
          serial_number?: string
          use_equipment_hours?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "equipment_sub_components_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_sub_components_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "component_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_sub_components_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "component_models"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          created_at: string
          cylinders: number
          equipment_type: string
          fuel_type: string
          id: string
          installation_date: string | null
          name: string
          oil_type_id: string | null
          serial_number: string
          total_horimeter: number
          total_starts: number
        }
        Insert: {
          created_at?: string
          cylinders?: number
          equipment_type?: string
          fuel_type?: string
          id?: string
          installation_date?: string | null
          name: string
          oil_type_id?: string | null
          serial_number?: string
          total_horimeter?: number
          total_starts?: number
        }
        Update: {
          created_at?: string
          cylinders?: number
          equipment_type?: string
          fuel_type?: string
          id?: string
          installation_date?: string | null
          name?: string
          oil_type_id?: string | null
          serial_number?: string
          total_horimeter?: number
          total_starts?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipments_oil_type_id_fkey"
            columns: ["oil_type_id"]
            isOneToOne: false
            referencedRelation: "oil_types"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          aplicacao: string
          category: string
          codigo: string
          codigo_alt_01: string
          codigo_alt_02: string
          created_at: string
          gerador: string
          id: string
          location_id: string
          manufacturer_id: string | null
          min_stock: number
          model_id: string | null
          name: string
          part_number: string
          quantity: number
          tipo: string
        }
        Insert: {
          aplicacao?: string
          category?: string
          codigo?: string
          codigo_alt_01?: string
          codigo_alt_02?: string
          created_at?: string
          gerador?: string
          id?: string
          location_id: string
          manufacturer_id?: string | null
          min_stock?: number
          model_id?: string | null
          name: string
          part_number?: string
          quantity?: number
          tipo?: string
        }
        Update: {
          aplicacao?: string
          category?: string
          codigo?: string
          codigo_alt_01?: string
          codigo_alt_02?: string
          created_at?: string
          gerador?: string
          id?: string
          location_id?: string
          manufacturer_id?: string | null
          min_stock?: number
          model_id?: string | null
          name?: string
          part_number?: string
          quantity?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "manufacturer_models"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      maintenance_log_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          maintenance_log_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          maintenance_log_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          maintenance_log_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_log_items_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          created_at: string
          equipment_id: string
          horimeter_at_service: number
          id: string
          maintenance_type: string
          notes: string | null
          oil_type_id: string | null
          service_date: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          horimeter_at_service?: number
          id?: string
          maintenance_type?: string
          notes?: string | null
          oil_type_id?: string | null
          service_date?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          horimeter_at_service?: number
          id?: string
          maintenance_type?: string
          notes?: string | null
          oil_type_id?: string | null
          service_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_oil_type_id_fkey"
            columns: ["oil_type_id"]
            isOneToOne: false
            referencedRelation: "oil_types"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturer_models: {
        Row: {
          created_at: string
          id: string
          manufacturer_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      oil_analyses: {
        Row: {
          analysis_date: string
          attachment_url: string | null
          created_at: string
          equipment_id: string
          horimeter_at_analysis: number
          id: string
          notes: string | null
          result: string
        }
        Insert: {
          analysis_date?: string
          attachment_url?: string | null
          created_at?: string
          equipment_id: string
          horimeter_at_analysis?: number
          id?: string
          notes?: string | null
          result?: string
        }
        Update: {
          analysis_date?: string
          attachment_url?: string | null
          created_at?: string
          equipment_id?: string
          horimeter_at_analysis?: number
          id?: string
          notes?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_analyses_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      turbo_components: {
        Row: {
          component_type: string
          created_at: string
          horimeter_at_replacement: number
          id: string
          replacement_date: string
          turbo_id: string
        }
        Insert: {
          component_type: string
          created_at?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          turbo_id: string
        }
        Update: {
          component_type?: string
          created_at?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          turbo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_components_turbo_id_fkey"
            columns: ["turbo_id"]
            isOneToOne: false
            referencedRelation: "turbos"
            referencedColumns: ["id"]
          },
        ]
      }
      turbo_installations: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          install_date: string
          install_equipment_horimeter: number
          remove_date: string | null
          remove_equipment_horimeter: number | null
          turbo_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          install_date?: string
          install_equipment_horimeter?: number
          remove_date?: string | null
          remove_equipment_horimeter?: number | null
          turbo_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          install_date?: string
          install_equipment_horimeter?: number
          remove_date?: string | null
          remove_equipment_horimeter?: number | null
          turbo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_installations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turbo_installations_turbo_id_fkey"
            columns: ["turbo_id"]
            isOneToOne: false
            referencedRelation: "turbos"
            referencedColumns: ["id"]
          },
        ]
      }
      turbo_maintenances: {
        Row: {
          created_at: string
          description: string
          horimeter_at_maintenance: number
          id: string
          maintenance_date: string
          turbo_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          turbo_id: string
        }
        Update: {
          created_at?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          turbo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_maintenances_turbo_id_fkey"
            columns: ["turbo_id"]
            isOneToOne: false
            referencedRelation: "turbos"
            referencedColumns: ["id"]
          },
        ]
      }
      turbos: {
        Row: {
          created_at: string
          id: string
          last_maintenance_date: string | null
          location_id: string | null
          serial_number: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cylinder_head_metrics: {
        Args: { p_cylinder_head_id: string }
        Returns: Json
      }
      get_turbo_metrics: { Args: { p_turbo_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
