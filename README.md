# ErrandGo

Mobile-first errands marketplace with Customer, Rider and Super Admin workspaces in one app. Built separately from FinSight.

## Current status
- Frontend: `index.html`, `main.js`, `config.js` (committed to this repository)
- Supabase project: `qxugzgyadhufoohnprmx` (active)
- Database: `profiles`, `rider_applications`, `errands`, with RLS
- Storage: private `rider-documents` bucket
- Rider review Edge Function: `review-rider` deployed
- GitHub Pages: requires enabling under **Settings → Pages → Deploy from a branch → main → /(root)**

## Important setup before actual user testing
1. In Supabase **Authentication → Providers**, configure supported phone authentication with WhatsApp delivery via an approved provider; no real OTPs can be delivered until set up.
2. In Supabase Auth URL settings, configure the GitHub Pages origin and redirect URLs.
3. Register a **verified** initial Super Admin identity, then set their `app_metadata.role` to `super_admin` through a trusted admin process. Never put privileged credentials in browser code.
4. Sign out and back in after any rider role change so JWT claims refresh.
5. In GitHub **Settings → Pages**, select **Deploy from a branch**, **main**, **/(root)** and save. The intended URL is `https://finsightmanagement.github.io/ErrandGo/`.
6. Test rider application, document upload, Super Admin review and the customer booking/rider acceptance workflow with separate accounts.

## Scope boundaries
- WhatsApp outbound application notifications and approval alerts are **not yet implemented**; this code only supports OTP requests after provider configuration.
- Rider GPS proximity, pricing, deposits, M-PESA payments, rider background push notifications, manager invitations and automatic WhatsApp approvals are **not yet implemented**.
- No simulated OTP values or hardcoded shared rider PINs.
- Sensitive rider documents stay in private Supabase Storage, **not in this public GitHub repository**.
- The browser only contains the publishable Supabase key, not a service-role key.
- This remains an early beta. Perform security and operational testing before accepting real customers or sensitive applications.
