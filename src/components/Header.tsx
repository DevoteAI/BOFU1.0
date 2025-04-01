import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, BarChart, LineChart, Brain } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full mb-8">
      <motion.div 
        className="max-w-3xl space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-neutral-900 leading-tight">
          Research Simplified.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-500">
            Insights Amplified.
          </span>
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl">
          Upload documents and add blog links with one click. Get AI-powered insights to understand 
          your customers and market opportunities.
        </p>
      </motion.div>

      <motion.div 
        className="flex flex-wrap items-center gap-4 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {[
          { icon: Sparkles, label: "Upload Sources", color: "primary", active: true },
          { icon: Target, label: "Define Products", color: "secondary", active: true },
          { icon: BarChart, label: "Get Insights", color: "neutral", active: false },
          { icon: LineChart, label: "Take Action", color: "neutral", active: false }
        ].map((item, index) => (
          <motion.div 
            key={index}
            className={`flex items-center bg-white px-4 py-2 rounded-full shadow-sm ${!item.active && 'opacity-60'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * (index + 3) }}
            whileHover={item.active ? { y: -2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' } : {}}
          >
            <div className={`flex items-center justify-center h-8 w-8 rounded-full mr-2 bg-${item.color}-100 text-${item.color}-600`}>
              <item.icon size={16} />
            </div>
            <span className={`text-sm font-medium ${item.active ? 'text-neutral-800' : 'text-neutral-500'}`}>{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </header>
  );
}