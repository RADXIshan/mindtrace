import { BrowserRouter, Routes, Route } from 'react-router';
import FaceRecognition from './pages/FaceRecognition';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FaceRecognition />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App