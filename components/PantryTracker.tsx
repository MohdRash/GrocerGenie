import React, { useState } from 'react';
import { type PantryItem as PantryItemType, type Recipe, Category, type StorageSpace } from '../types';
import { LightBulbIcon, CameraIcon, ArrowPathIcon, ChevronDownIcon } from './icons';
import RecipeCard from './RecipeCard';
import PantryItem from './PantryItem';

interface PantryTrackerProps {
  items: PantryItemType[];
  storageSpaces: StorageSpace[];
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<PantryItemType>) => void;
  onMoveToShoppingList: (item: PantryItemType) => void;
  onSuggestRecipes: () => void;
  recipeSuggestions: Recipe[];
  isAiLoading: boolean;
  aiError: string | null;
  onSaveRecipe: (recipe: Recipe) => void;
  onAddGeneratedItems: (items: { name: string; category: Category }[]) => void;
  onPantryImageScan: (base64: string, mimeType: string) => void;
  isPantryScanning: boolean;
}

const PantryFreshAI: React.FC<Omit<PantryTrackerProps, 'items' | 'onDeleteItem' | 'onUpdateItem' | 'onMoveToShoppingList' | 'onPantryImageScan' | 'isPantryScanning' | 'storageSpaces'>> = (
    { onSuggestRecipes, recipeSuggestions, isAiLoading, aiError, onSaveRecipe, onAddGeneratedItems }
) => {
    return (
        <div className="p-5 bg-gradient-to-br from-primary-600 to-secondary-500 text-white rounded-2xl shadow-xl mb-8 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/10">
                    <LightBulbIcon className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-xl font-bold font-heading">PantryFresh AI</h3>
                    <p className="text-sm opacity-90 mt-1">Reduce waste! Get recipe ideas for items expiring soon.</p>
                    <button
                        onClick={onSuggestRecipes}
                        disabled={isAiLoading}
                        className="mt-4 px-5 py-2.5 bg-white text-primary-600 font-bold rounded-lg shadow-md hover:bg-primary-50 transition-all transform hover:-translate-y-0.5 disabled:bg-slate-200 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isAiLoading ? "Thinking..." : "Get Recipe Ideas"}
                    </button>
                </div>
            </div>
            {aiError && <p className="mt-3 text-sm text-red-200 bg-red-900/50 p-3 rounded-lg">{aiError}</p>}
            {recipeSuggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20 space-y-4">
                    {recipeSuggestions.map(recipe => (
                        <RecipeCard 
                            key={recipe.id}
                            recipe={recipe}
                            onSave={() => onSaveRecipe(recipe)}
                            onAddToList={() => {
                                const items = recipe.ingredients.map(ing => ({ name: ing, category: Category.Other }));
                                onAddGeneratedItems(items);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const StorageSpaceGroup: React.FC<{
    spaceName: string;
    items: PantryItemType[];
    storageSpaces: StorageSpace[];
    onDeleteItem: (id: string) => void;
    onUpdateItem: (id: string, updates: Partial<PantryItemType>) => void;
    onMoveToShoppingList: (item: PantryItemType) => void;
}> = ({ spaceName, items, storageSpaces, ...props }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (items.length === 0) return null;

    return (
        <div className="animate-fade-in">
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="w-full flex justify-between items-center text-left mb-3"
                aria-expanded={isExpanded}
            >
                <h3 className="text-xl font-bold font-heading text-appText-light dark:text-appText-dark">{spaceName} ({items.length})</h3>
                <ChevronDownIcon className={`w-6 h-6 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 border-b border-appBorder-light dark:border-appBorder-dark/50">
                    {items.map(item => (
                        <PantryItem 
                            key={item.id} 
                            item={item} 
                            storageSpaces={storageSpaces}
                            onDelete={props.onDeleteItem} 
                            onUpdate={props.onUpdateItem} 
                            onMove={props.onMoveToShoppingList}
                        />
                    ))}
                 </div>
            )}
        </div>
    );
};


const PantryTracker: React.FC<PantryTrackerProps> = (props) => {
  const { items, storageSpaces, onDeleteItem, onUpdateItem, onMoveToShoppingList, onPantryImageScan, isPantryScanning } = props;
  
  const hasExpiringItems = items.some(item => item.expiryDate);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const groupedItems = items.reduce((acc, item) => {
      const storageId = item.storageId || 'unassigned';
      if (!acc[storageId]) {
          acc[storageId] = [];
      }
      acc[storageId].push(item);
      return acc;
  }, {} as Record<string, PantryItemType[]>);

  const storageSpaceMap = new Map(storageSpaces.map(s => [s.id, s.name]));

  const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
          const base64String = (loadEvent.target?.result as string).split(',')[1];
          onPantryImageScan(base64String, file.type);
      };
      reader.readAsDataURL(file);
      
      event.target.value = '';
  };

  return (
    <div className="space-y-8">
        {hasExpiringItems && <PantryFreshAI 
             onSuggestRecipes={props.onSuggestRecipes}
             recipeSuggestions={props.recipeSuggestions}
             isAiLoading={props.isAiLoading}
             aiError={props.aiError}
             onSaveRecipe={props.onSaveRecipe}
             onAddGeneratedItems={props.onAddGeneratedItems}
        />}
        
        <div className="space-y-6">
            {items.length > 0 ? (
                <>
                    {storageSpaces.map(space => (
                        <StorageSpaceGroup 
                            key={space.id}
                            spaceName={space.name}
                            items={groupedItems[space.id] || []}
                            storageSpaces={storageSpaces}
                            onDeleteItem={onDeleteItem}
                            onUpdateItem={onUpdateItem}
                            onMoveToShoppingList={onMoveToShoppingList}
                        />
                    ))}
                    <StorageSpaceGroup
                        spaceName="Unassigned"
                        items={groupedItems['unassigned'] || []}
                        storageSpaces={storageSpaces}
                        onDeleteItem={onDeleteItem}
                        onUpdateItem={onUpdateItem}
                        onMoveToShoppingList={onMoveToShoppingList}
                    />
                </>
            ) : (
              <div className="text-center py-16 px-4 bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border-2 border-dashed border-appBorder-light dark:border-appBorder-dark">
                 <span className="text-6xl" role="img" aria-label="Kitchen cabinet">🗄️</span>
                 <h3 className="mt-4 text-2xl font-bold font-heading text-appText-light dark:text-appText-dark">Your Pantry is Bare</h3>
                 <p className="text-appTextMuted-light dark:text-appTextMuted-dark">Add items you have at home to get started.</p>
              </div>
            )}
        </div>

        <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleImageInputChange}
            className="hidden"
            disabled={isPantryScanning}
        />
        <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPantryScanning}
            className="fixed bottom-56 right-24 sm:right-28 z-30 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/50 disabled:from-slate-400 disabled:to-slate-500"
            aria-label="Scan pantry with camera"
        >
            {isPantryScanning ? (
                <ArrowPathIcon className="w-8 h-8 animate-spin" />
            ) : (
                <CameraIcon className="w-8 h-8" />
            )}
        </button>
      </div>
  );
};

export default PantryTracker;