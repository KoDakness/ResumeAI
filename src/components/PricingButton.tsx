import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession, stripePromise } from '../lib/stripe-server';
import { useLocation } from 'react-router-dom';

type PricingButtonProps = {
  priceId: string;
  type: 'premium' | 'unlimited';
  className?: string;
};

export default function PricingButton({ priceId, type, className = '' }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = async () => {
    if (!user) {
      navigate('/signin', { 
        state: { from: location.pathname, priceId, type } 
      });
      return;
    }

    try {
      setLoading(true);
      await createCheckoutSession(priceId, user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process payment';
      console.error('Payment error:', message);
      alert('Payment processing is temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center ${className}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        type === 'premium' ? 'Get Premium Review' : 'Start Subscription'
      )}
    </button>
  );
}