import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-background py-12 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="col-span-2 md:col-span-1">
                    <Link to="/" className="flex items-center gap-2 mb-6">
                        <img 
                            src="/logo.png" 
                            alt="CALYX" 
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="font-bold tracking-tighter text-lg text-foreground">CALYX</span>
                    </Link>
                    <p className="text-sm text-hero-sub">
                        Defining the next epoch of human and machine collaboration.
                    </p>
                </div>

                {/* Platform */}
                <div>
                    <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-white/40">Platform</h4>
                    <ul className="space-y-2 text-sm text-hero-sub">
                        <li><Link to="/chat" className="hover:text-primary transition-colors">AI Chat</Link></li>
                        <li><Link to="/image" className="hover:text-primary transition-colors">Image Gen</Link></li>
                        <li><Link to="/voice" className="hover:text-primary transition-colors">Voice AI</Link></li>
                    </ul>
                </div>

                {/* Company */}
                <div>
                    <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-white/40">Company</h4>
                    <ul className="space-y-2 text-sm text-hero-sub">
                        <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Ethics</a></li>
                    </ul>
                </div>

                {/* Connect */}
                <div>
                    <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-white/40">Connect</h4>
                    <div className="flex gap-4">
                        <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-hero-sub hover:text-primary hover:border-primary/50 transition-all">
                            <span className="material-icons text-sm">alternate_email</span>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-hero-sub hover:text-primary hover:border-primary/50 transition-all">
                            <span className="material-icons text-sm">share</span>
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-white/30">© 2026 CALYX AI Corp. All rights reserved.</p>
                <div className="flex gap-6 text-xs text-white/30">
                    <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                </div>
            </div>
        </footer>
    )
}
