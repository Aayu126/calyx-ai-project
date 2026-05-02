import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Home() {
    const videoRef = useRef(null)
    const [opacity, setOpacity] = useState(0)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        let animationFrameId;
        
        const updateFade = () => {
            const duration = video.duration
            const currentTime = video.currentTime
            
            if (duration > 0) {
                // 0.5s fade in at start, 0.5s fade out at end
                const fadeInDuration = 0.5
                const fadeOutDuration = 0.5
                
                if (currentTime < fadeInDuration) {
                    setOpacity(currentTime / fadeInDuration)
                } else if (currentTime > duration - fadeOutDuration) {
                    setOpacity((duration - currentTime) / fadeOutDuration)
                } else {
                    setOpacity(1)
                }
            }
            
            animationFrameId = requestAnimationFrame(updateFade)
        }

        const handleEnded = () => {
            setOpacity(0)
            setTimeout(() => {
                video.currentTime = 0
                video.play()
            }, 100)
        }

        video.addEventListener('ended', handleEnded)
        animationFrameId = requestAnimationFrame(updateFade)

        return () => {
            cancelAnimationFrame(animationFrameId)
            video.removeEventListener('ended', handleEnded)
        }
    }, [])

    const logos = [
        { name: 'Vision', initial: 'V', color: '#6366f1' },
        { name: 'Voice', initial: 'V', color: '#a855f7' },
        { name: 'Synthesis', initial: 'S', color: '#fcd34d' },
        { name: 'Analytics', initial: 'A', color: '#3b82f6' },
        { name: 'Intelligence', initial: 'I', color: '#10b981' },
        { name: 'Automation', initial: 'A', color: '#ec4899' },
    ]

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    return (
        <main className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#050505] text-foreground font-geist cursor-none selection:bg-primary/30 selection:text-white">
            {/* Custom Interactive Cursor */}
            <motion.div
                className="fixed w-8 h-8 rounded-full border border-primary/50 pointer-events-none z-[100] mix-blend-difference hidden md:block"
                animate={{
                    x: mousePos.x - 16,
                    y: mousePos.y - 16,
                }}
                transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
            />
            <motion.div
                className="fixed w-1.5 h-1.5 rounded-full bg-white pointer-events-none z-[100] hidden md:block"
                animate={{
                    x: mousePos.x - 3,
                    y: mousePos.y - 3,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.2 }}
            />

            {/* Cinematic Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(19,127,236,0.08),transparent_70%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
                
                {/* Floating Data Clusters */}
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full"
                        animate={{
                            x: [0, 100, -100, 0],
                            y: [0, -50, 50, 0],
                        }}
                        transition={{
                            duration: 20 + i * 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            {/* Background Video Layer */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-20"
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
                    muted
                    playsInline
                    autoPlay
                    style={{ opacity }}
                />
            </div>

            {/* Hero Content Section */}
            <section className="relative z-10 flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6">
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    className="text-center w-full max-w-7xl mx-auto"
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.2 }
                            }
                        }}
                        className="flex flex-col items-center"
                    >
                        {/* Status Badge */}
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            className="mb-8 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2.5"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60">Neural Engine v4.0 Active</span>
                        </motion.div>

                        <motion.h1 
                            variants={{
                                hidden: { opacity: 0, scale: 0.9, filter: 'blur(20px)' },
                                visible: { opacity: 1, scale: 1, filter: 'blur(0px)' }
                            }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            className="text-[14vw] sm:text-[120px] md:text-[180px] font-normal leading-[0.85] tracking-[-0.06em] font-general mb-10 relative cursor-default"
                        >
                            CALYX <span className="bg-clip-text text-transparent bg-gradient-to-tr from-primary via-blue-400 to-emerald-400 animate-gradient-xy">AI</span>
                        </motion.h1>
                        
                        <motion.p 
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="text-foreground/40 text-xs sm:text-sm md:text-xl leading-relaxed max-w-2xl mx-auto font-geist tracking-[0.15em] mt-2 uppercase font-medium"
                        >
                            Orchestrating the next frontier of<br className="hidden sm:block" /> 
                            autonomous digital intelligence.
                        </motion.p>

                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 30 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 0.8, delay: 1 }}
                            className="mt-16 flex flex-col sm:flex-row items-center gap-6"
                        >
                            <Link 
                                to="/signup" 
                                className="relative group/btn bg-white text-black px-10 py-5 rounded-full font-general font-bold text-sm uppercase tracking-[0.1em] transition-all duration-500 hover:bg-primary hover:text-white hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Initiate Session
                                    <span className="material-icons text-lg">arrow_forward</span>
                                </span>
                                <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                            </Link>
                            
                            <Link 
                                to="/chat" 
                                className="px-8 py-4 rounded-full border border-white/10 hover:border-white/30 text-[11px] font-bold uppercase tracking-widest text-foreground/60 hover:text-foreground transition-all backdrop-blur-sm"
                            >
                                View Capabilities
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Dynamic Features Grid */}
            <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto w-full">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: 'auto_awesome', title: 'Generative Core', desc: 'High-fidelity synthesis across text and vision modalities.' },
                        { icon: 'graphic_eq', title: 'Neural Voice', desc: 'State-of-the-art speech synthesis with emotional nuance.' },
                        { icon: 'security', title: 'Private Layer', desc: 'Enterprise-grade encryption for all neural interactions.' }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-colors group cursor-default"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <span className="material-icons text-primary text-2xl">{feature.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4 font-general">{feature.title}</h3>
                            <p className="text-foreground/40 text-sm leading-relaxed font-geist">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Logo Marquee */}
            <div className="relative z-10 w-full py-32 bg-black/40 backdrop-blur-xl border-y border-white/5 overflow-hidden">
                <motion.div 
                    className="flex items-center gap-16 md:gap-32 w-max px-10"
                    animate={{ x: [0, -1000] }}
                    transition={{ 
                        duration: 50, 
                        repeat: Infinity, 
                        ease: "linear" 
                    }}
                >
                    {[...logos, ...logos, ...logos].map((logo, i) => (
                        <div key={i} className="flex items-center gap-6 opacity-30 hover:opacity-100 transition-opacity cursor-none group">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold bg-white/5 border border-white/10 group-hover:bg-primary/20 transition-all">
                                {logo.initial}
                            </div>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-foreground/60">{logo.name}</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-xy {
                    background-size: 200% 200%;
                    animation: gradient-xy 8s ease infinite;
                }
            `}} />
        </main>

    )
}

