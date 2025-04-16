import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Target, BarChart, LineChart } from 'lucide-react';

interface SharedHeaderProps {
  variant?: 'default' | 'results';
  productsCount?: number;
}

export function SharedHeader({ variant = 'default', productsCount }: SharedHeaderProps) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-soft sticky top-0 z-50 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <motion.div 
              className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500"
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 animate-text">
              BOFU ai
            </h1>
            {variant === 'results' && productsCount !== undefined && (
              <div className="space-y-1">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600">
                  Research Results
                </h2>
                <p className="text-sm text-gray-500">
                  {productsCount} {productsCount === 1 ? 'product' : 'products'} analyzed
                </p>
              </div>
            )}
            {variant === 'default' && (
              <div className="mt-6 space-y-4">
                <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
                  Research Simplified.{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-500">
                    Insights Amplified.
                  </span>
                </h2>
                <p className="text-lg text-neutral-600 max-w-2xl">
                  Upload documents and add blog links with one click. Get AI-powered insights to understand 
                  your customers and market opportunities.
                </p>
                <motion.div 
                  className="flex flex-wrap items-center gap-4 mt-4"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}