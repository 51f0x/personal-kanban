import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './router';
import './styles/app.css';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
