import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface AppleSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  searchable?: boolean;
  required?: boolean;
  className?: string;
}

export const AppleSelect: React.FC<AppleSelectProps> = ({
  label,
  placeholder = 'Tanlang...',
  value,
  onChange,
  options,
  disabled = false,
  searchable = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opt.sublabel?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'border-teal-500/80 bg-white shadow-[0_0_0_3px_rgba(20,184,166,0.12)]'
            : 'border-slate-200/90 bg-white/80 hover:bg-white hover:border-slate-300 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'active:scale-[0.99]'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          <div className="text-left min-w-0 flex-1">
            {selectedOption ? (
              <span className="truncate block font-semibold text-slate-900">
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
            {selectedOption?.sublabel && (
              <span className="truncate block text-[10px] text-slate-500 font-normal">
                {selectedOption.sublabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.badge && (
            <span className="rounded-full bg-teal-50 border border-teal-200/70 px-2 py-0.5 text-[10px] font-bold text-teal-700">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-600' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[200px] rounded-2xl border border-white/60 bg-white/90 p-1.5 backdrop-blur-2xl shadow-[0_16px_40px_-10px_rgba(15,23,42,0.18),0_1px_0_0_rgba(255,255,255,0.9)_inset] max-h-64 overflow-hidden flex flex-col animate-[fadeIn_0.15s_ease-out]">
          {searchable && (
            <div className="p-1 pb-1.5 border-b border-slate-100/90">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Qidirish..."
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-52 py-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Mos ma’lumot topilmadi
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-teal-500/10 text-teal-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="truncate block text-[10px] text-slate-400 font-normal">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-teal-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
