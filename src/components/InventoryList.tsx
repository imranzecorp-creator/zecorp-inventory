import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Edit, 
  Trash, 
  AlertCircle, 
  Package,
  Download,
  X,
  Loader2,
  CheckSquare,
  Square,
  Zap,
  Building,
  User,
  MapPin,
  Minus,
  ChevronDown,
  Hash,
  Sparkles,
  Warehouse,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  increment,
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { InventoryItem, UserProfile, Project } from '../types';
import { cn, formatDate, formatDateForInput, getDateObject } from '../lib/utils';
import { generateInventoryReport } from '../services/pdfService';
import { suggestItemDetails, processAiSearch, mapExcelItems, getExcelMapping, getAiAutocompleteSuggestions } from '../services/geminiService';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

import { InventoryListItem } from './InventoryListItem';
import { InventoryFilterBar } from './InventoryFilterBar';
import { ItemFormModal } from './modals/ItemFormModal';

interface InventoryListProps {
  items: InventoryItem[];
  clients: any[];
  user: UserProfile;
  projects: Project[];
  initialSearch?: string;
  onSearchClear?: () => void;
}

const InventoryList = React.forwardRef<HTMLDivElement, InventoryListProps>(({ items, clients, user, projects, initialSearch = '', onSearchClear }, ref) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('list');
  const inventoryFileInputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with '/'
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (deferredSearchTerm.length < 2) {
      setAiSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const suggestions = await getAiAutocompleteSuggestions(deferredSearchTerm, items);
      setAiSuggestions(suggestions);
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [deferredSearchTerm, items]);

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
              posNo: getVal('posNo') || '',
              dimensions: getVal('dimensions') || '',
              logistics: getVal('logistics') || '',
              origin: getVal('origin') || '',
              unitLocation: getVal('unitLocation') || '',
              alternateBrand: getVal('alternateBrand') || '',
              deliveryDate: getVal('delivery') || '',
              approvedQuote: getVal('approvedQuote') || '',
              eta: getVal('eta') || '',
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
            posNo: item.posNo || '',
            dimensions: item.dimensions || '',
            logistics: item.logistics || '',
            origin: item.origin || '',
            unitLocation: item.unitLocation || '',
            alternateBrand: item.alternateBrand || '',
            deliveryDate: item.delivery || '',
            approvedQuote: item.approvedQuote || '',
            eta: item.eta || '',
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
      try {
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.uid,
          action: 'AI_IMPORT_INVENTORY',
          details: `Imported ${importPreview.length} items via AI Mapping`,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Logging failed:', e);
      }

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
    setSelectedCategories([]);
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
    const getUnique = (arr: (string|undefined|null)[]) => {
      const seen = new Set<string>();
      return arr
        .filter(Boolean)
        .map(s => s!.trim())
        .filter(s => {
          const low = s.toLowerCase();
          if (seen.has(low)) return false;
          seen.add(low);
          return true;
        })
        .sort();
    };

    return {
      brands: getUnique(items.map(i => i.brand)),
      models: getUnique(items.map(i => i.modelNumber)),
      categories: getUnique(items.map(i => i.category)),
      suppliers: getUnique(items.map(i => i.supplier)),
      projects: getUnique(items.map(i => i.outlet)),
      warehouseLocations: getUnique(['Dip Room 35', 'AL Quoz', 'Home Box', 'Head Office', ...items.map(i => i.warehouseLocation)]),
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (aiFilteredIds !== null) {
      return items.filter(item => aiFilteredIds.includes(item.id));
    }
    
    const stockInStartTime = stockInStart ? new Date(stockInStart).getTime() : null;
    const stockInEndTime = stockInEnd ? new Date(stockInEnd).setHours(23, 59, 59, 999) : null;
    const updatedStartTime = updatedStart ? new Date(updatedStart).getTime() : null;
    const updatedEndTime = updatedEnd ? new Date(updatedEnd).setHours(23, 59, 59, 999) : null;

    return items.filter(item => {
      const searchLow = deferredSearchTerm.toLowerCase();
      
      // Basic Search
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLow) ||
        item.location.toLowerCase().includes(searchLow) ||
        (item.brand && item.brand.toLowerCase().includes(searchLow)) ||
        (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow)) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchLow)) ||
        (item.jobNumber && item.jobNumber.toLowerCase().includes(searchLow)) ||
        (item.client && item.client.toLowerCase().includes(searchLow)) ||
        (item.outlet && item.outlet.toLowerCase().includes(searchLow));
      
      if (!matchesSearch) return false;

      const includesCaseInsensitive = (arr: string[], val: string | undefined | null) => {
        if (!val) return false;
        const low = val.toLowerCase().trim();
        return arr.some(s => s.toLowerCase() === low);
      };

      // New Multi-select Filters
      if (selectedBrands.length > 0 && !includesCaseInsensitive(selectedBrands, item.brand)) return false;
      if (selectedModels.length > 0 && !includesCaseInsensitive(selectedModels, item.modelNumber)) return false;
      if (selectedCategories.length > 0 && !includesCaseInsensitive(selectedCategories, item.category)) return false;
      if (selectedSuppliers.length > 0 && !includesCaseInsensitive(selectedSuppliers, item.supplier)) return false;
      if (selectedOutlets.length > 0 && !includesCaseInsensitive(selectedOutlets, item.outlet)) return false;
      if (selectedWarehouseLocations.length > 0 && !includesCaseInsensitive(selectedWarehouseLocations, item.warehouseLocation)) return false;

      // Legacy/Remaining Advanced Filters
      const clientLow = clientFilter.toLowerCase();
      const jobLow = jobFilter.toLowerCase();
      const locationLow = locationFilter.toLowerCase();

      if (clientFilter && !item.client?.toLowerCase().includes(clientLow)) return false;
      if (jobFilter && !item.jobNumber?.toLowerCase().includes(jobLow)) return false;
      if (locationFilter && !item.location?.toLowerCase().includes(locationLow)) return false;
      if (inventoryTypeFilter && item.inventoryType !== inventoryTypeFilter) return false;

      // Date Range Filters
      if (stockInStartTime) {
        const itemDate = getDateObject(item.stockInDate)?.getTime();
        if (!itemDate || itemDate < stockInStartTime) return false;
      }
      if (stockInEndTime) {
        const itemDate = getDateObject(item.stockInDate)?.getTime();
        if (!itemDate || itemDate > stockInEndTime) return false;
      }
      if (updatedStartTime) {
        const itemDate = getDateObject(item.lastUpdated)?.getTime();
        if (!itemDate || itemDate < updatedStartTime) return false;
      }
      if (updatedEndTime) {
        const itemDate = getDateObject(item.lastUpdated)?.getTime();
        if (!itemDate || itemDate > updatedEndTime) return false;
      }

      return true;
    }).sort((a, b) => (a.warehouseLocation || '').localeCompare(b.warehouseLocation || ''));
  }, [items, deferredSearchTerm, aiFilteredIds, selectedBrands, selectedModels, selectedCategories, selectedSuppliers, selectedOutlets, selectedWarehouseLocations, clientFilter, jobFilter, locationFilter, inventoryTypeFilter, stockInStart, stockInEnd, updatedStart, updatedEnd]);

  const resultsCount = filteredItems.length;

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

      // 4. Activity Log
      try {
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.uid,
          action: 'DELETE_ITEM',
          details: `Deleted item: ${item.name} and ${txSnapshot.size} transactions`,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Logging failed:', e);
      }
      
    } catch (err) {
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
      ref={ref}
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
            {isApproved && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 flex items-center space-x-2 px-6 py-3.5 text-xs md:text-sm font-black text-slate-950 bg-gradient-to-r from-primary via-emerald-400 to-primary rounded-2xl bg-[length:200%_auto] hover:bg-right shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all duration-500 active:scale-95 group uppercase tracking-[0.2em]"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>Add Item</span>
              </button>
            )}
            <button 
              onClick={() => generateInventoryReport(filteredItems, {
                search: searchTerm,
                brand: selectedBrands.join(', '),
                category: selectedCategories.join(', '),
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
            </div>
          )}
        </div>
      </div>

      <InventoryFilterBar 
        ref={searchInputRef}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAiSearch={handleAiSearch}
        isAiSearching={isAiSearching}
        onClear={clearSearch}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        isListening={isListening}
        startListening={startListening}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        uniqueValues={uniqueValues}
        selectedBrands={selectedBrands}
        setSelectedBrands={setSelectedBrands}
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        selectedSuppliers={selectedSuppliers}
        setSelectedSuppliers={setSelectedSuppliers}
        selectedOutlets={selectedOutlets}
        setSelectedOutlets={setSelectedOutlets}
        selectedWarehouseLocations={selectedWarehouseLocations}
        setSelectedWarehouseLocations={setSelectedWarehouseLocations}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        showClientSuggestions={showClientSuggestions}
        setShowClientSuggestions={setShowClientSuggestions}
        clientSuggestions={clientSuggestions}
        jobFilter={jobFilter}
        setJobFilter={setJobFilter}
        showJobSuggestions={showJobSuggestions}
        setShowJobSuggestions={setShowJobSuggestions}
        jobSuggestions={jobSuggestions}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        showLocationSuggestions={showLocationSuggestions}
        setShowLocationSuggestions={setShowLocationSuggestions}
        locationSuggestions={locationSuggestions}
        inventoryTypeFilter={inventoryTypeFilter}
        setInventoryTypeFilter={setInventoryTypeFilter}
        aiSuggestions={aiSuggestions}
        showAiSuggestions={showAiSuggestions}
        setShowAiSuggestions={setShowAiSuggestions}
        viewMode={viewMode}
        setViewMode={setViewMode}
        resultsCount={resultsCount}
      />

      {/* Inventory List - Unified scrolling for better UX */}
      <div className="bg-black/20 rounded-[32px] border border-white/5 shadow-inner relative">
        <motion.div layout className="p-4 md:p-6 space-y-4">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredItems.map((item, index) => (
              <InventoryListItem 
                key={item.id}
                item={item}
                idx={index}
                viewMode={viewMode}
                isExpanded={expandedId === item.id}
                isSelected={selectedIds.includes(item.id)}
                onToggleExpand={toggleExpand}
                onToggleSelect={toggleSelectItem}
                onEdit={setEditingItem}
                onDelete={setItemToDelete}
                onAdjustment={openAdjustment}
                canUpdateStock={canUpdateStock}
                isAdmin={isAdmin}
                isApproved={isApproved}
                deletingId={deletingId}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-[#0f172a] border border-primary/30 rounded-full px-6 py-4 shadow-2xl shadow-primary/20 flex items-center space-x-6 backdrop-blur-xl"
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
              className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm"
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
});

export default InventoryList;

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
        <div className="relative h-56 bg-[#030712] overflow-hidden">
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

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#030712]/20">
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
