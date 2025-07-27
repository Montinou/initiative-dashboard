#!/bin/bash
# Test script to verify Supabase CLI is working
# Run this before executing the main user creation script

echo "Testing Supabase CLI connection..."

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    version=$(supabase --version 2>/dev/null)
    echo "✓ Supabase CLI is installed: $version"
else
    echo "✗ Supabase CLI is not installed or not in PATH"
    echo "Please install it with: npm install -g supabase"
    exit 1
fi

# Check if project is linked
if supabase status &> /dev/null; then
    echo "✓ Supabase project is linked and accessible"
else
    echo "✗ Supabase project is not linked or accessible"
    echo "Please run: supabase link --project-ref YOUR_PROJECT_REF"
    echo "Or make sure you're in the correct project directory"
    exit 1
fi

echo ""
echo "✓ All checks passed! You can now run create-users-supabase.sh"
