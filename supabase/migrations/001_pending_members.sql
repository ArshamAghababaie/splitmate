-- =============================================================
-- Migration 001: Pending Members System
-- Run once in the Supabase SQL Editor.
-- =============================================================

-- ----------------------------------------
-- 1-A. New table: pending_members
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS pending_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  invited_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------
-- 1-B. New table: group_pending_members
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS group_pending_members (
  group_id           UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  pending_member_id  UUID        NOT NULL REFERENCES pending_members(id) ON DELETE CASCADE,
  invited_by         UUID        NOT NULL REFERENCES profiles(id),
  invited_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, pending_member_id)
);

-- ----------------------------------------
-- 1-C. New table: invitations
-- ----------------------------------------

CREATE TABLE IF NOT EXISTS invitations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token              TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  email              TEXT        NOT NULL,
  group_id           UUID        REFERENCES groups(id) ON DELETE CASCADE,
  pending_member_id  UUID        REFERENCES pending_members(id) ON DELETE CASCADE,
  invited_by         UUID        NOT NULL REFERENCES profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at        TIMESTAMPTZ
);

-- ----------------------------------------
-- 1-D. Migrate expense_splits
-- ----------------------------------------

-- Step 1: add surrogate PK column (DEFAULT fills it for existing rows)
ALTER TABLE expense_splits
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Step 2: backfill any row that somehow has id = NULL
UPDATE expense_splits SET id = gen_random_uuid() WHERE id IS NULL;

-- Step 3: make id NOT NULL now that it is filled
ALTER TABLE expense_splits ALTER COLUMN id SET NOT NULL;

-- Step 4: drop the old composite PK
ALTER TABLE expense_splits DROP CONSTRAINT IF EXISTS expense_splits_pkey;

-- Step 5: promote id to PK
ALTER TABLE expense_splits ADD PRIMARY KEY (id);

-- Step 6: make user_id nullable
ALTER TABLE expense_splits ALTER COLUMN user_id DROP NOT NULL;

-- Step 7: add pending_member_id FK
ALTER TABLE expense_splits
  ADD COLUMN IF NOT EXISTS pending_member_id UUID
  REFERENCES pending_members(id);

-- Step 8: partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_splits_expense_user
  ON expense_splits (expense_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_splits_expense_pending
  ON expense_splits (expense_id, pending_member_id)
  WHERE pending_member_id IS NOT NULL;

-- Step 9: CHECK — exactly one of the two member columns must be set
ALTER TABLE expense_splits
  ADD CONSTRAINT expense_splits_one_member_required
  CHECK (num_nonnulls(user_id, pending_member_id) = 1);

-- ----------------------------------------
-- 1-E. Indexes for new tables
-- ----------------------------------------

CREATE INDEX IF NOT EXISTS idx_gpm_group    ON group_pending_members(group_id);
CREATE INDEX IF NOT EXISTS idx_gpm_pending  ON group_pending_members(pending_member_id);
CREATE INDEX IF NOT EXISTS idx_es_pending   ON expense_splits(pending_member_id);
CREATE INDEX IF NOT EXISTS idx_inv_token    ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_inv_email    ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_inv_group    ON invitations(group_id);

-- ----------------------------------------
-- 1-F. RLS policies for new tables
-- ----------------------------------------

ALTER TABLE pending_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_pending_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations            ENABLE ROW LEVEL SECURITY;

-- pending_members: any signed-in user can see all
CREATE POLICY "pending_members_select"
  ON pending_members FOR SELECT
  TO authenticated
  USING (true);

-- pending_members: any signed-in user can create
CREATE POLICY "pending_members_insert"
  ON pending_members FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- group_pending_members: visible to members of the same group
CREATE POLICY "gpm_select"
  ON group_pending_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id, auth.uid()));

-- group_pending_members: group members can add pending members
CREATE POLICY "gpm_insert"
  ON group_pending_members FOR INSERT
  TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));

-- invitations: visible to inviter or any member of the linked group
CREATE POLICY "invitations_select"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR is_group_member(group_id, auth.uid())
  );

-- invitations: any signed-in user can create
CREATE POLICY "invitations_insert"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- ----------------------------------------
-- 1-G. Auto-promotion trigger
-- Extends the existing handle_new_user() function.
-- Replace the entire function body — the profile INSERT is preserved,
-- and the pending-member promotion logic is appended after it.
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

    -- 3. Mark invitations as accepted
    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE pending_member_id = v_pending_id;

    -- 4. Clean up
    DELETE FROM public.group_pending_members WHERE pending_member_id = v_pending_id;
    DELETE FROM public.pending_members WHERE id = v_pending_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------
-- 1-H. Update create_expense_with_splits RPC
-- Accepts both user_id and pending_member_id in the splits JSONB.
-- ----------------------------------------

DROP FUNCTION IF EXISTS create_expense_with_splits;

CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_group_id     UUID,
  p_paid_by      UUID,
  p_category_id  UUID,
  p_amount_toman INTEGER,
  p_description  TEXT,
  p_expense_date DATE,
  p_created_by   UUID,
  p_splits       JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_expense_id UUID;
  v_split      JSONB;
BEGIN
  INSERT INTO public.expenses (
    group_id, paid_by, category_id, amount_toman,
    description, expense_date, created_by
  ) VALUES (
    p_group_id, p_paid_by, p_category_id, p_amount_toman,
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

-- Added separately: allow unauthenticated users to read invitations (for public invite links)
-- CREATE POLICY "invitations_public_read" ON invitations FOR SELECT TO anon USING (true);