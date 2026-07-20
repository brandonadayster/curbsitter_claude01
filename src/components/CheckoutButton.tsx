'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CheckoutButtonProps {
  serviceId: string;
  propertyId: string;
}

export default function CheckoutButton({ serviceId, propertyId }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { service_id: serviceId, property_id: propertyId },
      });

      if (error) throw new Error(error.message);
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from the Edge Function.');
      }
    } catch (err: any) {
      console.error('Checkout pipeline failure:', err);
      alert(`Initialization failed: ${err.message || 'Check network configurations.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
        onClick={handleCheckout}
        disabled={loading}
      className="w-full bg-[#1A1A1A] text-white hover:bg-black transition-colors px-6 py-4 rounded-xl font-bold text-base md:text-lg shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Securing Stripe Session...</span>
        </>
      ) : (
        'Order On-Demand Rollout'
      )}
    </button>
  );
}
