
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>{children}</div>
);

export const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "special";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  icon?: React.ElementType;
  size?: "sm" | "md" | "lg";
}> = ({ onClick, children, variant = "primary", className = "", disabled = false, type = "button", icon: Icon, size = "md" }) => {
  const base = "rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-base"
  };
  const styles = {
    primary: "bg-[#2B3860] text-white hover:bg-[#1e2844] focus:ring-[#2B3860]",
    secondary: "bg-white text-[#2B3860] border border-slate-300 hover:bg-slate-50 focus:ring-slate-300",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 focus:ring-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    warning: "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200",
    special: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => (
  <input 
    {...props} 
    onWheel={(e) => e.currentTarget.blur()} // FIX: Evita que el scroll cambie el número
    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#2B3860] focus:ring-1 focus:ring-[#2B3860] transition-colors text-sm ${
      className.includes('bg-') ? '' : 'bg-white'
    } ${
      className.includes('border-') ? '' : 'border-slate-300'
    } ${className}`}
  />
);

export const Badge: React.FC<{ type: 'ok' | 'warn' | 'danger' | 'neutral' | 'info' | 'process', text: string }> = ({ type, text }) => {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    neutral: "bg-slate-100 text-slate-600",
    info: "bg-blue-100 text-blue-800",
    process: "bg-yellow-100 text-yellow-800 border border-yellow-200"
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[type]}`}>{text}</span>;
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex gap-2">{action}</div>}
  </div>
);
