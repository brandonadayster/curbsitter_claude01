import CheckoutButton from '@/components/CheckoutButton';

export default function DashboardPage() {
  // =========================================================================
  // PRODUCTION INJECTION TARGETS
  // Replace these placeholders with real operational IDs from your database tables
  // =========================================================================
  const REAL_SERVICE_ID = '22222222-2222-2222-2222-222222222222';
  const REAL_PROPERTY_ID = '11111111-1111-1111-1111-111111111111';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-gray-200/80 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight text-black md:text-2xl">
              CURB<span className="text-gray-400 font-normal">SITTER</span>
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              Live Network
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-500 hover:text-black transition-colors hidden sm:block">
              Support Portal
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
              B
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 md:py-12 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Core Dashboard Status Tracking */}
          <div className="lg:col-span-2 space-y-8">
            {/* Welcome Message */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                Welcome back, B.
              </h1>
              <p className="text-gray-500 mt-1 text-sm md:text-base">
                Your property tracking and premium on-demand services management.
              </p>
            </div>

            {/* Active Status Display Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Current Status</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-0.5">All Bins Secure</h3>
                </div>
                <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200">
                  Property Assured
                </span>
              </div>
              <div className="space-y-3 border-t border-gray-100 pt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Primary Residence:</span>
                  <span className="text-gray-900 font-semibold">Yavapai County Area</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Next Scheduled Route:</span>
                  <span className="text-gray-900 font-semibold">Standard Trash & Recycle Loop</span>
                </div>
              </div>
            </div>

            {/* Transaction Block / On-Demand Procurement Wrapper */}
            <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-black text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-bl-xl">
                10% Subscriber Discount Hooked Up
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Need an Extra Rollout?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Missed the municipal truck schedule or generated unexpected debris? Tap below to invoke an immediate on-demand rollout assignment.
              </p>
              <CheckoutButton 
                serviceId={REAL_SERVICE_ID} 
                propertyId={REAL_PROPERTY_ID} 
              />
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Transactions secured natively via end-to-end encrypted Stripe architecture</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Value Trust Construction Elements */}
          <div className="bg-[#FAF9F5] border border-gray-200 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-4">
              The Accountability Pipeline
            </h3>

            {/* Simulated Track-and-Trace Frame 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-900 font-bold text-xs">
                  RUNNER
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Geotagged Photo Dispatch</h4>
                  <p className="text-[11px] text-gray-400">Real-time update from field agent</p>
                </div>
              </div>
              <div className="aspect-video w-full bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-4">
                <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5h.008v.008H16.5V10.5z" />
                  <circle cx="12" cy="13.5" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-semibold text-gray-400">[Placeholder: Runner Placement Proof Verification]</span>
              </div>
            </div>

            {/* Simulated Track-and-Trace Frame 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-black text-white rounded-lg font-bold text-xs">
                  CLIENT
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Peace of Mind Interface</h4>
                  <p className="text-[11px] text-gray-400">Historical sequence and logging logs</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-gray-50 rounded border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500">Rollout Complete</span>
                  <span className="font-mono text-gray-400 text-[10px]">07/06/2026</span>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500">Return & Clean Cycle</span>
                  <span className="font-mono text-gray-400 text-[10px]">07/07/2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
