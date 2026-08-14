/**
 * ---------------------------------------------------------------------------
 * PROVISIONAL — hand-written to match the migrations in supabase/migrations.
 *
 * PRD MIG-08 / 43.2 say this file is generated and must never be hand-edited.
 * It is hand-written here for one reason: `supabase gen types` needs a running
 * database, and the local stack needs Docker, which is not installed on this
 * machine. Rather than leave the whole application untyped, the schema is
 * transcribed here so every query is column-checked today.
 *
 * THE MOMENT a database is reachable — local stack or a linked project — run:
 *
 *     npm run db:types
 *
 * That overwrites this file with the real generated output and restores the
 * normal rule: never hand-edit it again. Treat any difference the generator
 * produces as this file being wrong, not the database.
 * ---------------------------------------------------------------------------
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role_title: string
          positioning_line: string
          tagline: string | null
          short_bio: string | null
          long_bio_md: string | null
          location: string | null
          email_public: string | null
          phone_public: string | null
          phone_visible: boolean
          avatar_path: string | null
          avatar_alt: string | null
          og_image_path: string | null
          available_for_work: boolean
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          role_title: string
          positioning_line: string
          tagline?: string | null
          short_bio?: string | null
          long_bio_md?: string | null
          location?: string | null
          email_public?: string | null
          phone_public?: string | null
          phone_visible?: boolean
          avatar_path?: string | null
          avatar_alt?: string | null
          og_image_path?: string | null
          available_for_work?: boolean
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      site_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          is_public: boolean
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          is_public?: boolean
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>
        Relationships: []
      }

      admin_users: {
        Row: {
          user_id: string
          email: string
          display_name: string | null
          role: Database['public']['Enums']['admin_role']
          created_at: string
        }
        Insert: {
          user_id: string
          email: string
          display_name?: string | null
          role?: Database['public']['Enums']['admin_role']
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
        Relationships: []
      }

      projects: {
        Row: {
          id: string
          slug: string
          title: string
          subtitle: string | null
          summary: string
          description_md: string | null
          problem_md: string | null
          solution_md: string | null
          how_it_works_md: string | null
          architecture_md: string | null
          business_impact_md: string | null
          challenges_md: string | null
          lessons_md: string | null
          role_description: string | null
          status: Database['public']['Enums']['project_status']
          category: Database['public']['Enums']['project_category']
          publication_state: Database['public']['Enums']['publication_state']
          visibility_mode: Database['public']['Enums']['visibility_mode']
          is_featured: boolean
          sort_order: number
          started_on: string | null
          completed_on: string | null
          cover_image_path: string | null
          cover_image_alt: string | null
          github_url: string | null
          live_url: string | null
          video_url: string | null
          client_name: string | null
          client_disclosed: boolean
          confidentiality_note: string | null
          seo_title: string | null
          seo_description: string | null
          og_image_path: string | null
          view_count: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          subtitle?: string | null
          summary: string
          description_md?: string | null
          problem_md?: string | null
          solution_md?: string | null
          how_it_works_md?: string | null
          architecture_md?: string | null
          business_impact_md?: string | null
          challenges_md?: string | null
          lessons_md?: string | null
          role_description?: string | null
          status?: Database['public']['Enums']['project_status']
          category: Database['public']['Enums']['project_category']
          publication_state?: Database['public']['Enums']['publication_state']
          visibility_mode?: Database['public']['Enums']['visibility_mode']
          is_featured?: boolean
          sort_order?: number
          started_on?: string | null
          completed_on?: string | null
          cover_image_path?: string | null
          cover_image_alt?: string | null
          github_url?: string | null
          live_url?: string | null
          video_url?: string | null
          client_name?: string | null
          client_disclosed?: boolean
          confidentiality_note?: string | null
          seo_title?: string | null
          seo_description?: string | null
          og_image_path?: string | null
          view_count?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: []
      }

      project_images: {
        Row: {
          id: string
          project_id: string
          storage_path: string
          alt_text: string
          caption: string | null
          role: Database['public']['Enums']['image_role']
          width: number | null
          height: number | null
          file_size_bytes: number | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          storage_path: string
          alt_text: string
          caption?: string | null
          role?: Database['public']['Enums']['image_role']
          width?: number | null
          height?: number | null
          file_size_bytes?: number | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_images']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_images_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }

      project_pipeline_steps: {
        Row: {
          id: string
          project_id: string
          step_number: number
          label: string
          description: string | null
          tech_note: string | null
          icon_key: string | null
        }
        Insert: {
          id?: string
          project_id: string
          step_number: number
          label: string
          description?: string | null
          tech_note?: string | null
          icon_key?: string | null
        }
        Update: Partial<Database['public']['Tables']['project_pipeline_steps']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_pipeline_steps_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }

      technologies: {
        Row: {
          id: string
          name: string
          slug: string
          category: Database['public']['Enums']['tech_category']
          icon_key: string | null
          color_hex: string | null
          website_url: string | null
          sort_order: number
          published: boolean
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category: Database['public']['Enums']['tech_category']
          icon_key?: string | null
          color_hex?: string | null
          website_url?: string | null
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['technologies']['Insert']>
        Relationships: []
      }

      project_technologies: {
        Row: {
          project_id: string
          technology_id: string
          tech_role: Database['public']['Enums']['tech_role']
          sort_order: number
        }
        Insert: {
          project_id: string
          technology_id: string
          tech_role?: Database['public']['Enums']['tech_role']
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['project_technologies']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_technologies_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_technologies_technology_id_fkey'
            columns: ['technology_id']
            isOneToOne: false
            referencedRelation: 'technologies'
            referencedColumns: ['id']
          },
        ]
      }

      experience: {
        Row: {
          id: string
          company: string
          company_url: string | null
          role_title: string
          employment_type: string | null
          location: string | null
          start_date: string
          end_date: string | null
          is_current: boolean
          summary_md: string | null
          publication_state: Database['public']['Enums']['publication_state']
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company: string
          company_url?: string | null
          role_title: string
          employment_type?: string | null
          location?: string | null
          start_date: string
          end_date?: string | null
          is_current?: boolean
          summary_md?: string | null
          publication_state?: Database['public']['Enums']['publication_state']
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['experience']['Insert']>
        Relationships: []
      }

      experience_items: {
        Row: {
          id: string
          experience_id: string
          item_type: Database['public']['Enums']['experience_item_type']
          content: string
          sort_order: number
        }
        Insert: {
          id?: string
          experience_id: string
          item_type: Database['public']['Enums']['experience_item_type']
          content: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['experience_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'experience_items_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experience'
            referencedColumns: ['id']
          },
        ]
      }

      experience_technologies: {
        Row: {
          experience_id: string
          technology_id: string
          sort_order: number
        }
        Insert: {
          experience_id: string
          technology_id: string
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['experience_technologies']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'experience_technologies_experience_id_fkey'
            columns: ['experience_id']
            isOneToOne: false
            referencedRelation: 'experience'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'experience_technologies_technology_id_fkey'
            columns: ['technology_id']
            isOneToOne: false
            referencedRelation: 'technologies'
            referencedColumns: ['id']
          },
        ]
      }

      skill_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_key: string | null
          sort_order: number
          published: boolean
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_key?: string | null
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['skill_categories']['Insert']>
        Relationships: []
      }

      skills: {
        Row: {
          id: string
          category_id: string
          name: string
          slug: string
          description: string | null
          is_core: boolean
          sort_order: number
          published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          slug: string
          description?: string | null
          is_core?: boolean
          sort_order?: number
          published?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['skills']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'skills_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'skill_categories'
            referencedColumns: ['id']
          },
        ]
      }

      education: {
        Row: {
          id: string
          institution: string
          qualification: string
          field_of_study: string | null
          location: string | null
          start_date: string | null
          end_date: string | null
          status: Database['public']['Enums']['education_status']
          grade_label: string | null
          show_grade: boolean
          description: string | null
          publication_state: Database['public']['Enums']['publication_state']
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution: string
          qualification: string
          field_of_study?: string | null
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          status: Database['public']['Enums']['education_status']
          grade_label?: string | null
          show_grade?: boolean
          description?: string | null
          publication_state?: Database['public']['Enums']['publication_state']
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['education']['Insert']>
        Relationships: []
      }

      social_links: {
        Row: {
          id: string
          platform: string
          label: string
          url: string
          icon_key: string
          show_in_hero: boolean
          show_in_footer: boolean
          sort_order: number
          published: boolean
        }
        Insert: {
          id?: string
          platform: string
          label: string
          url: string
          icon_key: string
          show_in_hero?: boolean
          show_in_footer?: boolean
          sort_order?: number
          published?: boolean
        }
        Update: Partial<Database['public']['Tables']['social_links']['Insert']>
        Relationships: []
      }

      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          subject: string
          message: string
          service_type: Database['public']['Enums']['service_type']
          status: Database['public']['Enums']['message_status']
          source_page: string | null
          ip_hash: string | null
          user_agent_family: string | null
          admin_notes: string | null
          created_at: string
          read_at: string | null
          replied_at: string | null
          form_rendered_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          subject: string
          message: string
          service_type?: Database['public']['Enums']['service_type']
          status?: Database['public']['Enums']['message_status']
          source_page?: string | null
          ip_hash?: string | null
          user_agent_family?: string | null
          admin_notes?: string | null
          created_at?: string
          read_at?: string | null
          replied_at?: string | null
          form_rendered_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>
        Relationships: []
      }

      resume_versions: {
        Row: {
          id: string
          storage_path: string
          file_name: string
          version_label: string | null
          file_size_bytes: number | null
          mime_type: string
          is_published: boolean
          notes: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          file_name: string
          version_label?: string | null
          file_size_bytes?: number | null
          mime_type: string
          is_published?: boolean
          notes?: string | null
          uploaded_at?: string
        }
        Update: Partial<Database['public']['Tables']['resume_versions']['Insert']>
        Relationships: []
      }

      analytics_events: {
        Row: {
          id: string
          event_type: string
          path: string | null
          project_id: string | null
          referrer_host: string | null
          session_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          path?: string | null
          project_id?: string | null
          referrer_host?: string | null
          session_hash?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'analytics_events_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
    }

    Views: {
      v_public_projects: {
        Row: {
          id: string
          slug: string
          title: string
          subtitle: string | null
          summary: string
          status: Database['public']['Enums']['project_status']
          category: Database['public']['Enums']['project_category']
          visibility_mode: Database['public']['Enums']['visibility_mode']
          is_featured: boolean
          sort_order: number
          started_on: string | null
          completed_on: string | null
          cover_image_path: string | null
          cover_image_alt: string | null
          github_url: string | null
          live_url: string | null
          published_at: string | null
          updated_at: string
          technologies: Json
        }
        Relationships: []
      }
    }

    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      increment_project_view: {
        Args: { p_slug: string }
        Returns: undefined
      }
    }

    Enums: {
      publication_state: 'draft' | 'published' | 'archived'
      project_status: 'completed' | 'in_progress' | 'planned' | 'maintained' | 'archived'
      project_category:
        | 'ai_automation'
        | 'web_application'
        | 'business_process_automation'
        | 'data_reporting'
        | 'other'
      visibility_mode: 'full' | 'case_study_only' | 'github_only' | 'live_demo_only' | 'private'
      image_role: 'cover' | 'gallery' | 'screenshot' | 'architecture' | 'og'
      tech_category:
        | 'language'
        | 'framework'
        | 'database'
        | 'platform'
        | 'ai_service'
        | 'automation_tool'
        | 'business_tool'
        | 'devops'
        | 'other'
      tech_role: 'primary' | 'supporting'
      experience_item_type: 'responsibility' | 'achievement'
      education_status: 'completed' | 'in_progress' | 'expected'
      message_status: 'new' | 'read' | 'replied' | 'archived' | 'spam'
      service_type:
        | 'ai_automation'
        | 'web_application'
        | 'business_process_automation'
        | 'other'
      admin_role: 'owner' | 'editor'
    }

    CompositeTypes: Record<never, never>
  }
}

/* --- Convenience aliases, matching the generator's output shape ----------- */

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
