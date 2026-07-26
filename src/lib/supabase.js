import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ncoyiznqxbslbpyugnfm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LArg-QltlhnkqmyA-4d-AA_OP2mECMd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
