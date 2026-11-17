import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { buildDeterministicItinerary } from './src/utils/travelLogic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function createGeminiClient(): GoogleGenAI | null {
  if (!isGeminiKeyConfigured()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/platform/status', (_req, res) => {
    res.json({
      geminiConfigured: isGeminiKeyConfigured(),
      service: 'TravelMate AI Backend',
    });
  });

  // POST /api/ai/chat — Conversational AI Travel Assistant
  app.post('/api/ai/chat', async (req, res) => {
    const userMessage = String(req.body?.message || '').trim();
    if (!userMessage) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      // Clearly labeled Demo Mode response when GEMINI_API_KEY is not configured
      const isManali = userMessage.toLowerCase().includes('manali');
      const isRishikesh = userMessage.toLowerCase().includes('rishikesh');
      const isKyoto = userMessage.toLowerCase().includes('kyoto');

      const destName = isRishikesh
        ? 'Rishikesh & Haridwar, Uttarakhand'
        : isKyoto
        ? 'Kyoto & Arashiyama, Japan'
        : isManali
        ? 'Manali, Himachal Pradesh'
        : 'Manali, Himachal Pradesh';

      const totalBudget = isRishikesh ? 15000 : isKyoto ? 94000 : 20000;
      const days = isRishikesh ? 4 : isKyoto ? 6 : 5;

      res.json({
        isDemoMode: true,
        reply: `[Demo Mode] Here is your tailored ${days}-day travel plan for ${destName} within ₹${totalBudget.toLocaleString('en-IN')}. I have balanced boutique stays, local sightseeing, dining, and round-trip transit so you stay comfortably under budget.`,
        structuredPlan: {
          destination: destName,
          days,
          totalBudgetINR: totalBudget,
          hotels: isKyoto
            ? [
                'Arashiyama Maple Ryokan & Onsen (₹14,800/night)',
                'Gion Heritage Townhouse Stay (₹11,200/night)',
              ]
            : [
                'Himalayan Cedar Boutique Lodge (₹2,200/night · Old Manali)',
                'Riverside Pine Chalet & Spa (₹1,850/night · Beas Riverfront)',
              ],
          sightseeing: [
            'Day 1: Hidimba Devi Temple, Manu Temple & Old Manali Heritage Walk',
            'Day 2: Solang Valley Gondola Ropeway, Atal Tunnel & Sissu Waterfall',
            'Day 3: Naggar Castle, Nicholas Roerich Art Gallery & Jana Pine Waterfall',
            'Day 4: Jogini Waterfall Morning Trek & Vashisht Geothermal Hot Springs',
            'Day 5: Van Vihar Cedar Reserve & Kullu Beas River Rafting',
          ].slice(0, days),
          transportEstimateINR: Math.round(totalBudget * 0.21),
          hotelEstimateINR: Math.round(totalBudget * 0.39),
          foodEstimateINR: Math.round(totalBudget * 0.18),
          activitiesEstimateINR: Math.round(totalBudget * 0.12),
          totalEstimateINR: Math.round(totalBudget * 0.9),
        },
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `User travel query: "${userMessage}". Provide a helpful conversational response and a structured travel budget & sightseeing plan.`,
        config: {
          systemInstruction:
            'You are TravelMate AI, a senior international and Indian travel agent. Always provide practical itineraries, realistic hotel recommendations, sightseeing highlights, transportation costs, food expenses, and total estimated budget in INR (₹). Keep responses concise and well-structured.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Helpful natural language response summarizing the travel advice.',
              },
              structuredPlan: {
                type: Type.OBJECT,
                properties: {
                  destination: { type: Type.STRING },
                  days: { type: Type.INTEGER },
                  totalBudgetINR: { type: Type.NUMBER },
                  hotels: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  sightseeing: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  transportEstimateINR: { type: Type.NUMBER },
                  hotelEstimateINR: { type: Type.NUMBER },
                  foodEstimateINR: { type: Type.NUMBER },
                  activitiesEstimateINR: { type: Type.NUMBER },
                  totalEstimateINR: { type: Type.NUMBER },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        isDemoMode: false,
        reply: parsed.reply || 'Here is your personalized TravelMate AI plan.',
        structuredPlan: parsed.structuredPlan || null,
      });
    } catch (error) {
      const fallback = buildDeterministicItinerary({
        destination: 'Manali, Himachal Pradesh',
        departureCity: 'New Delhi',
        startDate: '2026-12-15',
        daysCount: 5,
        travelers: 2,
        totalBudget: 20000,
        travelType: 'Adventure',
        preferences: userMessage,
      });
      res.json({
        isDemoMode: true,
        reply: `Prepared a 5-day itinerary for ${fallback.destination} within ₹${fallback.totalBudget.toLocaleString('en-IN')} (Demo fallback active: ${
          error instanceof Error ? error.message : 'API error'
        }).`,
        structuredPlan: {
          destination: fallback.destination,
          days: fallback.daysCount,
          totalBudgetINR: fallback.totalBudget,
          hotels: [fallback.hotelSummary],
          sightseeing: fallback.days.map((d) => `Day ${d.day}: ${d.title}`),
          transportEstimateINR: 4100,
          hotelEstimateINR: 7800,
          foodEstimateINR: 3500,
          activitiesEstimateINR: 2200,
          totalEstimateINR: fallback.estimatedTotalCost,
        },
      });
    }
  });

  // POST /api/ai/itinerary — Smart Day-Wise Itinerary Generator
  app.post('/api/ai/itinerary', async (req, res) => {
    const params = {
      destination: String(req.body?.destination || 'Manali, Himachal Pradesh'),
      departureCity: String(req.body?.departureCity || 'New Delhi'),
      startDate: String(req.body?.startDate || '2026-12-15'),
      daysCount: Math.min(14, Math.max(1, Number(req.body?.daysCount) || 5)),
      travelers: Math.min(20, Math.max(1, Number(req.body?.travelers) || 2)),
      totalBudget: Math.max(1000, Number(req.body?.totalBudget) || 20000),
      travelType: String(req.body?.travelType || 'Adventure'),
      preferences: String(req.body?.preferences || 'Sightseeing, local cuisine, scenic views'),
    };

    const ai = createGeminiClient();
    if (!ai) {
      res.json({
        itinerary: buildDeterministicItinerary(params),
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate a complete ${params.daysCount}-day travel itinerary from ${params.departureCity} to ${params.destination} starting ${params.startDate} for ${params.travelers} traveler(s) within a total budget of ₹${params.totalBudget} INR. Travel type: ${params.travelType}. Preferences: ${params.preferences}.`,
        config: {
          systemInstruction:
            'You are TravelMate AI Smart Itinerary Generator. Return a realistic day-by-day itinerary with morning, afternoon, and evening activities, tourist attractions, restaurants, transport suggestions, hotel recommendations, and daily cost estimates in INR.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              estimatedTotalCost: { type: Type.NUMBER },
              transportSummary: { type: Type.STRING },
              hotelSummary: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    morning: { type: Type.STRING },
                    afternoon: { type: Type.STRING },
                    evening: { type: Type.STRING },
                    attractions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    restaurants: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    transportSuggestion: { type: Type.STRING },
                    hotelRecommendation: { type: Type.STRING },
                    estimatedDayCost: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (Array.isArray(parsed.days) && parsed.days.length > 0) {
        res.json({
          itinerary: {
            ...params,
            overview: parsed.overview || `Curated ${params.daysCount}-day itinerary for ${params.destination}.`,
            estimatedTotalCost: Number(parsed.estimatedTotalCost) || params.totalBudget,
            transportSummary: parsed.transportSummary || `${params.departureCity} ↔ ${params.destination} Transit`,
            hotelSummary: parsed.hotelSummary || `${params.destination} Verified Boutique Stay`,
            days: parsed.days,
            isDemoMode: false,
          },
        });
        return;
      }
      res.json({ itinerary: buildDeterministicItinerary(params) });
    } catch {
      res.json({ itinerary: buildDeterministicItinerary(params) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TravelMate AI server running on http://localhost:${PORT}`);
  });
}

startServer();
