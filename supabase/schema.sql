-- =============================================================
-- Expense Splitter — Full Schema
-- Run once in the Supabase SQL Editor on a fresh database.
-- =============================================================

-- --------------------------------
-- 1. Tables
-- --------------------------------

create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  full_name  text,
  avatar_color text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id  uuid not null references groups on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references groups on delete cascade,
  paid_by      uuid not null references profiles on delete cascade,
  category_id  uuid not null references categories on delete restrict,
  amount_toman integer not null check (amount_toman > 0),
  description  text,
  expense_date date not null default current_date,
  created_by   uuid not null references profiles on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists expense_splits (
  expense_id  uuid not null references expenses on delete cascade,
  user_id     uuid not null references profiles on delete cascade,
  amount_owed integer not null check (amount_owed >= 0),
  primary key (expense_id, user_id)
);

create table if not exists settlements (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups on delete cascade,
  from_user   uuid not null references profiles on delete cascade,
  to_user     uuid not null references profiles on delete cascade,
  amount_toman integer not null check (amount_toman > 0),
  settled_at  timestamptz not null default now(),
  created_by  uuid not null references profiles on delete cascade,
  check (from_user <> to_user)
);

-- --------------------------------
-- 2. Indexes
-- --------------------------------

create index if not exists idx_group_members_user_id   on group_members (user_id);
create index if not exists idx_expenses_group_id       on expenses (group_id);
create index if not exists idx_expenses_paid_by        on expenses (paid_by);
create index if not exists idx_expense_splits_user_id  on expense_splits (user_id);
create index if not exists idx_settlements_group_id    on settlements (group_id);
create index if not exists idx_settlements_from_user   on settlements (from_user);
create index if not exists idx_settlements_to_user     on settlements (to_user);

-- --------------------------------
-- 3. Profile auto-creation trigger
-- --------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- --------------------------------
-- 4. Group membership helper (SECURITY DEFINER)
-- Avoids infinite recursion when used inside
-- RLS policies on group_members itself.
-- --------------------------------

create or replace function is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id
      and user_id  = _user_id
  );
$$;

-- --------------------------------
-- 5. Row Level Security
-- --------------------------------

-- profiles
alter table profiles enable row level security;

create policy "Signed-in users can view all profiles"
  on profiles for select
  using (auth.uid() is not null);

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups
alter table groups enable row level security;

create policy "Members can view their groups"
  on groups for select
  using (is_group_member(id, auth.uid()));

create policy "Any signed-in user can create a group"
  on groups for insert
  with check (auth.uid() is not null and created_by = auth.uid());

-- group_members
alter table group_members enable row level security;

create policy "Members can view group membership"
  on group_members for select
  using (is_group_member(group_id, auth.uid()));

create policy "User can add themselves to a group"
  on group_members for insert
  with check (user_id = auth.uid());

create policy "Group creator can add members"
  on group_members for insert
  with check (
    exists (
      select 1 from groups
      where id = group_id
        and created_by = auth.uid()
    )
  );

-- categories
alter table categories enable row level security;

create policy "Signed-in users can view categories"
  on categories for select
  using (auth.uid() is not null);

create policy "Signed-in users can add categories"
  on categories for insert
  with check (auth.uid() is not null);

-- expenses
alter table expenses enable row level security;

create policy "Involved users can view expenses"
  on expenses for select
  using (
    paid_by = auth.uid()
    or created_by = auth.uid()
    or (group_id is not null and is_group_member(group_id, auth.uid()))
    or exists (
      select 1 from expense_splits
      where expense_id = id
        and user_id = auth.uid()
    )
  );

create policy "Creator can insert expenses"
  on expenses for insert
  with check (
    created_by = auth.uid()
    and (
      group_id is null
      or is_group_member(group_id, auth.uid())
    )
  );

-- expense_splits
alter table expense_splits enable row level security;

create policy "Visible if parent expense is visible"
  on expense_splits for select
  using (
    exists (
      select 1 from expenses e
      where e.id = expense_id
        and (
          e.paid_by = auth.uid()
          or e.created_by = auth.uid()
          or (e.group_id is not null and is_group_member(e.group_id, auth.uid()))
          or user_id = auth.uid()
        )
    )
  );

create policy "Expense creator can insert splits"
  on expense_splits for insert
  with check (
    exists (
      select 1 from expenses
      where id = expense_id
        and created_by = auth.uid()
    )
  );

-- settlements
alter table settlements enable row level security;

create policy "Involved users can view settlements"
  on settlements for select
  using (
    from_user = auth.uid()
    or to_user = auth.uid()
    or (group_id is not null and is_group_member(group_id, auth.uid()))
  );

create policy "Creator can insert settlements"
  on settlements for insert
  with check (
    created_by = auth.uid()
    and (
      from_user = auth.uid()
      or to_user = auth.uid()
      or (group_id is not null and is_group_member(group_id, auth.uid()))
    )
  );

-- --------------------------------
-- 6. Seed default categories
-- --------------------------------

insert into categories (name, icon, is_default) values
  ('Dinner',        'utensils',      true),
  ('Groceries',     'shopping-cart',  true),
  ('Transport',     'car',           true),
  ('Rent & bills',  'home',          true),
  ('Entertainment', 'film',          true),
  ('Other',         'ellipsis',      true);
