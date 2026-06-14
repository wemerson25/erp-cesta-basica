import { useState, useEffect, useCallback } from 'react'
import { comprasApi, estoqueApi } from '../../api'
import CompraModal from './CompraModal'

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

function fmtQtd(v) {
  if (v == null) return '—'
  const n = Number(v)
  return n % 1 === 0 ? String(n) : n.toFixed(3)
}

function fmtValor(v) {
  if (v == null) return '—'
  return `R$ ${Number(v).toFixed(2)}`
}

const PAGE_TABS = [
  { value: 'compras', label: 'Compras' },
  { value: 'saldo', label: 'Saldo do Estoque' },
  { value: 'custo', label: 'Custo das Cestas' },
]

export default function Estoque() {
  const [pageTab, setPageTab] = useState('compras')
  const [mes, setMes] = useState(mesAtual())
  const [modal, setModal] = useState(false)

  // Compras state
  const [compras, setCompras] = useState([])
  const [loadingCompras, setLoadingCompras] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  // Saldo state
  const [saldos, setSaldos] = useState([])
  const [loadingSaldo, setLoadingSaldo] = useState(false)
  const [operando, setOperando] = useState(false)

  // Custo state
  const [custos, setCustos] = useState([])
  const [loadingCusto, setLoadingCusto] = useState(false)

  const carregarCompras = useCallback(async () => {
    setLoadingCompras(true)
    try {
      const data = await comprasApi.listar({ mes_referencia: mes || undefined })
      setCompras(data)
    } finally {
      setLoadingCompras(false)
    }
  }, [mes])

  const carregarSaldo = useCallback(async () => {
    if (pageTab !== 'saldo') return
    setLoadingSaldo(true)
    try {
      setSaldos(await estoqueApi.listarSaldo(mes || undefined))
    } finally {
      setLoadingSaldo(false)
    }
  }, [mes, pageTab])

  const carregarCusto = useCallback(async () => {
    if (pageTab !== 'custo') return
    setLoadingCusto(true)
    try {
      setCustos(await estoqueApi.listarCustoCesta(mes || undefined))
    } finally {
      setLoadingCusto(false)
    }
  }, [mes, pageTab])

  useEffect(() => { carregarCompras() }, [carregarCompras])
  useEffect(() => { carregarSaldo() }, [carregarSaldo])
  useEffect(() => { carregarCusto() }, [carregarCusto])

  async function deletarCompra(c) {
    if (!window.confirm(`Excluir compra de "${c.item.nome}" (${fmtQtd(c.quantidade_comprada)} × R$ ${Number(c.valor_unitario).toFixed(2)})?`)) return
    setDeletingId(c.id)
    try {
      await comprasApi.deletar(c.id)
      carregarCompras()
      if (pageTab === 'saldo') carregarSaldo()
      if (pageTab === 'custo') carregarCusto()
    } finally {
      setDeletingId(null)
    }
  }

  async function iniciarMes() {
    if (!mes) { alert('Selecione o mês.'); return }
    setOperando(true)
    try {
      const res = await estoqueApi.iniciarMes(mes)
      if (res.iniciados > 0) {
        alert(`${res.iniciados} item(ns) inicializado(s) com saldo de ${fmtMes(res.mes_anterior)}.`)
      } else {
        alert(`Nenhum item novo iniciado. Todos já tinham saldo para ${fmtMes(mes)} ou não há saldo em ${fmtMes(res.mes_anterior)}.`)
      }
      carregarSaldo()
    } finally {
      setOperando(false)
    }
  }

  async function calcularConsumo() {
    if (!mes) { alert('Selecione o mês.'); return }
    setOperando(true)
    try {
      const res = await estoqueApi.calcularConsumo(mes)
      alert(`Consumo calculado para ${res.itens_atualizados} item(ns) com base nas vendas de ${fmtMes(mes)}.`)
      carregarSaldo()
    } finally {
      setOperando(false)
    }
  }

  async function recalcularCustos() {
    if (!mes) { alert('Selecione o mês.'); return }
    setOperando(true)
    try {
      const res = await estoqueApi.recalcularCustos(mes)
      alert(`Custo recalculado para ${res.recalculados} tipo(s) de cesta em ${fmtMes(mes)}.`)
      carregarCusto()
    } finally {
      setOperando(false)
    }
  }

  const totalComprado = compras.reduce((acc, c) => acc + c.valor_total, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque & Compras</h1>
          <p className="page-subtitle">Controle de compras, saldo e custo médio</p>
        </div>
        <div className="page-header-actions">
          {pageTab === 'compras' && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              + Nova Compra
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="tabs" style={{ flex: 1 }}>
              {PAGE_TABS.map((t) => (
                <button
                  key={t.value}
                  className={`tab${pageTab === t.value ? ' active' : ''}`}
                  onClick={() => setPageTab(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              type="month"
              className="form-control"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
        </div>

        {/* ── Tab: Compras ─────────────────────────────────────────────────── */}
        {pageTab === 'compras' && (
          <div className="card">
            {compras.length > 0 && (
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {compras.length} compra(s) · Total: <strong style={{ color: 'var(--text)' }}>{fmtValor(totalComprado)}</strong>
              </div>
            )}
            {loadingCompras ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : compras.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3>Nenhuma compra encontrada</h3>
                <p>Registre compras de insumos clicando em "+ Nova Compra".</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unidade</th>
                      <th>Mês Ref.</th>
                      <th>Qtd</th>
                      <th>Valor Unit.</th>
                      <th>Total</th>
                      <th>Fornecedor</th>
                      <th>Data</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((c) => (
                      <tr key={c.id}>
                        <td>{c.item.nome}</td>
                        <td>{c.item.unidade_medida || '—'}</td>
                        <td>{fmtMes(c.mes_referencia)}</td>
                        <td>{fmtQtd(c.quantidade_comprada)}</td>
                        <td>{fmtValor(c.valor_unitario)}</td>
                        <td><strong>{fmtValor(c.valor_total)}</strong></td>
                        <td>{c.fornecedor || '—'}</td>
                        <td>{fmtData(c.data_compra)}</td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger, #dc2626)' }}
                            onClick={() => deletarCompra(c)}
                            disabled={deletingId === c.id}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Saldo Estoque ───────────────────────────────────────────── */}
        {pageTab === 'saldo' && (
          <div className="card">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={iniciarMes} disabled={operando}>
                ▶ Iniciar Mês (copiar saldo anterior)
              </button>
              <button className="btn btn-outline btn-sm" onClick={calcularConsumo} disabled={operando}>
                🔄 Calcular Consumo (das vendas)
              </button>
            </div>
            {loadingSaldo ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : saldos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>Sem saldo registrado para {fmtMes(mes)}</h3>
                <p>Clique em "Iniciar Mês" para copiar o saldo do mês anterior, ou registre compras.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Un.</th>
                      <th>Qtd Inicial</th>
                      <th>Qtd Comprada</th>
                      <th>Custo Médio</th>
                      <th>Consumido</th>
                      <th>Qtd Final</th>
                      <th>Valor Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldos.map((s) => (
                      <tr key={s.id}>
                        <td>{s.item.nome}</td>
                        <td>{s.item.unidade_medida || '—'}</td>
                        <td>{fmtQtd(s.quantidade_inicial)}</td>
                        <td>{fmtQtd(s.quantidade_comprada_mes)}</td>
                        <td>{fmtValor(s.custo_medio_mes)}</td>
                        <td>{fmtQtd(s.quantidade_consumida_mes)}</td>
                        <td>
                          <strong style={{ color: s.quantidade_final <= (s.item.estoque_minimo || 0) ? 'var(--danger, #dc2626)' : undefined }}>
                            {fmtQtd(s.quantidade_final)}
                          </strong>
                        </td>
                        <td>{fmtValor(s.valor_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Custo das Cestas ────────────────────────────────────────── */}
        {pageTab === 'custo' && (
          <div className="card">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline btn-sm" onClick={recalcularCustos} disabled={operando}>
                🔄 Recalcular Custos
              </button>
            </div>
            {loadingCusto ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : custos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💹</div>
                <h3>Sem dados de custo para {fmtMes(mes)}</h3>
                <p>Registre compras e clique em "Recalcular Custos".</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo de Cesta</th>
                      <th>Preço Venda</th>
                      <th>Custo Calculado</th>
                      <th>Margem (R$)</th>
                      <th>Margem (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custos.map((c) => {
                      const pct = c.tipo_cesta.preco_venda > 0
                        ? ((c.margem_calculada / c.tipo_cesta.preco_venda) * 100).toFixed(1)
                        : '—'
                      return (
                        <tr key={c.id}>
                          <td>{c.tipo_cesta.nome}</td>
                          <td>{fmtValor(c.tipo_cesta.preco_venda)}</td>
                          <td>{fmtValor(c.custo_total_calculado)}</td>
                          <td>
                            <strong style={{ color: c.margem_calculada >= 0 ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
                              {fmtValor(c.margem_calculada)}
                            </strong>
                          </td>
                          <td>
                            <span style={{ color: Number(pct) >= 0 ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
                              {pct !== '—' ? `${pct}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <CompraModal
          mesInicial={mes}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false)
            carregarCompras()
            carregarSaldo()
            carregarCusto()
          }}
        />
      )}
    </>
  )
}
