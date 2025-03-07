import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe-server';

type PricingButtonProps = {
  priceId: string;
  type: 'premium' | 'unlimited';
  className?: string;
};

export default function PricingButton({ priceId, type, className = '' }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      setLoading(true);
      const session = await createCheckoutSession(priceId, user.id);
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process payment. Please try again.');
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