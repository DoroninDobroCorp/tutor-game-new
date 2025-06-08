import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './app/store';
import AuthInitializer from './AuthInitializer';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthInitializer>
          <>
            <App />
            <Toaster position="top-right" />
          </>
        </AuthInitializer>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
