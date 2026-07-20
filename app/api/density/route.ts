import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service key for raw SQL queries
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // This executes a PostGIS spatial join. It counts all waitlist_entries
    // where their geographic point falls inside the subdivision's polygon geometry.
    const { data, error } = await supabase.rpc('get_waitlist_density');

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
