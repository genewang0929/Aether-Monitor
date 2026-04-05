const fetch = require('node-fetch');

// simulate fetchCityAQI
async function extract() {
  const url = `https://api.waqi.info/feed/geo:34.05;-118.24/?token=216114a26dbf31c930133cac4a44e40e431cb38f`;
  const resp = await fetch(url);
  const json = await resp.json();
  const data = json.data;
  
  if (!data.forecast || !data.forecast.daily) {
      console.log('NO FORECAST'); return;
  }
  
  const dailyForecast = data.forecast.daily;
  const dominantPol = data.dominentpol;
  
  let items = dailyForecast[dominantPol];
  if (!items) {
    items = dailyForecast['pm25'] || dailyForecast['pm10'] || dailyForecast['o3'] || Object.values(dailyForecast)[0];
  }
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todayIndex = items.findIndex(item => item.day === todayStr);

  const trend = items.slice(0, todayIndex + 1).map(d => d.avg);
  const forecast = items.slice(todayIndex + 1).map(d => d.avg);

  console.log('AQI:', data.aqi);
  console.log('Trend:', trend);
}
extract();
