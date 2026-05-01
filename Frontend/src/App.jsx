import { Routes, Route } from 'react-router-dom'
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


function App() {
    return (
        <AuthProvider>
            <div className="min-h-screen flex flex-col">
                <Routes>
                    {/* Chat page has its own layout */}
                    <Route path="/chat" element={<Chat />} />

                    {/* All other pages share Navbar + Footer */}
                    <Route path="*" element={
                        <>
                            <Navbar />
                            <div className="flex-1">
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/image" element={<ImageGen />} />
                                    <Route path="/voice" element={<Voice />} />
                                    <Route path="/pricing" element={<Pricing />} />
                                    <Route path="/signin" element={<SignIn />} />
                                    <Route path="/signup" element={<SignUp />} />
                                    <Route path="/auth/callback" element={<AuthCallback />} />
                                </Routes>
                            </div>
                            <Footer />
                        </>
                    } />
                </Routes>
            </div>
        </AuthProvider>
    )
}

export default App
