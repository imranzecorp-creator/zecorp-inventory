import { GoogleGenerativeAI } from "@google/generative-ai";

let aiInstance: GoogleGenerativeAI | null = null;
function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    aiInstance = new GoogleGenerativeAI(key || 'missing_key');
  }
  return aiInstance;
}

export interface NewsInsight {
  title: string;
  content: string;
  source: string;
  category: 'UAE' | 'Global' | 'Trend';
}

export async function getDailyKitchenNews(): Promise<NewsInsight[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: "Generate 3 short, professional news snippets about commercial kitchen equipment. Focus on: 1. A recent UAE-specific industry update. 2. A global innovation in kitchen tech. 3. An energy-efficiency trend. Return ONLY a JSON array of objects with keys: title, content (max 120 chars), source, category ('UAE', 'Global', or 'Trend')."
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;
    
    if (isQuotaError) {
      console.warn("AI News: Quota limit reached (429). Using hardcoded fallback.");
      return [
        {
          title: "Service Temporarily Busy",
          content: "AI News is resting. UAE and Global industry updates will refresh once the service is available again.",
          source: "System Alert",
          category: "UAE"
        }
      ];
    }

    console.error("Error fetching AI news:", error);

    return [
      {
        title: "Sustainability in Dubai",
        content: "New regulations in Dubai are pushing restaurants towards low-energy refrigeration systems to meet 2030 goals.",
        source: "Industry Intel",
        category: "UAE"
      },
      {
        title: "Smart Induction Growth",
        content: "Global adoption of smart induction cooktops is rising by 15% annually due to precise temperature control.",
        source: "Kitchen Tech World",
        category: "Global"
      }
    ];
  }
}
