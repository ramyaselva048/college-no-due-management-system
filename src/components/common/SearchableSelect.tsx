import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: any; name?: string; id?: string }; currentTarget?: any; value?: any }) => void;
  options?: Array<SelectOption | string | number>;
  children?: React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
  clearable?: boolean;
  prefixIcon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  name,
  value,
  defaultValue,
  onChange,
  options,
  children,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search / filter...',
  className = '',
  disabled = false,
  required = false,
  allowCustom = false,
  clearable = false,
  prefixIcon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [internalValue, setInternalValue] = useState<string | number>(
    value !== undefined ? value : defaultValue !== undefined ? defaultValue : ''
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync internalValue when controlled value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Parse options from either `options` prop or `children` (<option> tags)
  const parsedOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value,
            label: opt.label !== undefined ? String(opt.label) : String(opt.value),
            subLabel: opt.subLabel,
            disabled: opt.disabled
          };
        }
        return {
          value: opt,
          label: String(opt)
        };
      });
    }

    const list: SelectOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const val = child.props.value !== undefined ? child.props.value : child.props.children;
        let label = '';
        if (typeof child.props.children === 'string') {
          label = child.props.children;
        } else if (Array.isArray(child.props.children)) {
          label = child.props.children
            .map((c: any) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
            .join('');
        } else {
          label = String(child.props.children ?? val ?? '');
        }

        list.push({
          value: val,
          label: label.trim(),
          disabled: Boolean(child.props.disabled)
        });
      }
    });

    return list;
  }, [options, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(internalValue));
  }, [parsedOptions, internalValue]);

  // Filter options based on typed search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return parsedOptions;
    const query = searchTerm.toLowerCase().trim();
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        String(opt.value).toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [parsedOptions, searchTerm]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Select an option
  const handleSelect = (val: string | number) => {
    setInternalValue(val);
    setIsOpen(false);
    setSearchTerm('');

    if (onChange) {
      const syntheticEvent = {
        target: {
          value: val,
          name: name || id || '',
          id: id || ''
        },
        currentTarget: {
          value: val,
          name: name || id || '',
          id: id || ''
        },
        value: val
      };
      onChange(syntheticEvent as any);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollToHighlighted(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollToHighlighted(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (allowCustom && searchTerm.trim()) {
        handleSelect(searchTerm.trim());
      }
    }
  };

  const scrollToHighlighted = (idx: number) => {
    if (listRef.current && listRef.current.children[idx]) {
      (listRef.current.children[idx] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  };

  // Render highlighted text matching search
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-amber-200 text-slate-900 font-bold rounded-xs px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Determine display label
  const displayLabel = selectedOption
    ? selectedOption.label
    : internalValue !== '' && internalValue !== undefined
    ? String(internalValue)
    : placeholder;

  const isPlaceholder = !selectedOption && (internalValue === '' || internalValue === undefined);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML form validation & serialization */}
      <input
        type="hidden"
        id={id}
        name={name}
        value={internalValue}
        required={required}
      />

      {/* Main Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between gap-2 transition-all select-none text-left cursor-pointer ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {prefixIcon && <span className="shrink-0 text-slate-400">{prefixIcon}</span>}
          <span
            className={`truncate ${isPlaceholder ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}
            title={typeof displayLabel === 'string' ? displayLabel : ''}
          >
            {displayLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {clearable && internalValue !== '' && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-0.5 hover:text-slate-600 rounded-sm hover:bg-slate-200/50"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
          />
        </div>
      </div>

      {/* Floating Dropdown with Search & Filter List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 min-w-[220px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1 text-xs divide-y divide-slate-50 focus:outline-none"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = String(opt.value) === String(internalValue);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={`${opt.value}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50'
                        : isSelected
                        ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100/80 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{highlightMatch(opt.label, searchTerm)}</div>
                      {opt.subLabel && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {highlightMatch(opt.subLabel, searchTerm)}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 font-bold" />
                    )}
                  </li>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                {allowCustom && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(searchTerm.trim());
                    }}
                    className="w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Use &quot;{searchTerm.trim()}&quot;</span>
                  </button>
                ) : (
                  <span>No options matching &quot;{searchTerm}&quot;</span>
                )}
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
