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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          capacity_override: number | null
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          price_override_kobo: number | null
          starts_at: string
          status: string
        }
        Insert: {
          capacity_override?: number | null
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          price_override_kobo?: number | null
          starts_at: string
          status?: string
        }
        Update: {
          capacity_override?: number | null
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          price_override_kobo?: number | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_guests: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          invited_email: string | null
          invited_phone: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          invited_email?: string | null
          invited_phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          invited_email?: string | null
          invited_phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attested_age: boolean
          attested_age_at: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          created_at: string
          fee_kobo: number
          guest_id: string
          id: string
          listing_id: string
          party_size: number
          payout_kobo: number
          paystack_reference: string | null
          paystack_split_code: string | null
          refunded_at: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo: number
          ticket_type_id: string | null
          total_kobo: number
          updated_at: string
        }
        Insert: {
          attested_age?: boolean
          attested_age_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          fee_kobo?: number
          guest_id: string
          id?: string
          listing_id: string
          party_size?: number
          payout_kobo?: number
          paystack_reference?: string | null
          paystack_split_code?: string | null
          refunded_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo?: number
          ticket_type_id?: string | null
          total_kobo?: number
          updated_at?: string
        }
        Update: {
          attested_age?: boolean
          attested_age_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          fee_kobo?: number
          guest_id?: string
          id?: string
          listing_id?: string
          party_size?: number
          payout_kobo?: number
          paystack_reference?: string | null
          paystack_split_code?: string | null
          refunded_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo?: number
          ticket_type_id?: string | null
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_listings: {
        Row: {
          added_by: string | null
          campaign_id: string
          created_at: string
          id: string
          listing_id: string
          position: number
        }
        Insert: {
          added_by?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          listing_id: string
          position?: number
        }
        Update: {
          added_by?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_listings_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_listings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          slug: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          slug: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          slug?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          template: Json | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          template?: Json | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          template?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_listings: {
        Row: {
          boost_score: number
          city: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          listing_id: string
          position: number
          slot_type: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          boost_score?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          listing_id: string
          position?: number
          slot_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          boost_score?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          listing_id?: string
          position?: number
          slot_type?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          app: string
          device_id: string
          id: string
          last_seen: string | null
          push_token: string | null
          user_id: string
        }
        Insert: {
          app: string
          device_id: string
          id?: string
          last_seen?: string | null
          push_token?: string | null
          user_id: string
        }
        Update: {
          app?: string
          device_id?: string
          id?: string
          last_seen?: string | null
          push_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          host_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          host_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          host_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      host_profiles: {
        Row: {
          address: string | null
          address_number: string | null
          bio: string | null
          city: string | null
          created_at: string
          hero_url: string | null
          host_type: Database["public"]["Enums"]["host_type"]
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          lat: number | null
          lng: number | null
          location_json: Json
          location_place_id: string | null
          payout_bank_json: Json | null
          paystack_subaccount_code: string | null
          response_rate: number
          slug: string
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          hero_url?: string | null
          host_type: Database["public"]["Enums"]["host_type"]
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lat?: number | null
          lng?: number | null
          location_json?: Json
          location_place_id?: string | null
          payout_bank_json?: Json | null
          paystack_subaccount_code?: string | null
          response_rate?: number
          slug: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          hero_url?: string | null
          host_type?: Database["public"]["Enums"]["host_type"]
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lat?: number | null
          lng?: number | null
          location_json?: Json
          location_place_id?: string | null
          payout_bank_json?: Json | null
          paystack_subaccount_code?: string | null
          response_rate?: number
          slug?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hq_role_permissions: {
        Row: {
          permissions: string[]
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          permissions?: string[]
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          permissions?: string[]
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hq_role_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          amount_kobo: number
          created_at: string | null
          currency: string | null
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          owner_user_id: string
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          amount_kobo: number
          created_at?: string | null
          currency?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          owner_user_id: string
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          amount_kobo?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          owner_user_id?: string
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          listing_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          amenities: string[]
          base_price_kobo: number
          blocks: Json
          booking_mode: Database["public"]["Enums"]["booking_mode"]
          capacity: number | null
          category_id: string | null
          city: string | null
          compliance: Json
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          duration_min: number | null
          health_score: number
          host_id: string
          id: string
          is_verified: boolean
          lat: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          lng: number | null
          metadata: Json
          search_tsv: unknown
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          base_price_kobo?: number
          blocks?: Json
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          capacity?: number | null
          category_id?: string | null
          city?: string | null
          compliance?: Json
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_min?: number | null
          health_score?: number
          host_id: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          lng?: number | null
          metadata?: Json
          search_tsv?: unknown
          slug?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[]
          base_price_kobo?: number
          blocks?: Json
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          capacity?: number | null
          category_id?: string | null
          city?: string | null
          compliance?: Json
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_min?: number | null
          health_score?: number
          host_id?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          lng?: number | null
          metadata?: Json
          search_tsv?: unknown
          slug?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_kobo: number
          created_at: string
          host_id: string
          id: string
          paystack_transfer_code: string | null
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          host_id: string
          id?: string
          paystack_transfer_code?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          host_id?: string
          id?: string
          paystack_transfer_code?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
          is_host: boolean
          paystack_customer_code: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_host?: boolean
          paystack_customer_code?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_host?: boolean
          paystack_customer_code?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          assigned_to: string | null
          body: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          report_type: string
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          report_type?: string
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          report_type?: string
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          booking_id: string
          by_user: string
          created_at: string
          id: string
          of_host: string | null
          of_listing: string | null
          photos: string[]
          rating: number
        }
        Insert: {
          body?: string | null
          booking_id: string
          by_user: string
          created_at?: string
          id?: string
          of_host?: string | null
          of_listing?: string | null
          photos?: string[]
          rating: number
        }
        Update: {
          body?: string | null
          booking_id?: string
          by_user?: string
          created_at?: string
          id?: string
          of_host?: string | null
          of_listing?: string | null
          photos?: string[]
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_by_user_fkey"
            columns: ["by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_of_host_fkey"
            columns: ["of_host"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_of_listing_fkey"
            columns: ["of_listing"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_of_listing_fkey"
            columns: ["of_listing"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string | null
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priority: string
          related_booking_id: string | null
          resolved_at: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          related_booking_id?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          related_booking_id?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          age_min: number | null
          capacity_sold: number
          capacity_total: number | null
          created_at: string
          description: string | null
          id: string
          listing_id: string
          name: string
          perks: string[]
          price_kobo: number
          sale_ends_at: string | null
          sale_starts_at: string | null
          sort_order: number
          status: string
          transferable: boolean
        }
        Insert: {
          age_min?: number | null
          capacity_sold?: number
          capacity_total?: number | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id: string
          name: string
          perks?: string[]
          price_kobo?: number
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          status?: string
          transferable?: boolean
        }
        Update: {
          age_min?: number | null
          capacity_sold?: number
          capacity_total?: number | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string
          name?: string
          perks?: string[]
          price_kobo?: number
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          status?: string
          transferable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          booking_id: string
          code: string
          created_at: string
          id: string
          jwt_jti: string
          scanned_at: string | null
          scanned_by: string | null
          scanned_device_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id: string | null
        }
        Insert: {
          booking_id: string
          code: string
          created_at?: string
          id?: string
          jwt_jti: string
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_device_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string | null
        }
        Update: {
          booking_id?: string
          code?: string
          created_at?: string
          id?: string
          jwt_jti?: string
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_device_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listings_with_capacity: {
        Row: {
          address: string | null
          amenities: string[] | null
          base_price_kobo: number | null
          blocks: Json | null
          booking_mode: Database["public"]["Enums"]["booking_mode"] | null
          capacity: number | null
          capacity_booked: number | null
          category_id: string | null
          checked_in_count: number | null
          city: string | null
          compliance: Json | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_min: number | null
          health_score: number | null
          host_id: string | null
          id: string | null
          lat: number | null
          listing_type: Database["public"]["Enums"]["listing_type"] | null
          lng: number | null
          metadata: Json | null
          search_tsv: unknown
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trove_generate_slug: { Args: { input: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      booking_mode: "event" | "reservation" | "slot" | "pass" | "rsvp"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "refunded"
      host_type: "venue" | "organiser" | "experience" | "accommodation"
      kyc_status: "pending" | "submitted" | "verified" | "rejected"
      ledger_kind: "charge" | "fee" | "payout" | "refund" | "adjustment"
      listing_status: "draft" | "live" | "paused" | "archived"
      listing_type: "venue" | "event" | "experience" | "accommodation"
      payout_status: "pending" | "processing" | "paid" | "failed"
      ticket_status: "valid" | "used" | "voided"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_mode: ["event", "reservation", "slot", "pass", "rsvp"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
      ],
      host_type: ["venue", "organiser", "experience", "accommodation"],
      kyc_status: ["pending", "submitted", "verified", "rejected"],
      ledger_kind: ["charge", "fee", "payout", "refund", "adjustment"],
      listing_status: ["draft", "live", "paused", "archived"],
      listing_type: ["venue", "event", "experience", "accommodation"],
      payout_status: ["pending", "processing", "paid", "failed"],
      ticket_status: ["valid", "used", "voided"],
    },
  },
} as const
