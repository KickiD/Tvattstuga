import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:5000';
const TIME_SLOTS = ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'];

function slotKey(date, slot) {
  return `${date}|${slot}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function slotStartMs(dateStr, slot) {
  const hour = parseInt(slot.split('-')[0], 10);
  const d = new Date(dateStr);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

export function useBookings(apartment) {
  // { "YYYY-MM-DD|slot": apartmentName }
  const [bookings, setBookings] = useState({});
  // { "YYYY-MM-DD|slot": numericId } — needed for DELETE
  const bookingIds = useRef({});
  const notifTimers = useRef({});

  useEffect(() => {
    fetch(`${API}/bookings`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        const ids = {};
        data.forEach((b) => {
          const key = slotKey(b.date, b.slot);
          map[key] = b.name;
          ids[key] = b.id;
        });
        setBookings(map);
        bookingIds.current = ids;
      })
      .catch(console.error);
  }, []);

  function scheduleNotification(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    if (notifTimers.current[key]) return;

    const fireAt = slotStartMs(dateStr, slot) - 30 * 60 * 1000;
    const delay = fireAt - Date.now();
    if (delay <= 0) return;

    notifTimers.current[key] = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Tvättstuga', {
          body: `Din bokning ${slot} börjar om 30 minuter.`,
          icon: '/favicon.ico',
        });
      }
    }, delay);
  }

  function cancelNotification(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    clearTimeout(notifTimers.current[key]);
    delete notifTimers.current[key];
  }

  useEffect(() => {
    if (!apartment) return;
    Object.entries(bookings).forEach(([key, apt]) => {
      if (apt !== apartment) return;
      const [dateStr, slot] = key.split('|');
      scheduleNotification(dateStr, slot);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, apartment]);

  function bookingsForDay(dateStr) {
    return Object.entries(bookings)
      .filter(([k]) => k.startsWith(dateStr + '|'))
      .reduce((acc, [k, apt]) => {
        acc[k.split('|')[1]] = apt;
        return acc;
      }, {});
  }

  function myBookingsForDay(dateStr) {
    return Object.entries(bookings)
      .filter(([k, apt]) => k.startsWith(dateStr + '|') && apt === apartment)
      .map(([k]) => k.split('|')[1]);
  }

  function canBook(dateStr) {
    return myBookingsForDay(dateStr).length < 2;
  }

  async function book(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    if (bookings[key]) return false;
    if (!canBook(dateStr)) return false;

    // Optimistic update
    setBookings((prev) => ({ ...prev, [key]: apartment }));

    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, slot, name: apartment }),
      });
      if (!res.ok) throw new Error('Conflict');
      const data = await res.json();
      bookingIds.current[key] = data.id;

      if (Notification.permission === 'default') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') scheduleNotification(dateStr, slot);
        });
      } else {
        scheduleNotification(dateStr, slot);
      }
      return true;
    } catch {
      // Revert optimistic update
      setBookings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return false;
    }
  }

  async function cancel(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    if (bookings[key] !== apartment) return;
    const id = bookingIds.current[key];

    // Optimistic update
    setBookings((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    cancelNotification(dateStr, slot);

    try {
      const res = await fetch(`${API}/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Not found');
      delete bookingIds.current[key];
    } catch {
      // Revert optimistic update
      setBookings((prev) => ({ ...prev, [key]: apartment }));
    }
  }

  return { TIME_SLOTS, todayStr, bookingsForDay, myBookingsForDay, canBook, book, cancel };
}
