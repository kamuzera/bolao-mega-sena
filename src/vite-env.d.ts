/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SECRET_KEY: string
  readonly DATABASE_URL: string
  readonly S3_ACCESS_KEY: string
  readonly S3_SECRET_KEY: string
  readonly S3_REGION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}