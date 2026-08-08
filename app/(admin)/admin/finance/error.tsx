"use client";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error; reset: () => void }) { return <div className="grid min-h-[50vh] place-items-center p-8 text-center"><div><h2 className="mb-2 text-xl font-bold">Finance could not load</h2><p className="mb-4 text-sm text-muted-foreground">{error.message}</p><Button onClick={reset}>Try again</Button></div></div>; }
