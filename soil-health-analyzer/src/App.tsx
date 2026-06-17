import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Assessment from "@/pages/Assessment"
import Prescription from "@/pages/Prescription"
import Tracking from "@/pages/Tracking"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/prescription" element={<Prescription />} />
          <Route path="/tracking" element={<Tracking />} />
        </Route>
      </Routes>
    </Router>
  )
}
