


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startChat } from '../services/geminiService';
import { type GroceryItem, type PantryItem, type Recipe, Category } from '../types';
import { SparklesIcon, PaperAirplaneIcon, StopCircleIcon, PlusIcon, CheckCircleIcon } from './icons';
import type { Chat } from '@google/genai';
import RecipeCard from './RecipeCard';

type ParsedAction = {
  action: 'add_items';
  items: { name: string; category: Category }[];
} | {
  action: 'suggest_recipe';
  recipe: Recipe;
};

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  parsedAction?: ParsedAction;
  actionId?: string;
}

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-3">
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
);

const PromptSuggestion: React.FC<{ onPrompt: (prompt: string) => void }> = ({ onPrompt }) => {
    const suggestions = [
        "What can I make with my pantry items?",
        "Give me a healthy recipe for dinner.",
        "Add milk, bread, and eggs to my list.",
        "Create a vegetarian meal plan for 3 days."
    ];
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {suggestions.map(s => (
                <button
                    key={s}
                    onClick={() => onPrompt(s)}
                    className="p-3 text-left text-sm font-medium bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    {s}
                </button>
            ))}
        </div>
    );
};

interface AIAssistantProps {
  pantryItems: PantryItem[];
  groceryList: GroceryItem[];
  onAddGeneratedItems: (items: { name: string; category: Category }[]) => void;
  onSaveRecipe: (recipe: Recipe) => void;
  userInput: string;
  onUserInput: (input: string) => void;
  messageToSend: string | null;
  onMessageSent: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  pantryItems,
  groceryList,
  onAddGeneratedItems,
  onSaveRecipe,
  userInput,
  onUserInput,
  messageToSend,
  onMessageSent
}) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const stopStreamingRef = useRef(false);
    const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

    useEffect(() => {
        const newChat = startChat(pantryItems, groceryList);
        setChat(newChat);
    }, [pantryItems, groceryList]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    const handleSendMessage = useCallback(async (messageText: string) => {
        if (!chat || isStreaming || !messageText.trim()) return;

        const newUserMessage: Message = { role: 'user', parts: [{ text: messageText }] };
        setChatHistory(prev => [...prev, newUserMessage]);
        onUserInput('');
        setIsStreaming(true);
        stopStreamingRef.current = false;

        let responseText = '';
        let stoppedByUser = false;
        try {
            const stream = await chat.sendMessageStream({ message: messageText });
            setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of stream) {
                if (stopStreamingRef.current) {
                    stoppedByUser = true;
                    break;
                }
                responseText += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], parts: [{ text: responseText }] };
                    return newHistory;
                });
            }
        } catch (error) {
            console.error("AI chat error:", error);
            const errorMessage: Message = { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] };
            setChatHistory(prev => {
                 const newHistory = [...prev];
                 if (newHistory[newHistory.length - 1]?.role === 'model' && newHistory[newHistory.length - 1]?.parts[0]?.text === '') {
                     newHistory[newHistory.length - 1] = errorMessage;
                     return newHistory;
                 }
                 return [...newHistory, errorMessage];
            });
        } finally {
            setIsStreaming(false);
            stopStreamingRef.current = false;

            if (stoppedByUser) {
                return; // Exit without parsing actions from partial response
            }
            
            const actionRegex = /\[ACTION\](.*?)\[\/ACTION\]/s;
            const match = responseText.match(actionRegex);

            if (match && match[1]) {
                try {
                    const actionJson = JSON.parse(match[1]);
                    const cleanedText = responseText.replace(actionRegex, '').trim();
                    const actionId = Date.now().toString();

                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const lastMessage = newHistory[newHistory.length - 1];
                        lastMessage.parts = [{ text: cleanedText || 'Done! Here are the details:' }];
                        lastMessage.parsedAction = actionJson;
                        lastMessage.actionId = actionId;
                        return newHistory;
                    });
                } catch (e) {
                    console.error("Failed to parse AI action JSON:", e);
                }
            }
        }
    }, [chat, isStreaming, onUserInput]);
    
    useEffect(() => {
        if (messageToSend) {
            handleSendMessage(messageToSend);
            onMessageSent();
        }
    }, [messageToSend, onMessageSent, handleSendMessage]);

    const handleStopStream = () => {
       stopStreamingRef.current = true;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    const handleAction = (actionId: string, actionFn: () => void) => {
        if (completedActions.has(actionId)) return;
        actionFn();
        setCompletedActions(prev => new Set(prev).add(actionId));
    };

    return (
        <div className="h-[calc(100vh-220px)] flex flex-col bg-card-light dark:bg-card-dark rounded-2xl shadow-lg border border-appBorder-light dark:border-appBorder-dark overflow-hidden">
            <div className="p-4 border-b border-appBorder-light dark:border-appBorder-dark flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-primary-500" />
                <div>
                    <h2 className="text-xl font-bold font-heading">AI Assistant</h2>
                    <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark">Your personal grocery helper.</p>
                </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {chatHistory.length === 0 && !isStreaming ? <PromptSuggestion onPrompt={handleSendMessage} /> : chatHistory.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 text-appText-light dark:text-appText-dark rounded-bl-lg'}`}>
                           {msg.parts.map((part, i) => (
                               <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                           ))}
                        </div>
                        {msg.parsedAction && msg.actionId && (
                            <div className="max-w-md w-full mt-2 animate-fade-in">
                                {(() => {
                                    switch (msg.parsedAction.action) {
                                        case 'add_items':
                                            const addItemsAction = msg.parsedAction;
                                            return (
                                                <div className="p-3 border border-appBorder-light dark:border-appBorder-dark rounded-xl bg-card-light dark:bg-card-dark">
                                                    <h4 className="font-semibold text-sm mb-2">Suggested Items:</h4>
                                                    <ul className="text-sm space-y-1 list-disc list-inside text-appTextMuted-light dark:text-appTextMuted-dark mb-3">
                                                        {addItemsAction.items.map(item => <li key={item.name}>{item.name}</li>)}
                                                    </ul>
                                                    <button 
                                                        onClick={() => handleAction(msg.actionId!, () => onAddGeneratedItems(addItemsAction.items))}
                                                        disabled={completedActions.has(msg.actionId!)}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-green-600 disabled:cursor-default transition-colors">
                                                            {completedActions.has(msg.actionId!) ? <><CheckCircleIcon className="w-5 h-5"/> Added to List</> : <><PlusIcon className="w-5 h-5"/> Add to List</>}
                                                    </button>
                                                </div>
                                            );
                                        case 'suggest_recipe':
                                            const suggestRecipeAction = msg.parsedAction;
                                            return (
                                                <RecipeCard
                                                    recipe={suggestRecipeAction.recipe}
                                                    onAddToList={() => handleAction(msg.actionId! + '-add', () => onAddGeneratedItems(suggestRecipeAction.recipe.ingredients.map(i => ({name: i, category: Category.Other}))))}
                                                    onSave={() => handleAction(msg.actionId! + '-save', () => onSaveRecipe(suggestRecipeAction.recipe))}
                                                />
                                            );
                                        default:
                                            return null;
                                    }
                                })()}
                            </div>
                        )}
                    </div>
                ))}
                {isStreaming && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                         <div className="max-w-md p-3 rounded-2xl bg-slate-200 dark:bg-slate-700">
                           <TypingIndicator />
                         </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-appBorder-light dark:border-appBorder-dark flex items-center gap-3">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => onUserInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-grow px-4 py-3 bg-slate-100 dark:bg-slate-900/70 border-2 border-transparent focus:border-primary-500 rounded-xl focus:ring-0 focus:outline-none transition"
                    disabled={isStreaming}
                />
                {isStreaming ? (
                    <button type="button" onClick={handleStopStream} className="p-3 bg-red-500 text-white rounded-full transition-colors" aria-label="Stop generation">
                        <StopCircleIcon className="w-6 h-6" />
                    </button>
                ) : (
                    <button type="submit" disabled={!userInput.trim()} className="p-3 bg-primary-600 text-white rounded-full transition-colors disabled:bg-primary-400/50 disabled:cursor-not-allowed" aria-label="Send message">
                        <PaperAirplaneIcon className="w-6 h-6" />
                    </button>
                )}
            </form>
        </div>
    );
};

export default AIAssistant;