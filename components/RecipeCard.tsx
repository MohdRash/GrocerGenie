import React from 'react';
import type { Recipe } from '../types';

interface RecipeCardProps {
    recipe: Recipe;
    onSave: () => void;
    onAddToList: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSave, onAddToList }) => (
    <div className="p-4 border border-appBorder-light dark:border-white/10 rounded-xl bg-card-light/50 dark:bg-card-dark/50 shadow-sm">
        <h4 className="font-bold font-heading text-appText-light dark:text-appText-dark">{recipe.recipeName}</h4>
        <div className="mt-3">
            <h5 className="font-semibold text-sm text-appText-light dark:text-appText-dark mb-1">Ingredients:</h5>
            <ul className="list-disc list-inside text-sm text-appTextMuted-light dark:text-appTextMuted-dark">
                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
        </div>
        <div className="mt-3">
            <h5 className="font-semibold text-sm text-appText-light dark:text-appText-dark mb-1">Instructions:</h5>
            <ol className="list-decimal list-inside text-sm text-appTextMuted-light dark:text-appTextMuted-dark space-y-1">
                {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
        </div>
        <div className="flex gap-3 mt-4">
            <button onClick={onAddToList} className="text-sm px-4 py-2 flex-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold transition-transform transform hover:scale-105">Add to List</button>
            <button onClick={onSave} className="text-sm px-4 py-2 flex-1 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-bold transition-transform transform hover:scale-105">Save Recipe</button>
        </div>
    </div>
);

export default RecipeCard;