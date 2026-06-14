import { useState, useEffect } from 'react'
import { comprasApi, itensApi } from '../../api'

const mesAtual = () => new Date().toISOString().slice(0, 7)
const hoje = () => new Date().toISOString().slice(0, 10)

export default function CompraModal({ onClose, onSaved, mesInicial }) {
  const [form, setForm] = useState({
    item_id: '',
    mes_referencia: mesInicial || mesAtual(),
    quantidade_comprada: '',
    valor_unitario: '',
    fornecedor: '',
    data_compra: hoje(),
  })
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingItens, setLoadingItens] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    itensApi.listar().then(setItens).finally(() => setLoadingItens(false))
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const qtd = parseFloat(form.quantidade_comprada)
  const vUnit = parseFloat(form.valor_unitario)
  const total = !isNaN(qtd) && !isNaN(vUnit) ? (qtd * vUnit).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.item_id) { setError('Selecione o item.'); return }
    if (!form.mes_referencia) { setError('Informe o mês de referência.'); return }
    if (isNaN(qtd) || qtd <= 0) { setError('Informe uma quantidade válida.'); return }
    if (isNaN(vUnit) || vUnit <= 0) { setError('Informe um valor unitário válido.'); return }

    setLoading(true)
    setError('')
    try {
      await comprasApi.criar({
        item_id: Number(form.item_id),
        mes_referencia: form.mes_referencia,
        quantidade_comprada: qtd,
        valor_unitario: vUnit,
        fornecedor: form.fornecedor || null,
        data_compra: form.data_compra || null,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">Registrar Compra</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <div className="form-group">
              <label className="form-label required">Item</label>
              {loadingItens ? (
                <div className="form-control" style={{ color: 'var(--text-muted)' }}>Carregando...</div>
              ) : (
                <select
                  className="form-control"
                  value={form.item_id}
                  onChange={(e) => set('item_id', e.target.value)}
                  autoFocus
                >
                  <option value="">Selecione um item</option>
                  {itens.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}{i.unidade_medida ? ` (${i.unidade_medida})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Mês de Referência</label>
                <input
                  type="month"
                  className="form-control"
                  value={form.mes_referencia}
                  onChange={(e) => set('mes_referencia', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Data da Compra</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.data_compra}
                  onChange={(e) => set('data_compra', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Quantidade</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  className="form-control"
                  value={form.quantidade_comprada}
                  onChange={(e) => set('quantidade_comprada', e.target.value)}
                  placeholder="0,000"
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Valor Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  value={form.valor_unitario}
                  onChange={(e) => set('valor_unitario', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {total && (
              <div className="alert" style={{ background: 'var(--primary-light, #eff6ff)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                <strong>Total: R$ {total}</strong>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fornecedor</label>
              <input
                className="form-control"
                value={form.fornecedor}
                onChange={(e) => set('fornecedor', e.target.value)}
                placeholder="Nome do fornecedor (opcional)"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingItens}>
              {loading ? 'Salvando...' : 'Registrar Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
