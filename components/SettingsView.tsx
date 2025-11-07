import React, { useState } from 'react';
import type { Category, Theme, Shop, StorageSpace } from '../types';
import { Language, DietaryPreference } from '../types';
import { TrashIcon, MapPinIcon, InformationCircleIcon, ChevronDownIcon, PlusIcon } from './icons';

const FeatureSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-appBorder-light dark:border-appBorder-dark">
            <button
                className="w-full flex justify-between items-center p-3 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <h4 className="font-semibold text-appText-light dark:text-appText-dark">{title}</h4>
                <ChevronDownIcon className={`w-5 h-5 text-appTextMuted-light dark:text-appTextMuted-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-3 border-t border-appBorder-light dark:border-appBorder-dark text-sm text-appTextMuted-light dark:text-appTextMuted-dark space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const SettingsView: React.FC<{
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    categoryOrder: Category[];
    onCategoryOrderChange: (order: Category[]) => void;
    language: Language;
    onLanguageChange: (language: Language) => void;
    dietaryPreference: DietaryPreference;
    onDietaryPreferenceChange: (preference: DietaryPreference) => void;
    t: (key: string) => string;
    favoriteShops: Shop[];
    onRemoveFavorite: (shop: Shop) => void;
    notificationPermission: NotificationPermission;
    onEnableNotifications: () => void;
    storageSpaces: StorageSpace[];
    onAddStorageSpace: (name: string) => void;
    onDeleteStorageSpace: (id: string) => void;
}> = ({ 
    theme, onThemeChange, 
    categoryOrder, onCategoryOrderChange, 
    language, onLanguageChange, 
    dietaryPreference, onDietaryPreferenceChange, 
    t, favoriteShops, onRemoveFavorite, 
    notificationPermission, onEnableNotifications,
    storageSpaces, onAddStorageSpace, onDeleteStorageSpace
}) => {
    
    const [newSpaceName, setNewSpaceName] = useState('');

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => e.dataTransfer.setData('categoryIndex', index.toString());
    const handleDrop = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        const draggedIndex = parseInt(e.dataTransfer.getData('categoryIndex'), 10);
        const newOrder = [...categoryOrder];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, removed);
        onCategoryOrderChange(newOrder);
    };
    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => e.preventDefault();

    const handleAddSpace = () => {
        if (newSpaceName.trim()) {
            onAddStorageSpace(newSpaceName.trim());
            setNewSpaceName('');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">{t('theme')}</h3>
                <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as Theme[]).map(t => (
                        <button key={t} onClick={() => onThemeChange(t)} className={`px-4 py-2 rounded-lg capitalize font-semibold transition-colors ${theme === t ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">{t('language')}</h3>
                <div className="relative">
                     <select
                        value={language}
                        onChange={(e) => onLanguageChange(e.target.value as Language)}
                        className="w-full sm:w-1/2 appearance-none px-4 py-3 text-appText-light dark:text-appText-dark border-2 border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-slate-800 focus:ring-primary-500 focus:border-primary-500 transition"
                    >
                        <option value={Language.English}>English</option>
                        <option value={Language.Malayalam}>മലയാളം (Malayalam)</option>
                    </select>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">{t('dietaryPreference')}</h3>
                <div className="relative">
                     <select
                        value={dietaryPreference}
                        onChange={(e) => onDietaryPreferenceChange(e.target.value as DietaryPreference)}
                        className="w-full sm:w-1/2 appearance-none px-4 py-3 text-appText-light dark:text-appText-dark border-2 border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-slate-800 focus:ring-primary-500 focus:border-primary-500 transition"
                    >
                       {Object.values(DietaryPreference).map(pref => (
                           <option key={pref} value={pref}>{pref}</option>
                       ))}
                    </select>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">Notifications</h3>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-3">Get notified when pantry items are about to expire.</p>
                <button
                    onClick={onEnableNotifications}
                    disabled={notificationPermission !== 'default'}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed
                        ${notificationPermission === 'granted' ? 'bg-green-600 text-white' : ''}
                        ${notificationPermission === 'default' ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                        ${notificationPermission === 'denied' ? 'bg-red-600 text-white' : ''}`}
                >
                    {notificationPermission === 'granted' && 'Notifications Enabled'}
                    {notificationPermission === 'default' && 'Enable Notifications'}
                    {notificationPermission === 'denied' && 'Notifications Blocked'}
                </button>
            </div>
            <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">Manage Storage Spaces</h3>
                 <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-3">Create locations to organize your pantry (e.g., "Fridge Door", "Spice Rack").</p>
                <div className="space-y-2">
                    {storageSpaces.map(space => (
                        <div key={space.id} className="p-3 bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-lg flex items-center justify-between shadow-sm">
                            <p className="font-semibold">{space.name}</p>
                            <button
                                onClick={() => onDeleteStorageSpace(space.id)}
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label={`Delete ${space.name}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                    <input 
                        type="text" 
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder="New space name"
                        className="flex-grow px-4 py-2 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSpace()}
                    />
                    <button 
                        onClick={handleAddSpace}
                        className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-primary-500/50 flex items-center gap-2"
                        disabled={!newSpaceName.trim()}
                    >
                        <PlusIcon className="w-5 h-5" /> Add
                    </button>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">Favorite Shops</h3>
                <div className="space-y-2">
                    {favoriteShops.length > 0 ? (
                        favoriteShops.map(shop => (
                            <div key={shop.id} className="p-3 bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-lg flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="font-semibold">{shop.name}</p>
                                    <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark">{shop.address}</p>
                                </div>
                                <button
                                    onClick={() => onRemoveFavorite(shop)}
                                    className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    aria-label={`Remove ${shop.name}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            You haven't favorited any shops yet. Tap the heart icon on a shop in the 'Nearby Shops' tab to save it here.
                        </p>
                    )}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2">{t('storeLayout')}</h3>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-3">{t('storeLayoutDescription')}</p>
                <ul className="space-y-2">
                    {categoryOrder.map((cat, index) => (
                        <li 
                            key={cat}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragOver={handleDragOver}
                            className="p-3 bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-lg cursor-grab active:cursor-grabbing flex items-center shadow-sm"
                        >
                           {cat}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3 className="text-lg font-bold font-heading text-appText-light dark:text-appText-dark mb-2 flex items-center gap-2">
                    <InformationCircleIcon className="w-6 h-6" />
                    About GrocerGenie
                </h3>
                <div className="p-4 bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-lg space-y-4">
                    <p className="text-center text-sm text-appTextMuted-light dark:text-appTextMuted-dark">
                        Developed & Maintained by <br />
                        <strong className="text-appText-light dark:text-appText-dark"><a href="https://devmonix.io">DevMonix Technologies</a></strong>
                    </p>

                    <div className="space-y-2">
                        <FeatureSection title="Smart Shopping List">
                            <ul className="list-disc list-inside">
                                <li>AI-powered automatic item categorization.</li>
                                <li>Add items with your voice or by scanning barcodes.</li>
                                <li>Track your spending with an integrated budget manager.</li>
                                <li>Customize list layout to match your store's aisles.</li>
                                <li>Easily share your list for online ordering or with family.</li>
                            </ul>
                        </FeatureSection>
                        <FeatureSection title="Intelligent Pantry Tracker">
                            <ul className="list-disc list-inside">
                                <li>Keep track of what you have at home.</li>
                                <li>Get automatic warnings for items expiring soon.</li>
                                <li>Receive recipe suggestions to use up expiring items.</li>
                                <li>Scan your pantry with your camera to add items in bulk.</li>
                                <li>Move low-stock items to your shopping list with one tap.</li>
                            </ul>
                        </FeatureSection>
                        <FeatureSection title="AI Assistant (Chat & Voice)">
                            <ul className="list-disc list-inside">
                                <li>Chat with an AI to manage lists, find recipes, and more.</li>
                                <li>Use the hands-free voice assistant to control the app.</li>
                                <li>Get answers to general knowledge questions.</li>
                            </ul>
                        </FeatureSection>
                        <FeatureSection title="Cookbook & Meal Planning">
                            <ul className="list-disc list-inside">
                                <li>Save recipes from the AI or import them from any website.</li>
                                <li>Let the "Recipe Roulette" pick a random meal for you.</li>
                                <li>Generate multi-day meal plans based on your pantry and diet.</li>
                                <li>Automatically create a shopping list for your meal plan.</li>
                            </ul>
                        </FeatureSection>
                        <FeatureSection title="And More...">
                            <ul className="list-disc list-inside">
                                <li>Find nearby grocery stores with ratings and directions.</li>
                                <li>Full offline support ensures your lists are always available.</li>
                                <li>Customize the app with light/dark themes and multiple languages.</li>
                                <li>Receive push notifications for expiring items.</li>
                            </ul>
                        </FeatureSection>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
