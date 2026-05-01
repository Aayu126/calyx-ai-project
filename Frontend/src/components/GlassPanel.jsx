export default function GlassPanel({ children, className = '', hover = false, ...props }) {
    return (
        <div
            className={`glass-panel rounded-xl ${hover ? 'hover:bg-white/60 transition-all' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}
