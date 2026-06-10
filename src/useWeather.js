import { useState, useEffect } from 'react';

const WMO_CODES = {
  0: 'Klart',
  1: 'Mestadels klart', 2: 'Delvis molnigt', 3: 'Mulet',
  45: 'Dimma', 48: 'Rimfrost',
  51: 'Duggregn', 53: 'Duggregn', 55: 'Duggregn',
  61: 'Regn', 63: 'Regn', 65: 'Kraftigt regn',
  71: 'Snö', 73: 'Snö', 75: 'Kraftig snö',
  80: 'Regnskurar', 81: 'Regnskurar', 82: 'Kraftiga regnskurar',
  95: 'Åska', 96: 'Åska med hagel', 99: 'Åska med hagel',
};

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=31.63&longitude=-7.99&current_weather=true'
    )
      .then((r) => r.json())
      .then((data) => {
        const cw = data.current_weather;
        setWeather({
          temp: Math.round(cw.temperature),
          wind: Math.round(cw.windspeed),
          description: WMO_CODES[cw.weathercode] ?? 'Okänt',
        });
      })
      .catch(() => setError(true));
  }, []);

  return { weather, error };
}
