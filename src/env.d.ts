/// <reference types="astro/client" />
import type { SupabaseClient } from "@/db/supabase.client";

interface User {
  id: string;
  email?: string;
}

declare namespace App {
  interface Locals {
    user: User | null;
    supabase: SupabaseClient;
    aiProjectId?: string;
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
