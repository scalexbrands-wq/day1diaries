import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { VisitorCountProvider } from './contexts/VisitorCountContext'
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
import Tribute from './pages/Tribute'
import MyGifts from './pages/MyGifts'
import Wallet from './pages/Wallet'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  return user ? children : <Navigate to="/login" replace />
}
const AdminRoute = ({ children }) => {
  const { user, profile, permissions, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!user) return <Navigate to="/login" replace />
  // Anyone with at least one RBAC permission gets into the admin shell;
  // AdminDashboard itself only renders the tabs each permission unlocks.
  const canAccessAdmin = profile?.role === 'admin' || permissions.length > 0
  if (!canAccessAdmin) return <Navigate to="/feed" replace />
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

// For content that should be viewable when shared (e.g. a story link) —
// logged-in visitors get the normal app shell; logged-out visitors get a
// minimal public header with Sign In/Sign Up instead of the full sidebar
// (which would otherwise show nav items that just bounce them to /login).
const PublicHeader = () => (
  <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(253,246,238,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,107,43,.1)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
    <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:'#FF6B2B', textDecoration:'none' }}>
      Day<span style={{color:'#1A0800'}}>1</span> Diaries
    </Link>
    <div style={{ display:'flex', gap:10 }}>
      <Link to="/login" style={{ fontSize:13, fontWeight:600, color:'#1A0800', textDecoration:'none', padding:'8px 16px', borderRadius:100, border:'1.5px solid rgba(26,8,0,.15)' }}>Sign In</Link>
      <Link to="/register" style={{ fontSize:13, fontWeight:600, color:'white', textDecoration:'none', padding:'8px 16px', borderRadius:100, background:'#FF6B2B' }}>Get Started Free →</Link>
    </div>
  </nav>
)
const ShareableLayout = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (user) return <AppLayout>{children}</AppLayout>
  return (
    <div style={{ minHeight:'100vh', background:'#FDF6EE' }}>
      <PublicHeader />
      {children}
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VisitorCountProvider>
        <Routes>
          <Route path="/"                    element={<Landing/>} />
          <Route path="/login"               element={<Login/>} />
          <Route path="/register"            element={<Register/>} />
          <Route path="/feed"                element={<PrivateRoute><AppLayout><Feed/></AppLayout></PrivateRoute>} />
          <Route path="/discover"            element={<PrivateRoute><AppLayout><Discover/></AppLayout></PrivateRoute>} />
          <Route path="/story/:id"           element={<ShareableLayout><StoryDetail/></ShareableLayout>} />
          <Route path="/tribute/:slug"       element={<ShareableLayout><Tribute/></ShareableLayout>} />
          <Route path="/gifts"               element={<PrivateRoute><AppLayout><MyGifts/></AppLayout></PrivateRoute>} />
          <Route path="/wallet"              element={<PrivateRoute><AppLayout><Wallet/></AppLayout></PrivateRoute>} />
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
        </VisitorCountProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
