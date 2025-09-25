import React, { useState, useEffect, useRef } from 'react';
import type { GroceryItem as GroceryItemType, Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { TrashIcon, CheckIcon } from './icons';

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: (id: string) => void;
  onDelete: (id:string) => void;
  onUpdate: (id: string, updates: Partial<GroceryItemType>) => void;
}

const GroceryItem: React.FC<GroceryItemProps> = ({ item, onToggle, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCompleted = useRef(item.completed);

  const categoryColorClasses = CATEGORY_COLORS[item.category];
  const categoryColor = `${categoryColorClasses.light} ${categoryColorClasses.dark}`;

  useEffect(() => {
    // Only animate on updates, not on initial mount
    if (prevCompleted.current !== item.completed) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400); // Animation duration should match CSS
      prevCompleted.current = item.completed;
      return () => clearTimeout(timer);
    }
  }, [item.completed]);

  const handleInputChange = (field: keyof GroceryItemType, value: string | number) => {
    onUpdate(item.id, { [field]: value });
  };
  
  return (
    <div 
      className={`p-3 bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-xl shadow-sm hover:shadow-md hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in ${isExpanded ? 'shadow-lg' : ''} ${isAnimating ? 'animate-toggle' : ''} cursor-pointer`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          className={`w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${item.completed ? 'bg-primary-500 border-primary-600 dark:border-primary-500 shadow-lg shadow-primary-500/30' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-primary-400'}`}
          aria-label={item.completed ? 'Mark as not completed' : 'Mark as completed'}
          aria-pressed={item.completed}
        >
          {item.completed && <CheckIcon className="w-5 h-5 text-white transition-transform duration-300 transform scale-100" />}
        </button>
        <div className="flex-grow">
          <p className={`font-medium text-appText-light dark:text-appText-dark transition-colors ${item.completed ? 'line-through text-appTextMuted-light dark:text-appTextMuted-dark' : ''}`}>
            {item.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${categoryColor}`}>
              {item.category}
            </span>
            {item.quantity && <span className="text-xs text-appTextMuted-light dark:text-appTextMuted-dark bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Qty: {item.quantity}</span>}
            {item.price && <span className="text-xs text-appTextMuted-light dark:text-appTextMuted-dark bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">${item.price.toFixed(2)}</span>}
            {item.notes && !isExpanded && <span className="text-xs text-appTextMuted-light dark:text-appTextMuted-dark truncate max-w-xs">Note: {item.notes}</span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Delete item"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {isExpanded && !item.completed && (
        <div className="mt-3 pt-3 border-t border-appBorder-light dark:border-appBorder-dark/50 space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={item.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder="Quantity (e.g., 1kg)"
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <input
              type="number"
              value={item.price || ''}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              placeholder="Price ($)"
              step="0.01"
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <input
              type="text"
              value={item.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add a note (e.g., brand, ripeness)"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
        </div>
      )}
    </div>
  );
};

export default GroceryItem;