import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [apt, setApt] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(apt)) {
      setError('Lägenhetsnummer måste vara 4 siffror.');
      return;
    }
    if (!pwd) {
      setError('Ange ett lösenord.');
      return;
    }
    onLogin(apt);
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>Tvättstuga</h1>
        <p style={styles.subtitle}>Boka din tid</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Lägenhetsnummer</label>
          <input
            style={styles.input}
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={apt}
            onChange={(e) => { setApt(e.target.value); setError(''); }}
          />

          <label style={styles.label}>Lösenord</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit">Logga in</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '40px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#555',
    marginTop: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    border: 'none',
    borderBottom: '1px solid #e0e0e0',
    padding: '10px 0',
    fontSize: '16px',
    outline: 'none',
    background: 'transparent',
    color: '#111',
    width: '100%',
  },
  error: {
    fontSize: '13px',
    color: '#c0392b',
    marginTop: '8px',
  },
  button: {
    marginTop: '32px',
    padding: '14px',
    background: '#111',
    color: '#fff',
    border: 'none',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    letterSpacing: '0.2px',
  },
};
