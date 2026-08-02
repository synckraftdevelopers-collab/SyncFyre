import Link from "next/link";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
export default function Unauthorized() { return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><ShieldX className="mx-auto mb-4 size-14 text-destructive"/><h1 className="text-2xl font-bold">Access denied</h1><p className="mb-6 mt-2 text-muted-foreground">Your role does not have permission to access this page.</p><Link className={buttonVariants({})} href="/dashboard">Back to dashboard</Link></div></main>; }
