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
        { name: 'Vision', initial: 'V' },
        { name: 'Voice', initial: 'V' },
        { name: 'Synthesis', initial: 'S' },
        { name: 'Analytics', initial: 'A' },
        { name: 'Intelligence', initial: 'I' },
        { name: 'Automation', initial: 'A' },
    ]

    return (
        <main className="relative min-h-screen flex flex-col overflow-hidden bg-background text-foreground font-geist">
            {/* Background Video Wrapper */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
                    muted
                    playsInline
                    autoPlay
                    style={{ opacity }}
                />
            </div>

            {/* Blurred Overlay Shape */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[984px] h-[527px] opacity-90 bg-gray-950 blur-[82px] pointer-events-none z-0"
                style={{ mixBlendMode: 'normal' }}
            />

            {/* Hero Content Wrapper */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 overflow-visible">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center"
                >
                    <h1 className="text-[80px] xs:text-[120px] md:text-[220px] font-normal leading-[1.02] tracking-[-0.024em] font-general mb-2">
                        CALYX <span className="bg-clip-text text-transparent bg-gradient-to-l from-[#6366f1] via-[#a855f7] to-[#fcd34d]">AI</span>
                    </h1>
                    
                    <p className="text-hero-sub text-base md:text-xl leading-8 max-w-md mx-auto opacity-80 mt-[9px]">
                        The most powerful AI ever deployed <br className="hidden md:block" /> in talent acquisition
                    </p>

                    <Link 
                        to="/signup" 
                        className="btn-hero-secondary px-[20px] xs:px-[29px] py-[16px] xs:py-[24px] mt-[25px] inline-block text-base xs:text-lg"
                    >
                        Get Started
                    </Link>
                </motion.div>
            </div>

            {/* Logo Marquee Section */}
            <div className="relative z-10 w-full pb-10">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 px-6">
                    <div className="text-foreground/50 text-sm whitespace-nowrap text-center md:text-left">
                        Empowering intelligence <br /> across the globe
                    </div>

                    <div className="flex-1 overflow-hidden relative mask-fade-edges">
                        <motion.div 
                            className="flex items-center gap-10 md:gap-16 w-max"
                            animate={{ x: [0, -1000] }}
                            transition={{ 
                                duration: 25, 
                                repeat: Infinity, 
                                ease: "linear" 
                            }}
                        >
                            {[...logos, ...logos, ...logos].map((logo, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="liquid-glass w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold">
                                        {logo.initial}
                                    </div>
                                    <span className="text-base font-semibold text-foreground uppercase tracking-wider">
                                        {logo.name}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
            `}} />
        </main>
    )
}

