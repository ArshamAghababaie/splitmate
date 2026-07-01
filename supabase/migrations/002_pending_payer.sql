-- =============================================================
-- Migration 002: Pending Payer Support
-- Run once in the Supabase SQL Editor.
-- =============================================================

-- ----------------------------------------
-- 2-A. Schema changes to expenses
-- ----------------------------------------

-- 1. Add pending_paid_by column
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS pending_paid_by UUID
  REFERENCES pending_members(id);

-- 2. Make paid_by nullable
ALTER TABLE expenses
  ALTER COLUMN paid_by DROP NOT NULL;

-- 3. Exactly one of paid_by / pending_paid_by must be set
ALTER TABLE expenses
  ADD CONSTRAINT expenses_one_payer_required
  CHECK (num_nonnulls(paid_by, pending_paid_by) = 1);

-- 4. Index for pending_paid_by lookups
CREATE INDEX IF NOT EXISTS idx_expenses_pending_paid_by
  ON expenses(pending_paid_by);

-- ----------------------------------------
-- 2-B. Extended auto-promotion trigger
-- Extends the handle_new_user() function from migration 001
-- to also promote expenses where pending_paid_by = v_pending_id.
-- ----------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_pending_id UUID;
BEGIN
  -- Existing: create the profile row on first sign-in
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email'),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )
  );

  -- Pending-member promotion
  SELECT id INTO v_pending_id
  FROM public.pending_members
  WHERE email = COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email')
  LIMIT 1;

  IF v_pending_id IS NOT NULL THEN
    -- 1. Promote group memberships
    INSERT INTO public.group_members (group_id, user_id, joined_at)
    SELECT group_id, NEW.id, NOW()
    FROM public.group_pending_members
    WHERE pending_member_id = v_pending_id
    ON CONFLICT DO NOTHING;

    -- 2. Promote expense splits
    UPDATE public.expense_splits
    SET user_id = NEW.id, pending_member_id = NULL
    WHERE pending_member_id = v_pending_id;

    -- 3. Promote expenses where this pending member was the payer
    UPDATE public.expenses
    SET paid_by = NEW.id, pending_paid_by = NULL
    WHERE pending_paid_by = v_pending_id;

    -- 4. Mark invitations as accepted
    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE pending_member_id = v_pending_id;

    -- 5. Clean up
    DELETE FROM public.group_pending_members WHERE pending_member_id = v_pending_id;
    DELETE FROM public.pending_members WHERE id = v_pending_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------
-- 2-C. Updated create_expense_with_splits RPC
-- Accepts either p_paid_by or p_pending_paid_by (not both).
-- ----------------------------------------

DROP FUNCTION IF EXISTS create_expense_with_splits;

CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_group_id          UUID,
  p_category_id       UUID,
  p_amount_toman      INTEGER,
  p_description       TEXT,
  p_expense_date      DATE,
  p_created_by        UUID,
  p_splits            JSONB,
  p_paid_by           UUID    DEFAULT NULL,
  p_pending_paid_by   UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_expense_id UUID;
  v_split      JSONB;
BEGIN
  -- Validate exactly one payer is provided
  IF num_nonnulls(p_paid_by, p_pending_paid_by) <> 1 THEN
    RAISE EXCEPTION 'Exactly one of p_paid_by or p_pending_paid_by must be provided';
  END IF;

  INSERT INTO public.expenses (
    group_id, paid_by, pending_paid_by, category_id, amount_toman,
    description, expense_date, created_by
  ) VALUES (
    p_group_id, p_paid_by, p_pending_paid_by, p_category_id, p_amount_toman,
    p_description, p_expense_date, p_created_by
  )
  RETURNING id INTO v_expense_id;

  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    IF v_split ? 'pendingMemberId' AND (v_split ->> 'pendingMemberId') IS NOT NULL THEN
      INSERT INTO public.expense_splits (expense_id, pending_member_id, amount_owed)
      VALUES (
        v_expense_id,
        (v_split ->> 'pendingMemberId')::UUID,
        (v_split ->> 'amountOwed')::INTEGER
      );
    ELSE
      INSERT INTO public.expense_splits (expense_id, user_id, amount_owed)
      VALUES (
        v_expense_id,
        (v_split ->> 'userId')::UUID,
        (v_split ->> 'amountOwed')::INTEGER
      );
    END IF;
  END LOOP;

  RETURN v_expense_id;
END;
$$;
