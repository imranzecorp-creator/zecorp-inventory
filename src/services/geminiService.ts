import { GoogleGenerativeAI } from "@google/generative-ai";
import { InventoryItem, StockTransaction, ProjectItem, Project } from "../types";

let aiInstance: GoogleGenerativeAI | null = null;
function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. AI features will fail.");
    }
    aiInstance = new GoogleGenerativeAI(key || 'missing_key');
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

export async function analyzeInventory(items: InventoryItem[], transactions: StockTransaction[]): Promise<InventoryInsight[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
            
            Return ONLY a JSON array.
          `
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "[]");
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuotaError = errorStr.includes('429') || 
                        errorStr.includes('RESOURCE_EXHAUSTED') ||
                        error?.status === 'RESOURCE_EXHAUSTED' ||
                        error?.error?.code === 429;

    if (isQuotaError) {
      console.warn("Gemini Analysis: Quota limit reached (429).");
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
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const context = [
      itemName ? `Name: ${itemName}` : '',
      brand ? `Brand: ${brand}` : '',
      modelNumber ? `Model: ${modelNumber}` : ''
    ].filter(Boolean).join(', ');

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Suggest a highly professional and detailed inventory description, and if not already provided, the brand and model number for this item: "${context}". Return as JSON with: description (string), brand (string, optional), modelNumber (string, optional).`
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || '{"description": ""}');
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      return { description: "AI usage limit reached. Please specify details manually." };
    }
    console.error("Gemini Suggestion Error:", error);
    return { description: "" };
  }
}

export async function processAiSearch(query: string, items: InventoryItem[]): Promise<string[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "[]");
  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export async function findInventoryMatches(importedItems: Partial<ProjectItem>[], inventory: InventoryItem[]): Promise<any[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const inventorySummary = inventory.map(i => ({ id: i.id, name: i.name, brand: i.brand, model: i.modelNumber }));
    
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const matches = JSON.parse(result.response.text() || "[]");
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
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are a professional Inventory Specialist and Assistant for an inventory management app. Answer concisely and professionally. You help users manage stock, understand reports, and optimize their inventory."
    });
    
    const result = await model.generateContent(message);
    return result.response.text() || "I'm sorry, I couldn't process that request.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return "I'm experiencing some technical difficulties at the moment.";
  }
}

export async function getExcelMapping(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "{}");
  } catch (error) {
    console.error("Gemini Mapping identification error:", error);
    return {};
  }
}

export async function mapExcelItems(rawData: any[]): Promise<Partial<ProjectItem>[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "[]");
  } catch (error: any) {
    console.error("Gemini Excel Mapping Error:", error);
    return [];
  }
}

export async function getProjectExcelMapping(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "{}");
  } catch (error) {
    console.error("Gemini Project Mapping error:", error);
    return {};
  }
}

export async function mapExcelProjects(rawData: any[]): Promise<any[]> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.response.text() || "[]");
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

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent({
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
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const results = JSON.parse(result.response.text() || "[]");
    insightsCache.set(dataHash, { timestamp: Date.now(), data: results });
    return results;
  } catch (error: any) {
    console.error("Gemini Supply Chain Analysis Error:", error);
    return [];
  }
}

export async function summarizeTransactions(transactions: StockTransaction[]): Promise<string> {
  try {
    const ai = getAi();
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are an expert Inventory Analyst. Summarize transaction logs professionally."
    });
    
    const summaryData = transactions.slice(0, 40).map(t => ({
      item: t.itemName,
      type: t.type,
      qty: t.quantity,
      date: t.date
    }));

    const result = await model.generateContent(`Summarize these transactions:\n${JSON.stringify(summaryData)}`);
    return result.response.text() || "No summary generated.";
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
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are a senior supply chain analyst. Generate professional reports in Markdown."
    });
    
    const result = await model.generateContent(`
        Generate an inventory report.
        Items: ${data.inventory.length}
        Transactions: ${data.transactions.length}
        Data: ${JSON.stringify(data.inventory.slice(0, 30))}
      `);

    return result.response.text() || "No report generated.";
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return "Error generating report.";
  }
}
