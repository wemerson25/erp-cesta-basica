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

export const tiposCestaApi = {
  listar: () => req('/tipos-cesta'),
  buscar: (id) => req(`/tipos-cesta/${id}`),
  criar: (data) => req('/tipos-cesta', { method: 'POST', body: data }),
  atualizar: (id, data) => req(`/tipos-cesta/${id}`, { method: 'PUT', body: data }),
  deletar: (id) => req(`/tipos-cesta/${id}`, { method: 'DELETE' }),
  atualizarComposicao: (id, data) =>
    req(`/tipos-cesta/${id}/composicao`, { method: 'PUT', body: data }),
}
