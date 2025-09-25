import { Category } from './types';

export const CATEGORY_COLORS: { [key in Category]: { light: string, dark: string } } = {
  [Category.Produce]: { light: 'bg-green-100 text-green-800 border-green-200', dark: 'dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20' },
  [Category.Dairy]: { light: 'bg-blue-100 text-blue-800 border-blue-200', dark: 'dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' },
  [Category.Meat]: { light: 'bg-red-100 text-red-800 border-red-200', dark: 'dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20' },
  [Category.Bakery]: { light: 'bg-yellow-100 text-yellow-800 border-yellow-200', dark: 'dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20' },
  [Category.Pantry]: { light: 'bg-orange-100 text-orange-800 border-orange-200', dark: 'dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20' },
  [Category.Frozen]: { light: 'bg-sky-100 text-sky-800 border-sky-200', dark: 'dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20' },
  [Category.Drinks]: { light: 'bg-purple-100 text-purple-800 border-purple-200', dark: 'dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20' },
  [Category.Other]: { light: 'bg-slate-100 text-slate-800 border-slate-200', dark: 'dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500/20' },
};

export const CATEGORIES = Object.values(Category);

export const DEFAULT_CATEGORY_ORDER = [...CATEGORIES];
