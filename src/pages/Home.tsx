import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Zap, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Optimize Your Resume with</span>
          <span className="block text-indigo-600">AI-Powered Feedback</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Get instant, professional feedback on your resume. Improve your chances of landing your dream job with our AI-powered resume review system.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <Link
              to="/upload"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              Get Started
            </Link>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <Link
              to="/pricing"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center p-6">
              <FileText className="h-12 w-12 text-indigo-600" />
              <h3 className="mt-6 text-lg font-medium text-gray-900">Free Basic Review</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Get instant feedback on your resume with our AI-powered basic review.
              </p>
            </div>

            <div className="flex flex-col items-center p-6">
              <Zap className="h-12 w-12 text-indigo-600" />
              <h3 className="mt-6 text-lg font-medium text-gray-900">Premium Analysis</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Detailed feedback with ATS optimization and professional recommendations.
              </p>
            </div>

            <div className="flex flex-col items-center p-6">
              <Star className="h-12 w-12 text-indigo-600" />
              <h3 className="mt-6 text-lg font-medium text-gray-900">Monthly Subscription</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Unlimited reviews and AI-powered cover letter assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}