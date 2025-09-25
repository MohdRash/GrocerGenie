import React, { useMemo, useState, useEffect } from 'react';
import { Category } from '../types';
import { CheckIcon, PlusIcon } from './icons';

interface MealPlanIngredientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (itemsToAdd: { name: string; category: Category }[]) => void;
    pantryItems: string[];
    requiredIngredients: string[];
}

const MealPlanIngredientsModal: React.FC<MealPlanIngredientsModalProps> = ({ isOpen, onClose, onConfirm, pantryItems, requiredIngredients }) => {
    const missingIngredients = useMemo(() => {
        const pantrySet = new Set(pantryItems.map(i => i.toLowerCase().trim()));
        const requiredSet = new Set(requiredIngredients.map(i => i.toLowerCase().trim()));
        const missing = new Set<string>();

        requiredSet.forEach(req => {
            // A simple check if the ingredient is not in the pantry
            if (!pantrySet.has(req)) {
                // To avoid adding plural/singular versions, a more complex check would be needed,
                // but for now, we'll do a basic check.
                // E.g., check if "tomato" is in pantry when "tomatoes" is required.
                const singularReq = req.endsWith('s') ? req.slice(0, -1) : req;
                if (!pantrySet.has(singularReq)) {
                     // Capitalize first letter for display
                    missing.add(req.charAt(0).toUpperCase() + req.slice(1));
                }
            }
        });

        return Array.from(missing);
    }, [pantryItems, requiredIngredients]);

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedItems(new Set(missingIngredients));
        }
    }, [isOpen, missingIngredients]);

    if (!isOpen) return null;

    const handleToggleItem = (item: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item)) {
                newSet.delete(item);
            } else {
                newSet.add(item);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        const itemsToAdd = Array.from(selectedItems).map(name => ({
            name,
            category: Category.Other // Default category, user can change it later
        }));
        onConfirm(itemsToAdd);
    };

    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold font-heading mb-2 text-appText-light dark:text-appText-dark">Add to Shopping List</h2>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-4">Here are the ingredients you're missing for your meal plan. Uncheck any you don't need.</p>
                
                <div className="overflow-y-auto space-y-2 flex-grow border-t border-b py-3 border-appBorder-light dark:border-appBorder-dark no-scrollbar">
                    {missingIngredients.length > 0 ? missingIngredients.map((item, index) => {
                        const isSelected = selectedItems.has(item);
                        return (
                            <div key={index} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`} onClick={() => handleToggleItem(item)}>
                                <div
                                    className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-primary-500 border-primary-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500'}`}
                                >
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </div>
                                <span className={`flex-grow font-medium ${isSelected ? '' : 'text-appTextMuted-light dark:text-appTextMuted-dark'}`}>{item}</span>
                            </div>
                        )
                    }) : (
                        <p className="text-center text-appTextMuted-light dark:text-appTextMuted-dark py-4">You have all the ingredients!</p>
                    )}
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

export default MealPlanIngredientsModal;