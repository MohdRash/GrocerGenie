import React, { useState, useMemo, useEffect } from 'react';
import { findNearbyShops } from '../services/geminiService';
import { type Shop } from '../types';
import { MapPinIcon, StarIcon, LinkIcon, ArrowPathIcon, ClockIcon, PhoneIcon, HeartIcon } from './icons';
import dbService, { type NearbyShopsCache } from '../services/dbService';

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className="flex items-center text-amber-400">
            {[...Array(fullStars)].map((_, i) => <StarIcon key={`full-${i}`} className="w-5 h-5" />)}
            {/* Note: A proper half-star icon would be better, but for simplicity we'll use a filled one for half ratings for now */}
            {halfStar && <StarIcon key="half" className="w-5 h-5" />}
            {[...Array(emptyStars)].map((_, i) => <StarIcon key={`empty-${i}`} className="w-5 h-5 text-slate-300 dark:text-slate-600" filled={false} />)}
            <span className="ml-2 text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark">{rating.toFixed(1)}</span>
        </div>
    );
};


const ShopCard: React.FC<{ shop: Shop; onToggleFavorite: (shop: Shop) => void; }> = ({ shop, onToggleFavorite }) => (
    <div className="bg-card-light dark:bg-card-dark border border-appBorder-light dark:border-appBorder-dark rounded-xl p-4 shadow-sm animate-fade-in flex flex-col transition-transform transform hover:-translate-y-1 hover:shadow-lg relative">
        <button
            onClick={() => onToggleFavorite(shop)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 backdrop-blur-sm transition-colors"
            aria-label={shop.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <HeartIcon className={`w-5 h-5 ${shop.isFavorite ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`} filled={shop.isFavorite} />
        </button>

        <div className="space-y-3 flex-grow">
            <div>
                <h3 className="text-lg font-bold font-heading pr-8">{shop.name}</h3>
                <p className="text-sm text-appTextMuted-light dark:text-appTextMuted-dark">{shop.description}</p>
            </div>
            <StarRating rating={shop.rating} />
            <div className="space-y-2 pt-3 border-t border-appBorder-light dark:border-appBorder-dark/50">
                <div className="flex items-start gap-2.5 text-sm">
                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-appTextMuted-light dark:text-appTextMuted-dark" />
                    <span className="text-appText-light dark:text-appText-dark">{shop.address}</span>
                </div>
                {shop.openingHours && (
                    <div className="flex items-start gap-2.5 text-sm">
                        <ClockIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-appTextMuted-light dark:text-appTextMuted-dark" />
                        <span className="text-appText-light dark:text-appText-dark">{shop.openingHours}</span>
                    </div>
                )}
                {shop.contactNumber && (
                    <div className="flex items-start gap-2.5 text-sm">
                        <PhoneIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-appTextMuted-light dark:text-appTextMuted-dark" />
                        <a href={`tel:${shop.contactNumber}`} className="text-appText-light dark:text-appText-dark hover:underline">{shop.contactNumber}</a>
                    </div>
                )}
            </div>
        </div>
        <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ', ' + shop.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex self-start items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md text-sm"
        >
            <LinkIcon className="w-4 h-4" />
            Get Directions
        </a>
    </div>
);


const NearbyShopsView: React.FC<{ favoriteShops: Shop[]; onToggleFavorite: (shop: Shop) => void; }> = ({ favoriteShops, onToggleFavorite }) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [sortBy, setSortBy] = useState<'default' | 'rating'>('default');
    const [cachedTimestamp, setCachedTimestamp] = useState<string | null>(null);

    useEffect(() => {
        const loadCachedShops = async () => {
            try {
                const cachedData = await dbService.get<NearbyShopsCache>('nearbyShopsCache', 'lastResult');
                if (cachedData) {
                    setShops(cachedData.shops);
                    setCachedTimestamp(cachedData.timestamp);
                    setHasSearched(true);
                }
            } catch (e) {
                console.warn("Could not load cached shops", e);
            }
        };
        loadCachedShops();
    }, []);

    const shopsWithFavoriteStatus = useMemo(() => {
        const favoriteIds = new Set(favoriteShops.map(s => s.id));
        return shops.map(shop => ({
            ...shop,
            isFavorite: favoriteIds.has(shop.id),
        }));
    }, [shops, favoriteShops]);

    const sortedShops = useMemo(() => {
        if (sortBy === 'rating') {
            return [...shopsWithFavoriteStatus].sort((a, b) => b.rating - a.rating);
        }
        return shopsWithFavoriteStatus;
    }, [shopsWithFavoriteStatus, sortBy]);

    const handleFindShops = () => {
        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        setSortBy('default');

        if (!navigator.onLine) {
            setError("You are offline. Showing last saved results. Please connect to the internet to search again.");
            setIsLoading(false);
            return;
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const foundShops = await findNearbyShops(position.coords.latitude, position.coords.longitude);
                    setShops(foundShops);
                    const cachePayload: NearbyShopsCache = { id: 'lastResult', shops: foundShops, timestamp: new Date().toISOString() };
                    await dbService.put<NearbyShopsCache>('nearbyShopsCache', cachePayload);
                    setCachedTimestamp(cachePayload.timestamp);
                } catch (err: any) {
                    setError(err.message || 'An error occurred while finding shops.');
                } finally {
                    setIsLoading(false);
                }
            },
            (geoError) => {
                switch (geoError.code) {
                    case geoError.PERMISSION_DENIED:
                        setError("Location access was denied. Please enable it in your browser settings.");
                        break;
                    case geoError.POSITION_UNAVAILABLE:
                        setError("Location information is unavailable.");
                        break;
                    case geoError.TIMEOUT:
                        setError("The request to get user location timed out.");
                        break;
                    default:
                        setError("An unknown error occurred while getting your location.");
                        break;
                }
                setIsLoading(false);
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="text-center p-6 bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border border-appBorder-light dark:border-appBorder-dark">
                <MapPinIcon className="w-16 h-16 mx-auto text-primary-500" />
                <h2 className="mt-4 text-2xl font-bold font-heading">Find Grocery Shops Nearby</h2>
                <p className="mt-2 text-md text-appTextMuted-light dark:text-appTextMuted-dark max-w-md mx-auto">
                    Let us use your location to find the best places to shop around you.
                </p>
                <button
                    onClick={handleFindShops}
                    disabled={isLoading}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/40 transform hover:-translate-y-0.5 disabled:bg-primary-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /><span>Searching...</span></> : <>Find Shops Near Me</>}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-500/30 rounded-lg">
                    <p className="font-semibold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {hasSearched && !isLoading && (
                <>
                    {cachedTimestamp && (
                        <p className="text-center text-sm text-appTextMuted-light dark:text-appTextMuted-dark -mb-2">
                           Last updated: {new Date(cachedTimestamp).toLocaleString()}
                        </p>
                    )}
                    {sortedShops.length > 0 && (
                        <div className="flex justify-end items-center gap-2">
                            <span className="text-sm font-medium text-appTextMuted-light dark:text-appTextMuted-dark">Sort by:</span>
                            <button
                                onClick={() => setSortBy('default')}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                                    sortBy === 'default'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                Default
                            </button>
                            <button
                                onClick={() => setSortBy('rating')}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                                    sortBy === 'rating'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                <StarIcon className="w-4 h-4" /> Rating
                            </button>
                        </div>
                    )}
                </>
            )}
            
            {!isLoading && hasSearched && shops.length === 0 && (
                <div className="text-center p-8 bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border border-appBorder-light dark:border-appBorder-dark animate-fade-in">
                    <MapPinIcon className="w-12 h-12 mx-auto text-slate-400" />
                    <h3 className="mt-4 text-xl font-bold font-heading">No Shops Found</h3>
                    <p className="mt-1 text-appTextMuted-light dark:text-appTextMuted-dark">We couldn't find any grocery stores at your current location.</p>
                </div>
            )}
            
            {sortedShops.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedShops.map((shop) => <ShopCard key={shop.id} shop={shop} onToggleFavorite={onToggleFavorite} />)}
                </div>
            )}
        </div>
    );
};

export default NearbyShopsView;