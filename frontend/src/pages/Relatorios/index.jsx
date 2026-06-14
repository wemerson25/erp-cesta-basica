import { useState, useEffect, useCallback } from 'react'
import { relatoriosApi } from '../../api'

const mesAtual = () => new Date().toISOString().slice(0, 7)

function fmtMes(str) {
  if (!str) return '—'
  const [y, m] = str.split('-')
  return `${m}/${y}`
}

function fmtValor(v) {
  if (v == null) return '—'
  return `R$ ${Number(v).toFixed(2)}`
}

function fmtPct(v) {
  if (v == null) return '—'
  return `${Number(v).toFixed(1)}%`
}

const PAGE_TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'evolucao', label: 'Evolução Mensal' },
  { value: 'clientes', label: 'Clientes' },
]

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: color || 'var(--text)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>
      )}
    </div>
  )
}

function ProgressBar({ value, total, color = 'var(--primary)' }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
  )
}

export default function Relatorios() {
  const [pageTab, setPageTab] = useState('dashboard')
  const [mes, setMes] = useState(mesAtual())
  const [filtroMesClientes, setFiltroMesClientes] = useState('')

  const [resumo, setResumo] = useState(null)
  const [loadingResumo, setLoadingResumo] = useState(false)

  const [evolucao, setEvolucao] = useState([])
  const [loadingEvolucao, setLoadingEvolucao] = useState(false)

  const [clientes, setClientes] = useState(null)
  const [loadingClientes, setLoadingClientes] = useState(false)

  const carregarResumo = useCallback(async () => {
    if (!mes) return
    setLoadingResumo(true)
    try { setResumo(await relatoriosApi.resumo(mes)) }
    finally { setLoadingResumo(false) }
  }, [mes])

  const carregarEvolucao = useCallback(async () => {
    if (pageTab !== 'evolucao') return
    setLoadingEvolucao(true)
    try { setEvolucao(await relatoriosApi.evolucao()) }
    finally { setLoadingEvolucao(false) }
  }, [pageTab])

  const carregarClientes = useCallback(async () => {
    if (pageTab !== 'clientes') return
    setLoadingClientes(true)
    try { setClientes(await relatoriosApi.clientes(filtroMesClientes || undefined)) }
    finally { setLoadingClientes(false) }
  }, [pageTab, filtroMesClientes])

  useEffect(() => { if (pageTab === 'dashboard') carregarResumo() }, [carregarResumo, pageTab])
  useEffect(() => { carregarEvolucao() }, [carregarEvolucao])
  useEffect(() => { carregarClientes() }, [carregarClientes])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios & Dashboard</h1>
          <p className="page-subtitle">Visão geral e análise do negócio</p>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="tabs" style={{ flex: 1 }}>
              {PAGE_TABS.map((t) => (
                <button key={t.value} className={`tab${pageTab === t.value ? ' active' : ''}`} onClick={() => setPageTab(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
            {pageTab === 'dashboard' && (
              <input type="month" className="form-control" value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: 'auto' }} />
            )}
            {pageTab === 'clientes' && (
              <input type="month" className="form-control" value={filtroMesClientes} onChange={(e) => setFiltroMesClientes(e.target.value)} style={{ width: 'auto' }} placeholder="Todos os meses" />
            )}
          </div>
        </div>

        {/* ── Dashboard ─────────────────────────────────────────────────────── */}
        {pageTab === 'dashboard' && (
          loadingResumo ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : !resumo ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Row 1: vendas metrics */}
              <div className="grid-4">
                <MetricCard
                  label="Vendas no Mês"
                  value={resumo.total_vendas}
                  sub={`${resumo.total_cestas} cesta(s)`}
                />
                <MetricCard
                  label="Valor Total"
                  value={fmtValor(resumo.valor_total)}
                  sub={fmtMes(resumo.mes_referencia)}
                />
                <MetricCard
                  label="Recebido"
                  value={fmtValor(resumo.valor_recebido)}
                  color="var(--success, #16a34a)"
                  sub={resumo.valor_total > 0 ? `${((resumo.valor_recebido / resumo.valor_total) * 100).toFixed(0)}% do total` : undefined}
                />
                <MetricCard
                  label="Pendente + Atrasado"
                  value={fmtValor(resumo.valor_pendente + resumo.valor_atrasado)}
                  color={(resumo.valor_pendente + resumo.valor_atrasado) > 0 ? 'var(--warning, #d97706)' : undefined}
                  sub={resumo.valor_atrasado > 0 ? `⚠ ${fmtValor(resumo.valor_atrasado)} atrasado` : 'sem atraso'}
                />
              </div>

              {/* Row 2: secondary metrics */}
              <div className="grid-3">
                <MetricCard
                  label="Clientes Inadimplentes"
                  value={resumo.clientes_inadimplentes}
                  color={resumo.clientes_inadimplentes > 0 ? 'var(--danger, #dc2626)' : undefined}
                  sub={`de ${resumo.total_clientes_ativos} ativos`}
                />
                <MetricCard
                  label="Entregas Pendentes"
                  value={resumo.cestas_pendentes_entrega}
                  color={resumo.cestas_pendentes_entrega > 0 ? 'var(--warning, #d97706)' : undefined}
                  sub={`${resumo.cestas_entregues} entregue(s)`}
                />
                <MetricCard
                  label="Margem Média"
                  value={resumo.margem_media_pct != null ? fmtPct(resumo.margem_media_pct) : '—'}
                  color={resumo.margem_media_pct != null ? (resumo.margem_media_pct >= 0 ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)') : undefined}
                  sub="sobre preço de venda"
                />
              </div>

              {/* Recebimento progress */}
              {resumo.valor_total > 0 && (
                <div className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Recebimento — {fmtMes(resumo.mes_referencia)}
                  </div>
                  <ProgressBar value={resumo.valor_recebido} total={resumo.valor_total} color="var(--success, #16a34a)" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <span>Recebido: {fmtValor(resumo.valor_recebido)}</span>
                    <span>Total: {fmtValor(resumo.valor_total)}</span>
                  </div>
                </div>
              )}

              {/* Alertas de estoque */}
              {resumo.alertas_estoque.length > 0 && (
                <div className="card">
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--danger, #dc2626)' }}>
                    ⚠ Alertas de Estoque ({resumo.alertas_estoque.length} item{resumo.alertas_estoque.length > 1 ? 's' : ''} abaixo do mínimo)
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Un.</th>
                          <th>Mínimo</th>
                          <th>Atual</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumo.alertas_estoque.map((a) => (
                          <tr key={a.item_id}>
                            <td>{a.nome}</td>
                            <td>{a.unidade_medida || '—'}</td>
                            <td>{a.estoque_minimo}</td>
                            <td style={{ color: 'var(--danger, #dc2626)', fontWeight: 600 }}>{a.quantidade_final}</td>
                            <td>
                              <span className="badge badge-inadimplente">
                                {a.quantidade_final <= 0 ? 'Zerado' : 'Baixo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resumo.total_vendas === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3>Sem vendas em {fmtMes(resumo.mes_referencia)}</h3>
                  <p>Registre vendas para ver o resumo do mês.</p>
                </div>
              )}
            </div>
          )
        )}

        {/* ── Evolução Mensal ───────────────────────────────────────────────── */}
        {pageTab === 'evolucao' && (
          <div className="card">
            {loadingEvolucao ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : evolucao.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <h3>Nenhuma venda registrada</h3>
                <p>Os dados aparecerão aqui conforme as vendas forem lançadas.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Vendas</th>
                      <th>Cestas</th>
                      <th>Valor Total</th>
                      <th>Recebido</th>
                      <th>Pendente</th>
                      <th>Atrasado</th>
                      <th>% Recebido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evolucao.map((e) => {
                      const pctRec = e.valor_total > 0 ? (e.valor_recebido / e.valor_total * 100).toFixed(0) : 0
                      return (
                        <tr key={e.mes_referencia}>
                          <td><strong>{fmtMes(e.mes_referencia)}</strong></td>
                          <td>{e.total_vendas}</td>
                          <td>{e.total_cestas}</td>
                          <td>{fmtValor(e.valor_total)}</td>
                          <td style={{ color: 'var(--success, #16a34a)' }}>{fmtValor(e.valor_recebido)}</td>
                          <td>{e.valor_pendente > 0 ? fmtValor(e.valor_pendente) : '—'}</td>
                          <td style={{ color: e.valor_atrasado > 0 ? 'var(--danger, #dc2626)' : undefined }}>
                            {e.valor_atrasado > 0 ? fmtValor(e.valor_atrasado) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <ProgressBar value={e.valor_recebido} total={e.valor_total} color="var(--success, #16a34a)" />
                              <span style={{ fontSize: '0.8rem', minWidth: '32px' }}>{pctRec}%</span>
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
        )}

        {/* ── Clientes ──────────────────────────────────────────────────────── */}
        {pageTab === 'clientes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Ranking */}
            <div className="card">
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                Ranking por Valor{filtroMesClientes ? ` — ${fmtMes(filtroMesClientes)}` : ' (todos os meses)'}
              </div>
              {loadingClientes ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : !clientes || clientes.ranking.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p>Sem dados para exibir.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>Vendas</th>
                        <th>Cestas</th>
                        <th>Valor Total</th>
                        <th>Pendente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.ranking.map((c, i) => (
                        <tr key={c.id}>
                          <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                          <td><strong>{c.nome}</strong></td>
                          <td>
                            <span className={`badge badge-${c.status}`}>
                              {c.status === 'ativo' ? 'Ativo' : c.status === 'inativo' ? 'Inativo' : 'Inadimplente'}
                            </span>
                          </td>
                          <td>{c.total_vendas}</td>
                          <td>{c.total_cestas}</td>
                          <td>{fmtValor(c.valor_total)}</td>
                          <td style={{ color: c.valor_pendente > 0 ? 'var(--warning, #d97706)' : undefined }}>
                            {c.valor_pendente > 0 ? fmtValor(c.valor_pendente) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inadimplentes */}
            {clientes && clientes.inadimplentes.length > 0 && (
              <div className="card">
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--danger, #dc2626)' }}>
                  Clientes Inadimplentes ({clientes.inadimplentes.length})
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>Valor em Aberto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.inadimplentes.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.nome}</strong></td>
                          <td>{c.telefone || '—'}</td>
                          <td style={{ color: 'var(--danger, #dc2626)', fontWeight: 600 }}>{fmtValor(c.valor_em_aberto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
