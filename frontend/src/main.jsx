import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import axios from 'axios';
import 'bootstrap/dist/js/bootstrap.bundle';
import './css/app.css';

// Setup axios defaults - guna proxy dari vite.config.js
// axios.defaults.baseURL = 'http://localhost:3001'; // Comment out, guna proxy instead
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add token to requests if available
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

