import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PhaseLocked({
  featureName,
  requiredPhase,
  currentPhase,
  message,
}: {
  featureName: string;
  requiredPhase: string;
  currentPhase: string;
  message?: string;
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-10">
      <Card className="w-full max-w-xl border-dashed bg-gradient-to-br from-background via-background to-muted/25 shadow-xl">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="size-8" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Feature Locked</p>
            <h1 className="text-2xl font-bold">{featureName}</h1>
            <p className="text-sm text-muted-foreground">
              {featureName} is part of {requiredPhase}. The current system phase is {currentPhase}.
            </p>
            <p className="text-sm text-muted-foreground">
              {message ?? `This feature will become available when ${requiredPhase} is activated.`}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
              <ArrowLeft className="size-4" />
              Go to Dashboard
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "default" }))}>
              Open Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
