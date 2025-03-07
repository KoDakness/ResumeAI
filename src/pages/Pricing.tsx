import React from 'react';
import { Check } from 'lucide-react';
import PricingButton from '../components/PricingButton';

export default function Pricing() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Choose Your Plan
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Get the insights you need to improve your resume and land your dream job
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Free Plan */}
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900">Free</h2>
            <p className="mt-4 text-sm text-gray-500">Perfect for getting started</p>
            <p className="mt-8">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-base font-medium text-gray-500">/month</span>
            </p>
            <button className="mt-8 w-full bg-indigo-50 text-indigo-700 py-2 px-4 rounded-md hover:bg-indigo-100 transition-colors">
              Get Started
            </button>
          </div>
          <div className="px-6 pt-6 pb-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">3 free resume reviews</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Basic ATS check</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Key improvement suggestions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Premium Plan */}
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200 border-2 border-indigo-500">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900">Premium</h2>
            <p className="mt-4 text-sm text-gray-500">Detailed analysis per review</p>
            <p className="mt-8">
              <span className="text-4xl font-bold text-gray-900">$9.99</span>
              <span className="text-base font-medium text-gray-500">/review</span>
            </p>
            <PricingButton
              priceId={import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID}
              type="premium"
              className="mt-8 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            />
          </div>
          <div className="px-6 pt-6 pb-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Detailed ATS optimization</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Industry-specific feedback</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Downloadable report</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900">Unlimited</h2>
            <p className="mt-4 text-sm text-gray-500">For active job seekers</p>
            <p className="mt-8">
              <span className="text-4xl font-bold text-gray-900">$19.99</span>
              <span className="text-base font-medium text-gray-500">/month</span>
            </p>
            <PricingButton
              priceId={import.meta.env.VITE_STRIPE_UNLIMITED_PRICE_ID}
              type="unlimited"
              className="mt-8 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            />
          </div>
          <div className="px-6 pt-6 pb-8">
            <ul className="space-y-4">
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Unlimited resume reviews</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">AI cover letter assistance</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                <span className="ml-3 text-base text-gray-500">Priority support</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}