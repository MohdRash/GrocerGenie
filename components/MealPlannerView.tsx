import React, { useState } from 'react';
import { type PantryItem, type DietaryPreference, type DayPlan, Category } from '../types';
import { generateMealPlan } from '../services/geminiService';
import { CalendarIcon, SparklesIcon, ChevronDownIcon, PlusIcon, ArrowPathIcon } from './icons';
import MealPlanIngredientsModal from './MealPlanIngredientsModal';

const MealPlannerView: React.FC<{
    pantryItems: PantryItem[];
    dietaryPreference: DietaryPreference;
    onAddItemsToList: (items: { name: string; category: Category }[]) => void;
    showToast: (message: string) => void;
}> = ({ pantryItems, dietaryPreference, onAddItemsToList, showToast }) => {
    const [days, setDays] = useState(3);
    const [mealPlan, setMealPlan] = useState<DayPlan[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedDay, setExpandedDay] = useState<number | null>(1);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        setError(null);
        setMealPlan(null);
        try {
            const plan = await generateMealPlan(pantryItems.map(p => p.name), days, dietaryPreference);
            setMealPlan(plan);
            setExpandedDay(1);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const allIngredients = mealPlan?.flatMap(day => [
        ...day.breakfast.ingredients,
        ...day.lunch.ingredients,
        ...day.dinner.ingredients
    ]) || [];

    return (
        <div className="space-y-6">
            <MealPlanIngredientsModal 
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onConfirm={(items) => {
                    onAddItemsToList(items);
                    setIsReviewModalOpen(false);
                }}
                pantryItems={pantryItems.map(p => p.name)}
                requiredIngredients={allIngredients}
            />

            <div className="p-6 bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border border-appBorder-light dark:border-appBorder-dark">
                <div className="flex items-center gap-4">
                    <CalendarIcon className="w-12 h-12 text-primary-500" />
                    <div>
                        <h2 className="text-2xl font-bold font-heading">AI Meal Planner</h2>
                        <p className="text-md text-appTextMuted-light dark:text-appTextMuted-dark">Plan your meals and shopping list in seconds.</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-auto">
                        <label htmlFor="days" className="sr-only">Number of days</label>
                        <select
                            id="days"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="w-full sm:w-auto px-4 py-3 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                        >
                            <option value={3}>3 Days</option>
                            <option value={5}>5 Days</option>
                            <option value={7}>7 Days</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGeneratePlan}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex-grow inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/40 transform hover:-translate-y-0.5 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /><span>Generating...</span></> : <><SparklesIcon className="w-5 h-5" /><span>Generate Plan</span></>}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-500/30 rounded-lg">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {mealPlan && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsReviewModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md"
                        >
                            <PlusIcon className="w-5 h-5"/>
                            Add Missing Ingredients to List
                        </button>
                    </div>
                    {mealPlan.map(dayPlan => (
                        <div key={dayPlan.day} className="bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedDay(expandedDay === dayPlan.day ? null : dayPlan.day)}>
                                <h3 className="text-xl font-bold font-heading">Day {dayPlan.day}</h3>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform ${expandedDay === dayPlan.day ? 'rotate-180' : ''}`} />
                            </div>
                            {expandedDay === dayPlan.day && (
                                <div className="p-4 border-t border-appBorder-light dark:border-appBorder-dark space-y-4">
                                    {['breakfast', 'lunch', 'dinner'].map(mealType => {
                                        const recipe = dayPlan[mealType as keyof DayPlan];
                                        if (typeof recipe !== 'object' || recipe === null) return null;

                                        return (
                                            <div key={mealType}>
                                                <h4 className="font-semibold capitalize text-primary-600 dark:text-primary-300">{mealType}: <span className="text-appText-light dark:text-appText-dark font-bold">{recipe.recipeName}</span></h4>
                                                <div className="pl-4 mt-2">
                                                    <details className="text-sm">
                                                        <summary className="cursor-pointer font-medium text-appTextMuted-light dark:text-appTextMuted-dark">View Details</summary>
                                                        <div className="mt-2 space-y-3 pl-2 border-l-2 border-appBorder-light dark:border-appBorder-dark">
                                                            <div>
                                                                <h5 className="font-semibold">Ingredients:</h5>
                                                                <ul className="list-disc list-inside mt-1">
                                                                    {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <h5 className="font-semibold">Instructions:</h5>
                                                                <ol className="list-decimal list-inside mt-1 space-y-1">
                                                                    {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                                                </ol>
                                                            </div>
                                                        </div>
                                                    </details>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MealPlannerView;