import React, { Fragment, useMemo } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { Bell } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationsAPI } from '../../api/endpoints'
import { useNotificationsStore } from './store'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

export default function NotificationBell() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const incoming = useNotificationsStore(s => s.incoming)
  const setUnread = useNotificationsStore(s => s.setUnread)

  const { data } = useQuery({
    queryKey: ['notifications', { page: 1 }],
    queryFn: () => NotificationsAPI.list({ page: 1, page_size: 10 }),
    refetchInterval: 30000,
  })

  const items = useMemo(() => {
    const server = data?.items || []
    const merged = [...incoming, ...server]
    // unique by _id
    const seen = new Set()
    return merged.filter(n => (seen.has(n._id) ? false : (seen.add(n._id), true))).slice(0, 12)
  }, [data, incoming])

  const unread = useMemo(() => items.reduce((a,n)=>a + (n.read ? 0 : 1), 0), [items])

  React.useEffect(() => { setUnread(unread) }, [unread, setUnread])

  const onClickItem = async (n) => {
    try { await NotificationsAPI.read(n._id) } catch {}
    qc.invalidateQueries({ queryKey: ['notifications'] })
    nav(n.link || '/leads')
  }

  const markAllRead = async () => {
    try { await NotificationsAPI.readAll() } catch {}
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative p-2 rounded-lg hover:bg-slate-100">
        <Bell className="text-slate-700" size={18} />
        {unread > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>}
      </Menu.Button>
      <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
        <Menu.Items className="absolute right-0 mt-2 w-96 origin-top-right bg-white border rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b font-medium flex items-center justify-between">
            <div>Notifications</div>
            <button onClick={markAllRead} className="text-xs text-brand-700 hover:underline disabled:opacity-50">Mark all read</button>
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 && <div className="p-4 text-sm text-slate-500">No notifications</div>}
            {items.map(n => (
              <Menu.Item key={n._id}>
                {({ active }) => (
                  <button onClick={() => onClickItem(n)}
                    className={clsx("w-full text-left px-4 py-3 border-b last:border-b-0", active && "bg-slate-50")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{n.message}</div>
                      </div>
                      {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-rose-600" />}
                    </div>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
