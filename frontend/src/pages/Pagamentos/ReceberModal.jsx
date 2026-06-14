import { useState, useEffect } from 'react'
import { pagamentosApi } from '../../api'

const hoje = () => new Date().toISOString().slice(0, 10)

function fmtData(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

export default function ReceberModal({ pagamento, onClose, onSaved }) {
  const [form, setForm] = useState({
    valor_pago: '',
    data_pagamento: hoje(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (pagamento) {
      setForm({ valor_pago: String(pagamento.valor_esperado), data_pagamento: hoje() })
    }
  }, [pagamento])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    const val = parseFloat(form.valor_pago)
    if (isNaN(val) || val <= 0) { setError('Informe um valor válido.'); return }
    if (!form.data_pagamento) { setError('Informe a data do recebimento.'); return }
    setLoading(true)
    setError('')
    try {
      await pagamentosApi.receber(pagamento.id, {
        valor_pago: val,
        data_pagamento: form.data_pagamento,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!pagamento) return null

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Recebimento</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <div style={{ background: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
              <div><strong>Cliente:</strong> {pagamento.cliente.nome}</div>
              <div><strong>Cesta:</strong> {pagamento.venda.tipo_cesta.nome} × {pagamento.venda.quantidade}</div>
              <div><strong>Mês:</strong> {pagamento.venda.mes_referencia.slice(5, 7)}/{pagamento.venda.mes_referencia.slice(0, 4)}</div>
              {pagamento.data_vencimento && (
                <div><strong>Vencimento:</strong> {fmtData(pagamento.data_vencimento)}</div>
              )}
              <div><strong>Valor esperado:</strong> R$ {Number(pagamento.valor_esperado).toFixed(2)}</div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  value={form.valor_pago}
                  onChange={(e) => setForm((f) => ({ ...f, valor_pago: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Data do Recebimento</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.data_pagamento}
                  onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
