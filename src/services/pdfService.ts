import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDate } from '../lib/utils';

export interface TransactionReportOptions {
  includeNotes?: boolean;
  dateRange?: { start: string; end: string };
  typeFilter?: string;
  activeFilters?: {
    search?: string;
    brand?: string;
    client?: string;
    location?: string;
    representative?: string;
    outlet?: string;
    inventoryType?: string;
  };
}

export async function exportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
}

export async function generateInventoryReport(items: any[], activeFilters?: any) {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text("MASTER INVENTORY REPORT", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`ZECORP LOGISTICS SYSTEM | Generated: ${new Date().toLocaleString()}`, 14, 30);

  // Add Active Filters if present
  if (activeFilters) {
    const filters = [];
    if (activeFilters.search) filters.push(`Query: "${activeFilters.search}"`);
    if (activeFilters.brand) filters.push(`Brand: ${activeFilters.brand}`);
    if (activeFilters.client) filters.push(`Client: ${activeFilters.client}`);
    if (activeFilters.job) filters.push(`Job#: ${activeFilters.job}`);
    if (activeFilters.outlet) filters.push(`Outlet: ${activeFilters.outlet}`);
    if (activeFilters.location) filters.push(`Loc: ${activeFilters.location}`);
    if (activeFilters.inventoryType) filters.push(`Type: ${activeFilters.inventoryType}`);
    
    if (filters.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(150, 0, 0); // Subtle red to indicate filtered state
      doc.text(`Active Filters: ${filters.join(' | ')}`, 14, 36);
    }
  }
  
  const headers = [["Item", "Brand", "Model Number", "Warehouse / Client Stock", "Client Name", "Client Outlet", "Job Number", "Warehouse Location"]];
  
  const tableData = items.map(item => [
    item.name,
    item.brand || '-',
    item.modelNumber || '-',
    item.currentQuantity,
    item.client || 'N/A',
    item.outlet || '-',
    item.jobNumber || 'N/A',
    item.warehouseLocation || item.location || 'N/A'
  ]);

  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: activeFilters ? 42 : 40,
    theme: 'grid',
    headStyles: { fillColor: [16, 184, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });
  
  doc.save(`zecorp_inventory_detailed_${new Date().getTime()}.pdf`);
}

export async function generateTransactionsReport(transactions: any[], options: TransactionReportOptions = {}) {
  const { includeNotes = false, dateRange, typeFilter = 'ALL', activeFilters } = options;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(40);
  const title = typeFilter === 'ALL' ? "ZECORP ACTIVITY HISTORY" : `${typeFilter} TRANSACTIONS REPORT`;
  doc.text(title, 14, 22);
  
  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  let currentY = 36;
  if (dateRange && dateRange.start && dateRange.end) {
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, currentY);
    currentY += 6;
  }

  // Add Active Filters if present
  if (activeFilters) {
    const filters = [];
    if (activeFilters.search) filters.push(`Query: "${activeFilters.search}"`);
    if (activeFilters.brand) filters.push(`Brand: ${activeFilters.brand}`);
    if (activeFilters.client) filters.push(`Client: ${activeFilters.client}`);
    if (activeFilters.location) filters.push(`Location: ${activeFilters.location}`);
    if (activeFilters.representative) filters.push(`Rep: ${activeFilters.representative}`);
    if (activeFilters.outlet) filters.push(`Outlet: ${activeFilters.outlet}`);
    if (activeFilters.inventoryType) filters.push(`Inv Type: ${activeFilters.inventoryType}`);
    
    if (filters.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(150, 0, 0);
      doc.text(`Search Filters: ${filters.join(' | ')}`, 14, currentY);
      currentY += 6;
    }
  }
  
  const headers = [["Date", "Item Details", "Action", "Qty", "Job Ref", "Client / Source", "Outlet", "Location"]];
  if (includeNotes) headers[0].push("Notes");

  const tableData = transactions.map(tx => {
    const row = [
      formatDate(tx.date),
      `${tx.itemName}${tx.brand ? ` (${tx.brand} ${tx.modelNumber || ''})` : ''}`,
      tx.type === 'IN' ? 'STOCK IN' : 'STOCK OUT',
      tx.quantity,
      tx.jobNumber || 'N/A',
      tx.client || 'Internal Operation',
      tx.outlet || '-',
      tx.location || '-'
    ];
    if (includeNotes) row.push(tx.notes || '-');
    return row;
  });

  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: currentY + 4,
    theme: 'grid',
    headStyles: { 
      fillColor: typeFilter === 'OUT' ? [239, 68, 68] : (typeFilter === 'IN' ? [16, 185, 129] : [79, 70, 229]), 
      textColor: 255, 
      fontStyle: 'bold' 
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 45 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 18 }, // Date
      1: { cellWidth: 40 }, // Item
      2: { cellWidth: 18 }, // Action
      3: { cellWidth: 10, halign: 'center' }, // Qty
      4: { cellWidth: 18 }, // Job
    }
  });
  
  const filename = `zecorp_transactions_detailed_${new Date().getTime()}.pdf`;
  doc.save(filename);
}
