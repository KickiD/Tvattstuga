import { useState, useEffect } from 'react';

const APOD_URL =
  'https://api.nasa.gov/planetary/apod?api_key=5M7RcSO9pkIwP4aqEB3zhq02b4UqVtsuTAioLerD';

export function useApod() {
  const [apod, setApod] = useState(null);

  useEffect(() => {
    fetch(APOD_URL)
      .then((r) => r.json())
      .then((data) => setApod(data))
      .catch(() => {});
  }, []);

  return apod;
}
