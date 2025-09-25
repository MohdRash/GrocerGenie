import React, { useState } from 'react';

// The modal component for importing recipes from a URL.
const ImportRecipeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImport: (url: string) => Promise<void>;
}> = ({ isOpen, onClose, onImport }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async () => {
        if (!url.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            await onImport(url);
            setUrl('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 glassmorphism-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold font-heading mb-4 text-appText-light dark:text-appText-dark">Import Recipe from Web</h2>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark mb-4">Paste the URL of a recipe page and the AI will try to import it for you.</p>
                <div className="space-y-3">
                    <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://example.com/your-favorite-recipe"
                        className="w-full px-4 py-2 bg-background-light dark:bg-slate-900/70 border-2 border-appBorder-light dark:border-appBorder-dark rounded-lg focus:ring-0 focus:border-primary-500 transition"
                    />
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                </div>
                <div className="mt-6 pt-4 border-t border-appBorder-light dark:border-appBorder-dark flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                    <button onClick={handleSubmit} disabled={!url.trim() || isLoading} className="px-4 py-2 w-32 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-primary-500/50">
                        {isLoading ? (
                            <div className="flex justify-center items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: '0s'}}></div>
                                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        ) : "Import"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportRecipeModal;
