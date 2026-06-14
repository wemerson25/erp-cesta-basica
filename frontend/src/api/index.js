const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erro ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const clientesApi = {
  listar: ({ status, busca } = {}) => {
    const q = new URLSearchParams()
    if (status) q.append('status', status)
    if (busca) q.append('busca', busca)
    const qs = q.toString()
    return req(`/clientes${qs ? '?' + qs : ''}`)
  },
  buscar: (id) => req(`/clientes/${id}`),
  criar: (data) => req('/clientes', { method: 'POST', body: data }),
  atualizar: (id, data) => req(`/clientes/${id}`, { method: 'PUT', body: data }),
  atualizarStatus: (id, status) =>
    req(`/clientes/${id}/status`, { method: 'PATCH', body: { status } }),
}

export const itensApi = {
  listar: ({ busca } = {}) => {
    const q = new URLSearchParams()
    if (busca) q.append('busca', busca)
    const qs = q.toString()
    return req(`/itens${qs ? '?' + qs : ''}`)
  },
  criar: (data) => req('/itens', { method: 'POST', body: data }),
  atualizar: (id, data) => req(`/itens/${id}`, { method: 'PUT', body: data }),
  deletar: (id) => req(`/itens/${id}`, { method: 'DELETE' }),
}

export const comprasApi = {
  listar: ({ mes_referencia, item_id } = {}) => {
    const q = new URLSearchParams()
    if (mes_referencia) q.append('mes_referencia', mes_referencia)
    if (item_id) q.append('item_id', item_id)
    const qs = q.toString()
    return req(`/compras${qs ? '?' + qs : ''}`)
  },
  criar: (data) => req('/compras', { method: 'POST', body: data }),
  deletar: (id) => req(`/compras/${id}`, { method: 'DELETE' }),
}

export const estoqueApi = {
  listarSaldo: (mes_referencia) => {
    const q = mes_referencia ? `?mes_referencia=${mes_referencia}` : ''
    return req(`/estoque${q}`)
  },
  iniciarMes: (mes_referencia) => req('/estoque/iniciar-mes', { method: 'POST', body: { mes_referencia } }),
  calcularConsumo: (mes_referencia) => req('/estoque/calcular-consumo', { method: 'POST', body: { mes_referencia } }),
  listarCustoCesta: (mes_referencia) => {
    const q = mes_referencia ? `?mes_referencia=${mes_referencia}` : ''
    return req(`/custo-cesta${q}`)
  },
  recalcularCustos: (mes_referencia) => req('/custo-cesta/recalcular', { method: 'POST', body: { mes_referencia } }),
}

export const pagamentosApi = {
  listar: ({ status, cliente_id, mes_referencia } = {}) => {
    const q = new URLSearchParams()
    if (status) q.append('status', status)
    if (cliente_id) q.append('cliente_id', cliente_id)
    if (mes_referencia) q.append('mes_referencia', mes_referencia)
    const qs = q.toString()
    return req(`/pagamentos${qs ? '?' + qs : ''}`)
  },
  receber: (id, data) => req(`/pagamentos/${id}/receber`, { method: 'PATCH', body: data }),
  verificarVencidos: () => req('/pagamentos/verificar-vencidos', { method: 'POST' }),
}

export const vendasApi = {
  listar: ({ mes_referencia, cliente_id, status_entrega } = {}) => {
    const q = new URLSearchParams()
    if (mes_referencia) q.append('mes_referencia', mes_referencia)
    if (cliente_id) q.append('cliente_id', cliente_id)
    if (status_entrega) q.append('status_entrega', status_entrega)
    const qs = q.toString()
    return req(`/vendas${qs ? '?' + qs : ''}`)
  },
  criar: (data) => req('/vendas', { method: 'POST', body: data }),
  atualizarEntrega: (id, status_entrega) =>
    req(`/vendas/${id}/entrega`, { method: 'PATCH', body: { status_entrega } }),
  deletar: (id) => req(`/vendas/${id}`, { method: 'DELETE' }),
}

export const tiposCestaApi = {
  listar: () => req('/tipos-cesta'),
  buscar: (id) => req(`/tipos-cesta/${id}`),
  criar: (data) => req('/tipos-cesta', { method: 'POST', body: data }),
  atualizar: (id, data) => req(`/tipos-cesta/${id}`, { method: 'PUT', body: data }),
  deletar: (id) => req(`/tipos-cesta/${id}`, { method: 'DELETE' }),
  atualizarComposicao: (id, data) =>
    req(`/tipos-cesta/${id}/composicao`, { method: 'PUT', body: data }),
}
