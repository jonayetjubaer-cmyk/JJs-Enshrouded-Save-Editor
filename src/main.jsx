import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './JJApp.jsx';
import './jj-desktop.css';
import { registerFonts } from './platform.js';

registerFonts();

createRoot(document.getElementById('root')).render(<App />);
