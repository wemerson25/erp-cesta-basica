import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/Clientes/ClienteDetalhe'
import Cestas from './pages/Cestas'
import CestaDetalhe from './pages/Cestas/CestaDetalhe'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/clientes" replace />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="cestas" element={<Cestas />} />
        <Route path="cestas/:id" element={<CestaDetalhe />} />
      </Route>
    </Routes>
  )
}
