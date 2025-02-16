// Local Storage Keys
const STORAGE_KEYS = {
    TIME_FORMAT: 'worldClock_timeFormat',
    CUSTOM_TIMEZONES: 'worldClock_customTimezones',
    WEATHER_ENABLED: 'worldClock_weatherEnabled'
};

// Default time zones
let timeZones = {
    'kabul': 'Asia/Kabul',
    'new-york': 'America/New_York',
    'london': 'Europe/London',
    'tokyo': 'Asia/Tokyo',
    'sydney': 'Australia/Sydney'
};

// State management
let settings = {
    timeFormat: localStorage.getItem(STORAGE_KEYS.TIME_FORMAT) || '24',
    weatherEnabled: localStorage.getItem(STORAGE_KEYS.WEATHER_ENABLED) === 'true',
    customTimezones: JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_TIMEZONES) || '[]')
};

// Initialize the application
function init() {
    loadStoredSettings();
    setupEventListeners();
    createClocks();
    updateClocks();
    if (settings.weatherEnabled) {
        fetchWeather('Kabul');
    }
    setInterval(updateClocks, 1000);
}

// Load settings from localStorage
function loadStoredSettings() {
    document.getElementById('timeFormat').value = settings.timeFormat;
    document.getElementById('weatherToggle').checked = settings.weatherEnabled;
    
    // Add custom timezones
    settings.customTimezones.forEach(tz => {
        timeZones[tz.id] = tz.zone;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Settings toggle
    document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
    
    // Time format change
    document.getElementById('timeFormat').addEventListener('change', (e) => {
        settings.timeFormat = e.target.value;
        localStorage.setItem(STORAGE_KEYS.TIME_FORMAT, settings.timeFormat);
        updateClocks();
    });

    // Weather toggle
    document.getElementById('weatherToggle').addEventListener('change', (e) => {
        settings.weatherEnabled = e.target.checked;
        localStorage.setItem(STORAGE_KEYS.WEATHER_ENABLED, settings.weatherEnabled);
        if (settings.weatherEnabled) {
            fetchWeather('Kabul');
        } else {
            document.getElementById('kabul-weather').innerHTML = '';
        }
    });

    // Time zone search
    const searchInput = document.getElementById('timeZoneSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const zones = Intl.supportedValuesOf('timeZone')
            .filter(zone => zone.toLowerCase().includes(query.toLowerCase()));
        
        displaySearchResults(zones, searchResults);
    }, 300));
}

// Create clock elements
function createClocks() {
    const container = document.getElementById('clocksContainer');
    container.innerHTML = ''; // Clear existing clocks

    Object.entries(timeZones).forEach(([cityId, timeZone]) => {
        if (cityId === 'kabul') return; // Skip Kabul as it's the main clock

        const clockDiv = document.createElement('div');
        clockDiv.className = 'clock';
        clockDiv.innerHTML = `
            <button class="remove-btn" data-city="${cityId}">
                <i class="fas fa-times"></i>
            </button>
            <h2>${formatTimeZoneName(timeZone)}</h2>
            <div id="${cityId}" class="time"></div>
        `;
        
        // Add remove button event listener
        clockDiv.querySelector('.remove-btn').addEventListener('click', () => removeTimeZone(cityId));
        
        container.appendChild(clockDiv);
    });
}

// Update all clocks
function updateClocks() {
    const now = new Date();

    Object.entries(timeZones).forEach(([cityId, timeZone]) => {
        try {
            const cityTime = now.toLocaleTimeString('en-US', {
                timeZone: timeZone,
                hour12: settings.timeFormat === '12',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const element = document.getElementById(cityId);
            if (element) {
                element.textContent = cityTime;
            }

            // Update date for Kabul (main clock)
            if (cityId === 'kabul') {
                const kabulDate = now.toLocaleDateString('en-US', {
                    timeZone: timeZone,
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                document.getElementById('kabul-date').textContent = kabulDate;
            }
        } catch (error) {
            console.error(`Error updating clock for ${cityId}:`, error);
        }
    });
}

// Weather API functions
async function fetchWeather(city) {
    const API_KEY = 'YOUR_WEATHER_API_KEY'; // Replace with your actual API key
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
        );
        const data = await response.json();
        
        if (response.ok) {
            const weatherDiv = document.getElementById('kabul-weather');
            weatherDiv.innerHTML = `
                <i class="fas fa-temperature-high"></i> ${Math.round(data.main.temp)}°C
                <i class="fas fa-water"></i> ${data.main.humidity}%
            `;
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// Utility functions
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

function formatTimeZoneName(timeZone) {
    return timeZone.split('/').pop().replace(/_/g, ' ');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function displaySearchResults(zones, resultsDiv) {
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = zones
        .slice(0, 10)
        .map(zone => `
            <div class="search-result-item" data-zone="${zone}">
                ${formatTimeZoneName(zone)}
            </div>
        `)
        .join('');

    resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => addNewTimeZone(item.dataset.zone));
    });
}

function addNewTimeZone(zone) {
    const id = zone.toLowerCase().replace(/\//g, '-');
    if (timeZones[id]) return; // Prevent duplicates

    timeZones[id] = zone;
    settings.customTimezones.push({ id, zone });
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TIMEZONES, JSON.stringify(settings.customTimezones));
    
    createClocks();
    updateClocks();
    
    // Clear search
    document.getElementById('timeZoneSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

function removeTimeZone(cityId) {
    if (cityId === 'kabul') return; // Prevent removing main clock
    
    delete timeZones[cityId];
    settings.customTimezones = settings.customTimezones.filter(tz => tz.id !== cityId);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TIMEZONES, JSON.stringify(settings.customTimezones));
    
    createClocks();
}

// Initialize the application
init();