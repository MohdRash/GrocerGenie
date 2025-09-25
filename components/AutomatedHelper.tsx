import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { type GroceryItem, type PantryItem, ActiveView as ActiveViewEnum, Category, Theme } from '../types';
import { ChefHatIcon } from './icons';
import { getFunFact } from '../services/geminiService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- Audio Utility Functions ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Function Declarations for Gemini ---
const tellFunFactDeclaration: FunctionDeclaration = {
    name: 'tellFunFact',
    description: 'Tells the user a fun fact, related to food or groceries if possible.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
    },
};

const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'navigateTo',
        description: 'Navigate to a different view/screen in the application.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                view: {
                    type: Type.STRING,
                    description: 'The name of the view to navigate to.',
                    enum: Object.values(ActiveViewEnum),
                },
            },
            required: ['view'],
        },
    },
    {
        name: 'addGroceryItem',
        description: "Add an item to the user's shopping list. Can optionally include quantity, price, and notes.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the item to add.' },
                category: { type: Type.STRING, description: 'The category of the item.', enum: Object.values(Category) },
                quantity: { type: Type.STRING, description: 'The quantity of the item (e.g., "2 lbs", "1 carton").' },
                price: { type: Type.NUMBER, description: 'The price of the item.' },
                notes: { type: Type.STRING, description: 'Any notes for the item (e.g., "get the organic one").' },
            },
            required: ['name', 'category'],
        },
    },
    {
        name: 'addPantryItem',
        description: 'Add an item to the user\'s pantry.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the item to add.' },
                category: { type: Type.STRING, description: 'The category of the item.', enum: Object.values(Category) },
            },
            required: ['name', 'category'],
        },
    },
    {
        name: 'deleteItem',
        description: 'Delete an item from either the shopping list or the pantry.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the item to delete (case-insensitive).' },
                list: { type: Type.STRING, description: 'The list to delete the item from.', enum: ['shopping list', 'pantry'] },
            },
            required: ['name', 'list'],
        },
    },
    {
        name: 'toggleItemStatus',
        description: "Toggles an item's status. For a shopping list item, it marks it as complete or incomplete. For a pantry item, it marks it as 'low' or 'stocked'.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the item to toggle.' },
                list: { type: Type.STRING, description: 'The list the item is on.', enum: ['shopping list', 'pantry'] },
            },
            required: ['name', 'list'],
        },
    },
    { name: 'clearCompletedItems', description: 'Clears all completed items from the shopping list.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'clearAllItems', description: 'Clears ALL items from the shopping list.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'openOrderPrepModal', description: 'Opens the modal to prepare and share the current shopping list.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'openAddRecipeModal', description: 'Opens the modal to manually add a new recipe.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'openImportRecipeModal', description: 'Opens the modal to import a recipe from a URL.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'spinRecipeRoulette', description: 'Spins the recipe roulette to suggest a random saved recipe.', parameters: { type: Type.OBJECT, properties: {} } },
    {
        name: 'changeTheme',
        description: "Changes the application's visual theme.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                theme: {
                    type: Type.STRING,
                    description: 'The theme to set.',
                    enum: ['light', 'dark', 'system'],
                },
            },
            required: ['theme'],
        },
    },
    {
        name: 'typeInAIAssistant',
        description: "Types the given text into the AI Assistant chat input box, but does not send the message. Also navigates to the AI Assistant view.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING, description: 'The text to type into the input box.' },
            },
            required: ['text'],
        },
    },
    {
        name: 'searchInAIAssistant',
        description: "Navigates to the AI Assistant view, types the given query into the chat input, and immediately sends it as a message.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'The search query to type and send.' },
            },
            required: ['query'],
        },
    },
    tellFunFactDeclaration,
];


interface AutomatedHelperProps {
  groceryList: GroceryItem[];
  pantryItems: PantryItem[];
  onAddGroceryItem: (name: string, category: Category, quantity?: string, price?: number, notes?: string) => void;
  onAddPantryItem: (name: string, category: Category, expiryDate?: string) => void;
  onDeleteGroceryItem: (id: string) => void;
  onDeletePantryItem: (id: string) => void;
  onNavigate: (view: ActiveViewEnum) => void;
  onToggleGroceryItem: (id: string) => void;
  onUpdatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  onClearCompletedItems: () => void;
  onClearAllItems: () => void;
  onOpenOrderPrep: () => void;
  onOpenAddRecipe: () => void;
  onOpenImportRecipe: () => void;
  onSpinRoulette: () => void;
  onThemeChange: (theme: Theme) => void;
  onSetAIAssistantInput: (text: string) => void;
  onSendAIAssistantMessage: (message: string) => void;
}

const AutomatedHelper: React.FC<AutomatedHelperProps> = (props) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const wasMovedRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTimeRef = useRef(0);
    
    // Load position from localStorage on mount
    useEffect(() => {
        const savedPosition = localStorage.getItem('automatedHelperPosition');
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        } else {
            // Default position if none is saved
            setPosition({
                top: window.innerHeight - 150,
                left: window.innerWidth - 90,
            });
        }
    }, []);

    const startSession = async () => {
        if (isSessionActive) return;
        setIsSessionActive(true);

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required for the AI Helper. Please grant permission and try again.");
            setIsSessionActive(false);
            return;
        }

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                    mediaStreamSourceRef.current = source;
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Tool/Function Calls
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            let result = "ok";
                            try {
                                switch (fc.name) {
                                    case 'navigateTo':
                                        props.onNavigate(fc.args.view as ActiveViewEnum);
                                        break;
                                    case 'addGroceryItem':
                                        props.onAddGroceryItem(
                                            fc.args.name as string, 
                                            fc.args.category as Category,
                                            fc.args.quantity as string | undefined,
                                            fc.args.price as number | undefined,
                                            fc.args.notes as string | undefined,
                                        );
                                        break;
                                    case 'addPantryItem':
                                        props.onAddPantryItem(fc.args.name as string, fc.args.category as Category);
                                        break;
                                    case 'deleteItem':
                                        const name = (fc.args.name as string).toLowerCase();
                                        const list = fc.args.list as string;
                                        let itemToDelete;
                                        if (list === 'shopping list') {
                                            itemToDelete = props.groceryList.find(i => i.name.toLowerCase() === name);
                                            if (itemToDelete) props.onDeleteGroceryItem(itemToDelete.id);
                                            else result = `Item "${name}" not found on the shopping list.`;
                                        } else if (list === 'pantry') {
                                            itemToDelete = props.pantryItems.find(i => i.name.toLowerCase() === name);
                                            if (itemToDelete) props.onDeletePantryItem(itemToDelete.id);
                                            else result = `Item "${name}" not found in the pantry.`;
                                        }
                                        break;
                                    case 'toggleItemStatus':
                                        const itemNameToggle = (fc.args.name as string).toLowerCase();
                                        const listToggle = fc.args.list as string;
                                        if (listToggle === 'shopping list') {
                                            const item = props.groceryList.find(i => i.name.toLowerCase() === itemNameToggle);
                                            if (item) props.onToggleGroceryItem(item.id);
                                            else result = `Item "${itemNameToggle}" not found on the shopping list.`;
                                        } else if (listToggle === 'pantry') {
                                            const item = props.pantryItems.find(i => i.name.toLowerCase() === itemNameToggle);
                                            if (item) props.onUpdatePantryItem(item.id, { status: item.status === 'stocked' ? 'low' : 'stocked' });
                                            else result = `Item "${itemNameToggle}" not found in the pantry.`;
                                        }
                                        break;
                                    case 'clearCompletedItems':
                                        props.onClearCompletedItems();
                                        break;
                                    case 'clearAllItems':
                                        props.onClearAllItems();
                                        break;
                                    case 'openOrderPrepModal':
                                        props.onOpenOrderPrep();
                                        break;
                                    case 'openAddRecipeModal':
                                        props.onOpenAddRecipe();
                                        break;
                                    case 'openImportRecipeModal':
                                        props.onOpenImportRecipe();
                                        break;
                                    case 'spinRecipeRoulette':
                                        props.onSpinRoulette();
                                        break;
                                    case 'changeTheme':
                                        props.onThemeChange(fc.args.theme as Theme);
                                        break;
                                    case 'typeInAIAssistant':
                                        props.onNavigate(ActiveViewEnum.AIAssistant);
                                        props.onSetAIAssistantInput(fc.args.text as string);
                                        break;
                                    case 'searchInAIAssistant':
                                        props.onSendAIAssistantMessage(fc.args.query as string);
                                        break;
                                    case 'tellFunFact':
                                        result = await getFunFact();
                                        break;
                                    default:
                                        result = `Unknown function: ${fc.name}`;
                                }
                            } catch (e: any) {
                                result = `Error executing function: ${e.message}`;
                            }
                             sessionPromiseRef.current?.then((session) => {
                                session.sendToolResponse({ functionResponses: { id : fc.id, name: fc.name, response: { result: result } } });
                            });
                        }
                    }

                    // Handle Audio Output
                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        setIsSpeaking(true);
                        const ctx = outputAudioContextRef.current!;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) {
                                setIsSpeaking(false);
                            }
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    closeSession();
                },
                onclose: (e: CloseEvent) => {
                     // The session can be closed by the server, so we should clean up here too.
                    if(isSessionActive) {
                        closeSession();
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                tools: [
                    { functionDeclarations },
                    { googleSearch: {} }
                ],
                systemInstruction: "You are an in-app voice assistant for the GrocerGenie app. Your goal is to help the user by executing functions to control the app OR by answering general knowledge questions using web search. You have a wide range of capabilities. When the user asks you to do something in the app, you MUST call the appropriate function. - Navigation: 'go to the pantry', 'open my saved recipes' -> `navigateTo`. - Adding Items: 'add milk to my list', 'add 2 lbs of apples to my list with a note to get the green ones', 'add eggs to the pantry' -> `addGroceryItem`, `addPantryItem`. You must determine the correct category. For grocery items, you can also include quantity, price, and notes if the user provides them. - Deleting Items: 'delete milk from my shopping list' -> `deleteItem`. - Toggling Items: 'check off milk', 'mark eggs as complete', 'I'm running low on butter' -> `toggleItemStatus`. This handles both shopping list completion and pantry stock levels. - Clearing Lists: 'clear completed items', 'delete everything on my list' -> `clearCompletedItems`, `clearAllItems`. - Recipes: 'add a new recipe', 'import a recipe', 'what should I cook?' -> `openAddRecipeModal`, `openImportRecipeModal`, `spinRecipeRoulette`. - Sharing: 'prepare my order', 'share my list' -> `openOrderPrepModal`. - Fun Facts: 'tell me a fun fact' -> `tellFunFact`. - Theme: 'switch to dark mode', 'use the light theme' -> `changeTheme`. - AI Chat: 'type hello world' -> `typeInAIAssistant`. 'search for healthy snack ideas' -> `searchInAIAssistant`. When the user asks a general knowledge question, like 'what is the capital of France?', use your web search tool to find the answer. Always respond with a short, conversational, and helpful voice message confirming the action or providing the answer."
            },
        });
    };

    const closeSession = () => {
        if (!isSessionActive) return;

        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        setIsSpeaking(false);
        setIsSessionActive(false);
    };

    const handleClick = () => {
        if (wasMovedRef.current) return;
        if (isSessionActive) {
            closeSession();
        } else {
            startSession();
        }
    };

    // --- Dragging Logic ---

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        wasMovedRef.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let newLeft = clientX - dragOffsetRef.current.x;
        let newTop = clientY - dragOffsetRef.current.y;

        const buttonWidth = buttonRef.current?.offsetWidth || 64;
        const buttonHeight = buttonRef.current?.offsetHeight || 64;
        const padding = 16; // 1rem

        newLeft = Math.max(padding, Math.min(newLeft, window.innerWidth - buttonWidth - padding));
        newTop = Math.max(padding, Math.min(newTop, window.innerHeight - buttonHeight - padding));

        setPosition({ top: newTop, left: newLeft });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleDragMove as any);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove as any);
        window.removeEventListener('touchend', handleDragEnd);

        setPosition(currentPos => {
            if (currentPos && wasMovedRef.current) {
                localStorage.setItem('automatedHelperPosition', JSON.stringify(currentPos));
            }
            return currentPos;
        });
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        wasMovedRef.current = false;
        setIsDragging(true);

        const buttonRect = buttonRef.current!.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragOffsetRef.current = {
            x: clientX - buttonRect.left,
            y: clientY - buttonRect.top,
        };
        
        e.preventDefault();
        window.addEventListener('mousemove', handleDragMove as any);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove as any);
        window.addEventListener('touchend', handleDragEnd);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            closeSession();
            window.removeEventListener('mousemove', handleDragMove as any);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove as any);
            window.removeEventListener('touchend', handleDragEnd);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!position) return null; // Don't render until position is loaded

    let buttonClass = 'bg-gradient-to-br from-primary-500 to-secondary-500';
    if(isSpeaking) {
        buttonClass = 'bg-gradient-to-br from-purple-500 to-indigo-500 animate-pulse';
    } else if(isSessionActive) {
        buttonClass = 'bg-gradient-to-br from-red-500 to-orange-500 animate-pulse-bright';
    }

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
            className={`z-40 flex items-center justify-center w-16 h-16 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary-500/50 ${buttonClass} ${isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all duration-300 hover:scale-105'}`}
            aria-label={isSessionActive ? 'Deactivate AI Helper' : 'Activate AI Helper'}
        >
            <ChefHatIcon className="w-8 h-8"/>
        </button>
    );
};

export default AutomatedHelper;