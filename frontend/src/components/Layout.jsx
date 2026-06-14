import { Outlet, NavLink } from 'react-router-dom'

const NAV = [
  {
    section: 'Cadastros',
    items: [
      { path: '/clientes', label: 'Clientes', icon: '👥', enabled: true },
      { path: '/cestas', label: 'Cestas & Itens', icon: '🧺', enabled: true },
    ],
  },
  {
    section: 'Operações',
    items: [
      { path: '/vendas', label: 'Vendas', icon: '🛒', enabled: false },
      { path: '/pagamentos', label: 'Pagamentos', icon: '💰', enabled: false },
      { path: '/estoque', label: 'Estoque & Compras', icon: '📦', enabled: false },
    ],
  },
  {
    section: 'Análise',
    items: [
      { path: '/relatorios', label: 'Relatórios', icon: '📊', enabled: false },
      { path: '/configuracoes', label: 'Configurações', icon: '⚙️', enabled: false },
    ],
  },
]

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🧺 Cesta Básica</h1>
          <p>Sistema de Gestão</p>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) =>
                item.enabled ? (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-item${isActive ? ' active' : ''}`
                    }
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ) : (
                  <div key={item.path} className="nav-item disabled" title="Em breve">
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </div>
                )
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
