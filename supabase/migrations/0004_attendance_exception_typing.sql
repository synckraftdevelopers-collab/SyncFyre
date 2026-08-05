begin;

create or replace function public.process_attendance_event(p_device_id text,p_machine_user_id text,p_event_at timestamptz,p_event_type public.attendance_event_type,p_external_event_id text,p_raw jsonb default null)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_machine face_machine_settings%rowtype; v_member members%rowtype; v_attendance attendance%rowtype;
begin
 select * into v_machine from face_machine_settings where device_id=p_device_id and status='active';
 if not found then raise exception 'Unknown or inactive device'; end if;
 if exists(select 1 from attendance_sync_logs where device_id=p_device_id and external_event_id=p_external_event_id) then
   insert into attendance_sync_logs(branch_id,machine_id,external_event_id,device_id,machine_user_id,event_type,event_at,status,raw_payload,exception_type)
   values(v_machine.branch_id,v_machine.id,p_external_event_id,p_device_id,p_machine_user_id,p_event_type,p_event_at,'duplicate',p_raw,'duplicate_scan')
   on conflict (device_id, external_event_id) do nothing;
   return jsonb_build_object('status','duplicate');
 end if;
 select * into v_member from members where branch_id=v_machine.branch_id and machine_user_id=p_machine_user_id and status='active';
 if not found then
   insert into attendance_sync_logs(branch_id,machine_id,external_event_id,device_id,machine_user_id,event_type,event_at,status,raw_payload,exception_type)
   values(v_machine.branch_id,v_machine.id,p_external_event_id,p_device_id,p_machine_user_id,p_event_type,p_event_at,'unmatched',p_raw,'member_not_found');
   return jsonb_build_object('status','unmatched');
 end if;
 insert into attendance(member_id,branch_id,device_id,machine_user_id,attendance_date,entry_time,exit_time)
 values(v_member.id,v_member.branch_id,p_device_id,p_machine_user_id,(p_event_at at time zone 'Asia/Kolkata')::date,case when p_event_type='entry' then p_event_at end,case when p_event_type='exit' then p_event_at end)
 on conflict(member_id,attendance_date) do update set entry_time=case when p_event_type='entry' then least(coalesce(attendance.entry_time,p_event_at),p_event_at) else attendance.entry_time end, exit_time=case when p_event_type='exit' then greatest(coalesce(attendance.exit_time,p_event_at),p_event_at) else attendance.exit_time end
 returning * into v_attendance;
 insert into attendance_sync_logs(branch_id,machine_id,external_event_id,device_id,machine_user_id,event_type,event_at,status,attendance_id,raw_payload) values(v_member.branch_id,v_machine.id,p_external_event_id,p_device_id,p_machine_user_id,p_event_type,p_event_at,'processed',v_attendance.id,p_raw);
 update face_machine_settings set last_sync_at=now(),connection_status='online',last_error=null where id=v_machine.id;
 return jsonb_build_object('status','processed','attendance_id',v_attendance.id);
exception when unique_violation then return jsonb_build_object('status','duplicate'); end $$;

commit;
