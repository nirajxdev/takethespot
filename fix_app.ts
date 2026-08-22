import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove import
code = code.replace(/import PaymentModal from '\.\/components\/PaymentModal\.tsx';\n/, '');

// 2. Remove state
code = code.replace(/  const \[isPaymentModalOpen, setIsPaymentModalOpen\] = useState\(false\);\n/, '');

// 3. Update anyModalOpen
code = code.replace(/const anyModalOpen = isPurchaseModalOpen \|\| isPaymentModalOpen \|\| isSuccessModalOpen \|\| isAdminPanelOpen \|\| isRulesModalOpen \|\| focusedPlots !== null;/, 
  'const anyModalOpen = isPurchaseModalOpen || isSuccessModalOpen || isAdminPanelOpen || isRulesModalOpen || focusedPlots !== null;');

// 4. Update dependencies
code = code.replace(/}, \[selectedPlots, isPurchaseModalOpen, isPaymentModalOpen, isSuccessModalOpen, isAdminPanelOpen, isRulesModalOpen, focusedPlots\]\);/, 
  '}, [selectedPlots, isPurchaseModalOpen, isSuccessModalOpen, isAdminPanelOpen, isRulesModalOpen, focusedPlots]);');

// 5. Replace handleProceedToPayment and executePurchase
const paymentLogic = `
  const handleProceedToPayment = async (details: {brandName: string; logo: string; websiteUrl: string}) => {
    setPurchaseDetails(details);
    setIsPurchaseModalOpen(false);
    
    localStorage.setItem('pendingPurchase', JSON.stringify({
      plotIds: selectedPlots,
      details
    }));
    
    try {
      const res = await fetch('/api/create-dodo-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotIds: selectedPlots })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      showToast(err.message || 'Error connecting to payment provider.');
    }
  };

  const executePurchase = async (storedData: any) => {
    try {
      const payload = {
        plotIds: storedData.plotIds,
        ownerId: getUserId(),
        ...storedData.details
      };

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete purchase.');
      }

      setPurchaseDetails(storedData.details);
      setSelectedPlots(storedData.plotIds);
      if (isSoundEnabled) playSuccessChime();
      setIsSuccessModalOpen(true);
      loadData();
    } catch (err: any) {
      showToast(err.message);
    }
  };
`;

code = code.replace(/const handleProceedToPayment = \([\s\S]*?showToast\(err\.message \|\| 'An error occurred during purchase\.'\);\s*setIsPaymentModalOpen\(false\);\s*\}\s*\};/, paymentLogic.trim());

// 6. Remove the PaymentModal JSX
code = code.replace(/\{isPaymentModalOpen && config && purchaseDetails && \([\s\S]*?<\/PaymentModal>\s*\)\s*\}/, '');
// Handle the case where it might be slightly different
code = code.replace(/\{isPaymentModalOpen && config && purchaseDetails && \(\s*<PaymentModal[\s\S]*?onCancel=\{\(\) => setIsPaymentModalOpen\(false\)\}\s*\/>\s*\)\}/, '');

fs.writeFileSync('src/App.tsx', code);
