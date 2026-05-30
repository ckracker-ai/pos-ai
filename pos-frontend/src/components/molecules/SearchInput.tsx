// Search component with fuzzy search support
'use client';

import React, { useState, useCallback } from 'react';
import { fuzzySearch } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface SearchInputProps<T> {
  placeholder?: string;
  items: T[];
  searchKeys: (keyof T)[];
  onSelect: (item: T) => void;
  onSearch?: (value: string) => void;
  renderItem?: (item: T) => React.ReactNode;
  className?: string;
}

export function SearchInput<T>({
  placeholder = 'Buscar...',
  items,
  searchKeys,
  onSelect,
  onSearch,
  renderItem,
  className = '',
}: SearchInputProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onSearch?.(value);

      if (value.trim() === '') {
        setResults([]);
        setShowResults(false);
        return;
      }

      const searchableItems = items.map((item) => {
        const searchText = searchKeys
          .map((key) => String(item[key]))
          .join(' ');
        return { ...item, searchText };
      });

      const fuzzyResults = fuzzySearch(value, searchableItems, {
        keys: ['searchText'],
        threshold: 0.6,
      });

      setResults(
        fuzzyResults.map((r: { item: T }) => r.item)
      );
      setShowResults(true);
    },
    [items, searchKeys, onSearch]
  );

  const handleSelect = (item: T) => {
    onSelect(item);
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className={cn('relative w-full', className)}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => searchTerm && setShowResults(true)}
        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-auto rounded-md border border-input bg-card shadow-lg z-50">
          {results.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0 transition-colors"
            >
              {renderItem ? renderItem(item) : String(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
