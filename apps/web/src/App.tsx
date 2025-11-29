import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { BoardView } from './components/BoardView';
import './app.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board/:boardId" element={<BoardView />} />
      </Routes>
    </BrowserRouter>
  );
}
