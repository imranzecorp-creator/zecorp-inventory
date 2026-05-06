import React from 'react';
import { Shield, Check, X, Info, User, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface PermissionListProps {
  className?: string;
}

export default function PermissionList({ className }: PermissionListProps) {
  const permissions = [
    {
      action: "View Inventory Catalog",
      guest: true,
      verified: true,
      admin: true,
      description: "Browse the item database and check stock levels."
    },
    {
      action: "Export PDF Reports",
      guest: true,
      verified: true,
      admin: true,
      description: "Generate and download stock status reports."
    },
    {
      action: "Stock In / Stock Out",
      guest: false,
      verified: true,
      admin: true,
      description: "Perform quantity adjustments and record transactions."
    },
    {
      action: "Create New Items",
      guest: false,
      verified: true,
      admin: true,
      description: "Add new product codes and records to the system."
    },
    {
      action: "Edit Catalog Details",
      guest: false,
      verified: true,
      admin: true,
      description: "Modify structure like Name, Codes, or Location."
    },
    {
      action: "Delete Records",
      guest: false,
      verified: true,
      admin: true,
      description: "Permanently remove items or history from the database."
    },
    {
      action: "User Management",
      guest: false,
      verified: false,
      admin: true,
      description: "Manage roles, verified status, and system access levels."
    }
  ];

  const RoleHeader = ({ icon: Icon, title, subtitle, color }: any) => (
    <div className="flex flex-col items-center text-center p-4">
      <motion.div 
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        transition={{ rotate: { duration: 0.5, type: "tween", ease: "easeInOut" } }}
        className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg", color)}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>
      <h4 className="font-bold text-white text-sm uppercase tracking-wider">{title}</h4>
      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{subtitle}</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-morphism p-8 rounded-[40px] border border-white/5 shadow-2xl", className)}
    >
      <div className="flex items-center space-x-4 mb-10">
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase">Access Matrix</h2>
          <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1">System Authorization Protocol v2.0</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left pb-8 px-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Permission Level</span>
                </div>
              </th>
              <th className="pb-8 px-4"><RoleHeader icon={User} title="Guest" subtitle="Unverified" color="bg-slate-700" /></th>
              <th className="pb-8 px-4"><RoleHeader icon={CheckCircle2} title="Verified" subtitle="Staff Member" color="bg-indigo-600" /></th>
              <th className="pb-8 px-4"><RoleHeader icon={Shield} title="Admin" subtitle="Super User" color="bg-primary" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {permissions.map((p, idx) => (
              <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                <td className="py-6 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{p.action}</span>
                    <span className="text-xs text-slate-500 mt-1 max-w-xs">{p.description}</span>
                  </div>
                </td>
                <td className="py-6 px-4 text-center">
                  <StatusIcon allowed={p.guest} />
                </td>
                <td className="py-6 px-4 text-center">
                  <StatusIcon allowed={p.verified} />
                </td>
                <td className="py-6 px-4 text-center">
                  <StatusIcon allowed={p.admin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-start space-x-4">
        <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-primary/80 leading-relaxed font-medium">
          <strong className="text-white">Note:</strong> Admin and Approved users have full control over catalog records. Guest users have read-only access until their email is verified and approved by an administrator.
        </p>
      </div>
    </motion.div>
  );
}

function StatusIcon({ allowed }: { allowed: boolean }) {
  return (
    <div className="flex justify-center">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
          allowed 
            ? "bg-green-500/10 text-green-500 border-green-500/20" 
            : "bg-red-500/10 text-red-500 border-red-500/20 opacity-40 hover:opacity-100"
        )}
      >
        {allowed ? (
          <Check className="w-4 h-4" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </motion.div>
    </div>
  );
}
