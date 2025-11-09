import { Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}

export default App
