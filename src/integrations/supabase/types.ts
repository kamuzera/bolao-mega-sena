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
      concursos: {
        Row: {
          cotas_vendidas: number
          created_at: string
          data_sorteio: string
          descricao: string | null
          id: string
          max_cotas: number
          nome: string
          numero: number
          numeros_sorteados: number[] | null
          premio_total: number | null
          status: string
          updated_at: string
          valor_cota: number
        }
        Insert: {
          cotas_vendidas?: number
          created_at?: string
          data_sorteio: string
          descricao?: string | null
          id?: string
          max_cotas?: number
          nome: string
          numero: number
          numeros_sorteados?: number[] | null
          premio_total?: number | null
          status?: string
          updated_at?: string
          valor_cota?: number
        }
        Update: {
          cotas_vendidas?: number
          created_at?: string
          data_sorteio?: string
          descricao?: string | null
          id?: string
          max_cotas?: number
          nome?: string
          numero?: number
          numeros_sorteados?: number[] | null
          premio_total?: number | null
          status?: string
          updated_at?: string
          valor_cota?: number
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      configuracoes_admin: {
        Row: {
          cotas_gratuitas: number
          created_at: string
          id: string
          percentual_comissao: number
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          updated_at: string
        }
        Insert: {
          cotas_gratuitas?: number
          created_at?: string
          id?: string
          percentual_comissao?: number
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
        }
        Update: {
          cotas_gratuitas?: number
          created_at?: string
          id?: string
          percentual_comissao?: number
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          concurso_id: string
          created_at: string
          forma_pagamento: string
          id: string
          quantidade_cotas: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          concurso_id: string
          created_at?: string
          forma_pagamento?: string
          id?: string
          quantidade_cotas?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
          valor_total: number
        }
        Update: {
          concurso_id?: string
          created_at?: string
          forma_pagamento?: string
          id?: string
          quantidade_cotas?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_pagamentos_concurso"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      participacoes: {
        Row: {
          concurso_id: string
          created_at: string
          data_participacao: string
          id: string
          numeros_acertados: number | null
          numeros_escolhidos: number[]
          premiado: boolean | null
          quantidade_cotas: number
          user_id: string
          valor_premio: number | null
          valor_total: number
        }
        Insert: {
          concurso_id: string
          created_at?: string
          data_participacao?: string
          id?: string
          numeros_acertados?: number | null
          numeros_escolhidos: number[]
          premiado?: boolean | null
          quantidade_cotas?: number
          user_id: string
          valor_premio?: number | null
          valor_total: number
        }
        Update: {
          concurso_id?: string
          created_at?: string
          data_participacao?: string
          id?: string
          numeros_acertados?: number | null
          numeros_escolhidos?: number[]
          premiado?: boolean | null
          quantidade_cotas?: number
          user_id?: string
          valor_premio?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "participacoes_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome: string
          telefone?: string | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_participantes_concurso: {
        Args: { p_concurso_id: string }
        Returns: {
          id: string
          user_id: string
          concurso_id: string
          numeros_escolhidos: number[]
          quantidade_cotas: number
          valor_total: number
          data_participacao: string
          premiado: boolean | null
          valor_premio: number | null
          nome: string
          email: string
        }[]
      }
      get_stripe_config_for_edge_functions: {
        Args: Record<PropertyKey, never>
        Returns: {
          publishable_key: string
          secret_key: string
        }[]
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
