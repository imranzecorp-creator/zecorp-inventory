import { GoogleGenAI } from "@google/genai";
import { InventoryItem, StockTransaction, ProjectItem, Project } from "../types";
import { safeJsonParse } from "../lib/utils";

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. AI features will fail.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key || 'missing_key' });
  }
  return aiInstance;
}

export interface InventoryInsight {
  title: string;
  message: string;
  type: 'WARNING' | 'SUGGESTION' | 'POSITIVE';
  itemId?: string;
  isUrgent?: boolean;
}

function isQuotaError(error: any): boolean {
  const errorStr = JSON.stringify(error);
  return (
    errorStr.includes('429') || 
    errorStr.includes('RESOURCE_EXHAUSTED') ||
    error?.status === 'RESOURCE_EXHAUSTED' ||
    error?.error?.code === 429 ||
    (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')))
  );
}

export async function analyzeInventory(items: InventoryItem[], transactions: StockTransaction[]): Promise<InventoryInsight[]> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Analyze the following inventory data and recent transactions to provide top 3 actionable insights.
            Focus on:
            1. Critical low stock items.
            2. Stagnant items (no transactions in 30 days).
            3. Popular items (high outgoing frequency).
            
            Inventory Data:
            ${JSON.stringify(items.map(i => ({ name: i.name, qty: i.currentQuantity, min: i.minStock, id: i.id })))}
            
            Recent Transactions:
            ${JSON.stringify(transactions.slice(0, 20).map(t => ({ name: t.itemName, type: t.type, qty: t.quantity, date: t.date })))}
            
            Return ONLY a JSON array. Do not include any other text.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, []);
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn("Gemini Analysis: Quota limit reached (429).");
      return [{
        title: "AI Analysis Paused",
        message: "The AI analysis is currently at its usage limit. Defaulting to manual tracking. Please try again in 15 minutes.",
        type: 'WARNING'
      }];
    }
    
    console.error("Gemini Analysis Error:", error);
    return [];
  }
}

export async function suggestItemDetails(itemName: string, brand?: string, modelNumber?: string): Promise<{ description: string, brand?: string, modelNumber?: string }> {
  try {
    const ai = getAi();
    const context = [
      itemName ? `Name: ${itemName}` : '',
      brand ? `Brand: ${brand}` : '',
      modelNumber ? `Model: ${modelNumber}` : ''
    ].filter(Boolean).join(', ');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `Suggest a highly professional and detailed inventory description, and if not already provided, the brand and model number for this item: "${context}". Return as JSON with: description (string), brand (string, optional), modelNumber (string, optional).`
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, { description: "" });
  } catch (error: any) {
    if (isQuotaError(error)) {
      return { description: "AI usage limit reached. Please specify details manually." };
    }
    console.error("Gemini Suggestion Error:", error);
    return { description: "" };
  }
}

export async function processAiSearch(query: string, items: InventoryItem[]): Promise<string[]> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Identify the IDs of items that match this natural language query: "${query}"
            
            Items:
            ${JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.currentQuantity, min: i.minStock })))}
            
            Return ONLY a JSON array of matching IDs.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, []);
  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export async function findInventoryMatches(importedItems: Partial<ProjectItem>[], inventory: InventoryItem[]): Promise<any[]> {
  try {
    const ai = getAi();
    const inventorySummary = inventory.map(i => ({ id: i.id, name: i.name, brand: i.brand, model: i.modelNumber }));
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Match these imported items to the existing inventory. 
            If a match is found, return the inventory 'id'. If no match is found, leave 'id' null.
            
            Imported Items:
            ${JSON.stringify(importedItems.map(i => ({ name: i.name, brand: i.brand, model: i.model })))}
            
            Existing Inventory:
            ${JSON.stringify(inventorySummary.slice(0, 300))} 
            
            Return ONLY a JSON array of matched IDs (strings or null) corresponding to the imported items.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const matches = safeJsonParse(response.text, []);
    return importedItems.map((item, idx) => ({
      ...item,
      inventoryItemId: matches[idx] || `EXT-${Math.random().toString(36).substr(2, 9)}`,
      matched: !!matches[idx]
    }));
  } catch (error) {
    console.error("Gemini Matching Error:", error);
    return importedItems.map(item => ({
      ...item,
      inventoryItemId: `EXT-${Math.random().toString(36).substr(2, 9)}`,
      matched: false
    }));
  }
}

export async function getAiResponse(message: string): Promise<string> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: message }] }],
      config: {
        systemInstruction: "You are a professional Inventory Specialist and Assistant for an inventory management app. Answer concisely and professionally. You help users manage stock, understand reports, and optimize their inventory."
      }
    });
    
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return "I'm experiencing some technical difficulties at the moment.";
  }
}

export async function getExcelMapping(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Analyze these Excel headers and sample data to map them to our internal Inventory Schema.
            
            Internal Fields:
            - name
            - brand
            - modelNumber
            - quantity
            - category
            - posNo
            - dimensions
            - supplier
            - origin
            - logistics
            - unitLocation
            - alternateBrand
            - approvedQuote
            - eta
            - delivery
            - location
 
            Excel Headers Found:
            ${headers.join(', ')}
            
            Sample Data (first few rows):
            ${JSON.stringify(sampleData)}
            
            Return a JSON object where keys are Internal Fields and values are the corresponding Excel Header names.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, {});
  } catch (error) {
    console.error("Gemini Mapping identification error:", error);
    return {};
  }
}

export async function mapExcelItems(rawData: any[]): Promise<Partial<ProjectItem>[]> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Map this raw data from an Excel file to the application's ProjectItem schema.
            Raw Data (sample or all):
            ${JSON.stringify(rawData.slice(0, 80))}
            
            Return a JSON array of objects following the ProjectItem schema. Ensure quantity is a number.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, []);
  } catch (error: any) {
    console.error("Gemini Excel Mapping Error:", error);
    return [];
  }
}

export async function getProjectExcelMapping(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Analyze these Excel headers and map them to our internal Project Schema.
            Excel Headers Found:
            ${headers.join(', ')}
            
            Return a JSON object mapping internal fields to excel headers.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, {});
  } catch (error) {
    console.error("Gemini Project Mapping error:", error);
    return {};
  }
}

export async function mapExcelProjects(rawData: any[]): Promise<any[]> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Map this raw data to Project and ProjectItem schema.
            Raw Data:
            ${JSON.stringify(rawData.slice(0, 50))}
            
            Return a JSON array of projects with nested items.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return safeJsonParse(response.text, []);
  } catch (error: any) {
    console.error("Gemini Project Mapping Error:", error);
    return [];
  }
}

const insightsCache = new Map<string, { timestamp: number, data: InventoryInsight[] }>();

export async function analyzeSupplyChain(
  inventory: InventoryItem[], 
  transactions: StockTransaction[],
  projects: Project[]
): Promise<InventoryInsight[]> {
  try {
    const ai = getAi();
    const dataHash = JSON.stringify({
      invCount: inventory.length,
      txCount: transactions.length,
      projCount: projects.length,
      totalStock: inventory.reduce((s, i) => s + i.currentQuantity, 0)
    });

    const cached = insightsCache.get(dataHash);
    if (cached && Date.now() - cached.timestamp < 600000) {
      return cached.data;
    }

    const activeProjects = projects.filter(p => p.status === 'Active');
    const projectSummary = activeProjects.map(p => ({
      name: p.outlet,
      items: p.items.map(i => ({ name: i.name, qty: i.quantity }))
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [{
          text: `
            Analyze supply chain status.
            Inventory:
            ${JSON.stringify(inventory.slice(0, 100).map(i => ({ id: i.id, name: i.name, stock: i.currentQuantity, min: i.minStock })))}
            Active Projects:
            ${JSON.stringify(projectSummary)}
            
            Return a JSON array of insights.
          `
        }]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const results = safeJsonParse(response.text, []);
    insightsCache.set(dataHash, { timestamp: Date.now(), data: results });
    return results;
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn("Gemini Supply Chain: Quota limit reached (429).");
      return [{
        title: "Supply Chain Insights Paused",
        message: "Real-time supply chain analysis is temporarily paused due to high demand. Your manual tracking is still active.",
        type: 'WARNING'
      }];
    }
    console.error("Gemini Supply Chain Analysis Error:", error);
    return [];
  }
}

export async function summarizeTransactions(transactions: StockTransaction[]): Promise<string> {
  try {
    const ai = getAi();
    
    const summaryData = transactions.slice(0, 40).map(t => ({
      item: t.itemName,
      type: t.type,
      qty: t.quantity,
      date: t.date
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Summarize these transactions:\n${JSON.stringify(summaryData)}` }] }],
      config: {
        systemInstruction: "You are an expert Inventory Analyst. Summarize transaction logs professionally."
      }
    });
    return response.text || "No summary generated.";
  } catch (error: any) {
    console.error("Gemini Summarization Error:", error);
    return "Error generating summary.";
  }
}

export async function generateInventoryReport(data: {
  inventory: InventoryItem[],
  transactions: StockTransaction[],
  parameters: {
    dateRange?: { start: string, end: string },
    transactionType?: string,
    categories?: string[]
  }
}) {
  try {
    const ai = getAi();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `
        Generate an inventory report.
        Items: ${data.inventory.length}
        Transactions: ${data.transactions.length}
        Data: ${JSON.stringify(data.inventory.slice(0, 30))}
      ` }] }],
      config: {
        systemInstruction: "You are a senior supply chain analyst. Generate professional reports in Markdown."
      }
    });

    return response.text || "No report generated.";
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return "Error generating report.";
  }
}
