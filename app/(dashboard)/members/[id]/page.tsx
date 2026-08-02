import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, calculateBmi } from "@/lib/utils";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient(); const { data: member } = await supabase.from("members").select("*").eq("id", (await params).id).single(); if (!member) notFound();
  const details = [["Phone",member.phone],["Email",member.email ?? "—"],["Gender",member.gender ?? "—"],["Age",member.date_of_birth ? calculateAge(member.date_of_birth) : "—"],["Height",member.height_cm ? `${member.height_cm} cm` : "—"],["Weight",member.weight_kg ? `${member.weight_kg} kg` : "—"],["BMI",calculateBmi(member.height_cm,member.weight_kg) ?? "—"],["Blood group",member.blood_group ?? "—"],["Fitness goal",member.fitness_goal ?? "—"],["Medical conditions",member.medical_conditions ?? "—"]] as const;
  return <div className="mx-auto max-w-4xl space-y-5"><Link href="/members" className={buttonVariants({variant:"ghost"})}><ArrowLeft className="size-4"/>Members</Link><Card><CardHeader className="flex-row items-center gap-4"><div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><UserRound/></div><div><CardTitle className="text-xl">{member.full_name}</CardTitle><p className="text-sm text-muted-foreground">{member.member_code}</p></div><Badge className="ml-auto" variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge></CardHeader><CardContent className="grid gap-5 border-t pt-5 sm:grid-cols-2">{details.map(([label,value]) => <div key={label}><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}</CardContent></Card></div>;
}
