
-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "BO upload branding"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bo_manager'::app_role)));

CREATE POLICY "BO update branding"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branding' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bo_manager'::app_role)));

CREATE POLICY "BO delete branding"
ON storage.objects FOR DELETE
USING (bucket_id = 'branding' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bo_manager'::app_role)));

-- App settings table
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "BO manage settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bo_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'bo_manager'::app_role));

INSERT INTO public.app_settings (key, value) VALUES ('logo_url', NULL) ON CONFLICT DO NOTHING;
