import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import { store } from './app/store';
import AuthInitializer from './AuthInitializer';
import i18n from './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthInitializer>
            <App />
          </AuthInitializer>
        </I18nextProvider>
      </BrowserRouter>
    </Provider>
  // </React.StrictMode>
);
