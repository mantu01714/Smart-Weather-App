const apikey = "a4f6ff35182742d587bec16167bed223";
const apiurl = "https://api.openweathermap.org/data/2.5/weather?units=metric";
const geoapi = "https://api.openweathermap.org/geo/1.0/direct?q=";

const weathericon = document.querySelector(".weather-icon");
const searchbox = document.getElementById("city-input");
const searchbtn = document.querySelector(".search button");
const suggestionsList = document.getElementById("suggestions");
const modeLabel = document.getElementById("mode-label");

let map;
let marker;
let tempChartInstance;
let lastDailyData = [];

// ✅ Update Weather UI
function updateWeatherUI(data) {
  document.querySelector(".city").textContent = data.name;
  document.querySelector(".temp").textContent = Math.round(data.main.temp) + "°C";
  document.querySelector(".humidity").textContent = data.main.humidity + "%";
  document.querySelector(".wind").textContent = data.wind.speed + " km/h";

  const condition = data.weather[0].main;
  const iconMap = {
    Clouds: "clouds.png",
    Clear: "clear.png",
    Rain: "rain.png",
    Drizzle: "drizzle.png",
    Mist: "mist.png"
  };
  weathericon.src = iconMap[condition] || "default.png";

  document.querySelector(".weather").style.display = "block";
  document.querySelector(".error").style.display = "none";
}

// ✅ Draw Chart
function drawChart(dailyData) {
  lastDailyData = dailyData;
  const ctx = document.getElementById("tempChart").getContext("2d");

  const labels = dailyData.map(day =>
    new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })
  );
  const temps = dailyData.map(day => Math.round(day.main.temp));

  if (tempChartInstance) tempChartInstance.destroy();

  const isLight = document.body.classList.contains("light");
  const textColor = isLight ? "#111" : "#fff";

  tempChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Temperature (°C)",
        data: temps,
        borderColor: "#00feba",
        backgroundColor: "rgba(0, 254, 186, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor,
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          titleColor: "#000",
          bodyColor: "#000",
          backgroundColor: "#fff"
        }
      },
      scales: {
        y: {
          ticks: {
            color: textColor,
            font: { size: 14 }
          }
        },
        x: {
          ticks: {
            color: textColor,
            font: { size: 14 }
          }
        }
      }
    }
  });
}

// ✅ Fetch Forecast Data
async function fetchForecast(lat, lon) {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apikey}`);
  const data = await res.json();

  const container = document.getElementById("forecast-cards");
  container.innerHTML = "";

  const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);

  dailyData.forEach(day => {
    const date = new Date(day.dt_txt);
    const icon = day.weather[0].icon;
    const temp = Math.round(day.main.temp);
    const desc = day.weather[0].main;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p><strong>${date.toLocaleDateString("en-US", { weekday: 'short' })}</strong></p>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
      <p>${temp}°C</p>
      <p style="font-size:12px">${desc}</p>
    `;
    container.appendChild(card);
  });

  document.getElementById("forecast").style.display = "block";
  drawChart(dailyData);
}

// ✅ Show Map
function showMap(lat, lon) {
  const mapSection = document.querySelector('.map-card');
  mapSection.style.display = 'block';

  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    marker.setLatLng([lat, lon]);
  }
}

// ✅ Get Weather by Coordinates
async function getWeatherByCoordinates(lat, lon) {
  const response = await fetch(`${apiurl}&lat=${lat}&lon=${lon}&appid=${apikey}`);
  if (response.ok) {
    const data = await response.json();
    updateWeatherUI(data);
    fetchForecast(lat, lon);
    showMap(lat, lon);
  } else {
    showError();
  }
}

// ✅ Get Weather by City Name
async function checkWeatherByCity(city) {
  const geoResponse = await fetch(`${geoapi}${city}&limit=1&appid=${apikey}`);
  const geoData = await geoResponse.json();
  if (geoData.length === 0) return showError();

  const { lat, lon } = geoData[0];
  getWeatherByCoordinates(lat, lon);
  showMap(lat, lon);
}

// ✅ Handle Errors
function showError() {
  document.querySelector(".error").style.display = "block";
  document.querySelector(".weather").style.display = "none";
  document.getElementById("forecast").style.display = "none";
}

// ✅ City Suggestions
searchbox.addEventListener("input", async () => {
  const query = searchbox.value.trim();
  if (query.length < 2) {
    suggestionsList.innerHTML = "";
    return;
  }

  const res = await fetch(`${geoapi}${query}&limit=5&appid=${apikey}`);
  const cities = await res.json();

  suggestionsList.innerHTML = "";
  cities.forEach(city => {
    const li = document.createElement("li");
    li.textContent = `${city.name}, ${city.state || ""}, ${city.country}`;
    li.dataset.lat = city.lat;
    li.dataset.lon = city.lon;
    suggestionsList.appendChild(li);
  });
});

// ✅ Handle Suggestion Click
suggestionsList.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const lat = e.target.dataset.lat;
    const lon = e.target.dataset.lon;
    getWeatherByCoordinates(lat, lon);
    searchbox.value = e.target.textContent;
    suggestionsList.innerHTML = "";
  }
});

// ✅ Manual Search Button
searchbtn.addEventListener("click", () => {
  if (searchbox.value.trim() !== "") {
    checkWeatherByCity(searchbox.value.trim());
    suggestionsList.innerHTML = "";
  }
});

// ✅ Theme Toggle
const toggle = document.getElementById("theme-toggle");
toggle.addEventListener("change", () => {
  document.body.classList.toggle("light");
  updateModeLabel();

  // ✅ Force chart redraw for theme switch
  if (lastDailyData.length > 0) {
    drawChart(lastDailyData);
  }
});

function updateModeLabel() {
  const isLight = document.body.classList.contains("light");
  modeLabel.textContent = isLight ? "Light Mode" : "Dark Mode";
}

// ✅ Auto Location Detection
window.addEventListener("load", () => {
  updateModeLabel();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        getWeatherByCoordinates(lat, lon);
      },
      err => {
        console.warn("Location permission denied:", err.message);
        alert("Location access denied. Showing Delhi by default.");
        checkWeatherByCity("Delhi");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } else {
    alert("Geolocation not supported. Showing Delhi by default.");
    checkWeatherByCity("Delhi");
  }
});
