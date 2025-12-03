import { BrowserRouter, Routes, Route, Link } from 'react-router';
import FaceRecognition from './pages/FaceRecognition';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold mb-8">MindTrace Glass Client</h1>
            <div className="grid gap-4">
              <Link to="/face-recognition" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition text-center font-medium">
                Face Recognition System
              </Link>
            </div>
          </div>
        } />
        <Route path="/face-recognition" element={<FaceRecognition />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App