import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './index.css'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Toast from './components/Toast'
import AnnouncementPopup from './components/AnnouncementPopup'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import Discover from './pages/Discover'
import StoryDetail from './pages/StoryDetail'
import WriteStory from './pages/WriteStory'
import Habits from './pages/Habits'
import Community from './pages/Community'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import SavedStories from './pages/SavedStories'
import Jobs from './pages/Jobs'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import ContentPolicy from './pages/ContentPolicy'
import PostingGuidelines from './pages/PostingGuidelines'
import About from './pages/About'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Careers from './pages/Careers'
import JobDetail from './pages/JobDetail'
import Contact from './pages/Contact'
import CertificateViewer from './pages/CertificateViewer'
import Membership from './pages/Membership'
import RefundPolicy from './pages/RefundPolicy'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  return user ? children : <Navigate to="/login" replace />
}
const AdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/feed" replace />
  return children
}
const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <TopBar />
      <div style={{ paddingTop:'60px' }}>{children}</div>
    </div>
    <Toast />
    <AnnouncementPopup />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                    element={<Landing/>} />
          <Route path="/login"               element={<Login/>} />
          <Route path="/register"            element={<Register/>} />
          <Route path="/feed"                element={<PrivateRoute><AppLayout><Feed/></AppLayout></PrivateRoute>} />
          <Route path="/discover"            element={<PrivateRoute><AppLayout><Discover/></AppLayout></PrivateRoute>} />
          <Route path="/story/:id"           element={<PrivateRoute><AppLayout><StoryDetail/></AppLayout></PrivateRoute>} />
          <Route path="/write"               element={<PrivateRoute><AppLayout><WriteStory/></AppLayout></PrivateRoute>} />
          <Route path="/edit/:id"            element={<PrivateRoute><AppLayout><WriteStory/></AppLayout></PrivateRoute>} />
          <Route path="/habits"              element={<PrivateRoute><AppLayout><Habits/></AppLayout></PrivateRoute>} />
          <Route path="/community"           element={<PrivateRoute><AppLayout><Community/></AppLayout></PrivateRoute>} />
          <Route path="/leaderboard"         element={<PrivateRoute><AppLayout><Leaderboard/></AppLayout></PrivateRoute>} />
          <Route path="/profile/:username"   element={<PrivateRoute><AppLayout><Profile/></AppLayout></PrivateRoute>} />
          <Route path="/jobs"                element={<PrivateRoute><AppLayout><Jobs/></AppLayout></PrivateRoute>} />
          <Route path="/membership"          element={<PrivateRoute><AppLayout><Membership/></AppLayout></PrivateRoute>} />
          <Route path="/saved"               element={<PrivateRoute><AppLayout><SavedStories/></AppLayout></PrivateRoute>} />
          <Route path="/admin"               element={<AdminRoute><AppLayout><AdminDashboard/></AppLayout></AdminRoute>} />
          <Route path="/privacy"             element={<PrivacyPolicy/>} />
          <Route path="/terms"               element={<TermsOfService/>} />
          <Route path="/content-policy"      element={<ContentPolicy/>} />
          <Route path="/refund-policy"       element={<RefundPolicy/>} />
          <Route path="/posting-guidelines"  element={<PostingGuidelines/>} />
          <Route path="/about"               element={<About/>} />
          <Route path="/blog"                element={<Blog/>} />
          <Route path="/blog/:slug"          element={<BlogPost/>} />
          <Route path="/careers"             element={<Careers/>} />
          <Route path="/careers/:id"         element={<JobDetail/>} />
          <Route path="/contact"             element={<Contact/>} />
          <Route path="/certificate/:id"     element={<CertificateViewer/>} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
