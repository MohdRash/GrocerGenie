
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Recipe, PantryItem, GroceryItem, Shop, DayPlan } from '../types';
import { Category, DietaryPreference } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
const model = "gemini-2.5-flash";

const getAi = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return ai;
}

export const startChat = (pantry: PantryItem[], shoppingList: GroceryItem[]): Chat => {
    const pantryContext = pantry.length > 0 ? `The user has these items in their pantry: ${pantry.map(i => i.name).join(', ')}.` : "The user's pantry is empty.";
    const shoppingListContext = shoppingList.length > 0 ? `The user's current shopping list includes: ${shoppingList.map(i => i.name).join(', ')}.` : "The user's shopping list is empty.";

    const systemInstruction = `You are GrocerGenie, a friendly and helpful grocery and recipe assistant. 
Your goal is to help users manage their groceries, find recipes, and plan meals.
You have access to the user's pantry and shopping list context.
${pantryContext}
${shoppingListContext}

When you perform an action like adding items or suggesting a recipe, you MUST embed a special JSON block in your response.
The JSON block MUST be wrapped in "[ACTION]" and "[/ACTION]" tags.

1. To add items to the shopping list:
Use this JSON format. Provide a category for each item from this list: ${Object.values(Category).join(', ')}.
Example: "Sure, I'll add those for you. [ACTION]{\"action\":\"add_items\",\"items\":[{\"name\":\"Milk\",\"category\":\"Dairy & Eggs\"},{\"name\":\"Bread\",\"category\":\"Bakery & Bread\"}]}[/ACTION]"

2. To suggest a recipe:
Use this JSON format. Provide a unique ID (you can use a timestamp).
Example: "Here is a recipe for you. [ACTION]{\"action\":\"suggest_recipe\",\"recipe\":{\"id\":\"${Date.now()}\",\"recipeName\":\"Simple Pancakes\",\"ingredients\":[\"1 cup flour\",\"1 egg\"],\"instructions\":[\"Mix ingredients\",\"Cook on griddle.\"]}}[ACTION]"

Always provide a conversational text response alongside the action block. Do not output raw JSON as your only response. Keep your conversational text concise.`;

    return getAi().chats.create({
        model,
        config: {
            systemInstruction,
        },
    });
};

export const generateIngredientsFromMeal = async (mealName: string): Promise<{name: string, category: Category}[]> => {
  try {
    const response = await getAi().models.generateContent({
        model,
        contents: `Generate a list of essential grocery items for making "${mealName}". Do not include common pantry staples like salt, pepper, or water unless a specific type is required. For each item, provide its name and category from this list: ${Object.values(Category).join(', ')}.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the grocery item." },
                        category: { type: Type.STRING, enum: Object.values(Category), description: "The category of the grocery item." },
                    },
                    required: ["name", "category"],
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating ingredients:", error);
    throw new Error("Failed to generate ingredients. The AI may be temporarily unavailable.");
  }
};

export const suggestRecipesFromIngredients = async (ingredients: string[], preference: DietaryPreference): Promise<Recipe[]> => {
    const preferencePrompt = preference !== DietaryPreference.None ? `The user has a dietary preference for ${preference}.` : '';
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Given these ingredients: ${ingredients.join(', ')}, suggest two simple and popular recipes. ${preferencePrompt} For each recipe, provide a name, a bulleted list of ingredients, and numbered step-by-step instructions.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "A unique ID for the recipe, can be a timestamp." },
                            recipeName: { type: Type.STRING, description: "The name of the recipe." },
                            ingredients: { type: Type.ARRAY, items: { type: Type.STRING, description: "A single ingredient." } },
                            instructions: { type: Type.ARRAY, items: { type: Type.STRING, description: "A single instruction step." } }
                        },
                        required: ["id", "recipeName", "ingredients", "instructions"]
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error suggesting recipes:", error);
        throw new Error("Failed to suggest recipes. The AI may be temporarily unavailable.");
    }
};

export const suggestRecipesFromExpiringItems = async (items: PantryItem[]): Promise<Recipe[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemsString = items
        .map(item => {
            if (!item.expiryDate) return `${item.name} (no expiry date)`;
            const expiry = new Date(item.expiryDate);
            const diffTime = expiry.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) return `${item.name} (expired)`;
            if (diffDays === 0) return `${item.name} (expires today)`;
            return `${item.name} (expires in ${diffDays} days)`;
        })
        .join(', ');

    const prompt = `You are an assistant focused on reducing food waste. I have these pantry items: ${itemsString}. Suggest two simple recipes using the items closest to expiring. For each recipe, provide a name, a bulleted list of ingredients, and numbered step-by-step instructions.`;

    try {
        const response = await getAi().models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "A unique ID for the recipe, can be a timestamp." },
                            recipeName: { type: Type.STRING, description: "The name of the recipe." },
                            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                            instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "recipeName", "ingredients", "instructions"]
                    }
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error suggesting recipes from expiring items:", error);
        throw new Error("Failed to suggest recipes. The AI may be temporarily unavailable.");
    }
};


export const categorizeItem = async (itemName: string): Promise<Category> => {
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `What is the most likely grocery store category for "${itemName}"? Choose one from this list: ${Object.values(Category).join(', ')}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: Object.values(Category) }
                    },
                    required: ["category"]
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.category as Category;
    } catch (error) {
        console.error("Error categorizing item:", error);
        return Category.Other;
    }
};

export const analyzeGroceryList = async (items: string[]): Promise<string> => {
    if (items.length === 0) {
        return "Your list is empty! Add some items to get an analysis.";
    }
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Analyze this grocery list: ${items.join(', ')}. Provide a single, actionable, and friendly health tip based on the items. The tip should be concise and easy to understand. Maximum two sentences.`
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing list:", error);
        throw new Error("Failed to analyze the list. The AI may be temporarily unavailable.");
    }
};

export const generateListFromImage = async (base64ImageData: string, mimeType: string): Promise<{name: string, category: Category}[]> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType,
            },
        };
        const textPart = {
            text: `Analyze this image of a grocery list. Carefully extract each grocery item. For each item, provide its name and its most likely category from this list: ${Object.values(Category).join(', ')}. Be precise with item names and ignore any non-grocery text, numbers, or bullet points.`
        };

        const response = await getAi().models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "The name of the grocery item." },
                            category: { type: Type.STRING, enum: Object.values(Category), description: "The category of the grocery item." },
                        },
                        required: ["name", "category"],
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating list from image:", error);
        throw new Error("Failed to read the list from the image. Please ensure the image is clear.");
    }
};

export const generatePantryItemsFromImage = async (base64ImageData: string, mimeType: string): Promise<{name: string, category: Category}[]> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType,
            },
        };
        const textPart = {
            text: `Analyze this image of a pantry or refrigerator. Identify all distinct grocery items visible. For each item, provide its name and the most likely category from this list: ${Object.values(Category).join(', ')}. Ignore non-grocery items, containers unless the product is clear, and try to be specific (e.g., "Milk" instead of "Carton").`
        };

        const response = await getAi().models.generateContent({
            model,
            contents: { parts: [imagePart, textPart] },
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "The name of the grocery item." },
                            category: { type: Type.STRING, enum: Object.values(Category), description: "The category of the grocery item." },
                        },
                        required: ["name", "category"],
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating pantry items from image:", error);
        throw new Error("Failed to identify items from the image. The image might be unclear or the AI is busy.");
    }
};

export const importRecipeFromUrl = async (url: string): Promise<Omit<Recipe, 'id' | 'isSaved'>> => {
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Analyze the recipe at this URL: ${url}. Extract its name, all ingredients, and all instructions. Keep the instructions clear and concise. Respond ONLY with a single minified JSON object in the format: {"recipeName": "...", "ingredients": ["...", "..."], "instructions": ["...", "..."]}. Do not add any other text, markdown, or explanations.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const jsonText = response.text.trim();
        // The response might be wrapped in markdown backticks, so we clean it up.
        const cleanedJson = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsedRecipe = JSON.parse(cleanedJson);

        if (!parsedRecipe.recipeName || !parsedRecipe.ingredients || !parsedRecipe.instructions) {
            throw new Error("AI response did not contain the expected recipe structure.");
        }
        
        return parsedRecipe;

    } catch (error) {
        console.error("Error importing recipe from URL:", error);
        throw new Error("Failed to import the recipe. The AI couldn't read the URL or the page isn't a compatible recipe format.");
    }
};

export const findNearbyShops = async (latitude: number, longitude: number): Promise<Shop[]> => {
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Find grocery stores and supermarkets near latitude ${latitude} and longitude ${longitude}. For each store, provide its name, a short description (e.g., 'Supermarket', 'Organic Store'), its full address, a rating out of 5, its opening hours (e.g., '8 AM - 9 PM'), and its contact number. Default rating to 0 if not found. If opening hours or contact number are not available, return a null or empty string for those fields. Respond ONLY with a single minified JSON array of objects. Do not add any other text, markdown, or explanations.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        const jsonText = response.text.trim();
        const cleanedJson = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const shopsFromApi = JSON.parse(cleanedJson);
        
        // Generate a unique, stable ID for each shop client-side
        return shopsFromApi.map((shop: Omit<Shop, 'id'>) => ({
            ...shop,
            id: btoa(unescape(encodeURIComponent(`${shop.name}-${shop.address}`))),
        }));

    } catch (error) {
        console.error("Error finding nearby shops:", error);
        throw new Error("Failed to find nearby shops. The AI may be temporarily unavailable or there was an issue with your location.");
    }
};

export const lookupBarcode = async (barcode: string): Promise<{name: string, category: Category}> => {
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Look up the product with barcode "${barcode}". Provide its common English name and most likely grocery category from this list: ${Object.values(Category).join(', ')}. If you cannot find the product, you MUST respond with a name of "" and a category of "Other". Respond ONLY with a single minified JSON object in the format: {"name": "...", "category": "..."}. Do not add any other text, markdown, or explanations.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const jsonText = response.text.trim();
        const cleanedJson = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const result = JSON.parse(cleanedJson);

        if (!result.name) { // Check for empty string name
            throw new Error("Product not found for this barcode.");
        }

        return result as {name: string, category: Category};

    } catch (error) {
        console.error("Error looking up barcode:", error);
        // Re-throw specific errors or a generic one
        if (error instanceof Error && error.message.includes("Product not found")) {
            throw error;
        }
        throw new Error("Failed to look up barcode. The product may not be in the database or the AI is unavailable.");
    }
};

export const generateMealPlan = async (pantryItems: string[], days: number, preference: DietaryPreference): Promise<DayPlan[]> => {
    const preferencePrompt = preference !== DietaryPreference.None ? `The user has a dietary preference for ${preference}. Please ensure all recipes adhere to this.` : '';
    const pantryPrompt = pantryItems.length > 0 ? `Prioritize using these ingredients from the user's pantry: ${pantryItems.join(', ')}.` : '';

    const prompt = `Generate a meal plan for ${days} days. For each day, provide a recipe for breakfast, lunch, and dinner. 
${pantryPrompt}
${preferencePrompt}
The recipes should be simple, varied, and well-balanced. 
For each recipe, provide a unique ID (can be a timestamp), a recipe name, a list of ingredients, and a list of instructions.`;

    const recipeSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "A unique ID for the recipe." },
            recipeName: { type: Type.STRING, description: "The recipe's name." },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients." },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of instructions." }
        },
        required: ["id", "recipeName", "ingredients", "instructions"]
    };

    try {
        const response = await getAi().models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.NUMBER, description: "The day number, starting from 1." },
                            breakfast: recipeSchema,
                            lunch: recipeSchema,
                            dinner: recipeSchema,
                        },
                        required: ["day", "breakfast", "lunch", "dinner"]
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating meal plan:", error);
        throw new Error("Failed to generate a meal plan. The AI may be temporarily unavailable.");
    }
};

export const getFunFact = async (): Promise<string> => {
    try {
        const response = await getAi().models.generateContent({
            model,
            contents: `Tell me a short, surprising, and fun fact about food or groceries. Make it one or two sentences.`
        });
        return response.text;
    } catch (error) {
        console.error("Error getting fun fact:", error);
        return "I couldn't think of a fun fact right now, sorry!";
    }
};
