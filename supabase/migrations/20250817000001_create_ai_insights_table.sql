-- Create AI Insights table for storing generated insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('daily', 'weekly', 'monthly', 'custom')),
  context text NOT NULL CHECK (context IN ('ceo_dashboard', 'manager_dashboard', 'area_analysis', 'performance_review')),
  
  -- The raw data used to generate insights (for audit/regeneration)
  source_data jsonb NOT NULL,
  
  -- Generated insights
  insights jsonb NOT NULL,
  
  -- Metadata
  model_used text DEFAULT 'gemini-1.5-pro',
  generation_time_ms integer,
  token_count integer,
  
  -- Timestamps
  generated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  
  -- Tracking
  view_count integer DEFAULT 0,
  regeneration_count integer DEFAULT 0,
  last_viewed_at timestamp with time zone,
  
  CONSTRAINT ai_insights_pkey PRIMARY KEY (id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_insights_tenant_id ON public.ai_insights(tenant_id);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_generated_at ON public.ai_insights(generated_at DESC);
CREATE INDEX idx_ai_insights_context_type ON public.ai_insights(context, insight_type);
CREATE INDEX idx_ai_insights_tenant_context_date ON public.ai_insights(tenant_id, context, generated_at DESC);

-- Create a unique constraint to prevent duplicate daily insights
CREATE UNIQUE INDEX idx_ai_insights_unique_daily 
ON public.ai_insights(tenant_id, context, insight_type, DATE(generated_at))
WHERE insight_type = 'daily';

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- CEOs and Admins can see all insights for their tenant
CREATE POLICY "CEOs and Admins can view all tenant insights"
ON public.ai_insights
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('CEO', 'Admin')
  )
);

-- Managers can see insights for their areas
CREATE POLICY "Managers can view their area insights"
ON public.ai_insights
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'Manager'
  )
  AND (
    context = 'manager_dashboard' 
    OR user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Only system can insert insights (via service role)
CREATE POLICY "Only system can create insights"
ON public.ai_insights
FOR INSERT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.user_profiles 
    WHERE user_id = auth.uid()
    AND role IN ('CEO', 'Admin')
  )
);

-- Users can update view count and last_viewed_at
CREATE POLICY "Users can update view metrics"
ON public.ai_insights
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Function to get latest insights (with cache check)
CREATE OR REPLACE FUNCTION public.get_latest_insights(
  p_tenant_id uuid,
  p_context text,
  p_insight_type text DEFAULT 'daily'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insights jsonb;
  v_today date := CURRENT_DATE;
BEGIN
  -- Check for existing insights for today
  SELECT insights, id
  INTO v_insights
  FROM public.ai_insights
  WHERE tenant_id = p_tenant_id
    AND context = p_context
    AND insight_type = p_insight_type
    AND DATE(generated_at) = v_today
    AND expires_at > CURRENT_TIMESTAMP
  ORDER BY generated_at DESC
  LIMIT 1;
  
  -- Update view count if found
  IF v_insights IS NOT NULL THEN
    UPDATE public.ai_insights
    SET view_count = view_count + 1,
        last_viewed_at = CURRENT_TIMESTAMP
    WHERE tenant_id = p_tenant_id
      AND context = p_context
      AND insight_type = p_insight_type
      AND DATE(generated_at) = v_today;
  END IF;
  
  RETURN v_insights;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_latest_insights TO authenticated;