import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jkofovrheflgwzzlorby.supabase.co'; // ✅ your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb2ZvdnJoZWZsZ3d6emxvcmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzOTQ5MjcsImV4cCI6MjA2Nzk3MDkyN30.RU_ip4HH8ZFcKdxtC-Orp0nBEnwDBcss2q6mNu4Wr9o'; // ✅ correct anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
