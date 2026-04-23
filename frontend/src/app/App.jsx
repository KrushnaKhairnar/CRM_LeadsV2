import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login.jsx'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import Layout from '../components/Layout.jsx'
import { useAuthStore } from '../auth/store'
import { AuthAPI } from '../api/endpoints'
import ManagerDashboard from '../pages/ManagerDashboard.jsx'
import SalesDashboard from '../pages/SalesDashboard.jsx'
import LeadsList from '../pages/LeadsList.jsx'
import LeadDetails from '../pages/LeadDetails.jsx'
import Products from '../pages/projects.jsx'
import Analytics from '../pages/Analytics.jsx'
import { useWS } from '../features/notifications/useWS'
import Kanban from '../pages/Kanban.jsx'
import SavedViews from '../pages/SavedViews.jsx'
import Settings from '../pages/Settings.jsx'
import Profile from '../pages/Profile.jsx'
import Achievements from '../pages/Achievements.jsx'
import Invoices from '../pages/Invoices.jsx'
import InvoicePrint from '../pages/InvoicePrint.jsx'
import ManagerRevenue from '../pages/ManagerRevenue.jsx'
import ManagerTeam from '../pages/ManagerTeam.jsx'

export default function App() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const clear = useAuthStore(s => s.clear)

  useWS()

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        const me = await AuthAPI.me()
        setUser(me)
      } catch (e) {
        clear()
      }
    }
    run()
  }, [token, setUser, clear])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {user?.role === 'MANAGER' ? <ManagerDashboard /> : <SalesDashboard />}
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/leads" element={
        <ProtectedRoute>
          <Layout><LeadsList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/leads/:id" element={
        <ProtectedRoute>
          <Layout><LeadDetails /></Layout>
        </ProtectedRoute>
      } />

        <Route path="/projects" element={
        <ProtectedRoute>
          <Layout><Products /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Layout><Analytics /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/kanban" element={
        <ProtectedRoute>
          <Layout><Kanban /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/views" element={
        <ProtectedRoute>
          <Layout><SavedViews /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout><Profile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/achievements" element={
        <ProtectedRoute>
          <Layout><Achievements /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/invoices" element={
        <ProtectedRoute>
          <Layout><Invoices /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/invoice/:id" element={<InvoicePrint />} />
      <Route path="/revenue" element={
        <ProtectedRoute>
          <Layout><ManagerRevenue /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <Layout><ManagerTeam /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
