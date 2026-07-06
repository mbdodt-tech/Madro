// Genereret fra Supabase-projektet (rtkktiywjcwglwzebchx) via
// generate_typescript_types — regenerér efter hver migration.
// Må ikke redigeres i hånden.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_days: {
        Row: {
          active_kcal: number | null;
          created_at: string;
          day: string;
          source: string;
          steps: number | null;
          user_id: string;
        };
        Insert: {
          active_kcal?: number | null;
          created_at?: string;
          day: string;
          source?: string;
          steps?: number | null;
          user_id: string;
        };
        Update: {
          active_kcal?: number | null;
          created_at?: string;
          day?: string;
          source?: string;
          steps?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      body_metrics: {
        Row: {
          created_at: string;
          day: string;
          source: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          day: string;
          source?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          day?: string;
          source?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      daily_summaries: {
        Row: {
          computed_at: string;
          day: string;
          kcal: number | null;
          macros: Json;
          micros: Json;
          nova_share: number | null;
          user_id: string;
        };
        Insert: {
          computed_at?: string;
          day: string;
          kcal?: number | null;
          macros?: Json;
          micros?: Json;
          nova_share?: number | null;
          user_id: string;
        };
        Update: {
          computed_at?: string;
          day?: string;
          kcal?: number | null;
          macros?: Json;
          micros?: Json;
          nova_share?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          additives: string[];
          allergens: string[];
          barcode: string | null;
          brand: string | null;
          categories: string[];
          created_at: string;
          data_quality: string;
          id: string;
          image_url: string | null;
          ingredients_text: string | null;
          name: string;
          nova_group: number | null;
          nutriments: Json;
          nutriscore: string | null;
          owner_id: string | null;
          source: string;
          source_ref: string | null;
          updated_at: string;
        };
        Insert: {
          additives?: string[];
          allergens?: string[];
          barcode?: string | null;
          brand?: string | null;
          categories?: string[];
          created_at?: string;
          data_quality: string;
          id?: string;
          image_url?: string | null;
          ingredients_text?: string | null;
          name: string;
          nova_group?: number | null;
          nutriments?: Json;
          nutriscore?: string | null;
          owner_id?: string | null;
          source: string;
          source_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          additives?: string[];
          allergens?: string[];
          barcode?: string | null;
          brand?: string | null;
          categories?: string[];
          created_at?: string;
          data_quality?: string;
          id?: string;
          image_url?: string | null;
          ingredients_text?: string | null;
          name?: string;
          nova_group?: number | null;
          nutriments?: Json;
          nutriscore?: string | null;
          owner_id?: string | null;
          source?: string;
          source_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      insights: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          kind: string;
          period_end: string;
          period_start: string;
          user_id: string;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          id?: string;
          kind?: string;
          period_end: string;
          period_start: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          kind?: string;
          period_end?: string;
          period_start?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      log_entries: {
        Row: {
          amount: number;
          consumed_at: string;
          created_at: string;
          food_id: string | null;
          id: string;
          meal: string;
          scan_id: string | null;
          unit: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          consumed_at?: string;
          created_at?: string;
          food_id?: string | null;
          id?: string;
          meal: string;
          scan_id?: string | null;
          unit?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          consumed_at?: string;
          created_at?: string;
          food_id?: string | null;
          id?: string;
          meal?: string;
          scan_id?: string | null;
          unit?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "log_entries_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "log_entries_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrient_references: {
        Row: {
          age_max: number;
          age_min: number;
          id: string;
          nutrient_key: string;
          rda: number | null;
          region: string;
          sex: string;
          source: string;
          ul: number | null;
          unit: string;
        };
        Insert: {
          age_max?: number;
          age_min?: number;
          id?: string;
          nutrient_key: string;
          rda?: number | null;
          region: string;
          sex?: string;
          source: string;
          ul?: number | null;
          unit: string;
        };
        Update: {
          age_max?: number;
          age_min?: number;
          id?: string;
          nutrient_key?: string;
          rda?: number | null;
          region?: string;
          sex?: string;
          source?: string;
          ul?: number | null;
          unit?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          activity_level: string | null;
          birth_year: number | null;
          consent_at: string | null;
          created_at: string;
          dietary_preferences: string[];
          entitlement: string;
          goals: Json;
          height_cm: number | null;
          hide_calories: boolean;
          id: string;
          locale: string;
          onboarded_at: string | null;
          rda_region: string;
          sex: string | null;
          timezone: string;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          activity_level?: string | null;
          birth_year?: number | null;
          consent_at?: string | null;
          created_at?: string;
          dietary_preferences?: string[];
          entitlement?: string;
          goals?: Json;
          height_cm?: number | null;
          hide_calories?: boolean;
          id: string;
          locale?: string;
          onboarded_at?: string | null;
          rda_region?: string;
          sex?: string | null;
          timezone?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          activity_level?: string | null;
          birth_year?: number | null;
          consent_at?: string | null;
          created_at?: string;
          dietary_preferences?: string[];
          entitlement?: string;
          goals?: Json;
          height_cm?: number | null;
          hide_calories?: boolean;
          id?: string;
          locale?: string;
          onboarded_at?: string | null;
          rda_region?: string;
          sex?: string | null;
          timezone?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      recommendations: {
        Row: {
          created_at: string;
          day: string | null;
          id: string;
          items: Json;
          scan_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day?: string | null;
          id?: string;
          items?: Json;
          scan_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          day?: string | null;
          id?: string;
          items?: Json;
          scan_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendations_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
        ];
      };
      scans: {
        Row: {
          barcode: string | null;
          created_at: string;
          food_id: string | null;
          id: string;
          outcome: string;
          payload: Json;
          type: string;
          user_id: string;
        };
        Insert: {
          barcode?: string | null;
          created_at?: string;
          food_id?: string | null;
          id?: string;
          outcome?: string;
          payload?: Json;
          type?: string;
          user_id: string;
        };
        Update: {
          barcode?: string | null;
          created_at?: string;
          food_id?: string | null;
          id?: string;
          outcome?: string;
          payload?: Json;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scans_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      madro_local_day: {
        Args: { p_ts: string; p_user: string };
        Returns: string;
      };
      recompute_daily_summary: {
        Args: { p_day: string; p_user: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
