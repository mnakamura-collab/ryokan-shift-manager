import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yyqdoofpkfjahhsqicgq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cWRvb2Zwa2ZqYWhoc3FpY2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3MDAsImV4cCI6MjA3NzMxMzcwMH0.R7T0tXsgIl-QZLE-z2R4tTEaISL2s9J3RzOa77cWTe4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
