import { useState } from 'react';
import LoginPage from './LoginPage';
import BookingPage from './BookingPage';

export default function App() {
  const [apartment, setApartment] = useState(
    () => sessionStorage.getItem('tvättstuga_apt') || null
  );

  function handleLogin(apt) {
    sessionStorage.setItem('tvättstuga_apt', apt);
    setApartment(apt);
  }

  function handleLogout() {
    sessionStorage.removeItem('tvättstuga_apt');
    setApartment(null);
  }

  if (!apartment) return <LoginPage onLogin={handleLogin} />;
  return <BookingPage apartment={apartment} onLogout={handleLogout} />;
}
