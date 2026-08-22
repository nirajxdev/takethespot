import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace handleProceedToPayment and executePurchase
const paymentLogic = `
  const handleProceedToPayment = async (details: {brandName: string; logo: string; websiteUrl: string}) => {
    setPurchaseDetails(details);
    setIsPurchaseModalOpen(false);
    
    // Save to local storage for when we return from Dodo Payments
    localStorage.setItem('pendingPurchase', JSON.stringify({
      plotIds: selectedPlots,
      details
    }));
    
    // Create Dodo Checkout session
    try {
      const res = await fetch('/api/create-dodo-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotIds: selectedPlots })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      
      // Redirect to Dodo Checkout
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
    } catch (err: any) {
      showToast(err.message);
    }
  };
`;

let newCode = code.replace(/const handleProceedToPayment[\s\S]*?showToast\(err\.message\);\s*\}\s*\};/, paymentLogic.trim());

// Also remove PaymentModal from rendering
newCode = newCode.replace(/\{isPaymentModalOpen && config && purchaseDetails && \([\s\S]*?<\/>\s*\)\s*\}/, '');
newCode = newCode.replace(/\{isPaymentModalOpen && config && purchaseDetails && \([\s\S]*?<\/PaymentModal>\s*\)\s*\}/, '');

// Also insert the effect to check for payment_success
const effectCode = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      const pendingStr = localStorage.getItem('pendingPurchase');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          executePurchase(pending);
        } catch (e) {
          console.error(e);
        }
        localStorage.removeItem('pendingPurchase');
      }
      // Remove query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
`;
newCode = newCode.replace('const loadData = useCallback(async () => {', effectCode.trim() + '\n\n  const loadData = useCallback(async () => {');

fs.writeFileSync('src/App.tsx', newCode);
