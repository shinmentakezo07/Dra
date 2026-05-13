"use client";

export default function AdminCostPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Cost Intelligence</h1>
        <p className="mt-1 text-sm text-white/50">Usage optimization and forecasting</p>
      </div>

      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
            <svg className="h-8 w-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-white/40">Cost intelligence dashboard coming soon</p>
          <p className="mt-2 text-sm text-white/30">
            Track spending trends, identify cost-saving opportunities, and forecast
            future usage with AI-powered optimization recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
