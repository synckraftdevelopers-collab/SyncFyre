"use client";
import { useState } from "react";
import { LoaderCircle, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncMachineButton({id,configured}:{id:string;configured:boolean}){const[pending,setPending]=useState(false);async function sync(){setPending(true);try{const response=await fetch(`/api/face-machines/${id}/sync`,{method:"POST"});const result=await response.json();if(!response.ok)throw new Error(result.error??"Connection failed");toast.success("Machine connection successful");location.reload();}catch(error){toast.error(error instanceof Error?error.message:"Connection failed");}finally{setPending(false);}}return <Button variant="outline" size="sm" disabled={!configured||pending} title={configured?"Test connection and update status":"Configure an API URL first"} onClick={sync}>{pending?<LoaderCircle className="size-4 animate-spin"/>:<RadioTower className="size-4"/>}Sync now</Button>}
