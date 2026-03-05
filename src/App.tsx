import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'

import LandingPage from './components/LandingPage'
import { DocumentTitle } from './components/DocumentTitle'
import ContactPage from './pages/landing/ContactPage'
import SecurityPage from './pages/landing/SecurityPage'
import SignInPage from './pages/auth/SignIn'
import SignUpPage from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const VaultUpload = lazy(() => import('./pages/dashboard/consent-vault/VaultUpload'))
const TimelineView = lazy(() => import('./pages/dashboard/consent-vault/TimelineView'))
const IncomeForm = lazy(() => import('./pages/dashboard/income-tracker/IncomeForm'))
const ExpenseTracker = lazy(() => import('./pages/dashboard/income-tracker/ExpenseTracker'))
const AffidavitGenerator = lazy(() => import('./pages/dashboard/income-tracker/AffidavitGenerator'))
const AnnualSummary = lazy(() => import('./pages/dashboard/income-tracker/AnnualSummary'))
const ChatUpload = lazy(() => import('./pages/dashboard/red-flag-radar/ChatUpload'))
const AnalysisResults = lazy(() => import('./pages/dashboard/red-flag-radar/AnalysisResults'))
const AnalysisHistory = lazy(() => import('./pages/dashboard/red-flag-radar/AnalysisHistory'))
const DemoRedFlag = lazy(() => import('./pages/dashboard/red-flag-radar/DemoRedFlag'))
const CompareAnalyses = lazy(() => import('./pages/dashboard/red-flag-radar/CompareAnalyses'))
const RedFlagExperience = lazy(() => import('./pages/dashboard/red-flag-radar/RedFlagExperience'))
const DowryDashboard = lazy(() => import('./pages/dashboard/dowry-vault/DowryDashboard'))
const DowryForm = lazy(() => import('./pages/dashboard/dowry-vault/DowryForm'))
const GiftTracker = lazy(() => import('./pages/dashboard/dowry-vault/GiftTracker'))
const WitnessManager = lazy(() => import('./pages/dashboard/dowry-vault/WitnessManager'))
const DvDashboard = lazy(() => import('./pages/dashboard/dv-log/DvDashboard'))
const IncidentFormPage = lazy(() => import('./pages/dashboard/dv-log/IncidentForm'))
const IncidentTimeline = lazy(() => import('./pages/dashboard/dv-log/IncidentTimeline'))
const MedicalReports = lazy(() => import('./pages/dashboard/dv-log/MedicalReports'))
const MaintenanceDashboard = lazy(() => import('./pages/dashboard/maintenance/MaintenanceDashboard'))
const MaintenanceCalculator = lazy(() => import('./pages/dashboard/maintenance/MaintenanceCalculator'))
const MaintenanceExpenses = lazy(() => import('./pages/dashboard/maintenance/MaintenanceExpenses'))
const MaintenanceRights = lazy(() => import('./pages/dashboard/maintenance/MaintenanceRights'))
const MessageGenerator = lazy(() => import('./pages/dashboard/breakup-generator/MessageGenerator'))
const ProfilePage = lazy(() => import('./pages/dashboard/profile/ProfilePage'))
const SubscriptionPage = lazy(() => import('./pages/dashboard/subscription/SubscriptionPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'))
const FeedbackManagement = lazy(() => import('./pages/admin/FeedbackManagement'))
const AIUsagePage = lazy(() => import('./pages/admin/AIUsagePage'))
const FeatureUsagePage = lazy(() => import('./pages/admin/FeatureUsagePage'))
const UserTrajectory = lazy(() => import('./pages/admin/UserTrajectory'))
const SubscriptionsAdmin = lazy(() => import('./pages/admin/SubscriptionsAdmin'))
const GeoAnalytics = lazy(() => import('./pages/admin/GeoAnalytics'))
const MonitoringPage = lazy(() => import('./pages/admin/MonitoringPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))
const IncidentsPage = lazy(() => import('./pages/admin/IncidentsPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-yellow-50/30 to-white dark:from-black dark:via-black dark:to-black">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady } = useAuth()
  const location = useLocation()

  if (loading || (user && !profileReady)) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  const isOnboardingPage = location.pathname === '/onboarding'
  if (!user.onboarding_completed && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function MaleRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady } = useAuth()
  if (loading || (user && !profileReady)) return <PageLoader />
  if (!user) return <Navigate to="/sign-in" replace />
  if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (user.gender === 'female') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function FemaleRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady } = useAuth()
  if (loading || (user && !profileReady)) return <PageLoader />
  if (!user) return <Navigate to="/sign-in" replace />
  if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (user.gender === 'male') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady } = useAuth()
  if (loading || (user && !profileReady)) return <PageLoader />
  if (!user) return <Navigate to="/sign-in" replace />
  if (user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <>
      <DocumentTitle />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 5000 },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/forgot-password/*" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Shared module routes (Vault + Red Flag Radar) */}
          <Route path="/dashboard/vault/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
          <Route path="/dashboard/vault/upload" element={<ProtectedRoute><VaultUpload /></ProtectedRoute>} />
          <Route path="/dashboard/vault" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar" element={<ProtectedRoute><ChatUpload /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/results/:id" element={<ProtectedRoute><AnalysisResults /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/analysis/:id" element={<ProtectedRoute><AnalysisResults /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/history" element={<ProtectedRoute><AnalysisHistory /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/compare" element={<ProtectedRoute><CompareAnalyses /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/demo-red-flag" element={<ProtectedRoute><DemoRedFlag /></ProtectedRoute>} />
          <Route path="/dashboard/red-flag-radar/experience" element={<ProtectedRoute><RedFlagExperience /></ProtectedRoute>} />
          {/* Male-only module routes (Income Tracker) */}
          <Route path="/dashboard/income-tracker" element={<MaleRoute><IncomeForm /></MaleRoute>} />
          <Route path="/dashboard/income-tracker/history" element={<MaleRoute><ExpenseTracker /></MaleRoute>} />
          <Route path="/dashboard/income-tracker/affidavit" element={<MaleRoute><AffidavitGenerator /></MaleRoute>} />
          <Route path="/dashboard/income-tracker/edit/:id" element={<MaleRoute><IncomeForm /></MaleRoute>} />
          <Route path="/dashboard/income-tracker/annual" element={<MaleRoute><AnnualSummary /></MaleRoute>} />
          {/* Female module routes */}
          <Route path="/dashboard/dowry-vault" element={<FemaleRoute><DowryDashboard /></FemaleRoute>} />
          <Route path="/dashboard/dowry-vault/add" element={<FemaleRoute><DowryForm /></FemaleRoute>} />
          <Route path="/dashboard/dowry-vault/edit/:id" element={<FemaleRoute><DowryForm /></FemaleRoute>} />
          <Route path="/dashboard/dowry-vault/gifts" element={<FemaleRoute><GiftTracker /></FemaleRoute>} />
          <Route path="/dashboard/dowry-vault/witnesses" element={<FemaleRoute><WitnessManager /></FemaleRoute>} />
          <Route path="/dashboard/dv-log" element={<FemaleRoute><DvDashboard /></FemaleRoute>} />
          <Route path="/dashboard/dv-log/add" element={<FemaleRoute><IncidentFormPage /></FemaleRoute>} />
          <Route path="/dashboard/dv-log/edit/:id" element={<FemaleRoute><IncidentFormPage /></FemaleRoute>} />
          <Route path="/dashboard/dv-log/timeline" element={<FemaleRoute><IncidentTimeline /></FemaleRoute>} />
          <Route path="/dashboard/dv-log/medical" element={<FemaleRoute><MedicalReports /></FemaleRoute>} />
          {/* Female module routes (Maintenance Calculator) */}
          <Route path="/dashboard/maintenance" element={<FemaleRoute><MaintenanceDashboard /></FemaleRoute>} />
          <Route path="/dashboard/maintenance/calculate" element={<FemaleRoute><MaintenanceCalculator /></FemaleRoute>} />
          <Route path="/dashboard/maintenance/expenses" element={<FemaleRoute><MaintenanceExpenses /></FemaleRoute>} />
          <Route path="/dashboard/maintenance/rights" element={<FemaleRoute><MaintenanceRights /></FemaleRoute>} />
          {/* Male module routes (Breakup Generator) */}
          <Route path="/dashboard/breakup-generator" element={<MaleRoute><MessageGenerator /></MaleRoute>} />
          {/* Profile — accessible to all */}
          <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
          <Route path="/admin/users/:id" element={<AdminRoute><UserTrajectory /></AdminRoute>} />
          <Route path="/admin/feature-usage" element={<AdminRoute><FeatureUsagePage /></AdminRoute>} />
          <Route path="/admin/feedback" element={<AdminRoute><FeedbackManagement /></AdminRoute>} />
          <Route path="/admin/ai-usage" element={<AdminRoute><AIUsagePage /></AdminRoute>} />
          <Route path="/admin/monitoring" element={<AdminRoute><MonitoringPage /></AdminRoute>} />
          <Route path="/admin/incidents" element={<AdminRoute><IncidentsPage /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
          <Route path="/admin/subscriptions" element={<AdminRoute><SubscriptionsAdmin /></AdminRoute>} />
          <Route path="/admin/geo" element={<AdminRoute><GeoAnalytics /></AdminRoute>} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
