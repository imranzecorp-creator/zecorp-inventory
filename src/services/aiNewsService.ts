import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NewsInsight {
  title: string;
  content: string;
  source: string;
  category: 'UAE' | 'Global' | 'Trend';
}

export async function getDailyKitchenNews(): Promise<NewsInsight[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 3 short, professional news snippets about commercial kitchen equipment. Focus on: 1. A recent UAE-specific industry update. 2. A global innovation in kitchen tech. 3. An energy-efficiency trend. Return ONLY a JSON array of objects with keys: title, content (max 120 chars), source, category ('UAE', 'Global', or 'Trend').",
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
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
