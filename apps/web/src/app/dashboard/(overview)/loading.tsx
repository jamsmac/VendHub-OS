import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="mt-3 h-7 w-20" />
            <div className="mt-2 flex items-center gap-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Line chart */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-3 w-56" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
        {/* Pie chart */}
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-3 w-56" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      </div>

      {/* Recent activity table */}
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
