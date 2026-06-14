import { useState, useEffect, useCallback } from 'react'
import { pagamentosApi, clientesApi } from '../../api'
import ReceberModal from './ReceberModal'

const mesAtual = () => new Date().toISOString().slice(0, 7)

function fmtMes(str) {
  if (!str) return '—'
  const [y, m] = str.split('-')
  return `${m}/${y}`
}

function fmtData(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function fmtValor(v) {
  if (v == null) return '—'
  return `R$ ${Number(v).toFixed(2)}`
}

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'atrasado', label: 'Atrasados' },
  { value: 'pago', label: 'Pagos' },
]

const STATUS_BADGE = {
  pago: 'ativo',
  atrasado: 'inadimplente',
  pendente: 'inativo',
}

const STATUS_LABEL = { pago: 'Pago', atrasado: 'Atrasado', pendente: 'Pendente' }

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [verificando, setVerificando] = useState(false)
  const [tab, setTab] = useState('')
  const [mes, setMes] = useState(mesAtual())
  const [clienteId, setClienteId] = useState('')
  const [modal, setModal] = useState(null)

  useEffect(() => { clientesApi.listar().then(setClientes) }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await pagamentosApi.listar({
        status: tab || undefined,
        cliente_id: clienteId || undefined,
        mes_referencia: mes || undefined,
      })
      setPagamentos(data)
    } finally {
      setLoading(false)
    }
  }, [tab, clienteId, mes])

  useEffect(() => { carregar() }, [carregar])

  async function verificarVencidos() {
    setVerificando(true)
    try {
      const res = await pagamentosApi.verificarVencidos()
      if (res.atualizados > 0) {
        alert(`${res.atualizados} pagamento(s) marcado(s) como atrasado. ${res.clientes_afetados} cliente(s) marcado(s) como inadimplente.`)
      } else {
        alert('Nenhum pagamento vencido encontrado.')
      }
      carregar()
    } finally {
      setVerificando(false)
    }
  }

  const totalPendente = pagamentos
    .filter((p) => p.status === 'pendente')
    .reduce((acc, p) => acc + p.valor_esperado, 0)

  const totalAtrasado = pagamentos
    .filter((p) => p.status === 'atrasado')
    .reduce((acc, p) => acc + p.valor_esperado, 0)

  const totalRecebido = pagamentos
    .filter((p) => p.status === 'pago')
    .reduce((acc, p) => acc + (p.valor_pago ?? 0), 0)

  const counts = pagamentos.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  function tabLabel(t) {
    if (t.value === '') return `Todos (${pagamentos.length})`
    const n = counts[t.value] || 0
    return `${t.label}${n ? ` (${n})` : ''}`
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagamentos</h1>
          <p className="page-subtitle">Controle de recebimentos e inadimplência</p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-outline"
            onClick={verificarVencidos}
            disabled={verificando}
          >
            {verificando ? 'Verificando...' : '🔔 Verificar Vencidos'}
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              A Receber (pendente)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{fmtValor(totalPendente)}</div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Atrasados
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: totalAtrasado > 0 ? 'var(--danger, #dc2626)' : undefined }}>
              {fmtValor(totalAtrasado)}
            </div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Recebido no Filtro
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success, #16a34a)' }}>
              {fmtValor(totalRecebido)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  className={`tab${tab === t.value ? ' active' : ''}`}
                  onClick={() => setTab(t.value)}
                >
                  {tabLabel(t)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="month"
                className="form-control"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                style={{ width: 'auto' }}
              />
              <select
                className="form-control"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <option value="">Todos os clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : pagamentos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>Nenhum pagamento encontrado</h3>
              <p>Ajuste os filtros ou registre novas vendas.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cesta</th>
                    <th>Mês Ref.</th>
                    <th>Forma</th>
                    <th>Valor Esperado</th>
                    <th>Valor Pago</th>
                    <th>Vencimento</th>
                    <th>Data Pgto</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.cliente.nome}</td>
                      <td>{p.venda.tipo_cesta.nome}</td>
                      <td>{fmtMes(p.venda.mes_referencia)}</td>
                      <td>{p.venda.forma_pagamento === 'vista' ? 'À Vista' : 'A Prazo'}</td>
                      <td>{fmtValor(p.valor_esperado)}</td>
                      <td>{fmtValor(p.valor_pago)}</td>
                      <td>{fmtData(p.data_vencimento)}</td>
                      <td>{fmtData(p.data_pagamento)}</td>
                      <td>
                        <span className={`badge badge-${STATUS_BADGE[p.status] ?? 'inativo'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td>
                        {p.status !== 'pago' ? (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setModal(p)}
                          >
                            Receber
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ReceberModal
          pagamento={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); carregar() }}
        />
      )}
    </>
  )
}
