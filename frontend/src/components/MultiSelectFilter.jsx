import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function MultiSelectFilter({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Pilih...',
  disabled = false,
  allLabel = 'Semua',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, search]);

  const handleToggleOption = (val) => {
    const isSelected = selectedValues.includes(val);
    let updated = [];
    if (isSelected) {
      updated = selectedValues.filter((item) => item !== val);
    } else {
      updated = [...selectedValues, val];
    }
    onChange(updated);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (!selectedValues || selectedValues.length === 0) {
      return allLabel;
    }
    if (selectedValues.length === 1) {
      return String(selectedValues[0]);
    }
    return `${selectedValues.length} Terpilih`;
  }, [selectedValues, allLabel]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-gray-700 mb-1 tracking-tight">
        {label}
      </label>

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 shadow-xs ${
          disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
            : isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span
          className={`text-xs font-medium truncate ${
            selectedValues.length > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'
          }`}
        >
          {displayText}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in flex flex-col max-h-72">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Select All Toggle */}
          <div
            onClick={handleSelectAll}
            className="px-3 py-2 border-b border-gray-100 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs font-medium text-gray-700 transition-colors"
          >
            <span className="font-semibold text-emerald-700">Pilih Semua</span>
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selectedValues.length === options.length && options.length > 0
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {selectedValues.length === options.length && options.length > 0 && <Check size={11} />}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">Tidak ada opsi</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <div
                    key={String(option)}
                    onClick={() => handleToggleOption(option)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate pr-2">{String(option)}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={10} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
