import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, StockTransaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface InventoryInsight {
  title: string;
  message: string;
  type: 'WARNING' | 'SUGGESTION' | 'POSITIVE';
  itemId?: string;
}

export async function analyzeInventory(items: InventoryItem[], transactions: StockTransaction[]): Promise<InventoryInsight[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze the following inventory data and recent transactions to provide top 3 actionable insights.
        Focus on:
        1. Critical low stock items.
        2. Stagnant items (no transactions in 30 days).
        3. Popular items (high outgoing frequency).
        
        Inventory Data:
        ${JSON.stringify(items.map(i => ({ name: i.name, qty: i.currentQuantity, min: i.minStock, id: i.id })))}
        
        Recent Transactions:
        ${JSON.stringify(transactions.slice(0, 20).map(t => ({ name: t.itemName, type: t.type, qty: t.quantity, date: t.date })))}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                enum: ['WARNING', 'SUGGESTION', 'POSITIVE']
              },
              itemId: { type: Type.STRING, nullable: true }
            },
            required: ['title', 'message', 'type']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Analysis: Quota limit reached (429). Using fallback.");
      return [{
        title: "AI Analysis Paused",
        message: "The AI analysis is currently at its usage limit. Defaulting to manual tracking. Please try again in a few minutes.",
        type: 'WARNING'
      }];
    }
    
    console.error("Gemini Analysis Error:", error);
    return [];
  }
}

export async function suggestItemDetails(itemName: string, brand?: string, modelNumber?: string): Promise<{ description: string, brand?: string, modelNumber?: string }> {
  try {
    const context = [
      itemName ? `Name: ${itemName}` : '',
      brand ? `Brand: ${brand}` : '',
      modelNumber ? `Model: ${modelNumber}` : ''
    ].filter(Boolean).join(', ');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a highly professional and detailed inventory description, and if not already provided, the brand and model number for this item: "${context}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            brand: { type: Type.STRING, nullable: true },
            modelNumber: { type: Type.STRING, nullable: true }
          },
          required: ['description']
        }
      }
    });

    return JSON.parse(response.text || '{"description": ""}');
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Suggestion: Quota limit reached (429).");
      return { description: "AI usage limit reached. Please specify details manually." };
    }

    console.error("Gemini Suggestion Error:", error);
    return { description: "" };
  }
}

export async function processAiSearch(query: string, items: InventoryItem[]): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Identify the IDs of items that match this natural language query: "${query}"
        
        Items:
        ${JSON.stringify(items.map(i => ({ id: i.id, name: i.name, sku: i.sku, qty: i.currentQuantity, min: i.minStock })))}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Search: Quota limit reached (429).");
    } else {
      console.error("Gemini Search Error:", error);
    }
    return [];
  }
}

export async function getAiResponse(message: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: "You are a professional Inventory Specialist and Assistant for an inventory management app. Answer concisely and professionally. You help users manage stock, understand reports, and optimize their inventory."
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Chat: Quota limit reached (429).");
      return "I've reached my AI usage limit for the moment. Please try again shortly or continue with manual operations.";
    }

    console.error("Gemini Chat Error:", error);
    return "I'm experiencing some technical difficulties at the moment.";
  }
}

export async function summarizeTransactions(transactions: StockTransaction[]): Promise<string> {
  try {
    const summaryData = transactions.map(t => ({
      item: t.itemName,
      type: t.type,
      qty: t.quantity,
      client: t.client,
      user: t.userName,
      date: t.date,
      job: t.jobNumber
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze and summarize the following transaction history. 
        Focus on identifying:
        1. Key movements (large inflows or outflows).
        2. Frequent users or clients.
        3. Potential patterns or anomalies.
        4. Brief overall sentiment of the stock flow.
        
        Format the response in a professional, concise summary with bullet points. Use markdown formatting.
        
        Transactions:
        ${JSON.stringify(summaryData.slice(0, 40))}
      `,
      config: {
        systemInstruction: "You are an expert Inventory Analyst. Your job is to provide deep insights from transaction logs. Use a professional, executive summary tone."
      }
    });

    return response.text || "No summary could be generated.";
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Summarization: Quota limit reached (429).");
      return "### ⚠️ AI Usage Limit Reached\n\nThe transaction summarization feature is temporarily unavailable due to API rate limits. \n\n**Manual Overview:**\n- You have " + transactions.length + " transactions in the current view.\n- Please review the activity log below for individual movement details.\n- Try regenerating this summary in a few minutes.";
    }

    console.error("Gemini Summarization Error:", error);
    return "Error generating transaction summary. Please try again later.";
  }
}
