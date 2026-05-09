import React from 'react';
import { 
  Search, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  Filter, 
  Mic, 
  MicOff,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FilterDropdown } from './ui/FilterDropdown';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';
import { cn } from '../lib/utils';

import { VoiceLanguage } from '../hooks/useVoiceSearch';

interface InventoryFilterBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onAiSearch: () => void;
  isAiSearching: boolean;
  onClear: () => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (val: boolean) => void;
  isListening: boolean;
  startListening: () => void;
  currentLang: VoiceLanguage;
  setCurrentLang: (val: VoiceLanguage) => void;
  
  // Advanced Filter states
  uniqueValues: {
    brands: string[];
    models: string[];
    categories: string[];
    suppliers: string[];
    projects: string[];
    warehouseLocations: string[];
  };
  selectedBrands: string[];
  setSelectedBrands: (val: string[]) => void;
  selectedModels: string[];
  setSelectedModels: (val: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (val: string[]) => void;
  selectedSuppliers: string[];
  setSelectedSuppliers: (val: string[]) => void;
  selectedOutlets: string[];
  setSelectedOutlets: (val: string[]) => void;
  selectedWarehouseLocations: string[];
  setSelectedWarehouseLocations: (val: string[]) => void;
  
  clientFilter: string;
  setClientFilter: (val: string) => void;
  showClientSuggestions: boolean;
  setShowClientSuggestions: (val: boolean) => void;
  clientSuggestions: string[];
  
  jobFilter: string;
  setJobFilter: (val: string) => void;
  showJobSuggestions: boolean;
  setShowJobSuggestions: (val: boolean) => void;
  jobSuggestions: string[];
  
  locationFilter: string;
  setLocationFilter: (val: string) => void;
  showLocationSuggestions: boolean;
  setShowLocationSuggestions: (val: boolean) => void;
  locationSuggestions: string[];
  
  inventoryTypeFilter: string;
  setInventoryTypeFilter: (val: any) => void;
  
  resultsCount: number;
}

export const InventoryFilterBar = React.memo(({
  searchTerm,
  setSearchTerm,
  onAiSearch,
  isAiSearching,
  onClear,
  showAdvancedFilters,
  setShowAdvancedFilters,
  isListening,
  startListening,
  currentLang,
  setCurrentLang,
  uniqueValues,
  selectedBrands,
  setSelectedBrands,
  selectedModels,
  setSelectedModels,
  selectedCategories,
  setSelectedCategories,
  selectedSuppliers,
  setSelectedSuppliers,
  selectedOutlets,
  setSelectedOutlets,
  selectedWarehouseLocations,
  setSelectedWarehouseLocations,
  clientFilter,
  setClientFilter,
  showClientSuggestions,
  setShowClientSuggestions,
  clientSuggestions,
  jobFilter,
  setJobFilter,
  showJobSuggestions,
  setShowJobSuggestions,
  jobSuggestions,
  locationFilter,
  setLocationFilter,
  showLocationSuggestions,
  setShowLocationSuggestions,
  locationSuggestions,
  inventoryTypeFilter,
  setInventoryTypeFilter,
  resultsCount
}: InventoryFilterBarProps) => {
  return (
    <div className="bg-[#0f172a]/60 backdrop-blur-3xl border-b border-white/5 p-4 md:p-6 space-y-4 relative z-50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-all" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Matrix by SKU, Brand, or Location..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-32 text-sm font-black text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all uppercase tracking-widest italic"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {searchTerm && (
                <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <div className="h-6 w-px bg-white/10 mx-1" />
              <button 
                onClick={startListening}
                className={cn(
                  "p-2.5 rounded-xl transition-all relative overflow-hidden group/voice",
                  isListening ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4 group-hover/voice:scale-110 transition-transform" />}
              </button>
              <VoiceLanguageSelector currentLang={currentLang} onLangChange={setCurrentLang} />
            </div>
          </div>
          
          <button 
            onClick={onAiSearch}
            disabled={isAiSearching || !searchTerm}
            className={cn(
              "hidden md:flex items-center space-x-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
              isAiSearching || !searchTerm 
                ? "bg-slate-800 text-slate-600 cursor-not-allowed" 
                : "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
            )}
          >
            {isAiSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>AI Insight</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3 self-end lg:self-auto">
          <div className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl hidden sm:flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{resultsCount} Units Filtered</span>
          </div>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "px-6 py-4 rounded-2xl flex items-center space-x-3 font-black text-[10px] uppercase tracking-widest transition-all border group",
              showAdvancedFilters 
                ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" 
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            )}
          >
            <Filter className={cn("w-4 h-4 transition-transform", showAdvancedFilters && "rotate-180")} />
            <span>Matrix Filters</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transitionEnd: { overflow: "visible" }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              overflow: "hidden" 
            }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 pb-32">
              <FilterDropdown 
                label="Warehouse Location" 
                options={uniqueValues.warehouseLocations} 
                selected={selectedWarehouseLocations} 
                onChange={setSelectedWarehouseLocations} 
              />

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
                label="Categories" 
                options={uniqueValues.categories} 
                selected={selectedCategories} 
                onChange={setSelectedCategories} 
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Stock Type</label>
                <select
                  value={inventoryTypeFilter}
                  onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="" className="bg-[#0f172a]">All Stock Types</option>
                  <option value="Warehouse Stock" className="bg-[#0f172a]">Warehouse Stock</option>
                  <option value="Client Stock" className="bg-[#0f172a]">Client Stock</option>
                </select>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Project Outlet</label>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

InventoryFilterBar.displayName = 'InventoryFilterBar';
