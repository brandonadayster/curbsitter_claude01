import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@14.14.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { property_id, service_id } = await req.json()

    // Safety Check: Did the frontend actually send the IDs?
    if (!property_id || !service_id) {
      throw new Error(`Missing IDs from frontend. Property: ${property_id}, Service: ${service_id}`)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 🚀 THE FIX: Use limit(1) instead of single() so the database never panics
    const { data: services, error: serviceError } = await supabaseClient
      .from('on_demand_services')
      .select('base_price_cents, name')
      .eq('id', service_id)
      .limit(1)

    if (serviceError) throw new Error(`DB Error reading service: ${serviceError.message}`)
    
    // Grab the first result safely
    const service = services?.[0]
    if (!service) throw new Error(`Service not found in catalog for ID: ${service_id}`)

    let final_price_cents = service.base_price_cents
    let discount_applied = 0

    // Safely check subscriptions using the same bulletproof limit(1) method
    const { data: subscriptions } = await supabaseClient
      .from('subscriptions')
      .select('status')
      .eq('property_id', property_id)
      .eq('status', 'active')
      .limit(1)

    const subscription = subscriptions?.[0]

    if (subscription && subscription.status === 'active') {
      discount_applied = Math.round(service.base_price_cents * 0.10)
      final_price_cents = service.base_price_cents - discount_applied
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: service.name,
              description: discount_applied > 0 ? 'Includes 10% Subscriber Discount' : 'Standard Pricing',
            },
            unit_amount: final_price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3000'}/dashboard?canceled=true`,
      client_reference_id: property_id,
      metadata: {
        service_id: service_id,
        property_id: property_id,
        base_price_cents: service.base_price_cents,
        discount_applied_cents: discount_applied
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("🔥 CRASH REASON:", error.message)
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
