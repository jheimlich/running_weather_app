import { useState, useEffect } from "react";
import "./styles.css";

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
  sys: {
    country: string;
  };
}

interface Recommendations {
  top: string[];
  bottom: string[];
  accessories: string[];
}

const API_KEY = "fd9613661cc667a767d33645afc9845d"; // Replace with your OpenWeather API key

function getWeatherCategory(temp: number, condition: string): string {
  let tempCategory = "";
  if (temp <= 0) tempCategory = "Frigid";
  else if (temp <= 5) tempCategory = "Very Cold";
  else if (temp <= 10) tempCategory = "Cold";
  else if (temp <= 20) tempCategory = "Mild";
  else if (temp <= 25) tempCategory = "Warm";
  else tempCategory = "Hot";

  const conditions = condition.toLowerCase();
  let weatherCategory = "Clear";
  if (conditions.includes("rain")) weatherCategory = "Rainy";
  else if (conditions.includes("snow")) weatherCategory = "Snowy";
  else if (conditions.includes("cloud")) weatherCategory = "Cloudy";
  else if (conditions.includes("fog")) weatherCategory = "Foggy";

  return `${tempCategory} and ${weatherCategory}`;
}

function getWeatherBasedRecommendations(
  temp: number,
  condition: string,
  windSpeed?: number
): Recommendations {
  const recommendations: Recommendations = {
    top: [],
    bottom: [],
    accessories: [],
  };

  // Temperature-based top layers
  if (temp <= 0) {
    recommendations.top.push(
      "Thermal base layer",
      "Insulated running jacket",
      "Long-sleeve compression top"
    );
  } else if (temp <= 5) {
    recommendations.top.push(
      "Long-sleeve thermal shirt",
      "Light running jacket"
    );
  } else if (temp <= 10) {
    recommendations.top.push("Long-sleeve tech shirt", "Light windbreaker");
  } else if (temp <= 20) {
    recommendations.top.push("Short-sleeve tech shirt");
  } else {
    recommendations.top.push("Tank top or sleeveless shirt");
  }

  // Bottom layers
  if (temp <= 5) {
    recommendations.bottom.push("Running tights", "Thermal running pants");
  } else if (temp <= 10) {
    recommendations.bottom.push("Running tights", "Lightweight running pants");
  } else if (temp <= 20) {
    recommendations.bottom.push("Running shorts");
  } else {
    recommendations.bottom.push("Lightweight running shorts");
  }

  // Condition-specific recommendations
  const condLower = condition.toLowerCase();
  if (condLower.includes("rain")) {
    recommendations.top.push("Water-resistant jacket");
    recommendations.accessories.push(
      "Waterproof hat",
      "Water-resistant gloves"
    );
  }

  if (condLower.includes("snow") || temp <= 0) {
    recommendations.accessories.push("Warm gloves", "Beanie", "Neck gaiter");
  }

  if (windSpeed && windSpeed > 10) {
    recommendations.accessories.push("Wind-resistant layer", "Ear warmers");
  }

  return recommendations;
}

export default function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] =
    useState<Recommendations | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [plannedTemp, setPlannedTemp] = useState<number | undefined>();
  const [plannedCondition, setPlannedCondition] = useState("clear");
  const [plannedWindSpeed, setPlannedWindSpeed] = useState<
    number | undefined
  >();

  const weatherConditions = ["Clear", "Cloudy", "Rain", "Snow", "Fog"];

  // Fetch weather by city name (for manual location input)
  const fetchWeatherByCity = async (cityName: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}`
      );
      const data = await response.json();

      if (response.ok) {
        setWeather(data);
        setError(null);
        setRecommendations(
          getWeatherBasedRecommendations(
            data.main.temp,
            data.weather[0].main,
            data.wind.speed
          )
        );
      } else {
        throw new Error(data.message || "Failed to fetch weather");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to fetch weather data for the city");
    } finally {
      setLoading(false);
    }
  };

  // Use the Geolocation API to get the current position
  useEffect(() => {
    if (!isPlanningMode) {
      if ("geolocation" in navigator) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
              const response = await fetch(weatherUrl);
              const data = await response.json();

              if (response.ok) {
                setWeather(data);
                setError(null);
                setRecommendations(
                  getWeatherBasedRecommendations(
                    data.main.temp,
                    data.weather[0].main,
                    data.wind.speed
                  )
                );
              } else {
                throw new Error(data.message || "Failed to fetch weather");
              }
            } catch (err) {
              console.error("Error:", err);
              setError("Failed to fetch weather data");
            } finally {
              setLoading(false);
            }
          },
          (err) => {
            console.error("Geolocation error:", err);
            setError("Please enable location services or enter a city name.");
            setLoading(false);
          }
        );
      } else {
        setError("Geolocation is not supported by your browser");
      }
    }
  }, [isPlanningMode]);

  // Generate recommendations effect (no changes needed here)
  useEffect(() => {
    if (weather && !isPlanningMode) {
      const temp = weather.main.temp;
      const condition = weather.weather[0].main;
      const windSpeed = weather.wind.speed;
      const runningRecs = getWeatherBasedRecommendations(
        temp,
        condition,
        windSpeed
      );
      setRecommendations(runningRecs);
    } else if (isPlanningMode && plannedTemp !== undefined) {
      const runningRecs = getWeatherBasedRecommendations(
        plannedTemp,
        plannedCondition,
        plannedWindSpeed
      );
      setRecommendations(runningRecs);
    }
  }, [
    weather,
    isPlanningMode,
    plannedTemp,
    plannedCondition,
    plannedWindSpeed,
  ]);

  // Handle manual city search
  const handleCitySearch = () => {
    if (manualLocation.trim()) {
      fetchWeatherByCity(manualLocation);
    }
  };

  // Handle "Plan Ahead" button click
  const handlePlanAheadClick = () => {
    setIsPlanningMode(true);
    setRecommendations(null); // Clear recommendations
  };

  return (
    <div className="App">
      <h1>Running Weather Advisor</h1>

      <div className="mode-toggle">
        <button
          className={`mode-button ${!isPlanningMode ? "active" : ""}`}
          onClick={() => {
            setIsPlanningMode(false);
            setRecommendations(null);
          }}
        >
          Current Weather
        </button>
        <button
          className={`mode-button ${isPlanningMode ? "active" : ""}`}
          onClick={handlePlanAheadClick}
        >
          Plan Ahead
        </button>
      </div>

      {!isPlanningMode ? (
        <div>
          {/* Manual Location Input */}
          <div className="manual-location">
            <input
              type="text"
              placeholder="Enter city name"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
            />
            <button onClick={handleCitySearch}>Search</button>
          </div>

          {/* ... (rest of the Current Weather section remains the same) */}
          {loading && <div className="status">Loading weather data...</div>}
          {error && <div className="error">{error}</div>}

          {weather && (
            <div className="weather-info">
              <h2>
                Current Weather in {weather.name}, {weather.sys.country}
              </h2>
              <p>
                Temperature: {Math.round(weather.main.temp)}°C (
                {Math.round((weather.main.temp * 9) / 5 + 32)}°F)
              </p>
              <p>Conditions: {weather.weather[0].main}</p>
              <p>Wind Speed: {Math.round(weather.wind.speed)} m/s</p>
              <div className="weather-category">
                {getWeatherCategory(weather.main.temp, weather.weather[0].main)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="planning-mode">
          <h2>Plan Your Run</h2>
          <div className="planning-inputs">
            <div className="input-group">
              <label>Temperature (°C)</label>
              <input
                type="number"
                value={plannedTemp || ""}
                onChange={(e) => {
                  const temp = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  setPlannedTemp(temp);
                }}
                placeholder="Enter temperature"
              />
            </div>
            <div className="input-group">
              <label>Weather Condition</label>
              <select
                value={plannedCondition}
                onChange={(e) => {
                  setPlannedCondition(e.target.value);
                }}
              >
                {weatherConditions.map((condition) => (
                  <option key={condition} value={condition.toLowerCase()}>
                    {condition}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Wind Speed (m/s)</label>
              <input
                type="number"
                value={plannedWindSpeed || ""}
                onChange={(e) => {
                  const wind = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  setPlannedWindSpeed(wind);
                }}
                placeholder="Enter wind speed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section (no changes needed) */}
      {recommendations && (
        <div className="recommendations">
          <h2>What to Wear</h2>
          <div className="rec-section">
            <h3>Top Layers</h3>
            <ul>
              {recommendations.top.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rec-section">
            <h3>Bottom Layers</h3>
            <ul>
              {recommendations.bottom.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {recommendations.accessories.length > 0 && (
            <div className="rec-section">
              <h3>Accessories</h3>
              <ul>
                {recommendations.accessories.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
