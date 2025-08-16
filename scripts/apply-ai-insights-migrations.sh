#!/bin/bash

# Apply AI Insights migrations to Supabase

echo "🚀 Applying AI Insights migrations..."

# Apply the AI insights table migration
echo "📊 Creating AI insights table..."
npx supabase db push --file supabase/migrations/20250817000001_create_ai_insights_table.sql

# Apply the CEO insights query function
echo "🔍 Creating CEO insights query function..."
npx supabase db push --file supabase/migrations/20250817000002_create_ceo_insights_function.sql

echo "✅ AI Insights migrations applied successfully!"
echo ""
echo "🔑 Don't forget to set your GEMINI_API_KEY in your .env.local file:"
echo "GEMINI_API_KEY=your-api-key-here"
echo ""
echo "📝 The AI Insights system is now ready!"
echo "- Insights are cached for 24 hours"
echo "- CEO and Admin users can regenerate insights manually"
echo "- The insights card appears below the KPI metrics in /ceo"