import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GroceryItem, PantryItem, Recipe, ActiveView as ActiveViewType, Theme, Category, Shop, DietaryPreference, DayPlan, StorageSpace } from './types';
import { ActiveView, Language, Category as CategoryEnum, DietaryPreference as DietaryPreferenceEnum } from './types';
import GroceryList from './components/GroceryList';
import PantryTracker from './components/PantryTracker';
import AIAssistant from './components/AIAssistant';
import AddItemForm from './components/AddItemForm';
import ImportRecipeModal from './components/ImportRecipeModal';
import { ListIcon, PantryIcon, SparklesIcon, RecipeIcon, SettingsIcon, BookmarkIcon, PlusIcon, TrashIcon, ChevronDownIcon, LinkIcon, DiceIcon, CloudArrowUpIcon, CheckCircleIcon, ArrowPathIcon, SunIcon, MoonIcon, DesktopComputerIcon, MapPinIcon, CalendarIcon } from './components/icons';
import { DEFAULT_CATEGORY_ORDER } from './constants';
import { importRecipeFromUrl, suggestRecipesFromExpiringItems, generatePantryItemsFromImage, lookupBarcode } from './services/geminiService';
import dbService, { SyncOperation } from './services/dbService';
import NearbyShopsView from './components/NearbyShopsView';
import SettingsView from './components/SettingsView';
import PantryScanReviewModal from './components/PantryScanReviewModal';
import BarcodeScanner from './components/BarcodeScanner';
import MealPlannerView from './components/MealPlannerView';
import AutomatedHelper from './components/AutomatedHelper';

const translations: Record<Language, Record<string, string>> = {
  [Language.English]: {
    [ActiveView.ShoppingList]: 'Shopping List',
    [ActiveView.Pantry]: 'Pantry',
    [ActiveView.AIAssistant]: 'AI Assistant',
    [ActiveView.Recipes]: 'Saved Recipes',
    [ActiveView.NearbyShops]: 'Nearby Shops',
    [ActiveView.MealPlan]: 'Meal Plan',
    [ActiveView.Settings]: 'Settings',
    'language': 'Language',
    'theme': 'Theme',
    'dietaryPreference': 'Dietary Preference',
    'storeLayout': 'Store Layout',
    'storeLayoutDescription': "Drag and drop categories to match your favorite store's layout for faster shopping.",
  },
  [Language.Malayalam]: {
    [ActiveView.ShoppingList]: 'ഷോപ്പിംഗ് ലിസ്റ്റ്',
    [ActiveView.Pantry]: 'കലവറ',
    [ActiveView.AIAssistant]: 'AI അസിസ്റ്റന്റ്',
    [ActiveView.Recipes]: 'സേവ് ചെയ്ത പാചകക്കുറിപ്പുകൾ',
    [ActiveView.NearbyShops]: 'അടുത്തുള്ള കടകൾ',
    [ActiveView.MealPlan]: 'ഭക്ഷണ പദ്ധതി',
    [ActiveView.Settings]: 'ക്രമീകരണങ്ങൾ',
    'language': 'ഭാഷ',
    'theme': 'തീം',
    'dietaryPreference': 'ഭക്ഷണ മുൻഗണന',
    'storeLayout': 'സ്റ്റോർ ലേഔട്ട്',
    'storeLayoutDescription': 'വേഗതയേറിയ ഷോപ്പിംഗിനായി നിങ്ങളുടെ പ്രിയപ്പെട്ട സ്റ്റോറിന്റെ ലേഔട്ടുമായി പൊരുത്തപ്പെടുന്നതിന് വിഭാഗങ്ങൾ വലിച്ചിടുക.',
  }
};


const useSpeechRecognition = (onResult: (transcript: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            onResult(event.results[0][0].transcript);
            setIsListening(false);
        };
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
    }, [onResult]);
    
    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };
    return { isListening, toggleListening };
};

const AddRecipeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id' | 'isSaved'>) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [recipeName, setRecipeName] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [instructions, setInstructions] = useState('');

    const handleSubmit = () => {
        if (!recipeName.trim()) return;
        onSave({
            recipeName,
            ingredients: ingredients.split('\n').filter(i => i.trim()),
            instructions: instructions.split('\n').filter(i => i.trim()),
        });
        setRecipeName('');
        setIngredients('');
        setInstructions('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold font-heading mb-4 text-appText-light dark:text-appText-dark">Add New Recipe</h2>
                <div className="overflow-y-auto space-y-4 no-scrollbar">
                    <div>
                        <label htmlFor="recipeName" className="block text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark mb-1">Recipe Name</label>
                        <input
                            type="text"
                            id="recipeName"
                            value={recipeName}
                            onChange={e => setRecipeName(e.target.value)}
                            placeholder="e.g., Classic Pancakes"
                            className="w-full px-4 py-2 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="ingredients" className="block text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark mb-1">Ingredients (one per line)</label>
                        <textarea
                            id="ingredients"
                            value={ingredients}
                            onChange={e => setIngredients(e.target.value)}
                            rows={5}
                            placeholder="1 cup flour\n2 tbsp sugar\n..."
                            className="w-full px-4 py-2 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark mb-1">Instructions (one per line)</label>
                        <textarea
                            id="instructions"
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            rows={7}
                            placeholder="1. Mix dry ingredients.\n2. Add wet ingredients.\n..."
                            className="w-full px-4 py-2 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                        />
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-appBorder-light dark:border-appBorder-dark flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                    <button onClick={handleSubmit} disabled={!recipeName.trim()} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-primary-500/50">Save Recipe</button>
                </div>
            </div>
        </div>
    );
};

const SavedRecipeCard: React.FC<{recipe: Recipe; onRemove: (id: string) => void}> = ({ recipe, onRemove }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary-500/30">
            <div
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`recipe-details-${recipe.id}`}
            >
                <div className="pr-4">
                    <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark">{recipe.recipeName}</h3>
                    {!isExpanded && (
                        <p className="mt-1 text-sm text-appTextMuted-light dark:text-appTextMuted-dark">
                           {`Ingredients: ${recipe.ingredients.slice(0, 3).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}`}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(recipe.id); }}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label={`Remove ${recipe.recipeName}`}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            
            <div 
                id={`recipe-details-${recipe.id}`}
                className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-appBorder-light dark:border-appBorder-dark/50 space-y-4">
                         <div>
                            <h5 className="font-semibold text-appText-light dark:text-appText-dark">Ingredients:</h5>
                            <ul className="list-disc list-inside text-appTextMuted-light dark:text-appTextMuted-dark mt-2 space-y-1">
                                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-appText-light dark:text-appText-dark">Instructions:</h5>
                            <ol className="list-decimal list-inside text-appTextMuted-light dark:text-appTextMuted-dark mt-2 space-y-2">
                                {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RecipeRouletteModal: React.FC<{
    isOpen: boolean;
    recipe: Recipe | null;
    onClose: () => void;
    onSpin: () => void;
    onAccept: (recipe: Recipe) => void;
}> = ({ isOpen, recipe, onClose, onSpin, onAccept }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in" onClick={e => e.stopPropagation()}>
                <DiceIcon className="w-12 h-12 mx-auto text-primary-500" />
                <h2 className="text-2xl font-bold font-heading my-3 text-appText-light dark:text-appText-dark">Recipe Roulette</h2>
                {recipe ? (
                    <>
                        <p className="text-appTextMuted-light dark:text-appTextMuted-dark mb-4">How about making...</p>
                        <p className="text-xl font-semibold text-appText-light dark:text-appText-dark mb-6">{recipe.recipeName}?</p>
                        <div className="flex flex-col gap-3">
                           <button onClick={() => onAccept(recipe)} className="w-full px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg">Sounds Good!</button>
                           <button onClick={onSpin} className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Spin Again</button>
                        </div>
                    </>
                ) : (
                    <p className="text-appTextMuted-light dark:text-appTextMuted-dark">Add some recipes to your cookbook to get a suggestion!</p>
                )}
            </div>
        </div>
    );
};


const Toast: React.FC<{message: string; show: boolean}> = ({message, show}) => (
    <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg transition-all duration-300 z-50 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {message}
    </div>
)

const OrderPrepModal: React.FC<{
    items: GroceryItem[],
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<GroceryItem>) => void;
}> = ({items, onClose, onUpdate}) => {
    const listText = "My Grocery List:\n" + items.map(item => `- ${item.name} (Qty: ${item.quantity || '1'})${item.notes ? ` - Note: ${item.notes}` : ''}`).join('\n');
    
    const handleShare = (type: 'text' | 'email') => {
        if(type === 'email') {
            const subject = "Grocery Order";
            const body = `Hello,\n\nPlease prepare the following items for pickup:\n\n${listText}\n\nThank you!`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        } else {
             navigator.clipboard.writeText(listText);
        }
    };
    
    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold font-heading mb-4">Prepare Order & Share</h2>
                <div className="overflow-y-auto space-y-2 no-scrollbar">
                     {items.map(item => (
                        <div key={item.id} className="p-3 border rounded-lg border-appBorder-light dark:border-appBorder-dark">
                           <p className="font-semibold">{item.name}</p>
                           <div className="flex gap-2 mt-1">
                               <input type="text" value={item.quantity} onChange={e => onUpdate(item.id, {quantity: e.target.value})} placeholder="Qty" className="w-1/2 px-3 py-1.5 text-sm bg-background-light dark:bg-slate-700/50 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"/>
                               <input type="text" value={item.notes} onChange={e => onUpdate(item.id, {notes: e.target.value})} placeholder="Notes" className="w-full px-3 py-1.5 text-sm bg-background-light dark:bg-slate-700/50 border border-appBorder-light dark:border-appBorder-dark rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"/>
                           </div>
                        </div>
                     ))}
                </div>
                <div className="mt-4 pt-4 border-t border-appBorder-light dark:border-appBorder-dark flex flex-col sm:flex-row gap-2">
                    <button onClick={() => handleShare('email')} className="flex-1 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">Share via Email</button>
                    <button onClick={() => handleShare('text')} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Copy as Text</button>
                </div>
            </div>
        </div>
    )
}

const SyncStatus: React.FC<{ status: 'synced' | 'pending' | 'syncing' }> = ({ status }) => {
    const statusMap = {
        synced: { icon: <CheckCircleIcon className="w-5 h-5 text-green-400" />, text: "Synced" },
        pending: { icon: <CloudArrowUpIcon className="w-5 h-5 text-yellow-400" />, text: "Offline" },
        syncing: { icon: <ArrowPathIcon className="w-5 h-5 text-sky-400 animate-spin" />, text: "Syncing..." },
    };
    const { icon, text } = statusMap[status];
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            {icon}
            <span>{text}</span>
        </div>
    );
};

const ThemeToggle: React.FC<{ theme: Theme; onThemeChange: (theme: Theme) => void, isSystemDark: boolean }> = ({ theme, onThemeChange, isSystemDark }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toggleRef.current && !toggleRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themes: { name: Theme, icon: React.ReactNode }[] = [
        { name: 'light', icon: <SunIcon className="w-5 h-5" /> },
        { name: 'dark', icon: <MoonIcon className="w-5 h-5" /> },
        { name: 'system', icon: <DesktopComputerIcon className="w-5 h-5" /> },
    ];

    const getIconForTheme = () => {
        if (theme === 'light') return <SunIcon className="w-6 h-6" />;
        if (theme === 'dark') return <MoonIcon className="w-6 h-6" />;
        return isSystemDark ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />;
    };

    return (
        <div ref={toggleRef} className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
              aria-label="Change theme"
              aria-haspopup="true"
              aria-expanded={isOpen}
            >
                {getIconForTheme()}
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-36 bg-card-light dark:bg-card-dark rounded-lg shadow-lg border border-appBorder-light dark:border-appBorder-dark p-1 z-30 animate-fade-in" role="menu">
                    {themes.map(t => (
                        <button
                            key={t.name}
                            onClick={() => { onThemeChange(t.name); setIsOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-colors ${theme === t.name ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-200' : 'text-appText-light dark:text-appText-dark hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            role="menuitem"
                        >
                            {t.icon}
                            <span className="capitalize">{t.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
    const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [favoriteShops, setFavoriteShops] = useState<Shop[]>([]);
    const [storageSpaces, setStorageSpaces] = useState<StorageSpace[]>([]);
    const [categoryOrder, setCategoryOrder] = useState<Category[]>(DEFAULT_CATEGORY_ORDER);
    const [budget, setBudget] = useState<number>(0);
    const [theme, setTheme] = useState<Theme>('system');
    const [language, setLanguage] = useState<Language>(Language.English);
    const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(DietaryPreferenceEnum.None);
    const [isSystemDark, setIsSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const [activeView, setActiveView] = useState<ActiveViewType>(ActiveView.ShoppingList);
    const [isDbLoaded, setIsDbLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing'>('synced');
    const [toast, setToast] = useState<{message: string; show: boolean}>({message: '', show: false});
    const [isOrderPrepVisible, setIsOrderPrepVisible] = useState(false);
    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const { isListening, toggleListening } = useSpeechRecognition(setVoiceTranscript);
    const [notificationPermission, setNotificationPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // AI States
    const [pantryRecipeSuggestions, setPantryRecipeSuggestions] = useState<Recipe[]>([]);
    const [isPantryAiLoading, setIsPantryAiLoading] = useState(false);
    const [pantryAiError, setPantryAiError] = useState<string | null>(null);
    const [isRouletteModalOpen, setIsRouletteModalOpen] = useState(false);
    const [suggestedRouletteRecipe, setSuggestedRouletteRecipe] = useState<Recipe | null>(null);
    const [isPantryScanReviewOpen, setIsPantryScanReviewOpen] = useState(false);
    const [scannedPantryItems, setScannedPantryItems] = useState<{name: string, category: Category}[]>([]);
    const [isPantryScanning, setIsPantryScanning] = useState(false);
    const [aiAssistantInput, setAiAssistantInput] = useState('');
    const [aiMessageToSend, setAiMessageToSend] = useState<string | null>(null);

    const footerRef = useRef<HTMLElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);
    const [footerHeight, setFooterHeight] = useState(0);
    const prevGroceryLength = useRef(groceryList.length);
    const prevPantryLength = useRef(pantryItems.length);


    const t = (key: string) => {
        return translations[language]?.[key] || translations[Language.English][key] || key;
    };

    const showToast = useCallback((message: string) => {
        setToast({message, show: true});
        setTimeout(() => setToast({message: '', show: false}), 2000);
    }, []);

    // ---- Data & Sync Management ----
    const queueSync = useCallback(async (operation: Omit<SyncOperation, 'id'>) => {
        await dbService.addToSyncQueue(operation);
        setSyncStatus('pending');
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await (registration as any).sync.register('data-sync');
            } catch (e) {
                console.error('Background sync registration failed:', e);
            }
        }
    }, []);

    useEffect(() => {
        async function loadData() {
            try {
                setGroceryList(await dbService.getAll('groceries'));
                setPantryItems(await dbService.getAll('pantry'));
                setSavedRecipes(await dbService.getAll('recipes'));
                setFavoriteShops(await dbService.getAll('favoriteShops'));
                setStorageSpaces(await dbService.getAll('storageSpaces'));
                
                const settings = await dbService.getAll<{key: string, value: any}>('settings');
                const themeSetting = settings.find(s => s.key === 'theme');
                setTheme(themeSetting ? themeSetting.value : 'system');
                const langSetting = settings.find(s => s.key === 'language');
                if (langSetting) setLanguage(langSetting.value);
                const dietaryPreferenceSetting = settings.find(s => s.key === 'dietaryPreference');
                if (dietaryPreferenceSetting) setDietaryPreference(dietaryPreferenceSetting.value);
                const categoryOrderSetting = settings.find(s => s.key === 'categoryOrder');
                setCategoryOrder(categoryOrderSetting ? categoryOrderSetting.value : DEFAULT_CATEGORY_ORDER);
                const budgetSetting = settings.find(s => s.key === 'budget');
                setBudget(budgetSetting ? budgetSetting.value : 0);
            } catch (error) {
                console.error("Failed to load data from DB", error);
                showToast("Error: Could not load data.");
            } finally {
                setIsDbLoaded(true);
            }
        }
        loadData();
    }, [showToast]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'SYNC_COMPLETE') {
                setSyncStatus('synced');
                showToast("Data synced with the cloud!");
            } else if(event.data.type === 'SYNC_FAILED') {
                 setSyncStatus('pending'); // Stays pending to retry later
                 showToast("Sync failed. Will retry later.");
            } else if (event.data.type === 'NAVIGATE' && event.data.view) {
                setActiveView(event.data.view);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleMessage);

        // Also handle query params on initial load from notification click
        const urlParams = new URLSearchParams(window.location.search);
        const viewFromUrl = urlParams.get('view');
        if (viewFromUrl && Object.values(ActiveView).includes(viewFromUrl as ActiveViewType)) {
            setActiveView(viewFromUrl as ActiveViewType);
            // Clean up URL to avoid re-navigating on refresh
            window.history.replaceState({}, document.title, "/");
        }

        return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
    }, [showToast]);

    // ---- Theme Management ----
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const applyTheme = () => {
            const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
            document.documentElement.classList.toggle('dark', isDark);
        };

        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            setIsSystemDark(e.matches);
            if (theme === 'system') {
                applyTheme();
            }
        };
        
        applyTheme();
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme]);

    useEffect(() => {
        if (isDbLoaded) {
            const setting = { key: 'theme', value: theme };
            dbService.put('settings', setting).then(() => queueSync({ type: 'put', store: 'settings', payload: setting }));
        }
    }, [theme, isDbLoaded, queueSync]);

    // Effect to measure footer height for dynamic content padding
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setFooterHeight(entry.target.clientHeight);
            }
        });

        const currentFooter = footerRef.current;
        if (currentFooter) {
            observer.observe(currentFooter);
        }

        return () => {
            if (currentFooter) {
                observer.unobserve(currentFooter);
            }
        };
    }, []);
    
    // ---- Auto-scrolling logic for new items ----
    useEffect(() => {
        if (activeView === ActiveView.ShoppingList && groceryList.length > prevGroceryLength.current) {
            setTimeout(() => mainContentRef.current?.scrollTo({ top: mainContentRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
        prevGroceryLength.current = groceryList.length;
    }, [groceryList, activeView]);

    useEffect(() => {
        if (activeView === ActiveView.Pantry && pantryItems.length > prevPantryLength.current) {
            setTimeout(() => mainContentRef.current?.scrollTo({ top: mainContentRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
        prevPantryLength.current = pantryItems.length;
    }, [pantryItems, activeView]);


    // ---- Notification Management ----
    const handleRequestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            showToast("This browser does not support notifications.");
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            showToast("Expiry notifications enabled!");
        } else {
            showToast("Notifications were not enabled.");
        }
    };

    useEffect(() => {
        const checkAndNotifyForExpiringItems = async () => {
            if (!isDbLoaded || notificationPermission !== 'granted' || !navigator.serviceWorker.ready) return;

            const swRegistration = await navigator.serviceWorker.ready;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            pantryItems.forEach(item => {
                if (!item.expiryDate) return;

                const expiry = new Date(item.expiryDate);
                const diffTime = expiry.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0 && diffDays <= 3) {
                    const notifiedKey = `notified-expiry-${item.id}-${item.expiryDate}`;
                    if (!localStorage.getItem(notifiedKey)) {
                        let body = '';
                        if (diffDays === 0) {
                            body = `${item.name} is expiring today! Use it soon.`;
                        } else {
                            const dayString = diffDays === 1 ? 'day' : 'days';
                            body = `${item.name} is expiring in ${diffDays} ${dayString}.`;
                        }
                        
                        swRegistration.showNotification('Item Expiring Soon!', {
                            body,
                            icon: '/icon-192x192.png',
                            data: { view: ActiveView.Pantry },
                            tag: `expiry-${item.id}` // Use a tag to prevent duplicate notifications for the same item
                        });
                        localStorage.setItem(notifiedKey, 'true');
                    }
                }
            });
        };

        checkAndNotifyForExpiringItems();
    }, [pantryItems, isDbLoaded, notificationPermission]);


    // ---- Wrapped Data Handlers ----
    const handleAddGroceryItem = useCallback(async (name: string, category: Category, quantity?: string, price?: number, notes?: string) => {
        const newItem: GroceryItem = { 
            id: Date.now().toString(), 
            name, 
            category, 
            completed: false, 
            quantity: quantity || '', 
            notes: notes || '',
            price: price || undefined
        };
        setGroceryList(prev => [...prev, newItem]);
        await dbService.put('groceries', newItem);
        await queueSync({ type: 'put', store: 'groceries', payload: newItem });
        showToast(`${name} added to list!`);
        setVoiceTranscript('');
    }, [queueSync, showToast]);
    
    const handleAddPantryItem = useCallback(async (name: string, category: Category, expiryDate?: string, storageId?: string) => {
        const newItem: PantryItem = { 
            id: Date.now().toString(), 
            name, 
            category, 
            expiryDate, 
            status: 'stocked',
            storageId: storageId || undefined
        };
        setPantryItems(prev => [...prev, newItem]);
        await dbService.put('pantry', newItem);
        await queueSync({ type: 'put', store: 'pantry', payload: newItem });
        showToast(`${name} added to pantry!`);
        setVoiceTranscript('');
    }, [queueSync, showToast]);
    
    const handleUpdateGroceryItem = useCallback(async (id: string, updates: Partial<GroceryItem>) => {
        let updatedItem: GroceryItem | undefined;
        setGroceryList(currentList => {
            const newList = currentList.map(item => {
                if (item.id === id) {
                    updatedItem = { ...item, ...updates };
                    return updatedItem;
                }
                return item;
            });
            return newList;
        });
        
        if (updatedItem) {
            await dbService.put('groceries', updatedItem);
            await queueSync({ type: 'put', store: 'groceries', payload: updatedItem });
        }
    }, [queueSync]);
    
    const handleToggleGroceryItem = useCallback(async (id: string) => {
        let updatedItem: GroceryItem | undefined;
        setGroceryList(currentList => {
            const newList = currentList.map(item => {
                if (item.id === id) {
                    updatedItem = { ...item, completed: !item.completed };
                    return updatedItem;
                }
                return item;
            });
            return newList;
        });
        
        if (updatedItem) {
            await dbService.put('groceries', updatedItem);
            await queueSync({ type: 'put', store: 'groceries', payload: updatedItem });
        }
    }, [queueSync]);

    const handleUpdatePantryItem = useCallback(async (id: string, updates: Partial<PantryItem>) => {
        let updatedItem: PantryItem | undefined;
        setPantryItems(currentList => {
            const newList = currentList.map(item => {
                if (item.id === id) {
                    updatedItem = { ...item, ...updates };
                    return updatedItem;
                }
                return item;
            });
            return newList;
        });
        
        if (updatedItem) {
            await dbService.put('pantry', updatedItem);
            await queueSync({ type: 'put', store: 'pantry', payload: updatedItem });
        }
    }, [queueSync]);

    const handleDeleteGroceryItem = useCallback(async (id: string) => {
        setGroceryList(prev => prev.filter(item => item.id !== id));
        await dbService.delete('groceries', id);
        await queueSync({ type: 'delete', store: 'groceries', payload: { id } });
    }, [queueSync]);

    const handleDeletePantryItem = useCallback(async (id: string) => {
        setPantryItems(prev => prev.filter(item => item.id !== id));
        await dbService.delete('pantry', id);
        await queueSync({ type: 'delete', store: 'pantry', payload: { id } });
    }, [queueSync]);
    
    const handleClearCompletedItems = useCallback(async () => {
        const completedIds = groceryList.filter(i => i.completed).map(i => i.id);
        if (completedIds.length === 0) {
            showToast("No completed items to clear.");
            return;
        }
        setGroceryList(prev => prev.filter(item => !item.completed));
        await Promise.all(completedIds.map(id => dbService.delete('groceries', id)));
        completedIds.forEach(id => queueSync({ type: 'delete', store: 'groceries', payload: { id } }));
        showToast("Cleared completed items.");
    }, [groceryList, queueSync, showToast]);

    const handleClearAllItems = useCallback(async () => {
        if (groceryList.length === 0) {
            showToast("Shopping list is already empty.");
            return;
        }
        setGroceryList([]);
        await dbService.clear('groceries');
        await queueSync({ type: 'clear', store: 'groceries', payload: {} });
        showToast("Cleared all items from the shopping list.");
    }, [groceryList, queueSync, showToast]);

    const handleAddGeneratedItems = useCallback((items: { name: string; category: Category }[]) => {
        const existingItems = new Set([...groceryList.map(i => i.name.toLowerCase()), ...pantryItems.map(i => i.name.toLowerCase())]);
        const newItems = items
            .filter(item => !existingItems.has(item.name.toLowerCase()))
            .map((item, index) => ({
                ...item,
                id: `${Date.now()}-${index}`, completed: false, quantity: '', notes: '', price: 0,
            }));
        if(newItems.length > 0) {
            setGroceryList(prev => [...prev, ...newItems]);
            Promise.all(newItems.map(item => dbService.put('groceries', item))).then(() => {
                newItems.forEach(item => queueSync({ type: 'put', store: 'groceries', payload: item }));
            });
            showToast(`${newItems.length} items added from AI!`);
        } else {
            showToast("AI items are already in your lists!");
        }
        setActiveView(ActiveView.ShoppingList);
    }, [groceryList, pantryItems, queueSync, showToast]);
    
    const handleSaveRecipe = useCallback(async (recipe: Recipe) => {
        if (!savedRecipes.some(r => r.recipeName === recipe.recipeName)) {
            const newRecipe = {...recipe, isSaved: true};
            setSavedRecipes(prev => [...prev, newRecipe]);
            await dbService.put('recipes', newRecipe);
            await queueSync({ type: 'put', store: 'recipes', payload: newRecipe });
            showToast("Recipe saved!");
        } else {
            showToast("Recipe is already saved!");
        }
    }, [savedRecipes, queueSync, showToast]);

    const handleSaveNewRecipe = useCallback(async (newRecipeData: Omit<Recipe, 'id' | 'isSaved'>) => {
        const newRecipe: Recipe = { ...newRecipeData, id: Date.now().toString(), isSaved: true };
        setSavedRecipes(prev => [newRecipe, ...prev]);
        await dbService.put('recipes', newRecipe);
        await queueSync({ type: 'put', store: 'recipes', payload: newRecipe });
        showToast("New recipe saved!");
    }, [queueSync, showToast]);
    
    const handleImportRecipe = useCallback(async (url: string) => {
        const importedRecipeData = await importRecipeFromUrl(url);
        if (savedRecipes.some(r => r.recipeName.toLowerCase() === importedRecipeData.recipeName.toLowerCase())) {
            showToast("This recipe is already in your cookbook!");
            return;
        }
        await handleSaveNewRecipe(importedRecipeData);
        showToast("Recipe imported successfully!");
    }, [savedRecipes, handleSaveNewRecipe, showToast]);

    const handlePantryAiSuggest = async () => {
        setIsPantryAiLoading(true); setPantryAiError(null); setPantryRecipeSuggestions([]);
        try {
            const expiringItems = pantryItems.filter(i => i.expiryDate);
            if (expiringItems.length === 0) {
                setPantryAiError("No items with expiration dates found.");
                return;
            }
            const recipes = await suggestRecipesFromExpiringItems(expiringItems);
            setPantryRecipeSuggestions(recipes);
        } catch (err: any) { setPantryAiError(err.message || 'An unexpected error occurred.'); }
        finally { setIsPantryAiLoading(false); }
    };

    const handleSpinRoulette = () => {
        if (savedRecipes.length > 0) {
            setSuggestedRouletteRecipe(savedRecipes[Math.floor(Math.random() * savedRecipes.length)]);
        } else { setSuggestedRouletteRecipe(null); }
        setIsRouletteModalOpen(true);
    };

    const handleToggleFavoriteShop = useCallback(async (shop: Shop) => {
        const isFavorited = favoriteShops.some(s => s.id === shop.id);
        if (isFavorited) {
            setFavoriteShops(prev => prev.filter(s => s.id !== shop.id));
            await dbService.delete('favoriteShops', shop.id);
            await queueSync({ type: 'delete', store: 'favoriteShops', payload: { id: shop.id } });
            showToast(`${shop.name} removed from favorites.`);
        } else {
            const newFavorite = { ...shop, isFavorite: true };
            setFavoriteShops(prev => [...prev, newFavorite]);
            await dbService.put('favoriteShops', newFavorite);
            await queueSync({ type: 'put', store: 'favoriteShops', payload: newFavorite });
            showToast(`${shop.name} added to favorites!`);
        }
    }, [favoriteShops, queueSync, showToast]);

    const handlePantryImageScan = useCallback(async (base64ImageData: string, mimeType: string) => {
        setIsPantryScanning(true);
        try {
            const items = await generatePantryItemsFromImage(base64ImageData, mimeType);
            const existingPantryItems = new Set(pantryItems.map(i => i.name.toLowerCase()));
            const newItems = items.filter(item => !existingPantryItems.has(item.name.toLowerCase()));

            if (newItems.length > 0) {
                setScannedPantryItems(newItems);
                setIsPantryScanReviewOpen(true);
            } else {
                showToast("AI found items that are already in your pantry.");
            }
        } catch (error: any) {
            showToast(error.message || "Failed to scan image.");
        } finally {
            setIsPantryScanning(false);
        }
    }, [pantryItems, showToast]);

    const handleConfirmPantryScan = useCallback(async (itemsToAdd: {name: string, category: Category}[]) => {
        const newPantryItems: PantryItem[] = itemsToAdd.map((item, index) => ({
            id: `${Date.now()}-${index}`,
            name: item.name,
            category: item.category,
            status: 'stocked'
        }));

        setPantryItems(prev => [...prev, ...newPantryItems]);
        await Promise.all(newPantryItems.map(item => dbService.put('pantry', item)));
        newPantryItems.forEach(item => queueSync({ type: 'put', store: 'pantry', payload: item }));
        
        showToast(`${newPantryItems.length} items added to pantry!`);
        setIsPantryScanReviewOpen(false);
        setScannedPantryItems([]);
    }, [queueSync, showToast]);

    const handleBarcodeDetected = useCallback(async (barcode: string) => {
        setIsScannerOpen(false);
        showToast("Barcode detected! Looking up product...");
        try {
            const product = await lookupBarcode(barcode);
            // The AddItemForm already listens to voiceTranscript to pre-fill the name.
            setVoiceTranscript(product.name);
            showToast(`Found: ${product.name}`);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Could not find a product for that barcode.");
        }
    }, [showToast]);

    const handleAddStorageSpace = useCallback(async (name: string) => {
        const newSpace: StorageSpace = { id: Date.now().toString(), name };
        setStorageSpaces(prev => [...prev, newSpace]);
        await dbService.put('storageSpaces', newSpace);
        await queueSync({ type: 'put', store: 'storageSpaces', payload: newSpace });
        showToast(`Storage space "${name}" added.`);
    }, [queueSync, showToast]);

    const handleDeleteStorageSpace = useCallback(async (id: string) => {
        // First, unassign items from this space
        setPantryItems(prev => prev.map(item => item.storageId === id ? { ...item, storageId: undefined } : item));
        // Then, remove the space
        setStorageSpaces(prev => prev.filter(space => space.id !== id));
        await dbService.delete('storageSpaces', id);
        await queueSync({ type: 'delete', store: 'storageSpaces', payload: { id } });
        showToast("Storage space removed.");
    }, [queueSync, showToast]);


    const renderView = () => {
        if (!isDbLoaded) return <div className="flex justify-center items-center h-full"><ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" /></div>;
        switch (activeView) {
            case ActiveView.ShoppingList:
                return <GroceryList 
                    items={groceryList} budget={budget}
                    onSetBudget={async (newBudget) => {
                        setBudget(newBudget);
                        const setting = { key: 'budget', value: newBudget };
                        await dbService.put('settings', setting);
                        await queueSync({ type: 'put', store: 'settings', payload: setting });
                    }}
                    onToggleItem={handleToggleGroceryItem}
                    onDeleteItem={handleDeleteGroceryItem}
                    onUpdateItem={handleUpdateGroceryItem}
                    onClearCompleted={handleClearCompletedItems}
                    onClearAll={handleClearAllItems}
                    onShare={() => setIsOrderPrepVisible(true)}
                    onSort={() => setGroceryList(prev => [...prev].sort((a,b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)))}
                    categoryOrder={categoryOrder}
                />;
            case ActiveView.Pantry:
                return <PantryTracker 
                    items={pantryItems}
                    storageSpaces={storageSpaces}
                    onDeleteItem={handleDeletePantryItem}
                    onUpdateItem={handleUpdatePantryItem}
                    onMoveToShoppingList={async (item) => {
                         await handleAddGroceryItem(item.name, item.category); 
                         setPantryItems(p => p.filter(pi => pi.id !== item.id));
                         await dbService.delete('pantry', item.id);
                         await queueSync({ type: 'delete', store: 'pantry', payload: { id: item.id } });
                    }}
                    onSuggestRecipes={handlePantryAiSuggest} recipeSuggestions={pantryRecipeSuggestions}
                    isAiLoading={isPantryAiLoading} aiError={pantryAiError} onSaveRecipe={handleSaveRecipe} onAddGeneratedItems={handleAddGeneratedItems}
                    onPantryImageScan={handlePantryImageScan}
                    isPantryScanning={isPantryScanning}
                />;
            case ActiveView.AIAssistant:
                return <AIAssistant 
                    pantryItems={pantryItems} 
                    groceryList={groceryList} 
                    onAddGeneratedItems={handleAddGeneratedItems} 
                    onSaveRecipe={handleSaveRecipe} 
                    userInput={aiAssistantInput}
                    onUserInput={setAiAssistantInput}
                    messageToSend={aiMessageToSend}
                    onMessageSent={() => setAiMessageToSend(null)}
                />;
            case ActiveView.Recipes:
                 return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-bold font-heading">My Cookbook</h2>
                            <div className="flex items-center gap-3">
                                <button onClick={handleSpinRoulette} className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-amber-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors shadow-md hover:shadow-lg">
                                    <DiceIcon className="w-5 h-5" />
                                    <span>Roulette</span>
                                </button>
                                <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                    <LinkIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setIsAddRecipeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {savedRecipes.length > 0 ? (
                            <div className="space-y-4">
                                {savedRecipes.map(recipe => (
                                    <SavedRecipeCard key={recipe.id} recipe={recipe} onRemove={async (id) => {
                                        setSavedRecipes(prev => prev.filter(r => r.id !== id));
                                        await dbService.delete('recipes', id);
                                        await queueSync({ type: 'delete', store: 'recipes', payload: { id } });
                                    }} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center bg-card-light dark:bg-card-dark rounded-2xl shadow-sm p-8 sm:p-12 border-2 border-dashed border-appBorder-light dark:border-appBorder-dark">
                                <RecipeIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                                <h3 className="mt-4 text-2xl font-bold font-heading text-appText-light dark:text-appText-dark">Your Cookbook is Empty</h3>
                                <p className="mt-2 text-md text-appTextMuted-light dark:text-appTextMuted-dark max-w-md mx-auto">
                                    Click "Add Recipe" to start your collection, or save recipes from the AI Assistant.
                                </p>
                            </div>
                        )}
                    </div>
                );
            case ActiveView.NearbyShops:
                return <NearbyShopsView favoriteShops={favoriteShops} onToggleFavorite={handleToggleFavoriteShop} />;
            case ActiveView.MealPlan:
                return <MealPlannerView 
                    pantryItems={pantryItems} 
                    dietaryPreference={dietaryPreference}
                    onAddItemsToList={handleAddGeneratedItems}
                    showToast={showToast}
                    />;
            case ActiveView.Settings:
                 return <SettingsView 
                    theme={theme} 
                    onThemeChange={setTheme} 
                    categoryOrder={categoryOrder} 
                    onCategoryOrderChange={async (newOrder) => {
                        setCategoryOrder(newOrder);
                        const setting = { key: 'categoryOrder', value: newOrder };
                        await dbService.put('settings', setting);
                        await queueSync({ type: 'put', store: 'settings', payload: setting });
                    }}
                    language={language}
                    onLanguageChange={async (newLang) => {
                        setLanguage(newLang);
                        const setting = { key: 'language', value: newLang };
                        await dbService.put('settings', setting);
                        await queueSync({ type: 'put', store: 'settings', payload: setting });
                    }}
                    dietaryPreference={dietaryPreference}
                    onDietaryPreferenceChange={async (newPref) => {
                        setDietaryPreference(newPref);
                        const setting = { key: 'dietaryPreference', value: newPref };
                        await dbService.put('settings', setting);
                        await queueSync({ type: 'put', store: 'settings', payload: setting });
                    }}
                    t={t}
                    favoriteShops={favoriteShops}
                    onRemoveFavorite={handleToggleFavoriteShop}
                    notificationPermission={notificationPermission}
                    onEnableNotifications={handleRequestNotificationPermission}
                    storageSpaces={storageSpaces}
                    onAddStorageSpace={handleAddStorageSpace}
                    onDeleteStorageSpace={handleDeleteStorageSpace}
                />
            default: return null;
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-background-light dark:bg-background-dark text-appText-light dark:text-appText-dark flex flex-col">
            <Toast message={toast.message} show={toast.show} />
            {isOrderPrepVisible && <OrderPrepModal items={groceryList.filter(i => !i.completed)} onClose={() => setIsOrderPrepVisible(false)} onUpdate={handleUpdateGroceryItem} />}
            <AddRecipeModal isOpen={isAddRecipeModalOpen} onClose={() => setIsAddRecipeModalOpen(false)} onSave={handleSaveNewRecipe} />
            <ImportRecipeModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportRecipe} />
            <RecipeRouletteModal 
                isOpen={isRouletteModalOpen} 
                recipe={suggestedRouletteRecipe} 
                onClose={() => setIsRouletteModalOpen(false)} 
                onSpin={handleSpinRoulette} 
                onAccept={(recipe) => {
                    const itemsToAdd = recipe.ingredients.map(ing => ({ name: ing, category: CategoryEnum.Other }));
                    handleAddGeneratedItems(itemsToAdd);
                    setIsRouletteModalOpen(false);
                }}
            />
            <PantryScanReviewModal
                isOpen={isPantryScanReviewOpen}
                items={scannedPantryItems}
                onClose={() => setIsPantryScanReviewOpen(false)}
                onConfirm={handleConfirmPantryScan}
            />
            <BarcodeScanner 
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onBarcodeDetected={handleBarcodeDetected}
            />

            <header className="bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold font-heading tracking-tight">{t(activeView)}</h1>
                     <div className="flex items-center gap-4">
                        <SyncStatus status={syncStatus} />
                        <ThemeToggle theme={theme} onThemeChange={setTheme} isSystemDark={isSystemDark} />
                    </div>
                </div>
            </header>
            
            <main ref={mainContentRef} className="container mx-auto p-4 flex-grow overflow-y-auto no-scrollbar" style={{ paddingBottom: `${footerHeight}px` }}>
                 {renderView()}
            </main>

            <footer ref={footerRef} className="fixed bottom-0 left-0 right-0 z-20 pb-safe">
                <div className="container mx-auto px-2">
                    {/* Fix: Wrap handleAddGroceryItem in a lambda to match prop signature and avoid type error. */}
                    {activeView === ActiveView.ShoppingList && <AddItemForm onAddItem={(name, category) => handleAddGroceryItem(name, category)} placeholder="Add to shopping list..." onBarcodeScan={() => setIsScannerOpen(true)} onVoiceInput={toggleListening} isListening={isListening} voiceTranscript={voiceTranscript} />}
                    {activeView === ActiveView.Pantry && <AddItemForm onAddItem={handleAddPantryItem} placeholder="Add to your pantry..." showExpiry onBarcodeScan={() => setIsScannerOpen(true)} onVoiceInput={toggleListening} isListening={isListening} voiceTranscript={voiceTranscript} storageSpaces={storageSpaces} />}
                    <nav className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-2 bg-card-light/80 dark:bg-card-dark/80 backdrop-blur-lg border border-appBorder-light dark:border-appBorder-dark rounded-2xl shadow-2xl">
                        <NavButton view={ActiveView.ShoppingList} activeView={activeView} setView={setActiveView} icon={<ListIcon className="w-6 h-6"/>}>List</NavButton>
                        <NavButton view={ActiveView.Pantry} activeView={activeView} setView={setActiveView} icon={<PantryIcon className="w-6 h-6"/>}>Pantry</NavButton>
                        <NavButton view={ActiveView.AIAssistant} activeView={activeView} setView={setActiveView} icon={<SparklesIcon className="w-6 h-6"/>}>AI</NavButton>
                        <NavButton view={ActiveView.Recipes} activeView={activeView} setView={setActiveView} icon={<BookmarkIcon className="w-6 h-6"/>}>Recipes</NavButton>
                        <NavButton view={ActiveView.MealPlan} activeView={activeView} setView={setActiveView} icon={<CalendarIcon className="w-6 h-6"/>}>Plan</NavButton>
                        <NavButton view={ActiveView.NearbyShops} activeView={activeView} setView={setActiveView} icon={<MapPinIcon className="w-6 h-6"/>}>Shops</NavButton>
                        <NavButton view={ActiveView.Settings} activeView={activeView} setView={setActiveView} icon={<SettingsIcon className="w-6 h-6"/>}>Settings</NavButton>
                    </nav>
                </div>
            </footer>
            {isDbLoaded && (
                <AutomatedHelper 
                    groceryList={groceryList}
                    pantryItems={pantryItems}
                    onAddGroceryItem={handleAddGroceryItem}
                    onAddPantryItem={handleAddPantryItem}
                    onDeleteGroceryItem={handleDeleteGroceryItem}
                    onDeletePantryItem={handleDeletePantryItem}
                    onNavigate={setActiveView}
                    onToggleGroceryItem={handleToggleGroceryItem}
                    onUpdatePantryItem={handleUpdatePantryItem}
                    onClearCompletedItems={handleClearCompletedItems}
                    onClearAllItems={handleClearAllItems}
                    onOpenOrderPrep={() => setIsOrderPrepVisible(true)}
                    onOpenAddRecipe={() => setIsAddRecipeModalOpen(true)}
                    onOpenImportRecipe={() => setIsImportModalOpen(true)}
                    onSpinRoulette={handleSpinRoulette}
                    onThemeChange={setTheme}
                    onSetAIAssistantInput={setAiAssistantInput}
                    onSendAIAssistantMessage={(message) => {
                        setActiveView(ActiveView.AIAssistant);
                        setAiMessageToSend(message);
                    }}
                />
            )}
        </div>
    );
};

const NavButton: React.FC<{view: ActiveViewType, activeView: ActiveViewType, setView: (view: ActiveViewType) => void, icon: React.ReactNode, children: React.ReactNode}> = ({ view, activeView, setView, icon, children }) => (
    <button 
        onClick={() => setView(view)} 
        className={`flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 transform hover:-translate-y-0.5 ${activeView === view ? 'text-primary-600 dark:text-primary-100' : 'text-slate-500 dark:text-slate-400 hover:text-primary-500'}`}
    >
        <div className={`p-2 rounded-full transition-all duration-300 ${activeView === view ? 'bg-primary-100 dark:bg-primary-900/50' : ''}`}>
           {icon}
        </div>
        <span className="mt-1 font-semibold">{children}</span>
    </button>
);

export default App;