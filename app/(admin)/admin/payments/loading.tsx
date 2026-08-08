import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-5"><Skeleton className="h-10 w-48" /><div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div></div>; }
