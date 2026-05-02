import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'

import './index.css'

import RedHotStore from './RedHotStore.jsx'
import RedHotAdmin from './RedHotAdmin.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<RedHotStore />} />
        <Route path="/admin" element={<RedHotAdmin />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)