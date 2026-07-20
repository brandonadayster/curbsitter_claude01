import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Fetch the polygons (calling the function we created)
    const { data: boundaries, error: bError } = await supabase.rpc('get_boundary_geojson');
    
    // 2. Fetch the density counts
    // NOTE: If you don't have an ID column, this might need to group by subdivision_name
    const { data: counts, error: cError } = await supabase.rpc('get_waitlist_density');
    
    if (bError || cError) throw bError || cError;

    // 3. Combine the data
    const featuresWithData = boundaries.features.map((feature: any) => {
        // Find the match. If your DB uses 'subdivision_name' instead of 'id', adjust this line.
        const match = counts.find((c: any) => c.subdivision_name === feature.properties.subdivision_name);
        return {
            ...feature,
            properties: { 
                ...feature.properties, 
                waitlist_count: match?.waitlist_count || 0 
            }
        };
    });

    return NextResponse.json({ type: 'FeatureCollection', features: featuresWithData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
