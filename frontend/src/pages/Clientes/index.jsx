import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientesApi } from '../../api'
import ClienteModal from './ClienteModal'

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'inativo', label: 'Inativos' },
  { value: 'inadimplente', label: 'Inadimplentes' },
]

const STATUS_LABEL = { ativo: 'Ativo', inativo: 'Inativo', inadimplente: 'Inadimplente' }

function fmtData(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [tabStatus, setTabStatus] = useState('')
  const [modal, setModal] = useState(null) // null | {} | { cliente }
  const [togglingId, setTogglingId] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientesApi.listar({ status: tabStatus, busca })
      setClientes(data)
    } finally {
      setLoading(false)
    }
  }, [tabStatus, busca])

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 300 : 0)
    return () => clearTimeout(t)
  }, [carregar, busca])

  async function toggleAtivo(c) {
    const novo = c.status === 'ativo' ? 'inativo' : 'ativo'
    setTogglingId(c.id)
    try {
      await clientesApi.atualizarStatus(c.id, novo)
      carregar()
    } finally {
      setTogglingId(null)
    }
  }

  const counts = clientes.reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc },
    {}
  )

  function tabLabel(tab) {
    if (tab.value === '') return `Todos${clientes.length ? ` (${clientes.length})` : ''}`
    const n = counts[tab.value] || 0
    return `${tab.label}${n ? ` (${n})` : ''}`
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gerencie sua base de clientes</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setModal({})}>
            + Novo Cliente
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="filter-bar">
            <div className="tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  className={`tab${tabStatus === tab.value ? ' active' : ''}`}
                  onClick={() => setTabStatus(tab.value)}
                >
                  {tabLabel(tab)}
                </button>
              ))}
            </div>

            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="form-control"
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>Nenhum cliente encontrado</h3>
              <p>
                {busca || tabStatus
                  ? 'Tente ajustar os filtros de busca'
                  : 'Cadastre o primeiro cliente clicando em "+ Novo Cliente"'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Bairro</th>
                    <th>Cadastro</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button
                          className="td-name-btn"
                          onClick={() => navigate(`/clientes/${c.id}`)}
                        >
                          {c.nome}
                        </button>
                      </td>
                      <td>{c.telefone || '—'}</td>
                      <td>{c.bairro || '—'}</td>
                      <td>{fmtData(c.data_cadastro)}</td>
                      <td>
                        <span className={`badge badge-${c.status}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setModal({ cliente: c })}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/clientes/${c.id}`)}
                          >
                            Ver
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => toggleAtivo(c)}
                            disabled={togglingId === c.id}
                          >
                            {c.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <ClienteModal
          cliente={modal.cliente}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); carregar() }}
        />
      )}
    </>
  )
}
