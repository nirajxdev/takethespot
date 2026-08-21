import { useEffect, useState } from 'react';
import { Transaction, Plot } from '../types.ts';
import { cn } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityFeedProps {
  plots: Plot[];
}

export default function ActivityFeed({ plots }: ActivityFeedProps) {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions/recent');
        if (response.ok) {
          const data = await response.json();
          setRecentTransactions(data);
        }
      } catch (e) {
        console.error("Failed to fetch recent transactions", e);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000); // poll every 5s
    
    return () => clearInterval(interval);
  }, []);

  if (recentTransactions.length === 0) return null;

  // Helper to get brand name from plot id since transaction only has plotId
  const getBrandName = (plotId: string) => {
    const plot = plots.find(p => p.id === plotId);
    return plot?.brandName || "Unknown";
  };

  return (
    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 pointer-events-none flex flex-col gap-2 max-w-[200px] sm:max-w-[250px]">
      <AnimatePresence>
        {recentTransactions.map((tx) => {
          const isTakeover = tx.previousOwner !== null;
          const priceStr = `$${(tx.transactionAmount / 100).toFixed(2)}`;
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-auto bg-[#F5F8EC]/90 backdrop-blur-md border border-[#17351F]/10 rounded shadow-sm p-2 text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm text-white",
                  isTakeover ? "bg-red-500/80" : "bg-[#17351F]/80"
                )}>
                  {isTakeover ? 'TAKEOVER' : 'PURCHASE'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-[#17351F]">{tx.plotId}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] leading-tight text-[#17351F]/80">
                <span className="font-bold text-[#17351F]">{getBrandName(tx.plotId)}</span> 
                {' '}secured for {priceStr}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
