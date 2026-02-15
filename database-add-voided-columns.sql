-- Migration: Add voided columns to payments and quick_payments tables
-- Run this in Supabase SQL Editor
-- These columns are required for the payment void/annulment feature

DO $$
BEGIN
  -- Add voided columns to payments table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'voided') THEN
    ALTER TABLE public.payments ADD COLUMN voided BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'voided_at') THEN
    ALTER TABLE public.payments ADD COLUMN voided_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'voided_reason') THEN
    ALTER TABLE public.payments ADD COLUMN voided_reason TEXT;
  END IF;

  -- Add voided columns to quick_payments table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_payments' AND column_name = 'voided') THEN
    ALTER TABLE public.quick_payments ADD COLUMN voided BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_payments' AND column_name = 'voided_at') THEN
    ALTER TABLE public.quick_payments ADD COLUMN voided_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_payments' AND column_name = 'voided_reason') THEN
    ALTER TABLE public.quick_payments ADD COLUMN voided_reason TEXT;
  END IF;

  -- Add deleted_at to payments if it doesn't exist (for soft delete fallback)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.payments ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  -- Add deleted_at to quick_payments if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_payments' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.quick_payments ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Verify columns were created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('payments', 'quick_payments')
  AND column_name IN ('voided', 'voided_at', 'voided_reason', 'deleted_at')
ORDER BY table_name, column_name;
