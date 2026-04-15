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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      health_data: {
        Row: {
          created_at: string
          haircut: boolean
          id: number
          nail_clip: boolean
          notes: string | null
          parasite_treatment: boolean | null
          pig_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          haircut?: boolean
          id?: number
          nail_clip?: boolean
          notes?: string | null
          parasite_treatment?: boolean | null
          pig_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          haircut?: boolean
          id?: number
          nail_clip?: boolean
          notes?: string | null
          parasite_treatment?: boolean | null
          pig_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_data_pig_fkey"
            columns: ["pig_id"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
        ]
      }
      pig_relationships: {
        Row: {
          created_at: string | null
          id: number
          pig_id_a: number
          pig_id_b: number
          relationship_type: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          pig_id_a: number
          pig_id_b: number
          relationship_type: string
        }
        Update: {
          created_at?: string | null
          id?: number
          pig_id_a?: number
          pig_id_b?: number
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pig_relationships_pig_id_a_fkey"
            columns: ["pig_id_a"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pig_relationships_pig_id_b_fkey"
            columns: ["pig_id_b"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
        ]
      }
      pig_tags: {
        Row: {
          created_at: string | null
          id: number
          pig_id: number | null
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          pig_id?: number | null
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: number
          pig_id?: number | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "pig_tags_pig_id_fkey"
            columns: ["pig_id"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
        ]
      }
      pigs: {
        Row: {
          created_at: string
          description: string | null
          desexed: boolean | null
          dob: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: number
          image_path: string | null
          last_sighted: string | null
          name: string
          passed_away: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          desexed?: boolean | null
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: number
          image_path?: string | null
          last_sighted?: string | null
          name: string
          passed_away?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          desexed?: boolean | null
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: number
          image_path?: string | null
          last_sighted?: string | null
          name?: string
          passed_away?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          id: number
          pig_id: number | null
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: never
          pig_id?: number | null
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: never
          pig_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_pig_id_fkey"
            columns: ["pig_id"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
        ]
      }
      weights: {
        Row: {
          id: number
          pig_id: number
          recorded_at: string
          weight_grams: number
        }
        Insert: {
          id?: number
          pig_id: number
          recorded_at?: string
          weight_grams: number
        }
        Update: {
          id?: number
          pig_id?: number
          recorded_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "pig_weights_pig_id_fkey"
            columns: ["pig_id"]
            isOneToOne: false
            referencedRelation: "pigs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      death_status: "unknown"
      gender: "female" | "male"
      relationship_types: "parent" | "sibling" | "foster"
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
      death_status: ["unknown"],
      gender: ["female", "male"],
      relationship_types: ["parent", "sibling", "foster"],
    },
  },
} as const
