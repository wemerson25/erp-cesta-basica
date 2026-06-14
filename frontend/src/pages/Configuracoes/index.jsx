import { useState, useEffect } from 'react'
import { configuracoesApi } from '../../api'

const LABELS = {
  prazo_pagamento_meses: {
    label: 'Prazo de Pagamento',
    unit: 'meses',
    tipo: 'inteiro',
    hint: 'Quantos meses após o mês de referência o pagamento a prazo vence. Ex: 2 = venda de junho vence em agosto.',
  },
  dias_inadimplencia: {
    label: 'Dias para Inadimplência',
    unit: 'dias',
    tipo: 'inteiro',
    hint: 'Quantos dias após o vencimento o pagamento é marcado como atrasado e o cliente como inadimplente.',
  },
  estoque_minimo_padrao: {
    label: 'Estoque Mínimo Padrão',
    unit: 'unidades',
    tipo: 'decimal',
    hint: 'Referência padrão para alertas de estoque baixo no Dashboard. Cada item pode ter seu próprio mínimo.',
  },
}

export default function Configuracoes() {
  const [configs, setConfigs] = useState([])
  const [valores, setValores] = useState({})
  const [salvando, setSalvando] = useState({})
  const [mensagens, setMensagens] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    configuracoesApi.listar().then((data) => {
      setConfigs(data)
      const v = {}
      data.forEach((c) => { v[c.chave] = c.valor })
      setValores(v)
    }).finally(() => setLoading(false))
  }, [])

  async function salvar(chave) {
    const valor = valores[chave]
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      setMensagens((m) => ({ ...m, [chave]: { tipo: 'erro', texto: 'Informe um valor numérico positivo.' } }))
      return
    }
    setSalvando((s) => ({ ...s, [chave]: true }))
    setMensagens((m) => ({ ...m, [chave]: null }))
    try {
      await configuracoesApi.atualizar(chave, valor)
      setMensagens((m) => ({ ...m, [chave]: { tipo: 'ok', texto: 'Salvo com sucesso!' } }))
      setTimeout(() => setMensagens((m) => ({ ...m, [chave]: null })), 3000)
    } catch (err) {
      setMensagens((m) => ({ ...m, [chave]: { tipo: 'erro', texto: err.message } }))
    } finally {
      setSalvando((s) => ({ ...s, [chave]: false }))
    }
  }

  function handleKey(e, chave) {
    if (e.key === 'Enter') salvar(chave)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Parâmetros gerais do sistema</p>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {configs.map((c) => {
              const meta = LABELS[c.chave] || { label: c.chave, unit: '', tipo: 'decimal', hint: c.descricao }
              const msg = mensagens[c.chave]
              return (
                <div key={c.chave} className="card" style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {meta.label}
                  </div>
                  {meta.hint && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      {meta.hint}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      step={meta.tipo === 'inteiro' ? '1' : '0.1'}
                      className="form-control"
                      style={{ maxWidth: '140px' }}
                      value={valores[c.chave] ?? ''}
                      onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
                      onKeyDown={(e) => handleKey(e, c.chave)}
                    />
                    {meta.unit && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{meta.unit}</span>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => salvar(c.chave)}
                      disabled={salvando[c.chave]}
                    >
                      {salvando[c.chave] ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                  {msg && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.82rem',
                      color: msg.tipo === 'ok' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)',
                    }}>
                      {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
