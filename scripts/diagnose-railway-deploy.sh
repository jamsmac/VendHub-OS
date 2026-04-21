#!/usr/bin/env bash
# Railway web deploy diagnostic — run this when vendhubweb-production fails to build.
#
# Prerequisites:
#   - Railway CLI installed: `npm i -g @railway/cli`
#   - Logged in: `railway login`
#   - Linked to project: `railway link`

set -e

echo "=== Railway Web Deploy Diagnostic ==="
echo ""

echo "1. Project status:"
railway status 2>&1 || echo "  ERR: Not linked. Run: railway link"
echo ""

echo "2. Services:"
railway service 2>&1 | head -20
echo ""

echo "3. Latest web deployment logs (last 100 lines):"
railway logs --service=vendhubweb-production 2>&1 | tail -100 || echo "  ERR: logs not available"
echo ""

echo "4. Web service variables (checking NEXT_PUBLIC_API_URL):"
railway variables --service=vendhubweb-production 2>&1 | grep -E "NEXT_PUBLIC_API_URL|NODE_ENV|PORT" || echo "  WARN: no matching vars"
echo ""

echo "5. Check billing/usage:"
echo "   Open: https://railway.app/account/usage"
echo "   If >80% of plan limit, upgrade or optimize before redeploying."
echo ""

echo "6. Locally verify the Dockerfile builds:"
echo "   docker build -f apps/web/Dockerfile -t vendhub-web-test --target production ."
echo ""

echo "=== Manual next steps ==="
echo ""
echo "If logs are empty and no billing issue:"
echo "  → Railway Dashboard → vendhubweb-production → Settings"
echo "  → Verify: Root Directory = '/' (NOT apps/web)"
echo "  → Verify: Dockerfile Path = 'apps/web/Dockerfile'"
echo "  → Click 'Redeploy' manually"
echo ""
echo "If still failing after 3 redeploy attempts:"
echo "  → FALLBACK: migrate to Vercel (Next.js native, 1-day job)"
echo "  → See: scripts/migrate-web-to-vercel.md"
