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
                    className="text-center mb-20"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-8"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Pricing Plans
                    </motion.div>
                    <h1 className="text-5xl md:text-8xl font-general font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
                        The power of AI, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-500 animate-gradient-x">priced for you</span>
                    </h1>
                    <p className="text-xl text-hero-sub max-w-2xl mx-auto mb-12 font-geist leading-relaxed">
                        Join thousands of creators and engineers building the future with CALYX.
                        Simple, transparent pricing for every scale.
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
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: index * 0.1, ease: "easeOut" }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            className={`relative liquid-glass rounded-[40px] p-10 flex flex-col transition-all duration-500 group ${
                                plan.highlight 
                                ? 'border-primary/40 shadow-[0_30px_100px_-20px_rgba(59,130,246,0.2)] z-10' 
                                : 'hover:border-white/20'
                            }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-600 text-white text-[9px] font-black px-6 py-2 rounded-full shadow-2xl border border-white/20 uppercase tracking-[0.2em] animate-bounce-subtle">
                                    Recommended
                                </div>
                            )}

                            <div className="mb-10">
                                <h3 className="text-3xl font-general font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{plan.name}</h3>
                                <p className="text-sm text-hero-sub font-geist leading-relaxed">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-6xl font-general font-bold text-foreground tracking-tighter">
                                    ${yearly ? plan.price.yearly : plan.price.monthly}
                                </span>
                                <span className="text-hero-sub text-sm font-black uppercase tracking-widest">/mo</span>
                            </div>

                            <Link
                                to="/signup"
                                className={`group/btn relative overflow-hidden block w-full text-center font-black py-5 rounded-2xl transition-all duration-500 font-general uppercase tracking-[0.2em] text-[10px] ${
                                    plan.highlight 
                                    ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:shadow-primary/40' 
                                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="relative z-10">{plan.cta}</span>
                                {plan.highlight && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                )}
                            </Link>

                            <div className="my-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <ul className="space-y-5 flex-grow">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-4 group/item">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/20 group-hover/item:scale-110 transition-all duration-300">
                                            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-hero-sub group-hover/item:text-foreground transition-colors font-geist text-sm leading-tight">{feature}</span>
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
