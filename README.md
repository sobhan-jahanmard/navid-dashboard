# Celestial Shop Dashboard

A comprehensive dashboard for managing payments and gold transactions for Celestial Shop.

## Features

- **Authentication:** Secure login via Discord OAuth
- **Payment Management:** View, create, edit, and manage payment status
- **Gold Payments:** Track gold payments with detailed information
- **Caching System:** Optimized performance with smart caching
- **Role-based Access Control:** Different views for support staff and regular members

## Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS 4
- **Backend:** Next.js API Routes
- **Authentication:** NextAuth.js with Discord provider
- **Data Storage:** Google Sheets API
- **Styling:** TailwindCSS

## Local Development

1. Clone the repository

   ```
   git clone https://github.com/your-username/celestial-shop-dashboard.git
   cd celestial-shop-dashboard
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create `.env.local` file with the following variables:

   ```
   # Discord Authentication
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # Google Sheets API
   GOOGLE_CLIENT_EMAIL=your_google_service_account_email
   GOOGLE_PRIVATE_KEY=your_google_private_key
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   ```

4. Run the development server

   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Production Deployment

### Prerequisites

- Node.js 18.x or higher
- A Discord application with OAuth2 credentials
- A Google Cloud service account with Sheets API access
- A Google Spreadsheet for storing data

### Deployment Steps

1. Update `.env.production` with your production values

2. Build the application

   ```
   npm run build
   ```

3. Start the production server
   ```
   npm start
   ```

### Deploying to Vercel/Netlify

1. Connect your GitHub repository to Vercel/Netlify

2. Configure the following environment variables in your hosting provider:

   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SPREADSHEET_ID`

3. Deploy using the hosting provider's deployment process

## Google Sheets Setup

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create a service account and download the JSON credentials
4. Share your Google Spreadsheet with the service account email
5. Format your spreadsheet with the required columns for payments and gold payments

## Contact

For questions or support, join our Discord server: [https://discord.gg/Zjweus8Kdx](https://discord.gg/Zjweus8Kdx)
