import { useState, useEffect } from 'react'
import { itensApi } from '../../api'

const UNIDADES = ['kg', 'g', 'L', 'mL', 'un', 'pct', 'cx', 'dz', 'sc', 'par']

export default function ItemModal({ item, onClose, onSaved }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState({
    nome: '',
    unidade_medida: '',
    fornecedor_preferencial: '',
    estoque_minimo: '0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setForm({
        nome: item.nome ?? '',
        unidade_medida: item.unidade_medida ?? '',
        fornecedor_preferencial: item.fornecedor_preferencial ?? '',
        estoque_minimo: String(item.estoque_minimo ?? 0),
      })
    }
  }, [item])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true)
    setError('')
    try {
      const payload = {
        nome: form.nome.trim(),
        unidade_medida: form.unidade_medida || null,
        fornecedor_preferencial: form.fornecedor_preferencial || null,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      }
      if (isEdit) await itensApi.atualizar(item.id, payload)
      else await itensApi.criar(payload)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar Item' : 'Novo Item'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <div className="form-group">
              <label className="form-label required">Nome do Item</label>
              <input
                className="form-control"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex: Arroz tipo 1"
                autoFocus
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Unidade de Medida</label>
                <select
                  className="form-control"
                  value={form.unidade_medida}
                  onChange={(e) => set('unidade_medida', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estoque Mínimo</label>
                <input
                  className="form-control"
                  value={form.estoque_minimo}
                  onChange={(e) => set('estoque_minimo', e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fornecedor Preferencial</label>
              <input
                className="form-control"
                value={form.fornecedor_preferencial}
                onChange={(e) => set('fornecedor_preferencial', e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
