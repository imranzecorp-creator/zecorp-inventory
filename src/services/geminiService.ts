import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, StockTransaction, ProjectItem } from "../types";

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
        ${JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.currentQuantity, min: i.minStock })))}
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

export async function mapExcelItems(rawData: any[]): Promise<Partial<ProjectItem>[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Map this raw data from an Excel file to the application's ProjectItem schema.
        
        ProjectItem Schema & Guidance:
        - name: string (Mapping to "Item description" or similar)
        - brand: string (The manufacturer or brand)
        - model: string (The model number or specific identifier)
        - quantity: number (The quantity of items)
        - supplier: string (Who supplied the item)
        - location: string (Mapping to "unit location" or where the item is stored)
        - warehouseLocation: string (Mapping to warehouse storage details like Aisle, Shelf, or Bin)
        - clientAssignment: string (Mapping to specific team, department, or user assignment)
        - approvedQuote: string (Mapping to "Approved quote column" or pricing/quote info)
        - category: string (Mapping to "category description")
        - posNo: string (Mapping to "pos no")
        - eta: string (Estimated Time of Arrival)
        - delivery: string (Delivery status or details)
        
        Raw Data (sample or all):
        ${JSON.stringify(rawData.slice(0, 50))}
        
        Identify which columns correspond to the fields above. If a field is missing, leave it as an empty string (or 0 for quantity).
        Return a JSON array of objects that strictly follow the schema. Ensure quantity is a number.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              brand: { type: Type.STRING },
              model: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              supplier: { type: Type.STRING },
              location: { type: Type.STRING },
              warehouseLocation: { type: Type.STRING },
              clientAssignment: { type: Type.STRING },
              approvedQuote: { type: Type.STRING },
              category: { type: Type.STRING },
              posNo: { type: Type.STRING },
              eta: { type: Type.STRING },
              delivery: { type: Type.STRING }
            },
            required: ['name', 'quantity']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Gemini API quota exceeded. Please try again in 1-2 minutes.");
    }
    console.error("Gemini Excel Mapping Error:", error);
    return [];
  }
}

export async function mapExcelProjects(rawData: any[]): Promise<any[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Map this raw data from an Excel file to the application's Project and ProjectItem schema.
        The data might contain multiple rows for the same project (identified by Job Number).
        
        Project Schema:
        - client: string
        - jobNumber: string
        - outlet: string
        - location: string
        
        ProjectItem Schema (belonging to a project):
        - name: string (Mapping to "Item description")
        - brand: string
        - model: string
        - quantity: number
        - supplier: string
        - location: string (Mapping to "unit location")
        - warehouseLocation: string (Mapping to warehouse storage details)
        - clientAssignment: string (Mapping to team or user assignment)
        - approvedQuote: string (Mapping to "Approved quote column")
        - category: string (Mapping to "category description")
        - posNo: string (Mapping to "pos no")
        - eta: string
        - delivery: string
        
        Raw Data (sample):
        ${JSON.stringify(rawData.slice(0, 50))}
        
        Return a JSON array of projects, where each project has the fields above and an "items" array of ProjectItems.
        Ensure quantity is a number.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              client: { type: Type.STRING },
              jobNumber: { type: Type.STRING },
              outlet: { type: Type.STRING },
              location: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    brand: { type: Type.STRING },
                    model: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    supplier: { type: Type.STRING },
                    location: { type: Type.STRING },
                    warehouseLocation: { type: Type.STRING },
                    clientAssignment: { type: Type.STRING },
                    approvedQuote: { type: Type.STRING },
                    category: { type: Type.STRING },
                    posNo: { type: Type.STRING },
                    eta: { type: Type.STRING },
                    delivery: { type: Type.STRING }
                  },
                  required: ['name', 'quantity']
                }
              }
            },
            required: ['client', 'jobNumber', 'items']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Gemini API quota exceeded. Please try again in 1-2 minutes.");
    }
    console.error("Gemini Project Mapping Error:", error);
    return [];
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a specialized Supply Chain and Inventory Analyst. 
        Generate a professional executive summary report based on the following inventory and transaction data.

        PARAMETERS:
        - Date Range: ${data.parameters.dateRange ? `${data.parameters.dateRange.start} to ${data.parameters.dateRange.end}` : 'All Time'}
        - Transaction Type Filter: ${data.parameters.transactionType || 'All'}
        - Categories Filter: ${data.parameters.categories?.join(', ') || 'All'}

        DATA SUMMARY:
        - Total Inventory Items: ${data.inventory.length}
        - Total Transactions in Period: ${data.transactions.length}
        - Low Stock Items: ${data.inventory.filter(i => i.currentQuantity <= i.minStock).length}

        TRANSACTIONS (Sample/Summary):
        ${JSON.stringify(data.transactions.slice(0, 50).map(t => ({
          name: t.itemName,
          type: t.type,
          qty: t.quantity,
          client: t.client,
          date: t.date,
          job: t.jobNumber
        })))}

        INVENTORY (Top Items):
        ${JSON.stringify(data.inventory.slice(0, 50).map(i => ({
          name: i.name,
          category: i.category,
          qty: i.currentQuantity,
          min: i.minStock,
          location: i.location,
          warehouse: i.warehouseLocation
        })))}

        REPORT REQUIREMENTS:
        1. Overview: High-level summary of stock levels and movement velocity.
        2. Key Performance Indicators: Analysis of turnover, stockouts, and project fulfillment efficiency.
        3. Critical Insights: Identify any anomalies, seasonal trends (if applicable), or efficiency gaps.
        4. Recommendations: Actionable steps to optimize stock levels and warehouse operations.
        
        Format the output in clean Markdown with professional headings. Use bold text for emphasis and bullet points for lists.
      `,
      config: {
        systemInstruction: "You are a senior supply chain analyst. Your reports are used by executives to make strategic decisions. Be precise, data-driven, and professional."
      }
    });

    return response.text || "No report could be generated.";
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      return "### ⚠️ AI Usage Limit Reached\n\nAI report generation is temporarily unavailable due to API rate limits. Please try again in 1-2 minutes.";
    }
    console.error('Error generating AI report:', error);
    return "Error generating AI report. Please try again later.";
  }
}
