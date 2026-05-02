import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Chat from './pages/Chat'
import ImageGen from './pages/ImageGen'
import Voice from './pages/Voice'
import Pricing from './pages/Pricing'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import AuthCallback from './pages/AuthCallback'
import ProtectedRoute from './components/ProtectedRoute'

const Layout = ({ children, hideFooter = false }) => (
    <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
            {children}
        </main>
        {!hideFooter && <Footer />}
    </div>
)

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Chat page is fullscreen, no footer */}
                <Route path="/chat" element={
                    <ProtectedRoute>
                        <Chat />
                    </ProtectedRoute>
                } />

                {/* Home page */}
                <Route path="/" element={
                    <Layout>
                        <Home />
                    </Layout>
                } />

                {/* Protected Features */}
                <Route path="/image" element={
                    <Layout>
                        <ProtectedRoute>
                            <ImageGen />
                        </ProtectedRoute>
                    </Layout>
                } />

                <Route path="/voice" element={
                    <Layout>
                        <ProtectedRoute>
                            <Voice />
                        </ProtectedRoute>
                    </Layout>
                } />

                {/* Static Pages */}
                <Route path="/pricing" element={
                    <Layout>
                        <Pricing />
                    </Layout>
                } />

                {/* Auth Pages */}
                <Route path="/signin" element={
                    <Layout>
                        <SignIn />
                    </Layout>
                } />

                <Route path="/signup" element={
                    <Layout>
                        <SignUp />
                    </Layout>
                } />

                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Catch all redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App
