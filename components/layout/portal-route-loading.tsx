import { Skeleton } from "@/components/ui/skeleton";

export function PortalRouteLoading() {
  return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-28 rounded-xl" key={index} />)}</div><Skeleton className="h-96 rounded-xl" /></div>;
}