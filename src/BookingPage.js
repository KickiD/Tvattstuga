import { useState } from 'react';
import { useBookings } from './useBookings';
import { useWeather } from './useWeather';
import { useApod } from './useApod';

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function weekLabel(weekStart) {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(weekStart + 'T12:00:00');
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  return `${startStr} – ${endStr}`;
}

export default function BookingPage({ apartment, onLogout }) {
  const { TIME_SLOTS, todayStr, bookingsForDay, myBookingsForDay, canBook, book, cancel } =
    useBookings(apartment);
  const { weather, error: weatherError } = useWeather();
  const apod = useApod();

  const today = todayStr();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [pendingSlot, setPendingSlot] = useState(null);

  const thisMonday = getMondayOf(today);
  const weekStart = addDays(thisMonday, weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function goToPrevWeek() {
    if (weekOffset === 0) return;
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    const newStart = addDays(thisMonday, newOffset * 7);
    setSelectedDate(newOffset === 0 ? today : newStart);
  }

  function goToNextWeek() {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    setSelectedDate(addDays(thisMonday, newOffset * 7));
  }

  const dayBookings = bookingsForDay(selectedDate);
  const mySlots = myBookingsForDay(selectedDate);
  const atLimit = mySlots.length >= 2;

  function handleSlot(slot) {
    const isBooked = !!dayBookings[slot];
    const isMine = dayBookings[slot] === apartment;
    if (isMine) {
      cancel(selectedDate, slot);
    } else if (!isBooked && !atLimit) {
      setPendingSlot(slot);
    }
  }

  function confirmBooking() {
    book(selectedDate, pendingSlot);
    setPendingSlot(null);
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <span style={s.headerTitle}>Tvättstuga</span>
          <span style={s.headerApt}>Lgh {apartment}</span>
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>Logga ut</button>
      </header>

      {/* Weather */}
      <div style={s.weather}>
        {weather ? (
          <span>
            Marrakech: <strong>{weather.temp}°C</strong>, {weather.description},{' '}
            <span style={{ color: '#888' }}>{weather.wind} km/h</span>
          </span>
        ) : weatherError ? (
          <span style={{ color: '#bbb' }}>Väder ej tillgängligt</span>
        ) : (
          <span style={{ color: '#ccc' }}>Hämtar väder…</span>
        )}
      </div>

      {/* Week navigator */}
      <div style={s.weekNav}>
        <button
          style={{ ...s.weekArrow, ...(weekOffset === 0 ? s.weekArrowDisabled : {}) }}
          onClick={goToPrevWeek}
          disabled={weekOffset === 0}
          aria-label="Föregående vecka"
        >
          ‹
        </button>
        <span style={s.weekLabel}>{weekLabel(weekStart)}</span>
        <button
          style={s.weekArrow}
          onClick={goToNextWeek}
          aria-label="Nästa vecka"
        >
          ›
        </button>
      </div>

      {/* Day picker */}
      <div style={s.dateRow}>
        {dates.map((d) => {
          const isToday = d === today;
          const isPast = d < today;
          const active = d === selectedDate;
          const dayObj = new Date(d + 'T12:00:00');
          const weekday = dayObj.toLocaleDateString('sv-SE', { weekday: 'short' });
          const dayNum = dayObj.getDate();
          return (
            <button
              key={d}
              style={{
                ...s.dateBtn,
                ...(active ? s.dateBtnActive : {}),
                ...(isPast ? s.dateBtnPast : {}),
              }}
              onClick={() => setSelectedDate(d)}
            >
              <span style={s.dateBtnWeekday}>{weekday}</span>
              <span style={s.dateBtnDay}>{dayNum}</span>
              {isToday && !active && <span style={s.todayDot} />}
            </button>
          );
        })}
      </div>

      {/* Day heading */}
      <div style={s.dayHeading}>
        <span style={s.dayLabel}>{formatDate(selectedDate)}</span>
        <span style={s.dayMeta}>
          {mySlots.length}/2 bokningar
        </span>
      </div>

      {atLimit && (
        <p style={s.limitNote}>Du har nått gränsen för {formatDate(selectedDate)}.</p>
      )}

      {/* Slots */}
      <div style={s.slots}>
        {TIME_SLOTS.map((slot) => {
          const bookedBy = dayBookings[slot];
          const isMine = bookedBy === apartment;
          const isBooked = !!bookedBy && !isMine;
          const isDisabled = isBooked || (atLimit && !isMine);

          return (
            <SlotRow
              key={slot}
              slot={slot}
              isMine={isMine}
              isBooked={isBooked}
              isDisabled={isDisabled}
              onClick={() => handleSlot(slot)}
            />
          );
        })}
      </div>

      <p style={s.hint}>Tryck på en ledig tid för att boka. Dina bokningar visas i grått.</p>

      {pendingSlot && (
        <ConfirmModal
          dateStr={selectedDate}
          slot={pendingSlot}
          onConfirm={confirmBooking}
          onCancel={() => setPendingSlot(null)}
        />
      )}

      {apod?.media_type === 'image' && (
        <ApodWidget apod={apod} />
      )}
    </div>
  );
}

function SlotRow({ slot, isMine, isBooked, isDisabled, onClick }) {
  let bg = '#fff';
  let borderColor = '#e8e8e8';
  let cursor = 'pointer';
  let opacity = 1;

  if (isMine) {
    bg = '#f5f5f5';
    borderColor = '#d0d0d0';
  } else if (isBooked) {
    opacity = 0.45;
    cursor = 'default';
  } else if (isDisabled) {
    cursor = 'default';
    opacity = 0.5;
  }

  return (
    <button
      style={{ ...s.slotRow, background: bg, borderColor, cursor, opacity }}
      onClick={onClick}
      disabled={isDisabled && !isMine}
    >
      <span style={s.slotTime}>{slot}</span>
      <span style={s.slotSuffix}>
        {isBooked && <span style={s.cross}>✕</span>}
        {isMine && <span style={s.mine}>Din bokning</span>}
        {!isBooked && !isMine && !isDisabled && <span style={s.available}>Ledig</span>}
        {!isBooked && !isMine && isDisabled && <span style={{ color: '#bbb', fontSize: 13 }}>—</span>}
      </span>
    </button>
  );
}

function ApodWidget({ apod }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={s.apodWidget} onClick={() => setExpanded((v) => !v)} title={apod.title}>
      <img src={apod.url} alt={apod.title} style={s.apodImg} />
      <p style={s.apodTitle}>{apod.title}</p>
      {expanded && <p style={s.apodDesc}>{apod.explanation}</p>}
    </div>
  );
}

function ConfirmModal({ dateStr, slot, onConfirm, onCancel }) {
  const dateLabel = formatDate(dateStr);

  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <p style={s.modalLabel}>Bekräfta bokning</p>
        <p style={s.modalDate}>{dateLabel}</p>
        <p style={s.modalSlot}>{slot}</p>
        <div style={s.modalActions}>
          <button style={s.cancelBtn} onClick={onCancel}>Avbryt</button>
          <button style={s.confirmBtn} onClick={onConfirm}>Bekräfta bokning</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '0 20px 60px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '28px 0 20px',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '16px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '-0.3px',
    marginRight: '10px',
  },
  headerApt: {
    fontSize: '13px',
    color: '#999',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    color: '#999',
    cursor: 'pointer',
    padding: '4px 0',
  },
  weather: {
    fontSize: '13px',
    color: '#555',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  weekArrow: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: '#333',
    padding: '4px 8px',
    lineHeight: 1,
  },
  weekArrowDisabled: {
    color: '#ddd',
    cursor: 'default',
  },
  weekLabel: {
    fontSize: '13px',
    color: '#555',
    fontWeight: '500',
  },
  dateRow: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
  },
  dateBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '8px 4px',
    border: '1px solid #e8e8e8',
    background: '#fff',
    cursor: 'pointer',
    color: '#555',
    position: 'relative',
  },
  dateBtnWeekday: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    color: 'inherit',
  },
  dateBtnDay: {
    fontSize: '15px',
    fontWeight: '500',
    fontVariantNumeric: 'tabular-nums',
    color: 'inherit',
  },
  dateBtnActive: {
    background: '#111',
    color: '#fff',
    borderColor: '#111',
  },
  dateBtnPast: {
    opacity: 0.35,
  },
  todayDot: {
    position: 'absolute',
    bottom: '5px',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#111',
  },
  dayHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  dayLabel: {
    fontSize: '15px',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dayMeta: {
    fontSize: '12px',
    color: '#aaa',
  },
  limitNote: {
    fontSize: '13px',
    color: '#c0392b',
    marginBottom: '12px',
  },
  slots: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  slotRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    border: '1px solid #e8e8e8',
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  slotTime: {
    fontSize: '15px',
    fontWeight: '500',
    fontVariantNumeric: 'tabular-nums',
  },
  slotSuffix: {
    fontSize: '13px',
  },
  cross: {
    color: '#c0392b',
    fontSize: '15px',
    fontWeight: '700',
  },
  mine: {
    color: '#555',
    fontSize: '13px',
  },
  available: {
    color: '#bbb',
    fontSize: '13px',
  },
  hint: {
    marginTop: '20px',
    fontSize: '12px',
    color: '#ccc',
    lineHeight: '1.6',
  },
  apodWidget: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '120px',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.15s',
    zIndex: 10,
  },
  apodImg: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    display: 'block',
  },
  apodTitle: {
    fontSize: '10px',
    color: '#888',
    marginTop: '5px',
    lineHeight: '1.4',
    textAlign: 'left',
  },
  apodDesc: {
    fontSize: '10px',
    color: '#aaa',
    marginTop: '6px',
    lineHeight: '1.6',
    textAlign: 'left',
    whiteSpace: 'normal',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '24px',
  },
  modal: {
    background: '#fff',
    width: '100%',
    maxWidth: '340px',
    padding: '32px 28px 24px',
  },
  modalLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#aaa',
    marginBottom: '16px',
  },
  modalDate: {
    fontSize: '17px',
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: '4px',
  },
  modalSlot: {
    fontSize: '28px',
    fontWeight: '300',
    letterSpacing: '-0.5px',
    marginBottom: '32px',
    fontVariantNumeric: 'tabular-nums',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#fff',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#555',
  },
  confirmBtn: {
    flex: 2,
    padding: '12px',
    background: '#111',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#fff',
  },
};
