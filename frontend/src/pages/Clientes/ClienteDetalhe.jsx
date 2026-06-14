import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientesApi } from '../../api'
import ClienteModal from './ClienteModal'

const STATUS_LABEL = { ativo: 'Ativo', inativo: 'Inativo', inadimplente: 'Inadimplente' }

function fmtData(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <label>{label}</label>
      <p>{value || '—'}</p>
    </div>
  )
}

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const data = await clientesApi.buscar(id)
      setCliente(data)
    } catch {
      navigate('/clientes', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function mudarStatus(novoStatus) {
    setActionLoading(true)
    try {
      const atualizado = await clientesApi.atualizarStatus(cliente.id, novoStatus)
      setCliente(atualizado)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="loading-center"><div className="spinner" /></div>
  }
  if (!cliente) return null

  const isAtivo = cliente.status === 'ativo'
  const isInadimplente = cliente.status === 'inadimplente'

  return (
    <>
      <div className="page-header">
        <div>
          <button className="back-link" onClick={() => navigate('/clientes')}>
            ← Voltar para Clientes
          </button>
          <h1 className="page-title">{cliente.nome}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span className={`badge badge-${cliente.status}`}>
              {STATUS_LABEL[cliente.status]}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Cadastrado em {fmtData(cliente.data_cadastro)}
            </span>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => setEditOpen(true)}
          >
            Editar
          </button>
          {!isInadimplente && (
            <button
              className="btn btn-danger-outline"
              onClick={() => mudarStatus('inadimplente')}
              disabled={actionLoading}
            >
              Marcar Inadimplente
            </button>
          )}
          <button
            className="btn btn-outline"
            onClick={() => mudarStatus(isAtivo ? 'inativo' : 'ativo')}
            disabled={actionLoading}
          >
            {isAtivo ? 'Inativar' : 'Ativar'}
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Informações do cliente */}
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="card-title">Informações do Cliente</p>
          <div className="grid-2" style={{ gap: 20, marginTop: 16 }}>
            <InfoItem label="Telefone" value={cliente.telefone} />
            <InfoItem label="Bairro" value={cliente.bairro} />
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <label>Endereço</label>
              <p>{cliente.endereco || '—'}</p>
            </div>
            {cliente.observacoes && (
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label>Observações</label>
                <p style={{ whiteSpace: 'pre-wrap' }}>{cliente.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo financeiro — será preenchido nas etapas 3 e 4 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total de Vendas</div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="stat-sub">disponível na Etapa 3</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Recebido</div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="stat-sub">disponível na Etapa 4</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">A Receber</div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="stat-sub">disponível na Etapa 4</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Última Venda</div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
            <div className="stat-sub">disponível na Etapa 3</div>
          </div>
        </div>

        {/* Histórico de Vendas — estruturado para Etapa 3 */}
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="card-title">Histórico de Vendas</p>
          <p className="card-subtitle">Será preenchido após a Etapa 3 (Vendas)</p>
          <div className="empty-state" style={{ padding: '28px 24px' }}>
            <div className="empty-state-icon">🛒</div>
            <p>O histórico de vendas será exibido aqui</p>
          </div>
        </div>

        {/* Histórico de Pagamentos — estruturado para Etapa 4 */}
        <div className="card">
          <p className="card-title">Histórico de Pagamentos</p>
          <p className="card-subtitle">Será preenchido após a Etapa 4 (Pagamentos)</p>
          <div className="empty-state" style={{ padding: '28px 24px' }}>
            <div className="empty-state-icon">💰</div>
            <p>O histórico de pagamentos será exibido aqui</p>
          </div>
        </div>
      </div>

      {editOpen && (
        <ClienteModal
          cliente={cliente}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); carregar() }}
        />
      )}
    </>
  )
}
