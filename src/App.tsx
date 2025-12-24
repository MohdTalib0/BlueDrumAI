import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './components/LandingPage'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import VaultUpload from './pages/dashboard/consent-vault/VaultUpload'
import TimelineView from './pages/dashboard/consent-vault/TimelineView'
import IncomeForm from './pages/dashboard/income-tracker/IncomeForm'
import ExpenseTracker from './pages/dashboard/income-tracker/ExpenseTracker'
import AffidavitGenerator from './pages/dashboard/income-tracker/AffidavitGenerator'
import AnnualSummary from './pages/dashboard/income-tracker/AnnualSummary'
import ChatUpload from './pages/dashboard/red-flag-radar/ChatUpload'
import AnalysisResults from './pages/dashboard/red-flag-radar/AnalysisResults'
import AnalysisHistory from './pages/dashboard/red-flag-radar/AnalysisHistory'
import SignInPage from './pages/auth/SignIn'
import SignUpPage from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/forgot-password/*" element={<ForgotPassword />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vault"
        element={
          <ProtectedRoute>
            <TimelineView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vault/upload"
        element={
          <ProtectedRoute>
            <VaultUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vault/timeline"
        element={
          <ProtectedRoute>
            <TimelineView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/income-tracker"
        element={
          <ProtectedRoute>
            <IncomeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/income-tracker/history"
        element={
          <ProtectedRoute>
            <ExpenseTracker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/income-tracker/affidavit"
        element={
          <ProtectedRoute>
            <AffidavitGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/income-tracker/edit/:id"
        element={
          <ProtectedRoute>
            <IncomeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/income-tracker/annual"
        element={
          <ProtectedRoute>
            <AnnualSummary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/red-flag-radar"
        element={
          <ProtectedRoute>
            <ChatUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/red-flag-radar/results/:id"
        element={
          <ProtectedRoute>
            <AnalysisResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/red-flag-radar/analysis/:id"
        element={
          <ProtectedRoute>
            <AnalysisResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/red-flag-radar/history"
        element={
          <ProtectedRoute>
            <AnalysisHistory />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

