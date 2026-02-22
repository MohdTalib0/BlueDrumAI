import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, ShieldAlert, User as UserIcon, Route } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { AdminLayout } from '../../layouts/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { getEdgeFunctionUrl, apiFetch } from '../../lib/api'

interface UserRecord {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  gender: 'male' | 'female' | 'both' | null
  role: 'user' | 'admin' | 'super_admin'
  relationship_status: string | null
  onboarding_completed: boolean
  login_count: number
  created_at: string
  updated_at: string
}

type RoleFilter = 'all' | 'admin' | 'user'

const ROLES = ['user', 'admin', 'super_admin'] as const

function roleBadge(role: string) {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'admin':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

function genderBadge(gender: string | null) {
  switch (gender) {
    case 'male':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'female':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'both':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
  }
}

function initials(first: string | null, last: string | null, email: string) {
  if (first) return (first[0] + (last?.[0] ?? '')).toUpperCase()
  return email[0]?.toUpperCase() ?? '?'
}

function displayName(first: string | null, last: string | null, email: string) {
  if (first) return `${first}${last ? ' ' + last : ''}`
  return email.split('@')[0]
}

export default function UsersManagement() {
  const { sessionToken, user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }, [])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const fetchUsers = useCallback(async () => {
    if (!sessionToken) return
    setLoading(true)
    try {
      const url = `${getEdgeFunctionUrl('admin')}/users?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`
      const res = await apiFetch(url, sessionToken)
      const data = await res.json()
      if (data.ok) {
        setUsers(data.users)
        setTotal(data.total)
      }
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [sessionToken, page, limit, debouncedSearch])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const updateRole = useCallback(async (userId: string, newRole: string) => {
    if (!sessionToken) return
    setUpdatingRole(userId)
    try {
      const res = await apiFetch(`${getEdgeFunctionUrl('admin')}/users/${userId}`, sessionToken, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (data.ok ?? res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as UserRecord['role'] } : u))
        toast.success('Role updated successfully')
      } else {
        toast.error(data.error ?? 'Failed to update role')
      }
    } catch {
      toast.error('Network error updating role')
    } finally {
      setUpdatingRole(null)
    }
  }, [sessionToken])

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return users
    if (roleFilter === 'admin') return users.filter(u => u.role === 'admin' || u.role === 'super_admin')
    return users.filter(u => u.role === 'user')
  }, [users, roleFilter])

  const adminCount = useMemo(() => users.filter(u => u.role === 'admin' || u.role === 'super_admin').length, [users])
  const userCount = useMemo(() => users.filter(u => u.role === 'user').length, [users])
  const totalPages = Math.ceil(total / limit)

  return (
    <AdminLayout title="Users" subtitle={`${total} registered user${total !== 1 ? 's' : ''}`}>
      <div className="space-y-6">
        {/* Search + Stats */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-black border-gray-300 dark:border-gray-700 dark:text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterBadge
                active={roleFilter === 'all'}
                onClick={() => setRoleFilter('all')}
                icon={<Users className="h-3.5 w-3.5" />}
                label={`All (${users.length})`}
              />
              <FilterBadge
                active={roleFilter === 'admin'}
                onClick={() => setRoleFilter('admin')}
                icon={<ShieldAlert className="h-3.5 w-3.5" />}
                label={`Admins (${adminCount})`}
              />
              <FilterBadge
                active={roleFilter === 'user'}
                onClick={() => setRoleFilter('user')}
                icon={<UserIcon className="h-3.5 w-3.5" />}
                label={`Users (${userCount})`}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Gender</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Logins</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Joined</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <Users className="h-10 w-10 opacity-40" />
                            <p className="text-sm font-medium">No users found</p>
                            <p className="text-xs">Try adjusting your search or filter.</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : filtered.map(u => (
                      <UserRow
                        key={u.id}
                        user={u}
                        expanded={expandedRow === u.id}
                        onToggle={() => setExpandedRow(prev => prev === u.id ? null : u.id)}
                        isSuperAdmin={isSuperAdmin}
                        updatingRole={updatingRole === u.id}
                        onRoleChange={updateRole}
                      />
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function FilterBadge({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-red-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function UserRow({
  user: u,
  expanded,
  onToggle,
  isSuperAdmin,
  updatingRole,
  onRoleChange,
}: {
  user: UserRecord
  expanded: boolean
  onToggle: () => void
  isSuperAdmin: boolean
  updatingRole: boolean
  onRoleChange: (id: string, role: string) => void
}) {
  const navigate = useNavigate()
  return (
    <>
      <tr
        onClick={onToggle}
        className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
      >
        {/* User cell */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold">
              {initials(u.first_name, u.last_name, u.email)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName(u.first_name, u.last_name, u.email)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
            </div>
          </div>
        </td>

        {/* Gender */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${genderBadge(u.gender)}`}>
            {u.gender ?? 'N/A'}
          </span>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          {isSuperAdmin && u.role !== 'super_admin' ? (
            <select
              value={u.role}
              disabled={updatingRole}
              onClick={e => e.stopPropagation()}
              onChange={e => { e.stopPropagation(); onRoleChange(u.id, e.target.value) }}
              className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-red-500/40 ${roleBadge(u.role)} ${updatingRole ? 'opacity-50' : ''}`}
            >
              {ROLES.filter(r => r !== 'super_admin').map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          ) : (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadge(u.role)}`}>
              {u.role.replace('_', ' ')}
            </span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.onboarding_completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${u.onboarding_completed ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            {u.onboarding_completed ? 'Onboarded' : 'Pending'}
          </span>
        </td>

        {/* Logins */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">{u.login_count}</span>
        </td>

        {/* Joined */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {format(new Date(u.created_at), 'MMM d, yyyy')}
          </span>
        </td>

        {/* Expand indicator */}
        <td className="px-4 py-3 text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-gray-50/50 dark:bg-gray-900/40">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <DetailItem label="Email" value={u.email} />
              <DetailItem label="First Name" value={u.first_name ?? '—'} />
              <DetailItem label="Last Name" value={u.last_name ?? '—'} />
              <DetailItem label="Gender" value={u.gender ?? '—'} />
              <DetailItem label="Role" value={u.role.replace('_', ' ')} />
              <DetailItem label="Relationship" value={u.relationship_status ?? '—'} />
              <DetailItem label="Onboarded" value={u.onboarding_completed ? 'Yes' : 'No'} />
              <DetailItem label="Login Count" value={String(u.login_count)} />
              <DetailItem label="Created" value={format(new Date(u.created_at), 'PPpp')} />
              <DetailItem label="Updated" value={format(new Date(u.updated_at), 'PPpp')} />
              <DetailItem label="User ID" value={u.id} mono />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${u.id}`) }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Route className="h-3.5 w-3.5" />
                View Full Trajectory
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-gray-800 dark:text-gray-200 break-all ${mono ? 'font-mono text-[11px]' : 'capitalize'}`}>
        {value}
      </p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2.5 w-36 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-800" /></td>
      <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-800" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-8 rounded bg-gray-200 dark:bg-gray-800" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" /></td>
      <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" /></td>
    </tr>
  )
}
