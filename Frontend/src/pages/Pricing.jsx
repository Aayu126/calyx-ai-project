import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const PLANS = [
    {
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        badge: null,
        description: 'Perfect for trying out CALYX',
        features: [
            '50 messages per day',
            'Basic image generation (5/day)',
            'Speech-to-text (10 min/day)',
            'Standard response speed',
            'Community support',
        ],
        cta: 'Get Started Free',
        ctaStyle: 'border border-slate-200 text-slate-900 hover:bg-slate-50',
        highlight: false,
    },
    {
        name: 'Pro',
        price: { monthly: 19, yearly: 15 },
        badge: 'Most Popular',
        description: 'For professionals who need more power',
        features: [
            'Unlimited messages',
            'Advanced image gen (100/day)',
            'Unlimited speech & voice',
            'Priority response speed',
            'CALYX 4.0 Pro model access',
            'Code generation (all languages)',
            'File & image analysis',
            'Priority support',
        ],
        cta: 'Start Pro Trial',
        ctaStyle: 'bg-primary text-white hover:shadow-lg hover:shadow-primary/30',
        highlight: true,
    },
    {
        name: 'Enterprise',
        price: { monthly: 49, yearly: 39 },
        badge: null,
        description: 'For teams and organizations',
        features: [
            'Everything in Pro',
            'API access & webhooks',
            'Custom model fine-tuning',
            'Team collaboration (up to 50)',
            'Admin dashboard & analytics',
            'SSO & SAML integration',
            'Dedicated support engineer',
            'SLA guarantee (99.9%)',
            'Custom data retention',
        ],
        cta: 'Contact Sales',
        ctaStyle: 'border border-slate-200 text-slate-900 hover:bg-slate-50',
        highlight: false,
    },
]

const COMPARISON = [
    { feature: 'Daily Messages', free: '50', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Image Generation', free: '5/day', pro: '100/day', enterprise: 'Unlimited' },
    { feature: 'Voice Minutes', free: '10 min/day', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Model Access', free: 'CALYX 3.0', pro: 'CALYX 4.0 Pro', enterprise: 'Custom Models' },
    { feature: 'File Upload', free: '5 MB', pro: '100 MB', enterprise: '1 GB' },
    { feature: 'API Access', free: '—', pro: '—', enterprise: '✓' },
    { feature: 'Support', free: 'Community', pro: 'Priority', enterprise: 'Dedicated' },
]

export default function Pricing() {
    const [yearly, setYearly] = useState(false)

    return (
        <main className="relative pt-32 pb-24 min-h-screen overflow-hidden bg-background">
            {/* Ambient Background Orbs */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <section className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-16 md:mb-24"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] md:text-[10px] font-black tracking-[0.4em] uppercase mb-10 shadow-lg shadow-primary/5"
                    >
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Infrastructure Tiering
                    </motion.div>
                    <h1 className="text-5xl md:text-8xl font-general font-bold tracking-tight mb-8 text-foreground leading-[1.05]">
                        The power of AI, <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400 animate-gradient-x drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">priced for scale</span>
                    </h1>
                    <p className="text-lg md:text-xl text-hero-sub max-w-3xl mx-auto mb-14 font-geist leading-relaxed opacity-80">
                        Harness the next generation of machine intelligence. Simple, transparent pricing 
                        designed to evolve with your creative and technical ambitions.
                    </p>

                    {/* Monthly / Yearly Toggle */}
                    <div className="inline-flex items-center p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                        <button
                            onClick={() => setYearly(false)}
                            className={`relative px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${!yearly ? 'text-white' : 'text-hero-sub hover:text-white'}`}
                        >
                            {!yearly && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/30"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">Monthly</span>
                        </button>
                        <button
                            onClick={() => setYearly(true)}
                            className={`relative px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${yearly ? 'text-white' : 'text-hero-sub hover:text-white'}`}
                        >
                            {yearly && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/30"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                Yearly
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 text-[8px] font-black tracking-tighter">SAVE 20%</span>
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Plan Cards */}
                <div className="grid lg:grid-cols-3 gap-8 mb-32">
                    {PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, delay: index * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
                            whileHover={{ y: -12, scale: 1.015 }}
                            className={`relative liquid-glass rounded-[48px] p-8 md:p-12 flex flex-col transition-all duration-700 group ${
                                plan.highlight 
                                ? 'border-primary/40 bg-white/[0.03] shadow-[0_40px_120px_-20px_rgba(59,130,246,0.25)] z-10' 
                                : 'border-white/5 hover:border-white/10 shadow-2xl'
                            }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] text-white text-[9px] font-black px-7 py-2.5 rounded-full shadow-2xl border border-white/20 uppercase tracking-[0.25em] animate-gradient-x">
                                    Recommended
                                </div>
                            )}

                            <div className="mb-12">
                                <h3 className="text-3xl md:text-4xl font-general font-bold mb-4 text-foreground group-hover:text-primary transition-colors duration-500 tracking-tight">{plan.name}</h3>
                                <p className="text-sm md:text-base text-hero-sub font-geist leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity duration-500">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline gap-2 mb-12">
                                <span className="text-6xl md:text-7xl font-general font-bold text-foreground tracking-tighter transition-transform duration-500 group-hover:scale-105 origin-left">
                                    ${yearly ? plan.price.yearly : plan.price.monthly}
                                </span>
                                <span className="text-hero-sub text-xs md:text-sm font-black uppercase tracking-[0.2em] opacity-40">/ month</span>
                            </div>

                            <Link
                                to="/signup"
                                className={`group/btn relative overflow-hidden block w-full text-center font-black py-5 md:py-6 rounded-2xl md:rounded-3xl transition-all duration-500 font-general uppercase tracking-[0.25em] text-[9px] md:text-[10px] ${
                                    plan.highlight 
                                    ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-primary/50' 
                                    : 'bg-white/[0.03] border border-white/5 text-white hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                                <span className="relative z-10">{plan.cta}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
                            </Link>

                            <div className="my-12 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                            <ul className="space-y-6 flex-grow">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-4 group/item">
                                        <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/30 group-hover/item:scale-110 group-hover/item:rotate-12 transition-all duration-500">
                                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-hero-sub group-hover/item:text-foreground transition-all duration-500 font-geist text-sm md:text-[15px] leading-tight opacity-80 group-hover:opacity-100">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                {/* Comparison Table */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="liquid-glass rounded-[40px] overflow-hidden mb-32 shadow-2xl"
                >
                    <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-3xl font-general font-bold text-foreground">Compare features</h2>
                        <p className="text-hero-sub font-geist mt-2 text-sm">Deep dive into what each plan offers.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left text-[10px] uppercase tracking-[0.3em] font-black text-white/30 px-10 py-8 font-general">Capability</th>
                                    <th className="text-center text-xs font-black text-hero-sub uppercase tracking-widest px-10 py-8 font-general">Free</th>
                                    <th className="text-center text-xs font-black text-primary uppercase tracking-widest px-10 py-8 font-general">Pro</th>
                                    <th className="text-center text-xs font-black text-hero-sub uppercase tracking-widest px-10 py-8 font-general">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map((row, i) => (
                                    <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-all group">
                                        <td className="text-sm font-medium text-foreground/80 px-10 py-6 font-geist group-hover:text-foreground group-hover:translate-x-1 transition-all">{row.feature}</td>
                                        <td className="text-center text-sm text-hero-sub px-10 py-6 font-geist">{row.free}</td>
                                        <td className="text-center text-sm font-bold text-primary px-10 py-6 font-geist">{row.pro}</td>
                                        <td className="text-center text-sm text-hero-sub px-10 py-6 font-geist">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* FAQ / CTA */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="liquid-glass rounded-[40px] p-16 text-center relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-1/2 scale-150 pointer-events-none" />
                    <div className="relative z-10">
                        <h2 className="text-4xl font-general font-bold text-foreground mb-6">Still have questions?</h2>
                        <p className="text-hero-sub mb-10 font-geist max-w-xl mx-auto text-lg leading-relaxed">
                            Our team is here to help you find the perfect fit for your workflow. 
                            Chat with us now for a personalized recommendation.
                        </p>
                        <Link
                            to="/chat"
                            className="group relative inline-flex items-center gap-3 bg-white text-black font-black px-10 py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all font-general uppercase tracking-[0.2em] text-[10px]"
                        >
                            <span className="material-icons text-sm">chat_bubble</span>
                            Talk to an Expert
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 group-hover:ring-white/40 transition-all" />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </main>
    )
}
