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
          last_execution_date: string | null
          last_execution_value: number
          task: string
          tenant_id: string | null
          trigger_type: string
        }
        Insert: {
          component_id?: string | null
          component_type: string
          created_at?: string
          equipment_id: string
          id?: string
          interval_value?: number
          last_execution_date?: string | null
          last_execution_value?: number
          task: string
          tenant_id?: string | null
          trigger_type?: string
        }
        Update: {
          component_id?: string | null
          component_type?: string
          created_at?: string
          equipment_id?: string
          id?: string
          interval_value?: number
          last_execution_date?: string | null
          last_execution_value?: number
          task?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "component_maintenance_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      component_manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_manufacturers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      component_models: {
        Row: {
          created_at: string
          id: string
          manufacturer_id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer_id: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer_id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "component_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          component_type: string
          created_at?: string
          cylinder_number: number
          equipment_id: string
          horimeter_at_install?: number
          id?: string
          tenant_id?: string | null
        }
        Update: {
          component_type?: string
          created_at?: string
          cylinder_number?: number
          equipment_id?: string
          horimeter_at_install?: number
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_components_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          component_type: string
          created_at?: string
          cylinder_head_id: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          tenant_id?: string | null
        }
        Update: {
          component_type?: string
          created_at?: string
          cylinder_head_id?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_head_components_cylinder_head_id_fkey"
            columns: ["cylinder_head_id"]
            isOneToOne: false
            referencedRelation: "cylinder_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_head_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "cylinder_head_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          cylinder_head_id: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          cylinder_head_id?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_head_maintenances_cylinder_head_id_fkey"
            columns: ["cylinder_head_id"]
            isOneToOne: false
            referencedRelation: "cylinder_heads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_head_maintenances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_total_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_total_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_heads_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_heads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          installation_date: string | null
          manufacturer_id: string | null
          model_id: string | null
          serial_number: string
          tenant_id: string | null
          use_equipment_hours: boolean
        }
        Insert: {
          component_type: string
          created_at?: string
          equipment_id: string
          horimeter?: number
          id?: string
          installation_date?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          serial_number?: string
          tenant_id?: string | null
          use_equipment_hours?: boolean
        }
        Update: {
          component_type?: string
          created_at?: string
          equipment_id?: string
          horimeter?: number
          id?: string
          installation_date?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          serial_number?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "equipment_sub_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          has_horimeter: boolean
          id: string
          installation_date: string | null
          maintenance_plan_template_id: string | null
          manufacturer_id: string | null
          model_id: string | null
          name: string
          oil_type_id: string | null
          serial_number: string
          tenant_id: string | null
          total_horimeter: number
          total_starts: number
        }
        Insert: {
          created_at?: string
          cylinders?: number
          equipment_type?: string
          fuel_type?: string
          has_horimeter?: boolean
          id?: string
          installation_date?: string | null
          maintenance_plan_template_id?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          name: string
          oil_type_id?: string | null
          serial_number?: string
          tenant_id?: string | null
          total_horimeter?: number
          total_starts?: number
        }
        Update: {
          created_at?: string
          cylinders?: number
          equipment_type?: string
          fuel_type?: string
          has_horimeter?: boolean
          id?: string
          installation_date?: string | null
          maintenance_plan_template_id?: string | null
          manufacturer_id?: string | null
          model_id?: string | null
          name?: string
          oil_type_id?: string | null
          serial_number?: string
          tenant_id?: string | null
          total_horimeter?: number
          total_starts?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipments_maintenance_plan_template_id_fkey"
            columns: ["maintenance_plan_template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "component_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "component_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_oil_type_id_fkey"
            columns: ["oil_type_id"]
            isOneToOne: false
            referencedRelation: "oil_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_types: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_descriptions: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_descriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_log_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          maintenance_log_id: string
          quantity: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          maintenance_log_id: string
          quantity?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          maintenance_log_id?: string
          quantity?: number
          tenant_id?: string | null
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
          {
            foreignKeyName: "maintenance_log_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "maintenance_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plan_template_tasks: {
        Row: {
          component_type: string
          created_at: string
          id: string
          interval_value: number
          task: string
          template_id: string
          tenant_id: string | null
          trigger_type: string
        }
        Insert: {
          component_type: string
          created_at?: string
          id?: string
          interval_value?: number
          task: string
          template_id: string
          tenant_id?: string | null
          trigger_type?: string
        }
        Update: {
          component_type?: string
          created_at?: string
          id?: string
          interval_value?: number
          task?: string
          template_id?: string
          tenant_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plan_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plan_template_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plan_templates: {
        Row: {
          created_at: string
          description: string
          id: string
          manufacturer_id: string | null
          model_id: string | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          manufacturer_id?: string | null
          model_id?: string | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          manufacturer_id?: string | null
          model_id?: string | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plan_templates_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "component_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plan_templates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "component_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plan_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer_id: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer_id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturer_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_analyses: {
        Row: {
          analysis_date: string
          attachment_url: string | null
          collection_id: string | null
          created_at: string
          equipment_id: string
          horimeter_at_analysis: number
          id: string
          notes: string | null
          result: string
          tenant_id: string | null
        }
        Insert: {
          analysis_date?: string
          attachment_url?: string | null
          collection_id?: string | null
          created_at?: string
          equipment_id: string
          horimeter_at_analysis?: number
          id?: string
          notes?: string | null
          result?: string
          tenant_id?: string | null
        }
        Update: {
          analysis_date?: string
          attachment_url?: string | null
          collection_id?: string | null
          created_at?: string
          equipment_id?: string
          horimeter_at_analysis?: number
          id?: string
          notes?: string | null
          result?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_analyses_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "oil_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_analyses_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_collections: {
        Row: {
          collection_date: string
          collection_number: string
          created_at: string
          equipment_id: string
          horimeter_at_collection: number
          id: string
          notes: string | null
          tenant_id: string | null
        }
        Insert: {
          collection_date?: string
          collection_number?: string
          created_at?: string
          equipment_id: string
          horimeter_at_collection?: number
          id?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Update: {
          collection_date?: string
          collection_number?: string
          created_at?: string
          equipment_id?: string
          horimeter_at_collection?: number
          id?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_collections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_types: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          last_sign_in_at?: string | null
          role?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_sign_in_at?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
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
          tenant_id: string | null
          turbo_id: string
        }
        Insert: {
          component_type: string
          created_at?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          tenant_id?: string | null
          turbo_id: string
        }
        Update: {
          component_type?: string
          created_at?: string
          horimeter_at_replacement?: number
          id?: string
          replacement_date?: string
          tenant_id?: string | null
          turbo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
            foreignKeyName: "turbo_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          attachment_url: string | null
          created_at: string
          description: string
          horimeter_at_maintenance: number
          id: string
          maintenance_date: string
          tenant_id: string | null
          turbo_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          tenant_id?: string | null
          turbo_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          description?: string
          horimeter_at_maintenance?: number
          id?: string
          maintenance_date?: string
          tenant_id?: string | null
          turbo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turbo_maintenances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
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
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          location_id?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turbos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turbos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      get_user_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      record_sign_in: { Args: never; Returns: undefined }
      super_admin_get_all_accounts: { Args: never; Returns: Json }
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
