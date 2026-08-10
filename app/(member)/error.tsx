"use client";
import { PortalRouteError } from "@/components/layout/portal-route-error";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) { return <PortalRouteError label="Member" error={error} reset={reset} />; }