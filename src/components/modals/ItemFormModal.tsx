import React, { useState, useMemo } from 'react';
import { 
  X, 
  AlertCircle, 
  Warehouse, 
  User, 
  Search, 
  Building, 
  Plus, 
  Hash, 
  Package, 
  ChevronDown, 
  Sparkles, 
  Loader2,
  MapPin,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { InventoryItem, UserProfile, Project } from '../../types';
import { cn, formatDateForInput } from '../../lib/utils';
import { suggestItemDetails } from '../../services/geminiService';

interface ItemFormModalProps {
  item?: InventoryItem | null;
  items: InventoryItem[];
  clients: any[];
  projects: Project[];
  onClose: () => void;
  user: UserProfile;
}

export function ItemFormModal({ item, items, clients, projects, onClose, user }: ItemFormModalProps) {
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
    stockInDate: formatDateForInput(item?.stockInDate ? new Date(item.stockInDate) : new Date()),
    brand: item?.brand || '',
    modelNumber: item?.modelNumber || '',
    category: item?.category || '',
    supplier: item?.supplier || '',
    outlet: item?.outlet || '',
    inventoryType: item?.inventoryType || 'Warehouse Stock',
    dimensions: item?.dimensions || '',
    logistics: item?.logistics || '',
    origin: item?.origin || '',
    unitLocation: item?.unitLocation || '',
    alternateBrand: item?.alternateBrand || '',
    approvedQuote: item?.approvedQuote || '',
    eta: item?.eta || '',
    deliveryDate: item?.deliveryDate || '',
    posNo: item?.posNo || '',
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] overflow-y-auto" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="fixed top-10 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl glass-morphism rounded-[40px] shadow-2xl z-[101] flex flex-col max-h-[90vh] border border-white/10"
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
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Category / Type</label>
              <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g., Lighting, Audio" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pos No</label>
              <input value={formData.posNo} onChange={e => setFormData({...formData, posNo: e.target.value})} placeholder="e.g., POS-001" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dimensions</label>
              <input value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} placeholder="e.g., 100x50x20 cm" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Origin</label>
              <input value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} placeholder="e.g., Germany" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Logistics</label>
              <input value={formData.logistics} onChange={e => setFormData({...formData, logistics: e.target.value})} placeholder="e.g., Sea Freight" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Unit Location</label>
              <input value={formData.unitLocation} onChange={e => setFormData({...formData, unitLocation: e.target.value})} placeholder="e.g., Bin-42" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">ETA</label>
              <input value={formData.eta} onChange={e => setFormData({...formData, eta: e.target.value})} placeholder="e.g., 2024-12-01" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Delivery Date</label>
              <input value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} placeholder="e.g., 2024-12-05" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Approved Quote</label>
              <input value={formData.approvedQuote} onChange={e => setFormData({...formData, approvedQuote: e.target.value})} placeholder="Quote reference..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Alt Brand</label>
              <input value={formData.alternateBrand} onChange={e => setFormData({...formData, alternateBrand: e.target.value})} placeholder="Alternate suggestion..." className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{item ? 'Stock Reference Date' : 'Entry Date Signature'}</label>
              <input type="date" value={formData.stockInDate} onChange={e => setFormData({...formData, stockInDate: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all" />
            </div>
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
