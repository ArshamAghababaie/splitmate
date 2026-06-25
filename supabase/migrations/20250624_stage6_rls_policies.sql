-- Stage 6: Delete and Update RLS policies

-- Delete policies
create policy "Creator can delete expense"
  on expenses for delete
  using (created_by = auth.uid());

create policy "Creator can delete group"
  on groups for delete
  using (created_by = auth.uid());

create policy "User can remove themselves from a group"
  on group_members for delete
  using (user_id = auth.uid());

-- Update policies
create policy "Creator can update expense"
  on expenses for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Expense creator can update splits"
  on expense_splits for update
  using (
    exists (
      select 1 from expenses
      where id = expense_id and created_by = auth.uid()
    )
  );

-- Also need DELETE on expense_splits for the PATCH flow (delete old splits, insert new)
create policy "Expense creator can delete splits"
  on expense_splits for delete
  using (
    exists (
      select 1 from expenses
      where id = expense_id and created_by = auth.uid()
    )
  );
