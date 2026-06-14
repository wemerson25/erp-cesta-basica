import { useState, useEffect } from 'react'
import { tiposCestaApi } from '../../api'

export default function TipoCestaModal({ cesta, onClose, onSaved }) {
  const isEdit = Boolean(cesta?.id)
  const [form, setForm] = useState({ nome: '', preco_venda: '', descricao: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cesta) {
      setForm({
        nome: cesta.nome ?? '',
        preco_venda: cesta.preco_venda != null ? String(cesta.preco_venda) : '',
        descricao: cesta.descricao ?? '',
      })
    }
  }, [cesta])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    const preco = parseFloat(form.preco_venda.toString().replace(',', '.'))
    if (isNaN(preco) || preco <= 0) { setError('Preço de venda inválido'); return }
    setLoading(true)
    setError('')
    try {
      const payload = { nome: form.nome.trim(), preco_venda: preco, descricao: form.descricao || null }
      if (isEdit) await tiposCestaApi.atualizar(cesta.id, payload)
      else await tiposCestaApi.criar(payload)
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
          <h2 className="modal-title">{isEdit ? 'Editar Cesta' : 'Nova Cesta'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <div className="form-group">
              <label className="form-label required">Nome da Cesta</label>
              <input
                className="form-control"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex: Cesta Básica Pequena"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Preço de Venda (R$)</label>
              <input
                className="form-control"
                value={form.preco_venda}
                onChange={(e) => set('preco_venda', e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Descrição</label>
              <textarea
                className="form-control"
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                placeholder="Descrição opcional da cesta..."
                rows={3}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Cesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
