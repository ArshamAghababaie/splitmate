-- SECURITY DEFINER RPC: atomically creates an expense + its splits,
-- bypassing the RLS recursion between expenses SELECT and expense_splits INSERT.
-- Same pattern as create_group_with_member.

-- Drop if exists so we can recreate with new param names
drop function if exists create_expense_with_splits;

create or replace function create_expense_with_splits(
  p_group_id     uuid,
  p_paid_by      uuid,
  p_category_id  uuid,
  p_amount_toman integer,
  p_description  text,
  p_expense_date date,
  p_created_by   uuid,
  p_splits       jsonb  -- array of { "userId": uuid, "amountOwed": integer }
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_split      jsonb;
begin
  insert into public.expenses (
    group_id, paid_by, category_id, amount_toman,
    description, expense_date, created_by
  ) values (
    p_group_id, p_paid_by, p_category_id, p_amount_toman,
    p_description, p_expense_date, p_created_by
  )
  returning id into v_expense_id;

  for v_split in select * from jsonb_array_elements(p_splits)
  loop
    insert into public.expense_splits (expense_id, user_id, amount_owed)
    values (
      v_expense_id,
      (v_split ->> 'userId')::uuid,
      (v_split ->> 'amountOwed')::integer
    );
  end loop;

  return v_expense_id;
end;
$$;
