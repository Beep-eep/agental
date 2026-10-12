// Generated with `supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
// Regenerate after every migration: `npm run db:types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: { created_at: string; email: string }
        Insert: { created_at?: string; email: string }
        Update: { created_at?: string; email?: string }
        Relationships: []
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: number
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: never
          to_status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: never
          to_status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          approved_at: string | null
          casting_id: string
          created_at: string
          id: string
          match_reasons: Json
          match_score: number | null
          note: string | null
          status: Database["public"]["Enums"]["application_status"]
          talent_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          casting_id: string
          created_at?: string
          id?: string
          match_reasons?: Json
          match_score?: number | null
          note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          talent_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          casting_id?: string
          created_at?: string
          id?: string
          match_reasons?: Json
          match_score?: number | null
          note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          talent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_casting_id_fkey"
            columns: ["casting_id"]
            isOneToOne: false
            referencedRelation: "castings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_talent_id_fkey"
            columns: ["talent_id"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["id"]
          },
        ]
      }
      casting_directors: {
        Row: {
          city: string | null
          company: string
          created_at: string
          id: string
          job_title: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          verified: boolean
          website: string | null
        }
        Insert: {
          city?: string | null
          company?: string
          created_at?: string
          id: string
          job_title?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          city?: string | null
          company?: string
          created_at?: string
          id?: string
          job_title?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casting_directors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      casting_types: {
        Row: {
          category: Database["public"]["Enums"]["casting_category"]
          description: string
          is_active: boolean
          label: string
          pay_max: number | null
          pay_min: number | null
          pay_unit: string
          slug: string
          sort_order: number
          summary: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["casting_category"]
          description?: string
          is_active?: boolean
          label: string
          pay_max?: number | null
          pay_min?: number | null
          pay_unit?: string
          slug: string
          sort_order?: number
          summary: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["casting_category"]
          description?: string
          is_active?: boolean
          label?: string
          pay_max?: number | null
          pay_min?: number | null
          pay_unit?: string
          slug?: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      castings: {
        Row: {
          age_max: number | null
          age_min: number | null
          category: Database["public"]["Enums"]["casting_category"]
          city: string
          created_at: string
          deadline: string | null
          description: string | null
          director_id: string | null
          gender_req: string | null
          id: string
          languages_req: string[]
          pay_max: number | null
          pay_min: number | null
          pay_unit: string
          production: string | null
          remote_ok: boolean
          shoot_date: string | null
          skills_req: string[]
          source: string
          status: Database["public"]["Enums"]["casting_status"]
          title: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category: Database["public"]["Enums"]["casting_category"]
          city: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          director_id?: string | null
          gender_req?: string | null
          id?: string
          languages_req?: string[]
          pay_max?: number | null
          pay_min?: number | null
          pay_unit?: string
          production?: string | null
          remote_ok?: boolean
          shoot_date?: string | null
          skills_req?: string[]
          source?: string
          status?: Database["public"]["Enums"]["casting_status"]
          title: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category?: Database["public"]["Enums"]["casting_category"]
          city?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          director_id?: string | null
          gender_req?: string | null
          id?: string
          languages_req?: string[]
          pay_max?: number | null
          pay_min?: number | null
          pay_unit?: string
          production?: string | null
          remote_ok?: boolean
          shoot_date?: string | null
          skills_req?: string[]
          source?: string
          status?: Database["public"]["Enums"]["casting_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "castings_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "casting_directors"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          id: number
          kind: Database["public"]["Enums"]["consent_kind"]
          profile_id: string
          version: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: never
          kind: Database["public"]["Enums"]["consent_kind"]
          profile_id: string
          version: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: never
          kind?: Database["public"]["Enums"]["consent_kind"]
          profile_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          device: string | null
          id: number
          name: string
          path: string | null
          props: Json
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: never
          name: string
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: never
          name?: string
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          nps: number
          pmf: string | null
          profile_id: string
          topic: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          nps: number
          pmf?: string | null
          profile_id?: string
          topic?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          nps?: number
          pmf?: string | null
          profile_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          applications_open: number
          castings_open: number
          created_at: string
          day: string
          directors_total: number
          talents_active: number
          talents_total: number
        }
        Insert: {
          applications_open: number
          castings_open: number
          created_at?: string
          day: string
          directors_total: number
          talents_active: number
          talents_total: number
        }
        Update: {
          applications_open?: number
          castings_open?: number
          created_at?: string
          day?: string
          directors_total?: number
          talents_active?: number
          talents_total?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          city: string | null
          company: string | null
          converted_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          interest: Database["public"]["Enums"]["casting_category"] | null
          kind: Database["public"]["Enums"]["lead_kind"]
          landing_path: string | null
          message: string | null
          profile_id: string | null
          referrer: string | null
          session_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          converted_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          interest?: Database["public"]["Enums"]["casting_category"] | null
          kind: Database["public"]["Enums"]["lead_kind"]
          landing_path?: string | null
          message?: string | null
          profile_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          interest?: Database["public"]["Enums"]["casting_category"] | null
          kind?: Database["public"]["Enums"]["lead_kind"]
          landing_path?: string | null
          message?: string | null
          profile_id?: string | null
          referrer?: string | null
          session_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          commission_pct: number
          features: string[]
          is_active: boolean
          monthly_price_eur: number
          name: string
          sort_order: number
          tagline: string
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          commission_pct: number
          features?: string[]
          is_active?: boolean
          monthly_price_eur: number
          name: string
          sort_order?: number
          tagline?: string
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          features?: string[]
          is_active?: boolean
          monthly_price_eur?: number
          name?: string
          sort_order?: number
          tagline?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      talents: {
        Row: {
          availability: string
          bio: string | null
          birth_date: string | null
          categories: Database["public"]["Enums"]["casting_category"][]
          city: string | null
          country: string
          created_at: string
          excluded_categories: Database["public"]["Enums"]["casting_category"][]
          gender: string | null
          headshot_path: string | null
          height_cm: number | null
          id: string
          landing_path: string | null
          languages: string[]
          mandate_signed_at: string | null
          onboarding_step: number
          plan: Database["public"]["Enums"]["plan_tier"]
          reel_url: string | null
          referrer: string | null
          skills: string[]
          stage_name: string | null
          union_status: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          availability?: string
          bio?: string | null
          birth_date?: string | null
          categories?: Database["public"]["Enums"]["casting_category"][]
          city?: string | null
          country?: string
          created_at?: string
          excluded_categories?: Database["public"]["Enums"]["casting_category"][]
          gender?: string | null
          headshot_path?: string | null
          height_cm?: number | null
          id: string
          landing_path?: string | null
          languages?: string[]
          mandate_signed_at?: string | null
          onboarding_step?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          reel_url?: string | null
          referrer?: string | null
          skills?: string[]
          stage_name?: string | null
          union_status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          availability?: string
          bio?: string | null
          birth_date?: string | null
          categories?: Database["public"]["Enums"]["casting_category"][]
          city?: string | null
          country?: string
          created_at?: string
          excluded_categories?: Database["public"]["Enums"]["casting_category"][]
          gender?: string | null
          headshot_path?: string | null
          height_cm?: number | null
          id?: string
          landing_path?: string | null
          languages?: string[]
          mandate_signed_at?: string | null
          onboarding_step?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          reel_url?: string | null
          referrer?: string | null
          skills?: string[]
          stage_name?: string | null
          union_status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talents_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talents_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["tier"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_acquisition: { Args: { p_days?: number }; Returns: Json }
      analytics_cohorts: { Args: { p_weeks?: number }; Returns: Json }
      analytics_feedback: { Args: { p_days?: number }; Returns: Json }
      analytics_funnel: { Args: { p_days?: number }; Returns: Json }
      analytics_insights: { Args: never; Returns: Json }
      analytics_onboarding: { Args: never; Returns: Json }
      analytics_overview: { Args: { p_days?: number }; Returns: Json }
      analytics_pipeline: { Args: { p_days?: number }; Returns: Json }
      analytics_supply_demand: { Args: never; Returns: Json }
      analytics_timeseries: { Args: { p_days?: number }; Returns: Json }
      analytics_validation: { Args: { p_days?: number }; Returns: Json }
      casting_pipeline: {
        Args: { p_casting_id: string }
        Returns: {
          application_id: string
          approved_at: string
          city: string
          display_name: string
          languages: string[]
          reasons: Json
          score: number
          skills: string[]
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }[]
      }
      completeness: {
        Args: { t: Database["public"]["Tables"]["talents"]["Row"] }
        Returns: number
      }
      match_talents: {
        Args: { p_casting_id: string; p_limit?: number }
        Returns: {
          age: number
          already_proposed: boolean
          categories: Database["public"]["Enums"]["casting_category"][]
          city: string
          completeness: number
          display_name: string
          languages: string[]
          reasons: Json
          score: number
          skills: string[]
          talent_id: string
        }[]
      }
      propose_talents: {
        Args: { p_casting_id: string; p_talent_ids: string[] }
        Returns: number
      }
      recommended_castings: {
        Args: { p_limit?: number }
        Returns: {
          applied: boolean
          casting_id: string
          category: Database["public"]["Enums"]["casting_category"]
          city: string
          deadline: string
          pay_max: number
          pay_min: number
          pay_unit: string
          production: string
          reasons: Json
          remote_ok: boolean
          score: number
          title: string
        }[]
      }
    }
    Enums: {
      application_status:
        | "proposed"
        | "awaiting_talent"
        | "approved"
        | "declined"
        | "queued"
        | "submitted"
        | "callback"
        | "booked"
        | "passed"
      casting_category:
        | "background"
        | "walk_on"
        | "supporting"
        | "commercial"
        | "photo"
        | "voice"
        | "creator"
        | "performer"
      casting_status: "draft" | "open" | "closed"
      consent_kind: "terms" | "privacy" | "representation_mandate" | "marketing"
      lead_kind: "talent" | "director"
      plan_tier: "free" | "pro" | "premium" | "ultimate"
      user_role: "talent" | "director" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "proposed",
        "awaiting_talent",
        "approved",
        "declined",
        "queued",
        "submitted",
        "callback",
        "booked",
        "passed",
      ],
      casting_category: [
        "background",
        "walk_on",
        "supporting",
        "commercial",
        "photo",
        "voice",
        "creator",
        "performer",
      ],
      casting_status: ["draft", "open", "closed"],
      consent_kind: ["terms", "privacy", "representation_mandate", "marketing"],
      lead_kind: ["talent", "director"],
      plan_tier: ["free", "pro", "premium", "ultimate"],
      user_role: ["talent", "director", "admin"],
    },
  },
} as const
