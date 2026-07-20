import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { latLngToCell } from 'h3-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service key to bypass RLS for inserts
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, address, lng, lat } = body;

    // 1. Call our new Supabase RPC to check for HOA boundaries
    const { data: bucketResult, error: rpcError } = await supabase
      .rpc('assign_waitlist_bucket', {
        user_lng: lng,
        user_lat: lat
      });

    if (rpcError) throw rpcError;

    let finalBucket = bucketResult;

    // 2. The Hybrid Fallback: If they aren't in an HOA, calculate their Hex
    if (finalBucket === 'HEX_FALLBACK') {
        // Resolution 8 = roughly neighborhood-sized hexes
        const hexIndex = latLngToCell(lat, lng, 8); 
        finalBucket = `HEX_${hexIndex}`;
    }

    // 3. Save the user to the database with their assigned bucket
    const { error: insertError } = await supabase
      .from('waitlist_users') // Ensure you have this table created!
      .insert([
        { 
          email, 
          address, 
          latitude: lat, 
          longitude: lng, 
          route_bucket: finalBucket 
        }
      ]);

    if (insertError) throw insertError;

    return NextResponse.json({ 
        success: true, 
        bucket: finalBucket,
        message: "User successfully added to spatial route bucket." 
    });

  } catch (error: any) {
    console.error("Waitlist Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
