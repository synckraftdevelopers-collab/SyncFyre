begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.record_status as enum ('active', 'inactive');
create type public.subscription_status as enum ('pending', 'active', 'expired', 'cancelled', 'paused');
create type public.appointment_status as enum ('pending', 'approved', 'completed', 'cancelled');
create type public.payment_status as enum ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
create type public.payment_method as enum ('cash', 'upi', 'card', 'online');
create type public.notification_channel as enum ('dashboard', 'email', 'sms', 'whatsapp');
create type public.attendance_event_type as enum ('entry', 'exit');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  address text, city text, state text, postal_code text, country text not null default 'India',
  phone text, email citext, timezone text not null default 'Asia/Kolkata',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, slug text not null unique,
  description text, permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

insert into public.roles (name, slug, description, is_system) values
('Admin','admin','Full system access',true), ('Manager','manager','Branch operations and reports',true),
('Reception','reception','Members, subscriptions, payments and appointments',true), ('Trainer','trainer','Assigned members, workouts and progress',true),
('Dietician','dietician','Diet plans and appointments',true), ('Member','member','Personal member portal',true);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null default '', email citext, phone text, avatar_url text,
  status public.record_status not null default 'active', last_login_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_code text not null unique, designation text not null, joining_date date not null default current_date,
  salary numeric(12,2) not null default 0 check (salary >= 0), leave_balance numeric(5,1) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.trainers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id) on delete cascade,
  staff_id uuid unique references public.staff(id) on delete set null, branch_id uuid not null references public.branches(id) on delete restrict,
  specializations text[] not null default '{}', experience_years numeric(4,1) not null default 0 check (experience_years >= 0),
  certifications text[] not null default '{}', bio text, status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create sequence public.member_code_seq start 1001;
create table public.members (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references public.users(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete restrict,
  member_code text not null unique default ('MEM-' || lpad(nextval('public.member_code_seq')::text, 6, '0')),
  machine_user_id text, profile_photo_url text, full_name text not null,
  gender text check (gender in ('male','female','other','prefer_not_to_say')), date_of_birth date check (date_of_birth <= current_date),
  phone text not null, email citext, address text, emergency_contact_name text, emergency_contact_phone text,
  height_cm numeric(5,2) check (height_cm > 0), weight_kg numeric(6,2) check (weight_kg > 0),
  blood_group text, medical_conditions text, fitness_goal text, assigned_trainer_id uuid references public.trainers(id) on delete set null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (branch_id, machine_user_id)
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(), branch_id uuid references public.branches(id) on delete cascade,
  name text not null, price numeric(12,2) not null check (price >= 0), gst_percent numeric(5,2) not null default 18 check (gst_percent between 0 and 100),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100), duration_months integer not null check (duration_months > 0),
  features jsonb not null default '[]'::jsonb, status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique nulls not distinct (branch_id, name)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict, branch_id uuid not null references public.branches(id) on delete restrict,
  start_date date not null, end_date date not null, status public.subscription_status not null default 'pending', auto_renew boolean not null default false,
  price numeric(12,2) not null check (price >= 0), discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0), total_amount numeric(12,2) not null check (total_amount >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (end_date >= start_date)
);

create table public.subscription_history (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade, previous_end_date date, new_start_date date not null, new_end_date date not null,
  action text not null check (action in ('created','renewed','extended','paused','resumed','cancelled','expired')),
  notes text, performed_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now()
);

create table public.face_machine_settings (
  id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade,
  machine_name text not null, machine_ip inet, machine_api_url text, api_key_encrypted text, device_id text not null,
  status public.record_status not null default 'inactive', connection_status text not null default 'unknown' check (connection_status in ('unknown','online','offline','error')),
  last_sync_at timestamptz, last_error text, settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(branch_id, device_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict, device_id text not null, machine_user_id text not null,
  attendance_date date not null, entry_time timestamptz, exit_time timestamptz,
  duration_minutes integer generated always as (case when exit_time is not null and entry_time is not null then greatest(0, floor(extract(epoch from (exit_time-entry_time))/60)::integer) else null end) stored,
  source text not null default 'face_machine', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(member_id, attendance_date), check (exit_time is null or entry_time is null or exit_time >= entry_time)
);

create table public.attendance_sync_logs (
  id uuid primary key default gen_random_uuid(), machine_id uuid references public.face_machine_settings(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete cascade, external_event_id text not null, device_id text not null,
  machine_user_id text not null, event_type public.attendance_event_type not null, event_at timestamptz not null,
  status text not null check (status in ('processed','duplicate','rejected','unmatched','error')), attendance_id uuid references public.attendance(id) on delete set null,
  error_message text, raw_payload jsonb, synced_at timestamptz not null default now(), unique(device_id, external_event_id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict, provider_staff_id uuid references public.staff(id) on delete set null,
  provider_type text not null check (provider_type in ('trainer','dietician','physiotherapist')),
  appointment_date date not null, start_time time not null, end_time time not null, status public.appointment_status not null default 'pending',
  purpose text, notes text, created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (end_time > start_time)
);

create table public.trainer_assignments (
  id uuid primary key default gen_random_uuid(), trainer_id uuid not null references public.trainers(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade, assigned_from date not null default current_date, assigned_until date,
  status public.record_status not null default 'active', notes text, created_at timestamptz not null default now(), unique(trainer_id, member_id, assigned_from)
);

create table public.workout_categories (
  id uuid primary key default gen_random_uuid(), branch_id uuid references public.branches(id) on delete cascade,
  name text not null, description text, status public.record_status not null default 'active', created_at timestamptz not null default now(), unique nulls not distinct(branch_id, name)
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.workout_categories(id) on delete set null,
  member_id uuid not null references public.members(id) on delete cascade, trainer_id uuid references public.trainers(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete restrict, name text not null, exercise_name text not null,
  sets integer check (sets > 0), reps integer check (reps > 0), weight_kg numeric(6,2) check (weight_kg >= 0), cardio_minutes integer check (cardio_minutes >= 0),
  rest_seconds integer check (rest_seconds >= 0), trainer_notes text, scheduled_date date, status public.record_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null, branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null, start_date date not null, end_date date, breakfast text, lunch text, dinner text, snacks text,
  calories integer check (calories >= 0), protein_g numeric(7,2) check (protein_g >= 0), fat_g numeric(7,2) check (fat_g >= 0),
  carbs_g numeric(7,2) check (carbs_g >= 0), water_liters numeric(4,2) check (water_liters >= 0), notes text,
  status public.record_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.progress (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict, measured_at date not null default current_date,
  weight_kg numeric(6,2), bmi numeric(5,2), body_fat_percent numeric(5,2), muscle_mass_kg numeric(6,2),
  waist_cm numeric(6,2), chest_cm numeric(6,2), arms_cm numeric(6,2), legs_cm numeric(6,2),
  progress_photo_urls text[] not null default '{}', notes text, recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), unique(member_id, measured_at)
);

create sequence public.invoice_number_seq start 10001;
create table public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique default ('INV-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text,6,'0')),
  member_id uuid not null references public.members(id) on delete restrict, subscription_id uuid references public.subscriptions(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete restrict, subtotal numeric(12,2) not null check(subtotal >= 0),
  discount_amount numeric(12,2) not null default 0, gst_amount numeric(12,2) not null default 0, total_amount numeric(12,2) not null check(total_amount >= 0),
  amount_paid numeric(12,2) not null default 0, due_date date, status text not null default 'unpaid' check(status in ('unpaid','partial','paid','void')),
  line_items jsonb not null default '[]'::jsonb, notes text, created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), invoice_id uuid references public.invoices(id) on delete set null,
  member_id uuid not null references public.members(id) on delete restrict, subscription_id uuid references public.subscriptions(id) on delete set null,
  branch_id uuid not null references public.branches(id) on delete restrict, amount numeric(12,2) not null check(amount > 0),
  method public.payment_method not null, status public.payment_status not null default 'pending', transaction_reference text,
  paid_at timestamptz, refund_amount numeric(12,2) not null default 0 check(refund_amount >= 0 and refund_amount <= amount),
  refund_reason text, receipt_url text, collected_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade, branch_id uuid references public.branches(id) on delete cascade,
  type text not null, title text not null, message text not null, channels public.notification_channel[] not null default '{dashboard}',
  scheduled_for timestamptz, sent_at timestamptz, read_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id) on delete cascade,
  channel public.notification_channel not null, recipient text, provider text, provider_message_id text,
  status text not null check(status in ('queued','sent','delivered','failed','skipped')), error_message text,
  attempted_at timestamptz not null default now(), delivered_at timestamptz
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(), branch_id uuid not null references public.branches(id) on delete cascade,
  machine_name text not null, category text not null, serial_number text, purchase_date date, warranty_until date,
  next_maintenance_date date, status text not null default 'operational' check(status in ('operational','maintenance_due','under_maintenance','out_of_service','retired')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique nulls not distinct(branch_id, serial_number)
);

create table public.equipment_maintenance (
  id uuid primary key default gen_random_uuid(), equipment_id uuid not null references public.equipment(id) on delete cascade,
  maintenance_date date not null, maintenance_type text not null, description text, cost numeric(12,2) check(cost >= 0),
  vendor text, next_due_date date, performed_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(), branch_id uuid references public.branches(id) on delete cascade,
  key text not null, value jsonb not null default '{}'::jsonb, is_secret boolean not null default false,
  updated_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique nulls not distinct(branch_id, key)
);

create table public.activity_logs (
  id bigint generated always as identity primary key, user_id uuid references public.users(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null, action text not null, entity_type text not null,
  entity_id text, description text, changes jsonb, ip_address inet, created_at timestamptz not null default now()
);

create index members_branch_status_idx on public.members(branch_id,status);
create index members_name_search_idx on public.members using gin(to_tsvector('simple',full_name));
create index subscriptions_member_status_idx on public.subscriptions(member_id,status);
create index subscriptions_expiry_idx on public.subscriptions(status,end_date);
create index attendance_branch_date_idx on public.attendance(branch_id,attendance_date desc);
create index attendance_machine_user_idx on public.attendance(machine_user_id,attendance_date desc);
create index sync_logs_event_at_idx on public.attendance_sync_logs(device_id,event_at desc);
create index appointments_branch_date_idx on public.appointments(branch_id,appointment_date,status);
create index payments_branch_paid_idx on public.payments(branch_id,paid_at desc) where status='completed';
create index notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index progress_member_date_idx on public.progress(member_id,measured_at desc);
create index activity_branch_created_idx on public.activity_logs(branch_id,created_at desc);
create index equipment_maintenance_due_idx on public.equipment(branch_id,next_maintenance_date) where status <> 'retired';

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['branches','roles','users','staff','trainers','members','membership_plans','subscriptions','face_machine_settings','attendance','appointments','workouts','diet_plans','invoices','payments','equipment','settings'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t); end loop; end $$;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='public' as $$
declare member_role uuid; begin select id into member_role from roles where slug=coalesce(new.raw_app_meta_data->>'role','member');
insert into users(id,role_id,full_name,email,phone) values(new.id,member_role,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,new.phone); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.app_role() returns text language sql stable security definer set search_path='public' as $$ select r.slug from users u join roles r on r.id=u.role_id where u.id=auth.uid() $$;
create or replace function public.current_branch_id() returns uuid language sql stable security definer set search_path='public' as $$ select branch_id from users where id=auth.uid() $$;
create or replace function public.is_management() returns boolean language sql stable security definer set search_path='public' as $$ select coalesce(public.app_role() in ('admin','manager'),false) $$;
create or replace function public.is_staff_user() returns boolean language sql stable security definer set search_path='public' as $$ select coalesce(public.app_role() in ('admin','manager','reception','trainer','dietician'),false) $$;

create or replace function public.set_subscription_dates() returns trigger language plpgsql set search_path='public' as $$
declare months integer; begin select duration_months into months from membership_plans where id=new.plan_id;
if months is null then raise exception 'Invalid membership plan'; end if;
if new.end_date is null then new.end_date := (new.start_date + make_interval(months => months))::date - 1; end if; return new; end $$;
create trigger set_subscription_dates before insert or update of plan_id,start_date on public.subscriptions for each row execute function public.set_subscription_dates();

create or replace function public.process_attendance_event(p_device_id text,p_machine_user_id text,p_event_at timestamptz,p_event_type public.attendance_event_type,p_external_event_id text,p_raw jsonb default null)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_machine face_machine_settings%rowtype; v_member members%rowtype; v_attendance attendance%rowtype;
begin
 select * into v_machine from face_machine_settings where device_id=p_device_id and status='active';
 if not found then raise exception 'Unknown or inactive device'; end if;
 if exists(select 1 from attendance_sync_logs where device_id=p_device_id and external_event_id=p_external_event_id) then return jsonb_build_object('status','duplicate'); end if;
 select * into v_member from members where branch_id=v_machine.branch_id and machine_user_id=p_machine_user_id and status='active';
 if not found then insert into attendance_sync_logs(branch_id,machine_id,external_event_id,device_id,machine_user_id,event_type,event_at,status,raw_payload) values(v_machine.branch_id,v_machine.id,p_external_event_id,p_device_id,p_machine_user_id,p_event_type,p_event_at,'unmatched',p_raw); return jsonb_build_object('status','unmatched'); end if;
 insert into attendance(member_id,branch_id,device_id,machine_user_id,attendance_date,entry_time,exit_time)
 values(v_member.id,v_member.branch_id,p_device_id,p_machine_user_id,(p_event_at at time zone 'Asia/Kolkata')::date,case when p_event_type='entry' then p_event_at end,case when p_event_type='exit' then p_event_at end)
 on conflict(member_id,attendance_date) do update set entry_time=case when p_event_type='entry' then least(coalesce(attendance.entry_time,p_event_at),p_event_at) else attendance.entry_time end, exit_time=case when p_event_type='exit' then greatest(coalesce(attendance.exit_time,p_event_at),p_event_at) else attendance.exit_time end
 returning * into v_attendance;
 insert into attendance_sync_logs(branch_id,machine_id,external_event_id,device_id,machine_user_id,event_type,event_at,status,attendance_id,raw_payload) values(v_member.branch_id,v_machine.id,p_external_event_id,p_device_id,p_machine_user_id,p_event_type,p_event_at,'processed',v_attendance.id,p_raw);
 update face_machine_settings set last_sync_at=now(),connection_status='online',last_error=null where id=v_machine.id;
 return jsonb_build_object('status','processed','attendance_id',v_attendance.id);
exception when unique_violation then return jsonb_build_object('status','duplicate'); end $$;

alter table public.branches enable row level security; alter table public.roles enable row level security; alter table public.users enable row level security;
alter table public.staff enable row level security; alter table public.trainers enable row level security; alter table public.members enable row level security;
alter table public.membership_plans enable row level security; alter table public.subscriptions enable row level security; alter table public.subscription_history enable row level security;
alter table public.face_machine_settings enable row level security; alter table public.attendance enable row level security; alter table public.attendance_sync_logs enable row level security;
alter table public.appointments enable row level security; alter table public.trainer_assignments enable row level security; alter table public.workout_categories enable row level security;
alter table public.workouts enable row level security; alter table public.diet_plans enable row level security; alter table public.progress enable row level security;
alter table public.invoices enable row level security; alter table public.payments enable row level security; alter table public.notifications enable row level security;
alter table public.notification_logs enable row level security; alter table public.equipment enable row level security; alter table public.equipment_maintenance enable row level security;
alter table public.settings enable row level security; alter table public.activity_logs enable row level security;

create policy roles_read on public.roles for select to authenticated using(true);
create policy roles_admin on public.roles for all to authenticated using(public.app_role()='admin') with check(public.app_role()='admin');
create policy branches_read on public.branches for select to authenticated using(public.app_role()='admin' or id=current_branch_id());
create policy branches_admin on public.branches for all to authenticated using(public.app_role()='admin') with check(public.app_role()='admin');
create policy users_read on public.users for select to authenticated using(id=auth.uid() or public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id()));
create policy users_manage on public.users for update to authenticated using(id=auth.uid() or is_management()) with check(id=auth.uid() or is_management());

do $$ declare t text; begin foreach t in array array['staff','trainers','members','membership_plans','subscriptions','appointments','workout_categories','workouts','diet_plans','progress','invoices','payments','equipment'] loop
 execute format('create policy %I_staff_read on public.%I for select to authenticated using (public.app_role()=''admin'' or branch_id=current_branch_id())',t,t);
 execute format('create policy %I_management_write on public.%I for all to authenticated using (public.app_role()=''admin'' or (is_staff_user() and branch_id=current_branch_id())) with check (public.app_role()=''admin'' or (is_staff_user() and branch_id=current_branch_id()))',t,t);
end loop; end $$;

create policy member_self on public.members for select to authenticated using(user_id=auth.uid());
create policy member_subscriptions on public.subscriptions for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_attendance on public.attendance for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_appointments on public.appointments for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_workouts on public.workouts for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_diets on public.diet_plans for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_progress on public.progress for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_invoices on public.invoices for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));
create policy member_payments on public.payments for select to authenticated using(member_id in(select id from members where user_id=auth.uid()));

create policy attendance_staff on public.attendance for all to authenticated using(public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id())) with check(public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id()));
create policy sync_logs_staff on public.attendance_sync_logs for select to authenticated using(public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id()));
create policy machines_staff_read on public.face_machine_settings for select to authenticated using(public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id()));
create policy machines_management on public.face_machine_settings for all to authenticated using(public.app_role()='admin' or (is_management() and branch_id=current_branch_id())) with check(public.app_role()='admin' or (is_management() and branch_id=current_branch_id()));
create policy history_read on public.subscription_history for select to authenticated using(is_staff_user() or member_id in(select id from members where user_id=auth.uid()));
create policy history_write on public.subscription_history for insert to authenticated with check(is_staff_user());
create policy assignments_read on public.trainer_assignments for select to authenticated using(is_staff_user() or member_id in(select id from members where user_id=auth.uid()));
create policy assignments_write on public.trainer_assignments for all to authenticated using(is_staff_user()) with check(is_staff_user());
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid() or (is_staff_user() and branch_id=current_branch_id()));
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid() or is_staff_user()) with check(user_id=auth.uid() or is_staff_user());
create policy notifications_manage on public.notifications for insert to authenticated with check(is_staff_user());
create policy notification_logs_staff on public.notification_logs for select to authenticated using(is_staff_user());
create policy maintenance_staff on public.equipment_maintenance for all to authenticated using(is_staff_user()) with check(is_staff_user());
create policy settings_read on public.settings for select to authenticated using(not is_secret and (public.app_role()='admin' or branch_id=current_branch_id() or branch_id is null));
create policy settings_admin on public.settings for all to authenticated using(is_management()) with check(is_management());
create policy activities_read on public.activity_logs for select to authenticated using(public.app_role()='admin' or (is_staff_user() and branch_id=current_branch_id()));
create policy activities_insert on public.activity_logs for insert to authenticated with check(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('member-photos','member-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
('progress-photos','progress-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
('receipts','receipts',false,10485760,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy storage_authenticated_read on storage.objects for select to authenticated using(bucket_id in('member-photos','progress-photos','receipts'));
create policy storage_staff_write on storage.objects for insert to authenticated with check(bucket_id in('member-photos','progress-photos','receipts') and public.is_staff_user());
create policy storage_staff_update on storage.objects for update to authenticated using(bucket_id in('member-photos','progress-photos','receipts') and public.is_staff_user());

commit;
