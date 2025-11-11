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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          aspect_ratio: Database["public"]["Enums"]["aspect_ratio_enum"] | null
          brand: Database["public"]["Enums"]["brand_enum"]
          campaign: string | null
          captions: boolean | null
          channel_name: string | null
          created_at: string
          created_by: string | null
          dealer_visibility: Database["public"]["Enums"]["visibility_enum"]
          duration_sec: number | null
          hero: boolean | null
          id: string
          language: Database["public"]["Enums"]["language_enum"] | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          model: string | null
          notes: string | null
          publish_date: string
          region: Database["public"]["Enums"]["region_enum"] | null
          rights_note: string | null
          source: Database["public"]["Enums"]["source_enum"]
          source_account: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["status_enum"] | null
          tags: string[] | null
          thumbnail_url: string | null
          title_en: string | null
          title_zh: string
          updated_at: string
          updated_by: string | null
          utm_template: string | null
          views: number | null
          youtube_url: string
          youtube_video_id: string
        }
        Insert: {
          aspect_ratio?: Database["public"]["Enums"]["aspect_ratio_enum"] | null
          brand: Database["public"]["Enums"]["brand_enum"]
          campaign?: string | null
          captions?: boolean | null
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_visibility?: Database["public"]["Enums"]["visibility_enum"]
          duration_sec?: number | null
          hero?: boolean | null
          id?: string
          language?: Database["public"]["Enums"]["language_enum"] | null
          media_type: Database["public"]["Enums"]["media_type_enum"]
          model?: string | null
          notes?: string | null
          publish_date: string
          region?: Database["public"]["Enums"]["region_enum"] | null
          rights_note?: string | null
          source: Database["public"]["Enums"]["source_enum"]
          source_account?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["status_enum"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title_en?: string | null
          title_zh: string
          updated_at?: string
          updated_by?: string | null
          utm_template?: string | null
          views?: number | null
          youtube_url: string
          youtube_video_id: string
        }
        Update: {
          aspect_ratio?: Database["public"]["Enums"]["aspect_ratio_enum"] | null
          brand?: Database["public"]["Enums"]["brand_enum"]
          campaign?: string | null
          captions?: boolean | null
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_visibility?: Database["public"]["Enums"]["visibility_enum"]
          duration_sec?: number | null
          hero?: boolean | null
          id?: string
          language?: Database["public"]["Enums"]["language_enum"] | null
          media_type?: Database["public"]["Enums"]["media_type_enum"]
          model?: string | null
          notes?: string | null
          publish_date?: string
          region?: Database["public"]["Enums"]["region_enum"] | null
          rights_note?: string | null
          source?: Database["public"]["Enums"]["source_enum"]
          source_account?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["status_enum"] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title_en?: string | null
          title_zh?: string
          updated_at?: string
          updated_by?: string | null
          utm_template?: string | null
          views?: number | null
          youtube_url?: string
          youtube_video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "visitor" | "dealer" | "editor" | "admin"
      aspect_ratio_enum: "16:9" | "9:16" | "1:1" | "other"
      brand_enum: "PEUGEOT" | "CITROËN" | "ALFA ROMEO" | "JEEP"
      language_enum: "zh-TW" | "en" | "ja" | "fr"
      media_type_enum:
        | "測試試駕"
        | "形象廣告"
        | "技術解說"
        | "新車發表"
        | "活動報導"
        | "其他"
      region_enum: "TW" | "EU" | "JP" | "OTHER"
      source_enum: "官方頻道" | "媒體頻道" | "經銷產出"
      status_enum: "draft" | "published"
      visibility_enum: "internal-only" | "dealer-visible"
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
      app_role: ["visitor", "dealer", "editor", "admin"],
      aspect_ratio_enum: ["16:9", "9:16", "1:1", "other"],
      brand_enum: ["PEUGEOT", "CITROËN", "ALFA ROMEO", "JEEP"],
      language_enum: ["zh-TW", "en", "ja", "fr"],
      media_type_enum: [
        "測試試駕",
        "形象廣告",
        "技術解說",
        "新車發表",
        "活動報導",
        "其他",
      ],
      region_enum: ["TW", "EU", "JP", "OTHER"],
      source_enum: ["官方頻道", "媒體頻道", "經銷產出"],
      status_enum: ["draft", "published"],
      visibility_enum: ["internal-only", "dealer-visible"],
    },
  },
} as const
