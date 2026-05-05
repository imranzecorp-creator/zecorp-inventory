import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash, 
  RotateCcw,
  AlertCircle, 
  MapPin, 
  Filter,
  Package,
  Download,
  Info,
  X,
  Sparkles,
  Loader2,
  Minus,
  CheckSquare,
  Square,
  Zap,
  Building,
  User,
  Warehouse,
  ChevronDown,
  Hash,
  FileUp,
  FileText,
  Mic,
  MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  increment,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { InventoryItem, UserProfile, Project } from '../types';
import { cn, formatDate, formatDateForInput, getDateObject } from '../lib/utils';
import { generateInventoryReport } from '../services/pdfService';
import { suggestItemDetails, processAiSearch, mapExcelItems, getExcelMapping } from '../services/geminiService';

import { FilterDropdown } from './ui/FilterDropdown';

interface InventoryListProps {
  items: InventoryItem[];
  clients: any[];
  user: UserProfile;
  projects: Project[];
  initialSearch?: string;
  onSearchClear?: () => void;
}

import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const InventoryRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
  const { items, expandedId, selectedIds, toggleSelectItem, toggleExpand, isApproved, isAdmin, canUpdateStock, openAdjustment, setEditingItem, setItemToDelete } = data;
  const item = items[index];
  if (!item) return null;
  const isExpanded = expandedId === item.id;
  const isSelected = selectedIds.includes(item.id);

  return (
    <div style={style} className="px-2">
      <motion.div 
        layout
        initial={false}
        animate={{ 
          backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0)",
          scale: isSelected ? 1.002 : 1,
        }}
        className={cn(
          "group cursor-pointer border border-white/[0.03] rounded-2xl overflow-hidden transition-all duration-200",
          isSelected && "ring-1 ring-inset ring-primary/20",
          isExpanded ? "bg-white/[0.04] mb-4" : "hover:bg-white/[0.02] mb-1"
        )}
        onClick={() => toggleExpand(item.id)}
      >
        <div className="flex items-center p-3">
          {isApproved && (
            <div className="w-10 flex items-center justify-center shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}>
              <div className="text-slate-500 group-hover:text-primary transition-colors">
                <AnimatePresence mode="wait">
                  {isSelected ? (
                    <motion.div key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                      <CheckSquare className="w-4 h-4 text-primary" />
                    </motion.div>
                  ) : (
                    <motion.div key="u" initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0.5 }}>
                      <Square className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex items-center space-x-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Package className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors truncate">{item.name}</p>
                {item.inventoryType === 'Client Stock' && <Warehouse className="w-3 h-3 text-amber-500/60" />}
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {item.brand && `${item.brand} • `}{item.modelNumber || 'No Model'}
              </p>
            </div>
          </div>

          <div className="w-24 px-4 text-center shrink-0">
            <div className={cn(
              "px-2 py-1 rounded-lg border flex flex-col justify-center",
              item.currentQuantity <= item.minStock 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                : "bg-primary/10 border-primary/30 text-primary"
            )}>
              <span className="text-sm font-black leading-none">{item.currentQuantity}</span>
              <span className="text-[8px] font-black uppercase opacity-60 mt-0.5">Units</span>
            </div>
          </div>

          <div className="w-32 px-4 hidden lg:block shrink-0">
             <div className="flex items-center space-x-2 text-slate-400">
                <MapPin className="w-3 h-3 text-slate-600" />
                <span className="text-xs font-medium truncate">{item.location}</span>
             </div>
          </div>

          <div className="w-32 px-4 hidden xl:block shrink-0">
            <span className={cn(
              "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border block text-center",
              item.currentQuantity <= item.minStock 
                ? "bg-red-500/10 text-red-500 border-red-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {item.currentQuantity <= item.minStock ? 'Low Stock' : 'Healthy'}
            </span>
          </div>

          {isApproved && (
            <div className="w-32 flex items-center justify-end pr-4 space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => openAdjustment('IN', item)}
                  className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 hover:scale-110 transition-all border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => openAdjustment('OUT', item)}
                  className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 hover:scale-110 transition-all border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-6 w-px bg-white/10 mx-1" />
              <button 
                onClick={() => setEditingItem(item)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setItemToDelete(item)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all text-slate-400 hover:text-red-500"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white/[0.04] border-t border-white/5 p-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Info className="w-3 h-3" />Item Info</p>
                     <div className="space-y-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Category</span>
                           <span className="text-sm text-slate-200 font-medium">{item.category || 'Standard Asset'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Supplier</span>
                           <span className="text-sm text-slate-200 font-medium">{item.supplier || 'Not Specified'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Warehouse-Loc</span>
                           <span className="text-[10px] text-primary font-bold">{item.warehouseLocation || 'N/A'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Building className="w-3 h-3" />Project Details</p>
                     <div className="space-y-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Client</span>
                           <span className="text-sm text-slate-200 font-medium">{item.client || 'Internal'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Assignment</span>
                           <span className="text-[10px] text-amber-500 font-bold">{item.clientAssignment || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Project Outlet</span>
                           <span className="text-sm text-slate-200 font-medium">{item.outlet || 'Unknown'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Hash className="w-3 h-3" />System Meta</p>
                     <div className="space-y-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Job Number</span>
                           <span className="text-sm font-mono text-primary font-bold">{item.jobNumber || 'PENDING'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-500 uppercase font-bold">Entry ID</span>
                           <span className="text-[10px] font-mono text-slate-500 truncate">{item.id}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3 h-3" />Technical Notes</p>
                     <p className="text-xs text-slate-400 italic leading-relaxed border-l-2 border-white/5 pl-3">
                        {item.description || 'No additional technical data available for this asset signature.'}
                     </p>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

export default function InventoryList({ items, clients, user, projects, initialSearch = '', onSearchClear }: InventoryListProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const inventoryFileInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<List>(null);

  const [importPreview, setImportPreview] = useState<any[] | null>(null);

  const handleInventoryExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];

        if (data.length === 0) {
          alert('Excel file is empty');
          return;
        }

        // Use AI to find mapping
        const mapping = await getExcelMapping(headers, data.slice(0, 5));
        
        let mappedData: any[] = [];
        
        // If Gemini provided a mapping, use it. Otherwise, use the old mapping function as fallback
        if (Object.values(mapping).some(v => !!v)) {
          console.log("Using Gemini suggested mapping:", mapping);
          mappedData = data.map((row: any) => {
            const getVal = (internalField: string) => {
              const excelHeader = mapping[internalField];
              return excelHeader ? row[excelHeader] : '';
            };
            
            return {
              name: getVal('name') || 'Unnamed Item',
              brand: getVal('brand') || '',
              modelNumber: getVal('modelNumber') || '',
              currentQuantity: Number(getVal('quantity')) || 0,
              category: getVal('category') || '',
              location: getVal('location') || 'Warehouse',
              warehouseLocation: getVal('warehouseLocation') || '',
              clientAssignment: getVal('clientAssignment') || '',
              supplier: getVal('supplier') || '',
              client: getVal('client') || '',
              outlet: getVal('outlet') || '',
              jobNumber: getVal('jobNumber') || '',
              inventoryType: 'Warehouse Stock'
            };
          });
        } else {
          console.log("Falling back to direct Gemini mapping for small sample");
          const aiMappedItems = await mapExcelItems(data.slice(0, 50));
          mappedData = aiMappedItems.map((item: any) => ({
            name: item.name || 'Unnamed Item',
            brand: item.brand || '',
            modelNumber: item.model || '',
            currentQuantity: item.quantity || 0,
            category: item.category || '',
            location: item.location || 'Warehouse',
            warehouseLocation: item.warehouseLocation || '',
            clientAssignment: item.clientAssignment || '',
            supplier: item.supplier || '',
            inventoryType: 'Warehouse Stock'
          }));
        }
        
        setImportPreview(mappedData);
      } catch (err: any) {
        console.error('Error importing inventory:', err);
        alert(err.message || 'Failed to import inventory items.');
      } finally {
        setIsImporting(false);
        if (inventoryFileInputRef.current) inventoryFileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      const chunks = [];
      for (let i = 0; i < importPreview.length; i += 500) {
        chunks.push(importPreview.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const itemData of chunk) {
          const newDocRef = doc(collection(db, 'inventory'));
          batch.set(newDocRef, {
            ...itemData,
            minStock: 5,
            description: `AI Integrated Import: ${itemData.category || ''} ${itemData.brand || ''}`,
            lastUpdated: serverTimestamp(),
            createdAt: serverTimestamp()
          });
        }
        await batch.commit();
      }
      
      // Activity Log
      addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'AI_IMPORT_INVENTORY',
        details: `Imported ${importPreview.length} items via AI Mapping`,
        createdAt: serverTimestamp()
      }).catch(e => console.warn('Logging failed:', e));

      alert(`Successfully AI-integrated ${importPreview.length} inventory items!`);
      setImportPreview(null);
    } catch (err: any) {
      console.error('Error committing import:', err);
      alert(err.message || 'Failed to commit inventory import.');
    } finally {
      setIsImporting(false);
    }
  };
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adjustmentItem, setAdjustmentItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT' | null>(null);
  const [initialAction, setInitialAction] = useState<'IN' | 'OUT' | null>(null);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const openAdjustment = useCallback((type: 'IN' | 'OUT', item: InventoryItem) => {
    setAdjustmentType(type);
    setAdjustmentItem(item);
  }, []);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [selectedWarehouseLocations, setSelectedWarehouseLocations] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [jobFilter, setJobFilter] = useState('');
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'Warehouse Stock' | 'Client Stock' | ''>('');
  const [stockInStart, setStockInStart] = useState('');
  const [stockInEnd, setStockInEnd] = useState('');
  const [updatedStart, setUpdatedStart] = useState('');
  const [updatedEnd, setUpdatedEnd] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  
  const { isListening, startListening, currentLang, setCurrentLang } = useVoiceSearch((transcript) => {
    setSearchTerm(transcript);
  });

  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [searchTerm]);

  const isAdmin = user.role === 'admin' || user.email.toLowerCase() === 'imranzecorp@gmail.com';
  const isApproved = user.isApproved || isAdmin;
  const canUpdateStock = isApproved;

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const searchLow = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    items.forEach(item => {
      if (item.name.toLowerCase().includes(searchLow)) matches.add(item.name);
      if (item.brand && item.brand.toLowerCase().includes(searchLow)) matches.add(item.brand);
      if (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow)) matches.add(item.modelNumber);
    });
    
    return Array.from(matches).slice(0, 8); // Limit to 8 suggestions
  }, [searchTerm, items]);

  const clientSuggestions = useMemo(() => {
    if (!clientFilter || clientFilter.length < 1) return [];
    const searchLow = clientFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.client && item.client.toLowerCase().includes(searchLow)) matches.add(item.client);
    });
    return Array.from(matches).slice(0, 8);
  }, [clientFilter, items]);

  const jobSuggestions = useMemo(() => {
    if (!jobFilter || jobFilter.length < 1) return [];
    const searchLow = jobFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.jobNumber && item.jobNumber.toLowerCase().includes(searchLow)) matches.add(item.jobNumber);
    });
    return Array.from(matches).slice(0, 8);
  }, [jobFilter, items]);

  const locationSuggestions = useMemo(() => {
    if (!locationFilter || locationFilter.length < 1) return [];
    const searchLow = locationFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.location && item.location.toLowerCase().includes(searchLow)) matches.add(item.location);
      if (item.outlet && item.outlet.toLowerCase().includes(searchLow)) matches.add(item.outlet);
      if (item.warehouseLocation && item.warehouseLocation.toLowerCase().includes(searchLow)) matches.add(item.warehouseLocation);
    });
    return Array.from(matches).slice(0, 8);
  }, [locationFilter, items]);

  const handleAiSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setIsAiSearching(true);
    try {
      const matchedIds = await processAiSearch(searchTerm, items);
      setAiFilteredIds(matchedIds);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiSearching(false);
    }
  }, [searchTerm, items]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    if (onSearchClear) onSearchClear();
    setAiFilteredIds(null);
    setSelectedBrands([]);
    setSelectedModels([]);
    setSelectedSuppliers([]);
    setSelectedOutlets([]);
    setSelectedWarehouseLocations([]);
    setClientFilter('');
    setJobFilter('');
    setLocationFilter('');
    setInventoryTypeFilter('');
    setStockInStart('');
    setStockInEnd('');
    setUpdatedStart('');
    setUpdatedEnd('');
  }, []);

  const uniqueValues = useMemo(() => {
    return {
      brands: Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[],
      models: Array.from(new Set(items.map(i => i.modelNumber).filter(Boolean))) as string[],
      suppliers: Array.from(new Set(items.map(i => i.supplier).filter(Boolean))) as string[],
      projects: Array.from(new Set(items.map(i => i.outlet).filter(Boolean))) as string[],
      warehouseLocations: Array.from(new Set(['Dip Room 35', 'AL Quoz', 'Home Box', 'Head Office', ...items.map(i => i.warehouseLocation).filter(Boolean)])) as string[],
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (aiFilteredIds !== null) {
      return items.filter(item => aiFilteredIds.includes(item.id));
    }
    
    return items.filter(item => {
      const searchLow = searchTerm.toLowerCase();
      
      // Basic Search
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLow) ||
        item.location.toLowerCase().includes(searchLow) ||
        (item.brand && item.brand.toLowerCase().includes(searchLow)) ||
        (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow)) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchLow));
      
      if (!matchesSearch) return false;

      // New Multi-select Filters
      if (selectedBrands.length > 0 && (!item.brand || !selectedBrands.includes(item.brand))) return false;
      if (selectedModels.length > 0 && (!item.modelNumber || !selectedModels.includes(item.modelNumber))) return false;
      if (selectedSuppliers.length > 0 && (!item.supplier || !selectedSuppliers.includes(item.supplier))) return false;
      if (selectedOutlets.length > 0 && (!item.outlet || !selectedOutlets.includes(item.outlet))) return false;
      if (selectedWarehouseLocations.length > 0 && (!item.warehouseLocation || !selectedWarehouseLocations.includes(item.warehouseLocation))) return false;

      // Legacy/Remaining Advanced Filters
      const clientLow = clientFilter.toLowerCase();
      const jobLow = jobFilter.toLowerCase();
      const locationLow = locationFilter.toLowerCase();

      if (clientFilter && !item.client?.toLowerCase().includes(clientLow)) return false;
      if (jobFilter && !item.jobNumber?.toLowerCase().includes(jobLow)) return false;
      if (locationFilter && !item.location?.toLowerCase().includes(locationLow)) return false;
      if (inventoryTypeFilter && item.inventoryType !== inventoryTypeFilter) return false;

      // Date Range Filters
      if (stockInStart) {
        const itemDate = getDateObject(item.stockInDate)?.getTime();
        if (!itemDate || itemDate < new Date(stockInStart).getTime()) return false;
      }
      if (stockInEnd) {
        const itemDate = getDateObject(item.stockInDate)?.getTime();
        if (!itemDate || itemDate > new Date(stockInEnd).setHours(23, 59, 59, 999)) return false;
      }
      if (updatedStart) {
        const itemDate = getDateObject(item.lastUpdated)?.getTime();
        if (!itemDate || itemDate < new Date(updatedStart).getTime()) return false;
      }
      if (updatedEnd) {
        const itemDate = getDateObject(item.lastUpdated)?.getTime();
        if (!itemDate || itemDate > new Date(updatedEnd).setHours(23, 59, 59, 999)) return false;
      }

      return true;
    });
  }, [items, searchTerm, aiFilteredIds, selectedBrands, selectedModels, selectedSuppliers, selectedOutlets, clientFilter, jobFilter, locationFilter, inventoryTypeFilter, stockInStart, stockInEnd, updatedStart, updatedEnd]);

  const getItemSize = useCallback((index: number) => {
    return expandedId === filteredItems[index]?.id ? 440 : 72;
  }, [expandedId, filteredItems]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [expandedId]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!item?.id || deletingId) return;
    
    setDeletingId(item.id);
    setInventoryError(null);
    try {
      console.log(`Starting deletion for item: ${item.id} (${item.name})`);
      let totalOps = 0;
      let batch = writeBatch(db);

      const commitBatch = async () => {
        if (totalOps > 0) {
          await batch.commit();
          batch = writeBatch(db);
          totalOps = 0;
        }
      };
      
      // 1. Fetch transactions for this item
      const txQuery = query(collection(db, 'transactions_log'), where('itemId', '==', item.id));
      const txSnapshot = await getDocs(txQuery);
      
      for (const txDoc of txSnapshot.docs) {
        batch.delete(txDoc.ref);
        totalOps++;
        if (totalOps >= 450) await commitBatch();
      }
      
      // 2. Delete the item
      batch.delete(doc(db, 'inventory', item.id));
      totalOps++;
      
      // 3. Commit remaining
      await commitBatch();

      // Cleanup local state
      if (expandedId === item.id) setExpandedId(null);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      setSelectedIds(prev => prev.filter(i => i !== item.id));
      setItemToDelete(null);

      // 4. Activity Log (Non-blocking)
      addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'DELETE_ITEM',
        details: `Deleted item: ${item.name} and ${txSnapshot.size} transactions`,
        createdAt: serverTimestamp()
      }).catch(e => console.warn('Logging failed:', e));
      
    } catch (err) {
      console.error('Delete operation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setInventoryError(`Delete failed: ${msg}`);
      handleFirestoreError(err, OperationType.DELETE, `inventory/${item.id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    
    setIsDeleting(true);
    setInventoryError(null);
    try {
      // Process in smaller chunks to be safe with Firestore limits and memory
      const itemChunks = [];
      for (let i = 0; i < selectedIds.length; i += 10) {
        itemChunks.push(selectedIds.slice(i, i + 10));
      }

      for (const itemChunk of itemChunks) {
        let totalOps = 0;
        let batch = writeBatch(db);

        const commitBatch = async () => {
          if (totalOps > 0) {
            await batch.commit();
            batch = writeBatch(db);
            totalOps = 0;
          }
        };

        // For each item in this chunk, mark it and its transactions for deletion
        for (const id of itemChunk) {
          // Find transactions
          const txQuery = query(collection(db, 'transactions_log'), where('itemId', '==', id));
          const txSnapshot = await getDocs(txQuery);
          
          for (const txDoc of txSnapshot.docs) {
            batch.delete(txDoc.ref);
            totalOps++;
            if (totalOps >= 450) await commitBatch();
          }

          // Mark item
          batch.delete(doc(db, 'inventory', id));
          totalOps++;
          if (totalOps >= 450) await commitBatch();
        }

        // Finish this chunk
        await commitBatch();
      }
      
      // Activity Log
      addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'BULK_DELETE_ITEMS',
        details: `Bulk deleted ${selectedIds.length} items`,
        createdAt: serverTimestamp()
      }).catch(e => console.warn('Logging failed:', e));
      
      setSelectedIds([]);
      setExpandedId(null);
    } catch (err) {
      console.error('Bulk delete operation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setInventoryError(`Bulk delete failed: ${msg}`);
      handleFirestoreError(err, OperationType.DELETE, 'inventory/bulk');
    } finally {
      setIsDeleting(false);
    }
  };

  const itemData = useMemo(() => ({
    items: filteredItems,
    expandedId,
    selectedIds,
    toggleSelectItem,
    toggleExpand,
    isApproved,
    isAdmin,
    canUpdateStock,
    openAdjustment,
    setEditingItem,
    setItemToDelete,
    deletingId
  }), [
    filteredItems,
    expandedId,
    selectedIds,
    toggleSelectItem,
    toggleExpand,
    isApproved,
    isAdmin,
    canUpdateStock,
    openAdjustment,
    setEditingItem,
    setItemToDelete,
    deletingId
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {inventoryError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-7xl"
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm font-bold text-red-500">{inventoryError}</p>
            </div>
            <button onClick={() => setInventoryError(null)} className="p-1 hover:bg-white/5 rounded-lg transition-all">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </motion.div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Inventory Stock</h1>
          <p className="text-[10px] md:text-sm text-slate-500 md:text-slate-400 uppercase font-black md:font-normal tracking-[0.1em]">Central Asset Grid • {items.length} Units</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button 
              onClick={() => generateInventoryReport(filteredItems, {
                search: searchTerm,
                brand: selectedBrands.join(', '),
                client: clientFilter,
                job: jobFilter,
                project: selectedOutlets.join(', '),
                location: locationFilter
              })}
              className="flex-shrink-0 flex items-center space-x-2 px-6 py-3.5 text-xs md:text-sm font-black text-amber-950 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl hover:scale-105 transition-all active:scale-95 group uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-y-0.5 transition-transform" />
              <span>Export PDF Data</span>
            </button>
          {isApproved && (
            <div className="flex items-center space-x-2 md:space-x-3">
              <button 
                onClick={() => inventoryFileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-shrink-0 flex items-center space-x-2 px-5 py-3 text-xs md:text-sm font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all active:scale-95 group uppercase tracking-[0.15em] shadow-lg shadow-indigo-500/10"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400 group-hover:animate-pulse" />}
                <span>{isImporting ? 'AI MAPPING...' : 'AI Import'}</span>
              </button>
              <input 
                type="file" 
                ref={inventoryFileInputRef} 
                onChange={handleInventoryExcelUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 flex items-center space-x-2 px-6 py-3 text-xs md:text-sm font-black text-slate-950 bg-gradient-to-r from-primary via-emerald-400 to-primary rounded-2xl bg-[length:200%_auto] hover:bg-right shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all duration-500 active:scale-95 group uppercase tracking-[0.2em]"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>Add Item</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-4 glass-morphism p-4 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 group">
            <motion.div
              animate={{ 
                scale: searchTerm ? 1.1 : 1,
                color: (searchTerm || isAiSearching) ? 'var(--color-primary)' : 'rgb(100 116 139)'
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              {isAiSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4 transition-colors" />
              )}
            </motion.div>
            <input 
              type="text" 
              placeholder={aiFilteredIds ? "Showing AI matches..." : "Search items or ask anything (e.g. show only low stock)..."} 
              className={cn(
                "w-full pl-10 pr-24 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium",
                aiFilteredIds && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              )}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchSuggestions(true);
                if (aiFilteredIds && !e.target.value) setAiFilteredIds(null);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <VoiceLanguageSelector 
                currentLang={currentLang} 
                onLangChange={setCurrentLang} 
                className="mr-1"
              />
              <button
                type="button"
                onClick={startListening}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/10 text-slate-500"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <AnimatePresence>
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchSuggestions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 space-y-1">
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchTerm(suggestion);
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                        >
                          <Search className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={handleAiSearch}
                disabled={isAiSearching || !searchTerm.trim()}
                className={cn(
                  "flex items-center space-x-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30",
                  aiFilteredIds 
                    ? "bg-gradient-to-r from-primary to-indigo-500 text-slate-950 shadow-lg shadow-primary/20" 
                    : "bg-white/10 hover:bg-primary hover:text-slate-950 text-slate-400 shadow-xl border border-white/5"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>{aiFilteredIds ? 'AI Matched' : 'AI Search'}</span>
              </button>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "flex items-center space-x-2 px-5 py-2.5 rounded-xl border transition-all duration-300",
              showAdvancedFilters 
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                : "bg-slate-800/50 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Filter className={cn("w-4 h-4", (selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || selectedWarehouseLocations.length > 0 || clientFilter || jobFilter || locationFilter || stockInStart || stockInEnd || updatedStart || updatedEnd) && "animate-bounce")} />
            <span className="text-sm font-black uppercase tracking-widest">Filters</span>
            {(selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || selectedWarehouseLocations.length > 0 || clientFilter || jobFilter || locationFilter || stockInStart || stockInEnd || updatedStart || updatedEnd) && (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FilterDropdown 
                  label="Brands" 
                  options={uniqueValues.brands} 
                  selected={selectedBrands} 
                  onChange={setSelectedBrands} 
                />
                
                <FilterDropdown 
                  label="Model Numbers" 
                  options={uniqueValues.models} 
                  selected={selectedModels} 
                  onChange={setSelectedModels} 
                />

                <FilterDropdown 
                  label="Suppliers" 
                  options={uniqueValues.suppliers} 
                  selected={selectedSuppliers} 
                  onChange={setSelectedSuppliers} 
                />

                <FilterDropdown 
                  label="Projects" 
                  options={uniqueValues.projects} 
                  selected={selectedOutlets} 
                  onChange={setSelectedOutlets} 
                />
                
                <FilterDropdown 
                  label="WH Location" 
                  options={uniqueValues.warehouseLocations} 
                  selected={selectedWarehouseLocations} 
                  onChange={setSelectedWarehouseLocations} 
                />

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Search</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={clientFilter}
                      onChange={(e) => {
                        setClientFilter(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      placeholder="Search clients..."
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <AnimatePresence>
                      {showClientSuggestions && clientSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowClientSuggestions(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                          >
                            <div className="p-2 space-y-1">
                              {clientSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setClientFilter(suggestion);
                                    setShowClientSuggestions(false);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                                >
                                  <Search className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-white transition-colors">{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Number</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={jobFilter}
                      onChange={(e) => {
                        setJobFilter(e.target.value);
                        setShowJobSuggestions(true);
                      }}
                      onFocus={() => setShowJobSuggestions(true)}
                      placeholder="Filter by Job#..."
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <AnimatePresence>
                      {showJobSuggestions && jobSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowJobSuggestions(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                          >
                            <div className="p-2 space-y-1">
                              {jobSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setJobFilter(suggestion);
                                    setShowJobSuggestions(false);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                                >
                                  <Search className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-white transition-colors">{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Type</label>
                  <select
                    value={inventoryTypeFilter}
                    onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  >
                    <option value="" className="bg-slate-900">All Stock Types</option>
                    <option value="Warehouse Stock" className="bg-slate-900">Warehouse Stock</option>
                    <option value="Client Stock" className="bg-slate-900">Client Stock</option>
                  </select>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Outlet</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={locationFilter}
                      onChange={(e) => {
                        setLocationFilter(e.target.value);
                        setShowLocationSuggestions(true);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      placeholder="Search outlets..."
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <AnimatePresence>
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowLocationSuggestions(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                          >
                            <div className="p-2 space-y-1">
                              {locationSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setLocationFilter(suggestion);
                                    setShowLocationSuggestions(false);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                                >
                                  <Search className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-white transition-colors">{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Date Filters Row */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock In (From)</label>
                  <input 
                    type="date"
                    value={stockInStart}
                    onChange={(e) => setStockInStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock In (To)</label>
                  <input 
                    type="date"
                    value={stockInEnd}
                    onChange={(e) => setStockInEnd(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Updated (From)</label>
                  <input 
                    type="date"
                    value={updatedStart}
                    onChange={(e) => setUpdatedStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Updated (To)</label>
                  <div className="flex space-x-2">
                    <input 
                      type="date"
                      value={updatedEnd}
                      onChange={(e) => setUpdatedEnd(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <button 
                      onClick={clearSearch}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Clear All Filters"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between pb-2 px-2">
                <div className="flex items-center space-x-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Matching Results: <span className="text-primary">{filteredItems.length}</span>
                  </p>
                </div>
                { (selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || clientFilter || jobFilter || locationFilter || stockInStart || stockInEnd || updatedStart || updatedEnd) && (
                  <button 
                    onClick={clearSearch}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inventory Grid/Table - Unified Virtualized View */}
      <div className="glass-morphism rounded-3xl border border-white/5 shadow-sm overflow-hidden h-[600px] relative">
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={filteredItems.length}
              itemSize={getItemSize}
              itemData={itemData}
            >
              {InventoryRow}
            </List>
          )}
        </AutoSizer>

        {filteredItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950/20 backdrop-blur-sm">
            <Search className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm font-medium">No units matching your current matrix</p>
            <button 
              onClick={clearSearch}
              className="mt-4 text-xs font-black text-primary uppercase tracking-widest hover:underline"
            >
              Clear Search Matrix
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {canUpdateStock && selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 border border-primary/30 rounded-full px-6 py-4 shadow-2xl shadow-primary/20 flex items-center space-x-6 backdrop-blur-xl"
          >
            <div className="flex items-center space-x-3 pr-6 border-r border-white/10">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold text-slate-200">Items Selected</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowBulkModal(true)}
                className="flex items-center space-x-2 px-5 py-2 text-sm font-black text-white bg-primary rounded-full hover:bg-primary-hover transition-all active:scale-95 uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Stock</span>
              </button>

              <button 
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center space-x-2 px-5 py-2 text-sm font-black text-red-400 bg-red-400/10 border border-red-400/20 rounded-full hover:bg-red-400/20 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete Batch'}</span>
              </button>
              
              <button 
                onClick={() => setSelectedIds([])}
                className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-morphism p-8 rounded-[40px] border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-amber-500" />
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center ring-1 ring-red-500/20">
                  <Trash className="w-10 h-10 text-red-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Confirm Deletion</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Permanently delete <span className="text-white font-bold">{itemToDelete.name}</span> and ALL its transaction history?
                    <br />
                    <span className="text-red-400/80 mt-2 block italic text-[11px]">This action is non-reversible.</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setItemToDelete(null)}
                    disabled={deletingId === itemToDelete.id}
                    className="py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all ring-1 ring-white/10"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(itemToDelete)}
                    disabled={deletingId === itemToDelete.id}
                    className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center space-x-2"
                  >
                    {deletingId === itemToDelete.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Delete Now</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            clients={clients}
            onClose={() => { setSelectedItem(null); setInitialAction(null); }} 
            onDelete={() => { setItemToDelete(selectedItem); setSelectedItem(null); }}
            user={user}
            initialAction={initialAction}
          />
        )}
        {adjustmentItem && adjustmentType && (
          <StockAdjustmentModal 
            item={adjustmentItem}
            type={adjustmentType}
            clients={clients}
            onClose={() => { setAdjustmentItem(null); setAdjustmentType(null); }}
            user={user}
          />
        )}
        {showBulkModal && (
          <BulkUpdateModal 
            items={items.filter(i => selectedIds.includes(i.id))}
            clients={clients}
            projects={projects}
            onClose={() => { setShowBulkModal(false); setSelectedIds([]); }}
            user={user}
          />
        )}
        {(showAddModal || editingItem) && (
          <ItemFormModal 
            item={editingItem} 
            items={items}
            clients={clients}
            projects={projects}
            onClose={() => { setShowAddModal(false); setEditingItem(null); }} 
            user={user}
          />
        )}
        {importPreview && (
          <ImportPreviewModal 
            data={importPreview} 
            onConfirm={handleConfirmImport} 
            onCancel={() => setImportPreview(null)} 
            isImporting={isImporting} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BulkUpdateModal({ items, clients, projects, onClose, user }: { items: InventoryItem[], clients: any[], projects: Project[], onClose: () => void, user: UserProfile }) {
  const [stockAction, setStockAction] = useState<'IN' | 'OUT' | null>(null);
  const [globalQty, setGlobalQty] = useState(1);
  const [individualQtys, setIndividualQtys] = useState<Record<string, number>>({});
  const [client, setClient] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [clientAssignment, setClientAssignment] = useState('');
  const [outlet, setOutlet] = useState('');
  const [location, setLocation] = useState('');
  const [transactionDate, setTransactionDate] = useState(formatDateForInput(new Date()));
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);

  const filteredProjects = useMemo(() => {
    if (!jobNumber.trim()) return projects.slice(0, 5);
    return projects.filter(p => 
      p.jobNumber.toLowerCase().includes(jobNumber.toLowerCase()) ||
      p.client.toLowerCase().includes(jobNumber.toLowerCase())
    ).slice(0, 8);
  }, [projects, jobNumber]);

  const handleProjectSelect = (p: Project) => {
    setJobNumber(p.jobNumber);
    setClient(p.client);
    setOutlet(p.outlet);
    setSelectedProjectId(p.id);
    setShowProjectSuggestions(false);
  };

  const isAuthorized = user.role === 'admin' || user.isApproved;

  if (!isAuthorized) return null;

  const handleBulkUpdate = async () => {
    if (!stockAction) return;
    setProcessing(true);
    try {
      const timestamp = new Date(transactionDate).getTime();
      
      await Promise.all(items.map(async (item) => {
          const itemQty = individualQtys[item.id] || globalQty;
          
          const tx: any = {
            itemId: item.id,
            itemName: item.name,
            brand: item.brand,
            modelNumber: item.modelNumber,
            type: stockAction,
            quantity: itemQty,
            client: client,
            jobNumber: jobNumber,
            outlet: outlet,
            location: location,
            warehouseLocation: warehouseLocation,
            clientAssignment: clientAssignment,
            inventoryType: item.inventoryType,
            notes: notes,
            date: timestamp,
            userId: user.uid,
            userName: user.displayName,
            isBulk: true
          };

          const newQuantity = item.currentQuantity + (stockAction === 'IN' ? itemQty : -itemQty);

          // 1. Log transaction
          await addDoc(collection(db, 'transactions_log'), tx);

          // 2. Update stock
          await updateDoc(doc(db, 'inventory', item.id), {
            currentQuantity: increment(stockAction === 'IN' ? itemQty : -itemQty),
            lastUpdated: serverTimestamp(),
            jobNumber: jobNumber || item.jobNumber,
            client: stockAction === 'IN' ? (client || item.client) : item.client,
            outlet: outlet || item.outlet,
            location: location || item.location,
            warehouseLocation: warehouseLocation || item.warehouseLocation || '',
            clientAssignment: clientAssignment || item.clientAssignment || ''
          });

        // 3. Low Stock Alert
        if (stockAction === 'OUT' && newQuantity <= item.minStock) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            type: 'LOW_STOCK',
            message: `BULK ALERT: ${item.name} is low! (${newQuantity} remaining)`,
            read: false,
            isPublic: true,
            createdAt: serverTimestamp()
          });
        }
      }));

      // 4. Global Notification for the bulk action
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type: 'STOCK_UPDATE',
        message: `BULK ${stockAction}: ${items.length} items updated by ${user.displayName}. Job #${jobNumber || 'N/A'}`,
        read: false,
        isPublic: true,
        createdAt: serverTimestamp()
      });

      // 5. Global Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'BULK_STOCK_UPDATE',
        details: `Bulk ${stockAction} for ${items.length} items. Job #${jobNumber || 'N/A'}`,
        createdAt: serverTimestamp()
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory_bulk');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70]" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl glass-morphism rounded-[40px] shadow-2xl z-[71] overflow-hidden border border-white/10 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.03] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Bulk Stock Adjustment</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Adjusting {items.length} items</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white group"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Item List with Quantities */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Selected Items & Quantities</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(item => (
                <div key={item.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Stock: {item.currentQuantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input 
                        type="number"
                        min="1"
                        className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-sm font-black text-primary outline-none focus:border-primary transition-all"
                        value={individualQtys[item.id] || globalQty}
                        onChange={(e) => setIndividualQtys(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setStockAction('IN')}
                    className={cn(
                      "py-4 font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 border duration-500",
                      stockAction === 'IN' 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]" 
                        : "bg-emerald-500/5 text-emerald-500 border-emerald-500/10 hover:bg-emerald-500/10"
                    )}
                  >
                    Stock IN
                  </button>
                  <button 
                    onClick={() => setStockAction('OUT')}
                    className={cn(
                      "py-4 font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 border duration-500",
                      stockAction === 'OUT' 
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]" 
                        : "bg-amber-500/5 text-amber-500 border-amber-500/10 hover:bg-amber-500/10"
                    )}
                  >
                    Stock OUT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Global Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={globalQty} 
                    onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Date</label>
                  <input 
                    type="date" 
                    value={transactionDate} 
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Reference Project / Job #</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input 
                    type="text" 
                    value={jobNumber} 
                    onChange={(e) => {
                      setJobNumber(e.target.value);
                      setShowProjectSuggestions(true);
                    }}
                    onFocus={() => setShowProjectSuggestions(true)}
                    placeholder="Search active projects..."
                    className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <AnimatePresence>
                  {showProjectSuggestions && filteredProjects.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProjectSelect(p)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left border-b border-white/[0.02] last:border-0"
                          >
                            <div className="flex items-center space-x-3">
                              <Building className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-bold text-white">{p.jobNumber}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.client}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                              p.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                            )}>{p.status}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Name</label>
                <input 
                  type="text" 
                  value={client} 
                  onChange={(e) => {
                    setClient(e.target.value);
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Client name..."
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <AnimatePresence>
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClient(c.name);
                              setShowClientSuggestions(false);
                            }}
                            className="w-full px-6 py-4 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.02] last:border-0"
                          >
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-white">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Warehouse Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                    <input 
                      type="text" 
                      value={warehouseLocation} 
                      onChange={(e) => setWarehouseLocation(e.target.value)}
                      placeholder="Aisle/Shelf..."
                      className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Assignment</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                    <input 
                      type="text" 
                      value={clientAssignment} 
                      onChange={(e) => setClientAssignment(e.target.value)}
                      placeholder="Team/User..."
                      className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Project</label>
                  <input 
                    type="text" 
                    value={outlet} 
                    onChange={(e) => setOutlet(e.target.value)}
                    placeholder="Project name..."
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Project Outlet Override</label>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New outlet location..."
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Transaction Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for this batch update..."
                  rows={2}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-white/[0.03] shrink-0">
          <button 
            onClick={handleBulkUpdate}
            disabled={processing || !stockAction}
            className={cn(
              "w-full py-5 text-slate-950 font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-4 duration-700 bg-[length:200%_auto] hover:bg-right",
              stockAction === 'IN' ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 shadow-emerald-500/30' : 
              stockAction === 'OUT' ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 shadow-amber-500/30' : 'bg-slate-700 text-white',
              processing && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            {processing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Zap className={cn("w-6 h-6", stockAction && "animate-pulse")} />
                <span>Execute Batch Adjustment</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function StockAdjustmentModal({ item, type, clients, onClose, user }: { item: InventoryItem, type: 'IN' | 'OUT', clients: any[], onClose: () => void, user: UserProfile }) {
  const [qty, setQty] = useState(1);
  const [client, setClient] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [jobNumber, setJobNumber] = useState(item.jobNumber || '');
  const [warehouseLocation, setWarehouseLocation] = useState(item.warehouseLocation || '');
  const [clientAssignment, setClientAssignment] = useState(item.clientAssignment || '');

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);
  const [outlet, setOutlet] = useState(item.outlet || '');
  const [location, setLocation] = useState(item.location || '');
  const [transactionDate, setTransactionDate] = useState(formatDateForInput(new Date()));
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const timestamp = new Date(transactionDate).getTime();
      const tx: any = {
        itemId: item.id,
        itemName: item.name,
        brand: item.brand,
        modelNumber: item.modelNumber,
        type: type,
        quantity: qty,
        client: client,
        jobNumber: jobNumber,
        outlet: outlet,
        location: location,
        warehouseLocation: warehouseLocation,
        clientAssignment: clientAssignment,
        inventoryType: item.inventoryType,
        notes: notes,
        date: timestamp,
        userId: user.uid,
        userName: user.displayName
      };
      
      await addDoc(collection(db, 'transactions_log'), tx);
      const newQuantity = item.currentQuantity + (type === 'IN' ? qty : -qty);
      
      await updateDoc(doc(db, 'inventory', item.id), {
        currentQuantity: increment(type === 'IN' ? qty : -qty),
        lastUpdated: serverTimestamp(),
        jobNumber: jobNumber,
        client: type === 'IN' ? (client || item.client) : item.client,
        outlet: outlet || item.outlet,
        location: location || item.location,
        warehouseLocation: warehouseLocation || item.warehouseLocation || '',
        clientAssignment: clientAssignment || item.clientAssignment || ''
      });

      // Add Notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type: 'STOCK_UPDATE',
        message: `STOCK ${type === 'IN' ? 'IN' : 'OUT'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        read: false,
        isPublic: true,
        createdAt: serverTimestamp()
      });

      // Low Stock Notification
      if (type === 'OUT' && newQuantity <= item.minStock) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'LOW_STOCK',
          message: `CRITICAL: ${item.name} is running low! (${newQuantity} units left)`,
          read: false,
          isPublic: true,
          createdAt: serverTimestamp()
        });
      }

      // Add Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'STOCK_UPDATE',
        details: `${type === 'IN' ? 'Stock In' : 'Stock Out'}: ${item.name} (${qty} units)`,
        createdAt: serverTimestamp()
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80]" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-xl glass-morphism rounded-[40px] shadow-2xl z-[81] overflow-hidden border border-white/10"
      >
        <div className={cn(
          "p-8 border-b border-white/5 flex justify-between items-center",
          type === 'IN' ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
              type === 'IN' ? "bg-green-500 shadow-green-500/20" : "bg-red-500 shadow-red-500/20"
            )}>
              {type === 'IN' ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">
                {type === 'IN' ? 'Stock Receiving' : 'Stock Distribution'}
              </h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                {item.name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white group"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdateStock} className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Transaction Date</label>
              <input 
                type="date" 
                required
                value={transactionDate} 
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Quantity</label>
              <input 
                type="number" 
                required
                min="1" 
                value={qty} 
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all opacity-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Job Number</label>
              <input 
                type="text" 
                value={jobNumber} 
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="#JOB-XYZ"
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Project</label>
              <input 
                type="text" 
                value={outlet} 
                onChange={(e) => setOutlet(e.target.value)}
                placeholder="Target Project..."
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Warehouse Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <input 
                  type="text" 
                  value={warehouseLocation} 
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  placeholder="Aisle / Shelf / Bin..."
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Assignment</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                <input 
                  type="text" 
                  value={clientAssignment} 
                  onChange={(e) => setClientAssignment(e.target.value)}
                  placeholder="Team / Dept / User..."
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">
              {type === 'IN' ? 'Supplier / Source' : 'Client / Destination'}
            </label>
            <input 
              type="text" 
              required
              value={client} 
              onChange={(e) => {
                setClient(e.target.value);
                setShowClientSuggestions(true);
              }}
              onFocus={() => setShowClientSuggestions(true)}
              placeholder="Entity Name..."
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
            <AnimatePresence>
              {showClientSuggestions && filteredClients.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[90] overflow-hidden backdrop-blur-xl"
                >
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClient(c.name);
                          setShowClientSuggestions(false);
                        }}
                        className="w-full px-6 py-4 flex items-center space-x-3 hover:bg-primary/10 transition-colors text-left border-b border-white/[0.02] last:border-0"
                      >
                        <Building className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-white">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Project Outlet</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Outlet Address / Note..."
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <button 
            type="submit"
            disabled={processing}
            className={cn(
              "w-full py-6 text-slate-950 font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-3 mt-4 duration-700 bg-[length:200%_auto] hover:bg-right px-10 overflow-hidden relative group",
              type === 'IN' 
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 shadow-emerald-500/30' 
                : 'bg-gradient-to-r from-amber-400 via-orange-600 to-amber-400 shadow-amber-500/30'
            )}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            {processing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5 group-hover:animate-pulse" />
                <span>{type === 'IN' ? 'Authorize Intake' : 'Release Asset'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </>
  );
}

function ItemDetailModal({ item, clients, onClose, onDelete, user, initialAction }: any) {
  const [stockAction, setStockAction] = useState<'IN' | 'OUT' | null>(initialAction || null);
  const [qty, setQty] = useState(1);
  const [client, setClient] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [jobNumber, setJobNumber] = useState(item.jobNumber || '');
  const [warehouseLocation, setWarehouseLocation] = useState(item.warehouseLocation || '');
  const [clientAssignment, setClientAssignment] = useState(item.clientAssignment || '');

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);
  const [outlet, setOutlet] = useState(item.outlet || '');
  const [location, setLocation] = useState(item.location || '');
  const [transactionDate, setTransactionDate] = useState(formatDateForInput(new Date()));
  const [notes, setNotes] = useState('');
  const isApproved = user.role === 'admin' || user.isApproved;

  const handleUpdateStock = async () => {
    if (!stockAction) return;
    try {
      const tx: any = {
        itemId: item.id,
        itemName: item.name,
        brand: item.brand,
        modelNumber: item.modelNumber,
        type: stockAction,
        quantity: qty,
        client: client,
        jobNumber: jobNumber,
        outlet: outlet,
        location: location,
        warehouseLocation: warehouseLocation,
        clientAssignment: clientAssignment,
        inventoryType: item.inventoryType,
        notes: notes,
        date: new Date(transactionDate).getTime(),
        userId: user.uid,
        userName: user.displayName
      };
      
      await addDoc(collection(db, 'transactions_log'), tx);
      const newQuantity = item.currentQuantity + (stockAction === 'IN' ? qty : -qty);
      
      await updateDoc(doc(db, 'inventory', item.id), {
        currentQuantity: increment(stockAction === 'IN' ? qty : -qty),
        lastUpdated: serverTimestamp(),
        jobNumber: jobNumber,
        client: stockAction === 'IN' ? (client || item.client) : item.client,
        outlet: outlet || item.outlet,
        location: location || item.location,
        warehouseLocation: warehouseLocation || item.warehouseLocation || '',
        clientAssignment: clientAssignment || item.clientAssignment || ''
      });

      // Add Notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type: 'STOCK_UPDATE',
        message: `STOCK ${stockAction === 'IN' ? 'IN' : 'OUT'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        read: false,
        isPublic: true,
        createdAt: serverTimestamp()
      });

      // Low Stock Notification
      if (stockAction === 'OUT' && newQuantity <= item.minStock) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'LOW_STOCK',
          message: `CRITICAL: ${item.name} is running low! (${newQuantity} remaining / Min: ${item.minStock})`,
          read: false,
          isPublic: true,
          createdAt: serverTimestamp()
        });
      }

      // Add Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'STOCK_UPDATE',
        details: `${stockAction === 'IN' ? 'Stock In' : 'Stock Out'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        createdAt: serverTimestamp()
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto pt-20" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl glass-morphism rounded-[40px] shadow-2xl z-[51] overflow-hidden border border-white/10"
      >
        <div className="relative h-56 bg-slate-900 overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-slate-800" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
          <div className="absolute top-6 right-6 flex items-center space-x-2">
            {isApproved && (
              <button 
                onClick={onDelete}
                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-md transition-all border border-red-500/20"
                title="Delete Item"
              >
                <Trash className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">{item.name}</h2>
            </div>
            <div className="text-right px-6 py-3 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Current Stock</p>
              <p className="text-4xl font-display font-bold text-primary">{item.currentQuantity}</p>
            </div>
          </div>

          <p className="mt-8 text-slate-300 text-sm leading-relaxed font-medium">{item.description || 'No description provided for this catalogued item.'}</p>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Brand</p>
              <p className="text-sm font-bold text-slate-200">{item.brand || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Model</p>
              <p className="text-sm font-bold text-slate-200">{item.modelNumber || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Supplier</p>
              <p className="text-sm font-bold text-slate-200">{item.supplier || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Project Outlet</p>
              <div className="flex items-center space-x-2 text-slate-200">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-bold">{item.location}</span>
              </div>
            </div>
            <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Threshold Alert</p>
              <div className="flex items-center space-x-2 text-slate-200">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="font-bold">{item.minStock} units</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-10 pt-10 border-t border-white/5">
            {isApproved ? (
              !stockAction ? (
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStockAction('IN')}
                    className="flex-1 py-4 bg-green-500/10 text-green-400 font-black uppercase tracking-widest rounded-2xl hover:bg-green-500/20 transition-all active:scale-95 border border-green-500/20"
                  >
                    Receiving Stock
                  </button>
                  <button 
                    onClick={() => setStockAction('OUT')}
                    className="flex-1 py-4 bg-red-500/10 text-red-400 font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20"
                  >
                    Distributing Stock
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-slide-in">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black uppercase tracking-widest text-white">
                      {stockAction === 'IN' ? 'Receiving Stock' : 'Distributing Stock'}
                    </span>
                    <button onClick={() => setStockAction(null)} className="text-xs text-slate-500 hover:text-white font-bold transition-colors">Cancel Operation</button>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-1 space-y-2">
                       <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Transaction Date</label>
                       <input 
                         type="date" 
                         value={transactionDate} 
                         onChange={(e) => setTransactionDate(e.target.value)}
                         className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                       />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Quantity</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={qty} 
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Job Number</label>
                      <input 
                        type="text" 
                        value={jobNumber} 
                        onChange={(e) => setJobNumber(e.target.value)}
                        placeholder="#JOB-123"
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Outlet</label>
                      <input 
                        type="text" 
                        value={outlet} 
                        onChange={(e) => setOutlet(e.target.value)}
                        placeholder="Select outlet..."
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Movement Location</label>
                      <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Floor/Zone..."
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Warehouse Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                        <input 
                          type="text" 
                          value={warehouseLocation} 
                          onChange={(e) => setWarehouseLocation(e.target.value)}
                          placeholder="Aisle / Shelf / Bin..."
                          className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Assignment</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                        <input 
                          type="text" 
                          value={clientAssignment} 
                          onChange={(e) => setClientAssignment(e.target.value)}
                          placeholder="Team / Dept / User..."
                          className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">
                      {stockAction === 'IN' ? 'Supplier / Source' : 'Client / Destination'}
                    </label>
                    <input 
                      type="text" 
                      value={client} 
                      onChange={(e) => {
                        setClient(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      placeholder="Organization name..."
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                    <AnimatePresence>
                      {showClientSuggestions && filteredClients.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredClients.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setClient(c.name);
                                  setShowClientSuggestions(false);
                                }}
                                className="w-full px-6 py-4 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.02] last:border-0"
                              >
                                <Building className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-white">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Additional Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter any transaction notes..."
                      rows={2}
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleUpdateStock}
                    className={`w-full py-5 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 ${
                      stockAction === 'IN' ? 'bg-green-600 shadow-green-600/30 hover:bg-green-500' : 'bg-red-600 shadow-red-600/30 hover:bg-red-500'
                    }`}
                  >
                    Authorize Transaction
                  </button>
                </div>
              )
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-amber-200">View-Only Access</p>
                <p className="text-xs text-amber-500/60 mt-1">Please verify your email or contact an administrator to perform stock updates.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ImportPreviewModal({ data, onConfirm, onCancel, isImporting }: { data: any[], onConfirm: () => void, onCancel: () => void, isImporting: boolean }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100]" onClick={onCancel} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-5xl h-[85vh] glass-morphism rounded-[40px] shadow-2xl z-[101] overflow-hidden border border-white/10 flex flex-col"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.03]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">AI Semantic Mapping Deep Dive</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Reviewing {data.length} processed entities</p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4 bg-white/5 first:rounded-l-2xl">Item Name</th>
                <th className="px-6 py-4 bg-white/5">Brand / Model</th>
                <th className="px-6 py-4 bg-white/5">Qty</th>
                <th className="px-6 py-4 bg-white/5">Category</th>
                <th className="px-6 py-4 bg-white/5">Location</th>
                <th className="px-6 py-4 bg-white/5 last:rounded-r-2xl">Ref</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  key={idx} 
                  className="group"
                >
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-l border-white/5 rounded-l-2xl group-hover:bg-white/[0.05] transition-colors">
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.supplier || 'No Supplier'}</p>
                  </td>
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-colors">
                    <p className="text-xs font-bold text-slate-300">{item.brand || '---'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.modelNumber || '---'}</p>
                  </td>
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-colors">
                    <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">{item.currentQuantity}</span>
                  </td>
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-colors">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category || 'Uncategorized'}</span>
                  </td>
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-300">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{item.warehouseLocation || item.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 bg-white/[0.02] border-y border-r border-white/5 rounded-r-2xl group-hover:bg-white/[0.05] transition-colors">
                    <p className="text-[10px] text-slate-600 font-mono">{item.jobNumber || 'N/A'}</p>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                  <Package className="w-4 h-4 text-slate-600" />
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400 italic">Total of {data.length} items mapped and ready for injection.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onCancel}
              className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
            >
              Abort Mission
            </button>
            <button 
              onClick={onConfirm}
              disabled={isImporting}
              className="px-10 py-5 bg-primary text-slate-950 font-black uppercase tracking-[0.3em] text-sm rounded-[24px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)] transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-3"
            >
              {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              <span>Commit AI Injection</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ItemFormModal({ item, items, clients, projects, onClose, user }: any) {
  const [loading, setLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [showWHLocationSuggestions, setShowWHLocationSuggestions] = useState(false);
  const [selectionStep, setSelectionStep] = useState(!item); // Only show selection for NEW items
  const isApproved = user.role === 'admin' || user.isApproved;

  if (!isApproved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-morphism p-8 rounded-[32px] border border-white/10 text-center"
        >
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-6">Your account is awaiting approval. Once approved, you will be able to manage inventory catalog records.</p>
          <button onClick={onClose} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all">Close</button>
        </motion.div>
      </div>
    );
  }

  const generateSku = (type: string) => {
    const prefix = type === 'Warehouse Stock' ? 'WH' : 'CL';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const [formData, setFormData] = useState({
    sku: item?.sku || '',
    name: item?.name || '',
    description: item?.description || '',
    location: item?.location || '',
    warehouseLocation: item?.warehouseLocation || '',
    clientAssignment: item?.clientAssignment || '',
    currentQuantity: item?.currentQuantity || 0,
    minStock: item?.minStock || 5,
    imageUrl: item?.imageUrl || '',
    jobNumber: item?.jobNumber || '',
    client: item?.client || '',
    stockInDate: formatDateForInput(item?.stockInDate || new Date()),
    brand: item?.brand || '',
    modelNumber: item?.modelNumber || '',
    supplier: item?.supplier || '',
    outlet: item?.outlet || '',
    inventoryType: item?.inventoryType || 'Warehouse Stock',
    stockInAmount: 0,
    stockOutAmount: 0,
  });

  const handleTypeSelect = (type: string) => {
    setFormData(prev => ({
      ...prev,
      inventoryType: type as any,
      sku: prev.sku || generateSku(type),
      // Reset relevant fields
      ...(type === 'Warehouse Stock' ? { client: '', jobNumber: '' } : {})
    }));
    setSelectionStep(false);
  };

  const filteredClients = useMemo(() => {
    if (!formData.client.trim()) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(formData.client.toLowerCase()));
  }, [clients, formData.client]);

  const filteredProjects = useMemo(() => {
    if (!formData.jobNumber.trim()) return projects.slice(0, 5);
    return projects.filter((p: any) => 
      p.jobNumber.toLowerCase().includes(formData.jobNumber.toLowerCase()) ||
      p.client.toLowerCase().includes(formData.jobNumber.toLowerCase())
    ).slice(0, 8);
  }, [projects, formData.jobNumber]);

  const handleProjectSelect = (p: any) => {
    setFormData(prev => ({
      ...prev,
      jobNumber: p.jobNumber,
      client: p.client,
      outlet: p.outlet || prev.outlet,
    }));
    setShowProjectSuggestions(false);
  };

  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateResults, setShowTemplateResults] = useState(false);

  const matchedTemplates = useMemo(() => {
    if (!templateSearch.trim()) return [];
    const lowSearch = templateSearch.toLowerCase();
    // Unique items by name/brand
    const uniqueItems: any[] = [];
    items.forEach((i: any) => {
      if (!uniqueItems.find(u => u.name === i.name && u.brand === i.brand)) {
        if (i.name.toLowerCase().includes(lowSearch)) {
          uniqueItems.push(i);
        }
      }
    });
    return uniqueItems.slice(0, 5);
  }, [items, templateSearch]);

  const selectTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      brand: template.brand || prev.brand,
      modelNumber: template.modelNumber || prev.modelNumber,
      description: template.description || prev.description,
      location: template.location || prev.location,
      warehouseLocation: template.warehouseLocation || prev.warehouseLocation,
      clientAssignment: template.clientAssignment || prev.clientAssignment,
      minStock: template.minStock || prev.minStock,
      supplier: template.supplier || prev.supplier,
      outlet: template.outlet || prev.outlet,
      inventoryType: template.inventoryType || prev.inventoryType,
      imageUrl: template.imageUrl || prev.imageUrl,
      // CRITICAL: Quantity is NOT copied
      currentQuantity: 0,
      stockInAmount: 0,
      stockOutAmount: 0
    }));
    setTemplateSearch('');
    setShowTemplateResults(false);
  };

  const otherVersions = useMemo(() => {
    if (!formData.name.trim()) return [];
    return items.filter((i: any) => 
      i.id !== item?.id && 
      i.name.toLowerCase() === formData.name.toLowerCase() &&
      (formData.brand ? i.brand?.toLowerCase() === formData.brand.toLowerCase() : true)
    );
  }, [items, formData.name, formData.brand, item?.id]);

  const duplicateItem = otherVersions.find(i => i.inventoryType === formData.inventoryType);
  const otherStockItems = otherVersions.filter(i => i.inventoryType !== formData.inventoryType);

  const handleAiSuggest = async () => {
    if (!formData.name.trim()) return;
    
    setIsSuggesting(true);
    const suggestion = await suggestItemDetails(formData.name, formData.brand, formData.modelNumber);
    setFormData(prev => ({
      ...prev,
      description: suggestion.description || prev.description,
      brand: suggestion.brand || prev.brand,
      modelNumber: suggestion.modelNumber || prev.modelNumber
    }));
    setIsSuggesting(false);
  };

  const handleAiDescriptionSuggest = async () => {
    if (!formData.name.trim()) return;
    
    setIsSuggesting(true);
    const suggestion = await suggestItemDetails(formData.name, formData.brand, formData.modelNumber);
    setFormData(prev => ({
      ...prev,
      description: suggestion.description || prev.description
    }));
    setIsSuggesting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (duplicateItem && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    setLoading(true);
    try {
      const finalQuantity = formData.currentQuantity + (formData.stockInAmount || 0) - (formData.stockOutAmount || 0);
      const data = {
        ...formData,
        currentQuantity: finalQuantity,
        stockInDate: new Date(formData.stockInDate).getTime(),
        lastUpdated: serverTimestamp(),
      };
      
      // Clean up internal UI state
      delete (data as any).stockOutAmount;
      delete (data as any).stockInAmount;

      if (item) {
        await updateDoc(doc(db, 'inventory', item.id), data);
        
        // If there was a stock in, log it
        if (formData.stockInAmount > 0) {
          await addDoc(collection(db, 'transactions_log'), {
            itemId: item.id,
            itemName: formData.name,
            brand: formData.brand,
            modelNumber: formData.modelNumber,
            type: 'IN',
            quantity: formData.stockInAmount,
            client: formData.client,
            jobNumber: formData.jobNumber,
            outlet: formData.outlet,
            location: formData.location,
            inventoryType: formData.inventoryType,
            warehouseLocation: formData.warehouseLocation,
            clientAssignment: formData.clientAssignment,
            notes: `Stock In adjusted during catalog edit`,
            date: serverTimestamp(),
            userId: user.uid,
            userName: user.displayName
          });
        }

        // If there was a stock out, log it
        if (formData.stockOutAmount > 0) {
          await addDoc(collection(db, 'transactions_log'), {
            itemId: item.id,
            itemName: formData.name,
            brand: formData.brand,
            modelNumber: formData.modelNumber,
            type: 'OUT',
            quantity: formData.stockOutAmount,
            client: formData.client,
            jobNumber: formData.jobNumber,
            outlet: formData.outlet,
            location: formData.location,
            inventoryType: formData.inventoryType,
            warehouseLocation: formData.warehouseLocation,
            clientAssignment: formData.clientAssignment,
            notes: `Stock Out adjusted during catalog edit`,
            date: serverTimestamp(),
            userId: user.uid,
            userName: user.displayName
          });

          // Low Stock Alert check
          if (finalQuantity <= formData.minStock) {
            await addDoc(collection(db, 'notifications'), {
              userId: user.uid,
              type: 'LOW_STOCK',
              message: `ALERT: ${formData.name} is low after adjustment! (${finalQuantity} remaining)`,
              read: false,
              isPublic: true,
              createdAt: serverTimestamp()
            });
          }
        }
      } else {
        const newItem = await addDoc(collection(db, 'inventory'), data);
        
        // Add Transaction Log for initial stock IN
        await addDoc(collection(db, 'transactions_log'), {
          itemId: newItem.id,
          itemName: formData.name,
          brand: formData.brand,
          modelNumber: formData.modelNumber,
          type: 'IN',
          quantity: formData.currentQuantity,
          client: formData.client,
          jobNumber: formData.jobNumber,
          outlet: formData.outlet,
          location: formData.location,
          inventoryType: formData.inventoryType,
          warehouseLocation: formData.warehouseLocation,
          clientAssignment: formData.clientAssignment,
          notes: `Initial stock record created`,
          date: serverTimestamp(),
          userId: user.uid,
          userName: user.displayName
        });

        // Notification for new item
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'NEW_ITEM',
          message: `NEW STOCK: ${formData.name} added with ${formData.currentQuantity} units. Job #${formData.jobNumber}`,
          read: false,
          isPublic: true,
          createdAt: serverTimestamp()
        });

        // Add Activity Log
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.uid,
          action: 'CREATE_ITEM',
          details: `Added new item: ${formData.name} with ${formData.currentQuantity} units.`,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-10 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl glass-morphism rounded-[40px] shadow-2xl z-[51] flex flex-col max-h-[90vh] border border-white/10"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.03] rounded-t-[40px]">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">{item ? 'Edit Catalog Entry' : 'New Inventory Record'}</h2>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
          {selectionStep ? (
            <div className="space-y-6 py-10">
              <div className="text-center space-y-2 mb-10">
                <h3 className="text-xl font-bold text-white tracking-tight">Select Inventory Destination</h3>
                <p className="text-sm text-slate-500">Is this for central warehouse stock or assigned to a specific client?</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => handleTypeSelect('Warehouse Stock')}
                  className="group relative p-8 glass-morphism rounded-[40px] border border-white/5 hover:border-primary/50 transition-all text-left flex flex-col items-center justify-center space-y-6 hover:bg-primary/5 shadow-2xl"
                >
                  <div className="w-20 h-20 rounded-[30px] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <Warehouse className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Warehouse</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">Central inventory for general storage and distribution</p>
                  </div>
                  <div className="px-5 py-2.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg shadow-primary/20">
                    Select WH- STOCK
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSelect('Client Stock')}
                  className="group relative p-8 glass-morphism rounded-[40px] border border-white/5 hover:border-amber-500/50 transition-all text-left flex flex-col items-center justify-center space-y-6 hover:bg-amber-500/5 shadow-2xl"
                >
                  <div className="w-20 h-20 rounded-[30px] bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <User className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Client Assignment</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">Dedicated stock allocated to specific client projects</p>
                  </div>
                  <div className="px-5 py-2.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg shadow-amber-500/20">
                    Select CL- STOCK
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
          {!item && (
            <div className="relative group">
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quick-Fill from Existing Catalog</label>
                <button 
                  type="button" 
                  onClick={() => setSelectionStep(true)}
                  className="flex items-center space-x-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                >
                  <ChevronDown className="w-3 h-3 rotate-90" />
                  <span>Switch to {formData.inventoryType === 'Warehouse Stock' ? 'Client' : 'Warehouse'}</span>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search existing items to copy details (Brand, Model)..."
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    setShowTemplateResults(true);
                  }}
                  onFocus={() => setShowTemplateResults(true)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              
              <AnimatePresence>
                {showTemplateResults && matchedTemplates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 z-10 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                  >
                    {matchedTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplate(template)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/[0.02] last:border-0 group"
                      >
                        <div className="text-left">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{template.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Brand: {template.brand || 'N/A'}</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence>
            {otherStockItems.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-[32px] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Global Stock Balance</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Cross-Reference Data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {otherStockItems.map((otherItem) => (
                    <div key={otherItem.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center space-x-3">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                          otherItem.inventoryType === "Warehouse Stock" ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-500"
                        )}>
                          {otherItem.inventoryType === "Warehouse Stock" ? "WH" : "CL"}
                        </span>
                        <p className="text-xs font-bold text-white tracking-tight">
                          {otherItem.inventoryType === "Client Stock" ? (otherItem.client || "Client Record") : (otherItem.location || "Warehouse")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-400">{otherItem.currentQuantity} Units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {duplicateItem && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-200">Potential Duplicate Detected</p>
                  <p className="text-xs text-amber-500/80 mt-1">
                    An item with the same Name ("{duplicateItem.name}") already exists in the catalog. 
                    {showDuplicateWarning ? ' Click "Proceed Anyway" to create it regardless.' : ' Please check if this is a mistake.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Inventory Code / SKU</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  value={formData.sku} 
                  onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} 
                  placeholder={formData.inventoryType === 'Warehouse Stock' ? 'WH-0000' : 'CL-0000'}
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all placeholder:opacity-30" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Classification</label>
              <div className="w-full px-5 py-4 bg-white/10 border border-white/10 rounded-2xl text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {formData.inventoryType === 'Warehouse Stock' ? <Warehouse className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-bold uppercase tracking-tight">{formData.inventoryType}</span>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  formData.inventoryType === 'Warehouse Stock' ? "bg-primary" : "bg-amber-500"
                )} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</label>
                <button 
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={isSuggesting || !formData.name.trim()}
                  className="flex items-center space-x-1 text-[9px] font-black text-primary hover:text-white disabled:opacity-30 transition-colors uppercase tracking-widest"
                >
                  {isSuggesting ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                  <span>AI Suggest</span>
                </button>
              </div>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Brand Name</label>
              <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="e.g., Apple, Bosch" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Model Number</label>
              <input value={formData.modelNumber} onChange={e => setFormData({...formData, modelNumber: e.target.value})} placeholder="e.g., v8.0, MX-200" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Supplier</label>
            <input value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Main supplier name..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label htmlFor="warehouseLocation" className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 cursor-pointer">Warehouse Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <input 
                  id="warehouseLocation"
                  value={formData.warehouseLocation} 
                  onChange={e => setFormData({...formData, warehouseLocation: e.target.value})} 
                  onFocus={() => setShowWHLocationSuggestions(true)}
                  placeholder="Select or type location..." 
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" 
                />
              </div>
              <AnimatePresence>
                {showWHLocationSuggestions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowWHLocationSuggestions(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                    >
                      <div className="p-2 space-y-1">
                        {['Dip Room 35', 'AL Quoz', 'Home Box', 'Head Office'].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, warehouseLocation: loc });
                              setShowWHLocationSuggestions(false);
                            }}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left rounded-xl"
                          >
                            <span className="text-sm font-bold text-slate-300">{loc}</span>
                            <ChevronDown className="w-4 h-4 text-slate-600 -rotate-90" />
                          </button>
                        ))}
                        <div className="h-px bg-white/5 mx-2 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, warehouseLocation: '' });
                            setShowWHLocationSuggestions(false);
                          }}
                          className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-primary/10 transition-colors text-left rounded-xl group"
                        >
                          <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                          <span className="text-xs font-black text-primary uppercase tracking-widest">Add new Location</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Client Assignment</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                <input value={formData.clientAssignment} onChange={e => setFormData({...formData, clientAssignment: e.target.value})} placeholder="e.g., Regional Logistics" className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Outlet</label>
              <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g., Store Front, Main Hall" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
              <button 
                type="button"
                onClick={handleAiDescriptionSuggest}
                disabled={isSuggesting || !formData.name.trim()}
                className="flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white disabled:opacity-30 transition-colors uppercase tracking-widest"
              >
                {isSuggesting ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Sparkles className="w-2.5 h-2.5" />
                )}
                <span>Suggest Detailed Description</span>
              </button>
            </div>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Technical details, features, or physical attributes..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm leading-relaxed focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Job Number</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input 
                    value={formData.jobNumber} 
                    onChange={e => {
                      setFormData({...formData, jobNumber: e.target.value});
                      setShowProjectSuggestions(true);
                    }} 
                    onFocus={() => setShowProjectSuggestions(true)}
                    placeholder="#JOB-000" 
                    className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" 
                  />
                </div>
                <AnimatePresence>
                  {showProjectSuggestions && filteredProjects.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                    >
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredProjects.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProjectSelect(p)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left border-b border-white/[0.02] last:border-0"
                          >
                            <div className="flex items-center space-x-3">
                              <Building className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-bold text-white">{p.jobNumber}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.client}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                              p.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                            )}>{p.status}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Client Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  value={formData.client} 
                  onChange={e => {
                    setFormData({...formData, client: e.target.value});
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Client Organization" 
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" 
                />
              </div>
              <AnimatePresence>
                {showClientSuggestions && filteredClients.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredClients.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, client: c.name });
                            setShowClientSuggestions(false);
                          }}
                          className="w-full px-6 py-4 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.02] last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white leading-tight">{c.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Verified Client</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project</label>
            <input 
              value={formData.outlet} 
              onChange={e => setFormData({...formData, outlet: e.target.value})} 
              placeholder={formData.inventoryType === 'Warehouse Stock' ? "Target Project Hub" : "Client Project Reference"} 
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" 
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Quantity Distribution</h4>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[9px] font-bold text-slate-400">Warehouse</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-bold text-slate-400">Client</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                formData.inventoryType === 'Warehouse Stock' ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 opacity-50"
              )}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Warehouse Stock</p>
                <p className={cn("text-xl font-black", formData.inventoryType === 'Warehouse Stock' ? "text-primary" : "text-slate-400")}>
                  {formData.inventoryType === 'Warehouse Stock' ? formData.currentQuantity : (otherStockItems.find(i => i.inventoryType === 'Warehouse Stock')?.currentQuantity || 0)}
                </p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                formData.inventoryType === 'Client Stock' ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/5 opacity-50"
              )}>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Stock</p>
                <p className={cn("text-xl font-black", formData.inventoryType === 'Client Stock' ? "text-amber-500" : "text-slate-400")}>
                  {formData.inventoryType === 'Client Stock' ? formData.currentQuantity : (otherStockItems.find(i => i.inventoryType === 'Client Stock')?.currentQuantity || 0)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                Adjust {formData.inventoryType === 'Warehouse Stock' ? 'Warehouse' : 'Client'} Balance
              </label>
              <div className="relative">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="number" value={formData.currentQuantity} onChange={e => setFormData({...formData, currentQuantity: parseInt(e.target.value) || 0})} className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
              </div>
            </div>

            {item && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-green-500 uppercase tracking-widest px-1">Stock In (+)</label>
                  <input 
                    type="number" 
                    value={formData.stockInAmount} 
                    onChange={e => setFormData({...formData, stockInAmount: Math.max(0, parseInt(e.target.value) || 0)})} 
                    placeholder="0"
                    className="w-full px-5 py-4 bg-green-500/5 border border-green-500/20 rounded-2xl text-green-400 font-bold focus:ring-2 focus:ring-green-500/30 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-1">Stock Out (-)</label>
                  <input 
                    type="number" 
                    value={formData.stockOutAmount} 
                    onChange={e => setFormData({...formData, stockOutAmount: Math.max(0, parseInt(e.target.value) || 0)})} 
                    placeholder="0"
                    className="w-full px-5 py-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 font-bold focus:ring-2 focus:ring-red-500/30 focus:outline-none transition-all" 
                  />
                </div>
              </div>
            )}

            {!item && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entry Date Signature</label>
                <input type="date" value={formData.stockInDate} onChange={e => setFormData({...formData, stockInDate: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Min Stock Alert</label>
              <input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Media Asset URL (Image)</label>
            <input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://images.unsplash.com/..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={cn(
              "w-full py-6 text-slate-950 font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 duration-700 bg-[length:200%_auto] hover:bg-right relative overflow-hidden group",
              showDuplicateWarning 
                ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 shadow-amber-500/40" 
                : "bg-gradient-to-r from-primary via-indigo-500 to-primary shadow-[0_10px_40px_-10px_rgba(var(--primary-rgb),0.5)]"
            )}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Synchronizing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>{showDuplicateWarning ? 'Proceed Anyway' : (item ? 'Update Registry' : 'Deploy New Asset')}</span>
              </div>
            )}
          </button>
          </>
          )}
        </form>
      </motion.div>
    </>
  );
}
