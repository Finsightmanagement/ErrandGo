# ErrandGo · November 2026 Working Build

Independent GitHub + Supabase app, separate from FinSight. Existing repository retained; obsolete frontend logic in `main.js` was replaced rather than overlaid.

## Entry points
- Customer: https://finsightmanagement.github.io/ErrandGo/
- Rider: https://finsightmanagement.github.io/ErrandGo/rider.html
- Rider application: https://finsightmanagement.github.io/ErrandGo/rider.html?apply=1
- Admin: https://finsightmanagement.github.io/ErrandGo/admin.html

## Implemented source/backend
- Email/password signup and login in place of WhatsApp OTP. No WhatsApp verification requested. **Supabase email confirmation must be disabled manually** if no-verification signup is desired; this setting is not yet confirmed. Accounts have not been end-to-end tested.
- Customer: profile with contact number, create/track bookings, chats and previous chats.
- Rider: application form for name, unique ID and licence numbers, ID front/back, licence, insurance, WhatsApp contact. No operating area. Duplicate ID/licence/phone rejected by database. Automatic document OCR/identity matching is **not** implemented; documents are designated `pending_manual_review` and Admin must inspect them.
- Super Admin only: rider application review, signed document access, approved riders list, bookings, conversations/receipts, read-only financial ledgers. The single Super Admin identity has **not yet been provisioned**. Admin contact requested: 0723011984.
- Rider GPS online/offline, nearby available/suggested jobs, limit 3 active jobs, atomic acceptance.
- Private errand chat with messages, receipts, images, safety acknowledgement for shopping; attached to errand and archived in completed errands. Phone call action opens dialer using assigned counterpart's number.
- Booking collection and payment records, commission/earnings allocation after backend-verified paid+completed errand, withdrawals request structure and audit history in Supabase.
- **Payment processing not active**: no provider credentials, no live M-PESA collection/payout, no manual fake-paid button. New bookings remain `unpaid`; riders cannot accept them until a trusted payment integration confirms payment and fee/commission are set.
- Commission rate and pricing are not configured. No fabricated rates were activated.
- Customer shopping payment goes to the merchant, never to the rider. Photos, merchant payment details and receipts can be logged in errand chat. Shopping safety pop-up included.

## Required external activation before genuine end-to-end usage
1. Configure Supabase email/password Auth with email confirmation disabled (or deliberately use email confirmation as an alternative). Create first Super Admin account and securely set role in `auth.users.raw_app_meta_data`, after verifying ownership.
2. Connect an authorized Kenya collection/disbursement provider to payment webhooks and settlement. Do not expose provider secrets in browser.
3. Configure service pricing, commission percentage, refund rules, provider reconciliation and authenticated payout destination verification.
4. Test on deployed GitHub Pages with real customer/rider accounts, uploads, rider reviews, chat, payments, and GPS.
5. Add automated ID/licence comparison with a vetted provider, if desired, while preserving manual Admin review.

## Deferred roadmap
- **ErrandGo Wallet**: later customer stored value and merchant/shop partnerships, subject to regulatory/compliance review. Not implemented, no wallet balances or customer deposits enabled.
- Native Android/iOS packaging, push messaging, full GPS route optimization and payments production rollout.

## Security notes
- RLS enabled on all new public tables and private storage buckets.
- Financial records and payout statuses are not client-writable.
- Sensitive rider IDs and licences are available only to applicant and Super Admin.
- Supabase security advisor can warn about intentionally callable definer RPCs with internal authorization; audit before production.
