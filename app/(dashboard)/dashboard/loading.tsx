import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-6"><Skeleton className="h-16 w-72"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({length:10}).map((_,i)=><Skeleton key={i} className="h-28"/>)}</div><Skeleton className="h-80"/></div>; }
