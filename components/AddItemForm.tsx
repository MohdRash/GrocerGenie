import React, { useState, useEffect, useRef } from 'react';
import type { Category, StorageSpace } from '../types';
import { CATEGORIES } from '../constants';
import { PlusIcon, MicIcon, BarcodeIcon, SparklesIcon } from './icons';
import { categorizeItem } from '../services/geminiService';

interface AddItemFormProps {
  onAddItem: (name: string, category: Category, expiryDate?: string, storageId?: string) => void;
  placeholder: string;
  showExpiry?: boolean;
  onBarcodeScan: () => void;
  onVoiceInput: () => void;
  isListening: boolean;
  voiceTranscript: string;
  storageSpaces?: StorageSpace[];
}

const AddItemForm: React.FC<AddItemFormProps> = ({ 
    onAddItem, 
    placeholder, 
    showExpiry = false, 
    onBarcodeScan, 
    onVoiceInput, 
    isListening, 
    voiceTranscript,
    storageSpaces = []
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [storageId, setStorageId] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const debounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (voiceTranscript) {
      setName(voiceTranscript);
    }
  }, [voiceTranscript]);

  useEffect(() => {
    if (name.trim().length > 3) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = window.setTimeout(() => {
        setIsCategorizing(true);
        categorizeItem(name.trim()).then(suggestedCategory => {
          if (suggestedCategory) {
            setCategory(suggestedCategory);
          }
        }).finally(() => setIsCategorizing(false));
      }, 700);
    }
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddItem(name.trim(), category, showExpiry ? expiryDate : undefined, showExpiry ? storageId : undefined);
      setName('');
      setCategory(CATEGORIES[0]);
      setExpiryDate('');
      setStorageId('');
    }
  };
  
  const hasExtraFields = showExpiry || (storageSpaces && storageSpaces.length > 0);
  const gridCols = hasExtraFields ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card-light/70 dark:bg-card-dark/70 backdrop-blur-lg border-t border-appBorder-light dark:border-appBorder-dark space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-grow px-4 py-3 text-appText-light dark:text-appText-dark bg-slate-100 dark:bg-slate-900/70 border-2 border-transparent focus:border-primary-500 rounded-xl focus:ring-0 focus:outline-none transition"
        />
        <button type="button" onClick={onVoiceInput} className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse-bright' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`} aria-label="Use voice input">
            <MicIcon className="w-5 h-5"/>
        </button>
        <button type="button" onClick={onBarcodeScan} className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" aria-label="Scan barcode">
            <BarcodeIcon className="w-5 h-5"/>
        </button>
      </div>
      <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full appearance-none px-4 py-3 text-appText-light dark:text-appText-dark border-2 border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-slate-800 focus:ring-primary-500 focus:border-primary-500 transition"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {isCategorizing && <SparklesIcon className="w-5 h-5 text-primary-500 absolute right-3 top-1/2 -translate-y-1/2 animate-pulse" />}
        </div>
        {showExpiry && (
            <>
            <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="px-4 py-3 border-2 border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-slate-800 text-appText-light dark:text-appText-dark focus:ring-primary-500 focus:border-primary-500 transition"
            />
            <select
                value={storageId}
                onChange={(e) => setStorageId(e.target.value)}
                className="w-full appearance-none px-4 py-3 text-appText-light dark:text-appText-dark border-2 border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-slate-800 focus:ring-primary-500 focus:border-primary-500 transition"
            >
                <option value="">No Space</option>
                {storageSpaces.map((space) => (
                    <option key={space.id} value={space.id}>
                        {space.name}
                    </option>
                ))}
            </select>
            </>
        )}
        <button
          type="submit"
          className={`flex justify-center items-center gap-2 px-4 py-3 bg-gradient-to-br from-primary-500 to-secondary-500 text-white font-bold rounded-xl hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/50 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed shadow-lg hover:shadow-primary-500/30 transform hover:-translate-y-1 ${!hasExtraFields ? 'sm:col-span-1' : ''} ${hasExtraFields && !showExpiry ? 'sm:col-span-2' : ''}`}
          disabled={!name.trim()}
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>
    </form>
  );
};

export default AddItemForm;