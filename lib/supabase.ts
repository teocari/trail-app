import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://lbwfgfblcrxksjytvobd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxid2ZnZmJsY3J4a3NqeXR2b2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDMzMTEsImV4cCI6MjA5NjExOTMxMX0.gXkrRmOzpf5-mZKloVe9ZvRN56QTTTf5RIBr4wC_1oI'
)
