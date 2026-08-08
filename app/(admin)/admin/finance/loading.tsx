import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></div>; }
