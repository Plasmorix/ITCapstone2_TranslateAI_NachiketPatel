import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

const SUPABASE_URL = "https://dielckoebfrbzyoypibo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZWxja29lYmZyYnp5b3lwaWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDUyNDYsImV4cCI6MjA3NjgyMTI0Nn0.S0VHFFkobtpormSDy3kPFuedNJE7EiA3D1WHX5Y8m-c";

const customStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: customStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
  }
});