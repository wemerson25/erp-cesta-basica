import { useState, useEffect, useCallback } from 'react'
import { vendasApi, clientesApi } from '../../api'
import VendaModal from './VendaModal'

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

const STATUS_ENTREGA_LABEL = { pendente: 'Pendente', entregue: 'Entregue' }
const STATUS_PGT_LABEL = { pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado' }

const TABS_ENTREGA = [
  { value: '', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'entregue', label: 'Entregues' },
]

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(mesAtual())
  const [clienteId, setClienteId] = useState('')
  const [tabEntrega, setTabEntrega] = useState('')
  const [modal, setModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    clientesApi.listar().then(setClientes)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await vendasApi.listar({
        mes_referencia: mes || undefined,
        cliente_id: clienteId || undefined,
        status_entrega: tabEntrega || undefined,
      })
      setVendas(data)
    } finally {
      setLoading(false)
    }
  }, [mes, clienteId, tabEntrega])

  useEffect(() => { carregar() }, [carregar])

  async function toggleEntrega(v) {
    const novo = v.status_entrega === 'entregue' ? 'pendente' : 'entregue'
    await vendasApi.atualizarEntrega(v.id, novo)
    carregar()
  }

  async function deletar(v) {
    if (!window.confirm(`Excluir venda de "${v.cliente.nome}"? O pagamento vinculado também será removido.`)) return
    setDeletingId(v.id)
    try {
      await vendasApi.deletar(v.id)
      carregar()
    } finally {
      setDeletingId(null)
    }
  }

  const totalVendas = vendas.reduce(
    (acc, v) => acc + v.tipo_cesta.preco_venda * v.quantidade,
    0
  )

  const pgtPendente = vendas
    .flatMap((v) => v.pagamentos)
    .filter((p) => p.status === 'pendente')
    .reduce((acc, p) => acc + p.valor_esperado, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="page-subtitle">Lançamentos de vendas por mês</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            + Nova Venda
          </button>
        </div>
      </div>

      <div className="page-content">
        {vendas.length > 0 && (
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Total de Vendas ({vendas.length})
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
                {fmtValor(totalVendas)}
              </div>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Pagamentos Pendentes
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pgtPendente > 0 ? 'var(--warning, #d97706)' : 'var(--text)' }}>
                {fmtValor(pgtPendente)}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="tabs">
              {TABS_ENTREGA.map((tab) => (
                <button
                  key={tab.value}
                  className={`tab${tabEntrega === tab.value ? ' active' : ''}`}
                  onClick={() => setTabEntrega(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="month"
                  className="form-control"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  style={{ width: 'auto' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
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
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : vendas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <h3>Nenhuma venda encontrada</h3>
              <p>
                {mes || clienteId || tabEntrega
                  ? 'Tente ajustar os filtros'
                  : 'Registre a primeira venda clicando em "+ Nova Venda"'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Cesta</th>
                    <th>Mês Ref.</th>
                    <th>Qtd</th>
                    <th>Valor</th>
                    <th>Pagamento</th>
                    <th>Vencimento</th>
                    <th>Entrega</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((v) => {
                    const pgt = v.pagamentos[0]
                    return (
                      <tr key={v.id}>
                        <td>{v.cliente.nome}</td>
                        <td>{v.tipo_cesta.nome}</td>
                        <td>{fmtMes(v.mes_referencia)}</td>
                        <td>{v.quantidade}</td>
                        <td>{fmtValor(v.tipo_cesta.preco_venda * v.quantidade)}</td>
                        <td>
                          {pgt ? (
                            <span className={`badge badge-${pgt.status === 'pago' ? 'ativo' : pgt.status === 'atrasado' ? 'inadimplente' : 'inativo'}`}>
                              {STATUS_PGT_LABEL[pgt.status] ?? pgt.status}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {pgt?.status === 'pago'
                            ? fmtData(pgt.data_pagamento)
                            : fmtData(pgt?.data_vencimento)}
                        </td>
                        <td>
                          <span className={`badge badge-${v.status_entrega === 'entregue' ? 'ativo' : 'inativo'}`}>
                            {STATUS_ENTREGA_LABEL[v.status_entrega]}
                          </span>
                        </td>
                        <td>
                          <div className="td-actions">
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => toggleEntrega(v)}
                            >
                              {v.status_entrega === 'entregue' ? 'Desfazer' : 'Entregar'}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--danger, #dc2626)' }}
                              onClick={() => deletar(v)}
                              disabled={deletingId === v.id}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <VendaModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); carregar() }}
        />
      )}
    </>
  )
}
