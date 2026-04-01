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
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      borders: {
        Row: {
          active: boolean | null
          category: string | null
          cost: number | null
          created_at: string | null
          free_sizes: string[] | null
          id: string
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          free_sizes?: string[] | null
          id?: string
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          free_sizes?: string[] | null
          id?: string
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          origin: string | null
          payment_method: string | null
          register_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          origin?: string | null
          payment_method?: string | null
          register_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          origin?: string | null
          payment_method?: string | null
          register_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          informed_amount: number | null
          initial_amount: number | null
          opened_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          informed_amount?: number | null
          initial_amount?: number | null
          opened_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          informed_amount?: number | null
          initial_amount?: number | null
          opened_at?: string | null
        }
        Relationships: []
      }
      free_border_rules: {
        Row: {
          enabled: boolean | null
          id: string
          size: string
        }
        Insert: {
          enabled?: boolean | null
          id?: string
          size: string
        }
        Update: {
          enabled?: boolean | null
          id?: string
          size?: string
        }
        Relationships: []
      }
      free_soda_rules: {
        Row: {
          enabled: boolean | null
          id: string
          size: string
        }
        Insert: {
          enabled?: boolean | null
          id?: string
          size: string
        }
        Update: {
          enabled?: boolean | null
          id?: string
          size?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          category: string
          cost: number | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          observations: string[] | null
          pizza_costs: Json | null
          pizza_prices: Json | null
          pizza_type: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          cost?: number | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          observations?: string[] | null
          pizza_costs?: Json | null
          pizza_prices?: Json | null
          pizza_type?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          cost?: number | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          observations?: string[] | null
          pizza_costs?: Json | null
          pizza_prices?: Json | null
          pizza_type?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          border_data: Json | null
          border_free: boolean | null
          calculated_price: number
          created_at: string | null
          free_soda: Json | null
          id: string
          observations: string[] | null
          pizza_size: string | null
          product_data: Json
          quantity: number | null
          sale_id: string
          second_flavor: Json | null
        }
        Insert: {
          border_data?: Json | null
          border_free?: boolean | null
          calculated_price: number
          created_at?: string | null
          free_soda?: Json | null
          id?: string
          observations?: string[] | null
          pizza_size?: string | null
          product_data: Json
          quantity?: number | null
          sale_id: string
          second_flavor?: Json | null
        }
        Update: {
          border_data?: Json | null
          border_free?: boolean | null
          calculated_price?: number
          created_at?: string | null
          free_soda?: Json | null
          id?: string
          observations?: string[] | null
          pizza_size?: string | null
          product_data?: Json
          quantity?: number | null
          sale_id?: string
          second_flavor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancelled: boolean | null
          cancelled_at: string | null
          change_amount: number | null
          code: string
          created_at: string | null
          customer_contact: string | null
          customer_name: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_mode: string | null
          id: string
          observations: string[] | null
          payments: Json
          register_id: string | null
          total: number
        }
        Insert: {
          cancelled?: boolean | null
          cancelled_at?: string | null
          change_amount?: number | null
          code: string
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          id?: string
          observations?: string[] | null
          payments: Json
          register_id?: string | null
          total: number
        }
        Update: {
          cancelled?: boolean | null
          cancelled_at?: string | null
          change_amount?: number | null
          code?: string
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          id?: string
          observations?: string[] | null
          payments?: Json
          register_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      soda_products: {
        Row: {
          active: boolean | null
          cost: number | null
          created_at: string | null
          free_sizes: string[] | null
          icon: string | null
          id: string
          name: string
          price: number | null
          size: string | null
        }
        Insert: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          free_sizes?: string[] | null
          icon?: string | null
          id?: string
          name: string
          price?: number | null
          size?: string | null
        }
        Update: {
          active?: boolean | null
          cost?: number | null
          created_at?: string | null
          free_sizes?: string[] | null
          icon?: string | null
          id?: string
          name?: string
          price?: number | null
          size?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
