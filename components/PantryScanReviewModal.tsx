import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { CATEGORIES } from '../constants';
import { CheckIcon, PlusIcon } from './icons';

interface ScannedItem {
    name: string;
    category: Category;
}

interface PantryScanReviewModalProps {
    isOpen: boolean;
    items: ScannedItem[];
    onClose: () => void;
    onConfirm: (itemsToAdd: ScannedItem[]) => void;
}

const PantryScanReviewModal: React.FC<PantryScanReviewModalProps> = ({ isOpen, items, onClose, onConfirm }) => {
    const [selectedItems, setSelectedItems] = useState<Map<string, ScannedItem>>(new Map());

    useEffect(() => {
        if (isOpen) {
            // Pre-select all items when the modal opens
            const initialSelection = new Map<string, ScannedItem>();
            items.forEach((item, index) => {
                const uniqueKey = `${item.name}-${index}`;
                initialSelection.set(uniqueKey, item);
            });
            setSelectedItems(initialSelection);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;

    const handleToggleItem = (item: ScannedItem, index: number) => {
        const uniqueKey = `${item.name}-${index}`;
        setSelectedItems(prev => {
            const newMap = new Map(prev);
            if (newMap.has(uniqueKey)) {
                newMap.delete(uniqueKey);
            } else {
                newMap.set(uniqueKey, item);
            }
            return newMap;
        });
    };
    
    const handleCategoryChange = (index: number, newCategory: Category) => {
        const item = items[index];
        const uniqueKey = `${item.name}-${index}`;
        setSelectedItems(prev => {
            const newMap = new Map(prev);
            if (newMap.has(uniqueKey)) {
                newMap.set(uniqueKey, { ...item, category: newCategory });
            }
            return newMap;
        });
    }

    const handleConfirm = () => {
        onConfirm(Array.from(selectedItems.values()));
    };
    
    const handleSelectAll = () => {
         const allItemsMap = new Map<string, ScannedItem>();
         items.forEach((item, index) => {
            const uniqueKey = `${item.name}-${index}`;
            allItemsMap.set(uniqueKey, item);
        });
        setSelectedItems(allItemsMap);
    }

    const handleDeselectAll = () => {
        setSelectedItems(new Map());
    }

    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold font-heading mb-2 text-appText-light dark:text-appText-dark">Confirm Pantry Items</h2>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-4">Review the items found by the AI. Uncheck any you don't want to add.</p>
                
                <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">{selectedItems.size} / {items.length} selected</span>
                    <div className="flex gap-2">
                        <button onClick={handleSelectAll} className="text-xs font-semibold text-primary-600 dark:text-primary-300">Select All</button>
                        <button onClick={handleDeselectAll} className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deselect All</button>
                    </div>
                </div>

                <div className="overflow-y-auto space-y-2 flex-grow border-t border-b py-3 border-appBorder-light dark:border-appBorder-dark no-scrollbar">
                    {items.map((item, index) => {
                        const uniqueKey = `${item.name}-${index}`;
                        const isSelected = selectedItems.has(uniqueKey);
                        return (
                            <div key={uniqueKey} className={`flex items-center gap-3 p-2 rounded-lg ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
                                <button
                                    onClick={() => handleToggleItem(item, index)}
                                    className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-primary-500 border-primary-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500'}`}
                                >
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </button>
                                <span className={`flex-grow font-medium ${isSelected ? '' : 'text-appTextMuted-light dark:text-appTextMuted-dark'}`}>{item.name}</span>
                                <select
                                    value={selectedItems.get(uniqueKey)?.category || item.category}
                                    onChange={(e) => handleCategoryChange(index, e.target.value as Category)}
                                    disabled={!isSelected}
                                    className="appearance-none px-3 py-1 text-sm bg-background-light dark:bg-slate-700/80 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 pt-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleConfirm} disabled={selectedItems.size === 0} className="px-5 py-2.5 flex items-center gap-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-primary-400/50 transition-colors shadow-md hover:shadow-lg">
                        <PlusIcon className="w-5 h-5"/>
                        Add {selectedItems.size} Items
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PantryScanReviewModal;