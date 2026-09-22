# CarSruth Live Pilot

Mobile-first Next.js front end for the CarSruth V7 Supabase backend.

## Environment
Copy `.env.example` to `.env.local` or configure the two variables in Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

## First owner account
Create the first app account using `connie.tarrant@etarrant.ie`. The database bootstrap trigger assigns that account as owner of E. Tarrant & Sons / Banteer.

## Run
npm install
npm run dev

## Current live features
- Email/password auth
- Dealer-scoped dashboard
- Vehicle Hub search
- Vehicle In
- Automatic CarSruth vehicle ID
- Key number suggestion and assignment
- Vehicle movement recording with audit trail
- Workshop/courtesy dashboard counts

Next planned modules: QR printing/scanning, camera VIN/REG capture, photo storage, workshop WIP detail, courtesy before/after inspection, publish approval queue, website integrations.
