import React, { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  Trash, 
  Layout, 
  Briefcase, 
  User, 
  Hash, 
  Store, 
  Package, 
  ChevronRight,
  X,
  Edit,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  Filter,
  MapPin,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Building,
  FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Project, InventoryItem, UserProfile, ProjectItem, StockTransaction } from '../types';
import { cn, formatDate } from '../lib/utils';
import { FilterDropdown } from './ui/FilterDropdown';
import { Clock, History } from 'lucide-react';

interface ProjectsProps {
  projects: Project[];
  inventory: InventoryItem[];
  clients: any[];
  user: UserProfile;
  transactions: StockTransaction[];
}

export default function Projects({ projects, inventory, clients, user, transactions }: ProjectsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Group rows by Job Number
        const projectsMap = new Map<string, any>();

        data.forEach((row: any) => {
          const jobNumber = String(row['Job Number'] || row['jobNumber'] || '').trim();
          if (!jobNumber) return;

          if (!projectsMap.has(jobNumber)) {
            projectsMap.set(jobNumber, {
              client: String(row['Client'] || row['client'] || 'Unknown').trim(),
              jobNumber: jobNumber,
              outlet: String(row['Project'] || row['outlet'] || 'General').trim(),
              location: String(row['Project Outlet'] || row['location'] || row['Site Location'] || '').trim(),
              status: 'Active',
              items: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              userId: user.uid,
              totalQuantityIn: 0,
              totalQuantityOut: 0
            });
          }

          const projectData = projectsMap.get(jobNumber);
          const itemName = String(row['Item Name'] || row['name'] || '').trim();
          if (itemName) {
            projectData.items.push({
              inventoryItemId: `EXT-${Math.random().toString(36).substr(2, 9)}`,
              name: itemName,
              brand: String(row['Brand'] || row['brand'] || '').trim(),
              model: String(row['Model'] || row['model'] || '').trim(),
              quantity: Number(row['Quantity'] || row['quantity'] || 0),
              supplier: String(row['Supplier'] || row['supplier'] || '').trim(),
              quantityIn: 0,
              quantityOut: 0
            });
          }
        });

        // Upload to Firestore
        const batch = Array.from(projectsMap.values());
        for (const projectPayload of batch) {
          try {
            await addDoc(collection(db, 'projects'), projectPayload);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'projects');
          }
        }

        alert(`Successfully imported ${batch.length} projects!`);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert('Failed to parse Excel file. Please ensure correct format.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  }, [user.uid]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'Active').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      inventoryLinked: projects.reduce((sum, p) => sum + (p.items?.length || 0), 0)
    };
  }, [projects]);

  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);

  const uniqueValues = useMemo(() => {
    return {
      statuses: Array.from(new Set(projects.map(p => p.status).filter(Boolean))) as string[],
      clients: Array.from(new Set(projects.map(p => p.client).filter(Boolean))) as string[],
      projects: Array.from(new Set(projects.map(p => p.outlet).filter(Boolean))) as string[],
      outlets: Array.from(new Set(projects.map(p => p.location).filter(Boolean))) as string[],
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Global Search
      const searchLow = searchTerm.toLowerCase();
      const matchesGlobal = !searchTerm || 
        p.client.toLowerCase().includes(searchLow) ||
        p.jobNumber.toLowerCase().includes(searchLow) ||
        (p.outlet?.toLowerCase() || '').includes(searchLow) ||
        (p.location?.toLowerCase() || '').includes(searchLow);
      
      if (!matchesGlobal) return false;

      // Advanced Filters
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status)) return false;
      if (selectedClients.length > 0 && !selectedClients.includes(p.client)) return false;
      if (selectedProjects.length > 0 && (!p.outlet || !selectedProjects.includes(p.outlet))) return false;
      if (selectedOutlets.length > 0 && (!p.location || !selectedOutlets.includes(p.location))) return false;
      
      if (jobSearch && !p.jobNumber.toLowerCase().includes(jobSearch.toLowerCase())) return false;

      return true;
    });
  }, [projects, searchTerm, selectedStatuses, selectedClients, selectedProjects, selectedOutlets, jobSearch]);

  const clearFilters = useCallback(() => {
    setSelectedStatuses([]);
    setSelectedClients([]);
    setSelectedProjects([]);
    setSelectedOutlets([]);
    setJobSearch('');
    setSearchTerm('');
  }, []);

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This will remove all linked records.')) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      setSelectedProject(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32 md:pb-0"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Project Control</h1>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Enterprise Asset Management & Logistics</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto pb-2 md:pb-0 custom-scrollbar-hide">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex-shrink-0 flex items-center space-x-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border transition-all text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95",
              showFilters 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/25" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Filter</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-shrink-0 flex items-center space-x-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <FileUp className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            <span>{isImporting ? 'Importing...' : 'Excel'}</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="hidden md:flex flex-shrink-0 items-center space-x-2 px-5 py-3 text-xs font-black text-white bg-primary rounded-2xl hover:bg-primary/90 shadow-xl shadow-primary/30 transition-all active:scale-95 group uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            <span>Engage New Project</span>
          </button>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddModal(true)}
        className="md:hidden fixed bottom-24 right-5 w-16 h-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-[55] border-4 border-slate-900"
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* DASHBOARD SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Jobs', value: stats.total, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Active Pipeline', value: stats.active, icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Finalized', value: stats.completed, icon: Save, color: 'text-slate-400', bg: 'bg-slate-500/10' },
          { label: 'SKU Allocation', value: stats.inventoryLinked, icon: Package, color: 'text-primary', bg: 'bg-primary/10' }
        ].map((stat, i) => (
          <div key={i} className="glass-morphism p-5 md:p-6 rounded-[32px] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border border-white/5", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{stat.label}</p>
                <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
              </div>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '100%' }}
                 transition={{ duration: 1, delay: i * 0.1 }}
                 className={cn("h-full", stat.bg.replace('/10', ''))} 
               />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-morphism p-8 rounded-[32px] border border-white/10 space-y-6 mb-8">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Filter className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Refine Project List</h3>
                </div>
                {(selectedStatuses.length > 0 || selectedClients.length > 0 || selectedProjects.length > 0 || selectedOutlets.length > 0 || jobSearch || searchTerm) && (
                  <button 
                    onClick={clearFilters}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <FilterDropdown 
                  label="Status" 
                  options={uniqueValues.statuses} 
                  selected={selectedStatuses} 
                  onChange={setSelectedStatuses} 
                />
                
                <FilterDropdown 
                  label="Clients" 
                  options={uniqueValues.clients} 
                  selected={selectedClients} 
                  onChange={setSelectedClients} 
                />

                <FilterDropdown 
                  label="Projects" 
                  options={uniqueValues.projects} 
                  selected={selectedProjects} 
                  onChange={setSelectedProjects} 
                />

                <FilterDropdown 
                  label="Project Outlets" 
                  options={uniqueValues.outlets} 
                  selected={selectedOutlets} 
                  onChange={setSelectedOutlets} 
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job # Filter</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      placeholder="e.g. JN-2024"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Matching Results: <span className="text-primary">{filteredProjects.length}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Global search by client, job number, or project..." 
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onClick={() => setSelectedProject(project)}
              onEdit={() => setEditingProject(project)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredProjects.length === 0 && (
        <div className="py-20 text-center glass-morphism rounded-3xl border border-white/5">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <h3 className="text-lg font-bold text-slate-300">No Projects Found</h3>
          <p className="text-sm text-slate-500 mt-1">Start by creating a new job record.</p>
        </div>
      )}

      <AnimatePresence>
        {(showAddModal || editingProject) && (
          <ProjectFormModal 
            project={editingProject} 
            inventory={inventory} 
            clients={clients}
            onClose={() => { setShowAddModal(false); setEditingProject(null); }}
            user={user}
          />
        )}
        {selectedProject && (
          <ProjectDetailModal 
            project={selectedProject} 
            inventory={inventory}
            transactions={transactions}
            onClose={() => setSelectedProject(null)}
            onDelete={() => handleDeleteProject(selectedProject.id)}
            isApproved={user.role === 'admin' || user.isApproved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectCard({ project, onClick, onEdit }: { project: Project, onClick: () => void, onEdit: (e: any) => void }) {
  const itemCount = project.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  return (
    <motion.div
      layout
      whileHover={window.innerWidth > 768 ? { y: -5, scale: 1.02 } : {}}
      className="glass-morphism p-5 md:p-6 rounded-3xl border border-white/5 shadow-sm group cursor-pointer relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 p-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(e); }}
          className="p-2.5 bg-white/10 active:bg-white/20 rounded-xl text-slate-300 transition-all shadow-inner"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Layout className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <span className={cn(
            "px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest",
            project.status === 'Active' ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"
          )}>
            {project.status}
          </span>
        </div>

        <div>
          <h3 className="text-lg md:text-xl font-bold text-white md:group-hover:text-primary transition-colors leading-tight truncate">{project.client}</h3>
          <p className="text-[11px] md:text-sm text-slate-500 font-black uppercase tracking-widest mt-1">JN-#{project.jobNumber}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-2 border-t border-white/5 pt-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <Store className="w-3 h-3" />
              <span>Project</span>
            </div>
            <p className="text-xs md:text-sm font-bold text-slate-300 truncate">{project.outlet || 'General'}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <MapPin className="w-3 h-3" />
              <span>Project Outlet</span>
            </div>
            <p className="text-xs md:text-sm font-bold text-slate-300 truncate">{project.location || 'Local Site'}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <ArrowDownLeft className="w-3 h-3 text-green-500" />
              <span>Inbound</span>
            </div>
            <p className="text-xs md:text-sm font-bold text-green-400">{project.totalQuantityIn || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <ArrowUpRight className="w-3 h-3 text-red-500" />
              <span>Outbound</span>
            </div>
            <p className="text-xs md:text-sm font-bold text-red-400">{project.totalQuantityOut || 0}</p>
          </div>
        </div>

        {/* FULFILLMENT BAR */}
        {itemCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Fulfillment</span>
              <span className="text-[8px] font-black text-primary uppercase">
                {Math.round(((project.totalQuantityOut || 0) / itemCount) * 100)}%
              </span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, ((project.totalQuantityOut || 0) / itemCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-60">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(project.updatedAt || project.createdAt)}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 md:group-hover:text-primary md:group-hover:translate-x-1 transition-all" />
        </div>
      </div>
      {/* Subtle Background Glow */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
    </motion.div>
  );
}

function ProjectFormModal({ project, inventory, clients, onClose, user }: { project: Project | null, inventory: InventoryItem[], clients: any[], onClose: () => void, user: UserProfile }) {
  const generateJobNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `JN-${year}-${random}`;
  };

  const [formData, setFormData] = useState({
    client: project?.client || '',
    jobNumber: project?.jobNumber || (!project ? generateJobNumber() : ''),
    outlet: project?.outlet || '',
    location: project?.location || '',
    status: project?.status || 'Active' as const,
  });
  
  const [items, setItems] = useState<ProjectItem[]>(project?.items || []);
  const [loading, setLoading] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const filteredClients = useMemo(() => {
    if (!formData.client.trim()) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(formData.client.toLowerCase()));
  }, [clients, formData.client]);

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const clientStock = useMemo(() => {
    if (!formData.client) return [];
    return inventory.filter(i => 
      i.client?.toLowerCase() === formData.client.toLowerCase() &&
      !items.some(pi => pi.inventoryItemId === i.id)
    );
  }, [inventory, formData.client, items]);

  const addItem = (invItem: InventoryItem) => {
    const newItem: ProjectItem = {
      inventoryItemId: invItem.id,
      name: invItem.name,
      brand: invItem.brand || '',
      model: invItem.modelNumber || '',
      quantity: 1,
      supplier: invItem.supplier || '',
      location: invItem.location || '',
      quantityIn: 0,
      quantityOut: 0
    };
    setItems([...items, newItem]);
    setShowItemPicker(false);
    setItemSearch('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<ProjectItem>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.jobNumber) return;

    setLoading(true);
    try {
      const totalIn = items.reduce((sum, i) => sum + (i.quantityIn || 0), 0);
      const totalOut = items.reduce((sum, i) => sum + (i.quantityOut || 0), 0);

      const data = {
        ...formData,
        items: items.map(item => ({
          ...item,
          quantityIn: item.quantityIn || 0,
          quantityOut: item.quantityOut || 0
        })),
        totalQuantityIn: totalIn,
        totalQuantityOut: totalOut,
        updatedAt: serverTimestamp(),
        userId: user.uid,
      };

      if (project) {
        await updateDoc(doc(db, 'projects', project.id), data);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
    } finally {
      setLoading(false);
    }
  }, [formData, items, project, user.uid, onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl h-full md:h-auto md:max-h-[85vh] glass-morphism md:rounded-[32px] shadow-2xl z-[61] overflow-hidden border border-white/10 flex flex-col"
      >
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">
            {project ? 'Update Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 text-white outline-none transition-all font-mono"
                  value={formData.client}
                  onChange={e => {
                    setFormData({ ...formData, client: e.target.value });
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="e.g., Global Logistics INC"
                />
              </div>
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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Number</label>
              <div className="relative group/jn">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/jn:text-primary transition-colors" />
                <input 
                  required
                  className="w-full pl-12 pr-24 py-3 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 text-white outline-none transition-all font-mono font-bold"
                  value={formData.jobNumber}
                  onChange={e => setFormData({ ...formData, jobNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g., JN-2024-001"
                />
                {!project && (
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, jobNumber: generateJobNumber() })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase rounded-lg transition-all"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 text-white outline-none transition-all"
                  value={formData.outlet}
                  onChange={e => setFormData({ ...formData, outlet: e.target.value })}
                  placeholder="e.g., Central Hub Ref A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Outlet</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 text-white outline-none transition-all"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., North Site B"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Status</label>
              <select 
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 text-white outline-none transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="Active" className="bg-slate-900">Active</option>
                <option value="Draft" className="bg-slate-900">Draft</option>
                <option value="Completed" className="bg-slate-900">Completed</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Project Stock Index</h3>
              <button 
                type="button"
                onClick={() => setShowItemPicker(true)}
                className="text-xs font-black text-primary hover:text-white transition-colors flex items-center space-x-2"
              >
                <Plus className="w-3 h-3" />
                <span>LINK INVENTORY ITEM</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <ProjectItemRow 
                  key={index} 
                  item={item} 
                  inventory={inventory}
                  onRemove={() => removeItem(index)} 
                  onUpdate={(u) => updateItem(index, u)}
                />
              ))}
              {items.length === 0 && (
                <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-800" />
                  <p className="text-sm text-slate-600 font-medium">Link items from global inventory to track requirements.</p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total SKU items</span>
              <span className="text-sm font-bold text-white">{items.length} Distinct Items</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Unit Load</span>
              <span className="text-sm font-bold text-primary">{items.reduce((sum, i) => sum + i.quantity, 0)} Units</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">Discard</button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{project ? 'Update Project' : 'Commit Project'}</span>
            </button>
          </div>
        </div>

        {/* Item Picker Modal Overlay */}
        <AnimatePresence>
          {showItemPicker && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-[65] flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Full Inventory Lookup</h3>
                <button onClick={() => setShowItemPicker(false)} className="p-2 hover:bg-white/10 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    autoFocus
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Search master inventory..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2 space-y-6">
                  {clientStock.length > 0 && !itemSearch && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Suggested for {formData.client}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {clientStock.map(invItem => (
                          <button
                            key={invItem.id}
                            onClick={() => addItem(invItem)}
                            className="flex items-center space-x-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{invItem.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">STOCK: {invItem.currentQuantity}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest px-1">Global Inventory Catalog</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredInventory.map(invItem => (
                        <button
                          key={invItem.id}
                          onClick={() => addItem(invItem)}
                          className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{invItem.name}</p>
                            <p className="text-[10px] text-primary font-black mt-1">STOCK: {invItem.currentQuantity}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function ProjectItemRow({ item, inventory, onRemove, onUpdate }: { item: ProjectItem, inventory: InventoryItem[], onRemove: () => void, onUpdate: (u: Partial<ProjectItem>) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const invItemSource = useMemo(() => {
    return inventory.find(i => i.id === item.inventoryItemId);
  }, [inventory, item.inventoryItemId]);

  const filteredInventory = useMemo(() => {
    if (!search.trim()) return inventory.slice(0, 5);
    return inventory.filter(i => 
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.brand?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8);
  }, [inventory, search]);

  const handleSelect = (invItem: InventoryItem) => {
    onUpdate({
      inventoryItemId: invItem.id,
      name: invItem.name,
      brand: invItem.brand || '',
      model: invItem.modelNumber || '',
      supplier: invItem.supplier || '',
      location: invItem.location || '',
    });
    setShowSearch(false);
    setSearch('');
  };

  return (
    <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] bg-white/[0.03] border border-white/5 space-y-4 md:space-y-6 group/row relative overflow-hidden">
      <div className={cn(
        "absolute top-0 left-0 w-1 md:w-1.5 h-full transition-colors",
        invItemSource?.inventoryType === 'Client Stock' ? "bg-amber-500" : "bg-primary"
      )} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 md:space-x-4 flex-1">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border transition-colors shrink-0",
            invItemSource?.inventoryType === 'Client Stock' 
              ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
              : "bg-primary/10 border-primary/20 text-primary"
          )}>
            <Package className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          
          <div className="flex-1 relative">
            {!showSearch ? (
              <div 
                onClick={() => setShowSearch(true)}
                className="group/name cursor-pointer flex items-center space-x-2"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm md:text-base font-bold text-white tracking-tight group-hover/name:text-primary transition-colors truncate max-w-[150px] md:max-w-none">{item.name}</p>
                    <Edit className="w-3 h-3 text-slate-600 opacity-0 group-hover/name:opacity-100 transition-all" />
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">REF: {item.inventoryItemId.slice(-8).toUpperCase()}</p>
                    {invItemSource?.inventoryType && (
                      <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md",
                        invItemSource.inventoryType === 'Client Stock' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                      )}>
                        {invItemSource.inventoryType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input 
                  autoFocus
                  className="w-full bg-white/5 border border-primary/30 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Search to change item..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {filteredInventory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No matching items</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredInventory.map(invItem => (
                        <button
                          key={invItem.id}
                          type="button"
                          onClick={() => handleSelect(invItem)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/[0.02] last:border-0 text-left"
                        >
                          <div>
                            <p className="text-xs font-bold text-white">{invItem.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{invItem.brand} {invItem.modelNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-primary uppercase">Stock: {invItem.currentQuantity}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button onClick={onRemove} className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all ml-4">
          <Trash className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Brand Reference</label>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary/50 outline-none transition-all"
              value={item.brand}
              onChange={e => onUpdate({ brand: e.target.value })}
              placeholder="e.g., Samsung"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Model / Reference</label>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary/50 outline-none transition-all"
              value={item.model}
              onChange={e => onUpdate({ model: e.target.value })}
              placeholder="e.g., QE55Q70"
            />
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          <div className="p-2 md:p-3 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Required</label>
              <Hash className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-600" />
            </div>
            <input 
              type="number"
              className="w-full bg-transparent text-lg md:text-xl font-black text-white outline-none"
              value={item.quantity}
              onChange={e => onUpdate({ quantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="p-2 md:p-3 bg-green-500/5 rounded-xl md:rounded-2xl border border-green-500/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <label className="text-[8px] md:text-[9px] font-black text-green-500/70 uppercase tracking-widest leading-none">Qty In</label>
              <ArrowDownLeft className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
            </div>
            <input 
              type="number"
              className="w-full bg-transparent text-lg md:text-xl font-black text-green-400 outline-none"
              value={item.quantityIn || 0}
              onChange={e => onUpdate({ quantityIn: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="p-2 md:p-3 bg-red-500/5 rounded-xl md:rounded-2xl border border-red-500/10 flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <label className="text-[8px] md:text-[9px] font-black text-red-500/70 uppercase tracking-widest leading-none">Qty Out</label>
              <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500" />
            </div>
            <input 
              type="number"
              className="w-full bg-transparent text-lg md:text-xl font-black text-red-400 outline-none"
              value={item.quantityOut || 0}
              onChange={e => onUpdate({ quantityOut: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailModal({ project, inventory, transactions, onClose, onDelete, isApproved }: { project: Project, inventory: InventoryItem[], transactions: StockTransaction[], onClose: () => void, onDelete: () => void, isApproved: boolean }) {
  const [activeTab, setActiveTab] = useState<'manifest' | 'activity' | 'client-stock'>('manifest');

  const clientInventory = inventory.filter(item => 
    item.client?.toLowerCase() === project.client.toLowerCase() &&
    !project.items?.some(pi => pi.inventoryItemId === item.id)
  );

  const projectTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.jobNumber === project.jobNumber || 
      (tx.outlet?.toLowerCase() === project.outlet?.toLowerCase())
    );
  }, [transactions, project.jobNumber, project.outlet]);

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70]" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="fixed top-0 right-0 h-full w-full max-w-xl glass-morphism border-l border-white/10 z-[71] shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Job Specification</h2>
            <div className="flex items-center space-x-2">
              {isApproved && (
                <button 
                  onClick={onDelete}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all"
                  title="Delete Project"
                >
                  <Trash className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tighter leading-none">{project.client}</h1>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
              <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">{project.jobNumber}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400 font-medium">
                <Store className="w-4 h-4 text-primary" />
                <span className="text-sm border-b border-primary/20 pb-0.5">{project.outlet || 'General Project'}</span>
              </div>
              {project.location && (
                <div className="flex items-center space-x-2 text-slate-400 font-medium">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-300">{project.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <div className="flex items-center space-x-6 border-b border-white/5">
            {[
              { id: 'manifest', label: 'Inventory Manifest', icon: Package },
              { id: 'activity', label: 'Recent Activity', icon: History },
              { id: 'client-stock', label: 'Client Stock', icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                  activeTab === tab.id ? "text-primary" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="detail-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'manifest' && (
            <div className="space-y-10">
              {/* STATS OVERVIEW */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency Metrics</h3>
                  <span className="text-[10px] font-bold text-primary">Live Data</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Fulfillment', value: `${Math.round(((project.totalQuantityOut || 0) / (project.items?.reduce((sum, i) => sum + i.quantity, 0) || 1)) * 100)}%`, color: 'text-primary' },
                    { label: 'Inbound', value: project.totalQuantityIn || 0, color: 'text-green-400' },
                    { label: 'Outbound', value: project.totalQuantityOut || 0, color: 'text-red-400' }
                  ].map((m, i) => (
                    <div key={i} className="glass-morphism p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-white">{m.value}</span>
                      <span className={cn("text-[8px] font-black uppercase tracking-tighter mt-1", m.color)}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Inventory Manifest</h3>
                  <div className="flex items-center space-x-2">
                    <Package className="w-3.5 h-3.5 text-slate-700" />
                    <span className="text-[10px] font-bold text-slate-500">{project.items?.length || 0} SKU References</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {project.items?.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.name}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium tracking-wide">
                            <span>Brand: {item.brand || 'Generic'}</span>
                            {item.location && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-fuchsia-400/70">{item.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 md:gap-8 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Req</p>
                          <span className="text-lg font-black text-white">{item.quantity}</span>
                        </div>
                        <div className="w-px h-6 bg-white/5" />
                        <div className="text-center">
                          <p className="text-[8px] font-black text-green-500 uppercase tracking-widest mb-1">In</p>
                          <span className="text-lg font-black text-green-400">{item.quantityIn || 0}</span>
                        </div>
                        <div className="w-px h-6 bg-white/5" />
                        <div className="text-center">
                          <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Out</p>
                          <span className="text-lg font-black text-red-400">{item.quantityOut || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
             <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Transaction Timeline</h3>
                <span className="text-[10px] font-bold text-slate-500">Historical Footprint</span>
              </div>
              <div className="space-y-4">
                {projectTransactions.length > 0 ? (
                  projectTransactions.map((tx) => (
                    <div key={tx.id} className="relative pl-6 pb-6 last:pb-0">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" />
                      <div className={cn(
                        "absolute left-[-4px] top-1.5 w-2 h-2 rounded-full",
                        tx.type === 'IN' ? 'bg-green-500' : 'bg-red-500'
                      )} />
                      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-white">{tx.itemName}</p>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            tx.type === 'IN' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          )}>
                            {tx.type} {tx.quantity} units
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(tx.date).toLocaleString()}</span>
                          </div>
                          <span>by {tx.userName}</span>
                        </div>
                        {tx.notes && <p className="text-[10px] text-slate-600 mt-2 italic">{tx.notes}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <History className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold">No Transaction Data</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1">Ready for initialization</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'client-stock' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Available Client Inventory</h3>
                <span className="text-[10px] font-bold text-primary flex items-center space-x-1">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span>Found {clientInventory.length} items</span>
                </span>
              </div>
              <div className="space-y-3">
                {clientInventory.length > 0 ? clientInventory.map((item) => (
                  <div key={item.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">STOCK: {item.currentQuantity} | LOC: {item.location}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-40">
                    <User className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold">Clean Allocation</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1">No loose items detected</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-primary/5 rounded-[40px] p-8 border border-primary/10 relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-[80px] rounded-full" />
             <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h4 className="text-sm font-black text-white uppercase tracking-widest">System Note</h4>
             </div>
             <p className="text-sm text-slate-300 leading-relaxed italic">
               This project stock is connected to the central database. Any changes here represent actual inventory allocations for {project.client}.
             </p>
          </div>
        </div>

        <div className="p-8 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <p>Created: {formatDate(project.createdAt)}</p>
            <p>ID: {project.id}</p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
