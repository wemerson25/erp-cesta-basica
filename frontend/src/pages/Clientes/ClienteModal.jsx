import { useState, useEffect } from 'react'
import { clientesApi } from '../../api'

export default function ClienteModal({ cliente, onClose, onSaved }) {
  const isEdit = Boolean(cliente?.id)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    bairro: '',
    status: 'ativo',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome ?? '',
        telefone: cliente.telefone ?? '',
        endereco: cliente.endereco ?? '',
        bairro: cliente.bairro ?? '',
        status: cliente.status ?? 'ativo',
        observacoes: cliente.observacoes ?? '',
      })
    }
  }, [cliente])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('O nome do cliente é obrigatório.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        await clientesApi.atualizar(cliente.id, form)
      } else {
        await clientesApi.criar(form)
      }
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
          <h2 className="modal-title">
            {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {error && <div className="alert alert-error">⚠ {error}</div>}

            <div className="form-group">
              <label className="form-label required">Nome</label>
              <input
                className="form-control"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome completo do cliente"
                autoFocus
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  className="form-control"
                  value={form.telefone}
                  onChange={(e) => set('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input
                className="form-control"
                value={form.endereco}
                onChange={(e) => set('endereco', e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input
                className="form-control"
                value={form.bairro}
                onChange={(e) => set('bairro', e.target.value)}
                placeholder="Bairro"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observações</label>
              <textarea
                className="form-control"
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                placeholder="Informações adicionais sobre o cliente..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? 'Salvando...'
                : isEdit
                ? 'Salvar Alterações'
                : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
