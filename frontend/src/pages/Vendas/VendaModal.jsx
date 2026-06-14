import { useState, useEffect } from 'react'
import { vendasApi, clientesApi, tiposCestaApi } from '../../api'

const mesAtual = () => new Date().toISOString().slice(0, 7)

export default function VendaModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    cliente_id: '',
    tipo_cesta_id: '',
    mes_referencia: mesAtual(),
    quantidade: 1,
    forma_pagamento: 'prazo',
  })
  const [clientes, setClientes] = useState([])
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingOpts, setLoadingOpts] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([clientesApi.listar({ status: 'ativo' }), tiposCestaApi.listar()])
      .then(([cls, tps]) => { setClientes(cls); setTipos(tps) })
      .finally(() => setLoadingOpts(false))
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const tipoSelecionado = tipos.find((t) => t.id === Number(form.tipo_cesta_id))
  const valorTotal =
    tipoSelecionado ? (tipoSelecionado.preco_venda * form.quantidade).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente_id) { setError('Selecione o cliente.'); return }
    if (!form.tipo_cesta_id) { setError('Selecione o tipo de cesta.'); return }
    if (!form.mes_referencia) { setError('Informe o mês de referência.'); return }
    if (form.quantidade < 1) { setError('Quantidade deve ser ao menos 1.'); return }
    setLoading(true)
    setError('')
    try {
      await vendasApi.criar({
        cliente_id: Number(form.cliente_id),
        tipo_cesta_id: Number(form.tipo_cesta_id),
        mes_referencia: form.mes_referencia,
        quantidade: Number(form.quantidade),
        forma_pagamento: form.forma_pagamento,
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
          <h2 className="modal-title">Nova Venda</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <div className="form-group">
              <label className="form-label required">Cliente</label>
              {loadingOpts ? (
                <div className="form-control" style={{ color: 'var(--text-muted)' }}>Carregando...</div>
              ) : (
                <select
                  className="form-control"
                  value={form.cliente_id}
                  onChange={(e) => set('cliente_id', e.target.value)}
                  autoFocus
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label required">Tipo de Cesta</label>
              <select
                className="form-control"
                value={form.tipo_cesta_id}
                onChange={(e) => set('tipo_cesta_id', e.target.value)}
                disabled={loadingOpts}
              >
                <option value="">Selecione o tipo</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} — R$ {t.preco_venda.toFixed(2)}
                  </option>
                ))}
              </select>
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
                <label className="form-label required">Quantidade</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) => set('quantidade', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Forma de Pagamento</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                {[
                  { value: 'vista', label: 'À Vista (pago agora)' },
                  { value: 'prazo', label: 'A Prazo (vencimento futuro)' },
                ].map((op) => (
                  <label key={op.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="forma_pagamento"
                      value={op.value}
                      checked={form.forma_pagamento === op.value}
                      onChange={(e) => set('forma_pagamento', e.target.value)}
                    />
                    {op.label}
                  </label>
                ))}
              </div>
            </div>

            {valorTotal && (
              <div className="alert" style={{ background: 'var(--primary-light, #eff6ff)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.5rem' }}>
                <strong>Valor total: R$ {valorTotal}</strong>
                {form.forma_pagamento === 'vista'
                  ? ' — será registrado como pago imediatamente.'
                  : ' — pagamento ficará pendente com vencimento calculado.'}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingOpts}>
              {loading ? 'Salvando...' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
