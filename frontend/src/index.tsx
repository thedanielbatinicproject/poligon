import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getInitialTheme, applyTheme } from './lib/theme';

// Apply theme synchronously before React mounts to avoid a flash of the
// wrong theme. This reads localStorage or falls back to system preference.
try {
	const initial = getInitialTheme();
	applyTheme(initial);
} catch (e) {
	// ignore
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
