import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { BoardView } from './pages/BoardView';
import { CaptureContent } from './pages/CaptureContent';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/capture" element={<CaptureContent />} />
      <Route path="/board/:boardId" element={<BoardView />} />
    </Routes>
  );
}

