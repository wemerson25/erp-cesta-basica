import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tiposCestaApi, itensApi } from '../../api'
import TipoCestaModal from './TipoCestaModal'

const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function parseQtd(v) {
  if (typeof v === 'number') return v
  return parseFloat(String(v).replace(',', '.'))
}

export default function CestaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cesta, setCesta] = useState(null)
  const [todosItens, setTodosItens] = useState([])
  const [composicao, setComposicao] = useState([])
  const [novoItemId, setNovoItemId] = useState('')
  const [novaQtd, setNovaQtd] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, itens] = await Promise.all([tiposCestaApi.buscar(id), itensApi.listar()])
      setCesta(c)
      setComposicao(
        c.composicoes.map((comp) => ({
          item_id: comp.item_id,
          item_nome: comp.item.nome,
          item_unidade: comp.item.unidade_medida,
          quantidade: comp.quantidade,
        }))
      )
      setTodosItens(itens)
      setDirty(false)
      setError('')
    } catch {
      navigate('/cestas', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const itensDisponiveis = todosItens.filter(
    (i) => !composicao.some((c) => c.item_id === i.id)
  )

  function editarQtd(item_id, qtd) {
    setComposicao((prev) => prev.map((c) => c.item_id === item_id ? { ...c, quantidade: qtd } : c))
    setDirty(true)
    setError('')
  }

  function removerItem(item_id) {
    setComposicao((prev) => prev.filter((c) => c.item_id !== item_id))
    setDirty(true)
  }

  function adicionarItem() {
    if (!novoItemId) { setError('Selecione um item'); return }
    const qtd = parseQtd(novaQtd)
    if (isNaN(qtd) || qtd <= 0) { setError('Quantidade deve ser maior que zero'); return }
    const item = todosItens.find((i) => i.id === parseInt(novoItemId))
    if (!item) return
    setComposicao((prev) => [
      ...prev,
      { item_id: item.id, item_nome: item.nome, item_unidade: item.unidade_medida, quantidade: qtd },
    ])
    setNovoItemId('')
    setNovaQtd('')
    setError('')
    setDirty(true)
  }

  async function salvar() {
    for (const c of composicao) {
      const q = parseQtd(c.quantidade)
      if (isNaN(q) || q <= 0) {
        setError(`Quantidade inválida para "${c.item_nome}"`)
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      const itens = composicao.map((c) => ({ item_id: c.item_id, quantidade: parseQtd(c.quantidade) }))
      await tiposCestaApi.atualizarComposicao(id, { itens })
      setDirty(false)
      setSuccessMsg('Composição salva com sucesso!')
      setTimeout(() => setSuccessMsg(''), 3000)
      carregar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!cesta) return null

  return (
    <>
      <div className="page-header">
        <div>
          <button className="back-link" onClick={() => navigate('/cestas')}>
            ← Voltar para Cestas & Itens
          </button>
          <h1 className="page-title">{cesta.nome}</h1>
          <p className="page-subtitle">
            Preço de venda: <strong style={{ color: 'var(--success)' }}>{fmtMoeda(cesta.preco_venda)}</strong>
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => setEditModal(true)}>Editar Cesta</button>
          {dirty && (
            <button className="btn btn-primary" onClick={salvar} disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar Composição'}
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>✓ {successMsg}</div>
        )}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠ {error}</div>
        )}

        {cesta.descricao && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{cesta.descricao}</p>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p className="card-title">Composição da Cesta</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {composicao.length === 0
                  ? 'Adicione os itens abaixo'
                  : `${composicao.length} ${composicao.length === 1 ? 'item' : 'itens'} na composição`}
                {dirty && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>● Alterações não salvas</span>}
              </p>
            </div>
          </div>

          {composicao.length > 0 && (
            <div className="table-wrap" style={{ marginBottom: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unidade</th>
                    <th style={{ width: 160 }}>Quantidade</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {composicao.map((c) => (
                    <tr key={c.item_id}>
                      <td style={{ fontWeight: 500 }}>{c.item_nome}</td>
                      <td>{c.item_unidade || '—'}</td>
                      <td>
                        <input
                          className="form-control"
                          style={{ width: 120 }}
                          value={c.quantidade}
                          onChange={(e) => editarQtd(c.item_id, e.target.value)}
                          inputMode="decimal"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => removerItem(c.item_id)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {composicao.length === 0 && (
            <div className="empty-state" style={{ padding: '28px 24px', marginBottom: 20 }}>
              <div className="empty-state-icon">📦</div>
              <h3>Composição vazia</h3>
              <p>Adicione os itens que compõem esta cesta</p>
            </div>
          )}

          {/* Adicionar item */}
          <div style={{
            borderTop: composicao.length > 0 ? '1px solid var(--border)' : 'none',
            paddingTop: composicao.length > 0 ? 20 : 0,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Adicionar Item à Composição
            </p>

            {todosItens.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Nenhum item cadastrado.{' '}
                <button
                  className="btn btn-ghost"
                  style={{ padding: 0, fontSize: 13, color: 'var(--primary)' }}
                  onClick={() => navigate('/cestas?tab=itens')}
                >
                  Cadastrar itens →
                </button>
              </p>
            ) : itensDisponiveis.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Todos os itens cadastrados já estão na composição desta cesta.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="form-label">Item</label>
                  <select
                    className="form-control"
                    value={novoItemId}
                    onChange={(e) => setNovoItemId(e.target.value)}
                  >
                    <option value="">Selecione um item...</option>
                    {itensDisponiveis.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}{i.unidade_medida ? ` (${i.unidade_medida})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 140 }}>
                  <label className="form-label">Quantidade</label>
                  <input
                    className="form-control"
                    value={novaQtd}
                    onChange={(e) => setNovaQtd(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    onKeyDown={(e) => e.key === 'Enter' && adicionarItem()}
                  />
                </div>
                <button className="btn btn-primary" onClick={adicionarItem} disabled={!novoItemId}>
                  + Adicionar
                </button>
              </div>
            )}
          </div>

          {dirty && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-outline" onClick={carregar}>Descartar alterações</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : '💾 Salvar Composição'}
              </button>
            </div>
          )}
        </div>
      </div>

      {editModal && (
        <TipoCestaModal
          cesta={cesta}
          onClose={() => setEditModal(false)}
          onSaved={() => { setEditModal(false); carregar() }}
        />
      )}
    </>
  )
}
