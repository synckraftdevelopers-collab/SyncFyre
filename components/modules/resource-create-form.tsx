"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FormField { name: string; label: string; type?: "text"|"number"|"date"|"time"|"email"|"textarea"|"select"|"tags"; required?: boolean; options?: {label:string;value:string}[]; placeholder?: string; defaultValue?: string|number; }

export function ResourceCreateForm({ resource, fields, returnTo }: { resource: string; fields: FormField[]; returnTo: string }) {
  const router = useRouter(); const [pending,setPending]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); const form=new FormData(event.currentTarget); const payload:Record<string,unknown>={};
    for(const field of fields){const value=form.get(field.name)?.toString()??""; if(!value) continue; payload[field.name]=field.type==="number"?Number(value):field.type==="tags"?value.split(",").map(v=>v.trim()).filter(Boolean):value;}
    try { const response=await fetch(`/api/${resource}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); const result=await response.json(); if(!response.ok) throw new Error(result.error??Object.values(result.issues?.fieldErrors??{}).flat().join(", ")??"Unable to create record"); toast.success("Record created successfully"); router.push(returnTo); router.refresh(); }
    catch(error){toast.error(error instanceof Error?error.message:"Unable to create record");} finally{setPending(false);} }
  return <form onSubmit={submit} className="space-y-6"><div className="grid gap-4 md:grid-cols-2">{fields.map(field=><label key={field.name} className={`space-y-1.5 text-sm font-medium ${field.type==="textarea"?"md:col-span-2":""}`}>{field.label}{field.type==="select"?<select name={field.name} required={field.required} defaultValue={field.defaultValue??""} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select {field.label.toLowerCase()}</option>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:field.type==="textarea"?<textarea name={field.name} required={field.required} placeholder={field.placeholder} className="mt-1.5 min-h-24 w-full rounded-lg border bg-background p-3 text-sm"/>:<Input name={field.name} type={field.type==="tags"?"text":field.type??"text"} required={field.required} placeholder={field.placeholder} defaultValue={field.defaultValue}/>}</label>)}</div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>router.back()}>Cancel</Button><Button type="submit" disabled={pending}>{pending&&<LoaderCircle className="size-4 animate-spin"/>}Create</Button></div></form>;
}
