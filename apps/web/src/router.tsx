import { Routes, Route } from 'react-router-dom';
import HomeView from './pages/HomeView';
import { BoardView } from './pages/BoardView';
import EmptyBoardView from './pages/EmptyBoardView';
import CaptureContentView from './pages/CaptureContentView';
import LoginView from './pages/LoginView';
import SignUpView from './pages/SignUpView';
import ResetPasswordView from './pages/ResetPasswordView';
import SettingsView from './pages/SettingsView';
import ErrorView from './pages/ErrorView';
import { ProtectedRoute } from './components/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/signup" element={<SignUpView />} />
      <Route path="/forgot-password" element={<ResetPasswordView />} />
      <Route path="/error" element={<ErrorView />} />

      {/* Protected routes - require authentication */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/capture"
        element={
          <ProtectedRoute>
            <CaptureContentView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/empty"
        element={
          <ProtectedRoute>
            <EmptyBoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId/stale"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId/someday"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId/waiting"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId/projects"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId/analytics"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:boardId"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      {/* Support plural /boards/:boardId routes for compatibility */}
      <Route
        path="/boards/:boardId/stale"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId/someday"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId/waiting"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId/projects"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId/analytics"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boards/:boardId"
        element={
          <ProtectedRoute>
            <BoardView />
          </ProtectedRoute>
        }
      />

      {/* Catch-all route for 404 errors */}
      <Route
        path="*"
        element={
          <ErrorView
            errorCode="404"
            title="Page Not Found"
            description="The page you're looking for doesn't exist or has been moved."
          />
        }
      />
    </Routes>
  );
}

