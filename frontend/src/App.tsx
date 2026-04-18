import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Connections } from './pages/Connections'
import { Metadata } from './pages/Metadata'
import { Suggestions } from './pages/Suggestions'
import { CheckPlans } from './pages/CheckPlans'
import { Runs } from './pages/Runs'
import { Results } from './pages/Results'
import { Visualization } from './pages/Visualization'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="connections" element={<Connections />} />
          <Route path="metadata" element={<Metadata />} />
          <Route path="suggestions" element={<Suggestions />} />
          <Route path="check-plans" element={<CheckPlans />} />
          <Route path="runs" element={<Runs />} />
          <Route path="results" element={<Results />} />
          <Route path="visualization" element={<Visualization />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
