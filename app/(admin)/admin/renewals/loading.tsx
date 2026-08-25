import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RenewalsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
