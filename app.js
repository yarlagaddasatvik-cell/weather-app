/**
 * Atmosphere Weather App - Main Application Logic
 * Integrates with Open-Meteo API for real-time global weather data & geocoding
 */

// --- Application State ---
const state = {
  currentLocation: {
    name: 'London',
    country: 'United Kingdom',
    admin1: 'England',
    latitude: 51.5085,
    longitude: -0.1257,
    timezone: 'Europe/London'
  },
  weatherData: null,
  unit: localStorage.getItem('atmosphere_unit') || 'c', // 'c' or 'f'
  searchDebounceTimer: null
};

// --- Weather Code Mappings (WMO Standard) ---
const WEATHER_CODES = {
  0: { label: 'Clear Sky', iconDay: 'fa-sun', iconNight: 'fa-moon', theme: 'clear', color: '#facc15' },
  1: { label: 'Mainly Clear', iconDay: 'fa-cloud-sun', iconNight: 'fa-cloud-moon', theme: 'clear', color: '#facc15' },
  2: { label: 'Partly Cloudy', iconDay: 'fa-cloud-sun', iconNight: 'fa-cloud-moon', theme: 'cloudy', color: '#94a3b8' },
  3: { label: 'Overcast', iconDay: 'fa-cloud', iconNight: 'fa-cloud', theme: 'cloudy', color: '#64748b' },
  45: { label: 'Foggy', iconDay: 'fa-smog', iconNight: 'fa-smog', theme: 'mist', color: '#cbd5e1' },
  48: { label: 'Depositing Rime Fog', iconDay: 'fa-smog', iconNight: 'fa-smog', theme: 'mist', color: '#cbd5e1' },
  51: { label: 'Light Drizzle', iconDay: 'fa-cloud-rain', iconNight: 'fa-cloud-rain', theme: 'rain', color: '#38bdf8' },
  53: { label: 'Moderate Drizzle', iconDay: 'fa-cloud-rain', iconNight: 'fa-cloud-rain', theme: 'rain', color: '#38bdf8' },
  55: { label: 'Dense Drizzle', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy', theme: 'rain', color: '#0284c7' },
  56: { label: 'Freezing Drizzle', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#bae6fd' },
  57: { label: 'Heavy Freezing Drizzle', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#bae6fd' },
  61: { label: 'Slight Rain', iconDay: 'fa-cloud-rain', iconNight: 'fa-cloud-rain', theme: 'rain', color: '#38bdf8' },
  63: { label: 'Moderate Rain', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy', theme: 'rain', color: '#0284c7' },
  65: { label: 'Heavy Rain', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy', theme: 'rain', color: '#0369a1' },
  66: { label: 'Light Freezing Rain', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#bae6fd' },
  67: { label: 'Heavy Freezing Rain', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#bae6fd' },
  71: { label: 'Slight Snowfall', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#e0f2fe' },
  73: { label: 'Moderate Snowfall', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#e0f2fe' },
  75: { label: 'Heavy Snowfall', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#ffffff' },
  77: { label: 'Snow Grains', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#e0f2fe' },
  80: { label: 'Slight Rain Showers', iconDay: 'fa-cloud-sun-rain', iconNight: 'fa-cloud-moon-rain', theme: 'rain', color: '#38bdf8' },
  81: { label: 'Moderate Rain Showers', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy', theme: 'rain', color: '#0284c7' },
  82: { label: 'Violent Rain Showers', iconDay: 'fa-cloud-showers-water', iconNight: 'fa-cloud-showers-water', theme: 'rain', color: '#0369a1' },
  85: { label: 'Slight Snow Showers', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#bae6fd' },
  86: { label: 'Heavy Snow Showers', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake', theme: 'snow', color: '#ffffff' },
  95: { label: 'Thunderstorm', iconDay: 'fa-bolt-lightning', iconNight: 'fa-bolt-lightning', theme: 'thunderstorm', color: '#fbbf24' },
  96: { label: 'Thunderstorm with Hail', iconDay: 'fa-cloud-bolt', iconNight: 'fa-cloud-bolt', theme: 'thunderstorm', color: '#fbbf24' },
  99: { label: 'Severe Thunderstorm', iconDay: 'fa-cloud-bolt', iconNight: 'fa-cloud-bolt', theme: 'thunderstorm', color: '#c084fc' }
};

// Fallback Mock Data in case of offline usage or network issues
const MOCK_WEATHER_DATA = {
  current: {
    temperature_2m: 18.5,
    relative_humidity_2m: 64,
    apparent_temperature: 17.8,
    is_day: 1,
    precipitation: 0,
    weather_code: 1,
    surface_pressure: 1016.4,
    wind_speed_10m: 12.6,
    wind_direction_10m: 75,
    visibility: 10000
  },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => new Date(Date.now() + i * 3600000).toISOString()),
    temperature_2m: [16, 17, 18, 19, 21, 22, 22, 21, 20, 19, 18, 17, 16, 15, 15, 14, 14, 15, 16, 18, 19, 20, 19, 18],
    weather_code: [1, 1, 2, 2, 0, 0, 1, 1, 2, 3, 2, 1, 0, 0, 1, 1, 2, 2, 1, 0, 0, 1, 2, 2],
    precipitation_probability: [5, 5, 10, 10, 0, 0, 5, 10, 15, 20, 10, 5, 0, 0, 5, 5, 10, 10, 5, 0, 0, 5, 10, 10],
    is_day: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
  },
  daily: {
    time: Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000).toISOString()),
    weather_code: [1, 2, 61, 0, 1, 80, 2],
    temperature_2m_max: [22.4, 21.0, 17.5, 23.2, 24.1, 19.8, 20.5],
    temperature_2m_min: [13.2, 14.0, 12.1, 11.5, 13.8, 14.2, 13.0],
    sunrise: ['2026-09-03T06:14:00', '2026-09-04T06:16:00', '2026-09-05T06:18:00', '2026-09-06T06:19:00', '2026-09-07T06:21:00', '2026-09-08T06:22:00', '2026-09-09T06:24:00'],
    sunset: ['2026-09-03T19:45:00', '2026-09-04T19:43:00', '2026-09-05T19:41:00', '2026-09-06T19:38:00', '2026-09-07T19:36:00', '2026-09-08T19:34:00', '2026-09-09T19:32:00'],
    uv_index_max: [4.8, 4.2, 2.1, 5.4, 5.8, 3.2, 4.5],
    precipitation_probability_max: [10, 25, 75, 5, 10, 60, 20]
  }
};

// --- DOM Element References ---
const elements = {
  searchInput: document.getElementById('city-search-input'),
  searchSuggestions: document.getElementById('search-suggestions'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  geoBtn: document.getElementById('geo-location-btn'),
  unitCelsiusBtn: document.getElementById('unit-celsius'),
  unitFahrenheitBtn: document.getElementById('unit-fahrenheit'),
  quickCities: document.getElementById('quick-cities'),
  
  // Hero Section
  locationName: document.getElementById('location-name'),
  locationDateTime: document.getElementById('location-datetime'),
  conditionBadge: document.getElementById('condition-badge'),
  conditionPillText: document.getElementById('condition-pill-text'),
  weatherIconWrapper: document.getElementById('weather-icon-wrapper'),
  currentTemp: document.getElementById('current-temp'),
  weatherConditionText: document.getElementById('weather-condition-text'),
  feelsLikeText: document.getElementById('feels-like-text'),
  tempMax: document.getElementById('temp-max'),
  tempMin: document.getElementById('temp-min'),
  rainChance: document.getElementById('rain-chance'),

  // Forecast containers
  hourlyContainer: document.getElementById('hourly-forecast-container'),
  dailyContainer: document.getElementById('daily-forecast-container'),
  recommendationText: document.getElementById('weather-recommendation'),

  // Metrics
  windSpeed: document.getElementById('wind-speed'),
  windUnit: document.getElementById('wind-unit'),
  windDirBadge: document.getElementById('wind-direction-badge'),
  compassArrow: document.getElementById('compass-arrow'),
  windDesc: document.getElementById('wind-desc'),
  humidityValue: document.getElementById('humidity-value'),
  humidityBar: document.getElementById('humidity-bar'),
  humidityDesc: document.getElementById('humidity-desc'),
  dewPointBadge: document.getElementById('dew-point-badge'),
  uvValue: document.getElementById('uv-value'),
  uvBadge: document.getElementById('uv-badge'),
  uvMarker: document.getElementById('uv-marker'),
  uvAdvice: document.getElementById('uv-advice'),
  visibilityValue: document.getElementById('visibility-value'),
  visibilityUnit: document.getElementById('visibility-unit'),
  visibilityBadge: document.getElementById('visibility-badge'),
  visibilityDesc: document.getElementById('visibility-desc'),
  pressureValue: document.getElementById('pressure-value'),
  pressureBadge: document.getElementById('pressure-badge'),
  pressureDesc: document.getElementById('pressure-desc'),
  sunriseTime: document.getElementById('sunrise-time'),
  sunsetTime: document.getElementById('sunset-time'),
  daylightDuration: document.getElementById('daylight-duration'),
  sunStatus: document.getElementById('sun-status'),

  // Toast
  toast: document.getElementById('toast-message'),
  toastText: document.getElementById('toast-text'),
  toastIcon: document.getElementById('toast-icon')
};

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  setupUnitToggle();
  setupSearchInput();
  setupQuickCities();
  setupGeolocation();
  
  // Initial load with default or saved location
  fetchWeatherForLocation(state.currentLocation);
});

// --- Unit Switching ---
function setupUnitToggle() {
  updateUnitButtonsUI();

  elements.unitCelsiusBtn.addEventListener('click', () => {
    if (state.unit !== 'c') {
      state.unit = 'c';
      localStorage.setItem('atmosphere_unit', 'c');
      updateUnitButtonsUI();
      if (state.weatherData) renderAllWeatherData(state.weatherData);
    }
  });

  elements.unitFahrenheitBtn.addEventListener('click', () => {
    if (state.unit !== 'f') {
      state.unit = 'f';
      localStorage.setItem('atmosphere_unit', 'f');
      updateUnitButtonsUI();
      if (state.weatherData) renderAllWeatherData(state.weatherData);
    }
  });
}

function updateUnitButtonsUI() {
  if (state.unit === 'c') {
    elements.unitCelsiusBtn.classList.add('active');
    elements.unitFahrenheitBtn.classList.remove('active');
  } else {
    elements.unitFahrenheitBtn.classList.add('active');
    elements.unitCelsiusBtn.classList.remove('active');
  }
}

// Convert °C to current state unit
function formatTemp(celsiusValue) {
  if (celsiusValue === undefined || celsiusValue === null) return '--';
  const val = Number(celsiusValue);
  if (state.unit === 'f') {
    return Math.round((val * 9) / 5 + 32);
  }
  return Math.round(val);
}

// Convert km/h to current state unit (mph if fahrenheit)
function formatSpeed(kmh) {
  if (kmh === undefined || kmh === null) return { value: '--', unit: 'km/h' };
  const val = Number(kmh);
  if (state.unit === 'f') {
    return { value: Math.round(val * 0.621371), unit: 'mph' };
  }
  return { value: Math.round(val), unit: 'km/h' };
}

// Convert Visibility (meters) to km or miles
function formatVisibility(meters) {
  if (!meters) return { value: '--', unit: 'km' };
  const km = meters / 1000;
  if (state.unit === 'f') {
    return { value: (km * 0.621371).toFixed(1), unit: 'mi' };
  }
  return { value: km.toFixed(1), unit: 'km' };
}

// Convert wind direction degrees into 16-point cardinal compass
function getWindDirectionCardinal(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

// --- Search & Autocomplete ---
function setupSearchInput() {
  elements.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      elements.clearSearchBtn.classList.remove('hidden');
    } else {
      elements.clearSearchBtn.classList.add('hidden');
      elements.searchSuggestions.classList.add('hidden');
    }

    clearTimeout(state.searchDebounceTimer);
    if (query.length >= 2) {
      state.searchDebounceTimer = setTimeout(() => {
        fetchSearchSuggestions(query);
      }, 300);
    }
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    elements.searchSuggestions.classList.add('hidden');
    elements.searchInput.focus();
  });

  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = elements.searchInput.value.trim();
      if (query.length >= 2) {
        elements.searchSuggestions.classList.add('hidden');
        searchAndSelectCity(query);
      }
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!elements.searchInput.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
      elements.searchSuggestions.classList.add('hidden');
    }
  });
}

// Geocoding API search
async function fetchSearchSuggestions(query) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      renderSearchSuggestions(data.results);
    } else {
      elements.searchSuggestions.innerHTML = `
        <div class="suggestion-item" style="cursor: default; color: var(--text-muted);">
          <i class="fa-solid fa-circle-question"></i>
          <span>No cities found for "${query}"</span>
        </div>`;
      elements.searchSuggestions.classList.remove('hidden');
    }
  } catch (error) {
    console.warn('Geocoding search failed:', error);
  }
}

function renderSearchSuggestions(results) {
  elements.searchSuggestions.innerHTML = results.map(city => {
    const region = [city.admin1, city.country].filter(Boolean).join(', ');
    return `
      <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}" data-country="${city.country || ''}" data-admin1="${city.admin1 || ''}" data-tz="${city.timezone || 'auto'}">
        <i class="fa-solid fa-location-dot"></i>
        <div>
          <div class="suggestion-main">${city.name}</div>
          <div class="suggestion-sub">${region}</div>
        </div>
      </div>
    `;
  }).join('');

  elements.searchSuggestions.classList.remove('hidden');

  elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lon = parseFloat(item.dataset.lon);
      const name = item.dataset.name;
      const country = item.dataset.country;
      const admin1 = item.dataset.admin1;
      const timezone = item.dataset.tz;

      state.currentLocation = { name, country, admin1, latitude: lat, longitude: lon, timezone };
      elements.searchSuggestions.classList.add('hidden');
      elements.searchInput.value = `${name}${country ? ', ' + country : ''}`;
      
      updateActiveChip(name);
      fetchWeatherForLocation(state.currentLocation);
    });
  });
}

async function searchAndSelectCity(cityName) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const city = data.results[0];
      state.currentLocation = {
        name: city.name,
        country: city.country || '',
        admin1: city.admin1 || '',
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone || 'auto'
      };
      updateActiveChip(city.name);
      fetchWeatherForLocation(state.currentLocation);
    } else {
      showToast(`No match found for "${cityName}"`, 'error');
    }
  } catch (error) {
    showToast('Could not search location. Please check connection.', 'error');
  }
}

// --- Quick City Chips ---
function setupQuickCities() {
  elements.quickCities.addEventListener('click', (e) => {
    const chip = e.target.closest('.city-chip');
    if (!chip) return;
    const cityQuery = chip.dataset.city;
    
    document.querySelectorAll('.city-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    searchAndSelectCity(cityQuery.split(',')[0]);
  });
}

function updateActiveChip(cityName) {
  document.querySelectorAll('.city-chip').forEach(chip => {
    const chipCity = chip.dataset.city.split(',')[0].toLowerCase();
    if (cityName.toLowerCase().includes(chipCity) || chipCity.includes(cityName.toLowerCase())) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// --- Geolocation ---
function setupGeolocation() {
  elements.geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    elements.geoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via BigDataCloud or Open-Meteo reverse
          const reverseUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
          const res = await fetch(reverseUrl);
          const data = await res.json();

          const name = data.city || data.locality || data.principalSubdivision || 'Your Location';
          const country = data.countryName || '';

          state.currentLocation = {
            name,
            country,
            admin1: data.principalSubdivision || '',
            latitude,
            longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'
          };

          elements.searchInput.value = `${name}${country ? ', ' + country : ''}`;
          showToast(`Found your location: ${name}`, 'success');
          fetchWeatherForLocation(state.currentLocation);
        } catch (err) {
          state.currentLocation = {
            name: 'Local Location',
            country: '',
            admin1: '',
            latitude,
            longitude,
            timezone: 'auto'
          };
          fetchWeatherForLocation(state.currentLocation);
        } finally {
          elements.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Locate Me</span>';
        }
      },
      (err) => {
        elements.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Locate Me</span>';
        showToast('Location permission denied or unavailable', 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

// ==========================================================================
// WEATHER DATA FETCHING & RENDERING
// ==========================================================================

async function fetchWeatherForLocation(loc) {
  try {
    const { latitude, longitude, timezone } = loc;
    const tzParam = timezone && timezone !== 'auto' ? encodeURIComponent(timezone) : 'auto';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=${tzParam}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    state.weatherData = data;
    renderAllWeatherData(data);
  } catch (error) {
    console.error('Weather fetch error:', error);
    showToast('Offline or API unreachable. Displaying cached forecast.', 'error');
    state.weatherData = MOCK_WEATHER_DATA;
    renderAllWeatherData(MOCK_WEATHER_DATA);
  }
}

function renderAllWeatherData(data) {
  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  const weatherCodeInfo = WEATHER_CODES[current.weather_code] || {
    label: 'Clear Sky',
    iconDay: 'fa-sun',
    iconNight: 'fa-moon',
    theme: 'clear',
    color: '#facc15'
  };

  const isDay = current.is_day === 1;

  // 1. Update Theme Class on Body
  applyWeatherTheme(weatherCodeInfo.theme, isDay);

  // 2. Render Location & Date/Time
  const locTitle = [state.currentLocation.name, state.currentLocation.country].filter(Boolean).join(', ');
  elements.locationName.textContent = locTitle || 'Current Location';

  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  elements.locationDateTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${now.toLocaleDateString('en-US', options)}`;

  // 3. Render Hero Weather Information
  elements.currentTemp.textContent = formatTemp(current.temperature_2m);
  elements.feelsLikeText.innerHTML = `Feels like: <span>${formatTemp(current.apparent_temperature)}°</span>`;
  elements.weatherConditionText.textContent = weatherCodeInfo.label;
  elements.conditionPillText.textContent = isDay ? 'Daytime Outlook' : 'Nighttime Sky';

  const iconClass = isDay ? weatherCodeInfo.iconDay : weatherCodeInfo.iconNight;
  elements.weatherIconWrapper.innerHTML = `<i class="fa-solid ${iconClass} weather-icon-large animated-weather-icon" style="color: ${weatherCodeInfo.color}"></i>`;

  // Hero footer min/max and rain chance from daily[0]
  if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
    elements.tempMax.textContent = `${formatTemp(daily.temperature_2m_max[0])}°`;
    elements.tempMin.textContent = `${formatTemp(daily.temperature_2m_min[0])}°`;
    const rainChanceVal = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    elements.rainChance.textContent = `${rainChanceVal || 0}%`;
  }

  // 4. Render Hourly Forecast Slider (24 hours)
  renderHourlyForecast(hourly, current);

  // 5. Render Highlights & Metrics Grid
  renderWeatherMetrics(current, daily);

  // 6. Render 7-Day Extended Forecast
  renderDailyForecast(daily);

  // 7. Dynamic Smart Recommendation
  generateRecommendation(current, daily, weatherCodeInfo);
}

// Update Body Background Theme
function applyWeatherTheme(themeKey, isDay) {
  document.body.className = ''; // Reset existing theme classes

  if (themeKey === 'clear') {
    document.body.classList.add(isDay ? 'theme-clear-day' : 'theme-clear-night');
  } else if (themeKey === 'cloudy') {
    document.body.classList.add('theme-cloudy');
  } else if (themeKey === 'rain') {
    document.body.classList.add('theme-rain');
  } else if (themeKey === 'thunderstorm') {
    document.body.classList.add('theme-thunderstorm');
  } else if (themeKey === 'snow') {
    document.body.classList.add('theme-snow');
  } else if (themeKey === 'mist') {
    document.body.classList.add('theme-mist');
  } else {
    document.body.classList.add(isDay ? 'theme-clear-day' : 'theme-clear-night');
  }
}

// Hourly Forecast Renderer
function renderHourlyForecast(hourly, current) {
  if (!hourly || !hourly.time) return;

  const currentHourIndex = Math.max(0, new Date().getHours());
  const hoursSliceCount = 24;
  
  // Find index closest to now or take first 24
  let startIndex = 0;
  const nowIsoHour = new Date().toISOString().slice(0, 13);
  const foundIdx = hourly.time.findIndex(t => t.startsWith(nowIsoHour));
  if (foundIdx !== -1) startIndex = foundIdx;

  const hourlyHtml = [];
  for (let i = startIndex; i < Math.min(startIndex + hoursSliceCount, hourly.time.length); i++) {
    const timeStr = hourly.time[i];
    const hourDate = new Date(timeStr);
    const timeFormatted = i === startIndex ? 'Now' : hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    
    const code = hourly.weather_code[i];
    const hourIsDay = hourly.is_day ? hourly.is_day[i] === 1 : (hourDate.getHours() >= 6 && hourDate.getHours() < 20);
    const wInfo = WEATHER_CODES[code] || { iconDay: 'fa-sun', iconNight: 'fa-moon', color: '#facc15' };
    const icon = hourIsDay ? wInfo.iconDay : wInfo.iconNight;
    const temp = formatTemp(hourly.temperature_2m[i]);
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;

    const isActive = i === startIndex ? 'active-hour' : '';

    hourlyHtml.push(`
      <div class="hourly-card ${isActive}">
        <span class="hourly-time">${timeFormatted}</span>
        <i class="fa-solid ${icon} hourly-icon" style="color: ${wInfo.color}"></i>
        <span class="hourly-temp">${temp}°</span>
        <span class="hourly-pop"><i class="fa-solid fa-droplet"></i> ${pop}%</span>
      </div>
    `);
  }

  elements.hourlyContainer.innerHTML = hourlyHtml.join('');
}

// Weather Metrics Grid Renderer
function renderWeatherMetrics(current, daily) {
  // Wind Speed & Compass
  const wind = formatSpeed(current.wind_speed_10m);
  elements.windSpeed.textContent = wind.value;
  elements.windUnit.textContent = wind.unit;
  
  const windDirCard = getWindDirectionCardinal(current.wind_direction_10m);
  elements.windDirBadge.textContent = `${windDirCard} (${current.wind_direction_10m}°)`;
  elements.compassArrow.style.transform = `rotate(${current.wind_direction_10m}deg)`;

  if (current.wind_speed_10m < 10) elements.windDesc.textContent = 'Calm / Gentle breeze';
  else if (current.wind_speed_10m < 28) elements.windDesc.textContent = 'Moderate steady wind';
  else if (current.wind_speed_10m < 45) elements.windDesc.textContent = 'Brisk gusty wind';
  else elements.windDesc.textContent = 'Strong gale warning';

  // Humidity
  elements.humidityValue.textContent = current.relative_humidity_2m;
  elements.humidityBar.style.width = `${Math.min(100, current.relative_humidity_2m)}%`;
  
  if (current.relative_humidity_2m < 35) {
    elements.dewPointBadge.textContent = 'Dry Air';
    elements.humidityDesc.textContent = 'Lower moisture, stay hydrated';
  } else if (current.relative_humidity_2m <= 65) {
    elements.dewPointBadge.textContent = 'Ideal Comfort';
    elements.humidityDesc.textContent = 'Optimal indoor & outdoor humidity';
  } else {
    elements.dewPointBadge.textContent = 'Humid';
    elements.humidityDesc.textContent = 'Muggy atmosphere';
  }

  // UV Index
  const todayUv = daily && daily.uv_index_max ? daily.uv_index_max[0] : 0;
  elements.uvValue.textContent = todayUv !== undefined ? todayUv.toFixed(1) : '0';
  
  const uvPercent = Math.min(100, Math.max(5, (todayUv / 12) * 100));
  elements.uvMarker.style.left = `${uvPercent}%`;

  elements.uvBadge.className = 'sub-badge';
  if (todayUv < 3) {
    elements.uvBadge.classList.add('uv-low');
    elements.uvBadge.textContent = 'Low';
    elements.uvAdvice.textContent = 'No protection required today';
  } else if (todayUv < 6) {
    elements.uvBadge.classList.add('uv-mod');
    elements.uvBadge.textContent = 'Moderate';
    elements.uvAdvice.textContent = 'Wear sunglasses on bright days';
  } else if (todayUv < 8) {
    elements.uvBadge.classList.add('uv-high');
    elements.uvBadge.textContent = 'High';
    elements.uvAdvice.textContent = 'SPF 30+ sunscreen recommended';
  } else if (todayUv < 11) {
    elements.uvBadge.classList.add('uv-veryhigh');
    elements.uvBadge.textContent = 'Very High';
    elements.uvAdvice.textContent = 'Seek shade during midday hours';
  } else {
    elements.uvBadge.classList.add('uv-extreme');
    elements.uvBadge.textContent = 'Extreme';
    elements.uvAdvice.textContent = 'Avoid midday outdoor exposure';
  }

  // Visibility
  const vis = formatVisibility(current.visibility);
  elements.visibilityValue.textContent = vis.value;
  elements.visibilityUnit.textContent = vis.unit;

  const visMeters = current.visibility || 10000;
  if (visMeters >= 9000) {
    elements.visibilityBadge.textContent = 'Excellent';
    elements.visibilityDesc.textContent = 'Clear and crisp visibility';
  } else if (visMeters >= 5000) {
    elements.visibilityBadge.textContent = 'Good';
    elements.visibilityDesc.textContent = 'Normal road visibility';
  } else {
    elements.visibilityBadge.textContent = 'Low / Hazy';
    elements.visibilityDesc.textContent = 'Caution advised while commuting';
  }

  // Atmospheric Pressure
  elements.pressureValue.textContent = Math.round(current.surface_pressure || 1013);
  if (current.surface_pressure > 1020) {
    elements.pressureBadge.textContent = 'High';
    elements.pressureDesc.textContent = 'Fair, settled weather pattern';
  } else if (current.surface_pressure < 1005) {
    elements.pressureBadge.textContent = 'Low';
    elements.pressureDesc.textContent = 'Potential storms or rain approaching';
  } else {
    elements.pressureBadge.textContent = 'Normal';
    elements.pressureDesc.textContent = 'Stable atmospheric pressure';
  }

  // Sunrise & Sunset
  if (daily && daily.sunrise && daily.sunset && daily.sunrise.length > 0) {
    const sunriseDate = new Date(daily.sunrise[0]);
    const sunsetDate = new Date(daily.sunset[0]);

    elements.sunriseTime.textContent = sunriseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    elements.sunsetTime.textContent = sunsetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const diffMs = sunsetDate - sunriseDate;
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / 3600000);
      const diffMins = Math.round((diffMs % 3600000) / 60000);
      elements.daylightDuration.textContent = `${diffHours}h ${diffMins}m daylight`;
    }
  }
}

// 7-Day Forecast Renderer
function renderDailyForecast(daily) {
  if (!daily || !daily.time) return;

  // Calculate global min and max across all 7 days for the proportional range bar
  const allMaxTemps = daily.temperature_2m_max;
  const allMinTemps = daily.temperature_2m_min;
  const globalMin = Math.min(...allMinTemps);
  const globalMax = Math.max(...allMaxTemps);
  const tempRange = Math.max(1, globalMax - globalMin);

  const dailyHtml = daily.time.map((timeStr, idx) => {
    const dayDate = new Date(timeStr);
    const isToday = idx === 0;
    const dayName = isToday ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
    const subDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const code = daily.weather_code[idx];
    const wInfo = WEATHER_CODES[code] || { iconDay: 'fa-sun', color: '#facc15' };

    const minT = daily.temperature_2m_min[idx];
    const maxT = daily.temperature_2m_max[idx];

    // Compute relative bar left and width percentages
    const leftPercent = ((minT - globalMin) / tempRange) * 100;
    const widthPercent = Math.max(12, ((maxT - minT) / tempRange) * 100);

    return `
      <div class="daily-item">
        <div>
          <span class="daily-day">${dayName}</span>
          <span class="daily-sub-date">${subDate}</span>
        </div>
        <div class="daily-icon-box">
          <i class="fa-solid ${wInfo.iconDay}" style="color: ${wInfo.color}"></i>
        </div>
        <div class="temp-bar-container">
          <div class="temp-bar-track">
            <div class="temp-bar-gradient" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
        </div>
        <div class="daily-temps">
          <span class="daily-max">${formatTemp(maxT)}°</span>
          <span class="daily-min">${formatTemp(minT)}°</span>
        </div>
      </div>
    `;
  }).join('');

  elements.dailyContainer.innerHTML = dailyHtml;
}

// Smart Recommendation Engine
function generateRecommendation(current, daily, weatherCode) {
  const currentTemp = current.temperature_2m;
  const rainProb = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
  const uv = daily && daily.uv_index_max ? daily.uv_index_max[0] : 0;
  const wind = current.wind_speed_10m;

  let advice = [];

  if (rainProb >= 50 || current.precipitation > 0 || weatherCode.theme === 'rain') {
    advice.push('🌧️ High chance of rain. Remember to bring an umbrella or waterproof jacket.');
  }

  if (currentTemp <= 5) {
    advice.push('🧣 It is freezing outside. Dress warmly in thermal layers and gloves.');
  } else if (currentTemp <= 15) {
    advice.push('🧥 Crisp temperatures. A light jacket or sweater is recommended.');
  } else if (currentTemp >= 30) {
    advice.push('☀️ High temperatures today. Stay well hydrated and avoid prolonged midday sun.');
  }

  if (uv >= 6) {
    advice.push('🧴 High UV index today. Apply SPF 30+ sunscreen before heading out.');
  }

  if (wind >= 30) {
    advice.push('💨 Strong winds today. Take care if cycling or performing outdoor activities.');
  }

  if (advice.length === 0) {
    advice.push('✨ Weather conditions are calm and pleasant today. Great opportunity for outdoor walks and activities!');
  }

  elements.recommendationText.innerHTML = advice.join('<br><br>');
}

// Toast Feedback Helper
let toastTimeout;
function showToast(message, type = 'error') {
  clearTimeout(toastTimeout);
  elements.toastText.textContent = message;
  elements.toast.className = `toast-notification ${type === 'success' ? 'success' : ''}`;
  elements.toastIcon.className = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';

  toastTimeout = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 4000);
}
