-- DV Log - Medical Reports Table
-- Phase 2: Women's Module

CREATE TABLE IF NOT EXISTS public.dv_medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.dv_incidents(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  hospital_name TEXT,
  doctor_name TEXT,
  diagnosis TEXT NOT NULL,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dv_medical_reports_user_id ON public.dv_medical_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_dv_medical_reports_incident_id ON public.dv_medical_reports(incident_id);

ALTER TABLE public.dv_medical_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dv_medical_reports' AND policyname = 'dv_medical_reports_user_policy') THEN
    CREATE POLICY dv_medical_reports_user_policy ON public.dv_medical_reports FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER update_dv_medical_reports_updated_at BEFORE UPDATE ON public.dv_medical_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
