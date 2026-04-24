import React, { useEffect, useState } from 'react'
import { Users2, User, Calendar, ShieldCheck } from 'lucide-react'
import { UsersAPI } from '../api/endpoints'

export default function MyTeam() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    try {
      const res = await UsersAPI.myTeam()
      setTeam(res || [])
    } catch (error) {
      console.error('Failed to load team:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (member) => {
    try {
      setUpdatingId(member.user_id)

      await UsersAPI.updateMyTeam(member.user_id, {
        is_active: !member.is_active,
      })

      setTeam((prev) =>
        prev.map((item) =>
          item.user_id === member.user_id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users2 size={24} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          My Team
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-soft">
          Loading team members...
        </div>
      )}

      {/* Empty */}
      {!loading && team.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-soft text-center text-slate-500">
          No team members found.
        </div>
      )}

      {/* Team Cards */}
      {!loading && team.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => (
            <div
              key={member.user_id}
              className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-soft hover:shadow-lg transition"
            >
              {/* Top */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-slate-800 dark:text-white">
                  {member.username}
                </h2>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleStatus(member)}
                  disabled={updatingId === member.user_id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    member.is_active ? 'bg-green-500' : 'bg-red-500'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      member.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  {member.role}
                </p>

                <p className="flex items-center gap-2">
                  <User size={16} />
                  ID: {member.user_id.slice(0, 8)}...
                </p>

                <p className="flex items-center gap-2">
                  <Calendar size={16} />
                  Joined: {formatDate(member.created_at)}
                </p>
              </div>

              {/* Status Text */}
              <p className="mt-4 text-sm font-medium">
                Status:{' '}
                <span
                  className={
                    member.is_active
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {updatingId === member.user_id
                    ? 'Updating...'
                    : member.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}