import { useState, useEffect } from "react";

interface UserPreferences {
  useFahrenheit: boolean;
  darkMode: boolean;
  favoriteRunType: string;
  favoriteCities: string[];
  completedChecklistItems: string[];
}

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg?: number;
  };
  visibility?: number;
  uvi?: number;
  name: string;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  dt: number;
}

interface CityOption {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
  display: string;
}

interface ClothingRecommendations {
  top: string[];
  bottom: string[];
  accessories: string[];
  footwear: string[];
}

interface ChecklistItem {
  id: string;
  text: string;
  category: 'safety' | 'comfort' | 'performance' | 'weather';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface GearRecommendation {
  id: string;
  name: string;
  brand: string;
  price: string;
  image?: string;
  description: string;
  conditions: string[];
  retailers: {
    name: string;
    link: string;
    price?: string;
  }[];
  sponsored?: boolean;
}

interface RunType {
  id: string;
  name: string;
  icon: string;
}

const API_KEY = "fd9613661cc667a767d33645afc9845d";

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  useFahrenheit: true, // Default to Fahrenheit for US users
  darkMode: false,
  favoriteRunType: 'easy',
  favoriteCities: [],
  completedChecklistItems: []
};

// LocalStorage utilities with fallback
const savePreferences = (preferences: UserPreferences) => {
  try {
    localStorage.setItem('runningWeatherPrefs', JSON.stringify(preferences));
  } catch (error) {
    console.warn('Could not save preferences to localStorage:', error);
  }
};

const loadPreferences = (): UserPreferences => {
  try {
    const saved = localStorage.getItem('runningWeatherPrefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new preference keys
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.warn('Could not load preferences from localStorage:', error);
  }
  return DEFAULT_PREFERENCES;
};

const RUN_TYPES: RunType[] = [
  { id: 'easy', name: 'Easy Run', icon: '🏃‍♂️' },
  { id: 'long', name: 'Long Run', icon: '🏃‍♂️💨' },
  { id: 'workout', name: 'Workout', icon: '💪' },
  { id: 'recovery', name: 'Recovery', icon: '😌' }
];

// Curated gear database - products you actually recommend
const GEAR_DATABASE: GearRecommendation[] = [
  {
    id: 'patagonia-houdini',
    name: 'Houdini Jacket',
    brand: 'Patagonia',
    price: '$99',
    description: 'Ultra-light windbreaker that packs into its own pocket',
    conditions: ['windy', 'cold'],
    retailers: [
      { name: 'Patagonia', link: 'https://www.patagonia.com/product/mens-houdini-jacket/24142.html', price: '$99' },
      { name: 'REI', link: 'https://www.rei.com/product/118892/patagonia-houdini-jacket-mens', price: '$99' },
      { name: 'Amazon', link: 'https://amazon.com/dp/B00KQHQV7G', price: '$89' }
    ]
  },
  {
    id: 'smartwool-gloves',
    name: 'Merino Sport Gloves',
    brand: 'Smartwool',
    price: '$40',
    description: 'Touchscreen-compatible merino wool gloves',
    conditions: ['cold', 'very-cold'],
    retailers: [
      { name: 'Smartwool', link: 'https://www.smartwool.com/shop/merino-sport-fleece-training-glove-sw018092', price: '$40' },
      { name: 'REI', link: 'https://www.rei.com/product/191234/smartwool-merino-sport-fleece-training-gloves', price: '$40' },
      { name: 'Amazon', link: 'https://amazon.com/dp/B08XQJGQXY', price: '$35' }
    ]
  },
  {
    id: 'brooks-ghost-15',
    name: 'Ghost 15',
    brand: 'Brooks',
    price: '$140',
    description: 'Versatile daily trainer with smooth ride',
    conditions: ['any'],
    retailers: [
      { name: 'Brooks', link: 'https://www.brooksrunning.com/en_us/ghost-15-mens-road-running-shoe/110393.html', price: '$140' },
      { name: 'Running Warehouse', link: 'https://www.runningwarehouse.com/Brooks_Ghost_15/descpage-BG15M2.html', price: '$140' },
      { name: 'Amazon', link: 'https://amazon.com/dp/B09TP5QBQT', price: '$119' }
    ]
  },
  {
    id: 'nathan-vest',
    name: 'Reflective Safety Vest',
    brand: 'Nathan',
    price: '$30',
    description: 'Lightweight LED vest for visibility',
    conditions: ['night'],
    retailers: [
      { name: 'Nathan', link: 'https://nathansports.com/products/lightbender-rx-led-vest', price: '$30' },
      { name: 'Running Warehouse', link: 'https://www.runningwarehouse.com/Nathan_LightBender_RX_LED_Vest/descpage-NLBRV.html', price: '$30' },
      { name: 'Amazon', link: 'https://amazon.com/dp/B07QKJJQNK', price: '$28' }
    ]
  }
];

// Enhanced clothing recommendations based on feels-like temperature
function getEnhancedClothingRecommendations(
  temp: number,
  feelsLike: number,
  condition: string,
  windSpeed: number,
  humidity: number,
  isNight: boolean,
  runType: string
): ClothingRecommendations {
  const recommendations: ClothingRecommendations = {
    top: [],
    bottom: [],
    accessories: [],
    footwear: []
  };

  // Use feels-like temperature for clothing decisions
  const effectiveTemp = feelsLike;
  const isWindy = windSpeed > 5;
  const condLower = condition.toLowerCase();

  // Top layers based on feels-like temperature
  if (effectiveTemp <= -5) {
    recommendations.top.push("Thermal base layer", "Insulated jacket", "Wind-resistant outer layer");
  } else if (effectiveTemp <= 0) {
    recommendations.top.push("Thermal long-sleeve", "Insulated vest or light jacket");
  } else if (effectiveTemp <= 5) {
    recommendations.top.push("Long-sleeve technical shirt", "Light wind jacket");
  } else if (effectiveTemp <= 10) {
    recommendations.top.push("Long-sleeve shirt");
    if (isWindy) recommendations.top.push("Light windbreaker");
  } else if (effectiveTemp <= 15) {
    recommendations.top.push("Short-sleeve technical shirt");
    if (runType === 'easy' || runType === 'recovery') {
      recommendations.top.push("Optional: light long-sleeve for warm-up");
    }
  } else if (effectiveTemp <= 25) {
    recommendations.top.push("Lightweight short-sleeve or tank");
  } else {
    recommendations.top.push("Minimal clothing", "Tank top or shirtless");
  }

  // Bottom layers
  if (effectiveTemp <= 0) {
    recommendations.bottom.push("Thermal tights", "Wind-resistant running pants");
  } else if (effectiveTemp <= 10) {
    recommendations.bottom.push("Running tights or thermal leggings");
  } else if (effectiveTemp <= 20) {
    recommendations.bottom.push("Running shorts or capris");
  } else {
    recommendations.bottom.push("Lightweight running shorts");
  }

  // Weather-specific accessories
  if (condLower.includes('rain')) {
    recommendations.accessories.push("Waterproof jacket", "Hat with brim", "Water-resistant gloves");
  }
  
  if (condLower.includes('snow') || effectiveTemp <= -5) {
    recommendations.accessories.push("Warm beanie", "Insulated gloves", "Neck gaiter", "Face protection");
  } else if (effectiveTemp <= 5) {
    recommendations.accessories.push("Light gloves", "Beanie or headband");
  }

  if (isWindy && effectiveTemp <= 15) {
    recommendations.accessories.push("Wind-resistant gloves", "Ear protection");
  }

  // Night/visibility gear
  if (isNight) {
    recommendations.accessories.push("Reflective vest", "LED lights", "Headlamp");
  }

  // Footwear recommendations
  if (condLower.includes('rain') || condLower.includes('snow')) {
    recommendations.footwear.push("Trail shoes with good grip", "Moisture-wicking socks");
  } else {
    recommendations.footwear.push("Regular running shoes", "Moisture-wicking socks");
  }

  if (effectiveTemp <= 0) {
    recommendations.footwear.push("Consider: toe warmers");
  }

  return recommendations;
}

// Generate gear recommendations based on weather conditions
function getGearRecommendations(
  temp: number,
  feelsLike: number,
  condition: string,
  windSpeed: number,
  isNight: boolean
): GearRecommendation[] {
  const effectiveTemp = feelsLike;
  const condLower = condition.toLowerCase();
  const isWindy = windSpeed > 5;
  const isCold = effectiveTemp <= 10;
  const isVeryCold = effectiveTemp <= 0;
  const isRainy = condLower.includes('rain');

  // Determine current conditions
  const currentConditions: string[] = [];
  if (isVeryCold) currentConditions.push('very-cold');
  if (isCold) currentConditions.push('cold');
  if (isWindy) currentConditions.push('windy');
  if (isRainy) currentConditions.push('rain');
  if (isNight) currentConditions.push('night');

  // Filter gear based on conditions
  const relevantGear = GEAR_DATABASE.filter(item => 
    item.conditions.some(condition => currentConditions.includes(condition)) ||
    item.conditions.includes('any')
  );

  // Limit to 3 most relevant items
  return relevantGear.slice(0, 3);
}

// Generate smart running checklist
function generateRunningChecklist(
  weather: WeatherData,
  runType: string,
  feelsLike: number,
  isNight: boolean,
  uvIndex: number = 0
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  const condLower = weather.weather[0].main.toLowerCase();
  const isHot = feelsLike > 25;
  const isCold = feelsLike < 5;
  const isLongRun = runType === 'long';
  const isWorkout = runType === 'workout';

  // Universal items
  checklist.push({
    id: 'hydration',
    text: isHot ? 'Extra hydration (consider electrolytes)' : 'Pre-hydrate (16-20oz water)',
    category: 'performance',
    priority: isHot ? 'high' : 'medium',
    completed: false
  });

  if (isLongRun || isWorkout) {
    checklist.push({
      id: 'fuel',
      text: isLongRun ? 'Fuel strategy planned (gels, snacks)' : 'Light fuel if needed (banana, dates)',
      category: 'performance',
      priority: 'high',
      completed: false
    });
  }

  // Weather-specific items
  if (isHot) {
    checklist.push({
      id: 'heat-prep',
      text: 'Extra water, electrolytes, cooling towel',
      category: 'safety',
      priority: 'high',
      completed: false
    });
  }

  if (uvIndex > 3 || (!isNight && !condLower.includes('cloud'))) {
    checklist.push({
      id: 'sun-protection',
      text: 'Sunscreen (SPF 30+), sunglasses, hat',
      category: 'safety',
      priority: 'high',
      completed: false
    });
  }

  if (isCold) {
    checklist.push({
      id: 'warmup',
      text: 'Warm up indoors before heading out',
      category: 'performance',
      priority: 'medium',
      completed: false
    });
  }

  if (condLower.includes('rain')) {
    checklist.push({
      id: 'rain-prep',
      text: 'Phone protection, dry clothes ready post-run',
      category: 'comfort',
      priority: 'medium',
      completed: false
    });
  }

  if (isNight) {
    checklist.push({
      id: 'visibility',
      text: 'Reflective gear, lights, tell someone your route',
      category: 'safety',
      priority: 'high',
      completed: false
    });
  }

  // Route and logistics
  checklist.push({
    id: 'route',
    text: 'Route planned, distance/time goal set',
    category: 'performance',
    priority: 'medium',
    completed: false
  });

  checklist.push({
    id: 'logistics',
    text: 'Post-run logistics (shower, change, snack)',
    category: 'comfort',
    priority: 'low',
    completed: false
  });

  // Sort by priority: high first, then medium, then low
  return checklist.sort((a, b) => {
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getWeatherInsight(temp: number, feelsLike: number, windSpeed: number, humidity: number): string {
  const tempDiff = Math.abs(temp - feelsLike);
  
  if (tempDiff > 5) {
    if (feelsLike < temp) {
      return `🌬️ Feels ${Math.round(tempDiff)}°C colder due to wind chill`;
    } else {
      return `🥵 Feels ${Math.round(tempDiff)}°C warmer due to humidity`;
    }
  }
  
  if (windSpeed > 8) {
    return `💨 Windy conditions will increase cooling effect`;
  }
  
  if (humidity > 80 && temp > 20) {
    return `💧 High humidity will make it feel warmer and affect cooling`;
  }
  
  return `👌 Comfortable conditions for running`;
}

export default function App() {
  // Load preferences on app start
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [runType, setRunType] = useState(preferences.favoriteRunType);
  const [recommendations, setRecommendations] = useState<ClothingRecommendations | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [gearRecommendations, setGearRecommendations] = useState<GearRecommendation[]>([]);
  const [showGearSection, setShowGearSection] = useState(false);
  const [uvIndex] = useState(3); // Would fetch from UV API in production

  // Derived state from preferences
  const useFahrenheit = preferences.useFahrenheit;
  const darkMode = preferences.darkMode;

  // Update preferences and save to localStorage
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  // Helper functions for updating specific preferences
  const toggleTemperatureUnit = () => {
    updatePreferences({ useFahrenheit: !preferences.useFahrenheit });
  };

  const toggleDarkMode = () => {
    updatePreferences({ darkMode: !preferences.darkMode });
  };

  const updateRunType = (newRunType: string) => {
    setRunType(newRunType);
    updatePreferences({ favoriteRunType: newRunType });
  };

  const addFavoriteCity = (cityDisplay: string) => {
    const favorites = preferences.favoriteCities;
    if (!favorites.includes(cityDisplay) && favorites.length < 5) { // Limit to 5 favorites
      updatePreferences({ 
        favoriteCities: [cityDisplay, ...favorites] 
      });
    }
  };

  const removeFavoriteCity = (cityDisplay: string) => {
    updatePreferences({
      favoriteCities: preferences.favoriteCities.filter(city => city !== cityDisplay)
    });
  };
  // Convert temperature based on user preference
  const convertTemp = (tempC: number): number => {
    return useFahrenheit ? (tempC * 9/5) + 32 : tempC;
  };

  const formatTemp = (tempC: number): string => {
    const converted = convertTemp(tempC);
    const unit = useFahrenheit ? '°F' : '°C';
    return `${Math.round(converted)}${unit}`;
  };

  // Search for cities using OpenWeather Geocoding API
  const searchCities = async (query: string) => {
    if (query.length < 2) {
      setCityOptions([]);
      setShowCityDropdown(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
      );
      const cities = await response.json();

      const cityOptions: CityOption[] = cities.map((city: any) => ({
        name: city.name,
        state: city.state,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
        display: city.state 
          ? `${city.name}, ${city.state}, ${city.country}`
          : `${city.name}, ${city.country}`
      }));

      setCityOptions(cityOptions);
      setShowCityDropdown(cityOptions.length > 0);
    } catch (err) {
      console.error("Error searching cities:", err);
      setCityOptions([]);
      setShowCityDropdown(false);
    }
  };

  // Debounced city search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (location) {
        searchCities(location);
      } else {
        setCityOptions([]);
        setShowCityDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [location]);

  const selectCity = (city: CityOption) => {
    setLocation(city.display);
    setShowCityDropdown(false);
    fetchWeatherByCoordinates(city.lat, city.lon, city.display);
    
    // Add to favorites if not already there
    addFavoriteCity(city.display);
  };

  const fetchWeatherByCoordinates = async (lat: number, lon: number, cityDisplay?: string) => {
    setLoading(true);
    try {
      // Always fetch in metric (Celsius) to keep logic consistent
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
      const response = await fetch(weatherUrl);
      const data = await response.json();

      if (response.ok) {
        setWeather(data);
        setError(null);
        if (cityDisplay) {
          setLocation(cityDisplay);
        }
      } else {
        throw new Error(data.message || "Failed to fetch weather");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeatherByCoordinates(latitude, longitude);
        },
        () => {
          setError("Please enable location services or enter a city name");
          setLoading(false);
        }
      );
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (weather) {
      const now = new Date().getTime() / 1000;
      const isNight = now < weather.sys.sunrise || now > weather.sys.sunset;
      
      // Weather data is always in Celsius, so use directly
      const recs = getEnhancedClothingRecommendations(
        weather.main.temp,
        weather.main.feels_like,
        weather.weather[0].main,
        weather.wind.speed,
        weather.main.humidity,
        isNight,
        runType
      );
      setRecommendations(recs);

      const checklistItems = generateRunningChecklist(
        weather,
        runType,
        weather.main.feels_like,
        isNight,
        uvIndex
      );
      
      // Auto-complete items that user frequently completes
      const itemsWithPreferences = checklistItems.map(item => ({
        ...item,
        completed: preferences.completedChecklistItems.includes(item.id)
      }));
      
      setChecklist(itemsWithPreferences);

      const gearRecs = getGearRecommendations(
        weather.main.temp,
        weather.main.feels_like,
        weather.weather[0].main,
        weather.wind.speed,
        isNight
      );
      setGearRecommendations(gearRecs);
    }
  }, [weather, runType, uvIndex]); // Removed useFahrenheit dependency since it doesn't affect logic

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      
      // Save frequently completed items to preferences
      const completedItems = updated.filter(item => item.completed).map(item => item.id);
      updatePreferences({ completedChecklistItems: completedItems });
      
      return updated;
    });
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const highPriorityIncomplete = checklist.filter(item => 
    item.priority === 'high' && !item.completed
  ).length;

  const themeClasses = darkMode 
    ? "min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white"
    : "min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800";

  const styles = {
    container: {
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)'
        : 'linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 50%, #fff3e0 100%)',
      color: darkMode ? '#f8fafc' : '#1e293b',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      background: darkMode 
        ? 'rgba(30, 41, 59, 0.4)'
        : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      border: darkMode ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(148, 163, 184, 0.3)',
      borderRadius: '24px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      maxWidth: '800px',
      margin: '0 auto 24px auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0
    },
    darkModeButton: {
      padding: '12px',
      borderRadius: '50%',
      border: 'none',
      background: darkMode ? '#fbbf24' : '#374151',
      color: darkMode ? '#374151' : '#fbbf24',
      fontSize: '1.2rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    inputContainer: {
      display: 'flex',
      gap: '12px',
      marginBottom: '32px',
      flexWrap: 'wrap' as const
    },
    input: {
      flex: 1,
      minWidth: '200px',
      padding: '16px 20px',
      borderRadius: '16px',
      border: darkMode ? '2px solid #374151' : '2px solid #e2e8f0',
      background: darkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.9)',
      color: darkMode ? '#f8fafc' : '#1e293b',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.3s ease'
    },
    button: {
      padding: '16px 24px',
      borderRadius: '16px',
      border: 'none',
      background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    locationButton: {
      padding: '16px 20px',
      borderRadius: '16px',
      border: 'none',
      background: darkMode ? '#374151' : '#e2e8f0',
      color: darkMode ? '#f8fafc' : '#1e293b',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    runTypeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
      marginTop: '16px'
    },
    runTypeButton: (isActive: boolean) => ({
      padding: '16px',
      borderRadius: '16px',
      border: isActive ? '2px solid #3b82f6' : darkMode ? '2px solid #374151' : '2px solid #e2e8f0',
      background: isActive 
        ? 'rgba(59, 130, 246, 0.1)' 
        : darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(255, 255, 255, 0.6)',
      color: isActive ? '#3b82f6' : 'inherit',
      cursor: 'pointer',
      textAlign: 'center' as const,
      transition: 'all 0.3s ease',
      fontSize: '14px'
    }),
    weatherCard: {
      background: darkMode 
        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))'
        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))',
      color: 'white',
      borderRadius: '24px',
      padding: '32px',
      marginBottom: '24px',
      maxWidth: '800px',
      margin: '0 auto 24px auto'
    },
    weatherHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      flexWrap: 'wrap' as const,
      gap: '16px'
    },
    temp: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      margin: 0
    },
    feelsLike: {
      fontSize: '1.1rem',
      opacity: 0.9,
      margin: '8px 0 0 0'
    },
    weatherGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    weatherInsight: {
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      padding: '16px',
      backdropFilter: 'blur(10px)'
    },
    clothingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px'
    },
    clothingCategory: {
      background: darkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.9)',
      borderRadius: '16px',
      padding: '20px',
      transition: 'all 0.3s ease'
    },
    checklistItem: (item: ChecklistItem) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '20px',
      borderRadius: '16px',
      border: item.completed
        ? darkMode ? '2px solid rgba(34, 197, 94, 0.5)' : '2px solid rgba(34, 197, 94, 0.3)'
        : item.priority === 'high'
        ? darkMode ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(239, 68, 68, 0.3)'
        : darkMode ? '2px solid rgba(55, 65, 81, 0.5)' : '2px solid rgba(229, 231, 235, 0.5)',
      background: item.completed
        ? darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)'
        : item.priority === 'high'
        ? darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)'
        : darkMode ? 'rgba(55, 65, 81, 0.2)' : 'rgba(255, 255, 255, 0.8)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginBottom: '16px'
    }),
    checkbox: (completed: boolean) => ({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: completed ? '2px solid #22c55e' : darkMode ? '2px solid #6b7280' : '2px solid #d1d5db',
      background: completed ? '#22c55e' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '14px',
      marginTop: '2px',
      transition: 'all 0.3s ease'
    }),
    priorityBadge: (priority: string) => ({
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      marginRight: '8px',
      marginTop: '8px',
      background: priority === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                  priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(107, 114, 128, 0.2)',
      color: priority === 'high' ? '#dc2626' :
             priority === 'medium' ? '#d97706' : '#6b7280'
    }),
    categoryBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      marginTop: '8px',
      background: 'rgba(59, 130, 246, 0.2)',
      color: '#2563eb'
    },
    gearCard: {
      background: darkMode 
        ? 'rgba(55, 65, 81, 0.3)' 
        : 'rgba(255, 255, 255, 0.9)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      border: darkMode ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(229, 231, 235, 0.3)',
      transition: 'all 0.3s ease'
    },
    expandButton: {
      background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 20px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    disclaimer: {
      fontSize: '0.75rem',
      opacity: 0.6,
      textAlign: 'center' as const,
      marginTop: '16px',
      fontStyle: 'italic'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏃‍♂️ Running Weather Advisor</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={toggleTemperatureUnit}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                background: darkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                color: darkMode ? '#f8fafc' : '#1e293b',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {useFahrenheit ? '°F' : '°C'}
            </button>
            <button
              style={styles.darkModeButton}
              onClick={toggleDarkMode}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div style={{ ...styles.inputContainer, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Enter city name"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && cityOptions.length > 0) {
                  selectCity(cityOptions[0]);
                } else if (e.key === 'Escape') {
                  setShowCityDropdown(false);
                }
              }}
              onFocus={() => {
                if (cityOptions.length > 0) setShowCityDropdown(true);
              }}
              style={styles.input}
            />
            {showCityDropdown && cityOptions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: darkMode ? '#374151' : 'white',
                border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {cityOptions.map((city, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectCity(city)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: idx < cityOptions.length - 1 ? (darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb') : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#4b5563' : '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{city.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {city.state ? `${city.state}, ${city.country}` : city.country}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (cityOptions.length > 0) {
                selectCity(cityOptions[0]);
              }
            }}
            style={styles.button}
          >
            Search
          </button>
          <button
            onClick={getCurrentLocation}
            style={styles.locationButton}
          >
            📍
          </button>
        </div>

        <div>
          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Choose Your Run</h3>
          <div style={styles.runTypeGrid}>
            {RUN_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setRunType(type.id)}
                style={styles.runTypeButton(runType === type.id)}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{type.icon}</div>
                <div style={{ fontWeight: '500' }}>{type.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌀</div>
            <div style={{ color: '#3b82f6', fontWeight: '600' }}>Loading weather data...</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          ...styles.card,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {weather && (
        <>
          <div style={styles.weatherCard}>
            <div style={styles.weatherHeader}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  {weather.name}
                  {weather.sys.country && (
                    <span style={{ fontSize: '1.2rem', opacity: 0.8, fontWeight: 'normal' }}>
                      , {weather.sys.country}
                    </span>
                  )}
                </h2>
                <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0, textTransform: 'capitalize' }}>
                  {weather.weather[0].description}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={styles.temp}>{formatTemp(weather.main.temp)}</div>
                <div style={styles.feelsLike}>Feels like {formatTemp(weather.main.feels_like)}</div>
              </div>
            </div>
            
            <div style={styles.weatherGrid}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💨</span>
                <span>Wind: {Math.round(weather.wind.speed * (useFahrenheit ? 2.237 : 1))} {useFahrenheit ? 'mph' : 'm/s'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💧</span>
                <span>Humidity: {weather.main.humidity}%</span>
              </div>
            </div>
            
            <div style={styles.weatherInsight}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 Weather Insight</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {getWeatherInsight(
                  weather.main.temp,
                  weather.main.feels_like,
                  weather.wind.speed,
                  weather.main.humidity
                )}
              </div>
            </div>
          </div>

          {recommendations && (
            <div style={{
              ...styles.card,
              background: darkMode 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(34, 197, 94, 0.05)',
              border: darkMode ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👕</span>
                What to Wear
              </h3>
              <div style={styles.clothingGrid}>
                {Object.entries(recommendations).map(([category, items]: [string, string[]]) => (
                  items.length > 0 && (
                    <div key={category} style={styles.clothingCategory}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {category === 'top' ? '👔 Top' :
                         category === 'bottom' ? '👖 Bottom' :
                         category === 'accessories' ? '🧤 Accessories' : '👟 Footwear'}
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {items.map((item: string, idx: number) => (
                          <li key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px', 
                            marginBottom: '12px',
                            fontSize: '0.9rem'
                          }}>
                            <span style={{ color: '#3b82f6', marginTop: '2px' }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {gearRecommendations.length > 0 && (
            <div style={{
              ...styles.card,
              background: darkMode 
                ? 'rgba(99, 102, 241, 0.1)' 
                : 'rgba(99, 102, 241, 0.05)',
              border: darkMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛍️</span>
                  Relevant Gear
                </h3>
                <button
                  onClick={() => setShowGearSection(!showGearSection)}
                  style={styles.expandButton}
                >
                  {showGearSection ? 'Hide' : 'Show'} Products
                  <span style={{ transform: showGearSection ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                    ▼
                  </span>
                </button>
              </div>

              {!showGearSection && (
                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                  {gearRecommendations.length} products recommended for today's conditions.
                </p>
              )}

              {showGearSection && (
                <div>
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {gearRecommendations.map((item: GearRecommendation) => (
                      <div key={item.id} style={{
                        ...styles.gearCard,
                        padding: '24px',
                        position: 'relative'
                      }}>
                        {item.sponsored && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: '500'
                          }}>
                            Sponsored
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '600' }}>
                              {item.brand} {item.name}
                            </h4>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.5' }}>
                              {item.description}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#16a34a' }}>
                              {item.price}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {item.retailers.map((retailer, idx: number) => (
                            <a
                              key={idx}
                              href={retailer.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 16px',
                                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {retailer.name}
                              {retailer.price && retailer.price !== item.price && (
                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                  {retailer.price}
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem' }}>↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    ...styles.disclaimer,
                    marginTop: '24px',
                    padding: '16px',
                    background: darkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                    borderRadius: '12px'
                  }}>
                    🤝 <strong>Transparency:</strong> These are affiliate links that help support this free app. 
                    Prices and availability may vary. Only gear we'd actually recommend for these conditions.
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{
            ...styles.card,
            background: darkMode 
              ? 'rgba(139, 92, 246, 0.1)' 
              : 'rgba(139, 92, 246, 0.05)',
            border: darkMode ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅</span>
                Running Checklist
              </h3>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {completedCount}/{checklist.length} complete
                </div>
                {highPriorityIncomplete > 0 && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#dc2626',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    marginTop: '8px'
                  }}>
                    <span>⚠️</span>
                    {highPriorityIncomplete} high priority remaining
                  </div>
                )}
              </div>
            </div>

            <div>
              {checklist.map((item: ChecklistItem) => (
                <div
                  key={item.id}
                  style={styles.checklistItem(item)}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  <div style={styles.checkbox(item.completed)}>
                    {item.completed && <span>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '500',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      opacity: item.completed ? 0.6 : 1,
                      marginBottom: '8px'
                    }}>
                      {item.text}
                    </div>
                    <div>
                      <span style={styles.priorityBadge(item.priority)}>
                        {item.priority}
                      </span>
                      <span style={styles.categoryBadge}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {completedCount === checklist.length && (
              <div style={{
                marginTop: '32px',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
                background: darkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                animation: 'pulse 2s infinite'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.3rem', marginBottom: '8px' }}>
                  You're ready to run!
                </div>
                <div style={{ color: '#16a34a', fontSize: '1rem' }}>
                  Have an amazing workout! 💪
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
