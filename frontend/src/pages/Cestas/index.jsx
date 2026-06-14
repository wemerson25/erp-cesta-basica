import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tiposCestaApi, itensApi } from '../../api'
import TipoCestaModal from './TipoCestaModal'
import ItemModal from './ItemModal'

const fmtMoeda = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Cestas() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'cestas'

  const [cestas, setCestas] = useState([])
  const [itens, setItens] = useState([])
  const [loadingCestas, setLoadingCestas] = useState(false)
  const [loadingItens, setLoadingItens] = useState(false)
  const [cestaModal, setCestaModal] = useState(null)
  const [itemModal, setItemModal] = useState(null)
  const [buscaItens, setBuscaItens] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const carregarCestas = useCallback(async () => {
    setLoadingCestas(true)
    try { setCestas(await tiposCestaApi.listar()) }
    finally { setLoadingCestas(false) }
  }, [])

  const carregarItens = useCallback(async () => {
    setLoadingItens(true)
    try { setItens(await itensApi.listar({ busca: buscaItens })) }
    finally { setLoadingItens(false) }
  }, [buscaItens])

  useEffect(() => { carregarCestas() }, [carregarCestas])
  useEffect(() => {
    const t = setTimeout(carregarItens, buscaItens ? 300 : 0)
    return () => clearTimeout(t)
  }, [carregarItens, buscaItens])

  function setTab(t) { setSearchParams({ tab: t }) }

  async function deletarCesta(id, nome) {
    if (!window.confirm(`Excluir a cesta "${nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try { await tiposCestaApi.deletar(id); carregarCestas() }
    catch (err) { window.alert(err.message) }
    finally { setDeletingId(null) }
  }

  async function deletarItem(id, nome) {
    if (!window.confirm(`Excluir o item "${nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    try { await itensApi.deletar(id); carregarItens() }
    catch (err) { window.alert(err.message) }
    finally { setDeletingId(null) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cestas & Itens</h1>
          <p className="page-subtitle">Gerencie tipos de cesta e itens da composição</p>
        </div>
        <div className="page-header-actions">
          {tab === 'cestas'
            ? <button className="btn btn-primary" onClick={() => setCestaModal({})}>+ Nova Cesta</button>
            : <button className="btn btn-primary" onClick={() => setItemModal({})}>+ Novo Item</button>
          }
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="tabs" style={{ marginBottom: 24 }}>
            <button className={`tab${tab === 'cestas' ? ' active' : ''}`} onClick={() => setTab('cestas')}>
              🧺 Tipos de Cesta {cestas.length > 0 && `(${cestas.length})`}
            </button>
            <button className={`tab${tab === 'itens' ? ' active' : ''}`} onClick={() => setTab('itens')}>
              📦 Itens {itens.length > 0 && `(${itens.length})`}
            </button>
          </div>

          {tab === 'cestas' && (
            <TabelaCestas
              cestas={cestas}
              loading={loadingCestas}
              onEditar={(c) => setCestaModal({ cesta: c })}
              onComposicao={(c) => navigate(`/cestas/${c.id}`)}
              onDeletar={deletarCesta}
              deletingId={deletingId}
              fmtMoeda={fmtMoeda}
            />
          )}

          {tab === 'itens' && (
            <TabelaItens
              itens={itens}
              loading={loadingItens}
              busca={buscaItens}
              onBusca={setBuscaItens}
              onEditar={(i) => setItemModal({ item: i })}
              onDeletar={deletarItem}
              deletingId={deletingId}
            />
          )}
        </div>
      </div>

      {cestaModal !== null && (
        <TipoCestaModal
          cesta={cestaModal.cesta}
          onClose={() => setCestaModal(null)}
          onSaved={() => { setCestaModal(null); carregarCestas() }}
        />
      )}
      {itemModal !== null && (
        <ItemModal
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onSaved={() => { setItemModal(null); carregarItens() }}
        />
      )}
    </>
  )
}

function TabelaCestas({ cestas, loading, onEditar, onComposicao, onDeletar, deletingId, fmtMoeda }) {
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (cestas.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">🧺</div>
      <h3>Nenhuma cesta cadastrada</h3>
      <p>Cadastre o primeiro tipo de cesta clicando em "+ Nova Cesta"</p>
    </div>
  )
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome da Cesta</th>
            <th>Preço de Venda</th>
            <th>Itens na Composição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {cestas.map((c) => (
            <tr key={c.id}>
              <td>
                <button className="td-name-btn" onClick={() => onComposicao(c)}>{c.nome}</button>
              </td>
              <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmtMoeda(c.preco_venda)}</td>
              <td>
                {c.composicoes.length > 0
                  ? <span style={{ fontWeight: 600 }}>{c.composicoes.length} {c.composicoes.length === 1 ? 'item' : 'itens'}</span>
                  : <span style={{ color: 'var(--warning)', fontWeight: 500 }}>⚠ Sem composição</span>
                }
              </td>
              <td>
                <div className="td-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => onEditar(c)}>Editar</button>
                  <button className="btn btn-outline btn-sm" onClick={() => onComposicao(c)}>🧺 Composição</button>
                  <button
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => onDeletar(c.id, c.nome)}
                    disabled={deletingId === c.id}
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelaItens({ itens, loading, busca, onBusca, onEditar, onDeletar, deletingId }) {
  return (
    <>
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : itens.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>Nenhum item cadastrado</h3>
          <p>{busca ? 'Tente ajustar a busca' : 'Cadastre os itens que compõem suas cestas'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome do Item</th>
                <th>Unidade</th>
                <th>Fornecedor Preferencial</th>
                <th>Estoque Mínimo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nome}</td>
                  <td>{item.unidade_medida || '—'}</td>
                  <td>{item.fornecedor_preferencial || '—'}</td>
                  <td>
                    {item.estoque_minimo > 0
                      ? `${item.estoque_minimo} ${item.unidade_medida || ''}`.trim()
                      : '—'
                    }
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => onEditar(item)}>Editar</button>
                      <button
                        className="btn btn-danger-outline btn-sm"
                        onClick={() => onDeletar(item.id, item.nome)}
                        disabled={deletingId === item.id}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
