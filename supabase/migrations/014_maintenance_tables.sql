-- Maintenance Calculator tables (Women's Module)

-- Maintenance calculations: stores each calculation scenario
CREATE TABLE IF NOT EXISTS public.maintenance_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  husband_gross_income NUMERIC NOT NULL CHECK (husband_gross_income >= 0),
  husband_deductions JSONB NOT NULL DEFAULT '{}',
  husband_net_income NUMERIC NOT NULL CHECK (husband_net_income >= 0),
  wife_income NUMERIC NOT NULL DEFAULT 0 CHECK (wife_income >= 0),
  num_children INTEGER NOT NULL DEFAULT 0 CHECK (num_children >= 0 AND num_children <= 20),
  children_ages JSONB NOT NULL DEFAULT '[]',
  maintenance_for_wife NUMERIC NOT NULL DEFAULT 0,
  maintenance_per_child NUMERIC NOT NULL DEFAULT 0,
  total_maintenance NUMERIC NOT NULL DEFAULT 0,
  percentage_applied NUMERIC NOT NULL DEFAULT 0,
  legal_basis TEXT CHECK (legal_basis IN ('section_125_crpc', 'hindu_marriage_act', 'dv_act_2005', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_calculations_user_id ON public.maintenance_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_calculations_created_at ON public.maintenance_calculations(created_at DESC);

ALTER TABLE public.maintenance_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_calculations_user_policy ON public.maintenance_calculations
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_calculations_updated_at
  BEFORE UPDATE ON public.maintenance_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Maintenance expenses: documented expenses (education, medical, household)
CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'education', 'medical', 'housing', 'food', 'clothing',
    'transport', 'childcare', 'utilities', 'legal', 'other'
  )),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'yearly')),
  beneficiary TEXT CHECK (beneficiary IN ('self', 'child', 'household')),
  expense_date DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_expenses_user_id ON public.maintenance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_expenses_category ON public.maintenance_expenses(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_expenses_created_at ON public.maintenance_expenses(created_at DESC);

ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_expenses_user_policy ON public.maintenance_expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_expenses_updated_at
  BEFORE UPDATE ON public.maintenance_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
