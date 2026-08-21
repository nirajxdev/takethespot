#!/bin/bash
cat << 'INNEREOF' > src/components/PaymentModal.tsx
import { useState } from 'react';
import { Plot } from '../types.ts';
import { formatCurrency, cn } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentModalProps {
  amount: number;
  plots: Plot[];
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentMethod = 'card' | 'upi' | 'wallet';

export default function PaymentModal({ amount, plots, onSuccess, onCancel }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  
  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  
  // UPI state
  const [upiId, setUpiId] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111511]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-sm shadow-xl overflow-hidden relative border border-[#C9D7B5] p-6 sm:p-8 flex flex-col"
      >
        <button 
          onClick={onCancel} 
          disabled={isProcessing}
          className="absolute top-4 right-4 text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1 disabled:opacity-50 z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex flex-col mb-4">
          <h3 className="text-xl font-black text-[#17351F] uppercase tracking-widest font-serif mb-1">Checkout</h3>
          <p className="text-[10px] text-[#17351F]/60 uppercase tracking-widest font-bold">Acquiring {plots.length} spot(s)</p>
        </div>

        <div className="bg-[#F5F8EC] border border-[#C9D7B5] rounded-sm p-4 mb-6 flex justify-between items-center">
          <span className="text-xs text-[#17351F] font-bold uppercase tracking-wider">Total Due</span>
          <span className="text-xl font-mono font-black text-[#17351F]">{formatCurrency(amount)}</span>
        </div>

        {/* Payment Methods Tabs */}
        <div className="flex gap-1 mb-6 bg-[#F5F8EC] p-1 rounded-sm border border-[#C9D7B5]/50">
          {(['card', 'upi', 'wallet'] as const).map((method) => (
            <button
              key={method}
              type="button"
              disabled={isProcessing}
              onClick={() => setPaymentMethod(method)}
              className={cn(
                "flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all rounded-sm",
                paymentMethod === method 
                  ? "bg-white text-[#17351F] shadow-sm" 
                  : "text-[#17351F]/50 hover:text-[#17351F]/80 hover:bg-white/50"
              )}
            >
              {method}
            </button>
          ))}
        </div>

        <form onSubmit={handlePay} className="flex-1 flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {paymentMethod === 'card' && (
                <motion.div 
                  key="card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      disabled={isProcessing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] bg-[#F5F8EC] focus:bg-white text-sm transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Card Number</label>
                    <input
                      type="text"
                      required
                      disabled={isProcessing}
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                      className="w-full px-3 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] bg-[#F5F8EC] focus:bg-white text-sm font-mono transition-all"
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Expiry</label>
                      <input
                        type="text"
                        required
                        disabled={isProcessing}
                        maxLength={5}
                        value={expiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
                          setExpiry(val);
                        }}
                        className="w-full px-3 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] bg-[#F5F8EC] focus:bg-white text-sm font-mono transition-all"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">CVC</label>
                      <input
                        type="text"
                        required
                        disabled={isProcessing}
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] bg-[#F5F8EC] focus:bg-white text-sm font-mono transition-all"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {paymentMethod === 'upi' && (
                <motion.div
                  key="upi"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="bg-[#F5F8EC]/50 border border-[#C9D7B5] rounded-sm p-4 flex flex-col items-center justify-center space-y-3 mb-2">
                    <div className="w-32 h-32 bg-white border border-[#C9D7B5] p-2 rounded flex items-center justify-center">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=test@upi&pn=TakeTheSpot&am=${(amount/100).toFixed(2)}&cu=USD`} alt="UPI QR Code" className="w-full h-full opacity-80" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#17351F]/60">Scan to pay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[1px] bg-[#C9D7B5]/50"></div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#17351F]/40">OR</span>
                    <div className="flex-1 h-[1px] bg-[#C9D7B5]/50"></div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Enter UPI ID</label>
                    <input
                      type="text"
                      required
                      disabled={isProcessing}
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] bg-[#F5F8EC] focus:bg-white text-sm transition-all"
                      placeholder="username@upi"
                    />
                  </div>
                </motion.div>
              )}

              {paymentMethod === 'wallet' && (
                <motion.div
                  key="wallet"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 flex flex-col items-center justify-center py-6"
                >
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 text-center mb-4">
                    Express Checkout
                  </p>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePay}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-sm hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"></path>
                    </svg>
                    Pay with GPay
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePay}
                    className="w-full flex items-center justify-center gap-2 bg-[#0070ba] text-white py-3.5 rounded-sm hover:bg-[#005ea6] transition-colors disabled:opacity-50 font-medium mt-3"
                  >
                    <svg width="24" height="24" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M84.5,23.5c-1.8-6.1-6.6-9.8-13.4-11c-2.4-0.4-5.2-0.6-8.2-0.6H29.1c-2.5,0-4.6,1.8-5,4.3L12.4,85.5c-0.3,1.8,1.1,3.4,2.9,3.4h19c2.3,0,4.2-1.7,4.5-3.9l3.5-22.3c0.3-2.1,2.1-3.6,4.2-3.6h8.7c16.2,0,26.9-6.6,30.3-21C86.7,33.5,86.2,28.8,84.5,23.5z"/>
                    </svg>
                    Pay with PayPal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={isProcessing || (paymentMethod === 'wallet')}
            className={cn(
              "w-full mt-8 text-white py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm transition-all shadow-sm flex items-center justify-center h-[52px]",
              paymentMethod === 'wallet' 
                ? "bg-[#C9D7B5] text-[#17351F]/40 cursor-not-allowed" 
                : "bg-[#17351F] hover:bg-[#2a5a35] disabled:opacity-70"
            )}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              paymentMethod === 'wallet' ? 'SELECT WALLET ABOVE' : `PAY ${formatCurrency(amount)}`
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
INNEREOF
