import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// TypeScript may complain about side-effect CSS imports if no '*.css' module
// declaration is present. Ignore the error here to allow the bundler to handle it.
// @ts-ignore
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);