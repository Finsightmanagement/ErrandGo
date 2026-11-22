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

## Rider GPS and multi-job update (22 November 2026)
- Rider application no longer asks for an operating area. Application starts from the Rider login page.
- Rider dashboard has Online/Offline GPS sharing, Available jobs, Suggested jobs, My active jobs, and History.
- Online riders can accept up to **three** active jobs (accepted or picked up). Assignment is still atomic, so only one rider receives each individual errand.
- Nearby pickup suggestions use the rider's most recently shared browser location and optional customer-supplied pickup GPS, within an initial 8 km straight-line radius. Text-only addresses are shown without a proximity claim; route optimization and capacity checks are **not yet implemented**.
- Online location requires foreground/browser location permission and updates opportunistically; browser background tracking is not guaranteed. Stale GPS (over 10 minutes) blocks accepting new jobs.
- Login still requires the WhatsApp OTP provider; no fake OTP or unapproved rider access has been introduced.
- The responsive separate HTML portals are web app beta entries, **not native Android/iOS apps** yet.
