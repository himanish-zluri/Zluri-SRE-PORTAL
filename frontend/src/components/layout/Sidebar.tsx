import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['DEVELOPER', 'MANAGER', 'ADMIN'] },
    { to: '/approval', label: 'Approval Dashboard', icon: '✅', roles: ['MANAGER', 'ADMIN'] },
    { to: '/submissions', label: 'My Submissions', icon: '📝', roles: ['DEVELOPER', 'MANAGER', 'ADMIN'] },
    { to: '/audit', label: 'Audit Logs', icon: '📋', roles: ['ADMIN'] },
  ];

  const filteredItems = navItems.filter((item) => 
    item.roles.includes(user?.role || '')
  );

  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">DB</span>
          </div>
          <span className="text-gray-900 dark:text-white font-semibold">Query Portal</span>
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
