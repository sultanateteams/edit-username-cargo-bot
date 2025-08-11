// config/supabazaClient.js
import { createClient } from "@supabase/supabase-js";

// .env fayldan o‘qiladi
const supabaseUrl = "https://rujjtomajipoontpsijp.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1amp0b21hamlwb29udHBzaWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODU1MDYsImV4cCI6MjA2OTg2MTUwNn0.WBuUhZ1YlLcwPm2XDe4O0MHkLE06eMRd-PEjfnetl0E";

// Supabase client yaratish
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
