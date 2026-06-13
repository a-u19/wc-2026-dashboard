import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--page-bg)' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl mb-6"
      >
        ⚽
      </motion.div>
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-accent font-display tracking-widest text-sm"
      >
        LOADING WORLD CUP DATA…
      </motion.p>
    </div>
  )
}
