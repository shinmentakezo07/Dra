export default function DashboardLoading() {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/10 rounded-lg" />
            <div className="h-4 w-64 bg-white/5 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-white/10 rounded-lg" />
        </div>
  
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
          ))}
        </div>
  
        {/* Progress Section Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-white/10 rounded-lg" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5" />
            ))}
          </div>
        </div>
  
        {/* Recommended Courses Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-white/10 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white/5 rounded-xl border border-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }
