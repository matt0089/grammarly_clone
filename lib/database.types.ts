export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: string
          user_id: string
          workspace_id: string
          created_at: string
          updated_at: string
          file_type: string
          document_type: string | null
          document_goal: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          user_id: string
          workspace_id: string
          created_at?: string
          updated_at?: string
          file_type?: string
          document_type?: string | null
          document_goal?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          user_id?: string
          workspace_id?: string
          created_at?: string
          updated_at?: string
          file_type?: string
          document_type?: string | null
          document_goal?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
