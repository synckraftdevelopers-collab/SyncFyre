-- OHLC market-data import support
begin;

create table if not exists public.market_symbols (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  symbol text not null,
  instrument_name text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id, symbol)
);

create table if not exists public.ohlc_records (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  symbol_id uuid not null references public.market_symbols(id) on delete restrict,
  trading_date date not null,
  open numeric(20,8) not null,
  high numeric(20,8) not null,
  low numeric(20,8) not null,
  close numeric(20,8) not null,
  volume numeric(24,4),
  composite numeric(20,8),
  imported_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(symbol_id, trading_date),
  check(high >= open and high >= close),
  check(low <= open and low <= close)
);

create index if not exists market_symbols_branch_symbol_idx on public.market_symbols(branch_id, symbol);
create index if not exists ohlc_records_branch_date_idx on public.ohlc_records(branch_id, trading_date desc);

create trigger market_symbols_set_updated_at before update on public.market_symbols
for each row execute function public.set_updated_at();

alter table public.market_symbols enable row level security;
alter table public.ohlc_records enable row level security;

create policy market_symbols_staff_read on public.market_symbols for select to authenticated
using(public.app_role()='admin' or branch_id=public.current_branch_id());
create policy market_symbols_management_write on public.market_symbols for all to authenticated
using(public.app_role()='admin' or (public.is_staff_user() and branch_id=public.current_branch_id()))
with check(public.app_role()='admin' or (public.is_staff_user() and branch_id=public.current_branch_id()));
create policy ohlc_records_staff_read on public.ohlc_records for select to authenticated
using(public.app_role()='admin' or branch_id=public.current_branch_id());
create policy ohlc_records_management_write on public.ohlc_records for all to authenticated
using(public.app_role()='admin' or (public.is_staff_user() and branch_id=public.current_branch_id()))
with check(public.app_role()='admin' or (public.is_staff_user() and branch_id=public.current_branch_id()));

commit;