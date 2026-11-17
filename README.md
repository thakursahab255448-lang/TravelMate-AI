# TravelMate AI — Compare. Book. Explore.

Intelligent AI-powered travel planning, flight and hotel comparison, smart day-wise itinerary generation, interactive budget calculation, live Google Maps destination lookup, and sandbox booking management platform.

## Core Modules

1. **Main Landing Page**: Hero AI Trip Search interface, Popular & Trending Destinations, Featured Packages, Why Choose TravelMate AI, 4-Step Workflow, Verified Testimonials, and FAQs.
2. **User Authentication & Profile**: Firebase Google Authentication (`signInWithPopup`), session onboarding, personal travel style preferences, saved destinations, favorite flights, and favorite hotels.
3. **AI Travel Assistant**: Conversational travel planner backed by server-side Google Gemini (`@google/genai` `gemini-4-hydrogen`) with structured sightseeing, hotel, and cost breakdowns (plus clearly labeled Demo Mode when `GEMINI_API_KEY` is not set).
4. **Smart Itinerary Generator & AI Trip Planner**: Day-by-day schedule (Morning, Afternoon, Evening, Attractions, Dining, Local Transit, Stay Recommendation) with inline activity editing, AI regeneration, Firebase cloud saving, shareable summary, and printable PDF export.
5. **Flight & Hotel Comparison**: Separate Flight Finder and Hotel Finder modules with route/price/duration/rating/facility filters, side-by-side comparison matrices, and user-confirmed sandbox reservations.
6. **Smart Budget Calculator**: Real-time total, per-person, and remaining budget calculation with Recharts Donut visualization.
7. **Personalized Recommendations**: Destination matching across Family, Adventure, Solo, Nature, Historical, Religious, Romantic, and Budget travel archetypes.
8. **Booking Management & Travel Support**: Sandbox booking ledger, downloadable travel vouchers, date modification & cancellation workflows, and post-booking support ticket logging.
9. **Admin Dashboard**: Role-protected console displaying platform KPIs, service integration status, and Recharts destination analytics.
10. **Android Readiness**: Configured with `capacitor.config.json` for packaging the responsive web app as an Android application.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` (refer to `.env.example`):
   - `GEMINI_API_KEY`: Server-side Google Gemini API key.
   - `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Platform API key.
3. Run unit tests:
   ```bash
   npm test
   ```
4. Start the full-stack development server on port 3000:
   ```bash
   npm run dev
   ```
