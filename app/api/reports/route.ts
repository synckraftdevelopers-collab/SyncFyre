import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const reports = {
  members: { table: "members", columns: ["member_code","full_name","phone","email","status","created_at"] },
  attendance: { table: "attendance", columns: ["attendance_date","machine_user_id","entry_time","exit_time","duration_minutes","device_id"] },
  payments: { table: "payments", columns: ["amount","method","status","transaction_reference","paid_at","created_at"] },
  appointments: { table: "appointments", columns: ["provider_type","appointment_date","start_time","end_time","status","purpose"] },
  subscriptions: { table: "subscriptions", columns: ["start_date","end_date","status","price","gst_amount","total_amount"] },
} as const;
function csv(value:unknown){const text=value==null?"":String(value);return `"${text.replaceAll('"','""')}"`;}
export async function GET(request:NextRequest){const profile=await getCurrentProfile();if(!profile)return NextResponse.json({error:"Unauthorized"},{status:401});const name=request.nextUrl.searchParams.get("resource")??"members";if(!(name in reports))return NextResponse.json({error:"Unknown report"},{status:404});const config=reports[name as keyof typeof reports];const supabase=await createClient();let query=supabase.from(config.table).select(config.columns.join(","));if(profile.branch_id)query=query.eq("branch_id",profile.branch_id);const{data,error}=await query;if(error)return NextResponse.json({error:error.message},{status:400});const body=[config.columns.map(csv).join(","),...(data??[]).map(row=>config.columns.map(column=>csv((row as unknown as Record<string,unknown>)[column])).join(","))].join("\r\n");return new NextResponse(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="syncfyre-${name}-${new Date().toISOString().slice(0,10)}.csv"`}});}
