import React from 'react';
import { type PantryItem as PantryItemType, type StorageSpace } from '../types';
import { TrashIcon, ArrowUpIcon } from './icons';
import { CATEGORY_COLORS } from '../constants';

const PantryItem: React.FC<{
    item: PantryItemType;
    storageSpaces: StorageSpace[];
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<PantryItemType>) => void;
    onMove: (item: PantryItemType) => void;
}> = ({ item, storageSpaces, onDelete, onUpdate, onMove }) => {
    const categoryColorClasses = CATEGORY_COLORS[item.category];
    const categoryColor = `${categoryColorClasses.light} ${categoryColorClasses.dark}`;

    let expiryStatus = '';
    let expiryText = 'Expires';
    let expiryHighlightClass = ''; // For background/etc.

    if (item.expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(item.expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            expiryStatus = 'text-red-500 font-bold';
            expiryText = `Expired ${-diffDays}d ago`;
        }
        else if (diffDays === 0) {
            expiryStatus = 'text-red-500 font-bold';
            expiryText = 'Expires today';
        }
        else if (diffDays <= 3) {
            expiryStatus = 'font-semibold text-yellow-700 dark:text-yellow-300';
            expiryText = `Expires in ${diffDays}d`;
            expiryHighlightClass = 'bg-yellow-50 dark:bg-yellow-900/40';
        }
        else if (diffDays <= 7) {
            expiryStatus = 'text-orange-500 dark:text-orange-400';
            expiryText = `Expires in ${diffDays}d`;
        } else {
             expiryText = `Expires: ${new Date(item.expiryDate).toLocaleDateString()}`
        }
    }

    const isLow = item.status === 'low';
    const borderClass = isLow ? 'border-orange-400 dark:border-orange-500/50' : 'border-appBorder-light dark:border-appBorder-dark';

    return (
        <div className={`p-4 bg-card-light dark:bg-card-dark border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 ${borderClass} ${expiryHighlightClass}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-appText-light dark:text-appText-dark">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${categoryColor}`}>
                            {item.category}
                        </span>
                        {item.expiryDate && (
                            <span className={`text-xs ${expiryStatus}`}>
                                {expiryText}
                            </span>
                        )}
                    </div>
                </div>
                 <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                    aria-label="Delete item"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="mt-3 pt-3 border-t border-appBorder-light dark:border-appBorder-dark/50 space-y-2">
                <select
                    value={item.storageId || ''}
                    onChange={(e) => onUpdate(item.id, { storageId: e.target.value })}
                    className="w-full appearance-none px-3 py-2 text-sm text-appText-light dark:text-appText-dark border border-appBorder-light dark:border-appBorder-dark rounded-md bg-slate-50 dark:bg-slate-700/50 focus:ring-1 focus:ring-primary-500"
                >
                    <option value="">Assign a Space...</option>
                    {storageSpaces.map((space) => (
                        <option key={space.id} value={space.id}>
                            {space.name}
                        </option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button
                        onClick={() => onUpdate(item.id, { status: isLow ? 'stocked' : 'low' })}
                        className={`text-xs font-semibold w-full py-2 rounded-lg transition-colors ${isLow ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                    >
                        {isLow ? 'Mark as Stocked' : 'Running Low'}
                    </button>
                    <button
                        onClick={() => onMove(item)}
                        className="flex-shrink-0 p-2 bg-primary-100 text-primary-800 hover:bg-primary-200 dark:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/20 rounded-lg"
                        aria-label="Move to shopping list"
                    >
                       <ArrowUpIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PantryItem;
