import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash, 
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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { InventoryItem, UserProfile } from '../types';
import { cn, formatDate } from '../lib/utils';
import { generateInventoryReport } from '../services/pdfService';
import { suggestItemDetails, processAiSearch } from '../services/geminiService';

import { FilterDropdown } from './ui/FilterDropdown';

interface InventoryListProps {
  items: InventoryItem[];
  clients: any[];
  user: UserProfile;
}

export default function InventoryList({ items, clients, user }: InventoryListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialAction, setInitialAction] = useState<'IN' | 'OUT' | null>(null);
  const [adjustmentItem, setAdjustmentItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT' | null>(null);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'Warehouse Stock' | 'Client Stock' | ''>('');

  const isAdmin = user.role === 'admin';
  const canUpdateStock = isAdmin || auth.currentUser?.emailVerified;

  const handleAiSearch = async () => {
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
  };

  const clearSearch = () => {
    setSearchTerm('');
    setAiFilteredIds(null);
    setSelectedBrands([]);
    setSelectedModels([]);
    setSelectedSuppliers([]);
    setSelectedOutlets([]);
    setClientFilter('');
    setJobFilter('');
    setLocationFilter('');
    setInventoryTypeFilter('');
  };

  const uniqueValues = useMemo(() => {
    return {
      brands: Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[],
      models: Array.from(new Set(items.map(i => i.modelNumber).filter(Boolean))) as string[],
      suppliers: Array.from(new Set(items.map(i => i.supplier).filter(Boolean))) as string[],
      outlets: Array.from(new Set(items.map(i => i.outlet).filter(Boolean))) as string[],
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
        item.sku?.toLowerCase().includes(searchLow) ||
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

      // Legacy/Remaining Advanced Filters
      const clientLow = clientFilter.toLowerCase();
      const jobLow = jobFilter.toLowerCase();
      const locationLow = locationFilter.toLowerCase();

      if (clientFilter && !item.client?.toLowerCase().includes(clientLow)) return false;
      if (jobFilter && !item.jobNumber?.toLowerCase().includes(jobLow)) return false;
      if (locationFilter && !item.location?.toLowerCase().includes(locationLow)) return false;
      if (inventoryTypeFilter && item.inventoryType !== inventoryTypeFilter) return false;

      return true;
    });
  }, [items, searchTerm, aiFilteredIds, selectedBrands, selectedModels, selectedSuppliers, selectedOutlets, clientFilter, jobFilter, locationFilter, inventoryTypeFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory Stock</h1>
          <p className="text-sm text-slate-400">Manage your items, check stock levels and locations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => generateInventoryReport(filteredItems, {
              search: searchTerm,
              brand: selectedBrands.join(', '),
              client: clientFilter,
              job: jobFilter,
              outlet: selectedOutlets.join(', '),
              location: locationFilter
            })}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
          >
            <motion.div
              whileHover={{ y: [0, -2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Download className="w-4 h-4" />
            </motion.div>
            <span>PDF Export</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-500 shadow-lg shadow-green-500/25 transition-all active:scale-95 group"
            >
              <motion.div
                whileHover={{ rotate: 90, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Plus className="w-4 h-4" />
              </motion.div>
              <span>Add Item</span>
            </button>
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
                if (aiFilteredIds && !e.target.value) setAiFilteredIds(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            />
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
                  "flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30",
                  aiFilteredIds ? "bg-primary text-white" : "bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white"
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>{aiFilteredIds ? 'AI Matched' : 'AI Search'}</span>
              </button>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all",
              showAdvancedFilters 
                ? "bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/10" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Filter className={cn("w-4 h-4", (selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || clientFilter || jobFilter || locationFilter) && "text-primary animate-pulse")} />
            <span className="text-sm font-medium">Advanced</span>
            {(selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || clientFilter || jobFilter || locationFilter) && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
                  label="Outlets" 
                  options={uniqueValues.outlets} 
                  selected={selectedOutlets} 
                  onChange={setSelectedOutlets} 
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Search</label>
                  <input 
                    type="text"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Number</label>
                  <input 
                    type="text"
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    placeholder="Filter by Job#..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Wh. Location</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      placeholder="Location..."
                      className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <button 
                      onClick={clearSearch}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Clear All Filters"
                    >
                      <Trash className="w-4 h-4" />
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
                { (selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || clientFilter || jobFilter || locationFilter) && (
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

      {/* Inventory Grid/Table */}
      <div className="glass-morphism rounded-3xl border border-white/5 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-left">
                {isAdmin && (
                  <th className="px-6 py-4 w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-slate-500 hover:text-primary transition-colors"
                    >
                      <AnimatePresence mode="wait">
                        {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                          <motion.div
                            key="checked"
                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <CheckSquare className="w-4 h-4 text-primary" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="unchecked"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <Square className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                {isAdmin && (
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.map((item) => (
                <React.Fragment key={item.id}>
                  <motion.tr 
                    layout
                    initial={false}
                    animate={{ 
                      backgroundColor: selectedIds.includes(item.id) ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0)",
                      scale: selectedIds.includes(item.id) ? 1.005 : 1,
                      x: selectedIds.includes(item.id) ? 4 : 0
                    }}
                    whileHover={{ backgroundColor: selectedIds.includes(item.id) ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.02)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={() => toggleExpand(item.id)}
                    className={cn(
                      "group cursor-pointer border-b border-white/[0.02] last:border-0",
                      selectedIds.includes(item.id) && "ring-1 ring-inset ring-primary/20",
                      expandedId === item.id && "bg-white/[0.03]"
                    )}
                  >
                    {isAdmin && (
                      <td className="px-6 py-3" onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}>
                        <div className="text-slate-500 group-hover:text-primary transition-colors">
                          <AnimatePresence mode="wait">
                            {selectedIds.includes(item.id) ? (
                              <motion.div
                                key="item-checked"
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 90 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              >
                                <CheckSquare className="w-4 h-4 text-primary" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="item-unchecked"
                                initial={{ scale: 0.8, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0.5 }}
                              >
                                <Square className="w-4 h-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                             <p className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors">{item.name}</p>
                             <motion.div
                                animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                                className="text-slate-600"
                             >
                               <ChevronDown className="w-3 h-3" />
                             </motion.div>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                              item.inventoryType === 'Client Stock' 
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                                : "bg-primary/10 text-primary border border-primary/20"
                            )}>
                              {item.inventoryType === 'Client Stock' ? 'Client' : 'Warehouse'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col space-y-1.5 min-w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-sm font-bold",
                            item.currentQuantity <= (item.minStock || 5) ? "text-amber-400" : "text-white"
                          )}>{item.currentQuantity}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">/ {(item.minStock || 5) * 5} Max</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((item.currentQuantity / ((item.minStock || 5) * 5 || 1)) * 100, 100)}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                item.currentQuantity <= (item.minStock || 5) ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-primary"
                              )}
                           />
                        </div>
                        {/* Cross-Stock Info */}
                        {(() => {
                           const otherTypeItems = items.filter(i => 
                             i.id !== item.id && 
                             i.name.toLowerCase() === item.name.toLowerCase() &&
                             i.inventoryType !== item.inventoryType &&
                             (item.brand ? i.brand?.toLowerCase() === item.brand.toLowerCase() : true)
                           );
                           const otherTotal = otherTypeItems.reduce((acc, curr) => acc + curr.currentQuantity, 0);
                           if (otherTotal === 0) return null;
                           return (
                             <div className="flex items-center space-x-1.5 mt-2">
                               <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                               <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-widest">
                                 {item.inventoryType === 'Warehouse Stock' ? 'CL' : 'WH'}: {otherTotal} Units
                               </span>
                             </div>
                           );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-1 text-slate-400 text-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        item.currentQuantity > item.minStock 
                          ? "bg-green-500/10 text-green-400" 
                          : item.currentQuantity === 0 
                            ? "bg-red-500/10 text-red-400" 
                            : "bg-amber-500/10 text-amber-400"
                      )}>
                        {item.currentQuantity > item.minStock ? 'Healthy' : item.currentQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end space-x-2">
                        {canUpdateStock && (
                          <div className="flex items-center space-x-1 mr-4 border-r border-white/5 pr-4">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); setAdjustmentItem(item); setAdjustmentType('IN'); }}
                              className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all border border-green-500/20"
                              title="Stock Receiving"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); setAdjustmentItem(item); setAdjustmentType('OUT'); }}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/20"
                              title="Stock Distribution"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex items-center space-x-2">
                            <motion.button 
                              whileHover={{ scale: 1.1, rotate: -5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                              className="p-2 text-slate-500 hover:text-primary hover:bg-white/10 rounded-lg transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                            >
                              <Trash className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>

                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/[0.01]"
                      >
                        <td colSpan={isAdmin ? 6 : 5} className="px-6 py-0 overflow-hidden">
                          <motion.div 
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="py-6 px-12 grid grid-cols-2 lg:grid-cols-4 gap-6 border-x border-white/5"
                          >
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock Category</p>
                              <p className="text-sm font-bold text-primary">{item.inventoryType || 'Warehouse Stock'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand & Model</p>
                              <p className="text-sm font-bold text-white">{item.brand || 'N/A'} {item.modelNumber || ''}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warehouse Location</p>
                              <div className="flex items-center space-x-2 text-primary group/loc">
                                <motion.div
                                  whileHover={{ y: -2 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <MapPin className="w-3 h-3" />
                                </motion.div>
                                <p className="text-sm font-bold">{item.location}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supplier</p>
                              <p className="text-sm font-bold text-slate-300">{item.supplier || 'Not Specified'}</p>
                            </div>
                            <div className="space-y-1 flex flex-col justify-end">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                className="flex items-center space-x-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline group"
                              >
                                <span>Full Stock Analysis</span>
                                <Info className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                            <div className="col-span-full pt-4 border-t border-white/5">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description</p>
                              <p className="text-sm text-slate-400 line-clamp-2 italic">{item.description || 'No description available.'}</p>
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredItems.map((item) => (
            <motion.div 
              key={item.id}
              layout
              onClick={() => toggleExpand(item.id)}
              className={cn(
                "p-4 transition-colors active:bg-white/5",
                selectedIds.includes(item.id) && "bg-primary/10",
                expandedId === item.id && "bg-white/[0.03]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative group">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <motion.div
                         whileHover={{ scale: 1.2, rotate: 5 }}
                         className="flex items-center justify-center"
                      >
                        <Package className="w-5 h-5 text-slate-600" />
                      </motion.div>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                        className={cn(
                          "absolute inset-0 flex items-center justify-center transition-opacity",
                          selectedIds.includes(item.id) ? "bg-primary/80 opacity-100" : "opacity-0"
                        )}
                      >
                        <CheckSquare className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5 tracking-wider truncate">{item.sku}</p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className={cn(
                      "text-lg font-black",
                      item.currentQuantity <= item.minStock ? "text-amber-500" : "text-white"
                    )}>{item.currentQuantity}</span>
                    {item.currentQuantity <= item.minStock && <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                    item.currentQuantity > item.minStock 
                      ? "text-green-500 bg-green-500/10" 
                      : item.currentQuantity === 0 
                        ? "text-red-500 bg-red-500/10" 
                        : "text-amber-500 bg-amber-500/10"
                  )}>
                    {item.currentQuantity > item.minStock ? 'Healthy' : 'Critical'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === item.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Location</p>
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-primary" />
                          <p className="text-xs font-bold truncate">{item.location}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Brand</p>
                        <p className="text-xs font-bold text-white truncate">{item.brand || 'Generic'}</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center space-x-2">
                          {canUpdateStock && (
                            <div className="flex items-center space-x-2 mr-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAdjustmentItem(item); setAdjustmentType('IN'); }}
                                className="w-9 h-9 flex items-center justify-center bg-green-500/10 text-green-500 rounded-xl border border-green-500/20 active:scale-90 transition-transform"
                                title="Stock Receiving"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAdjustmentItem(item); setAdjustmentType('OUT'); }}
                                className="w-9 h-9 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 active:scale-90 transition-transform"
                                title="Stock Distribution"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setInitialAction(null); }}
                            className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center space-x-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center space-x-4">
                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-2 text-slate-400 active:text-white"><Edit className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-red-500/50 active:text-red-500"><Trash className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
  {filteredItems.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>No items found matching your search</p>
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
                <span>Bulk Stock Update</span>
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

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            clients={clients}
            onClose={() => { setSelectedItem(null); setInitialAction(null); }} 
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
            onClose={() => { setShowBulkModal(false); setSelectedIds([]); }}
            user={user}
          />
        )}
        {(showAddModal || editingItem) && (
          <ItemFormModal 
            item={editingItem} 
            items={items}
            clients={clients}
            onClose={() => { setShowAddModal(false); setEditingItem(null); }} 
            user={user}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BulkUpdateModal({ items, clients, onClose, user }: { items: InventoryItem[], clients: any[], onClose: () => void, user: UserProfile }) {
  const [stockAction, setStockAction] = useState<'IN' | 'OUT' | null>(null);
  const [qty, setQty] = useState(1);
  const [client, setClient] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [jobNumber, setJobNumber] = useState('');
  const [outlet, setOutlet] = useState('');
  const [location, setLocation] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);

  const isAuthorized = user.role === 'admin' || auth.currentUser?.emailVerified;

  if (!isAuthorized) return null;

  const handleBulkUpdate = async () => {
    if (!stockAction) return;
    setProcessing(true);
    try {
      const timestamp = new Date(transactionDate).getTime();
      
      // Perform updates sequentially or in batches. Since this is client-side, we'll do promise.all
      await Promise.all(items.map(async (item) => {
          const tx: any = {
            itemId: item.id,
            itemName: item.name,
            itemSku: item.sku,
            brand: item.brand,
            modelNumber: item.modelNumber,
            type: stockAction,
            quantity: qty,
            client: client,
            jobNumber: jobNumber,
            outlet: outlet,
            location: location,
            inventoryType: item.inventoryType,
            notes: notes,
            date: timestamp,
            userId: user.uid,
            userName: user.displayName,
            isBulk: true
          };

          const newQuantity = item.currentQuantity + (stockAction === 'IN' ? qty : -qty);

          // 1. Log transaction
          await addDoc(collection(db, 'transactions_log'), tx);

          // 2. Update stock
          await updateDoc(doc(db, 'inventory', item.id), {
            currentQuantity: increment(stockAction === 'IN' ? qty : -qty),
            lastUpdated: Date.now(),
            jobNumber: jobNumber || item.jobNumber,
            client: stockAction === 'IN' ? (client || item.client) : item.client,
            outlet: outlet || item.outlet,
            location: location || item.location
          });

        // 3. Low Stock Alert
        if (stockAction === 'OUT' && newQuantity <= item.minStock) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            type: 'LOW_STOCK',
            message: `BULK ALERT: ${item.name} is low! (${newQuantity} remaining)`,
            read: false,
            isPublic: true,
            createdAt: timestamp
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
        createdAt: timestamp
      });

      // 5. Global Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'BULK_STOCK_UPDATE',
        details: `Bulk ${stockAction} for ${items.length} items. Job #${jobNumber || 'N/A'}`,
        createdAt: timestamp
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
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl glass-morphism rounded-[40px] shadow-2xl z-[71] overflow-hidden border border-white/10"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.03]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Bulk Stock Update</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Processing {items.length} items simultaneously</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white group"
          >
            <motion.div
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Items in scope</p>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <span key={item.id} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg border border-primary/20">
                  {item.name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setStockAction('IN')}
              className={cn(
                "py-4 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 border",
                stockAction === 'IN' 
                  ? "bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/30" 
                  : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
              )}
            >
              Bulk Receiving
            </button>
            <button 
              onClick={() => setStockAction('OUT')}
              className={cn(
                "py-4 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 border",
                stockAction === 'OUT' 
                  ? "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30" 
                  : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
              )}
            >
              Bulk Distributing
            </button>
          </div>

          <AnimatePresence>
            {stockAction && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Transaction Date</label>
                    <input 
                      type="date" 
                      value={transactionDate} 
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Quantity per item</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={qty} 
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Job Number</label>
                    <input 
                      type="text" 
                      value={jobNumber} 
                      onChange={(e) => setJobNumber(e.target.value)}
                      placeholder="#BULK-123"
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Outlet</label>
                    <input 
                      type="text" 
                      value={outlet} 
                      onChange={(e) => setOutlet(e.target.value)}
                      placeholder="Target outlet..."
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Warehouse Location</label>
                    <input 
                      type="text" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Location..."
                      className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client / Universal Source</label>
                  <input 
                    type="text" 
                    value={client} 
                    onChange={(e) => {
                      setClient(e.target.value);
                      setShowClientSuggestions(true);
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    placeholder="Shared client name..."
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
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Bulk Transaction Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Applied to all selected items..."
                    rows={2}
                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <button 
                  onClick={handleBulkUpdate}
                  disabled={processing}
                  className={cn(
                    "w-full py-5 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-3",
                    stockAction === 'IN' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500',
                    processing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Execute Bulk Transaction</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);
  const [outlet, setOutlet] = useState(item.outlet || '');
  const [location, setLocation] = useState(item.location || '');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
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
        itemSku: item.sku,
        brand: item.brand,
        modelNumber: item.modelNumber,
        type: type,
        quantity: qty,
        client: client,
        jobNumber: jobNumber,
        outlet: outlet,
        location: location,
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
        lastUpdated: Date.now(),
        jobNumber: jobNumber,
        client: type === 'IN' ? (client || item.client) : item.client,
        outlet: outlet || item.outlet,
        location: location || item.location
      });

      // Add Notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type: 'STOCK_UPDATE',
        message: `STOCK ${type === 'IN' ? 'IN' : 'OUT'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        read: false,
        isPublic: true,
        createdAt: Date.now()
      });

      // Low Stock Notification
      if (type === 'OUT' && newQuantity <= item.minStock) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'LOW_STOCK',
          message: `CRITICAL: ${item.name} is running low! (${newQuantity} units left)`,
          read: false,
          isPublic: true,
          createdAt: Date.now()
        });
      }

      // Add Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'STOCK_UPDATE',
        details: `${type === 'IN' ? 'Stock In' : 'Stock Out'}: ${item.name} (${qty} units)`,
        createdAt: Date.now()
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
                {item.name} • {item.sku}
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
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Client Outlet</label>
              <input 
                type="text" 
                value={outlet} 
                onChange={(e) => setOutlet(e.target.value)}
                placeholder="Target Outlet..."
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
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
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Location Address / Note</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Primary Location..."
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={processing}
            className={cn(
              "w-full py-5 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center space-x-3 mt-4",
              type === 'IN' ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' : 'bg-red-600 hover:bg-red-500 shadow-red-500/20',
              processing && "opacity-70 cursor-not-allowed"
            )}
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            <span>{type === 'IN' ? 'Confirm Reception' : 'Confirm Distribution'}</span>
          </button>
        </form>
      </motion.div>
    </>
  );
}

function ItemDetailModal({ item, clients, onClose, user, initialAction }: any) {
  const [stockAction, setStockAction] = useState<'IN' | 'OUT' | null>(initialAction || null);
  const [qty, setQty] = useState(1);
  const [client, setClient] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [jobNumber, setJobNumber] = useState(item.jobNumber || '');

  const filteredClients = useMemo(() => {
    if (!client.trim()) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(client.toLowerCase()));
  }, [clients, client]);
  const [outlet, setOutlet] = useState(item.outlet || '');
  const [location, setLocation] = useState(item.location || '');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleUpdateStock = async () => {
    if (!stockAction) return;
    try {
      const tx: any = {
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        brand: item.brand,
        modelNumber: item.modelNumber,
        type: stockAction,
        quantity: qty,
        client: client,
        jobNumber: jobNumber,
        outlet: outlet,
        location: location,
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
        lastUpdated: Date.now(),
        jobNumber: jobNumber,
        client: stockAction === 'IN' ? (client || item.client) : item.client,
        outlet: outlet || item.outlet,
        location: location || item.location
      });

      // Add Notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type: 'STOCK_UPDATE',
        message: `STOCK ${stockAction === 'IN' ? 'IN' : 'OUT'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        read: false,
        isPublic: true,
        createdAt: Date.now()
      });

      // Low Stock Notification
      if (stockAction === 'OUT' && newQuantity <= item.minStock) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'LOW_STOCK',
          message: `CRITICAL: ${item.name} is running low! (${newQuantity} remaining / Min: ${item.minStock})`,
          read: false,
          isPublic: true,
          createdAt: Date.now()
        });
      }

      // Add Activity Log
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.uid,
        action: 'STOCK_UPDATE',
        details: `${stockAction === 'IN' ? 'Stock In' : 'Stock Out'}: ${item.name} (${qty} units) for Job #${jobNumber || 'N/A'}`,
        createdAt: Date.now()
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
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Location</p>
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
            {user.role === 'admin' || auth.currentUser?.emailVerified ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Warehouse Location</label>
                      <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Warehouse or Client location..."
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
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

function ItemFormModal({ item, items, clients, onClose, user }: any) {
  const [loading, setLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const isAdmin = user.role === 'admin';

  if (!isAdmin) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={onClose} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md glass-morphism p-10 rounded-[40px] shadow-2xl z-[51] border border-white/10 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-6">Only administrators can create or modify inventory catalog records (codes and structural data).</p>
          <button onClick={onClose} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all">Close</button>
        </div>
      </>
    );
  }

  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    description: item?.description || '',
    location: item?.location || '',
    currentQuantity: item?.currentQuantity || 0,
    minStock: item?.minStock || 5,
    imageUrl: item?.imageUrl || '',
    jobNumber: item?.jobNumber || '',
    client: item?.client || '',
    stockInDate: item?.stockInDate ? new Date(item.stockInDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    brand: item?.brand || '',
    modelNumber: item?.modelNumber || '',
    supplier: item?.supplier || '',
    outlet: item?.outlet || '',
    inventoryType: item?.inventoryType || 'Warehouse Stock',
    stockInAmount: 0,
    stockOutAmount: 0,
  });

  const filteredClients = useMemo(() => {
    if (!formData.client.trim()) return clients;
    return clients.filter((c: any) => c.name.toLowerCase().includes(formData.client.toLowerCase()));
  }, [clients, formData.client]);

  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateResults, setShowTemplateResults] = useState(false);

  const matchedTemplates = useMemo(() => {
    if (!templateSearch.trim()) return [];
    const lowSearch = templateSearch.toLowerCase();
    // Unique items by name/brand
    const uniqueItems: any[] = [];
    items.forEach((i: any) => {
      if (!uniqueItems.find(u => u.name === i.name && u.brand === i.brand)) {
        if (i.name.toLowerCase().includes(lowSearch) || i.sku?.toLowerCase().includes(lowSearch)) {
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
      sku: template.sku || prev.sku,
      description: template.description || prev.description,
      // CRITICAL: Quantity is NOT copied
      currentQuantity: 0 
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
        lastUpdated: Date.now(),
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
            itemSku: formData.sku,
            brand: formData.brand,
            modelNumber: formData.modelNumber,
            type: 'IN',
            quantity: formData.stockInAmount,
            client: formData.client,
            jobNumber: formData.jobNumber,
            outlet: formData.outlet,
            location: formData.location,
            inventoryType: formData.inventoryType,
            notes: `Stock In adjusted during catalog edit`,
            date: Date.now(),
            userId: user.uid,
            userName: user.displayName
          });
        }

        // If there was a stock out, log it
        if (formData.stockOutAmount > 0) {
          await addDoc(collection(db, 'transactions_log'), {
            itemId: item.id,
            itemName: formData.name,
            itemSku: formData.sku,
            brand: formData.brand,
            modelNumber: formData.modelNumber,
            type: 'OUT',
            quantity: formData.stockOutAmount,
            client: formData.client,
            jobNumber: formData.jobNumber,
            outlet: formData.outlet,
            location: formData.location,
            inventoryType: formData.inventoryType,
            notes: `Stock Out adjusted during catalog edit`,
            date: Date.now(),
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
              createdAt: Date.now()
            });
          }
        }
      } else {
        const newItem = await addDoc(collection(db, 'inventory'), data);
        
        // Add Transaction Log for initial stock IN
        await addDoc(collection(db, 'transactions_log'), {
          itemId: newItem.id,
          itemName: formData.name,
          itemSku: formData.sku,
          brand: formData.brand,
          modelNumber: formData.modelNumber,
          type: 'IN',
          quantity: formData.currentQuantity,
          client: formData.client,
          jobNumber: formData.jobNumber,
          outlet: formData.outlet,
          location: formData.location,
          inventoryType: formData.inventoryType,
          notes: `Initial stock record created`,
          date: Date.now(),
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
          createdAt: Date.now()
        });

        // Add Activity Log
        await addDoc(collection(db, 'activity_logs'), {
          userId: user.uid,
          action: 'CREATE_ITEM',
          details: `Added new item: ${formData.name} with ${formData.currentQuantity} units.`,
          createdAt: Date.now()
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
          {!item && (
            <div className="relative group">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2 block">Quick-Fill from Existing Catalog</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search existing items to copy details (Brand, Model, SKU)..."
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
                          <p className="text-[10px] text-slate-500 font-mono">SKU: {template.sku} | Brand: {template.brand || 'N/A'}</p>
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Inventory Type</label>
              <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
                {['Warehouse Stock', 'Client Stock'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, inventoryType: type as any })}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      formData.inventoryType === type 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {type}
                  </button>
                ))}
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
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
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

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Storage Location</label>
              <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g., Aisle 4, Shelf B" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Job Number</label>
              <input value={formData.jobNumber} onChange={e => setFormData({...formData, jobNumber: e.target.value})} placeholder="#JOB-000" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Client</label>
              <input 
                value={formData.client} 
                onChange={e => {
                  setFormData({...formData, client: e.target.value});
                  setShowClientSuggestions(true);
                }}
                onFocus={() => setShowClientSuggestions(true)}
                placeholder="Client Name" 
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all font-mono" 
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
                      {filteredClients.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, client: c.name});
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
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Outlet</label>
            <input value={formData.outlet} onChange={e => setFormData({...formData, outlet: e.target.value})} placeholder="Outlet location..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
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
                <input type="number" required value={formData.currentQuantity} onChange={e => setFormData({...formData, currentQuantity: parseInt(e.target.value) || 0})} className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
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
              "w-full py-5 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50",
              showDuplicateWarning ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600" : "bg-primary shadow-primary/30 hover:bg-primary-hover hover:scale-[1.01]"
            )}
          >
            {loading ? 'Processing Registry...' : (showDuplicateWarning ? 'Proceed Anyway' : (item ? 'Update Inventory Member' : 'Deploy New Item'))}
          </button>
        </form>
      </motion.div>
    </>
  );
}
