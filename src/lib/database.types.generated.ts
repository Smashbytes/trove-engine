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
          custom_answers: Json
          delivery_fee_kobo: number
          delivery_method: string
          escrow_completed_at: string | null
          escrow_started_at: string | null
          escrow_status: string
          fee_kobo: number
          guest_id: string
          guest_phone: string | null
          id: string
          listing_id: string
          party_size: number
          payout_kobo: number
          paystack_reference: string | null
          paystack_split_code: string | null
          pending_expires_at: string | null
          refunded_at: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo: number
          terms_accepted_at: string | null
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
          custom_answers?: Json
          delivery_fee_kobo?: number
          delivery_method?: string
          escrow_completed_at?: string | null
          escrow_started_at?: string | null
          escrow_status?: string
          fee_kobo?: number
          guest_id: string
          guest_phone?: string | null
          id?: string
          listing_id: string
          party_size?: number
          payout_kobo?: number
          paystack_reference?: string | null
          paystack_split_code?: string | null
          pending_expires_at?: string | null
          refunded_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo?: number
          terms_accepted_at?: string | null
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
          custom_answers?: Json
          delivery_fee_kobo?: number
          delivery_method?: string
          escrow_completed_at?: string | null
          escrow_started_at?: string | null
          escrow_status?: string
          fee_kobo?: number
          guest_id?: string
          guest_phone?: string | null
          id?: string
          listing_id?: string
          party_size?: number
          payout_kobo?: number
          paystack_reference?: string | null
          paystack_split_code?: string | null
          pending_expires_at?: string | null
          refunded_at?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kobo?: number
          terms_accepted_at?: string | null
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
            foreignKeyName: "follows_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
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
      friend_group_members: {
        Row: {
          created_at: string
          group_id: string
          invited_by: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          invited_by?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          invited_by?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_private: boolean
          listed: boolean
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          listed?: boolean
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          listed?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string
          requested_by: string
          status: Database["public"]["Enums"]["friend_status"]
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["friend_status"]
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["friend_status"]
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_notes: {
        Row: {
          body: string
          created_at: string
          guest_id: string
          host_id: string
          id: string
        }
        Insert: {
          body: string
          created_at?: string
          guest_id: string
          host_id: string
          id?: string
        }
        Update: {
          body?: string
          created_at?: string
          guest_id?: string
          host_id?: string
          id?: string
        }
        Relationships: []
      }
      host_profiles: {
        Row: {
          address: string | null
          address_number: string | null
          bank_account_verified: boolean
          bank_resolved_name: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          hero_url: string | null
          host_type: Database["public"]["Enums"]["host_type"]
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          lat: number | null
          lng: number | null
          location_json: Json
          location_place_id: string | null
          notification_prefs: Json
          payout_bank_json: Json | null
          payouts_frozen: boolean
          payouts_frozen_at: string | null
          payouts_paused: boolean
          paystack_recipient_code: string | null
          paystack_subaccount_code: string | null
          response_rate: number
          slug: string
          social_links: Json
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          tradesafe_account_type: string | null
          tradesafe_bank_last4: string | null
          tradesafe_bank_name: string | null
          tradesafe_last_error: string | null
          tradesafe_ready_at: string | null
          tradesafe_status: string
          tradesafe_token_created_at: string | null
          tradesafe_token_fingerprint: string | null
          tradesafe_token_id: string | null
          tradesafe_verified: boolean
          tradesafe_verified_at: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          whatsapp_number: string | null
          whatsapp_verified_at: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          bank_account_verified?: boolean
          bank_resolved_name?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          hero_url?: string | null
          host_type: Database["public"]["Enums"]["host_type"]
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lat?: number | null
          lng?: number | null
          location_json?: Json
          location_place_id?: string | null
          notification_prefs?: Json
          payout_bank_json?: Json | null
          payouts_frozen?: boolean
          payouts_frozen_at?: string | null
          payouts_paused?: boolean
          paystack_recipient_code?: string | null
          paystack_subaccount_code?: string | null
          response_rate?: number
          slug: string
          social_links?: Json
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          tradesafe_account_type?: string | null
          tradesafe_bank_last4?: string | null
          tradesafe_bank_name?: string | null
          tradesafe_last_error?: string | null
          tradesafe_ready_at?: string | null
          tradesafe_status?: string
          tradesafe_token_created_at?: string | null
          tradesafe_token_fingerprint?: string | null
          tradesafe_token_id?: string | null
          tradesafe_verified?: boolean
          tradesafe_verified_at?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          whatsapp_number?: string | null
          whatsapp_verified_at?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          bank_account_verified?: boolean
          bank_resolved_name?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          hero_url?: string | null
          host_type?: Database["public"]["Enums"]["host_type"]
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lat?: number | null
          lng?: number | null
          location_json?: Json
          location_place_id?: string | null
          notification_prefs?: Json
          payout_bank_json?: Json | null
          payouts_frozen?: boolean
          payouts_frozen_at?: string | null
          payouts_paused?: boolean
          paystack_recipient_code?: string | null
          paystack_subaccount_code?: string | null
          response_rate?: number
          slug?: string
          social_links?: Json
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          tradesafe_account_type?: string | null
          tradesafe_bank_last4?: string | null
          tradesafe_bank_name?: string | null
          tradesafe_last_error?: string | null
          tradesafe_ready_at?: string | null
          tradesafe_status?: string
          tradesafe_token_created_at?: string | null
          tradesafe_token_fingerprint?: string | null
          tradesafe_token_id?: string | null
          tradesafe_verified?: boolean
          tradesafe_verified_at?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          whatsapp_number?: string | null
          whatsapp_verified_at?: string | null
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
      host_team_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          host_id: string
          id: string
          invited_by: string | null
          permissions: string[]
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string
          host_id: string
          id?: string
          invited_by?: string | null
          permissions?: string[]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invite_status"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          host_id?: string
          id?: string
          invited_by?: string | null
          permissions?: string[]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_team_invites_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "host_team_invites_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      host_team_members: {
        Row: {
          created_at: string
          department: string | null
          host_id: string
          id: string
          invited_by: string | null
          member_user_id: string
          permissions: string[]
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_member_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          host_id: string
          id?: string
          invited_by?: string | null
          member_user_id: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_member_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          host_id?: string
          id?: string
          invited_by?: string | null
          member_user_id?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_team_members_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "host_team_members_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "host_team_members_member_user_id_fkey"
            columns: ["member_user_id"]
            isOneToOne: false
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
      hq_users: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kb_articles: {
        Row: {
          body_md: string
          category: string | null
          created_at: string
          id: string
          section: string
          slug: string
          sort_order: number
          source_path: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_md: string
          category?: string | null
          created_at?: string
          id?: string
          section: string
          slug: string
          sort_order?: number
          source_path?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_md?: string
          category?: string | null
          created_at?: string
          id?: string
          section?: string
          slug?: string
          sort_order?: number
          source_path?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_revisions: {
        Row: {
          article_id: string
          body_md: string
          created_at: string
          id: string
          title: string
          updated_by: string | null
        }
        Insert: {
          article_id: string
          body_md: string
          created_at?: string
          id?: string
          title: string
          updated_by?: string | null
        }
        Update: {
          article_id?: string
          body_md?: string
          created_at?: string
          id?: string
          title?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          host_id: string
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          host_id: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          host_id?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "kyc_documents_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
            referencedColumns: ["user_id"]
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
          payout_id: string | null
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
          payout_id?: string | null
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
          payout_id?: string | null
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
          {
            foreignKeyName: "ledger_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
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
          custom_questions: Json
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
          custom_questions?: Json
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
          custom_questions?: Json
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
          {
            foreignKeyName: "listings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          created_at: string
          dedupe_key: string | null
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          audience?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          audience?: string
          created_at?: string
          dedupe_key?: string | null
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
      payment_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string
          id: string
          idempotency_key: string | null
          payload: Json
          payload_hash: string | null
          processed_at: string | null
          provider: string
          provider_state_timestamp: string | null
          reconciliation_status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          provider_state_timestamp?: string | null
          reconciliation_status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          provider_state_timestamp?: string | null
          reconciliation_status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          agent_token_id: string | null
          amount_kobo: number
          booking_id: string
          buyer_token_id: string | null
          checkout_expires_at: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          delivery_at: string | null
          disputed_at: string | null
          funds_received_at: string | null
          id: string
          metadata: Json
          provider: string
          provider_allocation_id: string | null
          provider_reference: string
          provider_state: string | null
          provider_transaction_id: string | null
          released_at: string | null
          seller_payout_kobo: number
          seller_token_id: string | null
          status: string
          tradesafe_fee_kobo: number
          trove_commission_kobo: number
          updated_at: string
        }
        Insert: {
          agent_token_id?: string | null
          amount_kobo: number
          booking_id: string
          buyer_token_id?: string | null
          checkout_expires_at?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delivery_at?: string | null
          disputed_at?: string | null
          funds_received_at?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_allocation_id?: string | null
          provider_reference: string
          provider_state?: string | null
          provider_transaction_id?: string | null
          released_at?: string | null
          seller_payout_kobo?: number
          seller_token_id?: string | null
          status?: string
          tradesafe_fee_kobo?: number
          trove_commission_kobo?: number
          updated_at?: string
        }
        Update: {
          agent_token_id?: string | null
          amount_kobo?: number
          booking_id?: string
          buyer_token_id?: string | null
          checkout_expires_at?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delivery_at?: string | null
          disputed_at?: string | null
          funds_received_at?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_allocation_id?: string | null
          provider_reference?: string
          provider_state?: string | null
          provider_transaction_id?: string | null
          released_at?: string | null
          seller_payout_kobo?: number
          seller_token_id?: string | null
          status?: string
          tradesafe_fee_kobo?: number
          trove_commission_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_kobo: number
          created_at: string
          failure_reason: string | null
          host_id: string
          id: string
          paystack_recipient_code: string | null
          paystack_status: string | null
          paystack_transfer_code: string | null
          paystack_transfer_reference: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string | null
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          failure_reason?: string | null
          host_id: string
          id?: string
          paystack_recipient_code?: string | null
          paystack_status?: string | null
          paystack_transfer_code?: string | null
          paystack_transfer_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string | null
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          failure_reason?: string | null
          host_id?: string
          id?: string
          paystack_recipient_code?: string | null
          paystack_status?: string | null
          paystack_transfer_code?: string | null
          paystack_transfer_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
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
          city: string | null
          created_at: string
          discoverable: boolean
          friends_going_optin: boolean
          full_name: string | null
          id: string
          is_admin: boolean
          is_host: boolean
          is_private: boolean
          paystack_customer_code: string | null
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean
          friends_going_optin?: boolean
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_host?: boolean
          is_private?: boolean
          paystack_customer_code?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean
          friends_going_optin?: boolean
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_host?: boolean
          is_private?: boolean
          paystack_customer_code?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amendment_id: string | null
          amount_kobo: number
          approved_by: string | null
          booking_id: string
          created_at: string
          id: string
          payment_id: string
          provider_payload: Json | null
          provider_reference: string | null
          provider_state: string | null
          reason: string | null
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amendment_id?: string | null
          amount_kobo: number
          approved_by?: string | null
          booking_id: string
          created_at?: string
          id?: string
          payment_id: string
          provider_payload?: Json | null
          provider_reference?: string | null
          provider_state?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amendment_id?: string | null
          amount_kobo?: number
          approved_by?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          provider_payload?: Json | null
          provider_reference?: string | null
          provider_state?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "reviews_of_host_fkey"
            columns: ["of_host"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
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
      share_link_clicks: {
        Row: {
          clicked_at: string
          id: number
          is_bot: boolean
          link_id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: never
          is_bot?: boolean
          link_id: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: never
          is_bot?: boolean
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_link_conversions: {
        Row: {
          attributed_at: string
          booking_id: string
          link_id: string
        }
        Insert: {
          attributed_at?: string
          booking_id: string
          link_id: string
        }
        Update: {
          attributed_at?: string
          booking_id?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_link_conversions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_link_conversions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          channel: string
          clicks: number
          code: string
          created_at: string
          created_by: string
          host_id: string
          id: string
          kind: string
          last_clicked_at: string | null
          listing_id: string
        }
        Insert: {
          channel?: string
          clicks?: number
          code: string
          created_at?: string
          created_by: string
          host_id: string
          id?: string
          kind: string
          last_clicked_at?: string | null
          listing_id: string
        }
        Update: {
          channel?: string
          clicks?: number
          code?: string
          created_at?: string
          created_by?: string
          host_id?: string
          id?: string
          kind?: string
          last_clicked_at?: string | null
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bills: {
        Row: {
          booking_id: string | null
          created_at: string
          fee_per_share_kobo: number
          id: string
          initiator_id: string
          listing_id: string
          provider: string
          qty: number
          status: Database["public"]["Enums"]["split_status"]
          ticket_total_kobo: number
          tradesafe_status: string
          tradesafe_transaction_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          fee_per_share_kobo?: number
          id?: string
          initiator_id: string
          listing_id: string
          provider?: string
          qty: number
          status?: Database["public"]["Enums"]["split_status"]
          ticket_total_kobo: number
          tradesafe_status?: string
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          fee_per_share_kobo?: number
          id?: string
          initiator_id?: string
          listing_id?: string
          provider?: string
          qty?: number
          status?: Database["public"]["Enums"]["split_status"]
          ticket_total_kobo?: number
          tradesafe_status?: string
          tradesafe_transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_bills_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_bills_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_capacity"
            referencedColumns: ["id"]
          },
        ]
      }
      split_shares: {
        Row: {
          agreed_at: string | null
          created_at: string
          fee_kobo: number
          id: string
          paid_at: string | null
          paystack_reference: string | null
          provider: string
          responded_at: string | null
          share_kobo: number
          split_id: string
          status: Database["public"]["Enums"]["split_share_status"]
          tradesafe_token_id: string | null
          tradesafe_wallet_deposit_id: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string | null
          created_at?: string
          fee_kobo?: number
          id?: string
          paid_at?: string | null
          paystack_reference?: string | null
          provider?: string
          responded_at?: string | null
          share_kobo: number
          split_id: string
          status?: Database["public"]["Enums"]["split_share_status"]
          tradesafe_token_id?: string | null
          tradesafe_wallet_deposit_id?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string | null
          created_at?: string
          fee_kobo?: number
          id?: string
          paid_at?: string | null
          paystack_reference?: string | null
          provider?: string
          responded_at?: string | null
          share_kobo?: number
          split_id?: string
          status?: Database["public"]["Enums"]["split_share_status"]
          tradesafe_token_id?: string | null
          tradesafe_wallet_deposit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_shares_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "split_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_notes: {
        Row: {
          attachment_urls: string[]
          author_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachment_urls?: string[]
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachment_urls?: string[]
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
          attachment_urls: string[]
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
          attachment_urls?: string[]
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
          attachment_urls?: string[]
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
      tradesafe_disputes: {
        Row: {
          allocation_id: string
          booking_id: string
          created_at: string
          evidence: Json
          id: string
          opened_by: string
          payment_id: string
          provider_state: string | null
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allocation_id: string
          booking_id: string
          created_at?: string
          evidence?: Json
          id?: string
          opened_by: string
          payment_id: string
          provider_state?: string | null
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocation_id?: string
          booking_id?: string
          created_at?: string
          evidence?: Json
          id?: string
          opened_by?: string
          payment_id?: string
          provider_state?: string | null
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tradesafe_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesafe_disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesafe_disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesafe_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tradesafe_tokens: {
        Row: {
          account_type: string | null
          bank_last4: string | null
          bank_name: string | null
          created_at: string
          id: string
          metadata: Json
          owner_user_id: string
          provider_reference: string | null
          replaced_by: string | null
          status: string
          token_id: string
          token_name: string | null
          token_role: string
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id: string
          provider_reference?: string | null
          replaced_by?: string | null
          status?: string
          token_id: string
          token_name?: string | null
          token_role: string
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          bank_last4?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          provider_reference?: string | null
          replaced_by?: string | null
          status?: string
          token_id?: string
          token_name?: string | null
          token_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tradesafe_tokens_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesafe_tokens_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "tradesafe_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_verifications: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      willow_alert_rules: {
        Row: {
          comparison: string
          created_at: string
          description: string | null
          enabled: boolean
          id: number
          name: string
          notification_channels: string[]
          query_sql: string
          severity: string
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          comparison: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          name: string
          notification_channels?: string[]
          query_sql: string
          severity?: string
          threshold: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          comparison?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          name?: string
          notification_channels?: string[]
          query_sql?: string
          severity?: string
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      willow_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          error_message: string | null
          id: number
          payload: Json
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          payload?: Json
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          payload?: Json
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      willow_cost_snapshots: {
        Row: {
          app: string | null
          captured_at: string
          cost_zar_cents: number | null
          id: number
          metadata: Json | null
          metric: string
          service: string
          unit: string
          value: number
        }
        Insert: {
          app?: string | null
          captured_at?: string
          cost_zar_cents?: number | null
          id?: number
          metadata?: Json | null
          metric: string
          service: string
          unit: string
          value: number
        }
        Update: {
          app?: string | null
          captured_at?: string
          cost_zar_cents?: number | null
          id?: number
          metadata?: Json | null
          metric?: string
          service?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      willow_deployments: {
        Row: {
          app: string
          cf_deployment_id: string | null
          commit_sha: string
          created_at: string
          deployed_by: string | null
          environment: string
          gh_run_id: number | null
          id: number
          preview_url: string | null
          rollback_from_id: number | null
          status: string
        }
        Insert: {
          app: string
          cf_deployment_id?: string | null
          commit_sha: string
          created_at?: string
          deployed_by?: string | null
          environment?: string
          gh_run_id?: number | null
          id?: number
          preview_url?: string | null
          rollback_from_id?: number | null
          status?: string
        }
        Update: {
          app?: string
          cf_deployment_id?: string | null
          commit_sha?: string
          created_at?: string
          deployed_by?: string | null
          environment?: string
          gh_run_id?: number | null
          id?: number
          preview_url?: string | null
          rollback_from_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "willow_deployments_rollback_from_id_fkey"
            columns: ["rollback_from_id"]
            isOneToOne: false
            referencedRelation: "willow_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "willow_deployments_rollback_from_id_fkey"
            columns: ["rollback_from_id"]
            isOneToOne: false
            referencedRelation: "willow_latest_deployments"
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
          {
            foreignKeyName: "listings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_host_profiles: {
        Row: {
          address: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          hero_url: string | null
          host_type: Database["public"]["Enums"]["host_type"] | null
          lat: number | null
          lng: number | null
          response_rate: number | null
          slug: string | null
          social_links: Json | null
          user_id: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          hero_url?: string | null
          host_type?: Database["public"]["Enums"]["host_type"] | null
          lat?: number | null
          lng?: number | null
          response_rate?: number | null
          slug?: string | null
          social_links?: Json | null
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          hero_url?: string | null
          host_type?: Database["public"]["Enums"]["host_type"] | null
          lat?: number | null
          lng?: number | null
          response_rate?: number | null
          slug?: string | null
          social_links?: Json | null
          user_id?: string | null
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
      willow_active_alerts: {
        Row: {
          comparison: string | null
          created_at: string | null
          description: string | null
          id: number | null
          name: string | null
          notification_channels: string[] | null
          query_sql: string | null
          severity: string | null
          threshold: number | null
          updated_at: string | null
          window_minutes: number | null
        }
        Insert: {
          comparison?: string | null
          created_at?: string | null
          description?: string | null
          id?: number | null
          name?: string | null
          notification_channels?: string[] | null
          query_sql?: string | null
          severity?: string | null
          threshold?: number | null
          updated_at?: string | null
          window_minutes?: number | null
        }
        Update: {
          comparison?: string | null
          created_at?: string | null
          description?: string | null
          id?: number | null
          name?: string | null
          notification_channels?: string[] | null
          query_sql?: string | null
          severity?: string | null
          threshold?: number | null
          updated_at?: string | null
          window_minutes?: number | null
        }
        Relationships: []
      }
      willow_audit_summary_7d: {
        Row: {
          action: string | null
          count: number | null
          first_occurrence: string | null
          last_occurrence: string | null
          status: string | null
          target_type: string | null
        }
        Relationships: []
      }
      willow_cost_summary_30d: {
        Row: {
          app: string | null
          period_end: string | null
          period_start: string | null
          service: string | null
          snapshot_count: number | null
          total_cost_zar_cents: number | null
        }
        Relationships: []
      }
      willow_latest_deployments: {
        Row: {
          app: string | null
          cf_deployment_id: string | null
          commit_sha: string | null
          created_at: string | null
          deployed_by: string | null
          environment: string | null
          gh_run_id: number | null
          id: number | null
          preview_url: string | null
          rollback_from_id: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "willow_deployments_rollback_from_id_fkey"
            columns: ["rollback_from_id"]
            isOneToOne: false
            referencedRelation: "willow_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "willow_deployments_rollback_from_id_fkey"
            columns: ["rollback_from_id"]
            isOneToOne: false
            referencedRelation: "willow_latest_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_team_invite: { Args: { p_token: string }; Returns: string }
      attribute_booking_share: {
        Args: { p_booking_id: string; p_code: string }
        Returns: boolean
      }
      discover_groups: {
        Args: { p_query?: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_private: boolean
          member_count: number
          my_status: string
          name: string
          owner_id: string
          owner_name: string
        }[]
      }
      expire_stale_pending_bookings: { Args: never; Returns: number }
      expire_stale_splits: { Args: never; Returns: number }
      find_guest_by_email: {
        Args: { p_email: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      find_guest_by_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      fmt_rand: { Args: { p_cents: number }; Returns: string }
      friends_close_by: {
        Args: { p_everywhere?: boolean }
        Returns: {
          avatar_url: string
          city: string
          full_name: string
          id: string
          mutual_count: number
          username: string
        }[]
      }
      friends_going: {
        Args: { p_listing_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      generate_payout_batches: {
        Args: never
        Returns: {
          amount_kobo: number
          host_id: string
          payout_id: string
        }[]
      }
      get_share_link: {
        Args: { p_channel?: string; p_kind?: string; p_listing_id: string }
        Returns: {
          channel: string
          clicks: number
          code: string
          created_at: string
          created_by: string
          host_id: string
          id: string
          kind: string
          last_clicked_at: string | null
          listing_id: string
        }
        SetofOptions: {
          from: "*"
          to: "share_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      group_is_public: { Args: { p_group: string }; Returns: boolean }
      group_members: {
        Args: { p_group: string }
        Returns: {
          avatar_url: string
          full_name: string
          role: string
          status: string
          user_id: string
          username: string
        }[]
      }
      guest_display_name: { Args: { p_user: string }; Returns: string }
      host_audience_profiles: {
        Args: { p_host_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      host_team_roster: {
        Args: { p_host_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          department: string
          full_name: string
          id: string
          member_user_id: string
          permissions: string[]
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_member_status"]
        }[]
      }
      invite_to_group: {
        Args: { p_group: string; p_user: string }
        Returns: undefined
      }
      is_group_associate: { Args: { p_group: string }; Returns: boolean }
      is_group_member: { Args: { p_group: string }; Returns: boolean }
      is_group_owner: { Args: { p_group: string }; Returns: boolean }
      is_hq_admin: { Args: never; Returns: boolean }
      is_split_participant: { Args: { p_split: string }; Returns: boolean }
      my_friends: {
        Args: never
        Returns: {
          avatar_url: string
          friend_id: string
          full_name: string
          requested_by: string
          status: Database["public"]["Enums"]["friend_status"]
          username: string
        }[]
      }
      my_groups: {
        Args: never
        Returns: {
          description: string
          id: string
          is_private: boolean
          listed: boolean
          member_count: number
          my_role: string
          my_status: string
          name: string
          owner_id: string
        }[]
      }
      my_split_inbox: {
        Args: never
        Returns: {
          booking_id: string
          created_at: string
          fee_kobo: number
          initiator_id: string
          initiator_name: string
          listing_id: string
          listing_title: string
          my_status: Database["public"]["Enums"]["split_share_status"]
          qty: number
          share_id: string
          share_kobo: number
          split_id: string
          split_status: Database["public"]["Enums"]["split_status"]
          ticket_total_kobo: number
        }[]
      }
      notify_user: {
        Args: {
          p_dedupe?: string
          p_message: string
          p_payload?: Json
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: string
      }
      record_share_click: {
        Args: {
          p_code: string
          p_is_bot?: boolean
          p_referrer?: string
          p_user_agent?: string
        }
        Returns: {
          channel: string
          kind: string
          listing_id: string
        }[]
      }
      reserve_booking: {
        Args: {
          p_attested_age?: boolean
          p_guest_id: string
          p_listing_id: string
          p_party_size: number
          p_slot_id: string
          p_ticket_type_id: string
          p_total_kobo: number
        }
        Returns: string
      }
      search_guests: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          city: string
          full_name: string
          id: string
          link_status: Database["public"]["Enums"]["friend_status"]
          requested_by: string
          username: string
        }[]
      }
      send_booking_reminders: { Args: never; Returns: number }
      send_split_reminders: { Args: never; Returns: number }
      share_link_stats: {
        Args: { p_host_id: string; p_listing_id?: string }
        Returns: {
          bookings: number
          channel: string
          clicks: number
          code: string
          created_at: string
          created_by: string
          kind: string
          last_clicked_at: string
          link_id: string
          listing_id: string
          listing_title: string
          sales_kobo: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      split_participants: {
        Args: { p_split: string }
        Returns: {
          avatar_url: string
          fee_kobo: number
          full_name: string
          is_initiator: boolean
          share_id: string
          share_kobo: number
          status: Database["public"]["Enums"]["split_share_status"]
          user_id: string
          username: string
        }[]
      }
      submit_host_verification: {
        Args: {
          p_host_id: string
          p_legal_name: string
          p_registration: string
        }
        Returns: undefined
      }
      team_can: { Args: { host: string; perm: string }; Returns: boolean }
      team_host_ids: { Args: never; Returns: string[] }
      trove_generate_slug: { Args: { input: string }; Returns: string }
      trove_invoke_job: { Args: { p_function_name: string }; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      booking_mode: "event" | "reservation" | "slot" | "pass" | "rsvp"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "refunded"
        | "pending_payment"
        | "payment_failed"
        | "refund_requested"
        | "refund_processing"
        | "partially_refunded"
        | "no_show"
      friend_status: "pending" | "accepted" | "declined"
      host_type: "venue" | "organiser" | "experience" | "accommodation"
      kyc_status: "pending" | "submitted" | "verified" | "rejected"
      ledger_kind:
        | "charge"
        | "fee"
        | "payout"
        | "refund"
        | "adjustment"
        | "host_credit"
        | "refund_reversal"
        | "platform_fee"
      listing_status: "draft" | "live" | "paused" | "archived"
      listing_type: "venue" | "event" | "experience" | "accommodation"
      payout_status: "pending" | "processing" | "paid" | "failed"
      split_share_status: "pending" | "accepted" | "declined" | "paid"
      split_status:
        | "pending"
        | "ready"
        | "completed"
        | "declined"
        | "cancelled"
        | "expired"
      team_invite_status: "pending" | "accepted" | "revoked" | "expired"
      team_member_status: "active" | "suspended"
      team_role: "admin" | "manager" | "finance" | "scanner"
      ticket_status: "valid" | "used" | "voided" | "refunded" | "transferred"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_mode: ["event", "reservation", "slot", "pass", "rsvp"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
        "pending_payment",
        "payment_failed",
        "refund_requested",
        "refund_processing",
        "partially_refunded",
        "no_show",
      ],
      friend_status: ["pending", "accepted", "declined"],
      host_type: ["venue", "organiser", "experience", "accommodation"],
      kyc_status: ["pending", "submitted", "verified", "rejected"],
      ledger_kind: [
        "charge",
        "fee",
        "payout",
        "refund",
        "adjustment",
        "host_credit",
        "refund_reversal",
        "platform_fee",
      ],
      listing_status: ["draft", "live", "paused", "archived"],
      listing_type: ["venue", "event", "experience", "accommodation"],
      payout_status: ["pending", "processing", "paid", "failed"],
      split_share_status: ["pending", "accepted", "declined", "paid"],
      split_status: [
        "pending",
        "ready",
        "completed",
        "declined",
        "cancelled",
        "expired",
      ],
      team_invite_status: ["pending", "accepted", "revoked", "expired"],
      team_member_status: ["active", "suspended"],
      team_role: ["admin", "manager", "finance", "scanner"],
      ticket_status: ["valid", "used", "voided", "refunded", "transferred"],
    },
  },
} as const
