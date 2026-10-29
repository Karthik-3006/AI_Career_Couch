import React, { useState, useEffect } from 'react';
import { Sparkles, CreditCard, CheckCircle, RefreshCw } from 'lucide-react';
import { subscriptionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Paywall({ featureName, onSubscribed }) {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [upiId, setUpiId] = useState('');
  const [customQrCode, setCustomQrCode] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Strict Real Payments details
  const [utr, setUtr] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getSettings();
      setPlans(data.plans || []);
      setUpiId(data.upi_id || '');
      setCustomQrCode(data.qr_code || null);
      if (data.plans?.length > 0) {
        setSelectedPlan(data.plans[0]);
      }
    } catch (err) {
      console.error("Failed to load plans/settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    // Strict Client side check: exactly 12 numeric digits
    if (!/^\d{12}$/.test(utr)) {
      setErrorMessage("Transaction UTR must be exactly 12 numeric digits.");
      return;
    }

    setErrorMessage('');
    setSubmitting(true);
    try {
      // Secure automatic checkout
      const res = await subscriptionService.subscribe(selectedPlan._id, utr);
      
      // Auto-convert to premium instantly!
      setUser(prev => ({
        ...prev,
        is_subscriber: true,
        subscription_expires_at: res.subscription_expires_at
      }));

      setSuccess(true);
      setTimeout(() => {
        if (onSubscribed) {
          onSubscribed(res.subscription_expires_at);
        }
      }, 2000);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Verification failed. Please check your transaction ID.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading premium checkout settings...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm text-center space-y-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-full text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-12 w-12 animate-bounce" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Payment Verified Automatically!</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Success! Your transaction ID <strong>{utr}</strong> was securely validated. Your account has been automatically upgraded to <strong>Premium Member</strong>.
        </p>
      </div>
    );
  }

  const upiUrl = selectedPlan && upiId
    ? `upi://pay?pa=${upiId}&pn=CareerCoach&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(selectedPlan.name)}`
    : '';

  const qrCodeUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`
    : '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-2xl mx-auto overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white text-center space-y-2">
        <div className="inline-flex bg-white/20 p-2 rounded-full">
          <Sparkles className="h-8 w-8 text-amber-100" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Unlock Premium Workspace Access</h2>
        <p className="text-xs text-amber-100 max-w-md mx-auto">
          Get unlimited access to {featureName || 'all academic subjects, compilers, resume analysis matching, and mock interviews'}!
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Active plan summary */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-gray-800 dark:text-white">Selected Subscription Plan</h3>
          <div className="grid grid-cols-1 gap-3">
            {plans.map((p) => (
              <div
                key={p._id}
                className="p-4 rounded-xl border-2 border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-center flex flex-col sm:flex-row justify-between items-center gap-2"
              >
                <div className="text-left">
                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-white">{p.name}</h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Lifetime Access Plan (Configured by Administrator)</p>
                </div>
                <div className="text-xl font-black text-primary-600 dark:text-primary-400">
                  ₹{p.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UPI Payments section */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 space-y-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 flex items-center justify-center sm:justify-start">
                <CreditCard className="h-4 w-4 mr-1 text-primary-500" />
                Pay via Administrator Payment Settings
              </h4>
              <p className="text-[11px] text-gray-400">
                Scan the QR code or use the administrator UPI ID below to complete your transfer securely.
              </p>
              
              {upiId && (
                <div className="bg-white dark:bg-gray-800 border dark:border-slate-700 px-3 py-1.5 rounded-lg inline-block text-xs font-mono font-bold text-gray-800 dark:text-white mt-1.5 select-all">
                  UPI ID: {upiId}
                </div>
              )}
            </div>
            
            {/* Custom Admin QR or Generated QR code block */}
            {(customQrCode || qrCodeUrl) && (
              <div className="bg-white p-2 border rounded-lg flex flex-col justify-center items-center shadow-sm shrink-0">
                <img 
                  src={customQrCode || qrCodeUrl} 
                  alt="Scan to Pay via UPI" 
                  className="h-28 w-28 object-contain" 
                />
                <span className="text-[8px] text-gray-500 font-bold mt-1 uppercase tracking-wider">Scan to Pay</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification form */}
        <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4 border-t dark:border-gray-700">
          <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center">
            <CheckCircle className="h-4.5 w-4.5 text-primary-500 mr-2" />
            Enter Transaction Details for Instant Activation
          </h3>
          {errorMessage && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-100 dark:border-red-900/50">
              {errorMessage}
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
              12-Digit UPI Transaction ID / UTR / Ref No.
            </label>
            <input
              type="text"
              required
              maxLength={12}
              pattern="\d{12}"
              value={utr}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, ''); // Numeric only
                setUtr(val);
                setErrorMessage('');
              }}
              placeholder="e.g. 423589071234"
              className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-slate-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !selectedPlan || utr.length !== 12}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying Transaction Securely...
              </>
            ) : (
              `Submit Secure Checkout & Unlock Premium (₹${selectedPlan?.price || 0})`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
