import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'tvättstuga_bookings';
const TIME_SLOTS = ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'];

function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

// key: "YYYY-MM-DD|slot" → apartment string
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
  const [bookings, setBookings] = useState(loadBookings);
  const notifTimers = useRef({});

  // Schedule a notification 30 min before a slot
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

  // Re-register notifications on mount / bookings change
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

  function book(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    if (bookings[key]) return false;
    if (!canBook(dateStr)) return false;

    const next = { ...bookings, [key]: apartment };
    saveBookings(next);
    setBookings(next);

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') scheduleNotification(dateStr, slot);
      });
    } else {
      scheduleNotification(dateStr, slot);
    }
    return true;
  }

  function cancel(dateStr, slot) {
    const key = slotKey(dateStr, slot);
    if (bookings[key] !== apartment) return;
    const next = { ...bookings };
    delete next[key];
    saveBookings(next);
    setBookings(next);
    cancelNotification(dateStr, slot);
  }

  return { TIME_SLOTS, todayStr, bookingsForDay, myBookingsForDay, canBook, book, cancel };
}
