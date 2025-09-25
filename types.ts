export enum Category {
  Produce = 'Produce',
  Dairy = 'Dairy & Eggs',
  Meat = 'Meat & Seafood',
  Bakery = 'Bakery & Bread',
  Pantry = 'Pantry Staples',
  Frozen = 'Frozen Foods',
  Drinks = 'Beverages',
  Other = 'Other',
}

export interface GroceryItem {
  id: string;
  name: string;
  category: Category;
  completed: boolean;
  quantity: string;
  notes: string;
  price?: number;
}

export interface StorageSpace {
  id: string;
  name: string;
}

export interface PantryItem {
  id: string;
  name: string;
  category: Category;
  expiryDate?: string;
  status: 'stocked' | 'low';
  storageId?: string;
}

export interface Recipe {
  id: string;
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  isSaved?: boolean;
}

export interface DayPlan {
    day: number;
    breakfast: Recipe;
    lunch: Recipe;
    dinner: Recipe;
}

export type MealPlan = DayPlan[];

export enum ActiveView {
  ShoppingList = 'Shopping List',
  Pantry = 'Pantry',
  AIAssistant = 'AI Assistant',
  Recipes = 'Saved Recipes',
  NearbyShops = 'Nearby Shops',
  MealPlan = 'Meal Plan',
  Settings = 'Settings',
}

export type Theme = 'light' | 'dark' | 'system';

export enum Language {
    English = 'en',
    Malayalam = 'ml',
}

export enum DietaryPreference {
  None = "None",
  Vegetarian = "Vegetarian",
  Vegan = "Vegan",
  GlutenFree = "Gluten-Free",
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  address: string;
  rating: number;
  openingHours?: string;
  contactNumber?: string;
  isFavorite?: boolean;
}