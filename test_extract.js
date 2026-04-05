const fs = require('fs');

const json = {
  "status": "ok",
  "data": {
    "aqi": 62,
    "dominentpol": "o3",
    "forecast": {
      "daily": {
        "pm10": [
          {"avg": 20, "day": "2026-04-02"}
        ],
        "pm25": [
          {"avg": 35, "day": "2026-04-02"},
          {"avg": 45, "day": "2026-04-03"},
          {"avg": 29, "day": "2026-04-04"}
        ]
      }
    }
  }
};

function extractWAQITrends(dailyForecast, dominantPol) {
  if (!dailyForecast) return { trend: [], forecast: [] };

  let items = dailyForecast[dominantPol];
  if (!items) {
    items = dailyForecast['pm25'] || dailyForecast['pm10'] || dailyForecast['o3'] || Object.values(dailyForecast)[0];
  }
  
  if (!items || items.length === 0) {
    return { trend: [], forecast: [] };
  }

  const now = new Date(); // local server time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todayIndex = items.findIndex(item => item.day === todayStr);

  if (todayIndex === -1) {
    return { trend: items.map(d => d.avg), forecast: items.map(d => d.avg) };
  }

  const trend = items.slice(0, todayIndex + 1).map(d => d.avg);
  const forecast = items.slice(todayIndex + 1).map(d => d.avg);

  return { trend, forecast, rawDates: items.map(d => d.day) };
}

const data = json.data;
const pollutant = data.dominentpol;
console.log(extractWAQITrends(data.forecast.daily, pollutant));
