import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './router';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
