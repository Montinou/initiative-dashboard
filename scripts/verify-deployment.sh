#\!/bin/bash

echo "Verifying Invitation System Deployment..."
echo "==========================================="
echo ""

ALL_GOOD=true

echo "1. Checking Environment Variables"
echo "----------------------------------"
for var in NEXT_PUBLIC_APP_URL BREVO_API_KEY BREVO_WEBHOOK_SECRET BREVO_SENDER_EMAIL BREVO_SENDER_NAME CRON_API_KEY; do
    if [ -z "${\!var}" ]; then
        echo "X $var is not set"
        ALL_GOOD=false
    else
        echo "✓ $var is set"
    fi
done
echo ""

echo "2. Checking Core Files"
echo "----------------------"
for file in lib/email/brevo-service.ts lib/invitation/invitation-service.ts lib/invitation/reminder-scheduler.ts lib/invitation/smart-resend-manager.ts; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "X $file missing"
        ALL_GOOD=false
    fi
done
echo ""

echo "3. Checking Dependencies"
echo "------------------------"
for package in "@getbrevo/brevo" "qrcode" "date-fns" "recharts" "canvas-confetti"; do
    if grep -q "\"$package\"" package.json; then
        echo "✓ $package installed"
    else
        echo "X $package not installed"
        ALL_GOOD=false
    fi
done
echo ""

echo "4. Build Status"
echo "---------------"
if [ -d ".next" ]; then
    echo "✓ Build directory exists"
else
    echo "X No build directory found"
    ALL_GOOD=false
fi
echo ""

echo "==========================================="
if [ "$ALL_GOOD" = true ]; then
    echo "DEPLOYMENT VERIFICATION SUCCESSFUL"
else
    echo "DEPLOYMENT VERIFICATION FAILED"
fi
echo ""
EOF < /dev/null