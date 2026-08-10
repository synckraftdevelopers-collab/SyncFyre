"use client";
import { PortalRouteError } from "@/components/layout/portal-route-error";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) { return <PortalRouteError label="Trainer" error={error} reset={reset} />; }