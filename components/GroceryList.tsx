import React from 'react';
import type { GroceryItem as GroceryItemType, Category } from '../types';
import GroceryItem from './GroceryItem';
import { ShareIcon, TrashIcon, DollarSignIcon } from './icons';

interface GroceryListProps {
  items: GroceryItemType[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<GroceryItemType>) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  onShare: () => void;
  onSort: () => void;
  categoryOrder: Category[];
  budget: number;
  onSetBudget: (budget: number) => void;
}

const BudgetTracker: React.FC<{items: GroceryItemType[], budget: number, onSetBudget: (budget: number) => void}> = ({items, budget, onSetBudget}) => {
    const totalCost = items.reduce((sum, item) => sum + (item.price || 0) * 1, 0);
    const spent = items.filter(i => i.completed).reduce((sum, item) => sum + (item.price || 0) * 1, 0);
    const progress = budget > 0 ? (spent / budget) * 100 : 0;
    
    const remaining = budget - spent;
    const progressColor = remaining < 0 ? 'bg-red-500' : 'bg-gradient-to-r from-primary-500 to-secondary-500';

    return (
        <div className="p-4 bg-primary-50 dark:bg-card-dark border border-primary-200 dark:border-appBorder-dark rounded-xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <DollarSignIcon className="w-6 h-6 text-primary-600 dark:text-primary-400"/>
                    <span className="font-semibold text-primary-700 dark:text-primary-300 text-lg">Budget</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark">$</span>
                    <input 
                        type="number"
                        value={budget || ''}
                        onChange={(e) => onSetBudget(parseFloat(e.target.value) || 0)}
                        placeholder="Set Budget"
                        className="w-28 px-2 py-1 text-lg font-semibold bg-transparent dark:bg-slate-700/50 border-b-2 border-primary-200 dark:border-primary-700 focus:border-primary-500 focus:outline-none focus:ring-0 text-right"
                    />
                 </div>
            </div>
            {budget > 0 && (
                <div>
                    <div className="flex justify-between text-sm font-medium text-primary-600 dark:text-primary-300 mb-1">
                        <span>Spent: ${spent.toFixed(2)}</span>
                        <span className={remaining < 0 ? 'text-red-500' : ''}>
                            {remaining < 0 ? `Over: $${(-remaining).toFixed(2)}` : `Left: $${remaining.toFixed(2)}`}
                        </span>
                    </div>
                    <div className="w-full bg-primary-200/70 dark:bg-slate-700 rounded-full h-2.5">
                        <div className={`${progressColor} h-2.5 rounded-full transition-all duration-500`} style={{width: `${progress > 100 ? 100 : progress}%`}}></div>
                    </div>
                </div>
            )}
            <div className="text-sm text-primary-500 dark:text-primary-400 font-medium">Total list cost: ${totalCost.toFixed(2)}</div>
        </div>
    )
}

const GroceryList: React.FC<GroceryListProps> = ({ items, onToggleItem, onDeleteItem, onUpdateItem, onClearCompleted, onClearAll, onShare, onSort, categoryOrder, budget, onSetBudget }) => {
    const completedCount = items.filter(item => item.completed).length;
    const uncompletedItems = items.filter(item => !item.completed);

    const groupedItems = uncompletedItems.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<Category, GroceryItemType[]>);
    
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
        return categoryOrder.indexOf(a as Category) - categoryOrder.indexOf(b as Category);
    }) as Category[];

    return (
        <div className="space-y-6">
            <BudgetTracker items={items} budget={budget} onSetBudget={onSetBudget} />
            
            {items.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center p-2">
                    <button onClick={onSort} className="px-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-transform transform hover:scale-105">
                        Sort Layout
                    </button>
                    <button onClick={onShare} className="px-4 py-2 text-sm font-semibold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/50 rounded-full hover:bg-primary-200 dark:hover:bg-primary-900 transition-transform transform hover:scale-105">
                        Share Order
                    </button>
                    <div className="flex-grow" />
                    <button onClick={onClearCompleted} disabled={completedCount === 0} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed" title="Clear Completed">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onClearAll} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition" title="Clear All">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            
            <div className="space-y-6">
                {sortedCategories.length > 0 ? (
                    sortedCategories.map(category => (
                        <div key={category} className="animate-fade-in">
                            <h3 className="text-xl font-bold font-heading text-appText-light dark:text-appText-dark mb-3 border-b-2 border-primary-200 dark:border-primary-900 pb-2">{category}</h3>
                            <div className="space-y-3">
                                {groupedItems[category].map(item => (
                                    <GroceryItem
                                        key={item.id}
                                        item={item}
                                        onToggle={onToggleItem}
                                        onDelete={onDeleteItem}
                                        onUpdate={onUpdateItem}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 px-4 bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border border-appBorder-light dark:border-appBorder-dark">
                        <div className="text-6xl animate-bounce" role="img" aria-label="Sparkles">🎉</div>
                        <h3 className="mt-4 text-2xl font-bold font-heading text-appText-light dark:text-appText-dark">Shopping Complete!</h3>
                        <p className="text-appTextMuted-light dark:text-appTextMuted-dark">Your list is sparkling clean.</p>
                        <p className="text-sm text-appTextMuted-light/70 dark:text-appTextMuted-dark/70 mt-2">Ready for the next grocery run? Add items below!</p>
                    </div>
                )}
            </div>

            {completedCount > 0 && (
                 <div className="animate-fade-in">
                    <h3 className="text-lg font-bold font-heading text-appTextMuted-light dark:text-appTextMuted-dark mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Completed ({completedCount})</h3>
                    <div className="space-y-3">
                        {items.filter(item => item.completed).map(item => (
                            <GroceryItem
                                key={item.id}
                                item={item}
                                onToggle={onToggleItem}
                                onDelete={onDeleteItem}
                                onUpdate={onUpdateItem}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroceryList;